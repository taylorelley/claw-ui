/**
 * claw-ui OpenClaw Channel Plugin
 * Web chat interface channel for OpenClaw
 * 
 * Follows standard OpenClaw plugin architecture (see telegram, discord, etc.)
 */

import type { ChannelPlugin, OpenClawPluginApi } from "openclaw/plugin-sdk";
import { clawUIPlugin } from "./src/channel.js";
import { setClawUIRuntime } from "./src/runtime.js";

const plugin = {
  id: "claw-ui",
  name: "Claw UI",
  description: "Web chat interface channel for OpenClaw",
  
  configSchema: {
    type: "object",
    properties: {
      enabled: { type: "boolean", default: true },
    },
  },
  
  register(api: OpenClawPluginApi) {
    setClawUIRuntime(api.runtime);
    api.registerChannel({ plugin: clawUIPlugin as ChannelPlugin });
  },
};

export default plugin;
