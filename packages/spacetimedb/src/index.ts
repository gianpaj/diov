import { ScheduleAt } from 'spacetimedb'
import { schema, SenderError, t, table } from 'spacetimedb/server'

const DEFAULT_ROOM_ID = 'global'
const WORLD_WIDTH = 2000
const WORLD_HEIGHT = 2000
const TICK_INTERVAL_MS = 50n
const GAME_DURATION_MS = 5 * 60 * 1000
const MAX_PLAYERS = 12
const MIN_PLAYERS = 2
const PLAYER_START_RADIUS = 20
const MAX_NAME_LENGTH = 32
const MAX_SPEED = 5
const KNIBBLE_TARGET_COUNT = 120
const KNIBBLE_COLORS = ['#FFD93D', '#6BCF7F', '#4D96FF', '#FF6B9D', '#C44569'] as const

const room = table(
  {
    name: 'room',
    public: true,
    indexes: [{ name: 'room_status_idx', algorithm: 'btree', columns: ['status'] }],
  },
  {
    id: t.string().primaryKey(),
    status: t.string(),
    hostIdentity: t.identity().optional(),
    countdownEndsAt: t.i64().optional(),
    startedAt: t.i64().optional(),
    endedAt: t.i64().optional(),
    durationMs: t.u32(),
    maxPlayers: t.u32(),
    minPlayers: t.u32(),
    winnerIdentity: t.identity().optional(),
    lastUpdateAt: t.i64(),
    boundsX: t.f64(),
    boundsY: t.f64(),
    boundsWidth: t.f64(),
    boundsHeight: t.f64(),
  }
)

const player = table(
  {
    name: 'player',
    public: true,
    indexes: [{ name: 'player_room_id_idx', algorithm: 'btree', columns: ['roomId'] }],
  },
  {
    identity: t.identity().primaryKey(),
    roomId: t.string(),
    name: t.string(),
    x: t.f64(),
    y: t.f64(),
    radius: t.f64(),
    velX: t.f64(),
    velY: t.f64(),
    inputX: t.f64(),
    inputY: t.f64(),
    color: t.string(),
    score: t.u32(),
    isAlive: t.bool(),
    lastSplitAt: t.i64(),
    lastSpitAt: t.i64(),
    joinedAt: t.i64(),
  }
)

const knibble = table(
  {
    name: 'knibble',
    public: true,
    indexes: [{ name: 'knibble_room_id_idx', algorithm: 'btree', columns: ['roomId'] }],
  },
  {
    id: t.u64().primaryKey().autoInc(),
    roomId: t.string(),
    x: t.f64(),
    y: t.f64(),
    size: t.f64(),
    color: t.string(),
  }
)

const spitBlob = table(
  {
    name: 'spit_blob',
    public: true,
    indexes: [{ name: 'spit_blob_room_id_idx', algorithm: 'btree', columns: ['roomId'] }],
  },
  {
    id: t.u64().primaryKey().autoInc(),
    roomId: t.string(),
    ownerIdentity: t.identity(),
    x: t.f64(),
    y: t.f64(),
    velX: t.f64(),
    velY: t.f64(),
    size: t.f64(),
    createdAt: t.i64(),
  }
)

const playerResult = table(
  {
    name: 'player_result',
    public: true,
    indexes: [{ name: 'player_result_room_id_idx', algorithm: 'btree', columns: ['roomId'] }],
  },
  {
    id: t.string().primaryKey(),
    roomId: t.string(),
    playerIdentity: t.identity(),
    name: t.string(),
    color: t.string(),
    placement: t.u32(),
    finalSize: t.f64(),
    finalScore: t.u32(),
    joinedAt: t.i64(),
    eliminatedAt: t.i64(),
    wasWinner: t.bool(),
  }
)

const gameTick = table(
  {
    name: 'game_tick',
    scheduled: (): any => process_tick,
    indexes: [{ name: 'game_tick_room_id_idx', algorithm: 'btree', columns: ['roomId'] }],
  },
  {
    scheduledId: t.u64().primaryKey().autoInc(),
    roomId: t.string(),
    scheduledAt: t.scheduleAt(),
  }
)

