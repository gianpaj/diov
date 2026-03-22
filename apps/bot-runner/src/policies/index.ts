import { config } from '../config.ts'
import type { BotPolicy } from '../runtime/BotClient.ts'
import { BenchmarkPolicy } from './BenchmarkPolicy.ts'
import { LobbyFillPolicy } from './LobbyFillPolicy.ts'

export const createPolicyFromConfig = (): BotPolicy => {
  switch (config.BOT_POLICY) {
    case 'benchmark':
      return new BenchmarkPolicy()
    case 'lobby-fill':
    default:
      return new LobbyFillPolicy()
  }
}
