# Tailwind v4 Migration — Battle Circles

> **Status**: Tailwind v4 installed and wired. Theme tokens defined in `src/index.css`.
> Migration of individual components has **not** started yet.
> Work through this document component by component, ticking off items as you go.

---

## Setup recap

### What's done

- `tailwindcss` + `@tailwindcss/vite` added to `package.json` (workspace root, `-w`)
- `@tailwindcss/vite` plugin added to `vite.config.ts`
- `@import 'tailwindcss'` added at the top of `src/index.css`
- `@theme { ... }` block added to `src/index.css` — all game brand colours, glass
  surfaces, border radii, backdrop blurs, and z-index values are now CSS custom
  properties that Tailwind can generate utility classes from

### What Tailwind v4 does differently from v3
| v3 | v4 |
|---|---|
| `tailwind.config.js` required | No config file — theme lives in `@theme {}` in CSS |
| `@tailwind base/components/utilities` directives | Single `@import 'tailwindcss'` |
| `bg-[#ff6b6b]` arbitrary values | Arbitrary values still work, but prefer `@theme` tokens |
| `theme()` function in CSS | Use `var(--color-*)` CSS custom properties directly |
| Plugin via `postcss.config.js` | Plugin via `@tailwindcss/vite` in `vite.config.ts` |

---

## Migration strategy

Each component has **three layers** of CSS to deal with:

1. **Global classes** defined in `src/index.css` (`.btn`, `.menu`, `.loading`, `.fade-in`,
   `.progress-bar`, etc.) — used across multiple components.
2. **Component-scoped `<style>` blocks** — each component has its own `<style>` tag at
   the bottom of its JSX.
3. **Inline `style={{}}` props** — used for runtime-dynamic values (colours from game
   state, pixel positions derived from player position, etc.).

### Rules
- Replace static, non-dynamic CSS with Tailwind utility classes on the element.
- Keep `<style>` blocks **only** for:
  - Pseudo-elements (`::before`, `::after`) — Tailwind cannot target these inline.
  - Complex animations (`@keyframes`) — keep in `<style>` or extract to `index.css`.
  - CSS custom property consumption inside media queries.
- Keep inline `style={{}}` for runtime-dynamic values that change per frame or per
  player (colours from `player.color`, pixel positions, sizes).
- Once a component's `<style>` block is emptied out, delete the `<style>` tag entirely.
- Once a global class in `index.css` is no longer referenced anywhere, delete it.

### Order of migration (least complex → most complex)
1. `ActionButtons.tsx` — pure static layout, no dynamic values in styles
2. `VirtualJoystick.tsx` — one dynamic class (`.pulsing`), otherwise static
3. `GameOverScreen.tsx` — static layout, scrollable leaderboard
4. `HomePage.tsx` — static layout with inline styles for connection status colour
5. `WaitingRoom.tsx` — static layout, one dynamic inline style for progress bar width
6. `GameHUD.tsx` — CSS custom property (`--dot-color`), size-circle inline styles
7. `GamePage.tsx` — PIXI canvas wrapper, mostly structural

---

## Global classes in `src/index.css`

These classes are used by multiple components. Migrate the global class last —
only after every component that uses it has been converted to utilities.

| Class | Used in | Migration |
|---|---|---|
| `.btn` | `WaitingRoom`, `GamePage`, `GameOverScreen`, `HomePage` | Keep as `@layer components` shorthand or replace with a `cn()` helper |
| `.btn-primary` | Same as above | Extends `.btn` |
| `.btn-secondary` | `WaitingRoom`, `GamePage` | Extends `.btn` |
| `.loading` | `GamePage`, `HomePage` | Convert to Tailwind `animate-spin` |
| `.progress-bar` / `.progress-fill` | `WaitingRoom` | Replace inline |
| `.fade-in` | `GameOverScreen`, `WaitingRoom`, `HomePage` | Keep as `@keyframes` in `index.css`, or use `animate-[fadeIn_0.5s_ease-out]` |
| `.pulse` | `WaitingRoom` countdown number | Keep as `animate-pulse` or custom keyframe |
| `.menu` | `HomePage` | Replace with Tailwind on the element |
| `.control-button` | `GamePage` | Replace with Tailwind on the element |
| `.ui-overlay` | `GamePage` | Replace with Tailwind on the element |
| `.portrait-warning` | `App.tsx` | Replace with Tailwind on the element |

