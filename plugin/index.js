/**
 * claw-ui OpenClaw Channel Plugin
 * Entry point - registers the channel with OpenClaw
 */

const { ClawUIChannel } = require('./src/channel');

let channelInstance = null;

module.exports = {
  name: 'claw-ui',
  version: '1.0.0',

  async onLoad(runtime) {
    console.log('[claw-ui] Plugin loading...');
    
    // Get channel config from runtime
    const channelConfig = runtime.config?.channels?.['claw-ui'];
    if (!channelConfig) {
      console.log('[claw-ui] No channel config found, plugin will be inactive');
      return;
    }

    if (!channelConfig.enabled) {
      console.log('[claw-ui] Channel disabled in config');
      return;
    }

    // Create and initialize the channel
    channelInstance = new ClawUIChannel(channelConfig, runtime);
    
    // Register with OpenClaw
    if (runtime.registerChannel) {
      runtime.registerChannel('claw-ui', channelInstance);
      console.log('[claw-ui] Channel registered with OpenClaw');
    } else {
      console.warn('[claw-ui] runtime.registerChannel not available');
    }
  },

  async onUnload() {
    console.log('[claw-ui] Plugin unloading...');
    if (channelInstance) {
      await channelInstance.stop();
      channelInstance = null;
    }
  },

  // Expose channel for direct access if needed
  getChannel() {
    return channelInstance;
  }
};
