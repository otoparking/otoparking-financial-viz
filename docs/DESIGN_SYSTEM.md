# OtoParking Test Center — Design System & AI Agent Design DNA

> This document is the authoritative design framework for all frontend generation in this codebase.
> It is written to be consumed by AI agents as a skill. Every rule here is derived from what was
> actually built, refined through iteration, and validated visually. Follow it precisely.

---

## 1. Philosophy

This is an **internal developer tool**, not a consumer product. The design language reflects that:
it is dense, technical, monospaced-forward, and information-rich — but never ugly or cluttered.
Every component earns its space. Every visual element communicates state.

The guiding principle is **honest surfaces**: cards look like cards, not billboards. Color is a
signal, not decoration. Animation tells you something is happening, not just that it can animate.

Three words that define every design decision:

- **Precise** — tight spacing, sharp typographic hierarchy, nothing ambiguous
- **Alive** — the UI breathes with the system state it visualizes
- **Invisible** — the design recedes so the data is what you see

---

## 2. Layout Architecture

### 2.1 Shell Structure

Every module follows the same three-region layout:

```
┌──────────────────────────────────────────────────────────┐
│ Global Shell Header                               52px    │
├──────────────────────────────────────────────────────────┤
│ Module Sidebar (60px) │ Canvas (65%) │ Panel (35%)       │
│                       │              │                    │
│                       │   Primary    │   Control &        │
│                       │   Visual     │   Configuration    │
│                       │   Surface    │                    │
└──────────────────────────────────────────────────────────┘
```

- **Canvas (left 65%)**: the visualization surface. This is where the system state lives visually.
  It does not scroll. It has a fixed header bar (44px) and uses the remaining space.
- **Panel (right 35%)**: the control surface. This scrolls. It contains triggers, configuration,
  and a running event log. Minimum width: 360px.
- The split is a hard CSS percentage. No resizing handles.

### 2.2 Canvas Internal Layout

Canvases are always a flex column:

```
┌────────────────────────────────┐
│ Canvas Header Bar     44px     │  — status, title, live badge
├────────────────────────────────┤
│                                │
│   Primary Visualization        │  — flex-1, min-height 0
│   (ReactFlow / SVG / DOM)      │
│                                │
├────────────────────────────────┤
│ Context / Detail Panel  ~160px │  — payload, state summary, etc.
└────────────────────────────────┘
```

The middle zone is always `flex: 1, minHeight: 0` so it fills without overflowing.
The bottom context panel is optional but fixed-height when present.

### 2.3 Panel Internal Layout

Panels are always a flex column:

```
┌────────────────────────────────┐
│ Panel Header Bar      40px     │  — title, reset button (OUTSIDE scroll)
├────────────────────────────────┤
│ ScrollArea (flex-1)            │
│   — Reference strip            │
│   — Filter chips               │
│   — Action cards (list)        │
│   ── divider ──────────────    │
│   — Event log header           │
│   — Log entries                │
└────────────────────────────────┘
```

The header bar **never scrolls away**. It is `flexShrink: 0` above the `ScrollArea`.
The event log lives at the bottom of the scrollable content, separated by a subtle divider.

---

## 3. Typography

### 3.1 Two-Font System

This design uses exactly two font categories:

| Role | Font | Where |
|---|---|---|
| **Data / Labels / Code** | `monospace` | All metadata, badges, chips, timestamps, IDs, event names, headers |
| **Prose / Description** | `system-ui, sans-serif` | Description text in cards, detail text in logs |

Never use a third font. If something is a label, it is monospace. If it tells a story, it is system-ui.

### 3.2 Type Scale

The scale is tight. Developer tools live at small sizes because they show more:

