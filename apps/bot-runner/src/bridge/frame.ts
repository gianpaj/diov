export const encodeLengthPrefixedFrame = (payload: Uint8Array): Uint8Array => {
  const frame = new Uint8Array(4 + payload.byteLength)
  const view = new DataView(frame.buffer)
  view.setUint32(0, payload.byteLength)
  frame.set(payload, 4)
  return frame
}

export const tryDecodeLengthPrefixedFrame = (
  buffer: Uint8Array
): { frame: Uint8Array; remaining: Uint8Array } | null => {
  if (buffer.byteLength < 4) {
    return null
  }

  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  const payloadLength = view.getUint32(0)
  if (buffer.byteLength < payloadLength + 4) {
    return null
  }

  return {
    frame: buffer.slice(4, 4 + payloadLength),
    remaining: buffer.slice(4 + payloadLength),
  }
}
