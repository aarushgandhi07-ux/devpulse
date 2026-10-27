import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { neon } from '@neondatabase/serverless'

const app = express()
const port = Number(process.env.PORT || 3001)
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }))
app.use(express.json({ limit: '1mb' }))

const cache = new Map()
async function cached(key, ttlMs, fn) {
  const existing = cache.get(key)
  if (existing && Date.now() - existing.time < ttlMs) return existing.value
  const value = await fn()
  cache.set(key, { time: Date.now(), value })
  return value
}
async function fetchJson(url, headers = {}) {
  const response = await fetch(url, { headers: { 'User-Agent': 'DevPulse-Hackathon-App', ...headers } })
  if (!response.ok) {
    const error = new Error(`Upstream API returned ${response.status}`)
    error.status = response.status
    throw error
  }
  return response.json()
}
function githubHeaders() {
  return process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' } : { Accept: 'application/vnd.github+json' }
}

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'DevPulse API' }))

app.get('/api/github/repos', async (req, res) => {
  try {
    const q = String(req.query.q || 'stars:>1000').slice(0, 120)
    const sort = ['stars', 'updated', 'forks'].includes(String(req.query.sort)) ? String(req.query.sort) : 'stars'
    const data = await cached(`github:${q}:${sort}`, 90_000, () => fetchJson(`https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=${sort}&order=desc&per_page=12`, githubHeaders()))
    res.json({ items: (data.items || []).map(r => ({ id: r.id, name: r.name, fullName: r.full_name, description: r.description, url: r.html_url, stars: r.stargazers_count, forks: r.forks_count, language: r.language, updatedAt: r.updated_at, owner: r.owner?.login })) })
  } catch (e) { res.status(e.status || 502).json({ error: 'GitHub could not be reached. Try again shortly.', detail: e.message }) }
})

app.get('/api/hn/:kind', async (req, res) => {
  const endpoints = { top: 'topstories', new: 'newstories', best: 'beststories' }
  const endpoint = endpoints[req.params.kind]
  if (!endpoint) return res.status(400).json({ error: 'Unknown Hacker News feed.' })
  try {
    const items = await cached(`hn:${endpoint}`, 60_000, async () => {
      const ids = await fetchJson(`https://hacker-news.firebaseio.com/v0/${endpoint}.json`)
      const stories = await Promise.all(ids.slice(0, 12).map(id => fetchJson(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).catch(() => null)))
      return stories.filter(s => s && s.type === 'story').map(s => ({ id: s.id, title: s.title, url: s.url || `https://news.ycombinator.com/item?id=${s.id}`, discussionUrl: `https://news.ycombinator.com/item?id=${s.id}`, score: s.score || 0, comments: s.descendants || 0, author: s.by || 'unknown', time: s.time || 0 }))
    })
    res.json({ items })
  } catch (e) { res.status(502).json({ error: 'Hacker News is temporarily unavailable.', detail: e.message }) }
})

app.get('/api/devto/articles', async (req, res) => {
  try {
    const tag = String(req.query.tag || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 40)
    const url = new URL('https://dev.to/api/articles')
    url.searchParams.set('per_page', '12')
    if (tag) url.searchParams.set('tag', tag)
    const items = await cached(`devto:${tag}`, 90_000, () => fetchJson(url.toString()))
    res.json({ items: items.map(a => ({ id: a.id, title: a.title, description: a.description, url: a.url, coverImage: a.cover_image || a.social_image, author: a.user?.name || a.user?.username || 'Dev.to author', username: a.user?.username, tags: (a.tag_list || []).slice(0, 4), readingTime: a.reading_time_minutes || 1, reactions: a.public_reactions_count || 0, publishedAt: a.published_at })) })
  } catch (e) { res.status(502).json({ error: 'Dev.to is temporarily unavailable.', detail: e.message }) }
})

const database = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null
app.get('/api/saved', async (_req, res) => {
  if (!database) return res.json({ enabled: false, items: [] })
  try {
    await database`CREATE TABLE IF NOT EXISTS devpulse_saved (id TEXT PRIMARY KEY, kind TEXT NOT NULL, title TEXT NOT NULL, url TEXT NOT NULL, metadata JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`
    const items = await database`SELECT id, kind, title, url, metadata, created_at FROM devpulse_saved ORDER BY created_at DESC LIMIT 100`
    res.json({ enabled: true, items })
  } catch (e) { res.status(500).json({ error: 'Could not load saved items.', detail: e.message }) }
})
app.post('/api/saved', async (req, res) => {
  if (!database) return res.status(503).json({ error: 'Saving across sessions is disabled. Add DATABASE_URL to enable Neon.' })
  const { id, kind, title, url, metadata = {} } = req.body || {}
  if (![id, kind, title, url].every(v => typeof v === 'string' && v.length > 0) || !['repository', 'story', 'article'].includes(kind)) return res.status(400).json({ error: 'Invalid saved item.' })
  try {
    await database`CREATE TABLE IF NOT EXISTS devpulse_saved (id TEXT PRIMARY KEY, kind TEXT NOT NULL, title TEXT NOT NULL, url TEXT NOT NULL, metadata JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`
    await database`INSERT INTO devpulse_saved (id, kind, title, url, metadata) VALUES (${id}, ${kind}, ${title.slice(0, 300)}, ${url}, ${JSON.stringify(metadata)}::jsonb) ON CONFLICT (id) DO NOTHING`
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: 'Could not save item.', detail: e.message }) }
})
app.delete('/api/saved/:id', async (req, res) => {
  if (!database) return res.status(503).json({ error: 'Add DATABASE_URL to enable persistent saved items.' })
  try { await database`DELETE FROM devpulse_saved WHERE id = ${req.params.id}`; res.json({ ok: true }) }
  catch (e) { res.status(500).json({ error: 'Could not remove item.', detail: e.message }) }
})

app.use(express.static('dist'))
app.get('/{*splat}', (req, res, next) => req.path.startsWith('/api/') ? next() : res.sendFile(new URL('../dist/index.html', import.meta.url).pathname))
app.listen(port, () => console.log(`DevPulse API listening on http://localhost:${port}`))
