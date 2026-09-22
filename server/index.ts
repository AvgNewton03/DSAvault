import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import mongoose, { Schema, ConnectOptions } from 'mongoose'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export const app = express()

// Trust reverse proxies (Render, Railway, Cloudflare, Nginx, etc.)
app.set('trust proxy', 1)

// HTTP Security headers (configured to allow inline styles and fonts used by Vite and Google Fonts)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}))

// High-performance gzip/brotli compression
app.use(compression())

// CORS configuration
const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map(s => s.trim())
  : true

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}))

// Body parser
app.use(express.json({ limit: '1mb' }))

// Rate limiters for multi-user protection
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please wait 15 minutes before trying again.' }
})

const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600, // 600 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded. Please slow down your requests.' }
})

app.use('/api/auth/login', authLimiter)
app.use('/api/auth/signup', authLimiter)
app.use('/api/', generalApiLimiter)

// Database Connection with High Concurrency Pool
let connectionPromise: Promise<typeof mongoose> | undefined

export function connectDatabase(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose)

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dsa-vault'
  const maxPoolSize = Math.max(10, Number(process.env.MONGODB_MAX_POOL_SIZE || 50))
  const minPoolSize = Math.max(2, Number(process.env.MONGODB_MIN_POOL_SIZE || 5))

  const options: ConnectOptions = {
    maxPoolSize,
    minPoolSize,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 8000,
    family: 4, // IPv4 first to prevent DNS lag with MongoDB Atlas on some cloud runners
    autoIndex: process.env.NODE_ENV !== 'production'
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(mongoUri, options)
      .then(m => {
        console.log(`✓ Connected to MongoDB [pool: min ${minPoolSize}, max ${maxPoolSize}]`)
        return m
      })
      .catch(error => {
        connectionPromise = undefined
        console.error('✗ MongoDB connection failure:', error.message)
        throw error
      })
  }

  return connectionPromise
}

// Middleware to ensure DB connection on API calls
app.use('/api', async (req, res, next) => {
  if (req.path === '/health') return next()
  if (mongoose.connection.readyState !== 1) {
    try {
      await connectDatabase()
      next()
    } catch {
      res.status(503).json({
        error: 'Database unavailable. If you are deploying, ensure MONGODB_URI is correctly configured in your environment.'
      })
    }
  } else {
    next()
  }
})

// Database Models & Schemas
const revisionSchema = new Schema({
  reviewedAt: { type: Date, default: Date.now },
  quality: { type: Number, min: 0, max: 5, required: true }
}, { _id: false })

const problemSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 180 },
  topic: { type: String, required: true, trim: true },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
  platform: { type: String, default: 'LeetCode', trim: true },
  notes: { type: String, default: '', maxlength: 10000 },
  solvedAt: { type: Date, default: Date.now },
  nextReviewAt: { type: Date, default: Date.now },
  intervalDays: { type: Number, default: 1 },
  revisionHistory: [revisionSchema]
}, { timestamps: true })

// Optimized compound indexes for multi-user queries
problemSchema.index({ userId: 1, title: 1 }, { unique: true })
problemSchema.index({ userId: 1, nextReviewAt: 1 })
problemSchema.index({ userId: 1, solvedAt: -1 })
problemSchema.index({ userId: 1, topic: 1 })
problemSchema.index({ userId: 1, intervalDays: 1 })

const Problem = mongoose.model('Problem', problemSchema)

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true },
  lastLoginAt: Date
}, { timestamps: true })

const User = mongoose.model('User', userSchema)

// Auth Helpers
const jwtSecret = process.env.JWT_SECRET
if (!jwtSecret && process.env.NODE_ENV === 'production') {
  console.warn('⚠️ WARNING: JWT_SECRET environment variable is not defined! Using fallback secret. Please set a secure JWT_SECRET in production.')
}
const secret = jwtSecret || 'local-development-only-secret-change-me'

type AuthRequest = express.Request & { userId?: string }

const publicUser = (user: { id: string; name: string; email: string; createdAt?: Date }) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  createdAt: user.createdAt
})

const tokenFor = (id: string) => jwt.sign({ sub: id }, secret, { expiresIn: '7d' })

const authenticate = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  const token = req.header('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: 'Authentication required' })
  try {
    req.userId = (jwt.verify(token, secret) as { sub: string }).sub
    next()
  } catch {
    res.status(401).json({ error: 'Session expired. Please sign in again.' })
  }
}

const currentUser = (req: AuthRequest) => req.userId!