| Use | Size | Weight | Tracking |
|---|---|---|---|
| Section header label | 9px | 700 | 0.12em |
| Card name / title | 10.5–11px | 600 | 0 |
| Badge / chip text | 7.5–8px | 700 | 0.04–0.08em |
| Description / detail | 9–9.5px | 400 | 0 |
| Timestamp | 7.5px | 400 | 0 |
| Dim sub-label | 8px | 400 | 0.03em |
| Monospace input | 16–20px | 700 | 0.2–0.3em |

### 3.3 Text Hierarchy

Every text element belongs to one of four tiers:

1. **Primary** (`T.text`) — the main thing you read on a card
2. **Secondary** (`T.textMuted`) — supporting context, descriptions
3. **Tertiary** (`T.textDim`) — timestamps, sub-labels, placeholders
4. **Accent** (`T.accent`, semantic colors) — live state, active values, errors

Nothing should fight for attention. If you have two things at the same visual weight, one of them
is wrong.

### 3.4 Casing Rules

| Context | Casing |
|---|---|
| Section headers, badges, chip labels | UPPERCASE |
| Card names, scenario names | Title Case |
| Description text | Sentence case |
| Code / IDs / endpoints | As-is (no transformation) |
| Event types in logs | UPPERCASE |

---

## 4. Surface System

### 4.1 The Four Surfaces

Every background in the UI belongs to one of these:

| Surface | Token | Purpose |
|---|---|---|
| **Canvas** | `T.bg` | The page / canvas fill. The deepest layer. |
| **Card** | `T.card` | Any raised surface. Cards, panels, node boxes. |
| **Card Hover** | `T.cardHover` | Interactive card on hover / active state. |
| **Header** | `T.header` | The header bars (global shell, canvas header, panel header). |

**Rule**: Never invent a fifth surface. If you need differentiation, use border or box-shadow, not
a new background color.

### 4.2 The Surface Contract

Every card surface obeys this contract:

```
background: T.card
border: 1px solid T.border          ← default state
border-radius: 10–14px              ← depends on card size
box-shadow: subtle depth shadow     ← light: rgba(0,0,0,0.06), dark: rgba(0,0,0,0.2)
```

On hover (interactive cards):
```
background: T.cardHover
border-color: ${relevantColor}45
box-shadow: 0 2px 12px rgba(0,0,0,0.08)
```

On active/selected state:
```
border-color: ${relevantColor}
box-shadow: 0 0 0 1px ${relevantColor}22, 0 4px 20px ${relevantColor}18
```

**Critical rule**: Never use a colored tinted background (`${color}14`, `${color}0D`) as a card
surface. This makes cards look like chips and destroys the visual hierarchy. Color belongs in
borders, icons, text, and small indicator elements — not as a card's fill.

### 4.3 The Accent Stripe Pattern — Deprecated

The "3px left colored stripe" pattern on cards is legacy. Do not use it in new components.
Instead, communicate category/type through the **border-color** of the active card state.

---

## 5. Color Usage

### 5.1 Color is Signal, Not Style

Color communicates one of four things:

1. **System state** — active, idle, running, error, success
2. **Category / type** — which channel, which role, which module
3. **Semantic** — green=success, red=error, amber=warning, blue=information
4. **Accent** — the primary interactive color of the current theme

Never use color to make something "look nicer." Use it when it communicates something.

### 5.2 Semantic Color Map

| Signal | Color Token | When to use |
|---|---|---|
| Success / Active | `T.green` | OTP verified, login success, session active, delivered |
| Error / Failed | `T.red` | OTP failed, login failed, expired, error state |
| Warning / Pending | `T.amber` | Awaiting, refreshing, countdown, caution |
| Informational | `T.blue` | API calls, info events, send operations |
| Special / Auth | `T.purple` | OTP flow, auth operations, verification |
| Financial / Escrow | `T.escrow` | Held funds, escrow state |
| Primary Action | `T.accent` | The one interactive color — buttons, active borders, live badges |

### 5.3 Color Application Rules

**Icons**: Always match the semantic color. An active Push channel icon is `CHANNEL_COLORS.push`.
An idle icon is `T.textDim`.

