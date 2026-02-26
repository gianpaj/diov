import http from 'node:http'
import express from 'express'
import { Server as SocketIOServer } from 'socket.io'
import { config } from './config.ts'
// import { redisClient } from './persistence/redis'
import { GameEngine } from './game/engine.ts'
import { socketMiddleware } from './networking/socket.ts'

const app = express()
app.use(express.json())

// CORS for dev
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  next()
})

const server = http.createServer(app)
const io = new SocketIOServer(server, {
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
})

// initRedis() // start Redis client

const engine = new GameEngine(io)
socketMiddleware(io, engine) // register socket handlers

app.get('/', (_req, res) => res.send('Battle Circles backend'))

server.listen(config.PORT, () =>
  console.log(`🚀 Backend listening on http://localhost:${config.PORT}`)
)
