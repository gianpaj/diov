# ROADMAP

<!-- o3 -->

A fast-paced, 5-minute, 2-D web-mobile arena game where up to 12 players compete to grow by devouring smaller circles until one champion remains.

⸻

1. Vision & North-Star Metrics
	•	Sessions / day: ≥ 5 k within 3 months of launch
	•	Average match time: 4-5 min (hard-capped at 5 min)
	•	First-week retention (D1 / D7): 40 % / 20 %
	•	Lag-free play: 60 fps on mid-tier 2019 Android & iOS browsers

2. Guiding Principles
	1.	Mobile-first, landscape only – thumb-reach controls, fat-finger-safe buttons
	2.	Snackable core loop – no menus longer than a match
	3.	Skill > RNG – randomness only for nibble spawns & split counts
	4.	Zero pay-to-win – cosmetics only (phase 4)
	5.	Always alive – instant re-queue after defeat (phase 3+)

3. Technology Stack

Layer	Choice	Reason
Client	React 18 + TypeScript + Vite	Fast hot-reload, PWA-ready
Renderer	PixiJS 7	WebGL 2-D, tunable performance
Realtime	Colyseus (WS) on Node 20	Room-based, authoritative server
State	Zustand	Minimalistic TS store
Icons	lucide-react	Feather-style, tree-shakeable
CI/CD	GitHub Actions + Vercel	PR previews, edge network

4. Milestone Timeline (≈ 16 Weeks)

Phase	Calendar	Key Deliverables
0. Foundations	W-1 to W2	Project scaffolding, ESLint/Prettier, deployment pipeline, Colyseus room skeleton
1. Core Prototype	W3-W5	Local play vs bots, circle physics & collisions, joystick + 2 action buttons, nibble spawn logic
2. Online Alpha	W6-W8	12-player rooms, lobby & min-5 start, map shrink, basic matchmaking, network rollbacks & anti-cheat guards
3. Closed Beta	W9-W12	Account stub (guest IDs), EU-W + US-E regions, telemetry, balancing sliders (speed, growth, shrink rate), first-pass SFX/VFX
4. Public Launch	W13-W16	PWA install banner, social share, cosmetics shop (coins only), launch trailer, App Store/Play Store wrappers (Capacitor)
5. LiveOps 1.0	Post-launch	Weekly maps, season leaderboard, analytics-driven tuning, GDPR+CCPA compliance

5. Detailed Work Breakdown

🛠️ Phase 0 – Foundations
	•	Repo init with pnpm workspaces (client, server, shared)
	•	Type-safe schema shared between client ⇄ server
	•	CI lint/test/build on PR
	•	Render test harness at 10 k entities 60 fps

🎮 Phase 1 – Core Prototype
	•	Physics & movement (inverse speed to mass)
	•	Elastic collision when sizes equal ±5 %
	•	Split mechanic (random 4-10 shards, tween back via spring)
	•	Spit mechanic (blue projectile, despawn 20 s)
	•	Local pause & slow-motion debug panel

🌐 Phase 2 – Online Alpha
	•	Colyseus room lifecycle
	•	Waiting room min-5 / max-12 logic
	•	Autorollback on packet loss > 200 ms
	•	Server envelope encryption (TLS)
	•	Basic bot fill if queue > 20 s (toggleable)

🔒 Phase 3 – Closed Beta
	•	Soft currency & XP stub (no store)
	•	GDPR cookie & privacy screens
	•	Player reporting & mute
	•	Load test 5 k CCU via k6 scripts
	•	Accessibility pass (WCAG 2.1 AA colour contrast)

🚀 Phase 4 – Public Launch
	•	Cosmetic skins pipeline (SVG masks → texture atlas)
	•	Cross-promo banner slots
	•	App review (Apple, Google) checklist
	•	Marketing site + SEO (OpenGraph clips)

♾️ Phase 5 – LiveOps 1.0
	•	Season system (4-week cadence)
	•	New nibble modifiers (speed boost, shrink antidote)
	•	Ranked queue MMR
	•	Serverless relays in new regions (LATAM, APAC)

