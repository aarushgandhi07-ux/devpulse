export type Repo = { id: number; name: string; fullName: string; description: string | null; url: string; stars: number; forks: number; language: string | null; updatedAt: string; owner: string }
export type Story = { id: number; title: string; url: string; discussionUrl: string; score: number; comments: number; author: string; time: number }
export type Article = { id: number; title: string; description: string; url: string; coverImage: string | null; author: string; username?: string; tags: string[]; readingTime: number; reactions: number; publishedAt: string }
export type SavedItem = { id: string; kind: 'repository' | 'story' | 'article'; title: string; url: string; metadata?: Record<string, unknown> }
async function get<T>(path: string): Promise<T> {
  const r = await fetch(path)
  const data = await r.json()
  if (!r.ok) throw new Error(data.error || 'Request failed')
  return data as T
}
export const api = {
  repos: (q = 'stars:>1000', sort = 'stars') => get<{items: Repo[]}>(`/api/github/repos?q=${encodeURIComponent(q)}&sort=${sort}`),
  stories: (kind: string) => get<{items: Story[]}>(`/api/hn/${kind}`),
  articles: (tag = '') => get<{items: Article[]}>(`/api/devto/articles${tag ? `?tag=${encodeURIComponent(tag)}` : ''}`),
  saved: () => get<{enabled: boolean; items: SavedItem[]}>('/api/saved'),
  save: async (item: SavedItem) => { const r = await fetch('/api/saved', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(item) }); const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Could not save'); return d },
  remove: async (id: string) => { const r = await fetch(`/api/saved/${encodeURIComponent(id)}`, { method: 'DELETE' }); const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Could not remove'); return d }
}
export function shortNumber(n: number) { return Intl.NumberFormat('en', { notation: n >= 1000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(n) }
export function relativeTime(timestamp: number | string) { const seconds = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime() / 1000; const diff = Math.max(0, Date.now() / 1000 - seconds); if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))}m ago`; if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`; return `${Math.floor(diff / 86400)}d ago` }
