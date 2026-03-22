import path from 'node:path'
import { config } from '../config.ts'
import { createPolicyFromConfig } from '../policies/index.ts'
import { BotClient } from './BotClient.ts'

export interface ManagedBotClient {
  start(): void
  stop(): Promise<void>
}

export interface BotSupervisorOptions {
  botCount?: number
  playerNameBase?: string
  tracePath?: string
  createBotClient?: (index: number) => ManagedBotClient
}

const buildIndexedPlayerName = (playerNameBase: string, index: number, botCount: number) =>
  botCount <= 1 ? playerNameBase : `${playerNameBase} ${index + 1}`

const buildIndexedTracePath = (tracePath: string, index: number, botCount: number) => {
  if (botCount <= 1) {
    return tracePath
  }

  const ext = path.extname(tracePath)
  const base = ext.length > 0 ? tracePath.slice(0, -ext.length) : tracePath
  return `${base}-${index + 1}${ext}`
}

export class BotSupervisor {
  private clients: ManagedBotClient[] = []
  private readonly botCount: number
  private readonly playerNameBase: string
  private readonly tracePath: string | undefined
  private readonly createBotClient: (index: number) => ManagedBotClient

  constructor(options: BotSupervisorOptions = {}) {
    this.botCount = options.botCount ?? config.BOT_COUNT
    this.playerNameBase = options.playerNameBase ?? config.BOT_PLAYER_NAME
    this.tracePath = options.tracePath ?? config.BOT_TRACE_PATH
    this.createBotClient =
      options.createBotClient ??
      ((index: number) =>
        new BotClient({
          policy: createPolicyFromConfig(),
          playerName: buildIndexedPlayerName(this.playerNameBase, index, this.botCount),
          policyName: config.BOT_POLICY,
          tracePath: this.tracePath
            ? buildIndexedTracePath(this.tracePath, index, this.botCount)
            : undefined,
        }))
  }

  start() {
    if (this.clients.length > 0) {
      return
    }

    this.clients = Array.from({ length: this.botCount }, (_, index) => this.createBotClient(index))
    for (const client of this.clients) {
      client.start()
    }
  }

  async stop() {
    await Promise.all(this.clients.map(client => client.stop()))
    this.clients = []
  }
}

export { buildIndexedPlayerName, buildIndexedTracePath }