6. Risk & Mitigation

Risk	Impact	Mitigation
High ping > 300 ms	Players overshoot & miss eats	Client-side prediction + server reconciliation
Mass desync exploit	Unfair growth	Authoritative server, deterministic seed
Store rejection	Delays launch	Pre-submit TestFlight / Internal tests by W14

7. KPIs & Instrumentation
	•	Match result payload (< 1 kB) → BigQuery via Segment
	•	Heat-maps for deaths & nibble spawns (phase 3)
	•	Crashlytics for wrapper builds

8. Post-MVP Wishlist (Icebox)
	•	Team-duos mode
	•	Spectator camera after death
	•	Twitch extension for viewer buffs
	•	NFT cosmetics (gated – evaluate community sentiment)

⸻

📌 Next Steps (This Week)
	1.	Approve tech stack & repo structure
	2.	Schedule art prototype sprint (2 days)
	3.	Set up playtest Slack channel & calendar invites
	4.	Lock sprint length (suggest 1 week) & rituals

“The sooner we can devour our own builds, the faster we’ll outgrow the competition.”

<!-- claude 4 -->

# Battle Circles - Game Development Roadmap

A multiplayer 2D webapp game where players compete to eat each other and become the last circle standing.

## 🎯 Game Overview

**Core Concept**: Multiplayer battle royale where players control circles that grow by eating smaller opponents and collectibles.

**Key Mechanics**:
- Up to 12 players per match
- 5-minute time limit or last player standing
- Size-based eating system
- Shrinking map boundaries
- Split and spit abilities
- Mobile-first landscape design

## 🗓️ Development Phases

### Phase 1: Foundation & Core Architecture (Weeks 1-3)

#### Technical Setup
- [ ] **Project Structure**
  - Set up TypeScript React project with Vite
  - Configure ESLint, Prettier, and Husky
  - Set up folder structure (`src/components`, `src/game`, `src/utils`, etc.)

- [ ] **Game Engine Foundation**
  - Implement 2D canvas rendering system
  - Create game loop with fixed timestep
  - Set up coordinate system and viewport
  - Basic circle rendering and movement

- [ ] **UI Framework**
  - Install and configure Lucide React icons
  - Set up responsive design system
  - Implement landscape mode detection/enforcement
  - Create basic component library

#### Core Game Mechanics
- [ ] **Player Entity System**
  - Circle class with position, size, velocity
  - Player input handling (virtual joystick)
  - Basic movement physics
  - Size-based speed calculation

- [ ] **Map System**
  - Static map boundaries
  - Collision detection with walls
  - Basic camera/viewport management

### Phase 2: Multiplayer Infrastructure (Weeks 4-6)

#### Backend Services - Colyseus Server Setup
- [ ] **Colyseus Server Installation & Configuration**
  ```bash
  pnpm install colyseus @colyseus/monitor @colyseus/social
  ```
  - Create server entry point with Colyseus
  - Configure room handler registration
  - Set up development monitoring dashboard
  - Configure CORS and security middleware

- [ ] **Game Room Implementation**
  - Create `BattleRoom` class extending Colyseus `Room`
  - Define room state schema using `@colyseus/schema`
  - Implement room lifecycle methods (`onCreate`, `onJoin`, `onLeave`)
  - Handle player authentication and seat assignment

- [ ] **State Schema Design**
  ```typescript
  // Server-side state schema
  class GameState extends Schema {
    @type({ map: Player }) players = new MapSchema<Player>();
    @type({ map: Knibble }) knibbles = new MapSchema<Knibble>();
    @type("number") gameTime = 300; // 5 minutes
    @type("string") phase = "waiting"; // waiting, playing, finished
    @type("number") mapSize = 1000;
  }
  ```

- [ ] **Message Handling System**
  - Define client message types (`move`, `split`, `spit`)
  - Implement server-side validation and processing
  - Handle player input with rate limiting
  - Broadcast state updates efficiently