**Borders**: Default `T.border`. Active state: the semantic/category color. Hover: category color
at 40–50% opacity.

**Background tints**: Acceptable ONLY for small pill/badge elements (`${color}14` or `${color}18`
bg). Never for full card surfaces.

**Text**: The primary label on an active card or badge uses the full semantic color. Supporting text
uses `T.textMuted`. Metadata uses `T.textDim`.

**Box shadows**: For glow effects on active elements, use `${color}18` to `${color}30` in the
shadow. Never full-opacity shadows. Pattern: `0 0 0 1px ${color}22, 0 4px 20px ${color}18`.

### 5.4 Light Mode Adjustments

Light mode does not mean "dark mode with everything flipped." Two specific rules:

1. Drop-shadows are real in light mode (`rgba(0,0,0,0.08)`), not colored glows
2. Semantic colors are darker in light mode (blue becomes `#1e5fb5` not `#378ADD`) — they are
   pre-defined in the theme tokens and require no manual adjustment

---

## 6. Component Patterns

### 6.1 The Status Dot

The most fundamental animation primitive. Appears in every module header.

```
Size: 8–10px, border-radius: 3px (square-ish) or 50% (circle)
States:
  idle    → T.textDim fill, no shadow, no animation
  running → T.accent fill, box-shadow glow, opacity pulse 1→0.3→1
            duration: 1.0–1.2s, repeat: Infinity, ease: easeInOut
```

This dot is always in the top-left of the canvas header, paired with a module title.
The dot communicates "the simulation is executing" at a glance.

### 6.2 The Live Badge

The header-right complement to the status dot.

```
Layout: small pill, flexbox, gap 6px, padding "3px 10px"
Contents: pulsing dot (5–6px) + label text (8px mono bold uppercase)
States:
  IDLE      → dim text only, no pill, no border
  RUNNING   → T.accent tint bg (${T.accent}1A), T.accent border (${T.accent}4D), accent text
  ACTIVE    → semantic color tint + border + text
```

Use `AnimatePresence mode="wait"` to transition between states cleanly.
Always assign a stable `key` to each state variant.

### 6.3 The Action Card (scenario/workflow card)

The primary interactive element in every control panel.

**Anatomy:**
```
┌──────────────────────────────────────────────┐
│ Name (10.5–11px, 600, T.text)   [badges]     │
│ Description (9px, T.textMuted, 2-line clamp) │
│ Metadata row (7px, T.textDim)     [chevron]  │
└──────────────────────────────────────────────┘
```

**Interaction states:**
- Default: `T.card` bg, `T.border` border
- Hover: `T.cardHover` bg, `${primaryColor}45` border, subtle box-shadow
- Active/running: opacity 0.45, cursor not-allowed
- Motion: `whileHover={{ x: 2 }}`, `whileTap={{ scale: 0.985 }}`, `transition={{ duration: 0.15 }}`

**Rules:**
- No left accent stripe
- No colored background
- Chevron always present on the right — it signals "this does something"
- Badges are always right-aligned in the top row
- Description never exceeds 2 lines (use `-webkit-line-clamp: 2`)

### 6.4 The Chip / Badge

Small inline labels that communicate type, category, or state.

**Anatomy**: padding `"2px 6–8px"`, border-radius `4–6px`, font `7.5–8px mono bold uppercase`

Two variants:

**Type chip** (category/channel/role):
```css
background: ${color}14;
border: 1px solid ${color}30;
color: ${color};
```

**State chip** (live/active/expired):
```css
background: ${color}18;
border: 1px solid ${color}40;
color: ${color};
```

**Neutral chip** (code/reference):
```css
background: T.cardHover;
border: 1px solid T.borderSubtle;
color: T.textDim;
```

Never put an icon inside a chip unless the chip has no label (icon-only chips use larger padding
and a slightly larger border-radius).

### 6.5 The Log Entry Row

The universal pattern for event logs. Appears in every module panel.

