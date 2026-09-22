import type { IncomingMessage, ServerResponse } from 'node:http'
import { app, connectDatabase } from '../server/index.js'

// Vercel invokes this handler on /api/*; MongoDB's connection is reused when a
// serverless instance stays warm, avoiding a fresh connection per request.
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await connectDatabase()
  if (req.url && !req.url.startsWith('/api')) {
    req.url = `/api${req.url}`
  }
  return app(req, res)
}