#### Frontend - Colyseus Client Integration
- [ ] **Colyseus Client Setup**
  ```bash
  npm install colyseus.js
  ```
  - Create Colyseus client connection manager
  - Implement room joining and reconnection logic
  - Handle connection states and error recovery
  - Set up client-side prediction framework

- [ ] **React Integration**
  ```typescript
  // Custom hook for Colyseus room
  const useGameRoom = () => {
    const [room, setRoom] = useState<Room<GameState>>();
    const [gameState, setGameState] = useState<GameState>();

    useEffect(() => {
      const client = new Client("ws://localhost:2567");
      client.joinOrCreate<GameState>("battle").then(room => {
        setRoom(room);
        room.onStateChange(setGameState);
      });
    }, []);

    return { room, gameState };
  };
  ```

- [ ] **State Synchronization**
  - Listen to Colyseus state changes with `onStateChange`
  - Handle player additions/removals with `onAdd`/`onRemove`
  - Implement smooth interpolation for remote players
  - Manage local state prediction and reconciliation

- [ ] **Message Sending**
  - Implement input message sending to server
  - Handle message acknowledgments and retries
  - Queue messages during connection issues
  - Implement client-side validation before sending

### Phase 3: Core Gameplay Features (Weeks 7-10)

#### Eating Mechanics - Colyseus Implementation
- [ ] **Server-Side Combat Logic**
  ```typescript
  // In BattleRoom class
  handlePlayerCollision(playerA: Player, playerB: Player) {
    const sizeDiff = playerA.size - playerB.size;
    if (Math.abs(sizeDiff) < 5) {
      // Bounce logic for similar sizes
      this.bouncePlayersApart(playerA, playerB);
    } else if (sizeDiff > 5) {
      // PlayerA eats PlayerB
      this.eliminatePlayer(playerB.id);
      this.growPlayer(playerA.id, playerB.size * 0.8);
    }
  }
  ```

- [ ] **Knibbles System with Colyseus**
  - Server-side knibble spawning timer
  - Collision detection in room update loop
  - State broadcasting for knibble consumption
  - Client-side visual feedback synchronization

- [ ] **Client-Side Prediction**
  - Predict eating outcomes locally for responsiveness
  - Reconcile with server authoritative state
  - Handle rollback for incorrect predictions
  - Smooth visual transitions during corrections

#### Map Dynamics - Colyseus State Management
- [ ] **Server-Side Boundary System**
  ```typescript
  // In GameState schema
  @type("number") mapSize = 1000;
  @type("number") shrinkRate = 2; // pixels per second

  // In BattleRoom update loop
  updateBoundaries(deltaTime: number) {
    if (this.state.phase === "playing") {
      this.state.mapSize -= this.state.shrinkRate * deltaTime;
      this.checkPlayersOutOfBounds();
    }
  }
  ```

- [ ] **Client-Side Boundary Rendering**
  - Subscribe to mapSize changes from Colyseus state
  - Implement smooth boundary animation
  - Visual danger zone indicators
  - Particle effects for boundary damage

#### Special Abilities - Colyseus Message Handling
- [ ] **Split Mechanism with Server Authority**
  ```typescript
  // Client sends split request
  room.send("split", { playerId: localPlayerId });

  // Server processes split
  onMessage("split", (client, message) => {
    const player = this.state.players.get(client.sessionId);
    if (player && player.canSplit()) {
      this.createSplitPieces(player, Math.floor(Math.random() * 7) + 4);
    }
  });
  ```

- [ ] **Spit Projectile System**
  - Server-side projectile entity management
  - Colyseus schema for spit blobs
  - Client-side projectile interpolation
  - Collision detection and cleanup timers

- [ ] **Ability Cooldowns & Validation**
  - Server-side cooldown tracking per player
  - Message rate limiting for abilities
  - Client-side UI feedback for cooldowns
  - Anti-spam validation and penalties

### Phase 4: User Interface & Controls (Weeks 11-13)

#### Mobile Controls
- [ ] **Virtual Joystick**
  - Touch-responsive joystick component
  - Smooth input mapping to movement
  - Visual feedback and dead zones
  - Left-side screen positioning

