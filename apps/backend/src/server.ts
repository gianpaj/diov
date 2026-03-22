import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { fileURLToPath } from 'node:url'
import { auth } from './auth.js'
import { config } from './config.js'
import { ensureEconomySchema } from './persistence/economy.js'
import { economyRoutes } from './routes/economy.js'

export const app = new Hono()

const corsOptions = cors({
  // When CORS_ORIGIN is '*', echo the request origin instead of using '*'
  origin: origin => (config.CORS_ORIGIN === '*' ? origin : config.CORS_ORIGIN),
  credentials: true,
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
})

// CORS must be registered before the route handlers that rely on cookies.
app.use('/api/*', corsOptions)

// Better Auth handler — catches all /api/auth/* routes
app.on(['POST', 'GET'], '/api/auth/*', c => auth.handler(c.req.raw))
app.route('/api', economyRoutes)

// Health / info routes
app.get('/', c =>
  c.json({
    service: 'battle-circles-backend',
    role: 'auth & payments',
    gameplayAuthority: 'spacetimedb',
    status: 'ok',
  })
)

app.get('/health', c => c.json({ status: 'ok' }))

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url)

if (isMainModule) {
  await ensureEconomySchema()
  serve({ fetch: app.fetch, port: config.PORT }, info => {
    console.log(`Backend service listening on http://localhost:${info.port}`)
  })
}
