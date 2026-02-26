# Battle Circles

A multiplayer 2D webapp game where players compete to eat each other and become the last circle standing.

![Battle Circles](https://img.shields.io/badge/Game-Battle%20Circles-blue)
![React](https://img.shields.io/badge/React-18.2.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2.2-blue)
![PIXI.js](https://img.shields.io/badge/PIXI.js-7.3.2-green)

## 🎮 Game Overview

**Battle Circles** is a fast-paced multiplayer battle royale game where players control circles that grow by eating smaller opponents and collectibles. The last circle standing wins!

## High-level Architecture

```txt
┌───────────────────────┐
│  Front‑end (React +   │
│  PIXI, socket.io‑cli) │
└───────▲───────────────┘
        │ websocket   ▲
        │             │
┌───────▼───────────────┐  ┌───────────────────────┐
│  HTTP/WS Server (Node) │  │   Database Layer       │
│    Express + Socket.io │  │   ┌─────────────────┐ │
│  • Matchmaking         │  │   │ PostgreSQL       │ │
│  • Room Manager        │  │   │ (user stats)    │ │
│  • Game Engine         │  │   └─────────────────┘ │
│  • Redis Pub/Sub       │  │   ┌─────────────────┐ │
│  • Auth / Rate‑limit   │  │   │ Redis (state)    │ │
└───────▲───────────────┘  └───────────────────────┘
        │             ▲
        │ websocket   │
        ▼             │
  ┌─────────────────────┐
  │  Docker/K8s (optional) │
  └─────────────────────┘
```

- Authoritative server – Only the back‑end decides who wins and updates the world.
- Room‑based – Each game is a sandbox; when a room ends, its state can be archived.
- Horizontal scaling – If you need more capacity, spin up another server and use Redis Pub/Sub to keep rooms in sync (or use a dedicated “room host” per instance).
- Persistence – PostgreSQL for long‑term stats; Redis for the hot, mutable game state.

### Core Features

- **Multiplayer Action**: 5-12 players per match
- **Fast-Paced Rounds**: 5-minute time limit
- **Size-Based Combat**: Eat smaller players to grow
- **Dynamic Map**: Shrinking boundaries force confrontation
- **Special Abilities**: Split and spit mechanics
- **Mobile-First**: Optimized for landscape mobile gameplay

### Game Mechanics

- Move with virtual joystick (left side of screen)
- Eat players smaller than you to grow
- Collect knibbles (food) that spawn randomly
- Use split button to divide into multiple pieces
- Use spit button to lose size and gain speed
- Avoid the shrinking map boundaries
- Survive until you're the last one standing!

## 🚀 Quick Start

### Prerequisites

- Node.js (20.0.0 or higher)
- pnpm (9.0.0 or higher)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd diov
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Start the development server**
   ```bash
   pnpm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

## 🛠️ Development

### Available Scripts

- `pnpm run dev` - Start development server
- `pnpm run build` - Build for production
- `pnpm run preview` - Preview production build
- `pnpm run lint` - Run ESLint
- `pnpm run lint:fix` - Fix ESLint issues
- `pnpm run format` - Format code with Prettier
- `pnpm run type-check` - Run TypeScript type checking
- `pnpm test` - Run tests

### Project Structure

```
diov/
├── src/
│   ├── components/          # React components
│   │   ├── game/           # Game-specific components
│   │   └── ui/             # Reusable UI components
│   ├── game/               # Game logic and systems
│   │   ├── entities/       # Game entities (Player, Knibble, etc.)
│   │   └── systems/        # Game systems (Physics, Rendering, etc.)
│   ├── hooks/              # Custom React hooks
│   ├── stores/             # State management (Zustand)
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Utility functions
│   └── assets/             # Static assets
├── public/                 # Public assets
└── index.html              # Entry HTML file
```

### Key Technologies

- **Frontend Framework**: React 18 with TypeScript
- **Game Engine**: PIXI.js with @pixi/react
- **State Management**: Zustand
- **Networking**: Socket.io
- **Build Tool**: Vite
- **Icons**: Lucide React
- **Styling**: CSS-in-JS with styled-jsx

## 🎯 Game Controls

### Mobile Controls (Landscape Mode Required)

- **Virtual Joystick** (Left): Move your circle
- **Split Button** (Right, Top): Split into multiple pieces
- **Spit Button** (Right, Bottom): Spit to lose size and gain speed
- **Pause Button** (Top, Left): Pause the game

### Desktop Controls (for testing)

- **Mouse**: Control virtual joystick
- **Keyboard**: Same button functionality

## 🏗️ Architecture

### Frontend Architecture

- **Component-Based**: Modular React components
- **State Management**: Centralized state with Zustand
- **Real-time Updates**: WebSocket communication
- **Game Rendering**: Hardware-accelerated PIXI.js
- **Mobile-First**: Responsive design with touch controls

### Game Systems

- **Entity System**: Players, Knibbles, SpitBlobs
- **Physics System**: Movement, collision detection
- **Networking**: Client prediction with server reconciliation
- **Camera System**: Smooth following with viewport management
- **Input System**: Touch and mouse input handling

## 🌐 Networking

The game uses WebSocket connections for real-time multiplayer functionality:

- **Connection Management**: Auto-reconnection with exponential backoff
- **Game State Sync**: Server-authoritative with client prediction
- **Latency Compensation**: Input prediction and reconciliation
- **Anti-Cheat**: Server-side validation of all game actions

## 📱 Mobile Optimization

- **Landscape Mode**: Enforced landscape orientation
- **Touch Controls**: Optimized virtual joystick and buttons
- **Performance**: 60 FPS target on mobile devices
- **Network**: Optimized for mobile networks
- **PWA Support**: Installable as Progressive Web App

## 🎨 Customization

### Adding New Player Colors

Edit `src/types/game.ts`:

```typescript
export const COLORS = {
  PLAYER_COLORS: [
    '#FF6B6B', // Add your colors here
    // ... existing colors
  ],
}
```

### Adjusting Game Balance

Edit `src/stores/GameStore.tsx`:

```typescript
const defaultGameConfig: GameConfig = {
  maxPlayers: 12,        // Maximum players per game
  minPlayers: 5,         // Minimum players to start
  gameDuration: 300000,  // Game length in milliseconds
  // ... other config options
}
```

## 🐛 Troubleshooting

### Common Issues

1. **Game won't load**
   - Check browser console for errors
   - Ensure you're using a modern browser
   - Clear browser cache and reload

2. **Connection issues**
   - Check network connectivity
   - Verify server is running (if using local server)
   - Check browser's developer tools for WebSocket errors

3. **Performance issues**
   - Close other applications
   - Ensure device has sufficient memory
   - Try reducing browser zoom level

4. **Touch controls not working**
   - Ensure device is in landscape mode
   - Check if touch events are being blocked
   - Try refreshing the page

### Browser Compatibility

- **Chrome**: 90+ (Recommended)
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+

## 📈 Performance Optimization

### Rendering Performance

- Object pooling for game entities
- Spatial partitioning for collision detection
- Viewport culling for off-screen objects
- Frame rate monitoring and adjustment

### Network Performance

- Message batching and compression
- Delta compression for state updates
- Bandwidth monitoring
- Mobile network optimization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript strict mode
- Use ESLint and Prettier for code formatting
- Write unit tests for new features
- Ensure mobile compatibility
- Test on multiple devices and browsers

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎊 Acknowledgments

- **PIXI.js** - Amazing 2D rendering engine
- **React** - Fantastic UI framework
- **Socket.io** - Real-time communication
- **Lucide** - Beautiful icons
- **Zustand** - Simple state management

## 🔮 Future Roadmap

See [ROADMAP.md](ROADMAP.md) for detailed development phases and upcoming features.

### Planned Features

- [ ] Player customization (skins, themes)
- [ ] Power-ups and special abilities
- [ ] Tournaments and ranked play
- [ ] Social features (friends, private lobbies)
- [ ] Native mobile apps
- [ ] Spectator mode
- [ ] Replay system
- [ ] Analytics and player statistics

---

**Ready to battle?** Start the game and become the ultimate circle champion! 🏆


## Other Concept Ideas


1. **Blob Royale**

Theme: Colorful goo creatures in a fast-paced shrinking arena
Key Mechanics Differences:
-	Sticky Trails: As players move, they leave behind a sticky trail for 3 seconds. Others slow down if they cross it, allowing ambushes.
-	Combo Bites: Eating two players within 10 seconds triggers a "combo" that gives a short speed boost.
-	Power Blob Events: Every 30 seconds, a super-knibble spawns and grants temporary invincibility (can't be eaten but can eat anyone smaller).

Casual Appeal: Chaotic fun with visual feedback and low skill floor; more forgiving and flashy.

2. **Nibble Rush**

Theme: Candy-like world where you munch to grow
Key Mechanics Differences:
- Boost Zones: Certain areas on the map give players a temporary speed boost if passed over.
- Shrink Bombs: A third button allows you to drop a "shrink bomb" that slightly shrinks everyone in range, including yourself (use strategically).
- Knibble Types: Some knibbles explode, some shrink you slightly, some give double size. Adds casual risk-reward decision making.

Casual Appeal: Whimsical, unpredictable, quick rounds with low punishment.

3. **Circle Splitz**

Theme: Geometric minimalism with arcade flair
Key Mechanics Differences:
- Chain Split Mechanic: You can split more than once in succession, creating up to 20 micro-circles. Perfect control yields big rewards, while poor control leads to chaos.
- Merge Timer: After splitting, players can only merge again after 10 seconds (forces strategy).
- Mirror Clone Power-Up: Occasionally clones your circle for 10 seconds—confuses opponents as both can eat, but only one is real.

Casual Appeal: Tactile, strategic, but visually minimal for players who enjoy clever plays and deception.

## Research TODO

- [Colyseus](https://github.com/colyseus/colyseus) - Typescript
- nengi.js
- Nodecraft or Heroic Cloud