- [ ] **Action Buttons**
  - Split button with Lucide icons
  - Spit button with visual feedback
  - Right-side screen positioning
  - Touch state management and cooldowns

#### Game UI

- [ ] **HUD Elements**
  - Player size indicator
  - Remaining time counter
  - Player count display
  - Minimap with boundary indicator

- [ ] **Waiting Room Interface**
  - Player list with ready states
  - Game countdown timer
  - Quick tutorial/controls guide
  - Connection status indicator

### Phase 5: Visual Polish & Effects (Weeks 14-16)

#### Graphics & Animation
- [ ] **Visual Effects**
  - Eating animations and particles
  - Growth/shrink visual feedback
  - Boundary warning effects
  - Death/elimination animations

- [ ] **UI Polish**
  - Smooth transitions between screens
  - Loading states and progress indicators
  - Error handling and user feedback
  - Responsive design optimization

#### Audio Integration
- [ ] **Sound System**
  - Background music and ambient sounds
  - Action feedback (eating, splitting, spitting)
  - UI interaction sounds
  - Volume controls and muting

### Phase 6: Performance & Optimization (Weeks 17-18)

#### Technical Optimization
- [ ] **Rendering Performance**
  - Canvas optimization techniques
  - Object pooling for game entities
  - Spatial partitioning for collision detection
  - Frame rate monitoring and adjustment

- [ ] **Colyseus Performance Optimization**
  - Implement Colyseus patches for minimal state updates
  ```typescript
  // Only send changed properties
  player.listen("x", (currentValue, previousValue) => {
    // Interpolate position on client
  });
  ```
  - Configure room simulation interval (60Hz server, 30Hz broadcast)
  - Use Colyseus filters for relevance-based updates
  - Implement spatial partitioning for area-of-interest updates

- [ ] **Network Optimization**
  - Message compression and batching with Colyseus
  - Delta compression for state updates (built into Colyseus)
  - Bandwidth monitoring and adjustment
  - Mobile network optimization with adaptive quality

### Phase 7: Testing & Deployment (Weeks 19-21)

#### Quality Assurance
- [ ] **Automated Testing**
  - Unit tests for game logic
  - Integration tests for multiplayer features
  - Performance benchmarking
  - Cross-browser compatibility testing

- [ ] **User Testing**
  - Playtesting sessions with target users
  - Balance adjustments based on feedback
  - UI/UX improvements
  - Bug fixing and stability improvements

#### Deployment
- [ ] **Production Setup**
  - Server infrastructure and scaling
  - CDN setup for static assets
  - Monitoring and logging systems
  - Backup and disaster recovery

## 🛠️ Technical Stack

**Frontend**: React + TypeScript + Vite + Colyseus Client
**Styling**: CSS Modules or Styled Components
**Icons**: Lucide React
**Real-time**: Colyseus.js (WebSocket-based)
**Backend**: Node.js + Colyseus Server + Express
**Database**: Redis for sessions, PostgreSQL for persistence
**State Management**: Zustand + Colyseus Schema
**Deployment**: Docker + cloud platform (AWS/GCP/Vercel)

## 🏗️ Colyseus Architecture Deep Dive

