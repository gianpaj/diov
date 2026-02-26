import type { Boundary, KnibbleState, PlayerState } from '../types'

export class Physics {
  // Clamp within boundary
  move(player: PlayerState, b: Boundary) {
    player.x += player.velocityX ?? 0
    player.y += player.velocityY ?? 0

    // Simple bounce
    if (player.x - player.radius < b.left) {
      player.x = b.left + player.radius
      player.velocityX = -player.velocityX!
    }
    if (player.x + player.radius > b.right) {
      player.x = b.right - player.radius
      player.velocityX = -player.velocityX!
    }
    if (player.y - player.radius < b.top) {
      player.y = b.top + player.radius
      player.velocityY = -player.velocityY!
    }
    if (player.y + player.radius > b.bottom) {
      player.y = b.bottom - player.radius
      player.velocityY = -player.velocityY!
    }
  }

  isColliding(a: PlayerState | KnibbleState, b: PlayerState | KnibbleState) {
    const dx = a.x - b.x
    const dy = a.y - b.y
    const distSq = dx * dx + dy * dy
    const radSum = a.radius + b.radius
    return distSq <= radSum * radSum
  }
}
