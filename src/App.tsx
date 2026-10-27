import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, ArrowDownRight, ArrowUpRight, Bookmark, BookOpen, Check, ChevronDown, Code2, ExternalLink, Flame, GitFork, Github, Globe2, Menu, MessageCircle, Newspaper, RefreshCw, Search, Sparkles, Star, TrendingUp, X } from 'lucide-react'
import { api, relativeTime, shortNumber, type Article, type Repo, type SavedItem, type Story } from './lib/api'

type Section = 'Overview' | 'Repositories' | 'Tech News' | 'Articles' | 'Saved'
type Kind = 'repository' | 'story' | 'article'
const nav: { label: Section; icon: typeof Activity }[] = [{label:'Overview',icon:Activity},{label:'Repositories',icon:Github},{label:'Tech News',icon:Newspaper},{label:'Articles',icon:BookOpen},{label:'Saved',icon:Bookmark}]
const topics = ['All topics','javascript','python','ai','webdev','opensource']

export default function App() {
  const [section, setSection] = useState<Section>('Overview')
  const [repos, setRepos] = useState<Repo[]>([])
  const [stories, setStories] = useState<Story[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [saved, setSaved] = useState<SavedItem[]>([])
  const [savedEnabled, setSavedEnabled] = useState(false)
  const [query, setQuery] = useState('')
  const [repoQuery, setRepoQuery] = useState('stars:>1000')
  const [storyKind, setStoryKind] = useState('top')
  const [topic, setTopic] = useState('All topics')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [toast, setToast] = useState('')
  const [mobileNav, setMobileNav] = useState(false)

  const loadData = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true)
    const errs: string[] = []
    const results = await Promise.allSettled([api.repos(repoQuery), api.stories(storyKind), api.articles(topic === 'All topics' ? '' : topic)])
    if (results[0].status === 'fulfilled') setRepos(results[0].value.items); else errs.push('GitHub repositories')
    if (results[1].status === 'fulfilled') setStories(results[1].value.items); else errs.push('Hacker News stories')
    if (results[2].status === 'fulfilled') setArticles(results[2].value.items); else errs.push('Dev.to articles')
    setErrors(errs)
    try { const s = await api.saved(); setSavedEnabled(s.enabled); setSaved(s.items || []) } catch { /* Saved items are optional. */ }
    setLoading(false); setRefreshing(false)
  }, [repoQuery, storyKind, topic])

  useEffect(() => { void loadData() }, [loadData])
  useEffect(() => { if (toast) { const t = window.setTimeout(() => setToast(''), 3200); return () => window.clearTimeout(t) } }, [toast])

  const globalMatches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return { repos, stories, articles }
    return { repos: repos.filter(x => `${x.fullName} ${x.description || ''} ${x.language || ''}`.toLowerCase().includes(q)), stories: stories.filter(x => `${x.title} ${x.author}`.toLowerCase().includes(q)), articles: articles.filter(x => `${x.title} ${x.description} ${x.tags.join(' ')}`.toLowerCase().includes(q)) }
  }, [query, repos, stories, articles])

  async function toggleSave(kind: Kind, item: Repo | Story | Article) {
    const id = `${kind}:${item.id}`
    const existing = saved.some(s => s.id === id)
    if (existing) {
      if (savedEnabled) { try { await api.remove(id) } catch (e) { setToast(e instanceof Error ? e.message : 'Could not remove saved item'); return } }
      setSaved(prev => prev.filter(s => s.id !== id)); setToast('Removed from your reading list'); return
    }
    let title = '', url = '', metadata: Record<string, unknown> = {}
    if (kind === 'repository') { const r = item as Repo; title = r.fullName; url = r.url; metadata = { stars: r.stars, language: r.language } }
    else if (kind === 'story') { const s = item as Story; title = s.title; url = s.url; metadata = { score: s.score, comments: s.comments } }
    else { const a = item as Article; title = a.title; url = a.url; metadata = { author: a.author, tags: a.tags } }
    const next: SavedItem = { id, kind, title, url, metadata }
    if (savedEnabled) { try { await api.save(next) } catch (e) { setToast(e instanceof Error ? e.message : 'Could not save item'); return } }
    setSaved(prev => [next, ...prev]); setToast(savedEnabled ? 'Saved to your reading list' : 'Saved for this session · connect Neon to persist')
  }

  const isSaved = (kind: Kind, id: number) => saved.some(s => s.id === `${kind}:${id}`)
  const shownRepos = globalMatches.repos
  const shownStories = globalMatches.stories
  const shownArticles = globalMatches.articles
  const briefing = useMemo(() => {
    const topRepo = [...repos].sort((a,b) => b.stars-a.stars)[0]
    const topStory = [...stories].sort((a,b) => b.score-a.score)[0]
    const topArticle = [...articles].sort((a,b) => b.reactions-a.reactions)[0]
    return { topRepo, topStory, topArticle }
  }, [repos, stories, articles])

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Activity size={21}/></div><div><div className="brand-name">devpulse<span>.</span></div><div className="brand-sub">DEVELOPER INTELLIGENCE</div></div><button className="icon-button mobile-close" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X size={18}/></button></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="nav-list">{nav.map(({label,icon:Icon}) => <button key={label} className={`nav-item ${section===label?'active':''}`} onClick={() => {setSection(label);setMobileNav(false)}}><Icon size={17}/><span>{label}</span>{label==='Saved' && saved.length>0 && <span className="nav-count">{saved.length}</span>}{label==='Overview' && <span className="nav-dot"/>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="api-status"><div className="status-top"><span className="status-light"/> LIVE SOURCES</div><div className="source-row"><span className="source-icon github"><Github size={14}/></span><span>GitHub REST API</span><span className="source-live">LIVE</span></div><div className="source-row"><span className="source-icon hn">Y</span><span>Hacker News API</span><span className="source-live">LIVE</span></div><div className="source-row"><span className="source-icon dev">D</span><span>Dev.to API</span><span className="source-live">LIVE</span></div></div><div className="profile"><div className="avatar">DP</div><div className="profile-text"><strong>Developer</strong><span>Free workspace</span></div><ChevronDown size={15} className="muted-icon"/></div></div>
    </aside>
    {mobileNav && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)}/>}
    <main className="main-area">
      <header className="topbar"><button className="icon-button mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={20}/></button><div className="breadcrumb">Workspace <span>/</span> <strong>{section}</strong></div><div className="topbar-right"><div className="system-status"><span className="status-light"/> All systems operational</div><button className={`icon-button refresh-button ${refreshing?'spinning':''}`} onClick={() => void loadData(true)} title="Refresh feeds" aria-label="Refresh feeds"><RefreshCw size={17}/></button><div className="top-avatar">DP</div></div></header>
      <div className="content-wrap">
        <section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line"/> TUESDAY, OCTOBER 27, 2026</div><h1>Your daily pulse on <span>technology.</span></h1><p className="welcome-copy">The projects, conversations, and ideas shaping the developer world.</p></div><button className="button-secondary" onClick={() => void loadData(true)}><RefreshCw size={15}/> Refresh data</button></section>
        <div className="search-bar"><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search repositories, stories, articles..." aria-label="Search all feeds"/><kbd>Search all feeds</kbd>{query && <button className="clear-search" onClick={() => setQuery('')} aria-label="Clear search"><X size={15}/></button>}</div>
        {errors.length>0 && <div className="notice error-notice"><Activity size={16}/><span>Some sources could not load: {errors.join(', ')}. Other feeds remain available.</span><button onClick={() => void loadData(true)}>Retry</button></div>}
        {section==='Overview' && <>
          <section className="stats-grid"><StatCard icon={Github} label="REPOSITORIES TRACKED" value={loading?'—':shortNumber(repos.length)} detail="GitHub search results" tone="cyan"/><StatCard icon={Newspaper} label="TECH STORIES" value={loading?'—':shortNumber(stories.length)} detail="Hacker News feed" tone="purple"/><StatCard icon={BookOpen} label="ARTICLES DISCOVERED" value={loading?'—':shortNumber(articles.length)} detail="Dev.to community" tone="orange"/><StatCard icon={Bookmark} label="YOUR READING LIST" value={String(saved.length)} detail={savedEnabled?'Synced with Neon':'Saved this session'} tone="green"/></section>
          <section className="briefing-panel"><div className="briefing-icon"><Sparkles size={18}/></div><div className="briefing-content"><div className="section-kicker">YOUR DAILY BRIEFING <span className="today-pill">TODAY</span></div><h2>A quick read on what's moving in tech.</h2><p>Based on live popularity signals from GitHub stars, Hacker News votes, and Dev.to reactions — not a measure of quality.</p><div className="briefing-highlights"><BriefingItem icon={TrendingUp} label="PROJECT TO WATCH" title={briefing.topRepo?.fullName || 'Loading repositories…'} meta={briefing.topRepo?`${shortNumber(briefing.topRepo.stars)} stars`:'GitHub'}/><BriefingItem icon={MessageCircle} label="CONVERSATION PICK" title={briefing.topStory?.title || 'Loading stories…'} meta={briefing.topStory?`${shortNumber(briefing.topStory.score)} points`:'Hacker News'}/><BriefingItem icon={BookOpen} label="COMMUNITY READ" title={briefing.topArticle?.title || 'Loading articles…'} meta={briefing.topArticle?`${shortNumber(briefing.topArticle.reactions)} reactions`:'Dev.to'}/></div></div></section>
          <div className="section-heading"><div><div className="section-kicker">THE DISCOVERY FEED</div><h2>Explore what's happening</h2></div><span className="live-badge"><span className="status-light"/> LIVE DATA</span></div>
          <div className="feed-grid"><section className="feed-panel"><PanelHeading icon={Github} title="Trending repositories" subtitle="Popular open-source projects" action={() => setSection('Repositories')}/><div className="repo-list">{loading?<SkeletonRows/>:shownRepos.slice(0,4).map(r=><RepoRow key={r.id} repo={r} saved={isSaved('repository',r.id)} onSave={() => void toggleSave('repository',r)}/>)}</div></section><section className="feed-panel"><PanelHeading icon={Flame} title="Tech conversations" subtitle="The stories developers discuss" action={() => setSection('Tech News')}/><div className="story-list">{loading?<SkeletonRows/>:shownStories.slice(0,4).map(s=><StoryRow key={s.id} story={s} saved={isSaved('story',s.id)} onSave={() => void toggleSave('story',s)}/>)}</div></section></div>
          <section className="feed-panel articles-panel"><PanelHeading icon={BookOpen} title="From the community" subtitle="Fresh perspectives from Dev.to" action={() => setSection('Articles')}/><div className="article-grid">{loading?<SkeletonRows/>:shownArticles.slice(0,3).map(a=><ArticleCard key={a.id} article={a} saved={isSaved('article',a.id)} onSave={() => void toggleSave('article',a)}/>)}</div></section>
        </>}
        {section==='Repositories' && <><div className="section-heading page-heading"><div><div className="section-kicker">OPEN SOURCE RADAR</div><h2>Repositories worth exploring</h2><p>Find projects built and maintained by the developer community.</p></div><div className="filter-select-wrap"><select value={repoQuery} onChange={e => setRepoQuery(e.target.value)} aria-label="Repository filter"><option value="stars:>1000">Popular · 1k+ stars</option><option value="stars:>100 stars">Growing · 100+ stars</option><option value="created:>2026-01-01">Created in 2026</option><option value="language:Python stars:>100">Python projects</option><option value="language:TypeScript stars:>100">TypeScript projects</option></select></div></div><div className="repo-grid">{loading?<SkeletonRows/>:shownRepos.map(r=><RepoCard key={r.id} repo={r} saved={isSaved('repository',r.id)} onSave={() => void toggleSave('repository',r)}/>)}</div></>}
        {section==='Tech News' && <><div className="section-heading page-heading"><div><div className="section-kicker">THE FRONT PAGE OF TECH</div><h2>What developers are talking about</h2><p>Stories and discussions from the Hacker News community.</p></div><div className="segmented">{[['top','Top'],['new','New'],['best','Best']].map(([value,label])=><button key={value} className={storyKind===value?'selected':''} onClick={() => setStoryKind(value)}>{label}</button>)}</div></div><div className="news-list">{loading?<SkeletonRows/>:shownStories.map((s,i)=><StoryCard key={s.id} story={s} index={i+1} saved={isSaved('story',s.id)} onSave={() => void toggleSave('story',s)}/>)}</div></>}
        {section==='Articles' && <><div className="section-heading page-heading"><div><div className="section-kicker">IDEAS FROM DEVELOPERS</div><h2>Learn something new</h2><p>Practical tutorials, opinions, and technical deep dives.</p></div><div className="filter-select-wrap"><select value={topic} onChange={e => setTopic(e.target.value)} aria-label="Filter article topics">{topics.map(t=><option key={t} value={t}>{t==='All topics'?'All topics':`#${t}`}</option>)}</select></div></div><div className="article-grid article-page-grid">{loading?<SkeletonRows/>:shownArticles.map(a=><ArticleCard key={a.id} article={a} saved={isSaved('article',a.id)} onSave={() => void toggleSave('article',a)}/>)}</div></>}
        {section==='Saved' && <><div className="section-heading page-heading"><div><div className="section-kicker">YOUR PERSONAL COLLECTION</div><h2>Saved for later</h2><p>Keep useful projects, discussions, and articles close at hand.</p></div><span className={`storage-badge ${savedEnabled?'connected':''}`}>{savedEnabled?<Check size={14}/>:<Bookmark size={14}/>} {savedEnabled?'Neon connected':'Session storage'}</span></div>{!saved.length?<div className="empty-state"><div className="empty-icon"><Bookmark size={25}/></div><h3>Your reading list is waiting</h3><p>Use the bookmark icon on any repository, story, or article to save it here.</p><button className="button-primary" onClick={() => setSection('Overview')}>Explore the feed <ArrowUpRight size={15}/></button></div>:<div className="saved-list">{saved.map(s=><div className="saved-row" key={s.id}><div className={`saved-type ${s.kind}`}><SavedIcon kind={s.kind}/></div><div className="saved-main"><div className="saved-kind">{s.kind}</div><a href={s.url} target="_blank" rel="noreferrer">{s.title} <ExternalLink size={12}/></a></div><button className="icon-button remove-button" onClick={() => void toggleSavedDirect(s)} title="Remove saved item"><X size={16}/></button></div>)}</div>}</>}
        <footer className="footer"><div><span className="footer-brand">devpulse<span>.</span></span><span>Built for curious developers.</span></div><div className="footer-sources"><span><span className="status-light"/> GitHub</span><span><span className="status-light"/> Hacker News</span><span><span className="status-light"/> Dev.to</span></div><span className="footer-note">Data provided by public APIs</span></footer>
      </div>
    </main>
    {toast && <div className="toast"><Check size={16}/>{toast}<button onClick={() => setToast('')} aria-label="Dismiss notification"><X size={14}/></button></div>}
  </div>

  async function toggleSavedDirect(item: SavedItem) {
    if (savedEnabled) { try { await api.remove(item.id) } catch (e) { setToast(e instanceof Error ? e.message : 'Could not remove saved item'); return } }
    setSaved(prev => prev.filter(s => s.id !== item.id)); setToast('Removed from your reading list')
  }
}