### Server Architecture
```typescript
// server/src/rooms/BattleRoom.ts
import { Room, Client } from "colyseus";
import { BattleRoomState, Player, Knibble } from "./schema/BattleRoomState";

export class BattleRoom extends Room<BattleRoomState> {
  maxClients = 12;
  patchRate = 50; // 20 times per second
  simulationInterval = 1000 / 60; // 60 FPS server simulation

  onCreate(options: any) {
    this.setState(new BattleRoomState());
    this.setSimulationInterval(this.simulationInterval);
    this.clock.start();
  }

  onJoin(client: Client, options: any) {
    const player = new Player(client.sessionId);
    this.state.players.set(client.sessionId, player);

    // Start game when minimum players reached
    if (this.state.players.size >= 5 && this.state.phase === "waiting") {
      this.startGame();
    }
  }

  onMessage(client: Client, type: string, message: any) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    switch (type) {
      case "move":
        this.handlePlayerMove(player, message);
        break;
      case "split":
        this.handlePlayerSplit(player);
        break;
      case "spit":
        this.handlePlayerSpit(player, message);
        break;
    }
  }

  onLeave(client: Client, consented: boolean) {
    this.state.players.delete(client.sessionId);

    // End game if too few players
    if (this.state.players.size < 2 && this.state.phase === "playing") {
      this.endGame();
    }
  }

  update(deltaTime: number) {
    if (this.state.phase !== "playing") return;

    this.updatePlayers(deltaTime);
    this.updateKnibbles(deltaTime);
    this.updateBoundaries(deltaTime);
    this.checkCollisions();
    this.spawnKnibbles();
  }
}
```

### Schema Definition
```typescript
// server/src/schema/BattleRoomState.ts
import { Schema, type, MapSchema } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") id: string;
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") size: number = 20;
  @type("number") targetX: number = 0;
  @type("number") targetY: number = 0;
  @type("string") color: string = "#ff0000";
  @type("boolean") isAlive: boolean = true;
  @type("number") lastSplitTime: number = 0;
  @type("number") lastSpitTime: number = 0;
  @type(["number"]) pieces: number[] = []; // For split pieces
}

export class Knibble extends Schema {
  @type("string") id: string;
  @type("number") x: number;
  @type("number") y: number;
  @type("number") size: number = 5;
  @type("string") color: string = "#00ff00";
}

export class SpitBlob extends Schema {
  @type("string") id: string;
  @type("number") x: number;
  @type("number") y: number;
  @type("number") velocityX: number;
  @type("number") velocityY: number;
  @type("number") size: number = 8;
  @type("string") ownerId: string;
  @type("number") despawnTime: number;
}

export class BattleRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Knibble }) knibbles = new MapSchema<Knibble>();
  @type({ map: SpitBlob }) spitBlobs = new MapSchema<SpitBlob>();
  @type("number") gameTime: number = 300000; // 5 minutes in ms
  @type("string") phase: string = "waiting"; // waiting, playing, finished
  @type("number") mapSize: number = 1000;
  @type("number") playersAlive: number = 0;
  @type("string") winner: string = "";
}
```

### Client Integration
```typescript
// client/src/hooks/useGameRoom.ts
import { useEffect, useState, useCallback } from 'react';
import { Client, Room } from 'colyseus.js';
import { BattleRoomState, Player } from '../types/schema';

export const useGameRoom = () => {
  const [room, setRoom] = useState<Room<BattleRoomState> | null>(null);
  const [gameState, setGameState] = useState<BattleRoomState | null>(null);
  const [localPlayer, setLocalPlayer] = useState<Player | null>(null);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'error'>('connecting');

  const connect = useCallback(async () => {
    try {
      const client = new Client(process.env.REACT_APP_COLYSEUS_URL || 'ws://localhost:2567');
      const room = await client.joinOrCreate<BattleRoomState>('battle');

      setRoom(room);
      setConnectionState('connected');

      // Handle state changes
      room.onStateChange((state) => {
        setGameState(state);
      });

      // Handle player-specific events
      room.state.players.onAdd = (player, key) => {
        if (key === room.sessionId) {
          setLocalPlayer(player);
        }
      };

      room.state.players.onRemove = (player, key) => {
        if (key === room.sessionId) {
          setLocalPlayer(null);
        }
      };

      // Handle disconnection
      room.onLeave(() => {
        setConnectionState('error');
        setRoom(null);
        setGameState(null);
        setLocalPlayer(null);
      });

    } catch (error) {
      console.error('Failed to connect to game room:', error);
      setConnectionState('error');
    }
  }, []);

  const sendMove = useCallback((targetX: number, targetY: number) => {
    if (room && localPlayer) {
      room.send('move', { targetX, targetY });
    }
  }, [room, localPlayer]);

  const sendSplit = useCallback(() => {
    if (room && localPlayer) {
      room.send('split');
    }
  }, [room, localPlayer]);

  const sendSpit = useCallback((targetX: number, targetY: number) => {
    if (room && localPlayer) {
      room.send('spit', { targetX, targetY });
    }
  }, [room, localPlayer]);

  useEffect(() => {
    connect();
    return () => {
      if (room) {
        room.leave();
      }
    };
  }, [connect]);

  return {
    room,
    gameState,
    localPlayer,
    connectionState,
    sendMove,
    sendSplit,
    sendSpit,
    reconnect: connect
  };
};
```

