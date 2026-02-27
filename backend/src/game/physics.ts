import type { Boundary } from '../types/index.ts'

/**
 * Pure physics helpers used by `GameRoom`.
 *
 * All methods operate on plain numeric coordinates so this class stays
 * completely ignorant of networking and entity management.
 */
export class Physics {
  /**
   * Advance a player's position by its current velocity and bounce it off
   * the room boundary.
   *
   * `boundary` uses `{ x, y, width, height }` – the top-left corner plus
   * dimensions – matching the wire format sent to the frontend.
   */
  move(
    player: { x: number; y: number; radius: number; velocityX: number; velocityY: number },
    b: Boundary
  ) {
    player.x += player.velocityX
    player.y += player.velocityY

    const minX = b.x + player.radius
    const maxX = b.x + b.width - player.radius
    const minY = b.y + player.radius
    const maxY = b.y + b.height - player.radius

    // Horizontal bounce
    if (player.x < minX) {
      player.x = minX
      player.velocityX = Math.abs(player.velocityX)
    } else if (player.x > maxX) {
      player.x = maxX
      player.velocityX = -Math.abs(player.velocityX)
    }

    // Vertical bounce
    if (player.y < minY) {
      player.y = minY
      player.velocityY = Math.abs(player.velocityY)
    } else if (player.y > maxY) {
      player.y = maxY
      player.velocityY = -Math.abs(player.velocityY)
    }
  }

  /**
   * Circle–circle overlap test using entity objects that expose
   * `x`, `y`, and `radius` fields.
   */
  isColliding(
    a: { x: number; y: number; radius: number },
    b: { x: number; y: number; radius: number }
  ): boolean {
    return this.isCollidingFlat(a.x, a.y, a.radius, b.x, b.y, b.radius)
  }

  /**
   * Circle–circle overlap test using raw numbers.
   * Useful when one of the entities stores its position inside a nested
   * `position` object (e.g. `KnibbleState`) and you want to avoid the
   * overhead of creating a temporary wrapper object.
   */
  isCollidingFlat(ax: number, ay: number, ar: number, bx: number, by: number, br: number): boolean {
    const dx = ax - bx
    const dy = ay - by
    const distSq = dx * dx + dy * dy
    const radSum = ar + br
    return distSq <= radSum * radSum
  }
}
