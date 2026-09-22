import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  BookOpen,
  Check,
  Code2,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  Flame,
  GitBranch,
  Layers,
  LayoutDashboard,
  Lock,
  LogOut,
  Moon,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Sparkles,
  Sun,
  Target,
  Trash2,
  Trophy,
  UserRound,
  X
} from 'lucide-react'
import { api, Problem, Dashboard as DashboardData, setToken, User } from './api'

type View = 'dashboard' | 'library' | 'revision' | 'topics' | 'achievements' | 'settings'
type Theme = 'light' | 'dark'

interface TopicMeta {
  name: string
  branch: 'linear' | 'hierarchical' | 'relational' | 'optimization'
  color: string
}

const TOPIC_TAXONOMY: TopicMeta[] = [
  { name: 'Arrays & Hashing', branch: 'linear', color: 'var(--pill-arrays)' },
  { name: 'Two Pointers', branch: 'linear', color: 'var(--pill-pointers)' },
  { name: 'Sliding Window', branch: 'linear', color: 'var(--pill-search)' },
  { name: 'Linked Lists', branch: 'linear', color: 'var(--pill-lists)' },

  { name: 'Trees & BST', branch: 'hierarchical', color: 'var(--pill-trees)' },
  { name: 'Heaps & Queues', branch: 'hierarchical', color: 'var(--pill-stack)' },
  { name: 'Trie Structures', branch: 'hierarchical', color: 'var(--pill-trees)' },
  { name: 'Segment Trees', branch: 'hierarchical', color: 'var(--pill-trees)' },

  { name: 'Graphs & BFS/DFS', branch: 'relational', color: 'var(--pill-graphs)' },
  { name: 'Shortest Paths', branch: 'relational', color: 'var(--pill-graphs)' },
  { name: 'Union Find', branch: 'relational', color: 'var(--pill-graphs)' },
  { name: 'Topological Sort', branch: 'relational', color: 'var(--pill-graphs)' },

  { name: 'Binary Search', branch: 'optimization', color: 'var(--pill-search)' },
  { name: 'Dynamic Programming', branch: 'optimization', color: 'var(--pill-dp)' },
  { name: 'Backtracking', branch: 'optimization', color: 'var(--pill-pointers)' },
  { name: 'Greedy Intervals', branch: 'optimization', color: 'var(--pill-arrays)' }
]