### Best Practices & Optimization

#### 1. State Management
- **Use Colyseus Schema**: Automatic serialization and delta compression
- **Minimal State**: Only store essential game state on server
- **Client Prediction**: Predict movement locally, reconcile with server
- **Interpolation**: Smooth movement between server updates

#### 2. Performance Optimization
```typescript
// Server-side spatial partitioning for collision detection
class SpatialGrid {
  private grid: Map<string, Set<string>> = new Map();
  private cellSize: number = 100;

  insert(id: string, x: number, y: number) {
    const key = this.getGridKey(x, y);
    if (!this.grid.has(key)) {
      this.grid.set(key, new Set());
    }
    this.grid.get(key)!.add(id);
  }

  getNearby(x: number, y: number): string[] {
    const nearby: string[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = this.getGridKey(x + dx * this.cellSize, y + dy * this.cellSize);
        const cell = this.grid.get(key);
        if (cell) {
          nearby.push(...Array.from(cell));
        }
      }
    }
    return nearby;
  }
}
```

#### 3. Network Optimization
- **Message Batching**: Combine multiple inputs into single message
- **Rate Limiting**: Prevent spam with cooldowns
- **Delta Updates**: Only send changed properties
- **Area of Interest**: Only send relevant updates to each client

#### 4. Error Handling & Reconnection
```typescript
// Client-side reconnection logic
const handleReconnection = async () => {
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    try {
      await connect();
      break;
    } catch (error) {
      attempts++;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
    }
  }
};
```

#### 5. Scaling Considerations
- **Horizontal Scaling**: Multiple Colyseus processes with load balancer
- **Room Lifecycle**: Automatic room cleanup and garbage collection
- **Database Integration**: Persist player stats and game results
- **Monitoring**: Use Colyseus monitoring tools for performance tracking

## 📊 Success Metrics

- **Performance**: 60 FPS on mobile devices
- **Latency**: <100ms for player actions
- **Capacity**: Support 12 concurrent players per game
- **Reliability**: 99.5% uptime
- **User Experience**: <3 second game join time

## 🚀 Future Enhancements (Post-Launch)

- **Customization**: Player skins and themes
- **Power-ups**: Temporary abilities and bonuses
- **Tournaments**: Ranked play and leaderboards
- **Social Features**: Friend system and private lobbies
- **Analytics**: Player behavior tracking and game balance
- **Mobile App**: Native iOS/Android versions

## 📋 Risk Assessment

**High Risk**:
- Real-time multiplayer synchronization complexity
- Mobile performance optimization challenges
- Network latency affecting gameplay fairness
- Colyseus server scaling and room management

**Medium Risk**:
- Cross-browser compatibility issues
- Scaling server infrastructure
- Game balance and player retention
- WebSocket connection reliability on mobile networks

**Colyseus-Specific Risks**:
- Room state synchronization lag
- Client-side prediction accuracy
- Server-side performance with 12+ concurrent players
- Message ordering and reliability

**Mitigation Strategies**:
- Prototype core multiplayer features with Colyseus early
- Implement comprehensive testing framework for room states
- Use Colyseus monitoring dashboard for performance tracking
- Plan for horizontal scaling with multiple Colyseus processes
- Regular playtesting and feedback incorporation
- Implement graceful degradation for poor network conditions

---

**Total Estimated Timeline**: 21 weeks
**Team Size Recommendation**: 2-3 developers + 1 designer
**Budget Considerations**: Server costs, mobile testing devices, analytics tools
