import { Bot } from 'lucide-react';
import { AgentList } from '../components/agents/AgentList';

export function AgentDashboardPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Bot className="w-8 h-8 text-accent" />
          <h1 className="text-3xl font-bold text-foreground">Agent Management</h1>
        </div>
        <p className="text-foreground/60">
          Manage your connected OpenClaw agents
        </p>
      </div>

      <AgentList />
    </div>
  );
}
