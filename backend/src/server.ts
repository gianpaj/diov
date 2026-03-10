import express from 'express'
import { config } from './config.ts'

const app = express()
app.use(express.json())

app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', config.CORS_ORIGIN)
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  next()
})

app.get('/', (_req, res) => {
  res.json({
    service: 'battle-circles-backend',
    role: 'future business backend',
    gameplayAuthority: 'spacetimedb',
    status: 'ok',
  })
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.listen(config.PORT, () => {
  console.log(`Backend service listening on http://localhost:${config.PORT}`)
})
