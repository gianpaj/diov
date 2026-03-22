import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import {
  canonicalActionV1Schema,
  policyObservationV1Schema,
  privilegedDiagnosticsV1Schema,
} from '../src/schema.ts'
import {
  validateCanonicalActionV1,
  validatePolicyObservationV1,
  validatePrivilegedDiagnosticsV1,
} from '../src/validators.ts'

const fixturesDir = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  '..',
  'src',
  'fixtures'
)

const readJsonFixture = async (name: string) =>
  JSON.parse(await readFile(path.join(fixturesDir, name), 'utf8'))

test('canonical action fixture matches schema and validator', async () => {
  const fixture = await readJsonFixture('canonical-action-v1.json')
  assert.deepEqual(canonicalActionV1Schema.parse(fixture), fixture)

  const result = validateCanonicalActionV1(fixture)
  assert.equal(result.success, true)
})

test('policy observation fixture matches schema and validator', async () => {
  const fixture = await readJsonFixture('policy-observation-v1.json')
  assert.deepEqual(policyObservationV1Schema.parse(fixture), fixture)

  const result = validatePolicyObservationV1(fixture)
  assert.equal(result.success, true)
})

test('privileged diagnostics fixture matches schema and validator', async () => {
  const fixture = await readJsonFixture('privileged-diagnostics-v1.json')
  assert.deepEqual(privilegedDiagnosticsV1Schema.parse(fixture), fixture)

  const result = validatePrivilegedDiagnosticsV1(fixture)
  assert.equal(result.success, true)
})

test('canonical action rejects out-of-range movement', () => {
  const result = validateCanonicalActionV1({
    move: { x: 1.5, y: 0 },
    ability: 'none',
  })

  assert.equal(result.success, false)
})
