import { createPolicyFromConfig } from './policies/index.ts'
import { BotClient } from './runtime/BotClient.ts'

const botClient = new BotClient(createPolicyFromConfig())

botClient.start()

const stop = async () => {
  await botClient.stop()
  process.exit(0)
}

process.on('SIGINT', () => {
  void stop()
})
process.on('SIGTERM', () => {
  void stop()
})
