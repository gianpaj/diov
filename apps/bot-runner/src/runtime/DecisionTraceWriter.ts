import { mkdir } from 'node:fs/promises'
import { createWriteStream, type WriteStream } from 'node:fs'
import path from 'node:path'
import type { DecisionTraceRecordV1 } from '@battle-circles/agent-sdk'

export class DecisionTraceWriter {
  private stream: WriteStream | null = null
  private ready: Promise<void> | null = null

  constructor(private readonly outputPath: string) {}

  async write(record: DecisionTraceRecordV1): Promise<void> {
    await this.ensureReady()
    await new Promise<void>((resolve, reject) => {
      if (!this.stream) {
        reject(new Error('decision trace stream is not available'))
        return
      }

      const line = `${JSON.stringify(record)}\n`
      this.stream.write(line, error => {
        if (error) {
          reject(error)
          return
        }
        resolve()
      })
    })
  }

  async close(): Promise<void> {
    if (!this.stream) {
      return
    }

    await new Promise<void>((resolve, reject) => {
      this.stream?.end((error?: Error | null) => {
        if (error) {
          reject(error)
          return
        }
        resolve()
      })
    })
    this.stream = null
  }

  private async ensureReady(): Promise<void> {
    if (this.ready) {
      return this.ready
    }

    this.ready = (async () => {
      await mkdir(path.dirname(this.outputPath), { recursive: true })
      this.stream = createWriteStream(this.outputPath, {
        flags: 'a',
        encoding: 'utf8',
      })

      await new Promise<void>((resolve, reject) => {
        this.stream?.once('open', () => resolve())
        this.stream?.once('error', reject)
      })
    })()

    return this.ready
  }
}