### Recommended: convert `.btn` to `@layer components`

Rather than sprinkling 8 utility classes on every button, define it once:

```src/index.css
@layer components {
  .btn {
    @apply inline-flex items-center justify-center gap-2.5
           min-w-[120px] px-[30px] py-[15px] rounded-[--radius-btn]
           text-base font-semibold text-white cursor-pointer
           transition-all duration-300 select-none
           bg-gradient-to-br from-[--color-ui-primary] to-[--color-accent-purple];
  }
  .btn:hover {
    @apply -translate-y-0.5 shadow-[0_8px_25px_rgba(102,126,234,0.4)];
  }
  .btn:active  { @apply translate-y-0; }
  .btn:disabled { @apply opacity-50 cursor-not-allowed translate-y-0 shadow-none; }

  .btn-primary {
    @apply bg-gradient-to-br from-[--color-accent-red] to-[#ee5a52];
  }
  .btn-primary:hover {
    @apply shadow-[0_8px_25px_rgba(255,107,107,0.4)];
  }

  .btn-secondary {
    @apply bg-transparent border-2 border-[--color-border-lit]
           shadow-none;
  }
  .btn-secondary:hover {
    @apply bg-white/10 shadow-[0_8px_25px_rgba(255,255,255,0.2)];
  }
}
```

---

## Component migration plans

### 1. `ActionButtons.tsx`

**Complexity**: Low — no dynamic CSS, no pseudo-elements that need JS values.

The `<style>` block can be fully deleted. The only pseudo-element rules
(`::before`, `::after`) are purely decorative CSS and can live in a small
`@layer components` block in `index.css` if needed, or be dropped (they add
tooltip labels and glow rings that are not core to the UI).

#### Wrapper
```
Before: <div className='action-buttons'>
After:  <div className='absolute right-5 bottom-5 flex flex-col gap-[15px] z-[15] pointer-events-auto'>
```

#### Each button
```
Before: className={`action-button split-button ${disabled ? 'disabled' : ''}`}
After:  className={clsx(
          'relative overflow-hidden',
          'w-[70px] h-[70px] rounded-full',
          'border-[3px] border-[rgba(255,107,107,0.5)]',
          'bg-[--color-glass-sm] backdrop-blur-[15px]',
          'flex items-center justify-center',
          'text-white cursor-pointer',
          'shadow-[0_4px_20px_rgba(0,0,0,0.3)]',
          'transition-all duration-200 select-none',
          'active:scale-95',
          disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
        )}
```

**What to keep in `<style>` after migration**: nothing — delete the block.

---

### 2. `VirtualJoystick.tsx`

**Complexity**: Low-medium. The `.pulsing` animation keyframe must stay in CSS.
The `isActive` flag is already handled via the `.joystick-glow` sibling div's
inline `style={{ opacity }}` and the `.active` class on the knob.

#### Container
```
Before: <div className='joystick-container' ref={ref}>
After:  <div className='absolute left-5 bottom-5 w-[120px] h-[120px] z-[15] pointer-events-auto' ref={ref}>
```

#### Joystick area
```
Before: <div className='joystick-area' ...>
After:  <div className='relative w-full h-full flex items-center justify-center touch-none select-none' ...>
```

#### Base
```
Before: <div className='joystick-base'>
After:  <div className='relative w-[100px] h-[100px] rounded-full
                         bg-black/40 border-[3px] border-white/30
                         backdrop-blur-[10px] flex items-center justify-center
                         shadow-[0_4px_20px_rgba(0,0,0,0.3)]
                         active:scale-[0.98]'>
```

#### Knob
```
Before: className={`joystick-knob ${isActive ? 'active' : ''} ${magnitude > 0.8 ? 'pulsing' : ''}`}
After:  className={clsx(
          'absolute w-[45px] h-[45px] rounded-full',
          'bg-white/90 border-2 border-white/50',
          'shadow-[0_2px_10px_rgba(0,0,0,0.4)]',
          isActive && 'bg-white border-[rgba(102,126,234,0.8)] shadow-[0_2px_15px_rgba(0,0,0,0.5)]',
          magnitude > 0.8 && 'pulsing',   // keyframe stays in <style>
        )}
```

