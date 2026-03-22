import type { CanonicalActionV1, PolicyObservationV1 } from '@battle-circles/agent-sdk'
import { PolicyBridgeClient } from '../bridge/PolicyBridgeClient.ts'

export class BridgePolicy {
  constructor(private readonly client = new PolicyBridgeClient()) {}

  decide(observation: PolicyObservationV1): Promise<CanonicalActionV1> {
    return this.client.requestAction(observation)
  }
}
