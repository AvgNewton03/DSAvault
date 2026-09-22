import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  Check,
  Clock,
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
  X,
  Zap
} from 'lucide-react'
import { api, Problem, Dashboard as DashboardData, setToken, User } from './api'

type View = 'dashboard' | 'library' | 'revision' | 'topics' | 'achievements' | 'settings'
type Theme = 'dark' | 'light'

const TOPIC_LIST = [
  'Arrays & Hashing',
  'Two Pointers',
  'Sliding Window',
  'Stack & Queue',
  'Binary Search',
  'Linked List',
  'Trees & BST',
  'Heap / Priority Queue',
  'Backtracking',
  'Graphs',
  'Dynamic Programming',
  'Bit Manipulation'
]

const fmtDate = (d: string | Date) =>
  new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(d))

const fmtShortDate = (d: string | Date) =>
  new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(d))

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

  // Theme Management (defaults to system preference, persisted in localStorage)
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('dsa-vault-theme') as Theme | null
    if (saved === 'dark' || saved === 'light') return saved
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('dsa-vault-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))

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
      <div style={{ minHeight: '100vh', display: 'grid', placeContent: 'center', textAlign: 'center', gap: '14px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)', color: 'var(--accent-primary)', display: 'grid', placeItems: 'center', margin: '0 auto' }}>
          <Code2 size={22} />
        </div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Loading algorithmic vault…
        </p>
      </div>
    )
  }

  if (!user) return <Auth onSubmit={login} />

  const completeReview = async (id: string, quality: number) => {
    await api(`/problems/${id}/review`, { method: 'POST', body: JSON.stringify({ quality }) })
    await reload()
    notify(quality >= 4 ? 'Spaced repetition schedule advanced.' : 'Reset for quick reinforcement.')
  }

  const navigateToLibraryWithTopic = (topicName: string) => {
    setSelectedTopicFilter(topicName)
    setView('library')
  }

  return (
    <div className="app-shell">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Code2 size={18} />
          </div>
          <div className="brand-info">
            <div className="brand-title">
              DSA<span>Vault</span>
            </div>
            <div className="brand-tag">// v2.0-forge</div>
          </div>
        </div>

        <div className="nav-section">
          <div className="nav-section-title">// REPOSITORY</div>
          <NavItem active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<LayoutDashboard />}>
            Overview
          </NavItem>
          <NavItem active={view === 'library'} onClick={() => { setSelectedTopicFilter('all'); setView('library') }} icon={<BookOpen />} badge={problems.length || undefined}>
            Problem Library
          </NavItem>
          <NavItem active={view === 'revision'} onClick={() => setView('revision')} icon={<Sparkles />} badge={due.length ? due.length : undefined}>
            Smart Revision
          </NavItem>
        </div>

        <div className="nav-section">
          <div className="nav-section-title">// PRACTICE</div>
          <NavItem active={view === 'topics'} onClick={() => setView('topics')} icon={<Target />}>
            Topic Taxonomy
          </NavItem>
          <NavItem active={view === 'achievements'} onClick={() => setView('achievements')} icon={<Trophy />}>
            Milestones
          </NavItem>
        </div>

        <div className="sidebar-footer">
          <button className="theme-toggle-btn" onClick={toggleTheme} title="Toggle Dark/Light Theme">
            <span>
              {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
              <span>{theme === 'dark' ? 'Ink Mode' : 'Paper Mode'}</span>
            </span>
            <span className="theme-toggle-indicator">{theme.toUpperCase()}</span>
          </button>

          <NavItem active={view === 'settings'} onClick={() => setView('settings')} icon={<Settings />}>
            Settings
          </NavItem>

          <div className="user-profile">
            <div className="user-avatar">{user.name[0].toUpperCase()}</div>
            <div className="user-meta">
              <span className="user-name">{user.name}</span>
              <span className="user-count">{problems.length} problems</span>
            </div>
            <button className="user-signout" onClick={logout} title="Sign Out">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <main>
        <header className="page-header">
          <div className="page-title-group">
            <h1>
              {view === 'dashboard' && `Workspace / ${user.name.split(' ')[0]}`}
              {view === 'library' && 'Problem Repository'}
              {view === 'revision' && 'Spaced Repetition Arena'}
              {view === 'topics' && 'Algorithmic Taxonomy & Mastery'}
              {view === 'achievements' && 'Milestones & Achievements'}
              {view === 'settings' && 'Vault Configuration'}
            </h1>
            <p className="page-subtitle">
              {view === 'dashboard' && 'Spaced repetition schedule & algorithmic retention telemetry.'}
              {view === 'library' && 'Personal index of solved algorithms with time & space notes.'}
              {view === 'revision' && 'Active recall sessions using the SM-2 Leitner interval algorithm.'}
              {view === 'topics' && 'Curriculum distribution and topic depth breakdown.'}
              {view === 'achievements' && 'Earned milestones based on deliberate practice consistency.'}
              {view === 'settings' && 'Manage profile credentials and system themes.'}
            </p>
          </div>

          <div className="page-actions">
            {view !== 'settings' && (
              <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
                <Plus size={15} /> Add Problems
              </button>
            )}
          </div>
        </header>

        {view === 'dashboard' && (
          <Dashboard
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

      {/* Add Problems Modal */}
      {showAdd && (
        <AddModal
          close={() => setShowAdd(false)}
          done={async data => {
            await api('/problems/bulk', { method: 'POST', body: JSON.stringify(data) })
            await reload()
            setShowAdd(false)
            notify('Problems successfully indexed into your vault.')
          }}
        />
      )}

      {/* Toast Feedback */}
      {toast && (
        <div className="toast">
          <Check size={14} />
          <span>{toast}</span>
        </div>
      )}
    </div>
  )
}

function NavItem({ icon, children, active, badge, onClick }: any) {
  return (
    <button onClick={onClick} className={`nav-item ${active ? 'active' : ''}`}>
      {icon}
      <span>{children}</span>
      {badge !== undefined && <span className="badge">{badge}</span>}
    </button>
  )
}

/* ==========================================================================
   1. DASHBOARD VIEW (Forge + Asymmetric Telemetry + Topic Map + Heatmap)
   ========================================================================== */
function Dashboard({
  data,
  due,
  problems,
  startRevision,
  onSelectTopic
}: {
  data: DashboardData | null
  due: Problem[]
  problems: Problem[]
  startRevision: () => void
  onSelectTopic: (topic: string) => void
}) {
  if (!data) return null

  // Activity calculation (112 days = 16 weeks)
  const activityMap = new Map(data.activity.map(x => [x._id, x.count]))
  const days = Array.from({ length: 112 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - 111 + i)
    const key = d.toISOString().slice(0, 10)
    return { date: key, count: activityMap.get(key) || 0 }
  })

  // Difficulty counts
  const easyCount = problems.filter(p => p.difficulty === 'Easy').length
  const medCount = problems.filter(p => p.difficulty === 'Medium').length
  const hardCount = problems.filter(p => p.difficulty === 'Hard').length

  // Streak Gauge Calculations
  const streakDays = data.streak
  const radius = 40
  const circumference = 2 * Math.PI * radius
  // Max out visually at 30 days
  const progressPercent = Math.min(100, (streakDays / 30) * 100)
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Upper Asymmetric Section: Hero Forge + Telemetry */}
      <section className="dashboard-grid">
        {/* Algorithmic Repetition Forge */}
        <div className="forge-hero">
          <div>
            <div className="forge-top">
              <div>
                <span className="forge-status-badge">
                  <Flame size={12} /> SPICED REPETITION FORGE
                </span>
                <h2>
                  {due.length
                    ? `${due.length} algorithmic problem${due.length > 1 ? 's' : ''} due for recall`
                    : 'All recall intervals up to date'}
                </h2>
                <p>
                  {due.length
                    ? 'Reinforce neural paths and lock approach invariants into long-term memory before the interval decays.'
                    : 'Your memory queue is clear. New reviews will trigger automatically according to the SM-2 interval algorithm.'}
                </p>
              </div>

              {/* Circular SVG Streak Gauge */}
              <div className="streak-gauge-wrap" title={`${streakDays} days active practice streak`}>
                <svg viewBox="0 0 100 100">
                  <circle className="streak-gauge-bg" cx="50" cy="50" r={radius} />
                  <circle
                    className="streak-gauge-meter"
                    cx="50"
                    cy="50"
                    r={radius}
                    style={{
                      strokeDasharray: circumference,
                      strokeDashoffset
                    }}
                  />
                </svg>
                <div className="streak-gauge-inner">
                  <div className="streak-gauge-number">{streakDays}</div>
                  <span className="streak-gauge-label">DAY STREAK</span>
                </div>
              </div>
            </div>
          </div>

          <div className="forge-footer">
            <div className="forge-stats-row">
              <div className="forge-stat-pill">
                <span>RECALL ACCURACY</span>
                <strong>{data.mastery}% Retention</strong>
              </div>
              <div className="forge-stat-pill">
                <span>QUEUE STATUS</span>
                <strong>{due.length} Due Today</strong>
              </div>
              <div className="forge-stat-pill">
                <span>INTERVAL MULTIPLIER</span>
                <strong>2.2x Spacing</strong>
              </div>
            </div>

            <button className="btn btn-primary" onClick={startRevision}>
              {due.length ? 'Begin Recall Session →' : 'Practice Review →'}
            </button>
          </div>
        </div>

        {/* Telemetry Column */}
        <div className="telemetry-col">
          <div className="telemetry-card">
            <div className="telemetry-card-main">
              <span className="telemetry-label">
                <BookOpen /> Solved Algorithms
              </span>
              <div className="telemetry-value">{data.total}</div>
              <span className="telemetry-subtext">
                <span style={{ color: 'var(--color-easy)' }}>{easyCount}E</span> ·{' '}
                <span style={{ color: 'var(--color-medium)' }}>{medCount}M</span> ·{' '}
                <span style={{ color: 'var(--color-hard)' }}>{hardCount}H</span>
              </span>
            </div>
            <span className="telemetry-metric-badge">All-Time</span>
          </div>

          <div className="telemetry-card">
            <div className="telemetry-card-main">
              <span className="telemetry-label">
                <Sparkles /> Due in Queue
              </span>
              <div className="telemetry-value" style={{ color: due.length ? 'var(--accent-primary)' : 'inherit' }}>
                {due.length}
              </div>
              <span className="telemetry-subtext">Requires immediate mental retrieval</span>
            </div>
            <span className="telemetry-metric-badge">SM-2</span>
          </div>

          <div className="telemetry-card">
            <div className="telemetry-card-main">
              <span className="telemetry-label">
                <Target /> Mastery Index
              </span>
              <div className="telemetry-value">{data.mastery}%</div>
              <span className="telemetry-subtext">Problems retained past 7+ day interval</span>
            </div>
            <span className="telemetry-metric-badge">&gt;7d Reps</span>
          </div>
        </div>
      </section>

      {/* Structural Topic Map / Knowledge Nodes */}
      <section className="card knowledge-tree-section">
        <div className="card-header">
          <div className="card-title">
            <GitBranch size={16} style={{ color: 'var(--accent-primary)' }} />
            <span>Knowledge Graph &amp; Topic Nodes</span>
          </div>
          <span className="card-title-code">Select node to filter repository</span>
        </div>

        <div className="topic-map-canvas">
          <div className="topic-node-grid">
            {TOPIC_LIST.slice(0, 8).map(topicName => {
              const matched = data.topics.find(t => t._id.toLowerCase() === topicName.toLowerCase() || t._id.toLowerCase().includes(topicName.toLowerCase().split(' ')[0]))
              const count = matched ? matched.solved : 0
              const maxTopicSolved = Math.max(1, ...data.topics.map(t => t.solved))
              const percent = Math.min(100, Math.round((count / maxTopicSolved) * 100))

              return (
                <div
                  key={topicName}
                  className="topic-node"
                  onClick={() => onSelectTopic(topicName)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="topic-node-header">
                    <div className="topic-node-name">
                      <span className="topic-node-dot" style={{ opacity: count ? 1 : 0.35 }} />
                      <span>{topicName}</span>
                    </div>
                    <span className="topic-node-count">{count} solved</span>
                  </div>

                  <div className="topic-progress-bar">
                    <div className="topic-progress-fill" style={{ width: `${percent}%` }} />
                  </div>

                  <div className="topic-node-footer">
                    <span>{count ? `${count} indexed` : '0 indexed'}</span>
                    <span style={{ color: 'var(--accent-text)' }}>Explore →</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Two Column Section: Queue & Consistency Grid */}
      <section className="content-two-col">
        {/* Today's Due Queue */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Clock size={16} style={{ color: 'var(--accent-primary)' }} />
              <span>Next Due Problems</span>
            </div>
            <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: '11px' }} onClick={startRevision}>
              Review All ({due.length}) →
            </button>
          </div>

          <div className="queue-list">
            {due.length ? (
              due.slice(0, 4).map((p, idx) => (
                <div key={p._id} className="queue-item">
                  <div className="queue-meta">
                    <span className="queue-title">{p.title}</span>
                    <span className="queue-sub">
                      <span>{p.topic}</span>
                      <span>·</span>
                      <span>{p.platform}</span>
                      <span>·</span>
                      <span className={`diff-tag ${p.difficulty.toLowerCase()}`}>{p.difficulty}</span>
                    </span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-text)' }}>
                    #{idx + 1}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-tertiary)' }}>
                <Check size={28} style={{ color: 'var(--color-easy)', margin: '0 auto 8px', display: 'block' }} />
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Queue is empty</p>
                <p style={{ fontSize: '12px' }}>No algorithmic cards due right now.</p>
              </div>
            )}
          </div>
        </div>

        {/* Consistency Activity Grid (Heatmap) */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Layers size={16} style={{ color: 'var(--accent-primary)' }} />
              <span>Algorithmic Consistency</span>
            </div>
            <span className="card-title-code">Past 16 Weeks</span>
          </div>

          <div className="heatmap-wrap">
            <div className="heatmap-grid">
              {days.map((d, i) => {
                const lvl = d.count >= 4 ? 'l4' : d.count >= 3 ? 'l3' : d.count >= 2 ? 'l2' : d.count >= 1 ? 'l1' : ''
                return (
                  <div
                    key={i}
                    className={`heat-sq ${lvl}`}
                    title={`${d.date}: ${d.count} problem${d.count === 1 ? '' : 's'} solved`}
                  />
                )
              })}
            </div>

            <div className="heatmap-footer">
              <span>{data.activity.reduce((acc, curr) => acc + curr.count, 0)} solves in the last year</span>
              <div className="heatmap-legend">
                <span>Less</span>
                <span className="heatmap-legend-sq" style={{ background: 'var(--bg-surface-elevated)' }} />
                <span className="heatmap-legend-sq" style={{ background: 'rgba(245, 158, 11, 0.25)' }} />
                <span className="heatmap-legend-sq" style={{ background: 'rgba(245, 158, 11, 0.55)' }} />
                <span className="heatmap-legend-sq" style={{ background: 'var(--accent-primary)' }} />
                <span>More</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

/* ==========================================================================
   2. PROBLEM LIBRARY VIEW (Clean Code-Dense Table + Search + Filtering)
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
  const [search, setSearch] = useState('')
  const [topicFilter, setTopicFilter] = useState(initialTopicFilter)
  const [diffFilter, setDiffFilter] = useState('all')
  const [editing, setEditing] = useState<Problem | null>(null)

  const filtered = useMemo(() => {
    return problems.filter(p => {
      const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) || p.notes.toLowerCase().includes(search.toLowerCase())
      const matchTopic = topicFilter === 'all' || p.topic.toLowerCase().includes(topicFilter.toLowerCase())
      const matchDiff = diffFilter === 'all' || p.difficulty.toLowerCase() === diffFilter.toLowerCase()
      return matchSearch && matchTopic && matchDiff
    })
  }, [problems, search, topicFilter, diffFilter])

  const deleteProblem = async (id: string) => {
    if (!confirm('Permanently remove this problem from your vault?')) return
    try {
      await api(`/problems/${id}`, { method: 'DELETE' })
      await reload()
      notify('Problem removed from repository.')
    } catch {
      notify('Could not remove problem.')
    }
  }

  return (
    <div>
      <div className="library-toolbar">
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-box">
            <Search size={15} />
            <input
              type="text"
              placeholder="Search problem title or notes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select className="filter-select" value={topicFilter} onChange={e => setTopicFilter(e.target.value)}>
            <option value="all">All Topics ({problems.length})</option>
            {TOPIC_LIST.map(t => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select className="filter-select" value={diffFilter} onChange={e => setDiffFilter(e.target.value)}>
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-tertiary)' }}>
          Showing {filtered.length} of {problems.length} records
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>PROBLEM</th>
              <th>TOPIC</th>
              <th>DIFFICULTY</th>
              <th>PLATFORM</th>
              <th>NEXT DUE</th>
              <th style={{ textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length ? (
              filtered.map((p, index) => {
                const isOverdue = new Date(p.nextReviewAt) <= new Date()
                return (
                  <tr key={p._id} className="clickable" onClick={() => setEditing(p)}>
                    <td className="mono-cell" style={{ color: 'var(--text-tertiary)' }}>
                      #{String(index + 1).padStart(3, '0')}
                    </td>
                    <td className="problem-title">{p.title}</td>
                    <td>{p.topic}</td>
                    <td>
                      <span className={`diff-tag ${p.difficulty.toLowerCase()}`}>{p.difficulty}</span>
                    </td>
                    <td className="mono-cell" style={{ color: 'var(--text-secondary)' }}>
                      {p.platform}
                    </td>
                    <td className="mono-cell">
                      <span style={{ color: isOverdue ? 'var(--accent-primary)' : 'inherit', fontWeight: isOverdue ? 600 : 400 }}>
                        {fmtShortDate(p.nextReviewAt)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="table-action-btn"
                        onClick={e => {
                          e.stopPropagation()
                          setEditing(p)
                        }}
                        title="Edit Problem"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        className="table-action-btn"
                        onClick={e => {
                          e.stopPropagation()
                          deleteProblem(p._id)
                        }}
                        title="Delete Problem"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px 14px', color: 'var(--text-tertiary)' }}>
                  No problems matched your query.{' '}
                  <button
                    onClick={onOpenAdd}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Add your first problem →
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditModal
          problem={editing}
          close={() => setEditing(null)}
          done={async updates => {
            await api(`/problems/${editing._id}`, { method: 'PATCH', body: JSON.stringify(updates) })
            await reload()
            setEditing(null)
            notify('Problem record updated.')
          }}
        />
      )}
    </div>
  )
}

/* ==========================================================================
   3. SMART REVISION VIEW (Recall Session Arena)
   ========================================================================== */
function Revision({ due, complete }: { due: Problem[]; complete: (id: string, q: number) => Promise<void> }) {
  const [index, setIndex] = useState(0)
  const [showNotes, setShowNotes] = useState(false)
  const [busy, setBusy] = useState(false)

  const current = due[index]

  if (!current) {
    return (
      <div className="all-caught-box">
        <div className="all-caught-icon">
          <Check size={24} />
        </div>
        <h2>Recall Session Complete</h2>
        <p>
          You have reviewed all due algorithmic problems for this cycle. The intervals have been recalculated and
          stored into MongoDB.
        </p>
      </div>
    )
  }

  const handleScore = async (quality: number) => {
    setBusy(true)
    try {
      await complete(current._id, quality)
      setShowNotes(false)
      setIndex(prev => prev + 1)
    } finally {
      setBusy(false)
    }
  }

  const progress = Math.round(((index + 1) / due.length) * 100)

  return (
    <div className="revision-session-wrap">
      <div className="session-progress-header">
        <span>
          REVISION ITEM {index + 1} OF {due.length}
        </span>
        <span>{progress}% SESSION COMPLETED</span>
      </div>

      <div className="session-progress-bar">
        <div className="session-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="flashcard">
        <div className="flashcard-top">
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span className={`diff-tag ${current.difficulty.toLowerCase()}`}>{current.difficulty}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-tertiary)' }}>
              {current.topic}
            </span>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-tertiary)' }}>
            {current.platform}
          </span>
        </div>

        <h2 className="flashcard-problem-title">{current.title}</h2>
        <p className="flashcard-prompt">
          Pause. Mentally reconstruct your solution: What data structure was used? What were the invariant conditions,
          edge cases, and Big-O time and space bounds?
        </p>

        {showNotes ? (
          <div className="flashcard-notes-panel">
            <span className="flashcard-notes-label">// SAVED IMPLEMENTATION &amp; COMPLEXITY NOTES</span>
            {current.notes ? current.notes : 'No implementation notes saved for this problem.'}
          </div>
        ) : (
          <button
            className="btn btn-secondary"
            style={{ marginBottom: '24px', width: '100%' }}
            onClick={() => setShowNotes(true)}
          >
            <Eye size={14} /> Reveal Implementation &amp; Complexity Notes
          </button>
        )}

        {showNotes && (
          <button
            className="btn btn-ghost"
            style={{ marginBottom: '24px', fontSize: '11.5px' }}
            onClick={() => setShowNotes(false)}
          >
            <EyeOff size={13} /> Hide notes
          </button>
        )}

        <div className="recall-actions-grid">
          <button className="recall-btn success" disabled={busy} onClick={() => handleScore(5)}>
            <Check size={16} /> Remembered Approach (+2.2x interval)
          </button>
          <button className="recall-btn retry" disabled={busy} onClick={() => handleScore(2)}>
            <RotateCcw size={15} /> Needed Hint / Reset (1 day)
          </button>
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   4. TOPIC TAXONOMY VIEW
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
      <div className="topic-node-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))' }}>
        {TOPIC_LIST.map(topic => {
          const matchedProblems = problems.filter(p => p.topic.toLowerCase().includes(topic.toLowerCase().split(' ')[0]))
          const easy = matchedProblems.filter(p => p.difficulty === 'Easy').length
          const med = matchedProblems.filter(p => p.difficulty === 'Medium').length
          const hard = matchedProblems.filter(p => p.difficulty === 'Hard').length
          const total = matchedProblems.length

          return (
            <div key={topic} className="topic-node" onClick={() => onSelectTopic(topic)} style={{ cursor: 'pointer' }}>
              <div className="topic-node-header">
                <div className="topic-node-name">
                  <span className="topic-node-dot" style={{ opacity: total ? 1 : 0.3 }} />
                  <span>{topic}</span>
                </div>
                <span className="topic-node-count">{total} Solved</span>
              </div>

              <div style={{ display: 'flex', gap: '8px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <span>{easy} Easy</span>
                <span>·</span>
                <span>{med} Med</span>
                <span>·</span>
                <span>{hard} Hard</span>
              </div>

              <div className="topic-progress-bar">
                <div className="topic-progress-fill" style={{ width: `${Math.min(100, total * 10)}%` }} />
              </div>

              <div className="topic-node-footer">
                <span>Coverage index</span>
                <span style={{ color: 'var(--accent-text)' }}>Open in Library →</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ==========================================================================
   5. ACHIEVEMENTS VIEW
   ========================================================================== */
function AchievementsView({ data, problems }: { data: DashboardData | null; problems: Problem[] }) {
  const total = problems.length
  const streak = data?.streak || 0
  const mastery = data?.mastery || 0
  const hardCount = problems.filter(p => p.difficulty === 'Hard').length
  const treeCount = problems.filter(p => p.topic.toLowerCase().includes('tree')).length
  const graphCount = problems.filter(p => p.topic.toLowerCase().includes('graph')).length
  const dpCount = problems.filter(p => p.topic.toLowerCase().includes('dynamic')).length

  const milestones = [
    {
      title: 'Root Node',
      desc: 'Added your very first algorithm to the vault.',
      unlocked: total >= 1,
      metric: `${Math.min(1, total)}/1 problem`
    },
    {
      title: 'Binary Searcher',
      desc: 'Logged 10 solved algorithms.',
      unlocked: total >= 10,
      metric: `${Math.min(10, total)}/10 problems`
    },
    {
      title: 'Century Milestone',
      desc: 'Indexed 100 solved algorithmic problems.',
      unlocked: total >= 100,
      metric: `${Math.min(100, total)}/100 problems`
    },
    {
      title: 'Consistent Traversal',
      desc: 'Maintained a 7-day spaced practice streak.',
      unlocked: streak >= 7,
      metric: `${Math.min(7, streak)}/7 days`
    },
    {
      title: 'Tree Whisperer',
      desc: 'Conquered 5+ Binary Tree & BST problems.',
      unlocked: treeCount >= 5,
      metric: `${Math.min(5, treeCount)}/5 trees`
    },
    {
      title: 'Graph Explorer',
      desc: 'Explored 5+ Graph, BFS, or DFS problems.',
      unlocked: graphCount >= 5,
      metric: `${Math.min(5, graphCount)}/5 graphs`
    },
    {
      title: 'DP Survivor',
      desc: 'Overcame 5+ Dynamic Programming subproblems.',
      unlocked: dpCount >= 5,
      metric: `${Math.min(5, dpCount)}/5 DP`
    },
    {
      title: 'Hardcore Algorist',
      desc: 'Successfully solved a Hard complexity problem.',
      unlocked: hardCount >= 1,
      metric: `${hardCount} hard solved`
    },
    {
      title: 'Mastery Forged',
      desc: 'Attained a 50%+ long-term retention rate.',
      unlocked: mastery >= 50,
      metric: `${mastery}% / 50% mastery`
    }
  ]

  return (
    <div className="achievements-grid">
      {milestones.map(m => (
        <div key={m.title} className={`achievement-card ${m.unlocked ? 'unlocked' : 'locked'}`}>
          <div className="achievement-icon">
            <Trophy size={18} />
          </div>
          <div className="achievement-details">
            <h3>{m.title}</h3>
            <p>{m.desc}</p>
            <span className="achievement-badge">
              {m.unlocked ? `✓ Unlocked (${m.metric})` : `Locked (${m.metric})`}
            </span>
          </div>
        </div>
      ))}
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
  const [currentPassword, setCurrent] = useState('')
  const [newPassword, setNew] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const updated = await api<User>('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({
          name: name.trim(),
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined
        })
      })
      update(updated)
      setCurrent('')
      setNew('')
      notify('Account settings updated.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update.')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('CAUTION: This will permanently delete your user account and all problem records from MongoDB. Continue?')) {
      return
    }
    await api('/auth/me', { method: 'DELETE' })
    logout()
  }

  return (
    <div className="settings-container">
      {/* Theme Appearance Setting */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Sparkles size={16} style={{ color: 'var(--accent-primary)' }} />
            <span>Visual Appearance &amp; Identity</span>
          </div>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          DSA Vault supports both a deep charcoal ink theme and a warm paper theme, unified by the amber forge accent.
        </p>
        <button className="btn btn-secondary" onClick={toggleTheme}>
          {theme === 'dark' ? <Moon size={15} /> : <Sun size={15} />}
          Switch to {theme === 'dark' ? 'Warm Paper (Light)' : 'Graphite Ink (Dark)'} Theme
        </button>
      </div>

      {/* Profile & Credentials */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <UserRound size={16} style={{ color: 'var(--accent-primary)' }} />
            <span>Profile &amp; Credentials</span>
          </div>
        </div>

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label>Full Name</label>
            <input className="form-input" value={name} onChange={e => setName(e.target.value)} required />
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input className="form-input" value={user.email} disabled />
          </div>

          <div style={{ margin: '20px 0 14px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
            <div className="card-title" style={{ fontSize: '12.5px', marginBottom: '10px' }}>
              <Lock size={14} /> Update Password
            </div>

            <div className="form-group">
              <label>Current Password</label>
              <input
                className="form-input"
                type="password"
                value={currentPassword}
                onChange={e => setCurrent(e.target.value)}
                placeholder="Required if changing password"
              />
            </div>

            <div className="form-group">
              <label>New Password (min 8 characters)</label>
              <input
                className="form-input"
                type="password"
                value={newPassword}
                onChange={e => setNew(e.target.value)}
                minLength={8}
                placeholder="At least 8 characters"
              />
            </div>
          </div>

          {error && <p style={{ color: 'var(--color-hard)', fontSize: '12px', marginBottom: '12px' }}>{error}</p>}

          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="card" style={{ borderColor: 'var(--color-hard-border)', background: 'var(--color-hard-bg)' }}>
        <h3 style={{ fontSize: '14px', color: 'var(--color-hard)', marginBottom: '6px' }}>Delete Account</h3>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
          Permanently remove your account and all spaced repetition records from MongoDB. This action cannot be undone.
        </p>
        <button className="btn btn-danger" onClick={handleDelete}>
          Delete Account Permanently
        </button>
      </div>
    </div>
  )
}

/* ==========================================================================
   7. MODALS (Add & Edit Problem)
   ========================================================================== */
function AddModal({ close, done }: { close: () => void; done: (v: any) => Promise<void> }) {
  const [text, setText] = useState('')
  const [topic, setTopic] = useState('Arrays & Hashing')
  const [difficulty, setDifficulty] = useState('Medium')
  const [platform, setPlatform] = useState('LeetCode')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      await done({
        names: text.split('\n'),
        topic,
        difficulty,
        platform,
        notes
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add problems.')
      setBusy(false)
    }
  }

  return (
    <div className="modal-layer">
      <div className="modal">
        <div className="modal-header">
          <h2>Index Solved Problems</h2>
          <button className="modal-close" onClick={close}>
            <X size={16} />
          </button>
        </div>

        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          Paste problem titles (one per line) for bulk import. Each problem initiates a spaced repetition schedule.
        </p>

        <textarea
          className="modal-textarea"
          autoFocus
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={'Two Sum\nGroup Anagrams\nTrapping Rain Water'}
        />

        <div className="modal-grid-fields">
          <div className="form-group">
            <label>Topic Taxonomy</label>
            <select className="filter-select" value={topic} onChange={e => setTopic(e.target.value)}>
              {TOPIC_LIST.map(t => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Difficulty Rating</label>
            <select className="filter-select" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Platform</label>
          <select className="filter-select" value={platform} onChange={e => setPlatform(e.target.value)}>
            <option>LeetCode</option>
            <option>NeetCode</option>
            <option>Codeforces</option>
            <option>HackerRank</option>
            <option>Custom</option>
          </select>
        </div>

        <div className="form-group">
          <label>Implementation &amp; Complexity Note (Optional)</label>
          <input
            className="form-input"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Hash map approach O(n) time, O(n) space"
          />
        </div>

        {error && <p style={{ color: 'var(--color-hard)', fontSize: '12px', marginBottom: '10px' }}>{error}</p>}

        <button className="btn btn-primary" style={{ width: '100%' }} disabled={!text.trim() || busy} onClick={submit}>
          {busy ? 'Indexing…' : 'Add to Vault Repository →'}
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
    <div className="modal-layer">
      <div className="modal">
        <div className="modal-header">
          <h2>Edit Problem Record</h2>
          <button className="modal-close" onClick={close}>
            <X size={16} />
          </button>
        </div>

        <div className="form-group">
          <label>Problem Title</label>
          <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} />
        </div>

        <div className="modal-grid-fields">
          <div className="form-group">
            <label>Topic</label>
            <select className="filter-select" value={topic} onChange={e => setTopic(e.target.value)}>
              {TOPIC_LIST.map(t => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Difficulty</label>
            <select className="filter-select" value={difficulty} onChange={e => setDifficulty(e.target.value as any)}>
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Implementation &amp; Complexity Notes</label>
          <textarea
            className="modal-textarea"
            style={{ height: '100px' }}
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy} onClick={handleSave}>
          {busy ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

/* ==========================================================================
   8. AUTHENTICATION VIEW (Ink & Paper Aesthetics)
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not continue.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-form-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '40px' }}>
          <div className="brand-icon" style={{ width: '28px', height: '28px' }}>
            <Code2 size={16} />
          </div>
          <span style={{ fontWeight: 700, fontSize: '15px' }}>
            DSA<span style={{ color: 'var(--accent-primary)' }}>Vault</span>
          </span>
        </div>

        <h1 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.4px', marginBottom: '6px' }}>
          {mode === 'login' ? 'Access your Vault' : 'Forge your mastery'}
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '28px' }}>
          {mode === 'login'
            ? 'Sign in to access your personal spaced repetition schedule.'
            : 'Initialize your private algorithmic practice tracker.'}
        </p>

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div className="form-group">
              <label>Full Name</label>
              <input
                className="form-input"
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ada Lovelace"
              />
            </div>
          )}

          <div className="form-group">
            <label>Email Address</label>
            <input
              className="form-input"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ada@algorithms.dev"
            />
          </div>

          <div className="form-group">
            <label>Password (min 8 characters)</label>
            <input
              className="form-input"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••••"
            />
          </div>

          {error && <p style={{ color: 'var(--color-hard)', fontSize: '12px', marginBottom: '14px' }}>{error}</p>}

          <button className="btn btn-primary" type="submit" style={{ width: '100%', marginTop: '8px' }} disabled={busy}>
            {busy ? 'Authenticating…' : mode === 'login' ? 'Sign In →' : 'Create Vault →'}
          </button>
        </form>

        <p className="auth-switch-text">
          {mode === 'login' ? "Don't have a vault yet? " : 'Already registered? '}
          <button
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

      <div className="auth-hero-panel">
        <div className="auth-hero-content">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: 'var(--radius-xs)', background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)', color: 'var(--accent-text)', fontFamily: 'var(--font-mono)', fontSize: '10.5px', marginBottom: '16px' }}>
            <Zap size={12} /> ALGORITHMIC SPACED REPETITION
          </div>
          <h2>Retain what you solve. Permanently.</h2>
          <p>
            DSA mastery is not about cramming 500 problems once. It is about calculated, scheduled recall
            multipliers that cement patterns into intuition.
          </p>
        </div>
      </div>
    </div>
  )
}
