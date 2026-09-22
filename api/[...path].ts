import type { IncomingMessage, ServerResponse } from 'node:http'
import handler from './index.js'

export default function catchAllHandler(req: IncomingMessage, res: ServerResponse) {
  return handler(req, res)
}
