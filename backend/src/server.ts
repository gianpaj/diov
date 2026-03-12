import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { auth } from './auth.ts'
import { config } from './config.ts'

const app = new Hono()

// CORS must be registered before Better Auth handler
app.use(
  '/api/auth/*',
  cors({
    // When CORS_ORIGIN is '*', echo the request origin instead of using '*'
    origin: origin => (config.CORS_ORIGIN === '*' ? origin : config.CORS_ORIGIN),
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
  })
)

// Better Auth handler — catches all /api/auth/* routes
app.on(['POST', 'GET'], '/api/auth/*', c => auth.handler(c.req.raw))

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

serve({ fetch: app.fetch, port: config.PORT }, info => {
  console.log(`Backend service listening on http://localhost:${info.port}`)
})