**Layout:** flat row, no card border, no background.

```
● [timestamp] [EVENT] description text                          ✓
```

- `●` = 5–6px circle, semantic channel color or `T.accent` for system events
- `[timestamp]` = 7.5px mono T.textDim, fixed width 50–52px
- `[EVENT]` = 8px mono bold, colored **text only** — no pill/chip background in log rows
- `description` = 9px system-ui T.textMuted, flex-1, overflow ellipsis
- `✓` = 9–10px CheckCircle2 (T.green) or XCircle (T.red)

Between rows: a `1px solid T.borderSubtle` separator, or no separator (the dot is enough).
Never add a card background to log rows — the list reads as a table, and tables don't have
individual card borders on every row.

**Animation:** `initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}` 0.2s ease.
No exit animation. History stays visible at full opacity. Never dim old entries.

### 6.6 The Section Header

A consistent label for panel sections.

```
┌─────────────────────────────────────────────┐
│ [icon] SECTION LABEL                [action]│
└─────────────────────────────────────────────┘
padding: "10px 14px 6px"
icon: 12–14px, T.textDim
label: 9px mono 700 T.textMuted uppercase 0.12em
action: right-aligned (typically a reset button)
```

### 6.7 The Filter Strip

Category filters appear as a horizontal row of pill buttons.

```
Active pill:   bg=${T.accent}12, border=${T.accent}35, color=T.accent
Inactive pill: bg=transparent, border=T.border, color=T.textMuted
All pills: 8px mono bold uppercase, padding "5px 8px", borderRadius 6px, gap 5px
```

On tab switch: `AnimatePresence mode="wait"` on the content below, `initial/animate/exit` with
`opacity` and `y: ±6`. Duration 0.15s.

---

## 7. Animation Principles

### 7.1 The Purpose Test

Before adding an animation, ask: does this tell the user something about system state?

- **Yes** → add it
- **No** → don't

Animations that pass the test: state transitions, signal pulses, data flow, loading/running states.
Animations that fail: entrance animations on static content, hover scale on non-interactive elements,
decorative parallax.

### 7.2 Timing Values

| Context | Duration | Easing |
|---|---|---|
| State transition (border, color) | 0.3–0.35s | `ease` |
| UI element appearance | 0.2–0.25s | `easeOut` |
| Badge swap (AnimatePresence) | 0.18–0.22s | `easeOut` |
| Pulsing / breathing loop | 1.0–1.8s | `easeInOut` |
| Data packet travel | 0.75–1.1s | `easeInOut` or `linear` |
| Tab content change | 0.15s | default |

Never use `duration > 2s` for anything except ambient background effects.
Never use `bounce` or `spring` easing — they read as playful, not technical.

### 7.3 The Pulse Pattern

Used for "this is actively happening" indicators:

```ts
animate={{ opacity: [1, 0.25, 1] }}
transition={{ duration: 1.0, repeat: Infinity, ease: "easeInOut" }}
```

Variants:
- **Dot pulse**: above pattern on a small circle element
- **Scale pulse**: `scale: [1, 1.04, 1]` on a hub/node element — very subtle
- **Glow pulse**: `boxShadow` alternating between active glow and `"none"` or reduced glow

**Critical**: pulse animations run on looping elements (running indicators, live badges, active
nodes). They do NOT run on list items, log entries, or anything that appears as historical data.

### 7.4 Data Flow Animations

When visualizing data moving between nodes (signal pulses, data packets):

```ts
// Traveling dot pattern
initial={{ cx: sourceX, cy: sourceY, opacity: 0 }}
animate={{
  cx: [sourceX, targetX],
  cy: [sourceY, targetY],
  opacity: [0, 1, 1, 0],
}}
transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
```

Always pair with a dashed line overlay on the path/edge to reinforce direction.
The traveling dot is the "proof" of data moving. The dashed animation is context.

### 7.5 AnimatePresence Rules

