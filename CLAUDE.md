# CLAUDE.md - AI Assistant Guide for claw-ui

## Project Overview

**claw-ui** is a React 18 + TypeScript web application that serves as an adaptive chat interface for interacting with OpenClaw AI agents via WebSocket gateways. It features an A2UI (Adaptive 2 UI) system that allows agents to dynamically render UI components, and an adaptive engine that learns from user behavior to reorganize the interface.

## Tech Stack

- **Framework:** React 18.3 with TypeScript 5.5 (strict mode)
- **Build:** Vite 5.4
- **Routing:** React Router 7.13 (`BrowserRouter`)
- **Styling:** Tailwind CSS 3.4 with CSS custom properties for theming
- **Backend:** Supabase (PostgreSQL with RLS)
- **Icons:** Lucide React
- **Package Manager:** npm

## Commands

```bash
npm run dev        # Start Vite dev server
npm run build      # Production build (runs tsc -b && vite build)
npm run lint       # Run ESLint
npm run typecheck  # TypeScript type checking (tsc --noEmit -p tsconfig.app.json)
npm run preview    # Preview production build
```

## Project Structure

```
src/
├── a2ui/                    # A2UI dynamic component system
│   ├── components/          # Individual A2UI component renderers
│   ├── dataBinding.ts       # Path-based data model resolution & interpolation
│   ├── renderer.tsx         # Maps A2UI component types to React components
│   ├── surfaceManager.ts    # Surface lifecycle (create, update, delete)
│   └── types.ts             # A2UI type definitions
├── components/
│   ├── chat/                # Chat interface
│   │   ├── ChatView.tsx     # Main chat page with messages + compose bar
│   │   ├── ComposeBar.tsx   # Message input with suggestions
│   │   ├── MessageBubble.tsx# Individual message rendering
│   │   └── StreamingIndicator.tsx
│   └── layout/              # App shell
│       ├── AppShell.tsx     # Sidebar + TopBar + Outlet wrapper
│       ├── Sidebar.tsx      # Navigation sidebar (adaptive ordering)
│       └── TopBar.tsx       # Top navigation bar
├── context/
│   └── AppContext.tsx        # Global state (Context + useReducer)
├── hooks/
│   ├── useAdaptiveEngine.ts # Behavior tracking & UI adaptation
│   ├── useGateway.ts        # WebSocket connection & JSON-RPC messaging
│   └── useSession.ts        # Session & message CRUD with Supabase sync
├── lib/
│   ├── cn.ts                # Tailwind class merge utility
│   ├── supabase.ts          # Supabase client initialization
│   └── types.ts             # Core TypeScript interfaces
├── pages/
│   ├── DashboardPage.tsx    # Home view with pinned sessions & agent status
│   ├── AgentsPage.tsx       # Agent connection management
│   ├── HistoryPage.tsx      # Conversation history search
│   └── SettingsPage.tsx     # User preferences
├── App.tsx                  # Root component with routing
├── main.tsx                 # Entry point
└── index.css                # Global styles & Tailwind directives
```

## Architecture

### State Management

Uses React Context + `useReducer` (no external state library). Global state lives in `AppContext.tsx` and includes:
- `preferences` (theme, density, sidebar config)
- `sessions` (conversation list)
- `activeSessionId`
- `connections` (agent gateway configs)
- `shortcuts` (command templates)

State is persisted to Supabase and loaded on app initialization.

### Routing

All routes are nested under `AppShell` which provides the sidebar + top bar layout:
- `/` — Dashboard
- `/chat/:sessionId` — Chat view
- `/agents` — Agent connections
- `/history` — Conversation history
- `/settings` — Preferences

### WebSocket Communication

`useGateway` manages WebSocket connections to agent gateways using a JSON-RPC-style protocol:
- `auth` — Authenticate with token
- `sessions.send` — Send user messages
- `action` — Trigger UI actions

Supports auto-reconnection with exponential backoff.

### A2UI System

The Adaptive 2 UI system allows agents to send dynamic UI component trees. Supported component types:
- **Text:** Text, Button, Card
- **Layout:** Row, Column, List, Divider
- **Input:** TextField, CheckBox, ChoicePicker, Slider, DateTimeInput
- **Media:** Image, Icon, Video, AudioPlayer
- **Navigation:** Tabs, Modal

Data binding uses path expressions (e.g., `user.profile.name`) and template interpolation with `${path}` syntax.

### Adaptive Engine

`useAdaptiveEngine` tracks user interactions and adapts the interface:
- Tracks command frequency and suggests actions
- Reorders sidebar sections based on usage patterns
- Batches events (2-second flush interval) and syncs to Supabase

## Database

Supabase PostgreSQL with RLS. Schema defined in `supabase/migrations/`. Tables:
- `agent_connections` — Gateway endpoint configs
- `sessions` — Conversations (FK to agent_connections)
- `messages` — Chat messages with optional `a2ui_payload` (jsonb)
- `interaction_events` — User behavior tracking
- `user_preferences` — Key-value settings store
- `shortcuts` — Quick command templates

All tables have RLS policies allowing both authenticated and anon access (single-user local mode).

## Environment Variables

Required in `.env` (not committed):
```
VITE_SUPABASE_URL=<supabase-project-url>
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
```

## Conventions

### Code Style

- **TypeScript strict mode** — no unused locals/parameters, no fallthrough in switch
- **ESLint** — TypeScript-aware with React hooks and React Refresh rules
- **Naming:** PascalCase for components, camelCase for hooks/utilities/variables
- **Exports:** Named exports preferred (components, hooks, utilities)

### Component Patterns

- Page components live in `src/pages/`, UI components in `src/components/`
- Domain-specific components are grouped in subdirectories (`chat/`, `layout/`)
- Hooks encapsulate domain logic and side effects (`useSession`, `useGateway`)
- Components use Tailwind utility classes exclusively — no CSS modules or styled-components
- `cn()` utility (from `src/lib/cn.ts`) for conditional class merging

### Styling

- Tailwind with CSS custom properties for theming (light/dark via `class` strategy)
- Semantic color tokens: `surface-{0..3}`, `border`, `accent`, `foreground`, `success`, `warning`, `error`
- Typography: Inter (sans), JetBrains Mono (mono)
- Custom animations: `fade-in`, `slide-up`, `slide-in-right`, `slide-in-left`, `pulse-subtle`, `shimmer`

### State Updates

- Immutable updates via spread operator in reducers
- Optimistic UI updates with Supabase sync
- `useCallback` for memoized event handlers
- `useRef` for mutable values (WebSocket instances, timers)

## Testing

No test framework is currently configured. Testable patterns are in place (isolated hooks, typed props, pure utility functions) but no test files exist yet.

## Common Tasks

### Adding a new page

1. Create component in `src/pages/NewPage.tsx`
2. Add route in `src/App.tsx` inside the `AppShell` Route
3. Add navigation link in `src/components/layout/Sidebar.tsx`

### Adding an A2UI component

1. Define component type and props in `src/a2ui/types.ts`
2. Create renderer in `src/a2ui/components/`
3. Register in the component map in `src/a2ui/renderer.tsx`

### Adding state to AppContext

1. Add to `AppState` interface in `src/context/AppContext.tsx`
2. Add action type to the union and handler in the reducer
3. Expose via context value if needed globally

### Working with Supabase

- Client is initialized in `src/lib/supabase.ts`
- Migrations go in `supabase/migrations/` with timestamp-prefixed filenames
- All tables use RLS with both authenticated and anon policies
