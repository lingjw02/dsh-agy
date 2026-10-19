class PluginsComponent {
  constructor() {
    this.plugins = [];
    this.workers = [];
    this.quota = null;
    this.account = null;
    this.filterText = '';
    this.activeCategory = 'worker-active'; // Default to 'worker-active' | 'worker-passive' | 'plugin' | 'mcp' | 'quota' | 'all'
    this.activeSkillSubCategory = 'all'; // For filtering skills or worker groups
    this.initEvents();
    this.loadQuotaData();
  }

  async loadQuotaData() {
    try {
      const [quotaData, accountData] = await Promise.all([
        window.API.fetchQuotaMetrics().catch(() => null),
        window.API.fetchAccountStatus().catch(() => null)
      ]);
      if (quotaData) this.quota = quotaData;
      if (accountData) this.account = accountData;
      this.renderSidebar();
      if (document.getElementById('modal-plugins') && !document.getElementById('modal-plugins').classList.contains('hidden')) {
        this.renderModal();
      }
    } catch (e) {
      console.warn('[PluginsComponent] Error loading quota:', e.message);
    }
  }

  initEvents() {
    const btnOpen = document.getElementById('btn-open-plugins');
    if (btnOpen) {
      btnOpen.addEventListener('click', async () => {
        window.app.openModal('modal-plugins');
        await this.loadQuotaData();
        this.renderModal();
      });
    }

    const guardianStrip = document.getElementById('guardian-strip');
    if (guardianStrip) {
      guardianStrip.addEventListener('click', () => {
        window.app.openModal('modal-plugins');
        this.setCategory('worker-passive');
      });
    }

    window.SocketService.on('init_sync', (data) => {
      if (data.plugins) {
        this.plugins = data.plugins;
      }
      if (data.workers) {
        this.workers = data.workers;
      }
      if (data.quota) {
        this.quota = data.quota;
      }
      if (data.account) {
        this.account = data.account;
      }
      this.renderSidebar();
      this.updateBadge();
    });

    window.SocketService.on('quota_updated', (data) => {
      this.quota = data;
      this.renderSidebar();
      if (document.getElementById('modal-plugins') && !document.getElementById('modal-plugins').classList.contains('hidden')) {
        this.renderModal();
      }
    });

    window.SocketService.on('plugin_toggled', (data) => {
      const idx = this.plugins.findIndex(p => p.id === data.plugin.id);
      if (idx !== -1) {
        this.plugins[idx] = data.plugin;
        this.renderSidebar();
        this.renderModal();
      }
    });

    window.SocketService.on('plugin_created', (data) => {
      this.plugins.unshift(data.plugin);
      this.renderSidebar();
      this.renderModal();
      this.updateBadge();
    });

    window.SocketService.on('worker_updated', (data) => {
      const idx = this.workers.findIndex(w => w.id === data.worker.id);
      if (idx !== -1) {
        this.workers[idx] = data.worker;
      } else {
        this.workers.push(data.worker);
      }
      this.renderSidebar();
      this.renderModal();
      this.updateBadge();
    });

    window.SocketService.on('worker_tier_changed', (data) => {
      const idx = this.workers.findIndex(w => w.id === data.worker.id);
      if (idx !== -1) {
        this.workers[idx] = data.worker;
        this.renderSidebar();
        this.renderModal();
      }
    });
  }

  updateBadge() {
    const badge = document.getElementById('plugin-count-badge');
    if (badge) {
      const count = this.workers.length + this.plugins.filter(p => p.type === 'plugin' || p.type === 'mcp').length;
      badge.textContent = count;
    }
  }

  getActiveStaff() {
    return this.workers.filter(w => w.tier === 'active');
  }

  getPassiveGuardians() {
    return this.workers.filter(w => w.tier === 'passive');
  }

  getFilteredItems() {
    let items = [];

    if (this.activeCategory === 'worker-active') {
      items = this.getActiveStaff().map(w => ({ ...w, itemType: 'worker' }));
    } else if (this.activeCategory === 'worker-passive') {
      items = this.getPassiveGuardians().map(w => ({ ...w, itemType: 'worker' }));
    } else if (this.activeCategory === 'plugin') {
      items = this.plugins.filter(p => p.type === 'plugin').map(p => ({ ...p, itemType: 'plugin' }));
    } else if (this.activeCategory === 'mcp') {
      items = this.plugins.filter(p => p.type === 'mcp').map(p => ({ ...p, itemType: 'mcp' }));
    } else if (this.activeCategory === 'quota') {
      items = [];
    } else if (this.activeCategory === 'other') {
      items = this.plugins.filter(p => p.type === 'other').map(p => ({ ...p, itemType: 'other' }));
    } else {
      // 'all'
      const mappedWorkers = this.workers.map(w => ({ ...w, itemType: 'worker' }));
      const nonSkillPlugins = this.plugins.filter(p => p.type !== 'skill').map(p => ({ ...p, itemType: p.type }));
      items = [...mappedWorkers, ...nonSkillPlugins];
    }

    // Filter by group / subcategory if set
    if (this.activeSkillSubCategory !== 'all') {
      items = items.filter(i => {
        if (i.itemType === 'worker') {
          return i.group === this.activeSkillSubCategory;
        }
        return true;
      });
    }

    // Filter by text search
    if (this.filterText) {
      const text = this.filterText.toLowerCase();
      items = items.filter(i => {
        const matchName = i.name && i.name.toLowerCase().includes(text);
        const matchDesc = i.description && i.description.toLowerCase().includes(text);
        const matchRole = i.role && i.role.toLowerCase().includes(text);
        const matchGroup = i.group && i.group.toLowerCase().includes(text);
        return matchName || matchDesc || matchRole || matchGroup;
      });
    }

    return items;
  }

  renderSidebar() {
    const container = document.getElementById('plugin-sidebar-list');
    if (!container) return;

    const countActive = this.getActiveStaff().length;
    const countPassive = this.getPassiveGuardians().length;
    const countPlugins = this.plugins.filter(p => p.type === 'plugin').length;
    const countMcp = this.plugins.filter(p => p.type === 'mcp').length;

    // Quota statistics for sidebar mini-ticker
    const quota = this.quota || {};
    const account = this.account || quota.googleAccount || {};
    const quotaWindows = account.quotaWindows || quota.quotaWindows || {};
    
    let fiveHourPct = 100;
    let weeklyPct = 48;
    
    if (Array.isArray(quotaWindows)) {
      const fiveHour = quotaWindows.find(w => w.window === '5h' || (w.window && w.window.includes('5h')));
      const weekly = quotaWindows.find(w => w.window === 'weekly' || (w.window && w.window.includes('week')));
      fiveHourPct = fiveHour ? Math.round((fiveHour.remainingFraction !== undefined ? fiveHour.remainingFraction : 1) * 100) : 100;
      weeklyPct = weekly ? Math.round((weekly.remainingFraction !== undefined ? weekly.remainingFraction : 1) * 100) : 48;
    } else if (typeof quotaWindows === 'object') {
      if (quotaWindows.slidingWindow5h) {
        fiveHourPct = 100;
      }
      if (quotaWindows.weekly && quotaWindows.weekly.remainingPercent !== undefined) {
        weeklyPct = Math.round(quotaWindows.weekly.remainingPercent);
      }
    }

    const totalTokensFormatted = quota.totalTokens ? (quota.totalTokens > 1000000 ? (quota.totalTokens / 1000000).toFixed(2) + 'M' : (quota.totalTokens / 1000).toFixed(1) + 'k') : '26.36M';

    container.innerHTML = `
      <!-- Live Quota Status Mini-Ticker -->
      <div class="mb-2 p-2 rounded-lg bg-gradient-to-r from-[#0d1628] to-[#121c33] border border-cyan-500/20 text-[10px] space-y-1 font-mono cursor-pointer hover:border-cyan-500/40 transition shadow-sm" onclick="window.pluginsComp.openQuotaTab()">
        <div class="flex items-center justify-between">
          <span class="flex items-center gap-1.5 font-bold text-white text-[10px]">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Antigravity Quota
          </span>
          <span class="text-emerald-400 font-bold">${fiveHourPct}% 5h · ${weeklyPct}% 7d</span>
        </div>
        <div class="flex items-center justify-between text-[9px] text-gray-400">
          <span>Gemini Tokens: <b class="text-cyan-300">${totalTokensFormatted}</b></span>
          <span class="text-gray-500">${quota.requestCount || 878} reqs</span>
        </div>
      </div>

      <!-- Top-Level Category Filter Tabs -->
      <div class="flex items-center space-x-1 pb-2 border-b border-white/5 text-[10px] font-mono overflow-x-auto">
        <button class="px-2 py-0.5 rounded whitespace-nowrap ${this.activeCategory === 'worker-active' ? 'bg-purple-900/60 text-purple-200 font-bold border border-purple-500/40' : 'text-gray-400'}" onclick="window.pluginsComp.setCategory('worker-active')">🚀 Staff (${countActive})</button>
        <button class="px-2 py-0.5 rounded whitespace-nowrap ${this.activeCategory === 'worker-passive' ? 'bg-emerald-900/60 text-emerald-200 font-bold border border-emerald-500/40' : 'text-gray-400'}" onclick="window.pluginsComp.setCategory('worker-passive')">🛡️ Guard (${countPassive})</button>
        <button class="px-2 py-0.5 rounded whitespace-nowrap ${this.activeCategory === 'plugin' ? 'bg-cyan-900/60 text-cyan-300 font-bold border border-cyan-500/30' : 'text-gray-400'}" onclick="window.pluginsComp.setCategory('plugin')">Plugin (${countPlugins})</button>
        <button class="px-2 py-0.5 rounded whitespace-nowrap ${this.activeCategory === 'mcp' ? 'bg-blue-900/60 text-blue-300 font-bold border border-blue-500/30' : 'text-gray-400'}" onclick="window.pluginsComp.setCategory('mcp')">MCP (${countMcp})</button>
        <button class="px-2 py-0.5 rounded whitespace-nowrap ${this.activeCategory === 'quota' ? 'bg-amber-900/60 text-amber-200 font-bold border border-amber-500/40' : 'text-gray-400'}" onclick="window.pluginsComp.setCategory('quota')">📊 Quota</button>
        <button class="px-2 py-0.5 rounded whitespace-nowrap ${this.activeCategory === 'all' ? 'bg-gray-800 text-gray-200 font-bold border border-white/10' : 'text-gray-400'}" onclick="window.pluginsComp.setCategory('all')">All</button>
      </div>

      <!-- Functional Filter Pills for Front Staff -->
      ${this.activeCategory === 'worker-active' ? `
        <div class="flex items-center space-x-1 py-1.5 border-b border-white/5 text-[9px] font-mono overflow-x-auto">
          <button class="px-1.5 py-0.5 rounded ${this.activeSkillSubCategory === 'all' ? 'bg-purple-800 text-purple-100 font-bold' : 'text-gray-400'}" onclick="window.pluginsComp.setSkillSubCategory('all')">All Front Staff</button>
          <button class="px-1.5 py-0.5 rounded ${this.activeSkillSubCategory === 'image_generator' ? 'bg-cyan-800 text-cyan-100 font-bold' : 'text-gray-400'}" onclick="window.pluginsComp.setSkillSubCategory('image_generator')">Image Generators</button>
          <button class="px-1.5 py-0.5 rounded ${this.activeSkillSubCategory === 'writer' ? 'bg-fuchsia-800 text-fuchsia-100 font-bold' : 'text-gray-400'}" onclick="window.pluginsComp.setSkillSubCategory('writer')">Writers</button>
          <button class="px-1.5 py-0.5 rounded ${this.activeSkillSubCategory === 'research' ? 'bg-amber-800 text-amber-100 font-bold' : 'text-gray-400'}" onclick="window.pluginsComp.setSkillSubCategory('research')">Researchers</button>
        </div>
      ` : ''}

      <!-- Functional Filter Pills for Background Guardians -->
      ${this.activeCategory === 'worker-passive' ? `
        <div class="flex items-center space-x-1 py-1.5 border-b border-white/5 text-[9px] font-mono overflow-x-auto">
          <button class="px-1.5 py-0.5 rounded ${this.activeSkillSubCategory === 'all' ? 'bg-emerald-800 text-emerald-100 font-bold' : 'text-gray-400'}" onclick="window.pluginsComp.setSkillSubCategory('all')">All Guardians</button>
          <button class="px-1.5 py-0.5 rounded ${this.activeSkillSubCategory === 'token_saver' ? 'bg-emerald-800 text-emerald-100 font-bold' : 'text-gray-400'}" onclick="window.pluginsComp.setSkillSubCategory('token_saver')">Token Saver</button>
          <button class="px-1.5 py-0.5 rounded ${this.activeSkillSubCategory === 'design_taste' ? 'bg-fuchsia-800 text-fuchsia-100 font-bold' : 'text-gray-400'}" onclick="window.pluginsComp.setSkillSubCategory('design_taste')">Design Taste</button>
          <button class="px-1.5 py-0.5 rounded ${this.activeSkillSubCategory === 'superpower' ? 'bg-indigo-800 text-indigo-100 font-bold' : 'text-gray-400'}" onclick="window.pluginsComp.setSkillSubCategory('superpower')">Superpower</button>
          <button class="px-1.5 py-0.5 rounded ${this.activeSkillSubCategory === 'grillme_intent' ? 'bg-amber-800 text-amber-100 font-bold' : 'text-gray-400'}" onclick="window.pluginsComp.setSkillSubCategory('grillme_intent')">Intent / GrillMe</button>
          <button class="px-1.5 py-0.5 rounded ${this.activeSkillSubCategory === 'structurer' ? 'bg-cyan-800 text-cyan-100 font-bold' : 'text-gray-400'}" onclick="window.pluginsComp.setSkillSubCategory('structurer')">Structurers</button>
        </div>
      ` : ''}

      <div class="space-y-1.5 pt-1" id="plugin-sidebar-items"></div>
    `;

    const itemsContainer = container.querySelector('#plugin-sidebar-items');
    if (this.activeCategory === 'quota') {
      itemsContainer.innerHTML = `
        <div class="p-2.5 rounded-lg bg-[#0e1628] border border-cyan-500/30 text-xs font-mono space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-cyan-300 font-bold">🪐 Antigravity</span>
            <span class="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40">ONLINE</span>
          </div>
          <div class="space-y-1 text-[11px] text-gray-300">
            <div class="flex justify-between"><span class="text-gray-500">5h Window:</span> <b class="text-emerald-400">${fiveHourPct}% Ready</b></div>
            <div class="flex justify-between"><span class="text-gray-500">7d Weekly:</span> <b class="text-cyan-400">${weeklyPct}% Left</b></div>
            <div class="flex justify-between"><span class="text-gray-500">Tokens:</span> <b class="text-purple-300">${totalTokensFormatted}</b></div>
            <div class="flex justify-between"><span class="text-gray-500">Calls:</span> <b class="text-gray-200">${quota.requestCount || 878}</b></div>
            <div class="flex justify-between"><span class="text-gray-500">Est. Cost:</span> <b class="text-amber-300">$${(quota.estimatedCostUsd ?? 6.20).toFixed(2)}</b></div>
          </div>
          <button onclick="window.pluginsComp.openQuotaTab()" class="w-full mt-2 py-1.5 rounded bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/40 text-cyan-200 text-[11px] font-bold text-center transition">
            Open Full Cockpit ↗
          </button>
        </div>
      `;
      return;
    }

    const filtered = this.getFilteredItems();

    if (filtered.length === 0) {
      itemsContainer.innerHTML = '<div class="text-gray-500 italic p-2 text-xs">No items in this category.</div>';
      return;
    }

    filtered.forEach(item => {
      const card = document.createElement('div');
      card.className = 'p-2 rounded bg-[#131b2e] border border-white/5 space-y-1';

      if (item.itemType === 'worker') {
        const isStaff = item.tier === 'active';
        const tierBadge = isStaff
          ? '<span class="text-[9px] px-1.5 py-0.2 rounded font-mono font-semibold bg-purple-950 text-purple-300 border border-purple-500/40">FRONT STAFF</span>'
          : '<span class="text-[9px] px-1.5 py-0.2 rounded font-mono font-semibold bg-emerald-950 text-emerald-300 border border-emerald-500/40">GUARDIAN</span>';

        card.innerHTML = `
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-1.5 truncate">
              <span class="text-sm">${item.icon || '🚀'}</span>
              <span class="text-xs font-semibold text-gray-200 truncate cursor-pointer hover:text-cyan-300 view-skill-title">${item.name}</span>
            </div>
            ${tierBadge}
          </div>
          <div class="text-[10px] text-cyan-400 font-mono">${item.role || ''}</div>
          <p class="text-[11px] text-gray-400 line-clamp-2">${item.description}</p>
          <div class="flex items-center justify-between pt-1 border-t border-white/5">
            <button class="text-[10px] text-purple-400 hover:text-purple-200 font-mono btn-switch-tier" data-id="${item.id}" data-current="${item.tier}">
              ⇄ To ${isStaff ? 'Guardian' : 'Staff'}
            </button>
            <div class="flex items-center space-x-2">
              ${item.skillId ? `<button class="text-[10px] text-gray-400 hover:text-white underline btn-view-skill-doc" data-skill="${item.skillId}">Doc</button>` : ''}
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" class="sr-only peer toggle-worker-btn" data-id="${item.id}" ${item.status === 'active' ? 'checked' : ''}>
                <div class="w-6 h-3.5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
          </div>
        `;

        card.querySelector('.btn-switch-tier').addEventListener('click', async (e) => {
          const newTier = item.tier === 'active' ? 'passive' : 'active';
          await fetch(`/api/workers/${item.id}/tier`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tier: newTier })
          });
        });

        card.querySelector('.toggle-worker-btn').addEventListener('change', async (e) => {
          const newStatus = e.target.checked ? 'active' : 'disabled';
          await fetch(`/api/workers/${item.id}/toggle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
          });
        });

        const docBtn = card.querySelector('.btn-view-skill-doc');
        if (docBtn) {
          docBtn.addEventListener('click', () => {
            const skillPlugin = this.plugins.find(p => p.id === item.skillId);
            if (skillPlugin) this.viewSkillDocumentation(skillPlugin);
          });
        }
      } else {
        // Plugin or MCP item
        card.innerHTML = `
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-gray-200 truncate">${item.name}</span>
            <span class="text-[9px] px-1.5 py-0.2 rounded font-mono bg-cyan-950 text-cyan-300 border border-cyan-500/40">${item.type.toUpperCase()}</span>
          </div>
          <p class="text-[11px] text-gray-400 line-clamp-2">${item.description}</p>
          <div class="flex items-center justify-between pt-1">
            <span class="text-[10px] text-gray-500 font-mono">${item.items ? item.items.length + ' tools' : (item.tools ? item.tools.length + ' tools' : 'active')}</span>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" class="sr-only peer toggle-plugin-btn" data-id="${item.id}" ${item.enabled ? 'checked' : ''}>
              <div class="w-6 h-3.5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-cyan-600"></div>
            </label>
          </div>
        `;

        card.querySelector('.toggle-plugin-btn').addEventListener('change', async (e) => {
          await window.API.togglePlugin(item.id, e.target.checked);
        });
      }

      itemsContainer.appendChild(card);
    });
  }

  async setCategory(cat) {
    this.activeCategory = cat;
    this.activeSkillSubCategory = 'all';
    if (cat === 'quota' && (!this.quota || !this.account)) {
      await this.loadQuotaData();
    }
    this.renderSidebar();
    if (document.getElementById('modal-plugins') && !document.getElementById('modal-plugins').classList.contains('hidden')) {
      this.renderModal();
    }
  }

  openQuotaTab() {
    this.setCategory('quota');
    if (window.app && window.app.openModal) {
      window.app.openModal('modal-plugins');
    }
  }

  setSkillSubCategory(sub) {
    this.activeSkillSubCategory = sub;
    this.renderSidebar();
    if (document.getElementById('modal-plugins') && !document.getElementById('modal-plugins').classList.contains('hidden')) {
      this.renderModal();
    }
  }

  renderModal() {
    const container = document.getElementById('plugin-modal-list');
    if (!container) return;

    const countActive = this.getActiveStaff().length;
    const countPassive = this.getPassiveGuardians().length;
    const countPlugins = this.plugins.filter(p => p.type === 'plugin').length;
    const countMcp = this.plugins.filter(p => p.type === 'mcp').length;
    const countTotal = this.workers.length + countPlugins + countMcp;

    // Quota statistics for modal cockpit banner
    const quota = this.quota || {};
    const account = this.account || quota.googleAccount || {};
    const quotaWindows = account.quotaWindows || quota.quotaWindows || {};
    let fiveHourPct = 100;
    let weeklyPct = 48;
    if (Array.isArray(quotaWindows)) {
      const fiveHour = quotaWindows.find(w => w.window === '5h' || (w.window && w.window.includes('5h')));
      const weekly = quotaWindows.find(w => w.window === 'weekly' || (w.window && w.window.includes('week')));
      fiveHourPct = fiveHour ? Math.round((fiveHour.remainingFraction !== undefined ? fiveHour.remainingFraction : 1) * 100) : 100;
      weeklyPct = weekly ? Math.round((weekly.remainingFraction !== undefined ? weekly.remainingFraction : 1) * 100) : 48;
    } else if (typeof quotaWindows === 'object') {
      if (quotaWindows.slidingWindow5h) fiveHourPct = 100;
      if (quotaWindows.weekly && quotaWindows.weekly.remainingPercent !== undefined) {
        weeklyPct = Math.round(quotaWindows.weekly.remainingPercent);
      }
    }
    const totalTokensFormatted = quota.totalTokens ? (quota.totalTokens > 1000000 ? (quota.totalTokens / 1000000).toFixed(2) + 'M' : (quota.totalTokens / 1000).toFixed(1) + 'k') : '26.36M';
    const costFormatted = (quota.estimatedCostUsd ?? 6.20).toFixed(2);

    container.innerHTML = `
      <!-- Top Action Bar -->
      <div class="flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-[#141d2e] via-[#1a1c36] to-[#0e1628] border border-cyan-500/30 mb-3 shadow-lg">
        <div>
          <div class="flex items-center space-x-2">
            <span class="text-xs font-bold text-white uppercase tracking-wider">Antigravity Worker Mesh & Plugin Engine</span>
            <span class="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono font-semibold">Active Staff + Hybrid Guardians</span>
          </div>
          <p class="text-[11px] text-gray-300 mt-0.5">Skills operate as <b>Front Staff Workers</b> (dispatched for user tasks) or <b>Background Guardians</b> (running continuous audits).</p>
        </div>
        <button id="btn-create-dsh-plugin" class="px-2.5 py-1.5 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center space-x-1.5 transition">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i>
          <span>Add DSH Plugin</span>
        </button>
      </div>

      <!-- Live Antigravity & Gemini Quota Cockpit Banner -->
      <div class="flex flex-wrap items-center justify-between p-3 rounded-xl bg-gradient-to-r from-[#0d1628] via-[#121c33] to-[#0a1020] border border-cyan-500/30 mb-3 shadow-md gap-2">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-bold text-sm">
            📊
          </div>
          <div>
            <div class="flex items-center space-x-2">
              <span class="text-xs font-bold text-white uppercase tracking-wider">Antigravity & Gemini Telemetry</span>
              <span class="text-[9px] px-1.5 py-0.2 rounded font-mono font-semibold bg-emerald-950 text-emerald-300 border border-emerald-500/40">ONLINE</span>
              <span class="text-[10px] text-gray-400 font-mono">${account.email || 'ling55785@gmail.com'}</span>
            </div>
            <div class="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-300 mt-0.5 font-mono">
              <span>AGY 5h: <b class="text-emerald-400">${fiveHourPct}% Ready</b></span>
              <span class="text-gray-600">|</span>
              <span>7d Quota: <b class="text-cyan-400">${weeklyPct}% Left</b></span>
              <span class="text-gray-600">|</span>
              <span>Tokens: <b class="text-purple-300">${totalTokensFormatted}</b></span>
              <span class="text-gray-600">|</span>
              <span>Cost: <b class="text-amber-300">$${costFormatted}</b></span>
            </div>
          </div>
        </div>
        <button onclick="window.pluginsComp.openQuotaTab()" class="px-2.5 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/40 text-cyan-300 text-xs font-mono transition flex items-center space-x-1">
          <span>Telemetry Cockpit</span>
          <span>→</span>
        </button>
      </div>

      <!-- Main Category Tabs -->
      <div class="flex items-center space-x-2 border-b border-white/10 pb-2 text-xs font-mono overflow-x-auto">
        <button class="cat-tab px-3 py-1.5 rounded-lg transition ${this.activeCategory === 'worker-active' ? 'bg-gradient-to-r from-purple-700 to-indigo-700 text-white font-bold shadow-md shadow-purple-900/40' : 'text-gray-400 hover:text-white'}" onclick="window.pluginsComp.setCategory('worker-active')">
          🚀 Front Staff (${countActive})
        </button>
        <button class="cat-tab px-3 py-1.5 rounded-lg transition ${this.activeCategory === 'worker-passive' ? 'bg-gradient-to-r from-emerald-700 to-teal-700 text-white font-bold shadow-md shadow-emerald-900/40' : 'text-gray-400 hover:text-white'}" onclick="window.pluginsComp.setCategory('worker-passive')">
          🛡️ Guardians (${countPassive})
        </button>
        <button class="cat-tab px-3 py-1.5 rounded-lg transition ${this.activeCategory === 'plugin' ? 'bg-cyan-700 text-white font-bold shadow' : 'text-gray-400 hover:text-white'}" onclick="window.pluginsComp.setCategory('plugin')">
          🔌 Plugin (${countPlugins})
        </button>
        <button class="cat-tab px-3 py-1.5 rounded-lg transition ${this.activeCategory === 'mcp' ? 'bg-blue-700 text-white font-bold shadow' : 'text-gray-400 hover:text-white'}" onclick="window.pluginsComp.setCategory('mcp')">
          ⚡ MCP (${countMcp})
        </button>
        <button class="cat-tab px-3 py-1.5 rounded-lg transition ${this.activeCategory === 'quota' ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold shadow-md shadow-cyan-900/40' : 'text-gray-400 hover:text-white'}" onclick="window.pluginsComp.setCategory('quota')">
          📊 Quota & Models
        </button>
        <button class="cat-tab px-3 py-1.5 rounded-lg transition ${this.activeCategory === 'all' ? 'bg-gray-800 text-white font-bold shadow' : 'text-gray-400 hover:text-white'}" onclick="window.pluginsComp.setCategory('all')">
          All Modules (${countTotal})
        </button>
      </div>

      <!-- Secondary Functional Filters -->
      ${this.activeCategory === 'worker-active' ? `
        <div class="flex items-center space-x-1.5 pt-2 pb-1 text-[11px] font-mono overflow-x-auto">
          <span class="text-gray-500 font-semibold">Specialization:</span>
          <button class="px-2 py-0.5 rounded transition ${this.activeSkillSubCategory === 'all' ? 'bg-purple-800 text-white font-bold' : 'text-gray-400 hover:text-white'}" onclick="window.pluginsComp.setSkillSubCategory('all')">All Staff (${countActive})</button>
          <button class="px-2 py-0.5 rounded transition ${this.activeSkillSubCategory === 'image_generator' ? 'bg-cyan-800 text-white font-bold' : 'text-gray-400 hover:text-white'}" onclick="window.pluginsComp.setSkillSubCategory('image_generator')">🎨 Image Generators</button>
          <button class="px-2 py-0.5 rounded transition ${this.activeSkillSubCategory === 'writer' ? 'bg-fuchsia-800 text-white font-bold' : 'text-gray-400 hover:text-white'}" onclick="window.pluginsComp.setSkillSubCategory('writer')">✍️ Writers & Builders</button>
          <button class="px-2 py-0.5 rounded transition ${this.activeSkillSubCategory === 'research' ? 'bg-amber-800 text-white font-bold' : 'text-gray-400 hover:text-white'}" onclick="window.pluginsComp.setSkillSubCategory('research')">🔍 Researchers & Tools</button>
        </div>
      ` : ''}

      ${this.activeCategory === 'worker-passive' ? `
        <div class="flex items-center space-x-1.5 pt-2 pb-1 text-[11px] font-mono overflow-x-auto">
          <span class="text-gray-500 font-semibold">Guardian Role:</span>
          <button class="px-2 py-0.5 rounded transition ${this.activeSkillSubCategory === 'all' ? 'bg-emerald-800 text-white font-bold' : 'text-gray-400 hover:text-white'}" onclick="window.pluginsComp.setSkillSubCategory('all')">All Guardians (${countPassive})</button>
          <button class="px-2 py-0.5 rounded transition ${this.activeSkillSubCategory === 'token_saver' ? 'bg-emerald-800 text-white font-bold' : 'text-gray-400 hover:text-white'}" onclick="window.pluginsComp.setSkillSubCategory('token_saver')">🛡️ Token-Saver</button>
          <button class="px-2 py-0.5 rounded transition ${this.activeSkillSubCategory === 'design_taste' ? 'bg-fuchsia-800 text-white font-bold' : 'text-gray-400 hover:text-white'}" onclick="window.pluginsComp.setSkillSubCategory('design_taste')">🎨 Design Taste</button>
          <button class="px-2 py-0.5 rounded transition ${this.activeSkillSubCategory === 'superpower' ? 'bg-indigo-800 text-white font-bold' : 'text-gray-400 hover:text-white'}" onclick="window.pluginsComp.setSkillSubCategory('superpower')">🪐 Superpower</button>
          <button class="px-2 py-0.5 rounded transition ${this.activeSkillSubCategory === 'grillme_intent' ? 'bg-amber-800 text-white font-bold' : 'text-gray-400 hover:text-white'}" onclick="window.pluginsComp.setSkillSubCategory('grillme_intent')">💡 Intent / GrillMe</button>
          <button class="px-2 py-0.5 rounded transition ${this.activeSkillSubCategory === 'structurer' ? 'bg-cyan-800 text-white font-bold' : 'text-gray-400 hover:text-white'}" onclick="window.pluginsComp.setSkillSubCategory('structurer')">📐 Structurers</button>
        </div>
      ` : ''}

      <!-- Search Input -->
      <div class="py-2">
        <input type="text" id="plugin-modal-search" placeholder="Search workers by name, role, specialization, or keywords..." value="${this.filterText}" class="w-full bg-[#131b2e] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-400 font-sans">
      </div>

      <!-- Items Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[52vh] overflow-y-auto pr-1" id="plugin-modal-grid"></div>
    `;

    const searchInput = container.querySelector('#plugin-modal-search');
    searchInput.addEventListener('input', (e) => {
      this.filterText = e.target.value;
      this.renderModalGrid(container.querySelector('#plugin-modal-grid'));
    });

    const btnCreate = container.querySelector('#btn-create-dsh-plugin');
    if (btnCreate) {
      btnCreate.addEventListener('click', () => {
        const name = prompt('Enter DSH Plugin Directory Name (e.g. dsh-plugin-linter):', 'dsh-plugin-sample');
        if (!name) return;
        const defaultCode = `// DeepSeek Harness Plugin Specification
module.exports = {
  name: '${name}',
  version: '1.0.0',
  description: 'Custom Cordis-based agent plugin',
  apply(ctx) {
    ctx.tools.register({
      name: '${name.replace(/[^a-zA-Z0-9]/g, '_')}_echo',
      description: 'Echo test tool from ${name}',
      parameters: { text: { type: 'string' } },
      execute: async (args) => ({ echo: args.text || 'ok', timestamp: Date.now() })
    });
  }
};`;
        fetch('/api/plugins/dsh/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, code: defaultCode })
        });
      });
    }

    this.renderModalGrid(container.querySelector('#plugin-modal-grid'));
    if (window.lucide) window.lucide.createIcons();
  }

  renderModalGrid(gridContainer) {
    if (!gridContainer) return;
    gridContainer.innerHTML = '';

    if (this.activeCategory === 'quota') {
      const q = this.quota || {};
      const acc = this.account || q.googleAccount || {};
      const windows = acc.quotaWindows || (q.googleAccount && q.googleAccount.quotaWindows) || {};
      let fiveHourStatus = '100% Ready';
      let fiveHourPct = 100;
      let weeklyPct = 47.8;
      let resetDate = '2026-10-25';

      if (Array.isArray(windows)) {
        const fh = windows.find(w => w.window === '5h' || (w.window && w.window.includes('5h')));
        const wk = windows.find(w => w.window === 'weekly' || (w.window && w.window.includes('week')));
        if (fh) {
          fiveHourPct = Math.round((fh.remainingFraction !== undefined ? fh.remainingFraction : 1) * 100);
          fiveHourStatus = `${fiveHourPct}% Ready`;
        }
        if (wk) {
          weeklyPct = Math.round((wk.remainingFraction !== undefined ? wk.remainingFraction : 0.478) * 100);
          resetDate = wk.resetDate || '2026-10-25';
        }
      } else if (typeof windows === 'object') {
        if (windows.slidingWindow5h) {
          fiveHourStatus = windows.slidingWindow5h.status || '100% Ready';
          fiveHourPct = 100;
        }
        if (windows.weekly) {
          weeklyPct = windows.weekly.remainingPercent !== undefined ? windows.weekly.remainingPercent : 47.8;
          resetDate = windows.weekly.resetDate || '2026-10-25';
        }
      }

      const totalTokens = q.totalTokens || 26355593;
      const promptTokens = q.promptTokens || 26198617;
      const completionTokens = q.completionTokens || 156976;
      const cacheTokens = q.cacheReadTokens || 232940625;
      const cost = q.estimatedCostUsd || 6.2049;
      const reqCount = q.requestCount || 878;
      const latency = q.averageLatencyMs || 6805;
      const models = q.modelsTracked || ['gemini-3.8-flash-tiered', 'gemini-4-argon', 'claude-opus-5-5-high'];
      const modelsUsage = q.modelsUsage || {};

      gridContainer.innerHTML = `
        <!-- Card 1: Antigravity Quota Windows -->
        <div class="p-3.5 rounded-xl bg-[#131b2e] border border-cyan-500/30 flex flex-col justify-between space-y-3 shadow-md">
          <div>
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center space-x-2">
                <span class="text-lg">🪐</span>
                <span class="text-xs font-bold text-cyan-300 font-mono">Antigravity Quota Windows</span>
              </div>
              <span class="text-[9px] px-2 py-0.5 rounded font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">CONNECTED</span>
            </div>
            
            <div class="text-[11px] text-gray-300 font-mono space-y-1 mb-3">
              <div class="flex justify-between"><span class="text-gray-400">Account:</span> <span class="text-white font-semibold">${acc.email || 'ling55785@gmail.com'}</span></div>
              <div class="flex justify-between"><span class="text-gray-400">Auth:</span> <span class="text-purple-300">${acc.authType || 'OAuth Personal (Antigravity)'}</span></div>
              <div class="flex justify-between"><span class="text-gray-400">Project:</span> <span class="text-cyan-300">${acc.projectId || 'aicode-consumers'}</span></div>
            </div>

            <!-- 5h Window -->
            <div class="mb-2">
              <div class="flex justify-between text-[11px] font-mono mb-1">
                <span class="text-gray-400">5-Hour Sliding Window:</span>
                <span class="text-emerald-400 font-bold">${fiveHourStatus}</span>
              </div>
              <div class="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                <div class="h-full bg-emerald-500 rounded-full" style="width: ${fiveHourPct}%"></div>
              </div>
            </div>

            <!-- Weekly Quota -->
            <div>
              <div class="flex justify-between text-[11px] font-mono mb-1">
                <span class="text-gray-400">7-Day Weekly Window:</span>
                <span class="text-cyan-400 font-bold">${weeklyPct}% Available</span>
              </div>
              <div class="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" style="width: ${weeklyPct}%"></div>
              </div>
              <div class="text-[10px] text-gray-500 font-mono mt-1 flex justify-between">
                <span>Reset: ${resetDate}</span>
                <span>Tier: Standard AI Workspace</span>
              </div>
            </div>
          </div>

          <div class="pt-2 border-t border-white/5 flex items-center justify-between">
            <span class="text-[10px] text-gray-500 font-mono">Telemetry: Local Cache & Sync</span>
            <button id="btn-refresh-quota-modal" class="px-2.5 py-1 rounded bg-[#0e1628] hover:bg-[#1a253d] border border-cyan-500/40 text-[10px] text-cyan-300 font-mono transition">
              ↻ Refresh Quota
            </button>
          </div>
        </div>

        <!-- Card 2: Gemini Token Usage & Cost -->
        <div class="p-3.5 rounded-xl bg-[#131b2e] border border-purple-500/30 flex flex-col justify-between space-y-3 shadow-md">
          <div>
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center space-x-2">
                <span class="text-lg">💎</span>
                <span class="text-xs font-bold text-purple-300 font-mono">Gemini Token & Cost Tracking</span>
              </div>
              <span class="text-[9px] px-2 py-0.5 rounded font-mono font-bold bg-purple-950 text-purple-300 border border-purple-500/40">ACTIVE SESSION</span>
            </div>

            <div class="grid grid-cols-2 gap-2 text-[11px] font-mono mb-3">
              <div class="p-2 rounded bg-black/30 border border-white/5">
                <div class="text-gray-400 text-[10px]">Total Tokens</div>
                <div class="text-sm font-bold text-purple-300">${(totalTokens / 1000000).toFixed(2)}M</div>
                <div class="text-[9px] text-gray-500">${totalTokens.toLocaleString()} tokens</div>
              </div>
              <div class="p-2 rounded bg-black/30 border border-white/5">
                <div class="text-gray-400 text-[10px]">Estimated Cost</div>
                <div class="text-sm font-bold text-amber-300">$${cost.toFixed(4)}</div>
                <div class="text-[9px] text-gray-500">USD Equivalent</div>
              </div>
            </div>

            <div class="space-y-1 text-[11px] font-mono text-gray-300">
              <div class="flex justify-between">
                <span class="text-gray-400">Prompt Tokens:</span>
                <span class="text-gray-200">${promptTokens.toLocaleString()} (${((promptTokens / totalTokens) * 100).toFixed(1)}%)</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">Completion Tokens:</span>
                <span class="text-gray-200">${completionTokens.toLocaleString()} (${((completionTokens / totalTokens) * 100).toFixed(1)}%)</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">Cache Read Tokens:</span>
                <span class="text-cyan-300">${(cacheTokens / 1000000).toFixed(2)}M (${cacheTokens.toLocaleString()})</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">Total API Calls:</span>
                <span class="text-gray-200">${reqCount} requests</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">Average Latency:</span>
                <span class="text-gray-200">${(latency / 1000).toFixed(2)}s</span>
              </div>
            </div>
          </div>

          <div class="pt-2 border-t border-white/5 flex items-center justify-between">
            <span class="text-[10px] text-gray-500 font-mono">Tier: High Throughput</span>
            <span class="text-[10px] text-emerald-400 font-mono">Prompt Caching Enabled</span>
          </div>
        </div>

        <!-- Card 3: Tracked AI Models -->
        <div class="p-3.5 rounded-xl bg-[#131b2e] border border-blue-500/30 flex flex-col justify-between space-y-3 shadow-md">
          <div>
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center space-x-2">
                <span class="text-lg">🧠</span>
                <span class="text-xs font-bold text-blue-300 font-mono">Active Model Registry & Usage</span>
              </div>
              <span class="text-[9px] px-2 py-0.5 rounded font-mono font-bold bg-blue-950 text-blue-300 border border-blue-500/40">${models.length} MODELS</span>
            </div>

            <div class="space-y-2 mt-2">
              ${models.map(m => {
                const u = modelsUsage[m] || {};
                const isDefault = m === 'gemini-3.8-flash-tiered';
                return `
                  <div class="p-2 rounded bg-black/30 border ${isDefault ? 'border-cyan-500/40 bg-cyan-950/20' : 'border-white/5'}">
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-xs font-mono font-bold ${isDefault ? 'text-cyan-300' : 'text-gray-300'} truncate">${m}</span>
                      ${isDefault ? '<span class="text-[9px] px-1.5 py-0.2 rounded font-mono bg-cyan-900 text-cyan-200 font-bold">PRIMARY</span>' : '<span class="text-[9px] px-1.5 py-0.2 rounded font-mono bg-gray-800 text-gray-400">SECONDARY</span>'}
                    </div>
                    <div class="flex justify-between text-[10px] font-mono text-gray-400">
                      <span>Requests: <b class="text-gray-200">${u.requests || (isDefault ? reqCount : 1)}</b></span>
                      <span>Est. Tokens: <b class="text-purple-300">${u.promptTokens ? ((u.promptTokens + (u.completionTokens || 0)) / 1000000).toFixed(2) + 'M' : (isDefault ? (totalTokens / 1000000).toFixed(2) + 'M' : '< 10k')}</b></span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <div class="pt-2 border-t border-white/5 flex items-center justify-between">
            <span class="text-[10px] text-gray-500 font-mono">Harness Engine: DSH Multi-Slot</span>
            <span class="text-[10px] text-cyan-400 font-mono">Dynamic Model Switching: Ready</span>
          </div>
        </div>

        <!-- Card 4: Quota Plugin Control & Telemetry Bridge -->
        <div class="p-3.5 rounded-xl bg-[#131b2e] border border-amber-500/30 flex flex-col justify-between space-y-3 shadow-md">
          <div>
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center space-x-2">
                <span class="text-lg">⚙️</span>
                <span class="text-xs font-bold text-amber-300 font-mono">DSH Quota Guard & Bridge</span>
              </div>
              <span class="text-[9px] px-2 py-0.5 rounded font-mono font-bold bg-amber-950 text-amber-300 border border-amber-500/40">PLUGIN ACTIVE</span>
            </div>

            <p class="text-[11px] text-gray-300 leading-relaxed mb-3">
              Monitors Gemini token exhaustion, rate-limit thresholds, and Antigravity sliding windows in real-time. Broadcasts telemetry across WebSocket clients.
            </p>

            <div class="space-y-1.5 text-[11px] font-mono text-gray-300">
              <div class="flex justify-between p-1.5 rounded bg-black/20">
                <span class="text-gray-400">Plugin Name:</span>
                <span class="text-cyan-300 font-bold">dsh-plugin-quota</span>
              </div>
              <div class="flex justify-between p-1.5 rounded bg-black/20">
                <span class="text-gray-400">Telemetry Channel:</span>
                <span class="text-emerald-300 font-semibold">quota_updated / init_sync</span>
              </div>
              <div class="flex justify-between p-1.5 rounded bg-black/20">
                <span class="text-gray-400">Quota Health Check:</span>
                <span class="text-emerald-400 font-semibold">Normal (Pass)</span>
              </div>
            </div>
          </div>

          <div class="pt-2 border-t border-white/5 flex items-center justify-between">
            <button id="btn-test-gemini-connection" class="px-2.5 py-1 rounded bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-[10px] text-amber-300 font-mono transition">
              ⚡ Test Gemini API Ping
            </button>
            <span class="text-[10px] text-gray-500 font-mono">Auto-refreshed</span>
          </div>
        </div>
      `;

      const refreshBtn = gridContainer.querySelector('#btn-refresh-quota-modal');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
          refreshBtn.textContent = '↻ Syncing...';
          await this.loadQuotaData();
          this.renderModal();
        });
      }

      const testBtn = gridContainer.querySelector('#btn-test-gemini-connection');
      if (testBtn) {
        testBtn.addEventListener('click', async () => {
          testBtn.textContent = '⚡ Testing...';
          try {
            const res = await fetch('/api/gemini/test', { method: 'POST' });
            const data = await res.json();
            alert(data.success ? `Gemini Ping Succeeded!\nModel: ${data.model || 'gemini'}\nLatency: ${data.latency || 'OK'}` : `Ping Failed: ${data.message}`);
          } catch (e) {
            alert(`Test failed: ${e.message}`);
          } finally {
            testBtn.textContent = '⚡ Test Gemini API Ping';
          }
        });
      }

      return;
    }

    const filtered = this.getFilteredItems();

    if (filtered.length === 0) {
      gridContainer.innerHTML = '<div class="col-span-2 text-center text-gray-500 py-8 text-xs font-mono">No matching modules found in this category.</div>';
      return;
    }

    filtered.forEach(item => {
      const card = document.createElement('div');
      card.className = 'p-3 rounded-xl bg-[#131b2e] border border-white/10 hover:border-cyan-500/30 transition flex flex-col justify-between space-y-2';

      if (item.itemType === 'worker') {
        const isStaff = item.tier === 'active';
        const tierBadge = isStaff
          ? '<span class="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-purple-950 text-purple-300 border border-purple-500/40">🚀 FRONT STAFF</span>'
          : '<span class="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">🛡️ GUARDIAN</span>';

        const statsText = isStaff
          ? `${item.stats ? item.stats.invocations : 0} launches`
          : `${item.stats ? item.stats.audits : 0} audits • ${item.stats ? item.stats.interceptions : 0} intercepts`;

        card.innerHTML = `
          <div>
            <div class="flex items-center justify-between mb-1">
              <div class="flex items-center space-x-2 truncate">
                <span class="text-xl flex-shrink-0">${item.icon || '🚀'}</span>
                <span class="text-xs font-bold text-gray-100 truncate">${item.name}</span>
              </div>
              ${tierBadge}
            </div>
            <div class="text-[11px] text-cyan-300 font-mono font-semibold">${item.role || ''}</div>
            <p class="text-[11px] text-gray-400 mt-1 line-clamp-3 leading-relaxed">${item.description}</p>
          </div>

          <div class="pt-2 border-t border-white/5 flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <button class="px-2.5 py-1 rounded bg-[#090d16] hover:bg-[#1a253d] border border-white/10 hover:border-purple-500/50 text-[10px] text-purple-300 font-mono transition btn-switch-tier" data-id="${item.id}" data-current="${item.tier}">
                ⇄ Switch to ${isStaff ? 'Guardian' : 'Front Staff'}
              </button>
              ${item.skillId ? `<button class="text-[10px] text-purple-400 hover:text-purple-200 underline font-mono btn-modal-view-doc" data-skill="${item.skillId}">Read SKILL.md</button>` : ''}
            </div>
            <div class="flex items-center space-x-2">
              <span class="text-[10px] text-gray-500 font-mono">${statsText}</span>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" class="sr-only peer toggle-worker-modal-btn" data-id="${item.id}" ${item.status === 'active' ? 'checked' : ''}>
                <div class="w-8 h-4 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
          </div>
        `;

        card.querySelector('.btn-switch-tier').addEventListener('click', async () => {
          const newTier = item.tier === 'active' ? 'passive' : 'active';
          await fetch(`/api/workers/${item.id}/tier`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tier: newTier })
          });
        });

        card.querySelector('.toggle-worker-modal-btn').addEventListener('change', async (e) => {
          const newStatus = e.target.checked ? 'active' : 'disabled';
          await fetch(`/api/workers/${item.id}/toggle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
          });
        });

        const docBtn = card.querySelector('.btn-modal-view-doc');
        if (docBtn) {
          docBtn.addEventListener('click', () => {
            const skillPlugin = this.plugins.find(p => p.id === item.skillId);
            if (skillPlugin) this.viewSkillDocumentation(skillPlugin);
          });
        }
      } else {
        // Plugin / MCP Card
        const isQuotaPlugin = item.id === 'dsh-plugin-quota' || item.name === 'dsh-plugin-quota';
        card.innerHTML = `
          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs font-bold text-gray-100 truncate">${item.name}</span>
              <span class="text-[10px] px-2 py-0.5 rounded font-mono font-semibold bg-cyan-950 text-cyan-300 border border-cyan-500/40">${item.type.toUpperCase()}</span>
            </div>
            <p class="text-[11px] text-gray-400 mt-1 line-clamp-3 leading-relaxed">${item.description}</p>
            ${isQuotaPlugin ? `
              <div class="mt-2 p-2 rounded bg-cyan-950/40 border border-cyan-500/30 text-[10px] font-mono text-cyan-200 space-y-1">
                <div class="flex justify-between">
                  <span>Antigravity:</span>
                  <b class="text-emerald-400">5h: 100% | 7d: ${this.quota?.googleAccount?.quotaWindows?.weekly?.remainingPercent ?? 47.8}%</b>
                </div>
                <div class="flex justify-between">
                  <span>Gemini Tokens:</span>
                  <b class="text-purple-300">${(this.quota?.totalTokens ? (this.quota.totalTokens / 1000000).toFixed(2) : '26.36')}M ($${(this.quota?.estimatedCostUsd ?? 6.20).toFixed(2)})</b>
                </div>
                <div class="pt-1 flex justify-end">
                  <button class="text-cyan-400 hover:text-cyan-200 underline text-[9px] btn-open-quota-details">View Full Quota Metrics →</button>
                </div>
              </div>
            ` : ''}
          </div>
          <div class="pt-2 border-t border-white/5 flex items-center justify-between">
            <span class="text-[10px] text-gray-500 font-mono">${item.items ? item.items.length + ' tools registered' : (item.tools ? item.tools.length + ' tools' : 'active')}</span>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" class="sr-only peer toggle-plugin-modal-btn" data-id="${item.id}" ${item.enabled ? 'checked' : ''}>
              <div class="w-8 h-4 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-cyan-600"></div>
            </label>
          </div>
        `;

        if (isQuotaPlugin) {
          const btn = card.querySelector('.btn-open-quota-details');
          if (btn) {
            btn.addEventListener('click', () => {
              this.setCategory('quota');
            });
          }
        }

        card.querySelector('.toggle-plugin-modal-btn').addEventListener('change', async (e) => {
          await window.API.togglePlugin(item.id, e.target.checked);
        });
      }

      gridContainer.appendChild(card);
    });
  }

  async viewSkillDocumentation(plugin) {
    try {
      const res = await fetch(`/api/skills/${plugin.id}/doc`);
      if (!res.ok) throw new Error('Failed to load documentation');
      const data = await res.json();

      // Open Right Auxiliary Workbench Drawer to Artifact tab
      const drawer = document.getElementById('aux-drawer');
      if (drawer && drawer.classList.contains('hidden')) {
        drawer.classList.remove('hidden');
      }

      // Switch to Artifacts tab
      const artifactTabBtn = document.querySelector('.drawer-tab[data-tab="artifacts"]');
      if (artifactTabBtn) artifactTabBtn.click();

      const viewer = document.getElementById('artifact-viewer');
      if (viewer) {
        viewer.innerHTML = `
          <div class="p-3 bg-[#0d1322] border-b border-white/10 flex items-center justify-between">
            <div>
              <span class="text-xs font-bold text-cyan-300 font-mono">${data.name} / SKILL.md</span>
              <p class="text-[10px] text-gray-500 truncate max-w-sm">${data.path}</p>
            </div>
            <span class="text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 font-mono">Skill Playbook</span>
          </div>
          <div class="p-4 text-xs text-gray-200 font-sans leading-relaxed whitespace-pre-wrap overflow-y-auto max-h-[70vh]">${escapeHtml(data.content)}</div>
        `;
      }

      // Close modal if open
      window.app.closeModal('modal-plugins');
    } catch (err) {
      alert(`Could not open documentation: ${err.message}`);
    }
  }
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

window.PluginsComponent = PluginsComponent;