**What to keep in `<style>` after migration**:
```css
.pulsing {
  animation: joystick-pulse 0.5s ease-in-out infinite alternate;
}
@keyframes joystick-pulse {
  from { scale: 1; }
  to   { scale: 1.1; }
}
```

---

### 3. `GameOverScreen.tsx`

**Complexity**: Medium — static layout with a scrollable leaderboard.
No runtime JS values in CSS. `<style>` block can be fully deleted.

Key mappings:

| Current class | Tailwind replacement |
|---|---|
| `.game-over-screen` | `absolute inset-0 flex items-center justify-center z-[100] bg-black/95 backdrop-blur-[20px]` |
| `.game-over-content` | `bg-black/80 rounded-[--radius-card] p-10 border border-[--color-border-dim] max-w-[600px] max-h-[90vh] overflow-y-auto text-center backdrop-blur-[20px]` |
| `.result-header` | `mb-[30px]` |
| `.stat-card` | `flex items-center gap-3 p-[15px] bg-white/5 rounded-xl border border-[--color-border-dim]` |
| `.stat-value` | `text-2xl font-bold text-white leading-none` |
| `.stat-label` | `text-[0.85em] text-white/60 mt-0.5` |
| `.leaderboard` | `bg-white/5 rounded-[15px] p-5 border border-[--color-border-dim]` |
| `.leaderboard-list` | `flex flex-col gap-2 max-h-[200px] overflow-y-auto` |
| `.leaderboard-item` | `flex items-center gap-3 px-3 py-2 bg-white/[0.03] rounded-lg` |
| `.leaderboard-item.current-player` | additional `bg-[rgba(78,205,196,0.1)] border border-[rgba(78,205,196,0.3)]` |
| `.avatar-circle` | `w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm` |
| `.you-indicator` | `text-[--color-accent-teal] text-xs font-normal` |
| `.action-buttons` | `flex justify-center gap-[15px]` |

**What to keep in `<style>` after migration**: nothing — delete the block.

---

### 4. `HomePage.tsx`

**Complexity**: Medium. The gradient logo text uses `-webkit-background-clip` which
has no Tailwind equivalent — keep as a one-off `<style>` rule or a utility class.
All `alert()` calls have already been replaced with the `joinError` banner.

Key mappings:

| Current class | Tailwind replacement |
|---|---|
| `.home-page` | `w-screen h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_center,#1a1a2e_0%,#16213e_35%,#0f0f23_100%)]` |
| `.menu` (global) | `relative bg-black/80 rounded-[--radius-card] p-10 backdrop-blur-[20px] border border-[--color-border-dim] min-w-[400px] text-center` + `animate-[fadeIn_0.5s_ease-out]` |
| `.game-logo h1` gradient | Keep 3-line `<style>` rule for `-webkit-background-clip: text` |
| `.info-grid` | `grid grid-cols-2 gap-5 mb-[30px]` |
| `.info-item` | `flex items-center gap-[15px] p-[15px] bg-white/5 rounded-[15px] border border-[--color-border-dim]` |
| `.game-rules` | `bg-white/5 rounded-[15px] p-5 border border-[--color-border-dim]` |
| `input` styles | Already inline — convert to Tailwind utility classes directly on `<input>` |