const battleCircles = schema({ room, player, knibble, spitBlob, playerResult, gameTick })
export default battleCircles

function nowMicros(ctx: { timestamp: { microsSinceUnixEpoch: bigint } }): bigint {
  return ctx.timestamp.microsSinceUnixEpoch
}

function normalizeInput(x: number, y: number): { x: number; y: number } {
  const mag = Math.sqrt(x * x + y * y)
  if (mag <= 1 || mag === 0) {
    return { x, y }
  }

  return { x: x / mag, y: y / mag }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function isColliding(ax: number, ay: number, ar: number, bx: number, by: number, br: number): boolean {
  const dx = ax - bx
  const dy = ay - by
  const radiusSum = ar + br
  return dx * dx + dy * dy <= radiusSum * radiusSum
}

function randomHexColor(random: () => number): string {
  return KNIBBLE_COLORS[Math.floor(random() * KNIBBLE_COLORS.length)] ?? '#FFD93D'
}

function currentTimeMs(ctx: any): bigint {
  return nowMicros(ctx) / 1000n
}

function roomPlayers(ctx: any, roomId: string) {
  return [...ctx.db.player.iter()].filter((row: any) => row.roomId === roomId)
}

function roomPlayerCount(ctx: any, roomId: string): number {
  return roomPlayers(ctx, roomId).length
}

function roomPlayerResults(ctx: any, roomId: string) {
  return [...ctx.db.playerResult.iter()].filter((row: any) => row.roomId === roomId)
}

function playerResultId(roomId: string, identity: any): string {
  return `${roomId}:${identity.toHexString()}`
}

function ensureRoom(ctx: any, roomId: string) {
  const existing = ctx.db.room.id.find(roomId)
  if (existing) {
    return existing
  }

  const created = {
    id: roomId,
    status: 'waiting',
    hostIdentity: undefined,
    countdownEndsAt: undefined,
    startedAt: undefined,
    endedAt: undefined,
    durationMs: GAME_DURATION_MS,
    maxPlayers: MAX_PLAYERS,
    minPlayers: MIN_PLAYERS,
    winnerIdentity: undefined,
    lastUpdateAt: currentTimeMs(ctx),
    boundsX: 0,
    boundsY: 0,
    boundsWidth: WORLD_WIDTH,
    boundsHeight: WORLD_HEIGHT,
  }

  ctx.db.room.insert(created)
  return ctx.db.room.id.find(roomId)!
}

function randomSpawn(ctx: any, radius: number): { x: number; y: number } {
  return {
    x: radius + ctx.random() * (WORLD_WIDTH - radius * 2),
    y: radius + ctx.random() * (WORLD_HEIGHT - radius * 2),
  }
}

function upsertPlayer(ctx: any, roomId: string, name: string) {
  const existing = ctx.db.player.identity.find(ctx.sender)
  const spawn = randomSpawn(ctx, PLAYER_START_RADIUS)
  const cleanName = name.trim().slice(0, MAX_NAME_LENGTH) || 'Anonymous'
  const timestampMs = currentTimeMs(ctx)

  if (existing) {
    const updated = {
      ...existing,
      roomId,
      name: cleanName,
      x: spawn.x,
      y: spawn.y,
      radius: PLAYER_START_RADIUS,
      velX: 0,
      velY: 0,
      inputX: 0,
      inputY: 0,
      score: 0,
      isAlive: true,
      joinedAt: timestampMs,
    }
    ctx.db.player.identity.update(updated)
    return updated
  }

  const created = {
    identity: ctx.sender,
    roomId,
    name: cleanName,
    x: spawn.x,
    y: spawn.y,
    radius: PLAYER_START_RADIUS,
    velX: 0,
    velY: 0,
    inputX: 0,
    inputY: 0,
    color: randomHexColor(() => ctx.random()),
    score: 0,
    isAlive: true,
    lastSplitAt: 0n,
    lastSpitAt: 0n,
    joinedAt: timestampMs,
  }
  ctx.db.player.insert(created)
  return created
}

function updateRoomTimestamp(ctx: any, currentRoom: any, patch: Record<string, unknown> = {}) {
  ctx.db.room.id.update({
    ...currentRoom,
    ...patch,
    lastUpdateAt: currentTimeMs(ctx),
  })
}

function resetRoomToWaiting(ctx: any, currentRoom: any, patch: Record<string, unknown> = {}) {
  updateRoomTimestamp(ctx, currentRoom, {
    status: 'waiting',
    countdownEndsAt: undefined,
    startedAt: undefined,
    endedAt: undefined,
    winnerIdentity: undefined,
    ...patch,
  })
}

function clearPlayerResults(ctx: any, roomId: string) {
  for (const resultRow of roomPlayerResults(ctx, roomId)) {
    ctx.db.playerResult.id.delete(resultRow.id)
  }
}

function ensureGameTick(ctx: any, roomId: string, afterMicros: bigint = TICK_INTERVAL_MS * 1000n) {
  ctx.db.gameTick.insert({
    scheduledId: 0n,
    roomId,
    scheduledAt: ScheduleAt.time(nowMicros(ctx) + afterMicros),
  })
}

function spawnKnibble(ctx: any, roomId: string) {
  const size = 5 + ctx.random() * 10
  const pos = randomSpawn(ctx, size)
  ctx.db.knibble.insert({
    id: 0n,
    roomId,
    x: pos.x,
    y: pos.y,
    size,
    color: randomHexColor(() => ctx.random()),
  })
}

function maintainKnibbles(ctx: any, roomId: string) {
  const current = [...ctx.db.knibble.iter()].filter((row: any) => row.roomId === roomId).length
  const toSpawn = Math.max(0, KNIBBLE_TARGET_COUNT - current)
  for (let i = 0; i < Math.min(toSpawn, 8); i += 1) {
    spawnKnibble(ctx, roomId)
  }
}

function recordPlayerResult(
  ctx: any,
  roomId: string,
  playerRow: any,
  placement: number,
  eliminatedAt: bigint,
  wasWinner = false
) {
  const id = playerResultId(roomId, playerRow.identity)
  const existing = ctx.db.playerResult.id.find(id)
  const nextRow = {
    id,
    roomId,
    playerIdentity: playerRow.identity,
    name: playerRow.name,
    color: playerRow.color,
    placement,
    finalSize: playerRow.radius,
    finalScore: playerRow.score,
    joinedAt: playerRow.joinedAt,
    eliminatedAt,
    wasWinner,
  }

  if (existing) {
    ctx.db.playerResult.id.update(nextRow)
    return
  }

  ctx.db.playerResult.insert(nextRow)
}

function resolveKnibbleCollisions(ctx: any, roomId: string) {
  const knibbles = [...ctx.db.knibble.iter()].filter((row: any) => row.roomId === roomId)
  const players = roomPlayers(ctx, roomId)

  for (const currentKnibble of knibbles) {
    for (const currentPlayer of players) {
      const latestPlayer = ctx.db.player.identity.find(currentPlayer.identity)
      const latestKnibble = ctx.db.knibble.id.find(currentKnibble.id)
      if (!latestPlayer || !latestKnibble || !latestPlayer.isAlive) {
        continue
      }

      if (
        isColliding(
          latestPlayer.x,
          latestPlayer.y,
          latestPlayer.radius,
          latestKnibble.x,
          latestKnibble.y,
          latestKnibble.size
        )
      ) {
        ctx.db.player.identity.update({
          ...latestPlayer,
          radius: latestPlayer.radius + 2,
          score: latestPlayer.score + 1,
        })
        ctx.db.knibble.id.delete(latestKnibble.id)
        break
      }
    }
  }
}

function resolvePlayerCollisions(ctx: any, roomId: string) {
  const players = roomPlayers(ctx, roomId)
  const eliminationTime = currentTimeMs(ctx)

  for (let i = 0; i < players.length; i += 1) {
    const first = players[i]
    const latestFirst = ctx.db.player.identity.find(first.identity)
    if (!latestFirst || !latestFirst.isAlive) {
      continue
    }

    for (let j = i + 1; j < players.length; j += 1) {
      const second = players[j]
      const latestSecond = ctx.db.player.identity.find(second.identity)
      if (!latestSecond || !latestSecond.isAlive) {
        continue
      }

      if (
        !isColliding(
          latestFirst.x,
          latestFirst.y,
          latestFirst.radius,
          latestSecond.x,
          latestSecond.y,
          latestSecond.radius
        )
      ) {
        continue
      }

      if (latestFirst.radius > latestSecond.radius * 1.1) {
        ctx.db.player.identity.update({
          ...latestFirst,
          radius: latestFirst.radius + Math.round(latestSecond.radius * 0.1),
          score: latestFirst.score + Math.round(latestSecond.radius),
        })
        recordPlayerResult(ctx, roomId, latestSecond, roomPlayerCount(ctx, roomId), eliminationTime)
        ctx.db.player.identity.delete(latestSecond.identity)
      } else if (latestSecond.radius > latestFirst.radius * 1.1) {
        ctx.db.player.identity.update({
          ...latestSecond,
          radius: latestSecond.radius + Math.round(latestFirst.radius * 0.1),
          score: latestSecond.score + Math.round(latestFirst.radius),
        })
        recordPlayerResult(ctx, roomId, latestFirst, roomPlayerCount(ctx, roomId), eliminationTime)
        ctx.db.player.identity.delete(latestFirst.identity)
        break
      }
    }
  }
}

function resetPlayersForNewMatch(ctx: any, roomId: string) {
  const startedAt = currentTimeMs(ctx)
  clearPlayerResults(ctx, roomId)
  for (const currentPlayer of roomPlayers(ctx, roomId)) {
    const spawn = randomSpawn(ctx, PLAYER_START_RADIUS)
    ctx.db.player.identity.update({
      ...currentPlayer,
      x: spawn.x,
      y: spawn.y,
      radius: PLAYER_START_RADIUS,
      velX: 0,
      velY: 0,
      inputX: 0,
      inputY: 0,
      score: 0,
      isAlive: true,
      joinedAt: startedAt,
    })
  }
}

export const join_game = battleCircles.reducer(
  { roomId: t.string().optional(), playerName: t.string() },
  (ctx, { roomId, playerName }) => {
    const targetRoomId = roomId?.trim() || DEFAULT_ROOM_ID
    let currentRoom = ensureRoom(ctx, targetRoomId)
    const count = roomPlayerCount(ctx, targetRoomId)
    if (count === 0 && currentRoom.status !== 'waiting') {
      resetRoomToWaiting(ctx, currentRoom, { hostIdentity: undefined })
      currentRoom = ctx.db.room.id.find(targetRoomId)!
    }

    if (count >= currentRoom.maxPlayers) {
      throw new SenderError('Room is full')
    }

    const playerRow = upsertPlayer(ctx, targetRoomId, playerName)
    const refreshedRoom = ctx.db.room.id.find(targetRoomId)!

    if (!refreshedRoom.hostIdentity) {
      updateRoomTimestamp(ctx, refreshedRoom, { hostIdentity: playerRow.identity })
      return
    }

    updateRoomTimestamp(ctx, refreshedRoom)
  }
)

export const leave_game = battleCircles.reducer((ctx) => {
  const playerRow = ctx.db.player.identity.find(ctx.sender)
  if (!playerRow) {
    return
  }

  const currentRoom = ctx.db.room.id.find(playerRow.roomId)
  if (currentRoom && (currentRoom.status === 'starting' || currentRoom.status === 'playing')) {
    recordPlayerResult(ctx, playerRow.roomId, playerRow, roomPlayerCount(ctx, playerRow.roomId), currentTimeMs(ctx))
  }
  ctx.db.player.identity.delete(ctx.sender)
  if (!currentRoom) {
    return
  }

  const remaining = roomPlayers(ctx, playerRow.roomId)
  if (remaining.length === 0) {
    resetRoomToWaiting(ctx, currentRoom, { hostIdentity: undefined })
    return
  }

  updateRoomTimestamp(ctx, currentRoom, { hostIdentity: remaining[0]?.identity })
})

export const start_game = battleCircles.reducer((ctx) => {
  const playerRow = ctx.db.player.identity.find(ctx.sender)
  if (!playerRow) {
    throw new SenderError('Player not found')
  }

  const currentRoom = ensureRoom(ctx, playerRow.roomId)
  if (currentRoom.hostIdentity?.toHexString() !== ctx.sender.toHexString()) {
    throw new SenderError('Only the host can start the game')
  }

  if (currentRoom.status === 'starting' || currentRoom.status === 'playing') {
    throw new SenderError('Room already started')
  }

  const players = roomPlayers(ctx, playerRow.roomId)
  if (players.length < currentRoom.minPlayers) {
    throw new SenderError('Not enough players to start')
  }

  resetPlayersForNewMatch(ctx, currentRoom.id)
  const countdownEndsAt = currentTimeMs(ctx) + 5000n
  updateRoomTimestamp(ctx, currentRoom, {
    status: 'starting',
    countdownEndsAt,
    startedAt: undefined,
    endedAt: undefined,
    winnerIdentity: undefined,
  })
  ensureGameTick(ctx, currentRoom.id)
})

export const set_input = battleCircles.reducer(
  { x: t.f64(), y: t.f64() },
  (ctx, { x, y }) => {
    const playerRow = ctx.db.player.identity.find(ctx.sender)
    if (!playerRow) {
      throw new SenderError('Player not found')
    }

    const normalized = normalizeInput(x, y)
    ctx.db.player.identity.update({
      ...playerRow,
      inputX: normalized.x,
      inputY: normalized.y,
    })
  }
)

export const split = battleCircles.reducer((ctx) => {
  const playerRow = ctx.db.player.identity.find(ctx.sender)
  if (!playerRow) {
    throw new SenderError('Player not found')
  }

  ctx.db.player.identity.update({
    ...playerRow,
    lastSplitAt: currentTimeMs(ctx),
  })
})

export const spit = battleCircles.reducer((ctx) => {
  const playerRow = ctx.db.player.identity.find(ctx.sender)
  if (!playerRow) {
    throw new SenderError('Player not found')
  }

  const nextSize = Math.max(10, playerRow.radius - 2)
  const angleX = playerRow.inputX === 0 && playerRow.inputY === 0 ? 1 : playerRow.inputX
  const angleY = playerRow.inputY
  const timestampMs = currentTimeMs(ctx)

  ctx.db.player.identity.update({
    ...playerRow,
    radius: nextSize,
    lastSpitAt: timestampMs,
  })

  ctx.db.spitBlob.insert({
    id: 0n,
    roomId: playerRow.roomId,
    ownerIdentity: playerRow.identity,
    x: playerRow.x,
    y: playerRow.y,
    velX: angleX * 8,
    velY: angleY * 8,
    size: 4,
    createdAt: timestampMs,
  })
})

export const process_tick = battleCircles.reducer({ arg: gameTick.rowType }, (ctx, { arg }) => {
  const currentRoom = ctx.db.room.id.find(arg.roomId)
  if (!currentRoom) {
    return
  }

  const nowMs = currentTimeMs(ctx)

  if (currentRoom.status === 'starting' && currentRoom.countdownEndsAt && nowMs >= currentRoom.countdownEndsAt) {
    updateRoomTimestamp(ctx, currentRoom, {
      status: 'playing',
      startedAt: nowMs,
      countdownEndsAt: undefined,
      endedAt: undefined,
    })
  }

  const refreshedRoom = ctx.db.room.id.find(arg.roomId)
  if (!refreshedRoom) {
    return
  }

  if (refreshedRoom.status === 'playing') {
    const players = roomPlayers(ctx, refreshedRoom.id)
    for (const currentPlayer of players) {
      const nextVelX = currentPlayer.inputX * MAX_SPEED
      const nextVelY = currentPlayer.inputY * MAX_SPEED
      const nextX = clamp(
        currentPlayer.x + nextVelX,
        refreshedRoom.boundsX + currentPlayer.radius,
        refreshedRoom.boundsX + refreshedRoom.boundsWidth - currentPlayer.radius
      )
      const nextY = clamp(
        currentPlayer.y + nextVelY,
        refreshedRoom.boundsY + currentPlayer.radius,
        refreshedRoom.boundsY + refreshedRoom.boundsHeight - currentPlayer.radius
      )

      ctx.db.player.identity.update({
        ...currentPlayer,
        x: nextX,
        y: nextY,
        velX: nextVelX,
        velY: nextVelY,
      })
    }

    resolveKnibbleCollisions(ctx, refreshedRoom.id)
    resolvePlayerCollisions(ctx, refreshedRoom.id)
    maintainKnibbles(ctx, refreshedRoom.id)

    const remainingPlayers = roomPlayers(ctx, refreshedRoom.id)
    if (remainingPlayers.length <= 1) {
      if (remainingPlayers[0]) {
        recordPlayerResult(ctx, refreshedRoom.id, remainingPlayers[0], 1, nowMs, true)
      }
      updateRoomTimestamp(ctx, refreshedRoom, {
        status: 'finished',
        endedAt: nowMs,
        winnerIdentity: remainingPlayers[0]?.identity,
      })
    } else if (
      refreshedRoom.startedAt &&
      nowMs - refreshedRoom.startedAt >= BigInt(refreshedRoom.durationMs)
    ) {
      const rankedPlayers = [...remainingPlayers].sort((a, b) => {
        if (b.radius !== a.radius) {
          return b.radius - a.radius
        }
        if (b.score !== a.score) {
          return b.score - a.score
        }
        return Number(a.joinedAt - b.joinedAt)
      })

      rankedPlayers.forEach((currentPlayer, index) => {
        recordPlayerResult(ctx, refreshedRoom.id, currentPlayer, index + 1, nowMs, index === 0)
      })

      updateRoomTimestamp(ctx, refreshedRoom, {
        status: 'finished',
        endedAt: nowMs,
        winnerIdentity: rankedPlayers[0]?.identity,
      })
    }
  }

  const latestRoom = ctx.db.room.id.find(arg.roomId)
  if (latestRoom && (latestRoom.status === 'starting' || latestRoom.status === 'playing')) {
    ensureGameTick(ctx, latestRoom.id)
  }
})

export const init = battleCircles.init((ctx) => {
  ensureRoom(ctx, DEFAULT_ROOM_ID)
  maintainKnibbles(ctx, DEFAULT_ROOM_ID)
})

export const on_connect = battleCircles.clientConnected((_ctx) => {})

export const on_disconnect = battleCircles.clientDisconnected((ctx) => {
  const playerRow = ctx.db.player.identity.find(ctx.sender)
  if (!playerRow) {
    return
  }

  const currentRoom = ctx.db.room.id.find(playerRow.roomId)
  if (currentRoom && (currentRoom.status === 'starting' || currentRoom.status === 'playing')) {
    recordPlayerResult(ctx, playerRow.roomId, playerRow, roomPlayerCount(ctx, playerRow.roomId), currentTimeMs(ctx))
  }
  ctx.db.player.identity.delete(ctx.sender)

  if (!currentRoom) {
    return
  }

  const remaining = roomPlayers(ctx, playerRow.roomId)
  if (remaining.length === 0) {
    resetRoomToWaiting(ctx, currentRoom, { hostIdentity: undefined })
    return
  }

  updateRoomTimestamp(ctx, currentRoom, { hostIdentity: remaining[0]?.identity })
})
