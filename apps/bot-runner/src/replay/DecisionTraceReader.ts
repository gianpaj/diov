import { readFile } from 'node:fs/promises'
import {
  decisionTraceRecordV1Schema,
  type DecisionTraceRecordV1,
} from '@battle-circles/agent-sdk'

export const parseDecisionTraceJsonl = (contents: string): DecisionTraceRecordV1[] =>
  contents
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => decisionTraceRecordV1Schema.parse(JSON.parse(line)))

export const readDecisionTraceFile = async (filePath: string): Promise<DecisionTraceRecordV1[]> =>
  parseDecisionTraceJsonl(await readFile(filePath, 'utf8'))
