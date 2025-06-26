# Battle Circles

A multiplayer 2D webapp game where players compete to eat each other and become the last circle standing.

![Battle Circles](https://img.shields.io/badge/Game-Battle%20Circles-blue)
![React](https://img.shields.io/badge/React-18.2.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2.2-blue)
![PIXI.js](https://img.shields.io/badge/PIXI.js-7.3.2-green)

## 🎮 Game Overview

**Battle Circles** is a fast-paced multiplayer battle royale game where players control circles that grow by eating smaller opponents and collectibles. The last circle standing wins!

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

- Node.js (18.0.0 or higher)
- npm (9.0.0 or higher)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd diov
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking
- `npm test` - Run tests

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