const fmtDate = (d: string | Date) =>
  new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(d))

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [view, setView] = useState<View>('dashboard')
  const [dash, setDash] = useState<DashboardData | null>(null)
  const [problems, setProblems] = useState<Problem[]>([])
  const [due, setDue] = useState<Problem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [toast, setToast] = useState('')
  const [selectedTopicFilter, setSelectedTopicFilter] = useState<string>('all')
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setShowAccountMenu(false)
      }
    }
    if (showAccountMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showAccountMenu])

  // Theme Management (Aged Paper / Dark Espresso)
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('dsa-vault-theme') as Theme | null
    if (saved === 'dark' || saved === 'light') return saved
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('dsa-vault-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'))

  const notify = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(''), 3000)
  }

  const reload = async () => {
    try {
      const [dashboard, list, queue] = await Promise.all([
        api<DashboardData>('/dashboard'),
        api<Problem[]>('/problems'),
        api<Problem[]>('/revisions/due')
      ])
      setDash(dashboard)
      setProblems(list)
      setDue(queue)
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not refresh vault data.')
    }
  }

  useEffect(() => {
    api<User>('/auth/me')
      .then(u => {
        setUser(u)
        return reload()
      })
      .catch(() => setToken(''))
      .finally(() => setLoading(false))
  }, [])

  const login = async (mode: 'login' | 'signup', payload: Record<string, string>) => {
    const result = await api<{ token: string; user: User }>(`/auth/${mode}`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    setToken(result.token)
    setUser(result.user)
    await reload()
  }

  const logout = () => {
    setToken('')
    setUser(null)
    setDash(null)
    setProblems([])
    setDue([])
    setView('dashboard')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeContent: 'center', textAlign: 'center', gap: '16px' }}>
        <div className="brand-notebook-mark" style={{ width: '42px', height: '42px', margin: '0 auto', fontSize: '20px' }}>
          V
        </div>
        <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '18px', color: 'var(--text-secondary)' }}>
          Opening your notebook…
        </p>
      </div>
    )
  }

  if (!user) return <Auth onSubmit={login} />

  const completeReview = async (id: string, quality: number) => {
    await api(`/problems/${id}/review`, { method: 'POST', body: JSON.stringify({ quality }) })
    await reload()
    notify(quality >= 4 ? 'Approach locked in. Next recall interval expanded.' : 'Noted. Review scheduled for tomorrow.')
  }

  const navigateToLibraryWithTopic = (topicName: string) => {
    setSelectedTopicFilter(topicName)
    setView('library')
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative', width: '100%', maxWidth: '100%', overflowX: 'clip' }}>
      {/* Floating Top Navigation Island (illoca style) */}
      <header className="journal-nav-bar">
        <div className="journal-nav-inner">
          <div className="journal-brand" onClick={() => setView('dashboard')}>
            <div className="brand-notebook-mark">V</div>
            <div className="brand-name">
              DSA Vault <span>/ journal</span>
            </div>
          </div>

          <nav className="journal-tabs">
            <button className={`journal-tab ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>
              Overview
            </button>
            <button className={`journal-tab ${view === 'library' ? 'active' : ''}`} onClick={() => { setSelectedTopicFilter('all'); setView('library') }}>
              Index {problems.length ? <span className="tab-badge">{problems.length}</span> : null}
            </button>
            <button className={`journal-tab ${view === 'revision' ? 'active' : ''}`} onClick={() => setView('revision')}>
              Recall Arena {due.length ? <span className="tab-badge">{due.length}</span> : null}
            </button>
            <button className={`journal-tab ${view === 'topics' ? 'active' : ''}`} onClick={() => setView('topics')}>
              Knowledge Map
            </button>
            <button className={`journal-tab ${view === 'achievements' ? 'active' : ''}`} onClick={() => setView('achievements')}>
              Ex Libris
            </button>
          </nav>

          <div className="journal-nav-actions">
            <button className="btn-theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === 'light' ? 'Dark Espresso' : 'Warm Paper'} mode`}>
              {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
            </button>

            <button className="btn-add-stamped" onClick={() => setShowAdd(true)}>
              <Plus size={14} /> <span className="btn-add-label">Add Problem</span>
            </button>

            <div className="account-menu-container" ref={accountMenuRef}>
              <button
                type="button"
                className="btn-account-avatar"
                onClick={() => setShowAccountMenu(prev => !prev)}
                aria-expanded={showAccountMenu}
                aria-haspopup="true"
                title={`Account: ${user.name}`}
              >
                <div className="account-avatar-circle">
                  {user.name ? user.name[0].toUpperCase() : 'U'}
                </div>
              </button>

              {showAccountMenu && (
                <div className="account-dropdown-menu" role="menu">
                  <div className="account-dropdown-profile">
                    <div className="account-dropdown-avatar">
                      {user.name ? user.name[0].toUpperCase() : 'U'}
                    </div>
                    <div className="account-dropdown-meta">
                      <span className="account-user-name">{user.name}</span>
                      <span className="account-user-email">{user.email}</span>
                    </div>
                  </div>

                  <div className="account-dropdown-divider" />

                  <button
                    type="button"
                    className="account-dropdown-item"
                    role="menuitem"
                    onClick={() => {
                      setView('settings')
                      setShowAccountMenu(false)
                    }}
                  >
                    <Settings size={15} />
                    <span>Vault Settings</span>
                  </button>

                  <button
                    type="button"
                    className="account-dropdown-item"
                    role="menuitem"
                    onClick={() => {
                      toggleTheme()
                    }}
                  >
                    {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
                    <span>{theme === 'light' ? 'Dark Espresso Theme' : 'Warm Paper Theme'}</span>
                  </button>

                  <div className="account-dropdown-divider" />

                  <button
                    type="button"
                    className="account-dropdown-item sign-out"
                    role="menuitem"
                    onClick={() => {
                      setShowAccountMenu(false)
                      logout()
                    }}
                  >
                    <LogOut size={15} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Journal Canvas */}
      <main className="journal-canvas">
        {view === 'dashboard' && (
          <Dashboard
            user={user}
            data={dash}
            due={due}
            problems={problems}
            startRevision={() => setView('revision')}
            onSelectTopic={navigateToLibraryWithTopic}
          />
        )}

        {view === 'library' && (
          <Library
            problems={problems}
            reload={reload}
            notify={notify}
            initialTopicFilter={selectedTopicFilter}
            onOpenAdd={() => setShowAdd(true)}
          />
        )}

        {view === 'revision' && <Revision due={due} complete={completeReview} />}

        {view === 'topics' && (
          <TopicsView
            data={dash}
            problems={problems}
            onSelectTopic={navigateToLibraryWithTopic}
          />
        )}

        {view === 'achievements' && <AchievementsView data={dash} problems={problems} />}

        {view === 'settings' && (
          <SettingsPage
            user={user}
            theme={theme}
            toggleTheme={toggleTheme}
            update={setUser}
            logout={logout}
            notify={notify}
          />
        )}
      </main>

      {/* Mobile Fixed Bottom Navigation Bar (< 769px) */}
      <nav className="journal-bottom-bar" aria-label="Mobile Navigation">
        <button
          className={`bottom-bar-tab ${view === 'dashboard' ? 'active' : ''}`}
          onClick={() => setView('dashboard')}
          aria-label="Overview"
        >
          <LayoutDashboard size={18} />
          <span>Overview</span>
        </button>

        <button
          className={`bottom-bar-tab ${view === 'library' ? 'active' : ''}`}
          onClick={() => { setSelectedTopicFilter('all'); setView('library') }}
          aria-label="Problem Index"
        >
          <div className="bottom-bar-tab-icon-wrap">
            <BookOpen size={18} />
            {problems.length > 0 && <span className="bottom-bar-badge">{problems.length}</span>}
          </div>
          <span>Index</span>
        </button>

        <button
          className={`bottom-bar-tab ${view === 'revision' ? 'active' : ''}`}
          onClick={() => setView('revision')}
          aria-label="Recall Arena"
        >
          <div className="bottom-bar-tab-icon-wrap">
            <RotateCcw size={18} />
            {due.length > 0 && <span className="bottom-bar-badge due">{due.length}</span>}
          </div>
          <span>Recall</span>
        </button>

        <button
          className={`bottom-bar-tab ${view === 'topics' ? 'active' : ''}`}
          onClick={() => setView('topics')}
          aria-label="Knowledge Map"
        >
          <GitBranch size={18} />
          <span>Map</span>
        </button>

        <button
          className={`bottom-bar-tab ${view === 'achievements' ? 'active' : ''}`}
          onClick={() => setView('achievements')}
          aria-label="Ex Libris"
        >
          <Trophy size={18} />
          <span>Ex Libris</span>
        </button>
      </nav>

      {/* Add Modal */}
      {showAdd && (
        <AddModal
          close={() => setShowAdd(false)}
          done={async data => {
            await api('/problems/bulk', { method: 'POST', body: JSON.stringify(data) })
            await reload()
            setShowAdd(false)
            notify('Indexed into vault notebook.')
          }}
        />
      )}

      {/* Handcrafted Toast */}
      {toast && (
        <div className="journal-toast">
          <Check size={14} style={{ color: 'var(--accent-clay)' }} />
          <span>{toast}</span>
        </div>
      )}
    </div>
  )
}

/* ==========================================================================
   1. DASHBOARD — The Editorial Overview
   ========================================================================== */
function Dashboard({
  user,
  data,
  due,
  problems,
  startRevision,
  onSelectTopic
}: {
  user: User
  data: DashboardData | null
  due: Problem[]
  problems: Problem[]
  startRevision: () => void
  onSelectTopic: (topic: string) => void
}) {
  if (!data) return null

  const streak = data.streak
  const total = problems.length

  // Activity calculation (112 days = 16 weeks)
  const activityMap = new Map(data.activity.map(x => [x._id, x.count]))
  const days = Array.from({ length: 112 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - 111 + i)
    const key = d.toISOString().slice(0, 10)
    return { date: key, count: activityMap.get(key) || 0 }
  })

  // Easy / Med / Hard counts
  const easy = problems.filter(p => p.difficulty === 'Easy').length
  const med = problems.filter(p => p.difficulty === 'Medium').length
  const hard = problems.filter(p => p.difficulty === 'Hard').length

  return (
    <div className="dashboard-view">
      {/* Editorial Headline Moment (illoca style) */}
      <section className="hero-statement-section">
        <div className="annotation-badge">
          <span>ARCHITECTURAL RECALL</span>
          <span className="scribble-arrow">↗</span>
          <span style={{ fontSize: '15px', color: 'var(--text-muted)' }}>[proof of work]</span>
        </div>

        <h1 className="hero-statement-title">
          {due.length > 0 ? (
            <>
              You are on a <em>{streak}-day</em> streak.
              <br />
              {due.length} algorithmic problem{due.length > 1 ? 's' : ''} call for recall today.
            </>
          ) : total > 0 ? (
            <>
              Your algorithms are <em>resting quietly</em>.
              <br />
              {total} patterns committed to long-term memory.
            </>
          ) : (
            <>
              Your clean notebook awaits.
              <br />
              Index your <em>first algorithm</em> to start the spaced repetition loop.
            </>
          )}
        </h1>

        <div className="hero-stats-grid">
          <div className="hero-stat-card">
            <span className="hero-stat-val">{total}</span>
            <span className="hero-stat-desc">indexed solutions</span>
          </div>
          <div className="hero-stat-card">
            <span className="hero-stat-val">{streak}</span>
            <span className="hero-stat-desc">consecutive days</span>
          </div>
          <div className="hero-stat-card">
            <span className="hero-stat-val">{data.mastery}%</span>
            <span className="hero-stat-desc">7-day retention</span>
          </div>
          <div className="hero-stat-card">
            <div className="hero-stat-val difficulty-counts">
              <span className="diff-chip easy">{easy} E</span>
              <span className="diff-chip med">{med} M</span>
              <span className="diff-chip hard">{hard} H</span>
            </div>
            <span className="hero-stat-desc">difficulty spread</span>
          </div>
        </div>
      </section>

      {/* Visual Hero: Organic Botanical Growth Stem (Streak) */}
      <section className="streak-growth-banner">
        <div className="streak-growth-copy">
          <div className="streak-tag">
            <span>GROWTH STEM</span>
            <span style={{ fontSize: '13px' }}>— active habit</span>
          </div>
          <h2>{streak > 0 ? `${streak} days of deliberate recall.` : 'Begin your daily growth stem.'}</h2>
          <p>
            {due.length > 0
              ? 'Spaced repetition works like layered memory strata. Complete today’s recall reps to advance your intervals.'
              : 'All scheduled intervals have been met. Practice fresh problems or review past topics below.'}
          </p>
        </div>

        {/* Botanical 7-Day Stem Representation */}
        <div className="botanical-stem-container">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((dayChar, i) => {
            const isActive = i < Math.min(7, Math.max(1, streak))
            const isToday = i === Math.min(6, streak - 1)
            return (
              <div key={i} className={`stem-node ${isActive ? 'active' : ''}`}>
                <div className={`stem-leaf ${isToday ? 'today' : isActive ? 'active' : ''}`} />
                <span className="stem-day-label">{dayChar}</span>
              </div>
            )
          })}
        </div>

        <button className="streak-action-btn" onClick={startRevision}>
          {due.length ? `Begin Recall Session (${due.length}) →` : 'Practice Spaced Cards →'}
        </button>
      </section>

      {/* The WOW Feature: Interactive Hand-Drawn Knowledge Graph */}
      <section className="knowledge-tree-section">
        <div className="section-editorial-header">
          <div>
            <h2>Interactive Algorithm Knowledge Tree</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              A hand-mapped diagram of how data structures relate. Hover branches or select nodes to inspect your coverage.
            </p>
          </div>
          <span className="annotation">connected nodes ───○</span>
        </div>

        <InteractiveTopicGraph problems={problems} onSelectTopic={onSelectTopic} />
      </section>

      {/* Today's Queue & Activity Calendar Row */}
      <section className="editorial-two-col">
        {/* Next Due Queue */}
        <div className="editorial-card">
          <div className="editorial-card-header">
            <h3>Today's Review Docket</h3>
            <button className="editorial-link" onClick={startRevision}>
              Review queue ({due.length}) →
            </button>
          </div>

          <div>
            {due.length ? (
              due.slice(0, 4).map((p, idx) => (
                <div key={p._id} className="queue-row">
                  <div className="queue-left">
                    <span className="queue-idx">#{String(idx + 1).padStart(2, '0')}</span>
                    <div>
                      <span className="queue-title">{p.title}</span>
                      <span className="queue-subtext">
                        <span className="genre-pill" style={{ background: getTopicColor(p.topic) }}>
                          {p.topic}
                        </span>
                        <span>{p.platform}</span>
                        <span>·</span>
                        <span className="difficulty-bullet">
                          {p.difficulty === 'Easy' ? '●○○ Easy' : p.difficulty === 'Medium' ? '●●○ Med' : '●●● Hard'}
                        </span>
                      </span>
                    </div>
                  </div>

                  <button className="editorial-link" onClick={startRevision}>
                    Recall →
                  </button>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-secondary)' }}>
                <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '17px', color: 'var(--text-ink)', marginBottom: '4px' }}>
                  The docket is empty.
                </p>
                <p style={{ fontSize: '12.5px' }}>Every active problem has been revised for this cycle.</p>
              </div>
            )}
          </div>
        </div>

        {/* Handcrafted Activity Matrix */}
        <div className="editorial-card">
          <div className="editorial-card-header">
            <h3>Consistency Log</h3>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
              16 weeks recorded
            </span>
          </div>

          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
            Each mark represents an algorithm solved or recalled on that day.
          </p>

          <div className="activity-matrix-scroll-wrap">
            <div className="activity-matrix">
              {days.map((d, i) => {
                const lvl = d.count >= 4 ? 'lvl-4' : d.count >= 3 ? 'lvl-3' : d.count >= 2 ? 'lvl-2' : d.count >= 1 ? 'lvl-1' : ''
                return (
                  <div
                    key={i}
                    className={`matrix-cell ${lvl}`}
                    title={`${d.date}: ${d.count} recorded recall${d.count === 1 ? '' : 's'}`}
                  />
                )
              })}
            </div>
          </div>

          <div className="matrix-meta">
            <span>{data.activity.reduce((a, b) => a + b.count, 0)} total reviews logged</span>
            <span>Regularity &gt; Cramming</span>
          </div>
        </div>
      </section>
    </div>
  )
}

