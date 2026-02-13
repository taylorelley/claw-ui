/**
 * claw-ui OpenClaw Channel Plugin
 * Web chat interface channel for OpenClaw
 * 
 * Follows official OpenClaw plugin architecture per:
 * - /docs/tools/plugin.md
 * - /docs/plugins/manifest.md
 */

import type { ChannelPlugin, OpenClawPluginApi } from "openclaw/plugin-sdk";
import { emptyPluginConfigSchema } from "openclaw/plugin-sdk";
import { clawUIPlugin } from "./src/channel.js";
import { setClawUIRuntime } from "./src/runtime.js";

/**
 * Plugin definition following official format:
 * { id, name, description?, configSchema, register(api) }
 */
const plugin = {
  id: "claw-ui",
  name: "Claw UI",
  description: "Web chat interface channel for OpenClaw",
  
  // Config schema for plugins.entries.claw-ui.config
  // Channel config goes under channels.claw-ui (separate from plugin config)
  configSchema: emptyPluginConfigSchema(),
  
  /**
   * Register the plugin with OpenClaw
   * Called once when plugin is loaded
   */
  register(api: OpenClawPluginApi) {
    // Store runtime reference for channel to access
    setClawUIRuntime(api.runtime);
    
    // Register the channel plugin
    api.registerChannel({ plugin: clawUIPlugin as ChannelPlugin });
  },
};

export default plugin;
