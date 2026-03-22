import { BotClient } from './runtime/BotClient.ts'

const botClient = new BotClient()

botClient.start()

const stop = () => {
  botClient.stop()
  process.exit(0)
}

process.on('SIGINT', stop)
process.on('SIGTERM', stop)
