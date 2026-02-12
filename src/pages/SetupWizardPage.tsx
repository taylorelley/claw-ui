import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Check, Copy, CheckCircle, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { createAgentToken, getAgentStatus } from '../services/agentTokenService';

type Step = 'name' | 'generate' | 'configure' | 'verify';

const RELAY_URL = 'wss://claw-ui.app.taylorelley.com/relay';

export function SetupWizardPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>('name');
  const [agentName, setAgentName] = useState('');
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [tokenId, setTokenId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [configMode, setConfigMode] = useState<'agent' | 'manual'>('agent');
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const steps: Step[] = ['name', 'generate', 'configure', 'verify'];
  const stepIndex = steps.indexOf(currentStep);

  // Auto-check connection status on verify step
  useEffect(() => {
    if (currentStep === 'verify' && tokenId && !isConnected) {
      const checkConnection = async () => {
        setVerifying(true);
        try {
          const status = await getAgentStatus(tokenId);
          setIsConnected(status === 'online');
        } catch (err) {
          console.error('Failed to check connection:', err);
        } finally {
          setVerifying(false);
        }
      };

      checkConnection();
      const interval = setInterval(checkConnection, 5000); // Check every 5s
      
      return () => clearInterval(interval);
    }
  }, [currentStep, tokenId, isConnected]);

  const handleGenerateToken = async () => {
    if (!agentName.trim()) {
      setError('Please enter a name for your agent');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await createAgentToken(agentName);
      setGeneratedToken(result.plainToken);
      setTokenId(result.token.id);
      setCurrentStep('generate');
    } catch (err) {
      console.error('Failed to create token:', err);
      setError('Failed to generate token. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToken = async () => {
    if (generatedToken) {
      await navigator.clipboard.writeText(generatedToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNext = () => {
    if (stepIndex < steps.length - 1) {
      setCurrentStep(steps[stepIndex + 1]);
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) {
      setCurrentStep(steps[stepIndex - 1]);
    }
  };

  const handleFinish = () => {
    navigate('/agents');
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
              index <= stepIndex
                ? 'bg-accent text-white'
                : 'bg-surface-2 text-foreground/40'
            }`}
          >
            {index < stepIndex ? <Check className="w-4 h-4" /> : index + 1}
          </div>
          {index < steps.length - 1 && (
            <div
              className={`w-12 h-0.5 transition-colors ${
                index < stepIndex ? 'bg-accent' : 'bg-surface-2'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 'name':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">Name Your Agent</h2>
            <p className="text-foreground/60">
              Give your OpenClaw agent a friendly name to identify it later.
            </p>

            <div>
              <label htmlFor="agentName" className="block text-sm font-medium text-foreground/80 mb-2">
                Agent Name
              </label>
              <input
                id="agentName"
                type="text"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-surface-1 border border-border text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors"
                placeholder="e.g., Home Server, Work Laptop"
                autoFocus
              />
              <p className="mt-2 text-sm text-foreground/50">
                Examples: "Home Server", "Work Laptop", "Cloud Instance"
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-error/10 text-error text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleGenerateToken}
              disabled={loading || !agentName.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  Generate Token
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        );

      case 'generate':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">Your Pairing Token</h2>
            
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <div className="flex items-start gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-500">Important: Save this token now!</p>
                  <p className="text-sm text-yellow-500/80 mt-1">
                    This token will only be shown once for security reasons. 
                    Copy it now before proceeding.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground/80">
                Pairing Token
              </label>
              <div className="flex gap-2">
                <code className="flex-1 px-4 py-3 rounded-lg bg-surface-2 border border-border text-foreground font-mono text-sm break-all">
                  {generatedToken}
                </code>
                <button
                  onClick={handleCopyToken}
                  className="px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            <button
              onClick={handleNext}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-colors"
            >
              I've Saved the Token
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleBack}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-surface-2 text-foreground font-medium hover:bg-surface-2/80 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          </div>
        );

      case 'configure':
        const agentPrompt = `Install and configure the claw-ui plugin for me with these settings:

- Token ID: ${tokenId}
- Token Secret: ${generatedToken}
- Relay URL: ${RELAY_URL}

Steps:
1. Run: npm install -g @taylorelley/claw-ui-plugin
2. Add the plugin to my OpenClaw config with mode: cloud
3. Set the CLAW_UI_TOKEN environment variable
4. Restart the gateway

Please complete all steps and confirm when done.`;

        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">Configure OpenClaw</h2>
            <p className="text-foreground/60">
              Choose how you'd like to configure your OpenClaw instance.
            </p>

            {/* Tab selector */}
            <div className="flex gap-2 p-1 bg-surface-1 rounded-lg">
              <button
                onClick={() => setConfigMode('agent')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  configMode === 'agent'
                    ? 'bg-accent text-white'
                    : 'text-foreground/60 hover:text-foreground'
                }`}
              >
                🤖 Let OpenClaw Do It
              </button>
              <button
                onClick={() => setConfigMode('manual')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  configMode === 'manual'
                    ? 'bg-accent text-white'
                    : 'text-foreground/60 hover:text-foreground'
                }`}
              >
                ⚙️ Manual Setup
              </button>
            </div>

            {configMode === 'agent' ? (
              <div className="space-y-3">
                <p className="text-sm text-foreground/70">
                  Copy this prompt and send it to your OpenClaw agent. It will handle the installation and configuration for you.
                </p>
                <div className="relative">
                  <pre className="px-4 py-3 pr-12 rounded-lg bg-surface-2 text-foreground font-mono text-sm overflow-x-auto whitespace-pre-wrap">
                    {agentPrompt}
                  </pre>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(agentPrompt);
                      setCopiedPrompt(true);
                      setTimeout(() => setCopiedPrompt(false), 2000);
                    }}
                    className="absolute top-2 right-2 p-2 rounded-md bg-surface-1 hover:bg-surface-2 transition-colors"
                    title="Copy prompt"
                  >
                    {copiedPrompt ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-foreground/60" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-foreground/50">
                  Your agent will install the plugin and configure everything automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-foreground/80 mb-2">
                    1. Configure npm for GitHub Packages:
                  </p>
                  <code className="block px-4 py-3 rounded-lg bg-surface-2 text-foreground font-mono text-sm break-all">
                    echo "@taylorelley:registry=https://npm.pkg.github.com" &gt;&gt; ~/.npmrc
                  </code>
                </div>

                <div>
                  <p className="text-sm font-medium text-foreground/80 mb-2">
                    2. Install the plugin:
                  </p>
                  <code className="block px-4 py-3 rounded-lg bg-surface-2 text-foreground font-mono text-sm">
                    npm install -g @taylorelley/claw-ui-plugin
                  </code>
                </div>

                <div>
                  <p className="text-sm font-medium text-foreground/80 mb-2">
                    3. Set your pairing token as an environment variable:
                  </p>
                  <code className="block px-4 py-3 rounded-lg bg-surface-2 text-foreground font-mono text-sm break-all">
                    export CLAW_UI_TOKEN="{generatedToken}"
                  </code>
                </div>

                <div>
                  <p className="text-sm font-medium text-foreground/80 mb-2">
                    4. Add this to your OpenClaw config (usually <code className="text-accent">~/.openclaw/config.yaml</code>):
                  </p>
                  <pre className="px-4 py-3 rounded-lg bg-surface-2 text-foreground font-mono text-sm overflow-x-auto">
{`# Load the claw-ui plugin
plugins:
  load:
    paths:
      - /usr/lib/node_modules/@taylorelley/claw-ui-plugin

# Configure the channel
channels:
  claw-ui:
    enabled: true
    mode: cloud
    relayUrl: ${RELAY_URL}
    tokenId: "${tokenId || 'your-token-id'}"
    # Token secret is read from CLAW_UI_TOKEN env var`}
                  </pre>
                </div>

                <div>
                  <p className="text-sm font-medium text-foreground/80 mb-2">
                    5. Restart OpenClaw:
                  </p>
                  <code className="block px-4 py-3 rounded-lg bg-surface-2 text-foreground font-mono text-sm">
                    openclaw gateway restart
                  </code>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleNext}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-colors"
              >
                Continue to Verification
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={handleBack}
                className="px-4 py-2.5 rounded-lg bg-surface-2 text-foreground font-medium hover:bg-surface-2/80 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        );

      case 'verify':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">Verify Connection</h2>
            <p className="text-foreground/60">
              Checking if your agent is connected...
            </p>

            <div className={`p-6 rounded-lg border-2 transition-colors ${
              isConnected
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-surface-1 border-border'
            }`}>
              <div className="flex items-center gap-3">
                {verifying ? (
                  <>
                    <Loader2 className="w-8 h-8 animate-spin text-accent" />
                    <div>
                      <p className="font-medium text-foreground">Checking connection...</p>
                      <p className="text-sm text-foreground/60">This may take a moment</p>
                    </div>
                  </>
                ) : isConnected ? (
                  <>
                    <CheckCircle className="w-8 h-8 text-green-500" />
                    <div>
                      <p className="font-medium text-green-500">Agent Connected!</p>
                      <p className="text-sm text-foreground/60">
                        Your agent "{agentName}" is online and ready
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-8 h-8 rounded-full border-2 border-foreground/30 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-foreground/30" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Waiting for connection...</p>
                      <p className="text-sm text-foreground/60">
                        Make sure OpenClaw is running with the configuration
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {!isConnected && (
              <div className="p-4 rounded-lg bg-surface-1 border border-border">
                <p className="text-sm font-medium text-foreground/80 mb-2">Troubleshooting:</p>
                <ul className="text-sm text-foreground/60 space-y-1 list-disc list-inside">
                  <li>Ensure OpenClaw is running</li>
                  <li>Check that the config file is correctly formatted</li>
                  <li>Verify the environment variable is set</li>
                  <li>Check OpenClaw logs for errors: <code className="text-accent">openclaw logs</code></li>
                </ul>
              </div>
            )}

            <div className="flex gap-2">
              {isConnected ? (
                <button
                  onClick={handleFinish}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-colors"
                >
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <>
                  <button
                    onClick={handleFinish}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-surface-2 text-foreground font-medium hover:bg-surface-2/80 transition-colors"
                  >
                    Skip for Now
                  </button>
                  <button
                    onClick={handleBack}
                    className="px-4 py-2.5 rounded-lg bg-surface-2 text-foreground font-medium hover:bg-surface-2/80 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/10 mb-4">
            <span className="text-3xl">🔗</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Setup Your Agent</h1>
          <p className="text-foreground/60 mt-2">
            Connect your OpenClaw instance to Claw UI Cloud
          </p>
        </div>

        {renderStepIndicator()}

        <div className="bg-surface-1 rounded-lg p-6 border border-border">
          {renderStepContent()}
        </div>
      </div>
    </div>
  );
}
