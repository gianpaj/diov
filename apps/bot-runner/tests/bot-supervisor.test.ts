import assert from 'node:assert/strict'
import test from 'node:test'
import {
  BotSupervisor,
  buildIndexedPlayerName,
  buildIndexedTracePath,
  type ManagedBotClient,
} from '../src/runtime/BotSupervisor.ts'

test('buildIndexedPlayerName keeps the base name for a single bot', () => {
  assert.equal(buildIndexedPlayerName('Bot Alpha', 0, 1), 'Bot Alpha')
})

test('buildIndexedPlayerName appends a stable suffix for multiple bots', () => {
  assert.equal(buildIndexedPlayerName('Bot Alpha', 1, 3), 'Bot Alpha 2')
})

test('buildIndexedTracePath keeps the original path for a single bot', () => {
  assert.equal(buildIndexedTracePath('/tmp/bots.jsonl', 0, 1), '/tmp/bots.jsonl')
})

test('buildIndexedTracePath appends a numeric suffix before the extension', () => {
  assert.equal(buildIndexedTracePath('/tmp/bots.jsonl', 2, 4), '/tmp/bots-3.jsonl')
})

test('BotSupervisor starts and stops the requested number of bot clients', async () => {
  const started: number[] = []
  const stopped: number[] = []

  const supervisor = new BotSupervisor({
    botCount: 3,
    createBotClient: (index: number): ManagedBotClient => ({
      start() {
        started.push(index)
      },
      async stop() {
        stopped.push(index)
      },
    }),
  })

  supervisor.start()
  assert.deepEqual(started, [0, 1, 2])

  await supervisor.stop()
  assert.deepEqual(stopped, [0, 1, 2])
})
