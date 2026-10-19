class TerminalComponent {
  constructor() {
    this.terminalOutput = document.getElementById('terminal-output');
    this.terminalInput = document.getElementById('terminal-input');
    this.terminalExecBtn = document.getElementById('btn-terminal-exec');
    this.trajectoryLog = document.getElementById('trajectory-log');
    this.artifactPreview = document.getElementById('artifact-preview');
    this.artifactTitle = document.getElementById('artifact-title');
    this.btnSaveArtifact = document.getElementById('btn-save-artifact');

    this.currentArtifactPath = null;

    this.marketPlugins = [];
    this.initDrawerTabs();
    this.initTerminal();
    this.initMcpRunner();
    this.initSocketEvents();
    this.initMarketplace();
    this.initQuota();
  }

  initDrawerTabs() {
    const tabs = document.querySelectorAll('.drawer-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => {
          t.classList.remove('active', 'text-cyan-400', 'border-b-2', 'border-cyan-400');
          t.classList.add('text-gray-400');
        });
        tab.classList.add('active', 'text-cyan-400', 'border-b-2', 'border-cyan-400');
        tab.classList.remove('text-gray-400');

        const targetId = tab.getAttribute('data-drawer-tab');
        document.querySelectorAll('.drawer-tab-content').forEach(c => c.classList.add('hidden'));
        const target = document.getElementById(targetId);
        if (target) {
          target.classList.remove('hidden');
          if (targetId === 'drawer-market') {
            this.renderMarketplace();
          } else if (targetId === 'drawer-quota') {
            this.renderQuotaMetrics();
          } else if (targetId === 'drawer-memory') {
            if (window.memoryComp) {
              window.memoryComp.loadBank();
            }
          }
        }
      });
    });

    // Drawer close / toggle
    const btnClose = document.getElementById('btn-close-drawer');
    const btnToggle = document.getElementById('btn-toggle-drawer');
    const drawer = document.getElementById('right-drawer');

    if (btnClose && drawer) {
      btnClose.addEventListener('click', () => drawer.classList.add('hidden'));
    }
    if (btnToggle && drawer) {
      btnToggle.addEventListener('click', () => drawer.classList.toggle('hidden'));
    }

    const btnClear = document.getElementById('btn-clear-terminal');
    if (btnClear && this.terminalOutput) {
      btnClear.addEventListener('click', () => {
        this.terminalOutput.textContent = 'Terminal cleared.\n>_ ';
      });
    }
  }

  async initMarketplace() {
    const searchInput = document.getElementById('drawer-market-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.renderMarketplace(e.target.value);
      });
    }
    try {
      const data = await window.API.fetchMarketPlugins();
      this.marketPlugins = data.plugins || [];
      this.renderMarketplace();
    } catch (e) {
      console.warn('Could not pre-fetch market plugins:', e.message);
    }
  }

  renderMarketplace(filterQuery = '') {
    const container = document.getElementById('drawer-market-list');
    if (!container) return;

    const q = (filterQuery || '').toLowerCase().trim();
    const plugins = this.marketPlugins.filter(p =>
      !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    );

    if (plugins.length === 0) {
      container.innerHTML = `<div class="text-xs text-gray-500 text-center py-6">No matching plugins found in registry</div>`;
      return;
    }

    container.innerHTML = plugins.map(p => `
      <div class="p-2.5 rounded-xl bg-[#090e1c] border border-white/10 hover:border-cyan-500/40 transition flex flex-col space-y-1.5">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-1.5 truncate">
            <span class="font-mono font-bold text-xs text-white">${p.name}</span>
            <span class="text-[10px] text-gray-500 font-mono">v${p.version}</span>
          </div>
          <span class="text-[10px] px-1.5 py-0.2 rounded font-mono ${p.installed ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-gray-800 text-gray-400'}">
            ${p.installed ? 'ACTIVE' : 'AVAILABLE'}
          </span>
        </div>
        <p class="text-[11px] text-gray-400 leading-tight">${p.description}</p>
        <div class="flex items-center justify-between pt-1 border-t border-white/5 text-[10px] text-gray-500">
          <div class="flex items-center space-x-2">
            <span class="text-cyan-400 font-medium">${p.category}</span>
            <span>★ ${p.stars}</span>
          </div>
          <div class="flex items-center space-x-1">
            ${p.installed ? `
              <button onclick="window.app.insertCommand('/${p.name.replace('dsh-', '').replace('deepseek-', '')} ')" class="px-2 py-0.5 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/30 font-mono transition">
                Run /cmd
              </button>
            ` : `
              <button class="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 font-mono transition" onclick="alert('Plugin install initiated for ${p.name}')">
                Install
              </button>
            `}
          </div>
        </div>
      </div>
    `).join('');
  }

  async initQuota() {
    this.renderQuotaMetrics();
  }

  async renderQuotaMetrics() {
    try {
      const data = await window.API.fetchQuotaMetrics();
      const elTokens = document.getElementById('drawer-quota-tokens');
      const elCost = document.getElementById('drawer-quota-cost');
      const elPromptComp = document.getElementById('drawer-quota-prompt-comp');
      const elLatency = document.getElementById('drawer-quota-latency');
      const elAccountEmail = document.getElementById('drawer-account-email');
      const elAccountAuth = document.getElementById('drawer-account-auth');
      const elRpmText = document.getElementById('drawer-quota-rpm-text');
      const elRpmBar = document.getElementById('drawer-quota-rpm-bar');
      const elTpmText = document.getElementById('drawer-quota-tpm-text');
      const elTpmBar = document.getElementById('drawer-quota-tpm-bar');

      if (elTokens && data.totalTokens !== undefined) elTokens.textContent = data.totalTokens.toLocaleString();
      if (elCost && data.estimatedCostUsd !== undefined) elCost.textContent = `$${data.estimatedCostUsd.toFixed(4)} USD`;
      if (elPromptComp && data.promptTokens !== undefined) {
        elPromptComp.textContent = `${data.promptTokens.toLocaleString()} / ${data.completionTokens.toLocaleString()}`;
      }
      if (elLatency && data.averageLatencyMs !== undefined) elLatency.textContent = `${data.averageLatencyMs} ms`;

      if (data.googleAccount) {
        if (elAccountEmail) elAccountEmail.textContent = data.googleAccount.email;
        if (elAccountAuth) elAccountAuth.textContent = data.googleAccount.authType || 'OAuth Personal';
        const topAccountEmail = document.getElementById('account-email');
        if (topAccountEmail) topAccountEmail.textContent = data.googleAccount.email;
      }

      if (data.rateLimits) {
        const rpm = data.rateLimits.rpm || { current: 12, limit: 120 };
        const rpmPct = Math.min(100, Math.round((rpm.current / rpm.limit) * 100));
        if (elRpmText) elRpmText.textContent = `${rpm.current} / ${rpm.limit} (${rpmPct}%)`;
        if (elRpmBar) elRpmBar.style.width = `${Math.max(4, rpmPct)}%`;

        const tpm = data.rateLimits.tpm || { current: 24500, limit: 1000000 };
        const tpmPct = Math.min(100, ((tpm.current / tpm.limit) * 100).toFixed(1));
        if (elTpmText) elTpmText.textContent = `${(tpm.current / 1000).toFixed(1)}k / ${(tpm.limit / 1000000).toFixed(1)}M (${tpmPct}%)`;
        if (elTpmBar) elTpmBar.style.width = `${Math.max(2, tpmPct)}%`;
      }

      // Update top cockpit telemetry
      const topTokens = document.getElementById('metric-tokens');
      const topCost = document.getElementById('metric-cost');
      const topLatency = document.getElementById('metric-latency');
      if (topTokens && data.totalTokens !== undefined) topTokens.textContent = data.totalTokens.toLocaleString();
      if (topCost && data.estimatedCostUsd !== undefined) topCost.textContent = `$${data.estimatedCostUsd.toFixed(4)}`;
      if (topLatency && data.averageLatencyMs !== undefined) topLatency.textContent = `${data.averageLatencyMs}ms`;
    } catch (e) {
      console.warn('Quota fetch failed:', e.message);
    }
  }

  initTerminal() {
    if (!this.terminalInput) return;

    const runCmd = () => {
      const cmd = this.terminalInput.value.trim();
      if (!cmd) return;
      this.appendTerminal(`\n$ ${cmd}\n`);
      this.terminalInput.value = '';

      window.API.runTerminalCommand(cmd).then(res => {
        if (res.stdout) this.appendTerminal(res.stdout + '\n');
        if (res.stderr) this.appendTerminal('[stderr]: ' + res.stderr + '\n');
        if (res.error) this.appendTerminal('[error]: ' + res.error + '\n');
        this.appendTerminal(`[Process finished with exit code ${res.exitCode !== undefined ? res.exitCode : 0}]\n>_ `);
      }).catch(err => {
        this.appendTerminal(`[Command Error]: ${err.message}\n>_ `);
      });
    };

    this.terminalExecBtn.addEventListener('click', runCmd);
    this.terminalInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        runCmd();
      }
    });
  }

  initSocketEvents() {
    window.SocketService.on('terminal_chunk', (data) => {
      this.appendTerminal(data.text);
    });

    window.SocketService.on('*', (event) => {
      this.appendTrajectoryEvent(event);
    });
  }

  appendTerminal(text) {
    if (this.terminalOutput) {
      this.terminalOutput.textContent += text;
      this.terminalOutput.scrollTop = this.terminalOutput.scrollHeight;
    }
  }

  appendTrajectoryEvent(event) {
    if (!this.trajectoryLog) return;
    const item = document.createElement('div');
    item.className = 'p-1.5 rounded bg-black/40 border border-white/5 space-y-0.5';

    const timestamp = new Date().toLocaleTimeString();
    item.innerHTML = `
      <div class="flex items-center justify-between text-[10px]">
        <span class="text-cyan-400 font-bold">${event.type}</span>
        <span class="text-gray-500">${timestamp}</span>
      </div>
      <div class="text-gray-400 truncate text-[10px]">${JSON.stringify(event)}</div>
    `;

    this.trajectoryLog.appendChild(item);
    this.trajectoryLog.scrollTop = this.trajectoryLog.scrollHeight;
  }

  showArtifact(filePath, content, isEditable = true) {
    const drawer = document.getElementById('right-drawer');
    if (drawer) drawer.classList.remove('hidden');

    // Switch to Artifacts tab
    const tabBtn = document.querySelector('[data-drawer-tab="drawer-artifacts"]');
    if (tabBtn) tabBtn.click();

    this.currentArtifactPath = filePath;
    this.artifactTitle.textContent = filePath;
    this.artifactPreview.textContent = content;

    if (isEditable && this.btnSaveArtifact) {
      this.btnSaveArtifact.classList.remove('hidden');
      this.btnSaveArtifact.onclick = async () => {
        try {
          await window.API.saveFile(this.currentArtifactPath, this.artifactPreview.textContent);
          alert('Saved: ' + this.currentArtifactPath);
        } catch (e) {
          alert('Save error: ' + e.message);
        }
      };
    }
  }

  initMcpRunner() {
    const btnInvoke = document.getElementById('btn-mcp-invoke');
    const select = document.getElementById('mcp-tool-select');
    const argsInput = document.getElementById('mcp-tool-args');
    const resultBox = document.getElementById('mcp-tool-result');

    if (!btnInvoke) return;

    btnInvoke.addEventListener('click', async () => {
      const tool = select.value;
      let args = {};
      try {
        args = JSON.parse(argsInput.value);
      } catch (e) {
        resultBox.textContent = `JSON Parse Error in arguments: ${e.message}`;
        return;
      }

      resultBox.textContent = 'Executing tool...';

      if (tool === 'run_command') {
        const res = await window.API.runTerminalCommand(args.CommandLine, args.Cwd);
        resultBox.textContent = JSON.stringify(res, null, 2);
      } else if (tool === 'view_file') {
        try {
          const res = await window.API.fetchFile(args.AbsolutePath || 'package.json');
          resultBox.textContent = JSON.stringify(res, null, 2);
        } catch (e) {
          resultBox.textContent = e.message;
        }
      } else if (tool === 'invoke_subagent') {
        const res = await window.API.spawnSubagent(args.Subagents ? args.Subagents[0] : { Role: 'Tester', Prompt: 'Test' });
        resultBox.textContent = JSON.stringify(res, null, 2);
      } else {
        resultBox.textContent = `Invoked tool ${tool} with arguments: ${JSON.stringify(args, null, 2)}`;
      }
    });
  }
}

window.TerminalComponent = TerminalComponent;