Always use `AnimatePresence` when swapping between two states in the same position:

```tsx
<AnimatePresence mode="wait">
  {condition ? (
    <motion.div key="state-a" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      ...
    </motion.div>
  ) : (
    <motion.div key="state-b" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      ...
    </motion.div>
  )}
</AnimatePresence>
```

**Always** assign a unique, stable `key` to each variant. Without it, React reuses the DOM element
and the animation never fires.

Use `mode="wait"` when the outgoing element should fully exit before the incoming one appears.
Use `mode="sync"` (default) for overlapping transitions (rare in this system).

---

## 8. ReactFlow Conventions

### 8.1 When to Use ReactFlow

Use ReactFlow when the visualization has:
- Multiple named nodes with relationships
- Edges that carry meaning (data flows, dependencies, connections)
- States that change the appearance of nodes and edges at runtime

Do not use ReactFlow for:
- Pure status dashboards (use cards)
- Linear step sequences (use a vertical timeline)
- Simple hub-and-spoke with no edge semantics

### 8.2 Node Design Contract

Every custom ReactFlow node follows this contract:

```tsx
function MyNode({ data }: NodeProps) {
  // data always contains: theme: ThemeTokens, plus module-specific state
  const { theme: T, isActive, ... } = data;

  return (
    <div style={{
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      background: T.card,                          // ALWAYS T.card — never tinted
      border: `1.5px solid ${isActive ? color : T.border}`,
      borderRadius: 14,
      boxShadow: isActive
        ? `0 0 0 1px ${color}22, 0 4px 20px ${color}18`
        : "0 2px 8px rgba(0,0,0,0.06)",
      transition: "border-color 0.3s ease, box-shadow 0.3s ease",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    }}>
      {/* Handles: opacity 0, never visible */}
      <Handle type="source" position={Position.Top} style={{ opacity: 0 }} />

      {/* Icon */}
      <div style={{ color: isActive ? color : T.textDim, transition: "color 0.3s ease" }}>
        <Icon size={18} />
      </div>

      {/* Label */}
      <span style={{ fontSize: 10, fontFamily: "monospace", fontWeight: 700,
        color: isActive ? color : T.textMuted, letterSpacing: "0.05em" }}>
        {label}
      </span>
    </div>
  );
}
```

**Rules:**
- `nodeTypes` and `edgeTypes` are **always defined at module level** (outside the component function)
- Never use Tailwind classes on ReactFlow nodes — inline styles only
- Handles are always `opacity: 0` — never show connector dots to users
- Node data always receives `theme: ThemeTokens` so nodes can theme themselves

### 8.3 Edge Design Contract

Custom animated edges follow this pattern:

```tsx
function AnimatedEdge({ sourceX, sourceY, targetX, targetY, data }: EdgeProps) {
  const { isActive, color, theme: T } = data as { isActive: boolean; color: string; theme: ThemeTokens };
  const [edgePath] = getStraightPath({ sourceX, sourceY, targetX, targetY });

  return (
    <>
      {/* Base path */}
      <BaseEdge
        path={edgePath}
        style={{
          stroke: isActive ? color : T.border,
          strokeWidth: isActive ? 2 : 1.5,
          filter: isActive ? `drop-shadow(0 0 4px ${color}66)` : "none",
          transition: "stroke 0.35s ease, filter 0.35s ease",
        }}
      />

      {/* Animated dash overlay when active */}
      {isActive && (
        <path
          d={edgePath}
          stroke={color}
          strokeWidth={2}
          fill="none"
          strokeDasharray="8 6"
          style={{ animation: "dashFlow 0.6s linear infinite", opacity: 0.65 }}
        />
      )}

      {/* Traveling pulse dot when active */}
      {isActive && (
        <motion.circle
          r={4}
          fill={color}
          style={{ filter: `drop-shadow(0 0 5px ${color})` }}
          animate={{
            cx: [sourceX, targetX],
            cy: [sourceY, targetY],
            opacity: [0, 1, 1, 0],
          }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
        />
      )}
    </>
  );
}
```