function StatCard({icon:Icon,label,value,detail,tone}:{icon:typeof Activity;label:string;value:string;detail:string;tone:string}) { return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={18}/></div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-detail"><span className="detail-dot"/>{detail}</div><div className="stat-spark"><ArrowDownRight size={16}/></div></div> }
function BriefingItem({icon:Icon,label,title,meta}:{icon:typeof Activity;label:string;title:string;meta:string}) { return <div className="briefing-item"><div className="briefing-item-icon"><Icon size={15}/></div><div className="briefing-item-copy"><span>{label}</span><strong title={title}>{title}</strong><small>{meta}</small></div><ArrowUpRight size={14} className="briefing-arrow"/></div> }
function PanelHeading({icon:Icon,title,subtitle,action}:{icon:typeof Activity;title:string;subtitle:string;action:()=>void}) { return <div className="panel-heading"><div className="panel-heading-left"><div className="panel-title-icon"><Icon size={16}/></div><div><h3>{title}</h3><p>{subtitle}</p></div></div><button className="text-link" onClick={action}>View all <ArrowUpRight size={13}/></button></div> }
function SaveButton({saved,onClick}:{saved:boolean;onClick:()=>void}) { return <button className={`save-button ${saved?'saved':''}`} onClick={onClick} title={saved?'Remove bookmark':'Save for later'} aria-label={saved?'Remove bookmark':'Save for later'}>{saved?<Check size={15}/>:<Bookmark size={15}/>}</button> }
function RepoRow({repo:r,saved,onSave}:{repo:Repo;saved:boolean;onSave:()=>void}) { return <div className="repo-row"><div className="repo-avatar"><Github size={17}/></div><div className="repo-row-main"><a className="repo-name" href={r.url} target="_blank" rel="noreferrer">{r.fullName}<ExternalLink size={11}/></a><p>{r.description || 'No description provided.'}</p><div className="repo-meta"><span><Star size={12}/>{shortNumber(r.stars)}</span><span><GitFork size={12}/>{shortNumber(r.forks)}</span>{r.language&&<span className="language"><i/>{r.language}</span>}</div></div><SaveButton saved={saved} onClick={onSave}/></div> }
function StoryRow({story:s,saved,onSave}:{story:Story;saved:boolean;onSave:()=>void}) { return <div className="story-row"><div className="story-score"><ArrowUpRight size={13}/><strong>{shortNumber(s.score)}</strong><small>POINTS</small></div><div className="story-row-main"><a href={s.url} target="_blank" rel="noreferrer">{s.title}<ExternalLink size={11}/></a><div className="story-meta"><span>by {s.author}</span><span><MessageCircle size={12}/>{s.comments}</span><span>{relativeTime(s.time)}</span></div></div><SaveButton saved={saved} onClick={onSave}/></div> }
function RepoCard({repo:r,saved,onSave}:{repo:Repo;saved:boolean;onSave:()=>void}) { return <article className="repo-card"><div className="repo-card-top"><div className="repo-avatar large"><Github size={20}/></div><SaveButton saved={saved} onClick={onSave}/></div><a className="repo-card-title" href={r.url} target="_blank" rel="noreferrer">{r.fullName}<ExternalLink size={12}/></a><p>{r.description || 'An open-source project from the developer community.'}</p><div className="repo-card-meta">{r.language&&<span className="language"><i/>{r.language}</span>}<span><Star size={13}/>{shortNumber(r.stars)}</span><span><GitFork size={13}/>{shortNumber(r.forks)}</span></div><div className="repo-card-bottom"><span>Updated {relativeTime(r.updatedAt)}</span><a href={r.url} target="_blank" rel="noreferrer">Explore <ArrowUpRight size={13}/></a></div></article> }
function StoryCard({story:s,index,saved,onSave}:{story:Story;index:number;saved:boolean;onSave:()=>void}) { return <article className="news-card"><div className="news-index">{String(index).padStart(2,'0')}</div><div className="news-vote"><ArrowUpRight size={16}/><strong>{shortNumber(s.score)}</strong><span>points</span></div><div className="news-main"><a className="news-title" href={s.url} target="_blank" rel="noreferrer">{s.title}<ExternalLink size={13}/></a><div className="news-meta"><span>Posted by <strong>{s.author}</strong></span><span>{relativeTime(s.time)}</span><a href={s.discussionUrl} target="_blank" rel="noreferrer"><MessageCircle size={13}/>{s.comments} comments</a></div></div><SaveButton saved={saved} onClick={onSave}/></article> }
function ArticleCard({article:a,saved,onSave}:{article:Article;saved:boolean;onSave:()=>void}) { return <article className="article-card">{a.coverImage?<a className="article-cover" href={a.url} target="_blank" rel="noreferrer"><img src={a.coverImage} alt="" loading="lazy" onError={e => {e.currentTarget.style.display='none'}}/></a>:<div className="article-cover article-cover-placeholder"><Code2 size={27}/><span>DEV COMMUNITY</span></div>}<div className="article-card-body"><div className="article-card-top"><span className="source-label"><span className="dev-letter">D</span> DEV.TO</span><SaveButton saved={saved} onClick={onSave}/></div><a className="article-title" href={a.url} target="_blank" rel="noreferrer">{a.title}<ExternalLink size={12}/></a><p className="article-description">{a.description || 'A fresh perspective from the developer community.'}</p><div className="tag-list">{a.tags.slice(0,3).map(tag=><span key={tag}>#{tag}</span>)}</div><div className="article-card-footer"><div className="author-avatar">{a.author.slice(0,1).toUpperCase()}</div><div className="author-details"><strong>{a.author}</strong><span>{a.readingTime} min read</span></div><span className="reaction-count"><Sparkles size={13}/>{shortNumber(a.reactions)}</span></div></div></article> }
function SavedIcon({kind}:{kind:string}) { if(kind==='repository')return <Github size={17}/>; if(kind==='story')return <Newspaper size={17}/>; return <BookOpen size={17}/> }
function SkeletonRows() { return <div className="skeleton-list"><div/><div/><div/><div/></div> }
