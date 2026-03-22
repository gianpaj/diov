import { config } from '../config.ts'
import type { BotPolicy } from '../runtime/BotClient.ts'
import { BenchmarkPolicy } from './BenchmarkPolicy.ts'
import { BridgePolicy } from './BridgePolicy.ts'
import { LobbyFillPolicy } from './LobbyFillPolicy.ts'

export const createPolicyFromConfig = (): BotPolicy => {
  switch (config.BOT_POLICY) {
    case 'bridge':
      return new BridgePolicy()
    case 'benchmark':
      return new BenchmarkPolicy()
    case 'lobby-fill':
    default:
      return new LobbyFillPolicy()
  }
}
