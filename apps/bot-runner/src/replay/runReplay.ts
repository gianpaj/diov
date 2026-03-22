import { createPolicyFromConfig } from '../policies/index.ts'
import { readDecisionTraceFile } from './DecisionTraceReader.ts'
import { replayDecisionTrace, summarizeReplayComparison } from './replayDecisionTrace.ts'

const tracePath = process.argv[2]

if (!tracePath) {
  console.error('usage: pnpm --filter bot-runner replay <trace.jsonl>')
  process.exit(1)
}

const main = async () => {
  const records = await readDecisionTraceFile(tracePath)
  const comparisons = await replayDecisionTrace(records, createPolicyFromConfig())
  const summary = summarizeReplayComparison(comparisons)

  console.log(
    `[bot-runner replay] total=${summary.total} matched=${summary.matched} mismatched=${summary.mismatched}`
  )

  const mismatches = comparisons.filter(comparison => !comparison.matches).slice(0, 5)
  for (const mismatch of mismatches) {
    console.log(
      `[bot-runner replay] mismatch index=${mismatch.index} expected=${JSON.stringify(
        mismatch.expectedAction
      )} actual=${JSON.stringify(mismatch.actualAction)}`
    )
  }

  if (summary.mismatched > 0) {
    process.exit(1)
  }
}

void main()