const nextInterval = (old: number, quality: number) =>
  quality >= 4 ? Math.min(180, Math.max(1, Math.round(old * 2.2))) : quality >= 3 ? Math.min(90, Math.max(1, Math.round(old * 1.35))) : 1

const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

// Health & Readiness check
app.get('/api/health', async (_, res) => {
  const dbState = mongoose.connection.readyState
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting']
  let dbPingOk = false

  if (dbState === 1 && mongoose.connection.db) {
    try {
      await mongoose.connection.db.admin().ping()
      dbPingOk = true
    } catch {
      dbPingOk = false
    }
  }

  const isHealthy = dbState === 1 && dbPingOk

  res.status(isHealthy ? 200 : 503).json({
    ok: isHealthy,
    status: isHealthy ? 'healthy' : 'degraded',
    database: {
      status: states[dbState] || 'unknown',
      connected: dbState === 1,
      ping: dbPingOk
    },
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  })
})

// Authentication Routes
app.post('/api/auth/signup', async (req, res, next) => {
  try {
    const { name, email, password } = req.body
    if (!name?.trim() || !/^\S+@\S+\.\S+$/.test(email || '') || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Enter a name, valid email, and password of at least 8 characters.' })
    }
    const cleanEmail = String(email).toLowerCase().trim()
    if (await User.exists({ email: cleanEmail })) {
      return res.status(409).json({ error: 'An account with this email already exists.' })
    }
    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      passwordHash: await bcrypt.hash(password, 10),
      lastLoginAt: new Date()
    })
    res.status(201).json({ token: tokenFor(user.id), user: publicUser(user) })
  } catch (err) {
    next(err)
  }
})

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim()
    const user = await User.findOne({ email })
    if (!user || !await bcrypt.compare(String(req.body.password || ''), user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }
    user.lastLoginAt = new Date()
    await user.save()
    res.json({ token: tokenFor(user.id), user: publicUser(user) })
  } catch (err) {
    next(err)
  }
})

app.get('/api/auth/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = await User.findById(currentUser(req))
    user ? res.json(publicUser(user)) : res.status(404).json({ error: 'User not found.' })
  } catch (err) {
    next(err)
  }
})

app.patch('/api/auth/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = await User.findById(currentUser(req))
    if (!user) return res.status(404).json({ error: 'User not found.' })
    if (req.body.name?.trim()) user.name = req.body.name.trim()
    if (req.body.currentPassword || req.body.newPassword) {
      if (!await bcrypt.compare(String(req.body.currentPassword || ''), user.passwordHash)) {
        return res.status(400).json({ error: 'Current password is incorrect.' })
      }
      if (typeof req.body.newPassword !== 'string' || req.body.newPassword.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters.' })
      }
      user.passwordHash = await bcrypt.hash(req.body.newPassword, 10)
    }
    await user.save()
    res.json(publicUser(user))
  } catch (err) {
    next(err)
  }
})

app.delete('/api/auth/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const uid = currentUser(req)
    await Problem.deleteMany({ userId: uid })
    await User.findByIdAndDelete(uid)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

// Problem Vault & Spaced Repetition Routes
app.get('/api/problems', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { topic, difficulty, platform, status, q } = req.query
    const filter: Record<string, unknown> = { userId: currentUser(req) }
    if (topic) filter.topic = topic
    if (difficulty) filter.difficulty = difficulty
    if (platform) filter.platform = platform
    if (status === 'due') filter.nextReviewAt = { $lte: new Date() }
    if (q) filter.title = { $regex: String(q), $options: 'i' }
    const items = await Problem.find(filter).sort({ solvedAt: -1 }).lean()
    res.json(items)
  } catch (err) {
    next(err)
  }
})

app.post('/api/problems/bulk', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { names, topic, difficulty, platform = 'LeetCode', notes = '', solvedAt } = req.body
    const clean = Array.isArray(names) ? [...new Set(names.map((n: unknown) => String(n).trim()).filter(Boolean))] : []
    if (!clean.length || clean.length > 100 || !topic || !['Easy', 'Medium', 'Hard'].includes(difficulty)) {
      return res.status(400).json({ error: 'Provide 1–100 names, a topic, and a valid difficulty.' })
    }
    try {
      const docs = await Problem.insertMany(clean.map(title => ({
        userId: currentUser(req),
        title,
        topic,
        difficulty,
        platform,
        notes,
        solvedAt: solvedAt ? new Date(solvedAt) : new Date()
      })), { ordered: false })
      res.status(201).json(docs)
    } catch (error: unknown) {
      res.status(201).json((error as { insertedDocs?: unknown[] }).insertedDocs || [])
    }
  } catch (err) {
    next(err)
  }
})

