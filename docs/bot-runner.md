# Bot Runner

## Goal

Run external AI clients against the live Battle Circles game without giving them more information than a desktop human player can see.

The bot runner:
- connects to SpacetimeDB as a normal client
- subscribes to authoritative tables
- builds a fairness-filtered observation
- chooses an action with a local policy or a Unix-socket bridge
- calls the same reducers as a human client

## Config

Use [`.env.example`](/Users/gianpaj_it/github/gianpaj/diov/apps/bot-runner/.env.example) as the starting point.

Important variables:
- `SPACETIMEDB_HOST`
- `SPACETIMEDB_DB_NAME`
- `BOT_POLICY`
- `BOT_POLICY_SOCKET_PATH`
- `BOT_POLICY_OBSERVATION_FORMAT`
- `BOT_TRACE_PATH`

Policy options:
- `lobby-fill`: simple believable bot for early testing
- `benchmark`: deterministic policy for regression and load testing
- `bridge`: delegates action selection to a local Unix-socket process

Observation format options for bridge mode:
- `structured`: sends `PolicyObservationV1`
- `packed`: sends `PackedPolicyObservationV1`

## Local Run

Start a rule bot:

```bash
cd /Users/gianpaj_it/github/gianpaj/diov
cp apps/bot-runner/.env.example apps/bot-runner/.env
pnpm --filter bot-runner start
```

Start the Python stub bridge:

```bash
cd /Users/gianpaj_it/github/gianpaj/diov
pip install msgpack
python3 apps/training-bridge/python/policy_bridge_stub.py /tmp/battle-circles-policy.sock
```

Then switch the bot runner to bridge mode:

```env
BOT_POLICY=bridge
BOT_POLICY_SOCKET_PATH=/tmp/battle-circles-policy.sock
BOT_POLICY_OBSERVATION_FORMAT=packed
```

## Trace Export

Set `BOT_TRACE_PATH` to write newline-delimited JSON decision records.

Each line contains:
- `policyObservation`: the fairness-safe policy input
- `privilegedDiagnostics`: full-room diagnostics for offline analysis
- `viewportBounds`: the visible camera bounds used to build the observation
- `action`: the chosen canonical action

Example:

```env
BOT_TRACE_PATH=/var/log/diov/bot-traces/guest-global.jsonl
```

The trace writer flushes on shutdown so `SIGINT` and `SIGTERM` do not drop buffered records.

## Hetzner Deployment Notes

For low latency, run the bot runner and the bridge process on the same Hetzner server as SpacetimeDB, or as close to it as possible.

Recommended shape:
- SpacetimeDB on the Hetzner host
- one or more `bot-runner` processes on the same host
- optional local Python bridge over Unix sockets
- trace export written to local disk and rotated by the host

## Validation

Useful commands:

```bash
pnpm --filter @battle-circles/agent-sdk test
pnpm --filter bot-runner test
pnpm type-check:all
```
