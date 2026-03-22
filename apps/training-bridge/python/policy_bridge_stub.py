#!/usr/bin/env python3
"""
Reference Unix-socket policy bridge for Battle Circles.

Protocol:
- request body: MessagePack-encoded PolicyObservationV1
- response body: MessagePack-encoded CanonicalActionV1
- framing: 4-byte big-endian payload length prefix

Dependencies:
  pip install msgpack

Usage:
  python3 apps/training-bridge/python/policy_bridge_stub.py /tmp/battle-circles-policy.sock
"""

from __future__ import annotations

import os
import socket
import struct
import sys
from typing import Any

import msgpack  # type: ignore


def recv_exact(conn: socket.socket, size: int) -> bytes:
    data = bytearray()
    while len(data) < size:
        chunk = conn.recv(size - len(data))
        if not chunk:
            raise ConnectionError("socket closed before frame completed")
        data.extend(chunk)
    return bytes(data)


def recv_frame(conn: socket.socket) -> Any:
    header = recv_exact(conn, 4)
    (payload_size,) = struct.unpack(">I", header)
    payload = recv_exact(conn, payload_size)
    return msgpack.unpackb(payload, raw=False)


def send_frame(conn: socket.socket, payload: Any) -> None:
    packed = msgpack.packb(payload, use_bin_type=True)
    conn.sendall(struct.pack(">I", len(packed)) + packed)


def choose_action(observation: dict[str, Any]) -> dict[str, Any]:
    visible_food = observation.get("visibleFood", [])
    if visible_food:
      target = sorted(visible_food, key=lambda item: item["id"])[0]
      self_position = observation["self"]["position"]
      dx = target["position"]["x"] - self_position["x"]
      dy = target["position"]["y"] - self_position["y"]
      magnitude = (dx * dx + dy * dy) ** 0.5
      if magnitude == 0:
          return {"move": {"x": 0.0, "y": 0.0}, "ability": "none"}
      return {"move": {"x": dx / magnitude, "y": dy / magnitude}, "ability": "none"}

    return {"move": {"x": 0.0, "y": 0.0}, "ability": "none"}


def main() -> int:
    socket_path = sys.argv[1] if len(sys.argv) > 1 else "/tmp/battle-circles-policy.sock"
    if os.path.exists(socket_path):
        os.remove(socket_path)

    server = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    server.bind(socket_path)
    server.listen()

    print(f"[policy-bridge] listening on {socket_path}")
    try:
        while True:
            conn, _ = server.accept()
            with conn:
                observation = recv_frame(conn)
                action = choose_action(observation)
                send_frame(conn, action)
    finally:
        server.close()
        if os.path.exists(socket_path):
            os.remove(socket_path)


if __name__ == "__main__":
    raise SystemExit(main())