Include the CSS keyframe inside a `<style>` tag rendered in the main canvas component:
```css
@keyframes dashFlow {
  from { stroke-dashoffset: 14; }
  to   { stroke-dashoffset: 0; }
}
```

### 8.4 ReactFlow Canvas Settings

All ReactFlow canvases in this system use these settings:

```tsx
<ReactFlow
  nodesDraggable={false}
  nodesConnectable={false}
  elementsSelectable={false}
  panOnDrag={false}
  zoomOnScroll={false}
  zoomOnPinch={false}
  zoomOnDoubleClick={false}
  fitView
  fitViewOptions={{ padding: 0.3 }}
  proOptions={{ hideAttribution: true }}
>
  <Background
    variant={BackgroundVariant.Dots}
    gap={20}
    size={1}
    color={T.isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)"}
  />
</ReactFlow>
```

Wrap the ReactFlow component in `<ReactFlowProvider>` if it is mounted inside a component that
also calls `useReactFlow()` or other ReactFlow hooks. If no hooks are used, the provider is
optional but harmless.

The Background is always `BackgroundVariant.Dots`. No grid lines. The dots are near-invisible —
they texture the canvas without competing with the content.

---

## 9. State Visualization Conventions

### 9.1 The Active → Delivered → Idle Lifecycle

Every interactive node or card follows this lifecycle pattern:

| Phase | Visual State |
|---|---|
| **Idle** | `T.border` border, `T.textDim` icon, no shadow |
| **Active/Running** | Semantic color border, colored icon, glow shadow, pulse animation |
| **Delivered/Success** | Green badge appears (check icon), border settles to green briefly |
| **Idle (post-run)** | Returns to idle state (animated transition) |

The transition between phases uses `motion.div` with `animate` on `borderColor` and `boxShadow`,
or CSS `transition` on border/shadow for SVG elements.

### 9.2 The Current Step Pattern (Step-Feed)

When a module executes a sequence of steps, the canvas shows a "current step hero card":

```
┌──────────────────────────────────────────────┐
│ ● NOW  [STEP LABEL in step color]      LIVE ● │  ← header row
│ Description text explaining what is          │
│ happening right now in plain language.       │
└──────────────────────────────────────────────┘
```

- Background: `${stepColor}12`
- Border: `1px solid ${stepColor}40`
- Left vertical accent: `4px solid ${stepColor}` (the one case where a colored left stripe is valid
  — because this is a unique "now" indicator, not a category marker)
- "NOW" badge: `${stepColor}20` bg, `${stepColor}` text, 8px mono bold, uppercase, rounded-full
- "LIVE" indicator: pulsing dot in step color, "LIVE" text (7px mono, `${stepColor}99`)

History entries beneath it are **never dimmed**. They remain at full opacity in the same style.

### 9.3 Token / Credential Display

When displaying auth tokens, API keys, wallet addresses, or other sensitive/long values:

- Always truncate to 8 characters + "…"
- Render in monospace
- Use a dim color (`T.textMuted` or `T.textDim`)
- Pair with a progress bar or TTL indicator if the value has an expiry

Token bars:

```
[Label   ] [████████████░░░░░░] [value…]
  7px mono   flex-1, 6px height    8px mono
  T.textMuted  animated width %   T.textMuted
```

Bar track: `T.borderSubtle` background. Bar fill: semantic color (blue=access, amber=refresh,
green/red=TTL). Animated with Framer Motion `animate={{ width: "X%" }}`.

---

## 10. Dark / Light Mode Contract

### 10.1 The Theme Hook

Every component accesses theme tokens through a single hook:

```ts
const T = useTheme(); // returns ThemeTokens
```

This hook always initializes with `DARK` on first render (server-side safe, no hydration mismatch).
It corrects to the real theme in a `useEffect` and stays reactive via a `MutationObserver` on the
`<html>` class.

