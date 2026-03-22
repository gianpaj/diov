import { decode, encode } from '@msgpack/msgpack'
import type {
  CanonicalActionV1,
  PolicyBridgeRequestV1,
  PolicyObservationV1,
  PrivilegedDiagnosticsV1,
} from '../schema.ts'
import {
  canonicalActionV1Schema,
  policyBridgeRequestV1Schema,
  policyObservationV1Schema,
  privilegedDiagnosticsV1Schema,
} from '../schema.ts'

export const encodePolicyObservationV1 = (value: PolicyObservationV1): Uint8Array => encode(value)

export const decodePolicyObservationV1 = (payload: Uint8Array): PolicyObservationV1 =>
  policyObservationV1Schema.parse(decode(payload))

export const encodeCanonicalActionV1 = (value: CanonicalActionV1): Uint8Array => encode(value)

export const decodeCanonicalActionV1 = (payload: Uint8Array): CanonicalActionV1 =>
  canonicalActionV1Schema.parse(decode(payload))

export const encodePolicyBridgeRequestV1 = (value: PolicyBridgeRequestV1): Uint8Array =>
  encode(value)

export const decodePolicyBridgeRequestV1 = (payload: Uint8Array): PolicyBridgeRequestV1 =>
  policyBridgeRequestV1Schema.parse(decode(payload))

export const encodePrivilegedDiagnosticsV1 = (value: PrivilegedDiagnosticsV1): Uint8Array =>
  encode(value)

export const decodePrivilegedDiagnosticsV1 = (payload: Uint8Array): PrivilegedDiagnosticsV1 =>
  privilegedDiagnosticsV1Schema.parse(decode(payload))