**What to keep in `<style>` after migration**:
```css
/* Gradient text — no Tailwind equivalent */
.game-logo h1 {
  background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

---

### 5. `WaitingRoom.tsx`

**Complexity**: Medium. The progress bar width is a runtime value (inline style) — keep it.
Everything else is static.

Key mappings:

| Current class | Tailwind replacement |
|---|---|
| `.waiting-room` | `w-screen h-screen flex items-center justify-center bg-[radial-gradient(...)]` |
| `.countdown-screen` | additional `items-center justify-center` (already on parent) |
| `.countdown-number` | `text-[8em] font-bold text-[--color-accent-red] my-5 [text-shadow:0_0_30px_rgba(255,107,107,0.5)]` + `animate-pulse` |
| `.waiting-room-container` | `bg-black/80 rounded-[--radius-card] p-[30px] backdrop-blur-[20px] border border-[--color-border-dim] min-w-[600px] max-w-[800px] max-h-[90vh] overflow-y-auto` + `animate-[fadeIn_0.5s_ease-out]` |
| `.room-header` | `flex justify-between items-center mb-[30px] pb-5 border-b border-[--color-border-dim]` |
| `.status-card` | `flex items-center justify-center gap-5 bg-white/5 rounded-[15px] p-5 border border-[--color-border-dim] mb-5` |
| `.progress-bar` (global) | `w-full h-2 bg-white/10 rounded overflow-hidden my-2.5` |
| `.progress-fill` (global) | `h-full bg-gradient-to-r from-[--color-accent-red] to-[--color-accent-teal] rounded transition-[width_0.3s_ease]` (width stays inline) |
| `.player-item` | `flex items-center gap-[15px] p-3 bg-white/5 rounded-[10px] border border-[--color-border-dim] transition-all duration-200` |
| `.empty-slot` | additional `opacity-50` |
| `.avatar-circle` | `w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base` |
| `.info-card` | `flex items-center gap-3 p-[15px] bg-white/5 rounded-[10px] border border-[--color-border-dim]` |

**What to keep in `<style>` after migration**: nothing — delete the block.

---

### 6. `GameHUD.tsx`

**Complexity**: Medium-high. Two things require special handling:

1. **`--dot-color` CSS custom property** on `.hud-item.time::before` — keep a
   minimal `<style>` block for the `::before` rule only; the `--dot-color` variable
   continues to be set via the inline `style` prop already in place.
2. **`size-circle`** dimensions come from `localPlayer.size` at runtime — keep inline.

Key mappings:

| Current class | Tailwind replacement |
|---|---|
| `.game-hud` | `absolute top-0 left-0 w-full pointer-events-none z-[10]` |
| `.hud-container` | `absolute top-5 left-1/2 -translate-x-1/2 flex gap-[15px] items-center bg-black/40 px-5 py-3 rounded-[25px] backdrop-blur-[15px] border border-[--color-border-dim] shadow-[0_4px_20px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]` |
| `.hud-item` | `flex items-center gap-1.5 text-white text-sm font-semibold whitespace-nowrap` |
| `.hud-item.warning` | additional `text-[--color-accent-red] animate-pulse` |
| `.hud-value` | `text-white font-bold [text-shadow:0_1px_2px_rgba(0,0,0,0.5)] transition-colors duration-200` |
| `.rank .hud-value` | additional `text-[--color-accent-teal]` |
| `.players .hud-value` | additional `text-[--color-accent-yellow]` |
| `.latency` | additional `text-xs opacity-80` |
| `.minimap` | `absolute top-5 right-5` |
| `.minimap-container` | `bg-black/40 rounded-lg p-2 backdrop-blur-[10px] border border-[--color-border-dim]` |
| `.size-circle` | `rounded-full border-2 border-white/80 shadow-[0_0_4px_rgba(0,0,0,0.3)] transition-all duration-200` (w/h stay inline) |

**What to keep in `<style>` after migration**:
```css
/* Dot indicator — driven by --dot-color CSS var set via inline style prop */
.hud-item.time { position: relative; }
.hud-item.time::before {
  content: '';
  position: absolute;
  left: -8px; top: 50%;
  transform: translateY(-50%);
  width: 3px; height: 3px;
  border-radius: 50%;
  background: var(--dot-color, #4ecdc4);
  box-shadow: 0 0 6px var(--dot-color, #4ecdc4);
}
```

---

### 7. `GamePage.tsx`

**Complexity**: Low for the structural wrapper; PIXI canvas is untouched.
The PIXI `<Stage>` fills the full viewport and has no CSS — only the HTML overlay
shell needs migration.

Key mappings:

| Current class | Tailwind replacement |
|---|---|
| `.game-page` | `relative w-screen h-screen overflow-hidden bg-[#0F0F23]` |
| `.game-loading` | `w-screen h-screen flex items-center justify-center bg-[#0F0F23] text-white` |
| `.loading-content` | `text-center flex flex-col items-center gap-5` |
| `.ui-overlay` (global) | `absolute inset-0 pointer-events-none z-[10] [&>*]:pointer-events-auto` |
| `.top-controls` | `absolute top-5 left-5 z-[20]` |
| `.control-button` (global) | `w-[70px] h-[70px] rounded-full border-[3px] border-white/30 bg-black/40 backdrop-blur-[10px] flex items-center justify-center cursor-pointer transition-all duration-200 text-white hover:bg-white/10 hover:border-white/50 hover:scale-105 active:scale-95 active:bg-white/20` |
| `.pause-menu` | `absolute inset-0 flex items-center justify-center bg-black/80 z-[100] backdrop-blur-[10px]` |
| `.pause-content` | `bg-black/90 rounded-[--radius-card] p-10 text-center border border-[--color-border-dim]` |
| `.pause-buttons` | `flex flex-col gap-[15px] min-w-[200px]` |

**What to keep in `<style>` after migration**: nothing — delete the block.

---

## Utility helpers to add

### `cn()` helper — `src/utils/cn.ts`

`clsx` is already installed. Add a tiny re-export that pairs it with
Tailwind's merge logic (handles conflicting utilities like `p-2 p-4`):

```typescript
// src/utils/cn.ts
import { clsx, type ClassValue } from 'clsx'

/** Merge Tailwind classes safely. Resolves conflicts (last wins). */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}
```

> Note: if class conflicts become a real issue, add `tailwind-merge` and wrap:
> `import { twMerge } from 'tailwind-merge'`
> `return twMerge(clsx(inputs))`

---

## Custom animations to keep in `index.css`

These cannot be expressed as inline Tailwind utilities and must live in CSS:

```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* .pulse is already Tailwind's built-in animate-pulse — can be deleted */
/* .fade-in can become animate-[fadeIn_0.5s_ease-out] */
/* .loading can become animate-spin w-5 h-5 border-2 ... rounded-full border-t-white */
```

---

## Checklist

### Installation
- [x] `tailwindcss` + `@tailwindcss/vite` installed
- [x] Plugin added to `vite.config.ts`
- [x] `@import 'tailwindcss'` added to `src/index.css`
- [x] `@theme {}` token block added to `src/index.css`

### Global cleanup (do after all components are migrated)
- [x] Convert `.btn` / `.btn-primary` / `.btn-secondary` to `@layer components` in `index.css`
- [x] Replace `.loading` with `animate-spin` Tailwind classes in-place
- [x] Delete `.text-center`, `.mb-4`, `.mt-4`, `.flex`, `.flex-col`, `.items-center`,
      `.justify-center`, `.gap-4`, `.w-full`, `.h-full` from `index.css`
- [x] Delete `.ui-overlay`, `.menu`, `.control-button`, `.control-buttons`,
      `.portrait-warning`, `.game-canvas` once no component references them

### Components
- [x] `ActionButtons.tsx` — replace `<style>` block, apply utilities
- [x] `VirtualJoystick.tsx` — replace `<style>` block, keep `.pulsing` keyframe
- [x] `GameOverScreen.tsx` — replace `<style>` block, apply utilities
- [x] `HomePage.tsx` — replace `<style>` block, keep gradient-text rule
- [x] `WaitingRoom.tsx` — replace `<style>` block, apply utilities
- [x] `GameHUD.tsx` — replace `<style>` block, keep `::before` dot rule
- [x] `GamePage.tsx` — replace `<style>` block, apply utilities

### Add `cn()` helper
- [x] Create `src/utils/cn.ts`

### Final validation
- [x] `pnpm type-check` passes
- [x] `pnpm build` produces no CSS warnings
- [ ] All seven components render correctly in the browser at 1080p landscape
- [ ] All seven components render correctly on a 375 × 667 mobile viewport (rotated to landscape)
- [x] No `<style>` tags remain except documented exceptions:
      `GameHUD.tsx` (dot `::before`), `HomePage.tsx` (gradient text), `VirtualJoystick.tsx` (keyframe + `::after`)
- [x] `src/index.css` contains only: `@import`, `@theme`, global reset, `@layer components`
      (`.btn` etc.), and the two animation `@keyframes`