/* ==========================================================================
   INTERACTIVE HAND-DRAWN TOPIC GRAPH (The WOW Feature)
   ========================================================================== */
function InteractiveTopicGraph({
  problems,
  onSelectTopic
}: {
  problems: Problem[]
  onSelectTopic: (topic: string) => void
}) {
  const [hoveredTopic, setHoveredTopic] = useState<string | null>(null)
  const [activeBranch, setActiveBranch] = useState<string>('all')

  const branches = [
    {
      id: 'linear',
      title: 'Linear & Sequences',
      topics: ['Arrays & Hashing', 'Two Pointers', 'Sliding Window', 'Linked Lists']
    },
    {
      id: 'hierarchical',
      title: 'Trees & Heaps',
      topics: ['Trees & BST', 'Heaps & Queues', 'Trie Structures', 'Segment Trees']
    },
    {
      id: 'relational',
      title: 'Graphs & Networks',
      topics: ['Graphs & BFS/DFS', 'Shortest Paths', 'Union Find', 'Topological Sort']
    },
    {
      id: 'optimization',
      title: 'Search & DP',
      topics: ['Binary Search', 'Dynamic Programming', 'Backtracking', 'Greedy Intervals']
    }
  ]

  return (
    <div className="graph-canvas-box">
      {/* Mobile Branch Filter Bar (Visible on mobile/tablet <= 768px) */}
      <div className="graph-branch-filter-bar">
        <button
          className={`branch-filter-pill ${activeBranch === 'all' ? 'active' : ''}`}
          onClick={() => setActiveBranch('all')}
        >
          All Branches
        </button>
        {branches.map(b => (
          <button
            key={b.id}
            className={`branch-filter-pill ${activeBranch === b.id ? 'active' : ''}`}
            onClick={() => setActiveBranch(b.id)}
          >
            {b.title.split('&')[0].trim()}
          </button>
        ))}
      </div>

      {/* Hand-drawn SVG connector curves between branches */}
      <svg className="graph-svg-layer" preserveAspectRatio="none">
        <path
          d="M 250 80 C 350 40, 550 40, 650 80"
          className={hoveredTopic ? 'active' : ''}
        />
        <path
          d="M 250 160 C 400 130, 600 130, 750 160"
          className={hoveredTopic ? 'active' : ''}
        />
        <path
          d="M 500 100 C 600 180, 800 180, 950 100"
          className={hoveredTopic ? 'active' : ''}
        />
      </svg>

      <div className="graph-nodes-container">
        {branches
          .filter(branch => activeBranch === 'all' || branch.id === activeBranch)
          .map(branch => (
          <div key={branch.id} className="graph-branch-col">
            <h4 className="branch-title">{branch.title}</h4>

            {branch.topics.map(topicName => {
              const count = problems.filter(p => p.topic.toLowerCase().includes(topicName.toLowerCase().split(' ')[0])).length
              const color = getTopicColor(topicName)
              const isSelected = hoveredTopic === topicName

              return (
                <div
                  key={topicName}
                  className={`graph-node-pill ${isSelected ? 'selected' : ''}`}
                  onMouseEnter={() => setHoveredTopic(topicName)}
                  onMouseLeave={() => setHoveredTopic(null)}
                  onClick={() => onSelectTopic(topicName)}
                >
                  <div className="node-pill-top">
                    <span className="node-topic-name">{topicName}</span>
                    <span className="genre-dot" style={{ background: color }} />
                  </div>

                  <div className="node-pill-stats">
                    <span>{count} solved</span>
                    <strong style={{ color: count > 0 ? 'var(--accent-clay)' : 'var(--text-muted)' }}>
                      {count > 0 ? 'Explore →' : 'Empty'}
                    </strong>
                  </div>

                  <div className="node-progress-track">
                    <div
                      className="node-progress-bar"
                      style={{
                        width: `${Math.min(100, count * 15)}%`,
                        background: color
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function getTopicColor(topic: string): string {
  const lower = topic.toLowerCase()
  if (lower.includes('array') || lower.includes('hash')) return 'var(--pill-arrays)'
  if (lower.includes('pointer') || lower.includes('window')) return 'var(--pill-pointers)'
  if (lower.includes('tree') || lower.includes('trie')) return 'var(--pill-trees)'
  if (lower.includes('graph') || lower.includes('path')) return 'var(--pill-graphs)'
  if (lower.includes('dynamic') || lower.includes('dp')) return 'var(--pill-dp)'
  if (lower.includes('list')) return 'var(--pill-lists)'
  if (lower.includes('stack') || lower.includes('queue') || lower.includes('heap')) return 'var(--pill-stack)'
  return 'var(--pill-search)'
}

/* ==========================================================================
   2. PROBLEM LIBRARY — Field Journal Index
   ========================================================================== */
function Library({
  problems,
  reload,
  notify,
  initialTopicFilter,
  onOpenAdd
}: {
  problems: Problem[]
  reload: () => Promise<void>
  notify: (x: string) => void
  initialTopicFilter: string
  onOpenAdd: () => void
}) {
  const [query, setQuery] = useState('')
  const [topicFilter, setTopicFilter] = useState(initialTopicFilter)
  const [diffFilter, setDiffFilter] = useState('all')
  const [editing, setEditing] = useState<Problem | null>(null)

  const filtered = useMemo(() => {
    return problems.filter(p => {
      const matchQ = p.title.toLowerCase().includes(query.toLowerCase()) || p.notes.toLowerCase().includes(query.toLowerCase())
      const matchT = topicFilter === 'all' || p.topic.toLowerCase().includes(topicFilter.toLowerCase())
      const matchD = diffFilter === 'all' || p.difficulty.toLowerCase() === diffFilter.toLowerCase()
      return matchQ && matchT && matchD
    })
  }, [problems, query, topicFilter, diffFilter])

  const deleteProblem = async (id: string) => {
    if (!confirm('Erase this problem entry from your notebook?')) return
    await api(`/problems/${id}`, { method: 'DELETE' })
    await reload()
    notify('Problem erased from journal.')
  }

  return (
    <div>
      <div className="catalog-toolbar">
        <div className="catalog-toolbar-filters">
          <div className="catalog-search">
            <Search size={15} />
            <input
              placeholder="Search problem titles or complexity notes…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>

          <div className="catalog-select-group">
            <select className="catalog-select" value={topicFilter} onChange={e => setTopicFilter(e.target.value)}>
              <option value="all">All Topics ({problems.length})</option>
              {TOPIC_TAXONOMY.map(t => (
                <option key={t.name} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>

            <select className="catalog-select" value={diffFilter} onChange={e => setDiffFilter(e.target.value)}>
              <option value="all">All Difficulties</option>
              <option value="easy">Easy (●○○)</option>
              <option value="medium">Medium (●●○)</option>
              <option value="hard">Hard (●●●)</option>
            </select>
          </div>
        </div>

        <button className="btn-add-stamped catalog-add-btn" onClick={onOpenAdd}>
          <Plus size={14} /> Add Problem
        </button>
      </div>

      {/* Desktop & Tablet Table (>= 769px) */}
      <div className="catalog-table-wrap">
        <table className="catalog-table">
          <thead>
            <tr>
              <th>Folio #</th>
              <th>Algorithm Problem</th>
              <th>Topic Domain</th>
              <th>Complexity &amp; Difficulty</th>
              <th>Platform</th>
              <th>Next Recall</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length ? (
              filtered.map((p, idx) => (
                <tr key={p._id} className="clickable" onClick={() => setEditing(p)}>
                  <td className="catalog-mono">#{String(idx + 1).padStart(3, '0')}</td>
                  <td className="catalog-title">{p.title}</td>
                  <td>
                    <span className="genre-pill" style={{ background: getTopicColor(p.topic) }}>
                      {p.topic}
                    </span>
                  </td>
                  <td>
                    <span className="difficulty-bullet">
                      {p.difficulty === 'Easy' ? '●○○ Easy' : p.difficulty === 'Medium' ? '●●○ Med' : '●●● Hard'}
                    </span>
                  </td>
                  <td className="catalog-mono">{p.platform}</td>
                  <td className="catalog-mono">
                    <span style={{ color: new Date(p.nextReviewAt) <= new Date() ? 'var(--accent-clay)' : 'inherit' }}>
                      {fmtDate(p.nextReviewAt)}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="action-icon-btn touch-btn"
                      onClick={e => {
                        e.stopPropagation()
                        setEditing(p)
                      }}
                      title="Edit Entry"
                      aria-label="Edit problem entry"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      className="action-icon-btn touch-btn"
                      onClick={e => {
                        e.stopPropagation()
                        deleteProblem(p._id)
                      }}
                      title="Delete Entry"
                      aria-label="Delete problem entry"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-secondary)' }}>
                  <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '18px', color: 'var(--text-ink)', marginBottom: '4px' }}>
                    No matching folios found.
                  </p>
                  <p style={{ fontSize: '13px' }}>Adjust your search query or add a new algorithm entry above.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Folio Cards (< 769px) */}
      <div className="catalog-cards-wrap">
        {filtered.length ? (
          filtered.map((p, idx) => (
            <div key={p._id} className="catalog-card-item" onClick={() => setEditing(p)}>
              <div className="catalog-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="catalog-mono">#{String(idx + 1).padStart(3, '0')}</span>
                  <span className="genre-pill" style={{ background: getTopicColor(p.topic) }}>
                    {p.topic}
                  </span>
                </div>
                <span className="difficulty-bullet">
                  {p.difficulty === 'Easy' ? '●○○ Easy' : p.difficulty === 'Medium' ? '●●○ Med' : '●●● Hard'}
                </span>
              </div>

              <h4 className="catalog-card-title">{p.title}</h4>

              {p.notes && <p className="catalog-card-notes">{p.notes}</p>}

              <div className="catalog-card-footer">
                <div className="catalog-card-meta">
                  <span className="catalog-mono">{p.platform}</span>
                  <span className="catalog-mono" style={{ color: new Date(p.nextReviewAt) <= new Date() ? 'var(--accent-clay)' : 'inherit' }}>
                    Recall: {fmtDate(p.nextReviewAt)}
                  </span>
                </div>

                <div className="catalog-card-actions">
                  <button
                    className="action-icon-btn touch-btn"
                    onClick={e => {
                      e.stopPropagation()
                      setEditing(p)
                    }}
                    title="Edit Entry"
                    aria-label="Edit Problem"
                  >
                    <Edit3 size={15} />
                  </button>
                  <button
                    className="action-icon-btn touch-btn delete"
                    onClick={e => {
                      e.stopPropagation()
                      deleteProblem(p._id)
                    }}
                    title="Delete Entry"
                    aria-label="Delete Problem"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="catalog-empty-card">
            <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '18px', color: 'var(--text-ink)', marginBottom: '4px' }}>
              No matching folios found.
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Adjust your search query or add a new algorithm entry above.</p>
          </div>
        )}
      </div>

      {editing && (
        <EditModal
          problem={editing}
          close={() => setEditing(null)}
          done={async updates => {
            await api(`/problems/${editing._id}`, { method: 'PATCH', body: JSON.stringify(updates) })
            await reload()
            setEditing(null)
            notify('Folio entry saved.')
          }}
        />
      )}
    </div>
  )
}

/* ==========================================================================
   3. SMART REVISION — The Tactile Index Card Arena
   ========================================================================== */
function Revision({ due, complete }: { due: Problem[]; complete: (id: string, q: number) => Promise<void> }) {
  const [index, setIndex] = useState(0)
  const [revealNotes, setRevealNotes] = useState(false)
  const [busy, setBusy] = useState(false)

  const current = due[index]

  if (!current) {
    return (
      <div style={{ textAlign: 'center', padding: '70px 20px', maxWidth: '480px', margin: '40px auto' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--accent-clay-subtle)', color: 'var(--accent-clay)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
          <Check size={24} />
        </div>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', fontStyle: 'italic', color: 'var(--text-ink)', marginBottom: '8px' }}>
          Recall Session Concluded.
        </h2>
        <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          You have reviewed every due card in this cycle. Your memory intervals have been safely recalculated and
          stored.
        </p>
      </div>
    )
  }

  const handleRating = async (quality: number) => {
    setBusy(true)
    try {
      await complete(current._id, quality)
      setRevealNotes(false)
      setIndex(prev => prev + 1)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="arena-card-container">
      <div className="arena-progress">
        <span>CARD {index + 1} OF {due.length}</span>
        <span>{Math.round(((index + 1) / due.length) * 100)}% COMPLETED</span>
      </div>

      <div className="tactile-index-card">
        <div className="card-stamped-label">
          <span>RECALL PROMPT // </span>
          <span style={{ color: 'var(--pencil-ink)', fontStyle: 'italic' }}>no peeking until you attempt</span>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
          <span className="genre-pill" style={{ background: getTopicColor(current.topic) }}>
            {current.topic}
          </span>
          <span className="difficulty-bullet">
            {current.difficulty === 'Easy' ? '●○○ Easy' : current.difficulty === 'Medium' ? '●●○ Med' : '●●● Hard'}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>· {current.platform}</span>
        </div>

        <h2 className="card-problem-heading">{current.title}</h2>

        <p className="card-recall-instruction">
          Close your eyes or grab a piece of scrap paper. Mentally walk through:
          <br />
          <strong>1.</strong> The core invariant condition.
          <br />
          <strong>2.</strong> Time and Space complexity bounds.
          <br />
          <strong>3.</strong> One tricky edge case (e.g. empty input, cycle, negative weights).
        </p>

        {revealNotes ? (
          <div className="notes-accordion-box">
            <span style={{ display: 'block', fontFamily: 'var(--font-hand)', fontSize: '16px', color: 'var(--pencil-terracotta)', fontWeight: 700, marginBottom: '6px' }}>
              // YOUR FIELD NOTES
            </span>
            {current.notes ? current.notes : 'No personal note stored for this entry.'}
          </div>
        ) : (
          <button className="btn-reveal-notes" onClick={() => setRevealNotes(true)}>
            <Eye size={15} /> <span>Reveal Stored Implementation &amp; Complexity Note</span>
          </button>
        )}

        <div className="recall-btn-grid">
          <button className="btn-recall-pass" disabled={busy} onClick={() => handleRating(5)}>
            <Check size={16} /> <span>I Remembered (+2.2x interval)</span>
          </button>
          <button className="btn-recall-reset" disabled={busy} onClick={() => handleRating(2)}>
            <RotateCcw size={15} /> <span>Needed a Hint (Review tomorrow)</span>
          </button>
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   4. TOPICS TAXONOMY VIEW (Curated Curriculum Folio)
   ========================================================================== */
function TopicsView({
  data,
  problems,
  onSelectTopic
}: {
  data: DashboardData | null
  problems: Problem[]
  onSelectTopic: (topic: string) => void
}) {
  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '28px', color: 'var(--text-ink)', marginBottom: '4px' }}>
          Algorithmic Taxonomy &amp; Knowledge Folio
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Review the depth of your coverage across every fundamental branch of computer science.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
        {TOPIC_TAXONOMY.map(topic => {
          const matched = problems.filter(p => p.topic.toLowerCase().includes(topic.name.toLowerCase().split(' ')[0]))
          const easy = matched.filter(p => p.difficulty === 'Easy').length
          const med = matched.filter(p => p.difficulty === 'Medium').length
          const hard = matched.filter(p => p.difficulty === 'Hard').length
          const total = matched.length

          return (
            <div
              key={topic.name}
              className="editorial-card"
              style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}
              onClick={() => onSelectTopic(topic.name)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="genre-pill" style={{ background: topic.color }}>
                  {topic.name}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600 }}>
                  {total} Solved
                </span>
              </div>

              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '12px', display: 'flex', gap: '8px' }}>
                <span>{easy} Easy</span>
                <span>·</span>
                <span>{med} Med</span>
                <span>·</span>
                <span>{hard} Hard</span>
              </div>

              <div className="node-progress-track" style={{ marginBottom: '12px' }}>
                <div className="node-progress-bar" style={{ width: `${Math.min(100, total * 12)}%`, background: topic.color }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--accent-clay)', fontWeight: 600 }}>
                <span>Branch: {topic.branch}</span>
                <span>Open in Index →</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ==========================================================================
   5. ACHIEVEMENTS VIEW — Ex Libris Bookplates
   ========================================================================== */
function AchievementsView({ data, problems }: { data: DashboardData | null; problems: Problem[] }) {
  const total = problems.length
  const streak = data?.streak || 0
  const mastery = data?.mastery || 0
  const hardCount = problems.filter(p => p.difficulty === 'Hard').length
  const treeCount = problems.filter(p => p.topic.toLowerCase().includes('tree')).length
  const graphCount = problems.filter(p => p.topic.toLowerCase().includes('graph')).length
  const dpCount = problems.filter(p => p.topic.toLowerCase().includes('dynamic')).length

  const stamps = [
    {
      title: 'Ex Libris Primus',
      desc: 'First problem inscribed into your personal vault.',
      unlocked: total >= 1,
      tag: 'Root Node (1+)'
    },
    {
      title: 'Binary Logarithm',
      desc: 'Reached 10 solved algorithm records.',
      unlocked: total >= 10,
      tag: 'O(log n) Milestones (10+)'
    },
    {
      title: 'The Century Folio',
      desc: '100 algorithms preserved and reviewed.',
      unlocked: total >= 100,
      tag: '100 Solves'
    },
    {
      title: 'The Seven-Day Habit',
      desc: 'Completed daily recall sessions 7 days in a row.',
      unlocked: streak >= 7,
      tag: '7-Day Streak'
    },
    {
      title: 'Arboreal Insight',
      desc: 'Mastered 5+ Binary Search Tree or Tree problems.',
      unlocked: treeCount >= 5,
      tag: 'Trees (5+)'
    },
    {
      title: 'Network Navigator',
      desc: 'Mapped 5+ Graph, BFS, or DFS problems.',
      unlocked: graphCount >= 5,
      tag: 'Graphs (5+)'
    },
    {
      title: 'Subproblem Architect',
      desc: 'Conquered 5+ Dynamic Programming problems.',
      unlocked: dpCount >= 5,
      tag: 'DP (5+)'
    },
    {
      title: 'Hard Complexity',
      desc: 'Successfully solved a Hard complexity problem.',
      unlocked: hardCount >= 1,
      tag: 'Hard Solved'
    },
    {
      title: 'Mastery Engraved',
      desc: 'Achieved a 50%+ retention rate on long intervals.',
      unlocked: mastery >= 50,
      tag: '50%+ Mastery'
    }
  ]

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '28px', color: 'var(--text-ink)', marginBottom: '4px' }}>
          Ex Libris &amp; Algorithmic Bookplates
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Stamps awarded for deliberate practice consistency and structural mastery.
        </p>
      </div>

      <div className="bookplate-grid">
        {stamps.map(s => (
          <div key={s.title} className={`bookplate-card ${s.unlocked ? 'unlocked' : 'locked'}`}>
            <div className="bookplate-stamp">
              <Trophy size={20} />
            </div>

            <div className="bookplate-details">
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
              <span className="bookplate-hand-note">
                {s.unlocked ? `✓ Unlocked [${s.tag}]` : `Incomplete [${s.tag}]`}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ==========================================================================
   6. SETTINGS VIEW
   ========================================================================== */
function SettingsPage({
  user,
  theme,
  toggleTheme,
  update,
  logout,
  notify
}: {
  user: User
  theme: Theme
  toggleTheme: () => void
  update: (u: User) => void
  logout: () => void
  notify: (x: string) => void
}) {
  const [name, setName] = useState(user.name)
  const [curPass, setCurPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      const updated = await api<User>('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({
          name: name.trim(),
          currentPassword: curPass || undefined,
          newPassword: newPass || undefined
        })
      })
      update(updated)
      setCurPass('')
      setNewPass('')
      notify('Notebook credentials updated.')
    } catch (e: any) {
      setErr(e.message || 'Could not update credentials.')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('CAUTION: This will permanently erase your entire DSA Vault and all stored problems from MongoDB. Proceed?')) {
      return
    }
    await api('/auth/me', { method: 'DELETE' })
    logout()
  }

  return (
    <div className="settings-journal-wrap">
      {/* Theme Choice */}
      <div className="settings-card">
        <h3 style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '20px', marginBottom: '8px' }}>
          Visual Theme &amp; Paper Tone
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Switch between warm aged linen paper (light) and dark espresso vellum (dark).
        </p>
        <button
          style={{
            background: 'var(--bg-canvas-subtle)',
            border: '1px solid var(--border-default)',
            padding: '9px 16px',
            borderRadius: 'var(--radius-full)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--text-ink)'
          }}
          onClick={toggleTheme}
        >
          {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
          Currently in {theme === 'light' ? 'Aged Paper (Daylight)' : 'Dark Espresso (Candlelight)'} Mode
        </button>
      </div>

      {/* Profile & Credentials */}
      <div className="settings-card">
        <h3 style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '20px', marginBottom: '8px' }}>
          Author Profile
        </h3>

        <form onSubmit={handleSave}>
          <div className="form-row">
            <label>Name</label>
            <input className="journal-input" value={name} onChange={e => setName(e.target.value)} required />
          </div>

          <div className="form-row">
            <label>Email Address</label>
            <input className="journal-input" value={user.email} disabled style={{ opacity: 0.6 }} />
          </div>

          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px dashed var(--border-default)' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Change Password</h4>

            <div className="form-row">
              <label>Current Password</label>
              <input
                className="journal-input"
                type="password"
                value={curPass}
                onChange={e => setCurPass(e.target.value)}
                placeholder="Required to change password"
              />
            </div>

            <div className="form-row">
              <label>New Password (min 8 characters)</label>
              <input
                className="journal-input"
                type="password"
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                minLength={8}
                placeholder="New password"
              />
            </div>
          </div>

          {err && <p style={{ color: 'var(--accent-clay)', fontSize: '12px', margin: '8px 0' }}>{err}</p>}

          <button className="btn-add-stamped" type="submit" disabled={busy} style={{ marginTop: '12px' }}>
            {busy ? 'Saving…' : 'Save Notebook Changes'}
          </button>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="settings-card" style={{ borderColor: 'var(--accent-clay-border)' }}>
        <h3 style={{ color: 'var(--accent-clay)', fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>
          Erase Journal
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
          Permanently destroy your vault profile and delete all problem records from the MongoDB database.
        </p>
        <button
          style={{
            background: 'transparent',
            border: '1px solid var(--accent-clay)',
            color: 'var(--accent-clay)',
            padding: '8px 14px',
            borderRadius: 'var(--radius-full)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
          onClick={handleDelete}
        >
          Delete Account Permanently
        </button>
      </div>
    </div>
  )
}

/* ==========================================================================
   7. MODALS
   ========================================================================== */
function AddModal({ close, done }: { close: () => void; done: (v: any) => Promise<void> }) {
  const [text, setText] = useState('')
  const [topic, setTopic] = useState('Arrays & Hashing')
  const [difficulty, setDifficulty] = useState('Medium')
  const [platform, setPlatform] = useState('LeetCode')
  const [notes, setNotes] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    setErr('')
    try {
      await done({
        names: text.split('\n'),
        topic,
        difficulty,
        platform,
        notes
      })
    } catch (e: any) {
      setErr(e.message || 'Could not add problems.')
      setBusy(false)
    }
  }

  return (
    <div className="journal-modal-layer">
      <div className="journal-modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '22px' }}>
            Inscribe Solved Problems
          </h2>
          <button style={{ background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--text-muted)' }} onClick={close}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '6px 0 10px' }}>
          Paste problem titles (one per line). Each entry begins an adaptive spaced repetition cycle.
        </p>

        <textarea
          className="journal-textarea"
          autoFocus
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={'Trapping Rain Water\nCourse Schedule\nWord Break'}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
          <div className="form-row">
            <label>Topic Domain</label>
            <select className="catalog-select" value={topic} onChange={e => setTopic(e.target.value)}>
              {TOPIC_TAXONOMY.map(t => (
                <option key={t.name}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <label>Difficulty</label>
            <select className="catalog-select" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <label>Implementation &amp; Complexity Note (Optional)</label>
          <input
            className="journal-input"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Monotonic stack approach O(n) time, O(n) space"
          />
        </div>

        {err && <p style={{ color: 'var(--accent-clay)', fontSize: '12px', margin: '8px 0' }}>{err}</p>}

        <button className="btn-add-stamped" style={{ width: '100%', justifyContent: 'center', marginTop: '14px' }} disabled={!text.trim() || busy} onClick={submit}>
          {busy ? 'Inscribing…' : 'Add to Vault Journal →'}
        </button>
      </div>
    </div>
  )
}

function EditModal({
  problem,
  close,
  done
}: {
  problem: Problem
  close: () => void
  done: (v: any) => Promise<void>
}) {
  const [title, setTitle] = useState(problem.title)
  const [topic, setTopic] = useState(problem.topic)
  const [difficulty, setDifficulty] = useState(problem.difficulty)
  const [platform, setPlatform] = useState(problem.platform)
  const [notes, setNotes] = useState(problem.notes)
  const [busy, setBusy] = useState(false)

  const handleSave = async () => {
    setBusy(true)
    try {
      await done({ title, topic, difficulty, platform, notes })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="journal-modal-layer">
      <div className="journal-modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '22px' }}>
            Edit Folio Record
          </h2>
          <button style={{ background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--text-muted)' }} onClick={close}>
            <X size={18} />
          </button>
        </div>

        <div className="form-row" style={{ marginTop: '16px' }}>
          <label>Problem Title</label>
          <input className="journal-input" value={title} onChange={e => setTitle(e.target.value)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
          <div className="form-row">
            <label>Topic</label>
            <select className="catalog-select" value={topic} onChange={e => setTopic(e.target.value)}>
              {TOPIC_TAXONOMY.map(t => (
                <option key={t.name}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <label>Difficulty</label>
            <select className="catalog-select" value={difficulty} onChange={e => setDifficulty(e.target.value as any)}>
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <label>Implementation &amp; Invariant Notes</label>
          <textarea className="journal-textarea" style={{ height: '90px' }} value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        <button className="btn-add-stamped" style={{ width: '100%', justifyContent: 'center' }} disabled={busy} onClick={handleSave}>
          {busy ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

/* ==========================================================================
   8. AUTHENTICATION (Warm Literary & Architectural Atmosphere)
   ========================================================================== */
function Auth({ onSubmit }: { onSubmit: (mode: 'login' | 'signup', p: Record<string, string>) => Promise<void> }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onSubmit(mode, { name, email, password })
    } catch (err: any) {
      setError(err.message || 'Could not authenticate.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page-container">
      <div className="auth-form-column">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '40px' }}>
          <div className="brand-notebook-mark">V</div>
          <span style={{ fontWeight: 700, fontSize: '15px' }}>
            DSA Vault <span style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--text-secondary)' }}>/ journal</span>
          </span>
        </div>

        <h1 style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '32px', color: 'var(--text-ink)', marginBottom: '8px' }}>
          {mode === 'login' ? 'Open your vault journal' : 'Create your private practice journal'}
        </h1>
        <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '32px' }}>
          {mode === 'login'
            ? 'Sign in to access your personal algorithmic spaced repetition docket.'
            : 'Track problem approaches, preserve invariants, and build permanent algorithmic intuition.'}
        </p>

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div className="form-row">
              <label>Your Full Name</label>
              <input className="journal-input" required value={name} onChange={e => setName(e.target.value)} placeholder="Alan Turing" />
            </div>
          )}

          <div className="form-row">
            <label>Email Address</label>
            <input className="journal-input" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="alan@princeton.edu" />
          </div>

          <div className="form-row">
            <label>Password (min 8 characters)</label>
            <input className="journal-input" type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••••••" />
          </div>

          {error && <p style={{ color: 'var(--accent-clay)', fontSize: '12px', margin: '8px 0 14px' }}>{error}</p>}

          <button className="btn-add-stamped" style={{ width: '100%', justifyContent: 'center', padding: '10px', marginTop: '10px' }} disabled={busy}>
            {busy ? 'Authenticating…' : mode === 'login' ? 'Open Journal →' : 'Begin Practice Journal →'}
          </button>
        </form>

        <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '24px', textAlign: 'center' }}>
          {mode === 'login' ? "Don't have a practice journal yet? " : 'Already inscribed? '}
          <button
            style={{ background: 'none', border: 0, color: 'var(--accent-clay)', fontWeight: 600, cursor: 'pointer' }}
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login')
              setError('')
            }}
          >
            {mode === 'login' ? 'Create an account' : 'Sign in'}
          </button>
        </p>
      </div>

      <div className="auth-hero-column">
        <div style={{ maxWidth: '480px' }}>
          <div className="annotation-badge" style={{ marginBottom: '14px' }}>
            <span>SPACED REPETITION FOR ALGORITHMS</span>
            <span className="scribble-arrow">↗</span>
          </div>

          <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '38px', fontWeight: 800, letterSpacing: '-1.2px', lineHeight: 1.15, color: 'var(--text-ink)', marginBottom: '18px' }}>
            Intuition comes from <em>structured retrieval</em>, not blind cramming.
          </h2>

          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            DSA Vault acts like an engineer’s field journal with an embedded spaced repetition engine.
            Instead of solving 600 problems and forgetting them all before the interview, lock every pattern into intuitive memory.
          </p>
        </div>
      </div>
    </div>
  )
}
