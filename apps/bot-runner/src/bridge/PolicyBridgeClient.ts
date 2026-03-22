import net from 'node:net'
import {
  decodeCanonicalActionV1,
  type CanonicalActionV1,
  encodePolicyBridgeRequestV1,
  type PolicyBridgeRequestV1,
} from '@battle-circles/agent-sdk'
import { config } from '../config.ts'
import { encodeLengthPrefixedFrame, tryDecodeLengthPrefixedFrame } from './frame.ts'

export class PolicyBridgeClient {
  constructor(private readonly socketPath = config.BOT_POLICY_SOCKET_PATH) {}

  requestAction(request: PolicyBridgeRequestV1): Promise<CanonicalActionV1> {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection(this.socketPath)
      const outbound = encodeLengthPrefixedFrame(encodePolicyBridgeRequestV1(request))
      let inbound = new Uint8Array(0)

      socket.once('connect', () => {
        socket.write(outbound)
      })

      socket.on('data', chunk => {
        const chunkBytes = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk)
        const merged = new Uint8Array(inbound.byteLength + chunkBytes.byteLength)
        merged.set(inbound, 0)
        merged.set(chunkBytes, inbound.byteLength)
        inbound = merged

        const decoded = tryDecodeLengthPrefixedFrame(inbound)
        if (!decoded) {
          return
        }

        socket.end()
        resolve(decodeCanonicalActionV1(decoded.frame))
      })

      socket.once('error', error => {
        reject(error)
      })

      socket.once('end', () => {
        const decoded = tryDecodeLengthPrefixedFrame(inbound)
        if (!decoded) {
          reject(new Error('Policy bridge closed before sending a full response frame'))
        }
      })
    })
  }
}
