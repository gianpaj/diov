import assert from 'node:assert/strict'
import test from 'node:test'
import { encodeLengthPrefixedFrame, tryDecodeLengthPrefixedFrame } from '../src/bridge/frame.ts'

test('length-prefixed frame round-trips a payload', () => {
  const payload = new Uint8Array([1, 2, 3, 4])
  const encoded = encodeLengthPrefixedFrame(payload)
  const decoded = tryDecodeLengthPrefixedFrame(encoded)

  assert.ok(decoded)
  assert.deepEqual(Array.from(decoded.frame), [1, 2, 3, 4])
  assert.equal(decoded.remaining.byteLength, 0)
})

test('decoder returns null for incomplete frames', () => {
  const payload = encodeLengthPrefixedFrame(new Uint8Array([1, 2, 3]))
  const partial = payload.slice(0, payload.byteLength - 1)
  assert.equal(tryDecodeLengthPrefixedFrame(partial), null)
})
