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

#### Backend Services
- [ ] **Real-time Communication**
  - WebSocket server setup (Socket.io or native WebSockets)
  - Player connection management
  - Game state synchronization
  - Client-side prediction and reconciliation

- [ ] **Game Session Management**
  - Lobby/waiting room system
  - Player matchmaking (minimum 5 players)
  - Game state machine (waiting → playing → finished)
  - Session cleanup and reconnection handling

#### Networking
- [ ] **Message Protocol**
  - Define game message types (movement, actions, state updates)
  - Implement message validation and sanitization
  - Handle network latency and packet loss
  - Anti-cheat basic validation

### Phase 3: Core Gameplay Features (Weeks 7-10)

#### Eating Mechanics
- [ ] **Player vs Player Combat**
  - Size comparison system
  - Eating collision detection
  - Player elimination and scoring
  - Same-size collision (bouncing)

- [ ] **Knibbles System**
  - Random spawn algorithm (5-10 second intervals)
  - Knibbles collision and consumption
  - Size growth calculation
  - Visual feedback for eating

#### Map Dynamics
- [ ] **Shrinking Boundaries**
  - Progressive map size reduction algorithm
  - Smooth boundary animation
  - Player damage/elimination outside boundaries
  - Visual warnings and indicators

#### Special Abilities
- [ ] **Split Mechanism**
  - Random split count (4-10 pieces)
  - Multi-circle movement synchronization
  - Attraction/merging system when circles are close
  - Size conservation calculations

- [ ] **Spit Ability**
  - Blue circle projectile system
  - 20-second despawn timer
  - Consumption mechanics (self and others)
  - Size reduction on use

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

- [ ] **Network Optimization**
  - Message compression and batching
  - Delta compression for state updates
  - Bandwidth monitoring and adjustment
  - Mobile network optimization

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

**Frontend**: React + TypeScript + Vite
**Styling**: CSS Modules or Styled Components
**Icons**: Lucide React
**Real-time**: Socket.io or native WebSockets
**Backend**: Node.js + Express or FastAPI
**Database**: Redis for sessions, PostgreSQL for persistence
**Deployment**: Docker + cloud platform (AWS/GCP/Vercel)

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

**Medium Risk**:
- Cross-browser compatibility issues
- Scaling server infrastructure
- Game balance and player retention

**Mitigation Strategies**:
- Prototype core multiplayer features early
- Implement comprehensive testing framework
- Plan for gradual user base scaling
- Regular playtesting and feedback incorporation

---

**Total Estimated Timeline**: 21 weeks
**Team Size Recommendation**: 2-3 developers + 1 designer
**Budget Considerations**: Server costs, mobile testing devices, analytics tools
