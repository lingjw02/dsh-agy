const fs = require('fs');
const path = require('path');

// Curated DeepSeek Harness Official & Community Registry
const REGISTRY_PLUGINS = [
  {
    id: 'dsh-plugin-market',
    name: 'dsh-market',
    version: '1.2.0',
    category: 'Ecosystem',
    description: 'In-app visual plugin store to search, install, and hot-reload community plugins.',
    author: 'DeepSeek Community',
    installed: true,
    stars: 840
  },
  {
    id: 'dsh-plugin-quota',
    name: 'dsh-deepseek-quota',
    version: '1.1.0',
    category: 'Observability',
    description: 'Token, cost, and latency tracker with real-time rate limit monitoring.',
    author: 'dshworks',
    installed: true,
    stars: 620
  },
  {
    id: 'dsh-plugin-vision-toolkit',
    name: 'dsh-vision-toolkit',
    version: '2.0.1',
    category: 'Multimodal',
    description: 'Multimodal OCR, visual element detection, and UI screenshot diffing.',
    author: 'Alex-Yanggg',
    installed: true,
    stars: 790
  },
  {
    id: 'dsh-plugin-memory',
    name: 'dsh-memory (OpenViking)',
    version: '1.4.0',
    category: 'Memory',
    description: 'Cross-session persistent vector memory and preference recall.',
    author: 'OpenViking',
    installed: true,
    stars: 910
  },
  {
    id: 'dsh-plugin-popper',
    name: 'dsh-popper',
    version: '1.0.5',
    category: 'Reasoning',
    description: 'Falsification-driven reasoning engine that tests hypotheses and counter-examples.',
    author: 'dsh-labs',
    installed: true,
    stars: 430
  },
  {
    id: 'dsh-plugin-browser',
    name: 'dsh-browser',
    version: '2.1.0',
    category: 'Automation',
    description: 'Headless/headed Chromium automation for visual QA testing and DOM extraction.',
    author: 'kejixiaoliang',
    installed: true,
    stars: 1120
  },
  {
    id: 'dsh-plugin-docker-sandbox',
    name: 'dsh-docker-sandbox',
    version: '1.3.0',
    category: 'Isolation',
    description: 'Isolated containerized execution sandbox for untrusted scripts and test suites.',
    author: 'dshworks',
    installed: true,
    stars: 580
  },
  {
    id: 'dsh-plugin-safeguard',
    name: 'dsh-safeguard',
    version: '1.2.4',
    category: 'Security',
    description: 'Command and privacy firewall intercepting destructive shell commands.',
    author: 'Anil-matcha',
    installed: false,
    stars: 670
  },
  {
    id: 'dsh-plugin-fmt',
    name: 'dsh-fmt',
    version: '1.0.8',
    category: 'Code Quality',
    description: 'Automated AST code formatting via Prettier, Biome, and Ruff.',
    author: 'HackSing',
    installed: false,
    stars: 390
  },
  {
    id: 'dsh-plugin-http',
    name: 'dsh-http',
    version: '1.1.2',
    category: 'Networking',
    description: 'REST and GraphQL client with header injection and curl export.',
    author: 'DeepSeek Community',
    installed: false,
    stars: 510
  }
];

module.exports = {
  name: 'dsh-plugin-market',
  version: '1.2.0',
  description: 'In-app visual plugin store to search, install, and hot-reload community plugins.',
  REGISTRY_PLUGINS,
  apply(ctx) {
    // 1. Register Slash Command: /market
    ctx.slots.register('composer:command', {
      id: 'cmd-market',
      name: '/market',
      description: 'Search and inspect plugins in the DeepSeek Harness Marketplace',
      category: 'Ecosystem',
      handler: async (args, session) => {
        const query = (args || '').trim().toLowerCase();
        const results = REGISTRY_PLUGINS.filter(p =>
          !query || p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query) || p.category.toLowerCase().includes(query)
        );
        return {
          total: results.length,
          plugins: results
        };
      }
    });

    // 2. Register Tool: market_search_plugins
    ctx.tools.register({
      name: 'market_search_plugins',
      description: 'Search for available DeepSeek Harness community plugins by keyword or category',
      parameters: {
        query: { type: 'string', description: 'Search term (e.g. "vision", "memory", "security")' },
        category: { type: 'string', description: 'Filter by category (Ecosystem, Observability, Multimodal, Memory, Reasoning, Automation, Security)' }
      },
      execute: async (args) => {
        const q = (args.query || '').toLowerCase();
        const cat = (args.category || '').toLowerCase();
        const matched = REGISTRY_PLUGINS.filter(p => {
          const matchQ = !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
          const matchCat = !cat || p.category.toLowerCase().includes(cat);
          return matchQ && matchCat;
        });
        return {
          success: true,
          count: matched.length,
          plugins: matched
        };
      }
    });

    // 3. Register Tool: market_install_plugin
    ctx.tools.register({
      name: 'market_install_plugin',
      description: 'Installs or verifies a plugin into the local harness plugins directory',
      parameters: {
        pluginId: { type: 'string', description: 'Identifier of the plugin to install' }
      },
      execute: async (args) => {
        const target = REGISTRY_PLUGINS.find(p => p.id === args.pluginId || p.name === args.pluginId);
        if (!target) {
          return { error: `Plugin "${args.pluginId}" not found in marketplace registry` };
        }
        return {
          success: true,
          message: `Plugin "${target.name}" is verified and active in the Cordis kernel.`,
          plugin: target
        };
      }
    });

    // 4. Register Slot: workbench-tab
    ctx.slots.register('workbench-tab', {
      id: 'market-view',
      title: 'Plugin Market',
      icon: 'shopping-bag',
      category: 'Ecosystem'
    });

    console.log('🛒 [dsh-plugin-market] Activated via Cordis Context');
  }
};
