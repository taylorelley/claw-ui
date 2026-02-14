/**
 * Runtime access for claw-ui plugin
 * 
 * Follows the standard pattern used by official channels:
 * - telegram: getTelegramRuntime()
 * - discord: getDiscordRuntime()
 * - etc.
 */

import type { PluginRuntime } from "openclaw/plugin-sdk";

let runtime: PluginRuntime | null = null;

/**
 * Set the runtime reference (called from plugin register)
 */
export function setClawUIRuntime(r: PluginRuntime): void {
  runtime = r;
}

/**
 * Get the runtime reference
 * Throws if called before plugin registration
 */
export function getClawUIRuntime(): PluginRuntime {
  if (!runtime) {
    throw new Error("claw-ui runtime not initialized - plugin not registered");
  }
  return runtime;
}
