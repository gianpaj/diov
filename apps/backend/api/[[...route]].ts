import { handle } from 'hono/vercel'
import { ensureEconomySchema } from '../src/persistence/economy.js'
import { app } from '../src/server.js'

// Vercel imports the app without running the standalone server bootstrap path.
// Initialize the economy schema during cold start so auth/economy routes stay usable.
const initStartedAt = Date.now()
console.info('[vercel-api] module init started')
await ensureEconomySchema()
console.info('[vercel-api] module init completed', {
  ms: Date.now() - initStartedAt,
})

const handler = handle(app)

export default async function vercelApiHandler(request: Request) {
  const startedAt = Date.now()
  console.info('[vercel-api] request started', {
    method: request.method,
    pathname: new URL(request.url).pathname,
  })
  const response = await handler(request)
  console.info('[vercel-api] request completed', {
    method: request.method,
    pathname: new URL(request.url).pathname,
    status: response.status,
    ms: Date.now() - startedAt,
  })
  return response
}
