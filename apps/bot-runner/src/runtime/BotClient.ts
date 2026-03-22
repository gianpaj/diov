import {
  buildObservationArtifacts,
  stepCameraTowardsTarget,
  type Bounds,
  type CanonicalActionV1,
  type DecisionTraceRecordV1,
  type PolicyObservationV1,
} from '@battle-circles/agent-sdk'
import {
  DbConnection,
  type ErrorContext,
  type SubscriptionHandle,
} from '@battle-circles/spacetimedb-bindings'
import { config } from '../config.ts'
import { LobbyFillPolicy } from '../policies/LobbyFillPolicy.ts'
import { buildSnapshotFromConnection } from './buildSnapshot.ts'
import { DecisionTraceWriter } from './DecisionTraceWriter.ts'

export interface BotDecisionInput {
  policyObservation: PolicyObservationV1
  viewportBounds: Bounds
}

export interface BotPolicy {
  decide(input: BotDecisionInput): CanonicalActionV1 | Promise<CanonicalActionV1>
}

export class BotClient {
  private connection: DbConnection | null = null
  private subscription: SubscriptionHandle | null = null
  private selfId: string | null = null
  private cameraPosition = { x: 0, y: 0 }
  private lastDecisionAt = 0
  private joinInFlight = false
  private acting = false
  private readonly traceWriter = config.BOT_TRACE_PATH
    ? new DecisionTraceWriter(config.BOT_TRACE_PATH)
    : null

  constructor(private readonly policy: BotPolicy = new LobbyFillPolicy()) {}

  start() {
    const builder = DbConnection.builder()
      .withUri(config.SPACETIMEDB_HOST)
      .withDatabaseName(config.SPACETIMEDB_DB_NAME)
      .onConnect((connection, identity) => {
        this.connection = connection
        this.selfId = identity.toHexString()

        this.subscription = connection
          .subscriptionBuilder()
          .onApplied(() => {
            void this.syncAndAct()
          })
          .onError((ctx: ErrorContext) => {
            console.error('[bot-runner] subscription error', ctx.event?.message ?? 'unknown error')
          })
          .subscribe([
            'SELECT * FROM room',
            'SELECT * FROM player',
            'SELECT * FROM player_result',
            'SELECT * FROM knibble',
            'SELECT * FROM spit_blob',
          ])

        console.log('[bot-runner] connected as', this.selfId)
      })
      .onDisconnect((_ctx, error) => {
        this.connection = null
        this.subscription = null
        this.selfId = null
        this.joinInFlight = false
        if (error) {
          console.error('[bot-runner] disconnected', error.message)
        } else {
          console.log('[bot-runner] disconnected')
        }
      })
      .onConnectError((_ctx, error) => {
        console.error('[bot-runner] connect error', error.message || 'unknown error')
      })

    this.connection = builder.build()
  }

  async stop() {
    this.subscription?.unsubscribe()
    this.connection?.disconnect()
    await this.traceWriter?.close()
    this.subscription = null
    this.connection = null
    this.selfId = null
    this.joinInFlight = false
  }

  private async ensureJoined() {
    if (!this.connection || !this.selfId || this.joinInFlight) {
      return
    }

    const currentPlayer = [...this.connection.db.player.iter()].find(
      (row: any) =>
        row.identity.toHexString() === this.selfId &&
        row.roomId === config.BOT_ROOM_ID &&
        row.isAlive
    )

    if (currentPlayer) {
      return
    }

    this.joinInFlight = true
    try {
      await this.connection.reducers.joinGame({
        roomId: config.BOT_ROOM_ID,
        playerName: config.BOT_PLAYER_NAME,
        skinId: undefined,
        color: undefined,
      })
      console.log('[bot-runner] joined room', config.BOT_ROOM_ID)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown join error'
      console.error('[bot-runner] join failed', message)
    } finally {
      this.joinInFlight = false
    }
  }

  private async syncAndAct() {
    if (this.acting || !this.connection || !this.selfId) {
      return
    }

    const now = Date.now()
    if (now - this.lastDecisionAt < config.BOT_DECISION_DEBOUNCE_MS) {
      return
    }

    this.acting = true
    try {
      await this.ensureJoined()
      const snapshot = buildSnapshotFromConnection(this.connection, config.BOT_ROOM_ID, this.selfId)
      if (!snapshot) {
        return
      }

      const self = snapshot.players.find(player => player.id === this.selfId)
      if (!self) {
        return
      }

      this.cameraPosition = stepCameraTowardsTarget(
        this.cameraPosition,
        self.position,
        config.BOT_CAMERA_SMOOTHING
      )

      const { policyObservation, privilegedDiagnostics, viewportBounds } =
        buildObservationArtifacts(snapshot, {
          cameraPosition: this.cameraPosition,
          dimensions: {
            width: config.BOT_VIEWPORT_WIDTH,
            height: config.BOT_VIEWPORT_HEIGHT,
          },
        })

      const action = await this.policy.decide({
        policyObservation,
        viewportBounds,
      })
      await this.writeDecisionTrace({
        version: 1,
        policyName: config.BOT_POLICY,
        recordedAtMs: now,
        viewportBounds,
        policyObservation,
        privilegedDiagnostics,
        action,
      })
      await this.executeAction(action)
      this.lastDecisionAt = now
    } finally {
      this.acting = false
    }
  }

  private async executeAction(action: CanonicalActionV1) {
    if (!this.connection) {
      return
    }

    await this.connection.reducers.setInput({
      x: action.move.x,
      y: action.move.y,
    })

    if (action.ability === 'split') {
      await this.connection.reducers.split({})
    }

    if (action.ability === 'spit') {
      await this.connection.reducers.spit({})
    }
  }

  private async writeDecisionTrace(record: DecisionTraceRecordV1) {
    if (!this.traceWriter) {
      return
    }

    try {
      await this.traceWriter.write(record)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown trace write error'
      console.error('[bot-runner] trace write failed', message)
    }
  }
}