app.patch('/api/problems/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const fields = ['title', 'topic', 'difficulty', 'platform', 'notes', 'solvedAt']
    const update = Object.fromEntries(fields.filter(k => req.body[k] !== undefined).map(k => [k, req.body[k]]))
    const item = await Problem.findOneAndUpdate({ _id: req.params.id, userId: currentUser(req) }, update, { new: true, runValidators: true })
    item ? res.json(item) : res.status(404).json({ error: 'Problem not found.' })
  } catch (err) {
    next(err)
  }
})

app.delete('/api/problems/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const item = await Problem.findOneAndDelete({ _id: req.params.id, userId: currentUser(req) })
    item ? res.status(204).end() : res.status(404).json({ error: 'Problem not found.' })
  } catch (err) {
    next(err)
  }
})

app.get('/api/revisions/due', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const queue = await Problem.find({
      userId: currentUser(req),
      nextReviewAt: { $lte: new Date() }
    }).sort({ nextReviewAt: 1 }).limit(25).lean()
    res.json(queue)
  } catch (err) {
    next(err)
  }
})

app.post('/api/problems/:id/review', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const quality = Math.min(5, Math.max(0, Number(req.body.quality ?? 4)))
    const problem = await Problem.findOne({ _id: req.params.id, userId: currentUser(req) })
    if (!problem) return res.status(404).json({ error: 'Problem not found.' })
    problem.intervalDays = nextInterval(problem.intervalDays, quality)
    problem.nextReviewAt = new Date(Date.now() + problem.intervalDays * 86400000)
    problem.revisionHistory.push({ quality, reviewedAt: new Date() })
    await problem.save()
    res.json(problem)
  } catch (err) {
    next(err)
  }
})

app.get('/api/dashboard', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(currentUser(req))
    const now = new Date()
    const start = new Date(now)
    start.setDate(now.getDate() - 364)
    start.setHours(0, 0, 0, 0)

    const [total, due, recent, topics, activity, mastered] = await Promise.all([
      Problem.countDocuments({ userId }),
      Problem.countDocuments({ userId, nextReviewAt: { $lte: now } }),
      Problem.find({ userId }).sort({ solvedAt: -1 }).limit(5).lean(),
      Problem.aggregate([
        { $match: { userId } },
        { $group: { _id: '$topic', solved: { $sum: 1 } } },
        { $sort: { solved: -1 } }
      ]),
      Problem.aggregate([
        { $match: { userId, solvedAt: { $gte: start } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$solvedAt' } }, count: { $sum: 1 } } }
      ]),
      Problem.countDocuments({ userId, intervalDays: { $gte: 7 } })
    ])

    const dates = new Set(activity.map(x => x._id))
    let streak = 0
    for (let cursor = day(now); dates.has(cursor.toISOString().slice(0, 10)); cursor.setDate(cursor.getDate() - 1)) {
      streak++
    }

    res.json({
      total,
      due,
      streak,
      mastery: total ? Math.round(mastered / total * 100) : 0,
      recent,
      topics,
      activity
    })
  } catch (err) {
    next(err)
  }
})

// Production Static Serving (Single-host deployments on Render, Railway, Fly.io, Docker, etc.)
if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
  const distPath = path.resolve(process.cwd(), 'dist')
  app.use(express.static(distPath))
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(distPath, 'index.html'))
    }
    next()
  })
}

// Centralized error handling
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled API Error:', err)
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'An unexpected server error occurred.' : (err.message || 'Server error')
  })
})


// Server listener and graceful shutdown
if (!process.env.VERCEL) {
  const port = Number(process.env.PORT || 5000)
  const server = app.listen(port, () => {
    console.log(`DSA Vault Server running on port :${port} [NODE_ENV=${process.env.NODE_ENV || 'development'}]`)
    
    // Attempt initial database connection
    connectDatabase().catch(() => {
      console.warn('⚠️ Initial MongoDB connection not established. Requests will retry connecting automatically.')
      console.warn('ℹ️ To connect MongoDB Atlas, set MONGODB_URI in your environment or .env file.')
    })
  })

  // Graceful shutdown handling for container and process restarts
  const shutdown = (signal: string) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`)
    server.close(async () => {
      try {
        if (mongoose.connection.readyState !== 0) {
          await mongoose.connection.close(false)
          console.log('✓ MongoDB connection cleanly closed.')
        }
      } catch (e) {
        console.error('Error closing MongoDB connection:', e)
      }
      process.exit(0)
    })
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

export default app
