# Claw UI

A modern, cloud-hosted web interface for OpenClaw with multi-tenant support, real-time agent connections, and adaptive UI features.

## ✨ Features

- **🌐 Cloud Multi-Tenant** — Secure user authentication and isolated agent management
- **🤖 Multi-Agent Support** — Connect and manage multiple OpenClaw agents from different devices
- **💬 Real-Time Chat** — WebSocket-based communication with streaming responses
- **🔒 Secure Relay** — Authenticated relay server routes messages between browser and agents
- **📱 Responsive Design** — Works seamlessly on desktop, tablet, and mobile
- **🎨 Adaptive Interface** — UI learns from your usage patterns to optimize your workflow
- **🌓 Theme Support** — Light, dark, and system-following themes
- **A2UI Components** — Agents can render rich UI (forms, cards, media) directly in chat
- **📊 Session Management** — Create, pin, search, and organize conversations
- **⚡ Quick Actions** — Frequently used commands surface automatically

## 🏗️ Architecture

```
┌─────────────┐      HTTPS/WSS    ┌──────────────┐
│   Browser   │ ◄───────────────► │   Claw UI    │
│  (Client)   │   React SPA       │  (Frontend)  │
└─────────────┘                   └──────────────┘
                                         │
                                         │ WebSocket (Auth)
                                         ▼
                                  ┌──────────────┐
                                  │    Relay     │
                                  │    Server    │
                                  └──────────────┘
                                         │
                      ┌──────────────────┼──────────────────┐
                      ▼                  ▼                  ▼
               ┌──────────────┐   ┌──────────────┐  ┌──────────────┐
               │  Supabase    │   │   OpenClaw   │  │   OpenClaw   │
               │  Auth + DB   │   │  Agent #1    │  │  Agent #2    │
               └──────────────┘   └──────────────┘  └──────────────┘
```

### Components

1. **Frontend (React SPA)**
   - User authentication & registration
   - Setup wizard for agent onboarding
   - Real-time chat interface
   - Agent dashboard & management
   - Session history & search

2. **Relay Server (WebSocket)**
   - Authenticates connections via Supabase JWT
   - Routes messages between browser and agents
   - Manages agent selection & switching
   - Handles connection lifecycle

3. **Supabase Backend**
   - User authentication
   - Agent token management (PostgreSQL)
   - Session & message storage
   - Row-level security (RLS) for data isolation

4. **OpenClaw Plugin**
   - Connects to relay server
   - Authenticates with agent token
   - Processes commands & streams responses

## 🚀 Quick Start

### For Users

See **[Getting Started Guide](docs/GETTING_STARTED.md)** for:
- Creating an account
- Connecting your first agent
- Basic usage & navigation
- Tips & troubleshooting

### For Developers/Deployers

See **[Deployment Guide](docs/DEPLOYMENT.md)** for:
- Self-hosted deployment (Coolify, Docker)
- Cloud deployment (Vercel, Railway)
- Relay server setup
- Plugin configuration
- Scaling & monitoring

## 📦 Development Setup

### Prerequisites

- Node.js 18+
- npm/yarn/pnpm
- Supabase account (or local instance)

### Installation

```bash
# Clone repository
git clone https://github.com/taylorelley/claw-ui.git
cd claw-ui

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials

# Run database migrations
# (via Supabase dashboard or CLI)

# Start development server
npm run dev
```

### Environment Variables

```bash
# Frontend (.env)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_RELAY_URL=wss://relay.yourdomain.com  # or ws://localhost:8080 for dev

# Relay Server (relay-server/.env)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
PORT=8080
CORS_ORIGIN=http://localhost:5173
```

## 📜 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | TypeScript type checking |

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript (strict mode)
- **Vite** for blazing-fast dev & builds
- **React Router 7** for client-side routing
- **Tailwind CSS 3** for utility-first styling
- **Supabase Client** for auth & database
- **Lucide React** for icons

### Backend
- **Supabase** (PostgreSQL + Auth + RLS)
- **WebSocket** relay server (Node.js)
- **OpenClaw Plugin** (Python/JavaScript)

## 📁 Project Structure

```
claw-ui/
├── src/
│   ├── a2ui/              # Adaptive UI component system
│   ├── components/
│   │   ├── agents/        # Agent cards, lists, management
│   │   ├── chat/          # Chat interface components
│   │   ├── common/        # Toast, spinner, empty states
│   │   └── layout/        # App shell, sidebar, navigation
│   ├── context/           # React Context (AppContext, AuthContext)
│   ├── hooks/             # Custom hooks (useClawChannel, useSession)
│   ├── lib/               # Utilities, types, helpers
│   ├── pages/             # Route pages
│   │   ├── HomePage.tsx           # Landing/dashboard
│   │   ├── AgentDashboardPage.tsx # Agent management
│   │   ├── SettingsPage.tsx       # User preferences
│   │   └── ...
│   ├── services/          # API services (agentTokenService, etc.)
│   └── App.tsx            # Root component & routing
├── relay-server/          # WebSocket relay server
│   ├── src/
│   │   └── index.js       # Relay server entry point
│   └── package.json
├── plugin/                # OpenClaw plugin distribution
│   └── claw-ui-cloud/
├── docs/
│   ├── GETTING_STARTED.md # User guide
│   └── DEPLOYMENT.md      # Deployment guide
├── supabase/
│   └── migrations/        # Database schema & RLS policies
└── README.md              # This file
```

## 🔑 Key Features Deep Dive

### Multi-Agent Management
- Connect multiple OpenClaw instances from different devices
- Real-time status monitoring (online/offline)
- Connection history tracking
- Bulk operations (revoke multiple agents)
- Test connection functionality

### Adaptive UI
- Sidebar sections reorder based on usage frequency
- Quick actions surface most-used commands
- Session history prioritizes recent & pinned items
- Layout density & preferences customizable

### Security
- Supabase Row-Level Security (RLS) isolates user data
- JWT-based authentication for relay connections
- Agent-specific tokens (revocable)
- HTTPS/WSS encryption in transit
- No direct plugin → browser connection (all via relay)

### A2UI (Adaptive 2 UI)
- Agents can dynamically render UI components
- Support for forms, cards, media, navigation
- Data binding & event handling
- Surface management for complex layouts

## 📚 Documentation

- **[Getting Started](docs/GETTING_STARTED.md)** - User guide & first-time setup
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Production deployment instructions
- **[Plugin Development](plugin/README.md)** - OpenClaw plugin integration (if exists)

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🐛 Troubleshooting

### Common Issues

**Agent won't connect:**
- Verify relay URL is correct (wss:// for production)
- Check auth token matches database
- Review OpenClaw plugin logs
- Test relay server independently

**Frontend build errors:**
- Clear node_modules: `rm -rf node_modules && npm install`
- Check Node.js version (18+ required)
- Verify environment variables set correctly

**Database errors:**
- Check Supabase project status
- Verify RLS policies aren't blocking requests
- Review service role key vs. anon key usage

See **[Deployment Guide](docs/DEPLOYMENT.md)** for detailed troubleshooting.

## 📝 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- Built with [React](https://react.dev/), [Vite](https://vite.dev/), and [Tailwind CSS](https://tailwindcss.com/)
- Backend powered by [Supabase](https://supabase.com/)
- Icons by [Lucide](https://lucide.dev/)
- Designed for [OpenClaw](https://github.com/openclaw)

---

**Made with ❤️ for the OpenClaw community**
