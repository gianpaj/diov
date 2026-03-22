import type { CanonicalActionV1, DecisionTraceRecordV1 } from '@battle-circles/agent-sdk'
import type { BotPolicy } from '../runtime/BotClient.ts'

export interface ReplayComparison {
  index: number
  expectedAction: CanonicalActionV1
  actualAction: CanonicalActionV1
  matches: boolean
}

export interface ReplaySummary {
  total: number
  matched: number
  mismatched: number
}

const actionsMatch = (left: CanonicalActionV1, right: CanonicalActionV1) =>
  left.ability === right.ability &&
  left.move.x === right.move.x &&
  left.move.y === right.move.y

export const replayDecisionTrace = async (
  records: DecisionTraceRecordV1[],
  policy: BotPolicy
): Promise<ReplayComparison[]> => {
  const comparisons: ReplayComparison[] = []

  for (const [index, record] of records.entries()) {
    const actualAction = await policy.decide({
      policyObservation: record.policyObservation,
      viewportBounds: record.viewportBounds,
    })

    comparisons.push({
      index,
      expectedAction: record.action,
      actualAction,
      matches: actionsMatch(record.action, actualAction),
    })
  }

  return comparisons
}

export const summarizeReplayComparison = (comparisons: ReplayComparison[]): ReplaySummary => {
  const matched = comparisons.filter(comparison => comparison.matches).length
  return {
    total: comparisons.length,
    matched,
    mismatched: comparisons.length - matched,
  }
}