**Never** read the theme in a `useState` initializer. **Never** call `localStorage.getItem` during
render. Both cause SSR hydration mismatches.

### 10.2 Light Mode Principles

Light mode is not "make everything lighter." It has its own design intent:

- **Shadows replace glows.** In dark mode, active states use colored glow (`box-shadow: 0 0 20px
  ${color}44`). In light mode, active states use clean `box-shadow: 0 2px 12px rgba(0,0,0,0.1)`.
- **Borders are more prominent.** Light mode borders use higher opacity (`T.border` in light is
  `oklch(0.78 0.025 185 / 0.55)` — visible but not harsh).
- **Semantic colors are darker.** The light mode semantic colors are pre-defined in `ThemeTokens`
  as darker, more saturated versions for legibility on white backgrounds.
- **Text hierarchy inverts.** What was near-white in dark is near-black in light. The same four
  tiers still apply (`T.text`, `T.textMuted`, `T.textDim`, semantic), just at different lightnesses.

### 10.3 Conditional Theme Values

When a value genuinely needs to differ by theme (not covered by tokens):

```ts
// In a component:
const nodeFill = T.isDark
  ? "oklch(0.22 0.06 175 / 0.85)"
  : "oklch(0.93 0.02 180 / 0.90)";
```

Use `T.isDark` as the branch condition. Never `typeof window !== 'undefined'` inside render.

---

## 11. Styling Rules (Non-Negotiable)

### 11.1 Inline Styles for All Visuals

Every visual style property — color, background, border, shadow, font-size, padding, margin —
is written as an inline `style` object. Never in a CSS file, never in a Tailwind class.

**Rationale**: theme tokens are JavaScript values. They cannot be used in CSS files or Tailwind
config at runtime. Inline styles are the only way to guarantee theme-reactive visuals.

### 11.2 Tailwind for Layout Only

Tailwind classes are permitted for structural layout only:

```tsx
// Allowed Tailwind:
className="flex-1 flex flex-col overflow-hidden min-h-0"
className="w-[65%] relative overflow-hidden"
className="border-l border-border"

// Forbidden Tailwind:
className="bg-gray-900 text-white rounded-lg p-4"  // ← use inline style
className="text-sm font-bold tracking-wide"        // ← use inline style
```

### 11.3 No Emojis

Zero emojis in any UI element. Use `lucide-react` icons exclusively.

Every emoji that might have appeared in a design ("✅", "❌", "🚗", "🏢", "⚙️") has a lucide
equivalent: `CheckCircle2`, `XCircle`, `Car`, `Building2`, `Settings`.

### 11.4 Component Scope

Sub-components (e.g. `HubNode`, `ChannelNode`, `LogEntry`, `ScenarioCard`) should be defined in
the same file as the parent unless they are shared across modules. Co-location is preferred.

### 11.5 ReactFlow Node/Edge Types

**Always** define `nodeTypes` and `edgeTypes` at module level:

```ts
// CORRECT — defined outside the component
const nodeTypes = { hub: HubNode, channel: ChannelNode };
const edgeTypes = { animated: AnimatedEdge };

export default function MyCanvas(...) {
  // nodeTypes/edgeTypes used here
}
```

Never define them inside the component function. ReactFlow re-registers node types on every render
if the object reference changes, causing nodes to remount.

---

## 12. Panel Information Architecture

### 12.1 The Three Sections of Every Panel

1. **Reference section** (top) — static or semi-static context. Channel overview, account info,
   flow reference. Compact, non-interactive (or lightly interactive). Max 25% of panel height.

2. **Action section** (middle) — the interactive core. Category filter + action cards. This is
   what the user is primarily here to do. Gets the most space.

3. **Log section** (bottom) — the event record. Everything that has happened. Grows downward as
   events accumulate. Always scrollable. Never paginated — just show the last N entries.

