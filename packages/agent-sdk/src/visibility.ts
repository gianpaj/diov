import type { Bounds, Vector2D } from './schema.ts'

export interface ViewportDimensions {
  width: number
  height: number
}

export interface PositionedEntity {
  position: Vector2D
}

export const getViewportBounds = (
  cameraPosition: Vector2D,
  dimensions: ViewportDimensions
): Bounds => ({
  x: cameraPosition.x - dimensions.width / 2,
  y: cameraPosition.y - dimensions.height / 2,
  width: dimensions.width,
  height: dimensions.height,
})

export const worldToScreen = (
  worldPosition: Vector2D,
  cameraPosition: Vector2D,
  dimensions: ViewportDimensions
): Vector2D => ({
  x: worldPosition.x - cameraPosition.x + dimensions.width / 2,
  y: worldPosition.y - cameraPosition.y + dimensions.height / 2,
})

export const stepCameraTowardsTarget = (
  cameraPosition: Vector2D,
  targetPosition: Vector2D,
  smoothing: number
): Vector2D => ({
  x: cameraPosition.x + (targetPosition.x - cameraPosition.x) * smoothing,
  y: cameraPosition.y + (targetPosition.y - cameraPosition.y) * smoothing,
})

export const isCircleVisibleInBounds = (
  center: Vector2D,
  radius: number,
  bounds: Bounds
): boolean =>
  center.x + radius >= bounds.x &&
  center.x - radius <= bounds.x + bounds.width &&
  center.y + radius >= bounds.y &&
  center.y - radius <= bounds.y + bounds.height

export const filterVisibleEntities = <T extends PositionedEntity>(
  entities: Iterable<T>,
  bounds: Bounds,
  getRadius: (entity: T) => number = () => 0
): T[] =>
  [...entities].filter(entity =>
    isCircleVisibleInBounds(entity.position, getRadius(entity), bounds)
  )
