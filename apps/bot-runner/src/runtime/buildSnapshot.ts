import type {
  ObservationSourceFood,
  ObservationSourcePlayer,
  ObservationSourceProjectile,
  ObservationSourceResult,
  ObservationSourceRoom,
  ObservationSourceSnapshot,
} from '@battle-circles/agent-sdk/observation'
import type { DbConnection } from '@battle-circles/spacetimedb-bindings'

const nowMs = () => Date.now()

const toPlayer = (row: any): ObservationSourcePlayer => ({
  id: row.identity.toHexString(),
  roomId: row.roomId,
  position: { x: row.x, y: row.y },
  velocity: { x: row.velX, y: row.velY },
  radius: row.radius,
  score: row.score,
  isAlive: row.isAlive,
  canSplit: true,
  canSpit: true,
})

const toFood = (row: any): ObservationSourceFood => ({
  id: row.id.toString(),
  roomId: row.roomId,
  position: { x: row.x, y: row.y },
  size: row.size,
})

const toProjectile = (row: any): ObservationSourceProjectile => ({
  id: row.id.toString(),
  roomId: row.roomId,
  position: { x: row.x, y: row.y },
  velocity: { x: row.velX, y: row.velY },
  size: row.size,
  ownerId: row.ownerIdentity.toHexString(),
})

const toResult = (row: any): ObservationSourceResult => ({
  playerId: row.playerIdentity.toHexString(),
  placement: row.placement,
  finalScore: row.finalScore,
})

const toTimeRemainingMs = (roomRow: any): number => {
  const currentTime = nowMs()
  if (roomRow.status === 'starting' && roomRow.countdownEndsAt) {
    return Math.max(0, Number(roomRow.countdownEndsAt) - currentTime)
  }
  if (roomRow.status === 'playing' && roomRow.startedAt) {
    const elapsed = currentTime - Number(roomRow.startedAt)
    return Math.max(0, Number(roomRow.durationMs) - elapsed)
  }
  return 0
}

export const buildSnapshotFromConnection = (
  connection: DbConnection,
  roomId: string,
  selfId: string
): ObservationSourceSnapshot | null => {
  const roomRow = [...connection.db.room.iter()].find((row: any) => row.id === roomId)
  if (!roomRow) {
    return null
  }

  const players = [...connection.db.player.iter()]
    .filter((row: any) => row.roomId === roomId)
    .map(toPlayer)
  const food = [...connection.db.knibble.iter()]
    .filter((row: any) => row.roomId === roomId)
    .map(toFood)
  const projectiles = [...connection.db.spitBlob.iter()]
    .filter((row: any) => row.roomId === roomId)
    .map(toProjectile)
  const results = [...connection.db.playerResult.iter()]
    .filter((row: any) => row.roomId === roomId)
    .map(toResult)

  if (!players.some(player => player.id === selfId)) {
    return null
  }

  const room: ObservationSourceRoom = {
    id: roomRow.id,
    status: roomRow.status as ObservationSourceRoom['status'],
    bounds: {
      x: roomRow.boundsX,
      y: roomRow.boundsY,
      width: roomRow.boundsWidth,
      height: roomRow.boundsHeight,
    },
    timeRemainingMs: toTimeRemainingMs(roomRow),
    playerCount: players.length,
  }

  return {
    tickId: nowMs(),
    timestampMs: nowMs(),
    selfId,
    room,
    players,
    food,
    projectiles,
    results,
  }
}
