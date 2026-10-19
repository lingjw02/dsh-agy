const { GeminiUsageTracker } = require('../../harness/gemini');

module.exports = {
  name: 'dsh-plugin-quota',
  version: '1.2.0',
  description: 'Gemini & Antigravity token, cost, rate-limit, and model latency tracker.',
  apply(ctx) {
    const fallbackTracker = new GeminiUsageTracker();

    function getCurrentMetrics() {
      if (ctx.agentEngine && ctx.agentEngine.geminiBridge && ctx.agentEngine.geminiBridge.tracker) {
        return ctx.agentEngine.geminiBridge.tracker.getMetrics();
      }
      return fallbackTracker.getMetrics();
    }

    // 1. Register Slash Command: /quota
    ctx.slots.register('composer:command', {
      id: 'cmd-quota',
      name: '/quota',
      description: 'Display real-time Gemini & Antigravity token consumption, estimated cost, and latency metrics',
      category: 'Observability',
      handler: async () => {
        const metrics = getCurrentMetrics();
        return {
          title: '📊 Gemini & Antigravity Quota Telemetry',
          metrics
        };
      }
    });

    // 2. Register Tool: get_quota_metrics
    ctx.tools.register({
      name: 'get_quota_metrics',
      description: 'Returns real-time token counts, estimated cost in USD, and API rate limit usage',
      parameters: {},
      execute: async () => {
        const metrics = getCurrentMetrics();
        return {
          success: true,
          timestamp: new Date().toISOString(),
          ...metrics,
          status: 'healthy'
        };
      }
    });

    // 3. Register Slot: workbench-tab
    ctx.slots.register('workbench-tab', {
      id: 'quota-view',
      title: 'Token & Quota',
      icon: 'gauge',
      category: 'Observability'
    });

    console.log('📊 [dsh-plugin-quota] Activated via Cordis Context (Linked with Gemini Usage Tracker)');
  }
};
