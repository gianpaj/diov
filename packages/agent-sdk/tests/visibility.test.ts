import assert from 'node:assert/strict'
import test from 'node:test'
import {
  filterVisibleEntities,
  getViewportBounds,
  isCircleVisibleInBounds,
  worldToScreen,
} from '../src/visibility.ts'

test('getViewportBounds centers the viewport on the camera position', () => {
  const bounds = getViewportBounds({ x: 400, y: 300 }, { width: 800, height: 600 })
  assert.deepEqual(bounds, { x: 0, y: 0, width: 800, height: 600 })
})

test('worldToScreen maps the camera center to screen center', () => {
  const point = worldToScreen(
    { x: 400, y: 300 },
    { x: 400, y: 300 },
    { width: 800, height: 600 }
  )

  assert.deepEqual(point, { x: 400, y: 300 })
})

test('isCircleVisibleInBounds keeps entities touching the viewport edge visible', () => {
  const visible = isCircleVisibleInBounds(
    { x: 810, y: 300 },
    10,
    { x: 0, y: 0, width: 800, height: 600 }
  )

  assert.equal(visible, true)
})

test('filterVisibleEntities removes entities fully outside the viewport', () => {
  const visible = filterVisibleEntities(
    [
      { id: 'inside', position: { x: 100, y: 100 }, radius: 12 },
      { id: 'outside', position: { x: 1200, y: 1200 }, radius: 12 },
    ],
    { x: 0, y: 0, width: 800, height: 600 },
    entity => entity.radius
  )

  assert.deepEqual(
    visible.map(entity => entity.id),
    ['inside']
  )
})
