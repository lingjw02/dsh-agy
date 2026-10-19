class SidebarComponent {
  constructor() {
    this.currentTab = 'tab-sessions';
    this.initTabs();
    this.initToggleCollapse();
    this.initFiles();
    this.initSubagents();
    this.initTasks();
    this.initTranscripts();
  }

  initToggleCollapse() {
    const btnToggle = document.getElementById('btn-toggle-left-sidebar');
    const sidebar = document.getElementById('left-sidebar');
    if (btnToggle && sidebar) {
      btnToggle.addEventListener('click', () => {
        sidebar.classList.toggle('hidden');
      });
    }
  }

  initTabs() {
    const tabs = document.querySelectorAll('.sidebar-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => {
          t.classList.remove('active', 'text-cyan-400', 'border-b-2', 'border-cyan-400');
          t.classList.add('text-gray-400');
        });
        tab.classList.add('active', 'text-cyan-400', 'border-b-2', 'border-cyan-400');
        tab.classList.remove('text-gray-400');

        const targetId = tab.getAttribute('data-tab');
        document.querySelectorAll('.sidebar-tab-content').forEach(content => {
          content.classList.add('hidden');
        });
        const target = document.getElementById(targetId);
        if (target) target.classList.remove('hidden');

        if (targetId === 'tab-files') this.loadFiles();
        if (targetId === 'tab-subagents') this.loadSubagents();
        if (targetId === 'tab-tasks') this.loadTasks();
        if (targetId === 'tab-graph') this.loadGraphCells();
      });
    });
  }

  // File Explorer
  initFiles() {
    const btnRefresh = document.getElementById('btn-refresh-files');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => this.loadFiles());
    }
  }

  async loadFiles() {
    const container = document.getElementById('file-tree-container');
    if (!container) return;
    container.innerHTML = '<div class="text-gray-500 italic p-2">Loading workspace tree...</div>';

    try {
      const data = await window.API.fetchFileTree();
      container.innerHTML = '';
      if (!data.tree || data.tree.length === 0) {
        container.innerHTML = '<div class="text-gray-500 italic p-2">Workspace empty.</div>';
        return;
      }
      this.renderTreeNodes(data.tree, container);
    } catch (e) {
      container.innerHTML = `<div class="text-rose-400 p-2">Failed to load files: ${e.message}</div>`;
    }
  }

  renderTreeNodes(nodes, parentEl, level = 0) {
    nodes.forEach(node => {
      const item = document.createElement('div');
      item.className = 'group flex items-center justify-between py-1 px-1.5 rounded hover:bg-white/5 cursor-pointer text-xs transition';
      item.style.paddingLeft = `${level * 14 + 6}px`;

      const icon = node.isDirectory ? 'folder' : 'file-code';
      const iconColor = node.isDirectory ? 'text-cyan-400' : 'text-gray-400';

      item.innerHTML = `
        <div class="flex items-center space-x-2 truncate">
          <i data-lucide="${icon}" class="w-3.5 h-3.5 ${iconColor} flex-shrink-0"></i>
          <span class="truncate text-gray-300 group-hover:text-cyan-200">${node.name}</span>
        </div>
        <div class="opacity-0 group-hover:opacity-100 flex items-center space-x-1">
          <button class="p-0.5 hover:text-cyan-400 text-gray-500 btn-mention-file" title="Mention file in chat (@)">
            <i data-lucide="at-sign" class="w-3 h-3"></i>
          </button>
        </div>
      `;

      item.querySelector('.btn-mention-file').addEventListener('click', (e) => {
        e.stopPropagation();
        window.app.insertContextChip(`file:${node.name}`);
      });

      item.addEventListener('click', async () => {
        if (!node.isDirectory) {
          // Open in right drawer artifacts tab
          window.app.openArtifactViewer(node.path, node.name);
        }
      });

      parentEl.appendChild(item);

      if (node.isDirectory && node.children && node.children.length > 0) {
        const childContainer = document.createElement('div');
        this.renderTreeNodes(node.children, childContainer, level + 1);
        parentEl.appendChild(childContainer);
      }
    });

    lucide.createIcons();
  }

  // Subagent Fleet Monitor
  initSubagents() {
    const btnSpawn = document.getElementById('btn-spawn-modal');
    if (btnSpawn) {
      btnSpawn.addEventListener('click', () => {
        const role = prompt('Enter Subagent Role (e.g., Code Reviewer, Security Auditor):', 'Code Reviewer');
        if (!role) return;
        const promptText = prompt('Enter Subagent Instruction Prompt:', 'Review the current codebase for vulnerabilities.');
        if (!promptText) return;

        window.API.spawnSubagent({
          Role: role,
          TypeName: 'custom-subagent',
          Model: 'inherit',
          Prompt: promptText
        }).then(() => this.loadSubagents());
      });
    }

    window.SocketService.on('subagent_spawned', () => this.loadSubagents());
    window.SocketService.on('subagents_updated', () => this.loadSubagents());
  }

  async loadSubagents() {
    const container = document.getElementById('subagent-fleet-container');
    if (!container) return;

    try {
      const data = await window.API.fetchSubagents();
      if (!data.subagents || data.subagents.length === 0) {
        container.innerHTML = '<div class="text-gray-500 text-xs italic p-2">No active subagents. Use /teamwork-preview or spawn one above.</div>';
        return;
      }

      container.innerHTML = '';
      data.subagents.forEach(sub => {
        const card = document.createElement('div');
        card.className = 'subagent-card p-2.5 space-y-1.5 shadow-sm';
        const isRunning = sub.state === 'running';
        const badgeClass = isRunning ? 'bg-emerald-950 text-emerald-400 border-emerald-500/30' : 'bg-gray-800 text-gray-400 border-white/10';

        card.innerHTML = `
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <div class="w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}"></div>
              <span class="text-xs font-semibold text-purple-300 truncate">${sub.role}</span>
            </div>
            <span class="text-[9px] px-1.5 py-0.2 rounded font-mono border ${badgeClass}">${sub.state.toUpperCase()}</span>
          </div>
          <div class="text-[11px] text-gray-300 truncate font-mono">ID: ${sub.conversationId}</div>
          <p class="text-[11px] text-gray-400 line-clamp-2">${sub.prompt || sub.stateDetail || ''}</p>
          <div class="flex items-center justify-between pt-1 border-t border-white/5">
            <span class="text-[10px] text-gray-500 font-mono">Model: ${sub.model || 'inherit'}</span>
            ${isRunning ? `
              <button class="text-[10px] text-rose-400 hover:text-rose-300 font-mono btn-kill-sub" data-id="${sub.conversationId}">
                Terminate
              </button>
            ` : ''}
          </div>
        `;

        const killBtn = card.querySelector('.btn-kill-sub');
        if (killBtn) {
          killBtn.addEventListener('click', async () => {
            await window.API.killSubagent(sub.conversationId);
            this.loadSubagents();
          });
        }

        container.appendChild(card);
      });
      lucide.createIcons();
    } catch (e) {
      container.innerHTML = `<div class="text-rose-400 p-2">Error loading fleet: ${e.message}</div>`;
    }
  }

  // Background Tasks
  initTasks() {
    const btnRefresh = document.getElementById('btn-refresh-tasks');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => this.loadTasks());
    }
  }

  async loadTasks() {
    const container = document.getElementById('tasks-container');
    if (!container) return;

    try {
      const data = await window.API.fetchTasks();
      const hasTasks = data.tasks && data.tasks.length > 0;
      const hasTimers = data.timers && data.timers.length > 0;

      if (!hasTasks && !hasTimers) {
        container.innerHTML = '<div class="text-gray-500 text-xs italic p-2">No active tasks or timers.</div>';
        return;
      }

      container.innerHTML = '';
      (data.tasks || []).forEach(t => {
        const div = document.createElement('div');
        div.className = 'p-2 rounded bg-[#131b2e] border border-white/10 text-xs font-mono space-y-1';
        div.innerHTML = `
          <div class="flex items-center justify-between">
            <span class="text-cyan-400 font-bold">${t.id}</span>
            <span class="text-[10px] text-emerald-400">${t.status}</span>
          </div>
          <div class="text-gray-300 truncate">${t.command}</div>
        `;
        container.appendChild(div);
      });

      (data.timers || []).forEach(tm => {
        const div = document.createElement('div');
        div.className = 'p-2 rounded bg-[#131b2e] border border-white/10 text-xs font-mono space-y-1';
        div.innerHTML = `
          <div class="flex items-center justify-between">
            <span class="text-purple-400 font-bold">${tm.id}</span>
            <span class="text-[10px] text-cyan-400">${tm.duration ? tm.duration + 's' : tm.cron}</span>
          </div>
          <div class="text-gray-300 truncate">${tm.prompt}</div>
        `;
        container.appendChild(div);
      });
    } catch (e) {
      container.innerHTML = `<div class="text-rose-400 p-2">Error loading tasks: ${e.message}</div>`;
    }
  }

  // Transcripts Importer
  initTranscripts() {
    const btn = document.getElementById('btn-import-transcripts');
    if (btn) {
      btn.addEventListener('click', async () => {
        try {
          const res = await window.API.fetchTranscripts();
          if (!res.sessions || res.sessions.length === 0) {
            alert('No previous Antigravity transcripts found in ~/.gemini/antigravity-cli/brain');
            return;
          }
          const list = res.sessions.map(s => `• ${s.id}`).join('\n');
          alert(`Discovered ${res.sessions.length} Antigravity Brain Sessions:\n\n${list}`);
        } catch (e) {
          alert('Error fetching transcripts: ' + e.message);
        }
      });
    }

    const btnOpenCanvas = document.getElementById('btn-sidebar-open-canvas');
    if (btnOpenCanvas) {
      btnOpenCanvas.addEventListener('click', () => {
        if (window.app) window.app.openModal('modal-graph');
        if (window.graphComp) {
          setTimeout(() => {
            window.graphComp.initCanvasSize();
            window.graphComp.loadGraph();
            window.graphComp.centerView();
          }, 60);
        }
      });
    }
  }

  async loadGraphCells() {
    const container = document.getElementById('sidebar-cells-list');
    if (!container) return;
    container.innerHTML = '<div class="text-gray-500 italic p-2">Loading cellular graph nodes...</div>';

    try {
      const data = await window.API.fetchGraph();
      const nodes = data.nodes || [];

      // Update metrics
      const elP = document.getElementById('sidebar-stat-projects');
      const elM = document.getElementById('sidebar-stat-memories');
      const elL = document.getElementById('sidebar-stat-links');
      if (elP) elP.textContent = data.stats.projectCells || 0;
      if (elM) elM.textContent = data.stats.memoryCells || 0;
      if (elL) elL.textContent = data.stats.totalLinks || 0;

      if (nodes.length === 0) {
        container.innerHTML = '<div class="text-gray-500 italic p-2">No cells found in memory bank.</div>';
        return;
      }

      container.innerHTML = nodes.map(n => `
        <div onclick="window.app.openGraphAndSelect('${n.id}')" class="p-2 rounded-lg bg-[#0c1222] border border-white/5 hover:border-cyan-500/40 cursor-pointer transition space-y-1">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold ${n.type === 'project' ? 'text-cyan-300' : 'text-purple-300'} truncate flex items-center space-x-1">
              <span>${n.type === 'project' ? '🪐' : '🧠'}</span>
              <span>${n.name}</span>
            </span>
            <span class="text-[9px] px-1 rounded bg-black/40 text-gray-400 font-mono">${n.linksCount} links</span>
          </div>
          <p class="text-[11px] text-gray-400 truncate">${n.summary || 'Cell markdown entity'}</p>
        </div>
      `).join('');
    } catch (e) {
      container.innerHTML = `<div class="text-rose-400 p-2">Error loading graph: ${e.message}</div>`;
    }
  }
}

window.SidebarComponent = SidebarComponent;