### 12.2 Information Density Calibration

Control panels show a lot. The rule is: show everything relevant, but don't show it twice.

If a scenario card already shows which channels it targets, don't also show a channel overview
grid at the top. If the log entry shows a timestamp, don't also show it in the event badge.

Each piece of information appears exactly once. Position it at the level of importance it deserves.

### 12.3 Empty States

Every section that can be empty needs an empty state:

**Log empty state:**
```
fontStyle: italic, fontFamily: monospace, fontSize: 9.5, color: T.textDim
padding: "8px 4px"
"Run a scenario to see events..."
```

**Canvas empty state (no scenario running):**
```
Centered vertically and horizontally in the visualization area
[relevant icon, 20px, T.textDim]
[message, 10px mono, T.textDim]
[sub-message, 8.5px, T.textDim, optional]
```

Never show loading spinners. The system is either running (pulse animation exists) or idle
(empty state exists). There is no ambiguous loading state.

---

## 13. Anti-Patterns

These are things that have been tried and removed. Do not reintroduce them.

| Anti-pattern | Why it fails | What to do instead |
|---|---|---|
| Colored card backgrounds (`${color}14` fill) | Cards look like chips; hierarchy collapses | Use `T.card` always; express state through border/shadow |
| Left accent stripe on cards | Decorative, not semantic; looks like a bookmark | Use border-color for active state |
| Ring pulse animations on cards | Too much visual noise; looks like notification spam | Use a `boxShadow` breathing effect (very subtle scale `[1, 1.02, 1]`) |
| Emoji in UI | Unprofessional in a developer tool; inconsistent rendering | lucide-react icons only |
| Dimming history entries | Makes old data hard to read; implies it's less important | Full opacity always; history is equally valid data |
| Shrinking history entries | Same problem as dimming | Full size always |
| Font size below 7px | Illegible at any screen density | 7.5px is the minimum |
| CSS files for visual styles | Breaks theme reactivity | Inline styles only |
| Tailwind for colors/typography | Same problem | Inline styles only |
| Defining ReactFlow types inside component | Causes node remounting on every render | Module level only |
| `typeof window` in render | SSR hydration mismatch | `useEffect` + `MutationObserver` |
| More than 2 font families | Visual inconsistency | `monospace` + `system-ui` only |
| Box shadows that match background exactly | Invisible in dark mode | Always use alpha channels |
| `AnimatePresence` without stable `key` | Animation never fires | Always key each variant |

---

## 14. The Agent Checklist

When an AI agent generates a new module or component using this design system, it must verify:

- [ ] Canvas uses the three-zone layout (header / visualization / context panel)
- [ ] Panel uses the three-section layout (reference / actions / log)
- [ ] Header bar is fixed, 40–44px, uses `T.header` background
- [ ] All card surfaces use `T.card` background — no colored fills
- [ ] Active state uses border-color + box-shadow, not background color
- [ ] ReactFlow `nodeTypes`/`edgeTypes` defined at module level
- [ ] All handles have `style={{ opacity: 0 }}`
- [ ] Running state: status dot pulses, live badge appears
- [ ] Log entries are flat rows, full opacity, no exit animation
- [ ] Typography: monospace for labels/metadata, system-ui for descriptions
- [ ] No emojis anywhere
- [ ] No CSS files for visual styles — inline styles only
- [ ] Tailwind only for structural layout classes
- [ ] `useTheme()` used for all color values — no hardcoded theme-dependent colors
- [ ] `T.isDark` used only inside `useEffect` or render (never in `useState` initializer)
- [ ] `AnimatePresence` variants have stable, unique `key` props
- [ ] Animation durations: transitions ≤ 0.35s, loops 1–1.8s, travel 0.75–1.1s
- [ ] No `bounce` or `spring` easing
- [ ] Empty states present for canvas idle and log empty
- [ ] Light mode tested: no hardcoded dark values, all surfaces readable
