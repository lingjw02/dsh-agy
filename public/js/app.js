class AntigravityHarnessApp {
  constructor() {
    this.chat = null;
    this.sidebar = null;
    this.input = null;
    this.terminal = null;
    this.plugins = null;
    this.memory = null;
    this.graph = null;

    this.init();
  }

  async init() {
    console.log('Initializing Antigravity Harness UI (DeepSeek Slot Architecture)...');

    // Mount components
    this.chat = new window.ChatComponent();
    this.sidebar = new window.SidebarComponent();
    this.input = new window.InputComponent();
    this.terminal = new window.TerminalComponent();
    this.plugins = new window.PluginsComponent();
    this.memory = new window.MemoryComponent();
    this.graph = new window.GraphComponent();

    window.inputComp = this.input;
    window.pluginsComp = this.plugins;
    window.memoryComp = this.memory;
    window.graphComp = this.graph;
    window.chatComp = this.chat;

    // Fluid Toast Notification System
    window.showToast = (message, type = 'info') => {
      const container = document.getElementById('toast-container');
      if (!container) return;
      const toast = document.createElement('div');
      const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'sparkles';
      const iconColor = type === 'success' ? 'text-emerald-400' : type === 'error' ? 'text-rose-400' : 'text-cyan-400';
      toast.className = 'toast-msg';
      toast.innerHTML = `
        <i data-lucide="${icon}" class="w-4 h-4 ${iconColor} flex-shrink-0"></i>
        <span class="text-xs font-medium text-slate-100">${message}</span>
      `;
      container.appendChild(toast);
      if (window.lucide) window.lucide.createIcons();
      
      setTimeout(() => {
        toast.classList.add('toast-leaving');
        setTimeout(() => toast.remove(), 220);
      }, 2600);
    };

    // Connect WebSocket
    window.SocketService.connect();

    this.initHeaderControls();
    this.initSettingsModal();
    this.handleUrlParams();

    // Render icons
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  handleUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const modal = params.get('modal');
    if (modal === 'graph') {
      this.openGraphModal();
    } else if (modal === 'plugins') {
      this.openModal('modal-plugins');
    } else if (modal === 'settings') {
      this.openModal('modal-settings');
    }

    const drawer = params.get('drawer');
    if (drawer) {
      const tab = document.querySelector(`.drawer-tab[data-drawer-tab="drawer-${drawer}"]`);
      if (tab) tab.click();
    }

    const sidebar = params.get('sidebar');
    if (sidebar) {
      const tab = document.querySelector(`.sidebar-tab[data-tab="tab-${sidebar}"]`);
      if (tab) tab.click();
    }

    if (params.get('simulate') === 'chat' && this.chat) {
      const welcome = document.getElementById('welcome-hero');
      if (welcome) welcome.classList.add('hidden');

      this.chat.renderUserMessage({
        role: 'user',
        content: 'Please explain the Obsidian Cellular Graph architecture and provide a code snippet.',
        command: '/plan',
        mentions: ['graph'],
        timestamp: Date.now()
      });
      this.chat.startAssistantTurn(1);
      this.chat.appendThought('Analyzing knowledge base topology and Cellular Graph schema...\nFound 5 Project Cells and 6 Memory Cells.\nRouting wikilinks [[antigravity-harness]] -> [[adr-001-obsidian-cellular-graph]].');
      this.chat.renderToolCallStart({
        callId: 'call_test_1',
        tool: 'graph_get_topology',
        summary: 'Extract Obsidian cellular network nodes and links',
        args: { includeBacklinks: true }
      });
      this.chat.updateToolCallResult({
        callId: 'call_test_1',
        result: { totalNodes: 11, totalLinks: 15, status: 'synced' }
      });
      this.chat.startResponseStream();
      this.chat.appendResponse(`### 🪐 Cellular Knowledge Graph Overview\n\nThe **Obsidian Cellular Knowledge Graph** treats every project as an autonomous living cell, connected to memory nodes via bidirectional [[antigravity-harness|Antigravity Harness]].\n\n\`\`\`javascript\n// Cellular Graph Topology Engine\nexport function createProjectCell(name, tags = []) {\n  return {\n    id: name.toLowerCase().replace(/\\s+/g, '-'),\n    type: 'project',\n    name,\n    tags,\n    color: '#00f0ff',\n    links: ['adr-001-obsidian-cellular-graph']\n  };\n}\n\`\`\`\n\nYou can explore the live interactive network by clicking the **Obsidian Graph** button above!`);
      this.chat.completeTurn({
        durationSeconds: '1.2',
        stats: { totalTokens: 7240, cost: 0.0022, latency: 380 }
      });
    }
  }

  initHeaderControls() {
    // Model Select
    const modelSelect = document.getElementById('model-select');
    if (modelSelect) {
      modelSelect.addEventListener('change', async (e) => {
        await window.API.saveConfig({ model: e.target.value });
      });
    }

    // Policy Select
    const policySelect = document.getElementById('policy-select');
    if (policySelect) {
      policySelect.addEventListener('change', async (e) => {
        await window.API.saveConfig({ executionPolicy: e.target.value });
      });
    }

    // New Chat
    const btnNewChat = document.getElementById('btn-new-chat');
    if (btnNewChat) {
      btnNewChat.addEventListener('click', () => {
        window.location.reload();
      });
    }

    // Workspace change pill
    const wsPill = document.getElementById('workspace-pill');
    if (wsPill) {
      wsPill.addEventListener('click', () => {
        this.openModal('modal-settings');
      });
    }

    // Google Account & Gemini Link pill
    const accountPill = document.getElementById('account-pill');
    if (accountPill) {
      accountPill.addEventListener('click', () => {
        this.openModal('modal-settings');
      });
    }

    // Passive Guardians Strip click handler
    const guardianStrip = document.getElementById('guardian-strip');
    if (guardianStrip) {
      guardianStrip.addEventListener('click', () => {
        this.openModal('modal-plugins');
        if (window.pluginsComp) {
          window.pluginsComp.setCategory('worker-passive');
        }
      });
    }

    // Top Bar & Drawer Graph Buttons
    const btnTopGraph = document.getElementById('btn-top-open-graph');
    if (btnTopGraph) {
      btnTopGraph.addEventListener('click', () => this.openGraphModal());
    }

    const btnMemGraph = document.getElementById('btn-memory-view-graph');
    if (btnMemGraph) {
      btnMemGraph.addEventListener('click', () => this.openGraphModal());
    }
  }

  initSettingsModal() {
    const btnOpen = document.getElementById('btn-open-settings');
    if (btnOpen) {
      btnOpen.addEventListener('click', async () => {
        await this.syncSettingsValues();
        this.openModal('modal-settings');
      });
    }

    // Gemini API Key Test Button
    const btnTestGemini = document.getElementById('btn-test-gemini');
    if (btnTestGemini) {
      btnTestGemini.addEventListener('click', async () => {
        const keyInput = document.getElementById('setting-gemini-key');
        const resultEl = document.getElementById('gemini-test-result');
        const key = keyInput ? keyInput.value.trim() : '';

        if (resultEl) {
          resultEl.textContent = 'Testing connection to Gemini API...';
          resultEl.className = 'text-[10px] text-cyan-400 mt-1 font-mono';
        }

        try {
          const res = await window.API.testGemini(key);
          if (res.success) {
            if (resultEl) {
              resultEl.textContent = '✅ ' + (res.message || 'Connected to Gemini API successfully!');
              resultEl.className = 'text-[10px] text-emerald-400 mt-1 font-mono font-semibold';
            }
            if (window.showToast) window.showToast('Gemini API Connection Verified!', 'success');
          } else {
            if (resultEl) {
              resultEl.textContent = '⚠️ ' + (res.message || 'Verification note');
              resultEl.className = 'text-[10px] text-amber-400 mt-1 font-mono';
            }
          }
        } catch (err) {
          if (resultEl) {
            resultEl.textContent = '❌ ' + err.message;
            resultEl.className = 'text-[10px] text-rose-400 mt-1 font-mono';
          }
        }
      });
    }

    const btnSave = document.getElementById('btn-save-settings');
    if (btnSave) {
      btnSave.addEventListener('click', async () => {
        const workspace = document.getElementById('setting-workspace')?.value?.trim() || '';
        const geminiKey = document.getElementById('setting-gemini-key')?.value?.trim() || '';
        const model = document.getElementById('setting-model')?.value || '';
        const customEndpoint = document.getElementById('setting-endpoint')?.value?.trim() || '';

        const payload = { workspace };
        if (geminiKey) payload.geminiKey = geminiKey;
        if (model) payload.model = model;
        if (customEndpoint) payload.endpoint = customEndpoint;

        await window.API.saveConfig(payload);

        // Update top bar model select
        const topModelSelect = document.getElementById('model-select');
        if (topModelSelect && model) {
          topModelSelect.value = model;
        }

        if (window.showToast) {
          window.showToast('Gemini & Harness Settings Saved!', 'success');
        } else {
          alert('Settings successfully updated!');
        }

        // Re-render quota telemetry in drawer
        if (this.terminal) {
          this.terminal.renderQuotaMetrics();
        }

        this.closeModal('modal-settings');
      });
    }
  }

  async syncSettingsValues() {
    try {
      const [acc, cfg] = await Promise.all([
        window.API.fetchAccountStatus(),
        window.API.fetchConfig()
      ]);

      const accEmail = document.getElementById('settings-account-email');
      if (accEmail && acc.email) accEmail.textContent = acc.email;

      const topAccEmail = document.getElementById('account-email');
      if (topAccEmail && acc.email) topAccEmail.textContent = acc.email;

      const wsInput = document.getElementById('setting-workspace');
      if (wsInput && cfg.workspace) wsInput.value = cfg.workspace;

      const modelSelect = document.getElementById('setting-model');
      if (modelSelect && cfg.model) modelSelect.value = cfg.model;

      const topModelSelect = document.getElementById('model-select');
      if (topModelSelect && cfg.model) topModelSelect.value = cfg.model;

      const endpointInput = document.getElementById('setting-endpoint');
      if (endpointInput && cfg.endpoint) endpointInput.value = cfg.endpoint;
    } catch (e) {
      console.warn('Failed to sync settings values:', e.message);
    }
  }

  openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('hidden');
  }

  openDrawer(tabName) {
    const drawer = document.getElementById('right-drawer');
    if (drawer) drawer.classList.remove('hidden');
    const tab = document.querySelector(`.drawer-tab[data-drawer-tab="drawer-${tabName}"]`);
    if (tab) tab.click();
  }

  insertCommand(cmd) {
    if (this.input) {
      this.input.insertText(cmd);
    }
  }

  insertSlash() {
    if (this.input) {
      this.input.insertText('/');
    }
  }

  insertMention() {
    if (this.input) {
      this.input.insertText('@');
    }
  }

  insertContextChip(name) {
    if (this.input) {
      this.input.addChip(name);
    }
  }

  openArtifactViewer(filePath, fileName) {
    window.API.fetchFile(filePath).then(data => {
      if (this.terminal) {
        this.terminal.showArtifact(filePath, data.content || JSON.stringify(data.files, null, 2), !data.isDirectory);
      }
    }).catch(err => {
      alert('Error opening file: ' + err.message);
    });
  }

  openGraphModal() {
    this.openModal('modal-graph');
    if (this.graph) {
      this.graph.initCanvasSize();
      this.graph.loadGraph();
      this.graph.centerView();
      setTimeout(() => {
        this.graph.initCanvasSize();
        this.graph.centerView();
      }, 50);
    }
  }

  openGraphAndSelect(nodeId) {
    this.openGraphModal();
    if (this.graph) {
      setTimeout(() => {
        this.graph.initCanvasSize();
        this.graph.loadGraph().then(() => {
          this.graph.jumpToNode(nodeId);
        });
      }, 80);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new AntigravityHarnessApp();
});
