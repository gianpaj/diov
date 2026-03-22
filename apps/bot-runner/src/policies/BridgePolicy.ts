import {
  packPolicyObservationV1,
  type CanonicalActionV1,
  type PolicyBridgeObservationFormat,
  type PolicyBridgeRequestV1,
} from '@battle-circles/agent-sdk'
import { config } from '../config.ts'
import { PolicyBridgeClient } from '../bridge/PolicyBridgeClient.ts'
import type { BotDecisionInput } from '../runtime/BotClient.ts'

export class BridgePolicy {
  constructor(
    private readonly client = new PolicyBridgeClient(),
    private readonly observationFormat:
      | 'structured'
      | 'packed' = config.BOT_POLICY_OBSERVATION_FORMAT
  ) {}

  decide({ policyObservation, viewportBounds }: BotDecisionInput): Promise<CanonicalActionV1> {
    const requestFormat: PolicyBridgeObservationFormat =
      this.observationFormat === 'packed' ? 'packed_policy_observation_v1' : 'policy_observation_v1'

    const request: PolicyBridgeRequestV1 =
      requestFormat === 'packed_policy_observation_v1'
        ? {
            version: 1,
            format: requestFormat,
            observation: packPolicyObservationV1(policyObservation, viewportBounds),
          }
        : {
            version: 1,
            format: requestFormat,
            observation: policyObservation,
          }

    return this.client.requestAction(request)
  }
}
