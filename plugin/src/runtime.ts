/**
 * Runtime access for claw-ui plugin
 * Follows the getTelegramRuntime() pattern from standard channels
 */

import type { OpenClawRuntime } from "openclaw/plugin-sdk";

let runtime: OpenClawRuntime | null = null;

export function setClawUIRuntime(r: OpenClawRuntime) {
  runtime = r;
}

export function getClawUIRuntime(): OpenClawRuntime {
  if (!runtime) {
    throw new Error("claw-ui runtime not initialized");
  }
  return runtime;
}
