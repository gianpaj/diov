import { BotSupervisor } from './runtime/BotSupervisor.ts'

const botSupervisor = new BotSupervisor()

botSupervisor.start()

const stop = async () => {
  await botSupervisor.stop()
  process.exit(0)
}

process.on('SIGINT', () => {
  void stop()
})
process.on('SIGTERM', () => {
  void stop()
})
