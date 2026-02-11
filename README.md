# claw-ui

An adaptive chat interface for interacting with AI agents through WebSocket gateways. Built with React, TypeScript, and Supabase.

## Features

- **Multi-agent chat** — Connect to multiple AI agent gateways and manage conversations across them
- **A2UI (Adaptive 2 UI)** — Agents can dynamically render rich UI components (forms, cards, media, navigation) inside the chat
- **Adaptive interface** — The UI learns from your usage patterns to reorder sidebar sections, suggest actions, and surface frequently used commands
- **Session management** — Create, pin, search, and organize conversation sessions
- **Dark mode** — Light, dark, and system-following theme support
- **Real-time streaming** — WebSocket-based communication with streaming agent responses

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- A [Supabase](https://supabase.com/) project (for database and auth)

## Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/taylorelley/claw-ui.git
   cd claw-ui
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env` file in the project root:

   ```
   VITE_SUPABASE_URL=<your-supabase-project-url>
   VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
   ```

4. **Run database migrations**

   Apply the SQL migration in `supabase/migrations/` to your Supabase project via the Supabase dashboard SQL editor or the Supabase CLI.

5. **Start the dev server**

   ```bash
   npm run dev
   ```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |

## Tech Stack

- **React 18** with TypeScript (strict mode)
- **Vite** for builds and dev server
- **React Router 7** for client-side routing
- **Tailwind CSS 3** for styling with CSS custom properties theming
- **Supabase** for database, auth, and real-time sync
- **Lucide React** for icons

## Project Structure

```
src/
├── a2ui/          # Adaptive UI component system (renderer, data binding, surface management)
├── components/
│   ├── chat/      # Chat interface (ChatView, ComposeBar, MessageBubble)
│   └── layout/    # App shell (AppShell, Sidebar, TopBar)
├── context/       # Global state via React Context + useReducer
├── hooks/         # Custom hooks (useGateway, useSession, useAdaptiveEngine)
├── lib/           # Utilities and type definitions
└── pages/         # Route pages (Dashboard, Agents, History, Settings)
```

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
