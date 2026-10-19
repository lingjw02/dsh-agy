/**
 * MemoryComponent - AI Knowledge Base & Self-Evolution Workbench Controller
 * 
 * Provides interactive inspection, editing, character budget monitoring,
 * and autonomous evolution across 4 core subsystems:
 * 1. Hermes AI Tier-1 Memory Bank (MEMORY.md, USER.md, activeContext.md, decisions.md)
 * 2. Multi-Dimensional Knowledge Vault (6-layer taxonomy with Popper falsification)
 * 3. Priority Evolution Loop & Token Budget Manager (70% Tasks, 20% Idle, 10% Audit)
 * 4. Experience Bank (Task retrospectives, tool failure logs, and autonomous lessons)
 */
class MemoryComponent {
  constructor() {
    this.currentSubtab = 'hermes';
    this.currentFile = 'MEMORY.md';
    this.currentTaxonomy = 'all';
    this.bankStats = null;
    this.knowledgeStats = null;
    this.searchDebounceTimer = null;
    this.knowledgeDebounceTimer = null;

    this.initElements();
    this.initEvents();
    this.initSocketEvents();
    this.loadBank();
  }

  initElements() {
    // Subtab switchers
    this.subtabBtns = document.querySelectorAll('.memory-subtab-btn');
    this.subtabViews = {
      hermes: document.getElementById('subtab-view-hermes'),
      knowledge: document.getElementById('subtab-view-knowledge'),
      evolution: document.getElementById('subtab-view-evolution'),
      experience: document.getElementById('subtab-view-experience')
    };

    // Subtab 1: Hermes Bank
    this.filePills = document.querySelectorAll('.memory-file-pill');
    this.editor = document.getElementById('memory-editor');
    this.charCountEl = document.getElementById('memory-char-count');
    this.budgetLimitEl = document.getElementById('memory-budget-limit');
    this.budgetBar = document.getElementById('memory-budget-bar');
    this.budgetPercentEl = document.getElementById('memory-budget-percent');
    this.btnSave = document.getElementById('btn-save-memory');
    this.btnRefresh = document.getElementById('btn-refresh-memory');
    this.searchInput = document.getElementById('memory-search-input');
    this.searchResultsContainer = document.getElementById('memory-search-results');
    this.statusPill = document.getElementById('memory-status-pill');

    // Subtab 2: Knowledge Vault
    this.taxChips = document.querySelectorAll('.knowledge-tax-chip');
    this.knowledgeSearchInput = document.getElementById('knowledge-search-input');
    this.knowledgeListEl = document.getElementById('knowledge-items-list');
    this.btnProposeCandidate = document.getElementById('btn-propose-candidate');

    // Subtab 3: Evolution Loop
    this.evoQueueCountEl = document.getElementById('evo-queue-count');
    this.evoQueueListEl = document.getElementById('evolution-queue-list');
    this.evoTokenSpentBadge = document.getElementById('evo-token-spent-badge');
    this.evoAllocTask = document.getElementById('evo-alloc-task');
    this.evoAllocIdle = document.getElementById('evo-alloc-idle');
    this.evoAllocAudit = document.getElementById('evo-alloc-audit');
    this.btnRunDeepAudit = document.getElementById('btn-run-deep-audit');
    this.btnRunIdleStep = document.getElementById('btn-run-idle-step');

    // Subtab 4: Experience Bank
    this.experienceListEl = document.getElementById('experience-items-list');
    this.btnRefreshExperience = document.getElementById('btn-refresh-experience');
  }

  initEvents() {
    // 1. Subtab switching
    if (this.subtabBtns) {
      this.subtabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const tab = btn.getAttribute('data-memory-subtab');
          this.switchSubtab(tab);
        });
      });
    }

    // 2. Hermes File switcher pills
    if (this.filePills) {
      this.filePills.forEach(pill => {
        pill.addEventListener('click', () => {
          const file = pill.getAttribute('data-file');
          this.switchFile(file);
        });
      });
    }

    // 3. Editor input tracking (Live character budget counter)
    if (this.editor) {
      this.editor.addEventListener('input', () => {
        this.updateBudgetMetrics(this.editor.value.length);
        if (this.btnSave) {
          this.btnSave.classList.remove('opacity-50');
        }
      });
    }

    // 4. Save Hermes file
    if (this.btnSave) {
      this.btnSave.addEventListener('click', async () => {
        await this.saveCurrentFile();
      });
    }

    // 5. Refresh header button
    if (this.btnRefresh) {
      this.btnRefresh.addEventListener('click', async () => {
        if (this.currentSubtab === 'hermes') await this.loadBank();
        else if (this.currentSubtab === 'knowledge') await this.loadKnowledge();
        else if (this.currentSubtab === 'evolution') await this.loadEvolution();
        else if (this.currentSubtab === 'experience') await this.loadExperience();
      });
    }

    // 6. Search input for Hermes
    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        clearTimeout(this.searchDebounceTimer);
        this.searchDebounceTimer = setTimeout(() => {
          this.handleSearch(e.target.value);
        }, 250);
      });
    }

    // 7. Knowledge Taxonomy chips
    if (this.taxChips) {
      this.taxChips.forEach(chip => {
        chip.addEventListener('click', () => {
          this.taxChips.forEach(c => {
            c.classList.remove('active', 'bg-cyan-600/30', 'text-cyan-300', 'border-cyan-500/40');
            c.classList.add('bg-[#0c1222]', 'border-white/10');
          });
          chip.classList.add('active', 'bg-cyan-600/30', 'text-cyan-300', 'border-cyan-500/40');
          chip.classList.remove('bg-[#0c1222]', 'border-white/10');
          this.currentTaxonomy = chip.getAttribute('data-taxonomy');
          this.loadKnowledge();
        });
      });
    }

    // 8. Knowledge Search Input
    if (this.knowledgeSearchInput) {
      this.knowledgeSearchInput.addEventListener('input', (e) => {
        clearTimeout(this.knowledgeDebounceTimer);
        this.knowledgeDebounceTimer = setTimeout(() => {
          this.loadKnowledge(e.target.value);
        }, 250);
      });
    }

    // 9. Propose candidate button
    if (this.btnProposeCandidate) {
      this.btnProposeCandidate.addEventListener('click', async () => {
        const content = prompt('Enter factual assertion or candidate rule:');
        if (!content || !content.trim()) return;
        try {
          await window.API.proposeKnowledgeCandidate({
            content: content.trim(),
            type: 'learned',
            importance: 0.85,
            sources: ['workbench_ui']
          });
          await this.loadKnowledge();
          await this.loadEvolution();
        } catch (err) {
          alert('Failed to propose candidate: ' + err.message);
        }
      });
    }

    // 10. Run Deep Audit
    if (this.btnRunDeepAudit) {
      this.btnRunDeepAudit.addEventListener('click', async () => {
        this.btnRunDeepAudit.disabled = true;
        this.btnRunDeepAudit.innerHTML = '<i data-lucide="loader" class="w-3 h-3 animate-spin"></i><span>Auditing...</span>';
        try {
          const res = await window.API.runDeepAudit();
          alert(`Deep Audit completed: Found ${res.report.contradictionsFound.length} contradictions, ${res.report.staleItems.length} stale items.`);
          await this.loadEvolution();
          await this.loadKnowledge();
        } catch (err) {
          alert('Deep audit error: ' + err.message);
        } finally {
          this.btnRunDeepAudit.disabled = false;
          this.btnRunDeepAudit.innerHTML = '<i data-lucide="search" class="w-3 h-3 text-purple-400"></i><span>Deep Audit Sweep</span>';
          if (window.lucide) window.lucide.createIcons();
        }
      });
    }

    // 11. Run Idle Step
    if (this.btnRunIdleStep) {
      this.btnRunIdleStep.addEventListener('click', async () => {
        await window.API.fetchKnowledge({ q: '' });
        await this.loadEvolution();
      });
    }

    // 12. Refresh Experience
    if (this.btnRefreshExperience) {
      this.btnRefreshExperience.addEventListener('click', async () => {
        await this.loadExperience();
      });
    }
  }

  initSocketEvents() {
    window.addEventListener('socket_message', (e) => {
      const data = e.detail;
      if (data.type === 'init_sync') {
        if (data.memory) {
          this.bankStats = data.memory;
          this.renderStats();
        }
        if (data.knowledge) {
          this.knowledgeStats = data.knowledge;
          this.renderEvolutionTelemetry(data.knowledge);
        }
      } else if (data.type === 'memory_bank_generated' || data.type === 'memory_bank_curated' || data.type === 'memory_bank_updated') {
        this.loadBank();
      } else if (data.type === 'knowledge_updated' || data.type === 'candidate_proposed') {
        if (this.currentSubtab === 'knowledge') this.loadKnowledge();
        if (this.currentSubtab === 'evolution') this.loadEvolution();
      } else if (data.type === 'task_experience_recorded' || data.type === 'evolution_reflection_triggered') {
        if (this.currentSubtab === 'experience') this.loadExperience();
      } else if (data.type === 'deep_audit_completed') {
        if (this.currentSubtab === 'evolution') this.loadEvolution();
      }
    });
  }

  switchSubtab(tab) {
    this.currentSubtab = tab;
    this.subtabBtns.forEach(btn => {
      if (btn.getAttribute('data-memory-subtab') === tab) {
        btn.classList.add('active', 'text-cyan-300', 'bg-cyan-600/30', 'border-cyan-500/40', 'font-semibold');
        btn.classList.remove('text-gray-400');
      } else {
        btn.classList.remove('active', 'text-cyan-300', 'bg-cyan-600/30', 'border-cyan-500/40', 'font-semibold');
        btn.classList.add('text-gray-400');
      }
    });

    Object.entries(this.subtabViews).forEach(([viewKey, viewEl]) => {
      if (viewEl) {
        if (viewKey === tab) viewEl.classList.remove('hidden');
        else viewEl.classList.add('hidden');
      }
    });

    if (tab === 'hermes') this.loadBank();
    else if (tab === 'knowledge') this.loadKnowledge();
    else if (tab === 'evolution') this.loadEvolution();
    else if (tab === 'experience') this.loadExperience();

    if (window.lucide) window.lucide.createIcons();
  }

  // ==========================================
  // SUBTAB 1: HERMES BANK METHODS
  // ==========================================
  async loadBank() {
    try {
      if (this.statusPill) this.statusPill.textContent = 'SYNCING...';
      const stats = await window.API.fetchMemoryBank();
      this.bankStats = stats;
      this.renderStats();
      await this.loadFile(this.currentFile);
      if (this.statusPill) {
        this.statusPill.textContent = 'SELF-EVOLVING';
        this.statusPill.className = 'text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 font-mono border border-emerald-500/40';
      }
    } catch (e) {
      console.error('Failed to load memory bank:', e);
      if (this.statusPill) {
        this.statusPill.textContent = 'OFFLINE';
        this.statusPill.className = 'text-[9px] px-1.5 py-0.5 rounded bg-red-950/80 text-red-400 font-mono border border-red-500/40';
      }
    }
  }

  renderStats() {
    if (!this.bankStats || !this.bankStats.files) return;

    this.filePills.forEach(pill => {
      const file = pill.getAttribute('data-file');
      const info = this.bankStats.files.find(f => f.filename === file);
      if (info) {
        const badge = pill.querySelector('.pill-badge');
        if (badge) {
          badge.textContent = `${info.charCount}c`;
          if (info.isOverBudget) {
            badge.className = 'pill-badge text-[10px] px-1 rounded bg-red-900/80 text-red-300 font-mono';
          } else {
            badge.className = 'pill-badge text-[10px] px-1 rounded bg-black/40 text-gray-400 font-mono';
          }
        }
      }
    });
  }

  async switchFile(filename) {
    this.currentFile = filename;
    this.filePills.forEach(p => {
      if (p.getAttribute('data-file') === filename) {
        p.classList.add('bg-cyan-600/30', 'text-cyan-300', 'border-cyan-500/50');
        p.classList.remove('bg-[#0c1222]', 'text-gray-400', 'border-white/10');
      } else {
        p.classList.remove('bg-cyan-600/30', 'text-cyan-300', 'border-cyan-500/50');
        p.classList.add('bg-[#0c1222]', 'text-gray-400', 'border-white/10');
      }
    });
    await this.loadFile(filename);
  }

  async loadFile(filename) {
    if (!this.editor) return;
    try {
      this.editor.value = 'Loading memory file...';
      const fileData = await window.API.fetchMemoryFile(filename);
      this.editor.value = fileData.content || '';
      this.updateBudgetMetrics(fileData.charCount || 0, fileData.budget || 2500);
    } catch (e) {
      this.editor.value = `// Memory file not created yet: ${filename}\n// Click "⚡ Generate" to initialize default Hermes Memory Bank.`;
      this.updateBudgetMetrics(0, 2500);
    }
  }

  updateBudgetMetrics(currentCharCount, budget) {
    if (!this.bankStats) return;
    const currentInfo = this.bankStats.files ? this.bankStats.files.find(f => f.filename === this.currentFile) : null;
    const maxBudget = budget || (currentInfo ? currentInfo.budget : 2500);

    if (this.charCountEl) this.charCountEl.textContent = currentCharCount.toLocaleString();
    if (this.budgetLimitEl) this.budgetLimitEl.textContent = maxBudget.toLocaleString();

    const percent = Math.min(100, Math.round((currentCharCount / maxBudget) * 100));
    if (this.budgetPercentEl) this.budgetPercentEl.textContent = `${percent}%`;

    if (this.budgetBar) {
      this.budgetBar.style.width = `${percent}%`;
      if (currentCharCount > maxBudget) {
        this.budgetBar.className = 'h-full bg-red-500 transition-all duration-300';
      } else if (percent > 80) {
        this.budgetBar.className = 'h-full bg-amber-400 transition-all duration-300';
      } else {
        this.budgetBar.className = 'h-full bg-cyan-400 transition-all duration-300';
      }
    }
  }

  async saveCurrentFile() {
    if (!this.editor) return;
    const content = this.editor.value;
    try {
      if (this.btnSave) {
        this.btnSave.disabled = true;
        this.btnSave.textContent = 'Saving...';
      }
      await window.API.saveMemoryFile(this.currentFile, content);
      await this.loadBank();
    } catch (e) {
      alert('Failed to save memory file: ' + e.message);
    } finally {
      if (this.btnSave) {
        this.btnSave.disabled = false;
        this.btnSave.textContent = 'Save Memory File';
      }
    }
  }

  async handleSearch(query) {
    if (!this.searchResultsContainer) return;
    if (!query || query.trim().length === 0) {
      this.searchResultsContainer.classList.add('hidden');
      this.searchResultsContainer.innerHTML = '';
      return;
    }

    try {
      const res = await window.API.searchMemory(query);
      this.searchResultsContainer.classList.remove('hidden');
      if (res.matches.length === 0) {
        this.searchResultsContainer.innerHTML = `<div class="text-gray-400 text-xs italic p-4 text-center">No memories matching "${query}"</div>`;
        return;
      }

      this.searchResultsContainer.innerHTML = res.matches.map(m => `
        <div class="p-2 rounded bg-[#0a0f1d] border border-white/10 hover:border-cyan-500/40 transition">
          <div class="flex items-center justify-between text-[10px] text-gray-400 mb-1">
            <span class="text-cyan-400 font-bold">${m.filename}</span>
            <span>Section: ${m.section} • L${m.line}</span>
          </div>
          <div class="text-xs text-gray-200">${m.content}</div>
        </div>
      `).join('');
    } catch (e) {
      console.error('Search failed:', e);
    }
  }

  // ==========================================
  // SUBTAB 2: KNOWLEDGE VAULT METHODS
  // ==========================================
  async loadKnowledge(query = '') {
    if (!this.knowledgeListEl) return;
    try {
      const params = {};
      if (this.currentTaxonomy !== 'all') params.taxonomy = this.currentTaxonomy;
      if (query) params.q = query;

      const data = await window.API.fetchKnowledge(params);
      const items = data.items || [];

      if (items.length === 0) {
        this.knowledgeListEl.innerHTML = `<div class="text-gray-500 text-xs italic p-4 text-center">No knowledge items found in ${this.currentTaxonomy.toUpperCase()} category.</div>`;
        return;
      }

      const categoryBadges = {
        authoritative: 'bg-cyan-950 text-cyan-300 border-cyan-500/40',
        learned: 'bg-purple-950 text-purple-300 border-purple-500/40',
        experience: 'bg-emerald-950 text-emerald-300 border-emerald-500/40',
        user: 'bg-amber-950 text-amber-300 border-amber-500/40',
        temporary: 'bg-yellow-950 text-yellow-300 border-yellow-500/40',
        rejected: 'bg-rose-950 text-rose-300 border-rose-500/40'
      };

      this.knowledgeListEl.innerHTML = items.map(k => {
        const badgeCls = categoryBadges[k.category] || 'bg-gray-800 text-gray-300 border-white/10';
        const confPercent = Math.round((k.confidence || 0.5) * 100);
        const statusBadge = k.status === 'verified'
          ? '<span class="text-emerald-400">✅ Verified</span>'
          : (k.status === 'superseded' ? '<span class="text-gray-500">⏳ Superseded</span>' : '<span class="text-yellow-400">⚠️ Candidate</span>');

        const sourcesList = (k.sources || []).map(s => `<span class="px-1 py-0.5 rounded bg-black/40 border border-white/5 text-[9px] text-gray-400">${s}</span>`).join(' ');

        return `
          <div class="p-2.5 rounded-lg bg-[#070c1a] border border-white/10 hover:border-cyan-500/30 transition flex flex-col space-y-1.5 shadow-sm">
            <div class="flex items-center justify-between text-[10px]">
              <div class="flex items-center space-x-1.5">
                <span class="px-1.5 py-0.5 rounded border text-[9px] font-bold ${badgeCls}">${k.category.toUpperCase()}</span>
                <span class="text-gray-300 font-bold">${k.id}</span>
              </div>
              <div class="flex items-center space-x-2">
                <span>${statusBadge}</span>
                <span class="text-cyan-400 font-bold">${confPercent}%</span>
              </div>
            </div>
            
            <p class="text-xs text-gray-200 leading-relaxed font-sans">${k.content}</p>
            
            <div class="flex flex-wrap items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-white/5 gap-2">
              <div class="flex items-center space-x-1.5">
                <span>Evidence: <strong class="text-gray-200">${k.evidence_count || 1}</strong></span>
                <span>•</span>
                <span>Conflicts: <strong class="${k.contradictions > 0 ? 'text-rose-400 font-bold' : 'text-gray-400'}">${k.contradictions || 0}</strong></span>
              </div>
              <div class="flex items-center space-x-1">
                ${sourcesList}
              </div>
            </div>
          </div>
        `;
      }).join('');
    } catch (e) {
      this.knowledgeListEl.innerHTML = `<div class="text-red-400 text-xs p-3">Failed to load knowledge vault: ${e.message}</div>`;
    }
  }

  // ==========================================
  // SUBTAB 3: EVOLUTION LOOP METHODS
  // ==========================================
  async loadEvolution() {
    if (!this.evoQueueListEl) return;
    try {
      const data = await window.API.fetchEvolutionQueue();
      const stats = await window.API.fetchKnowledgeStats();
      this.knowledgeStats = stats;
      this.renderEvolutionTelemetry(stats);

      const queue = data.queue || [];
      if (this.evoQueueCountEl) this.evoQueueCountEl.textContent = `${queue.length} items`;

      if (queue.length === 0) {
        this.evoQueueListEl.innerHTML = `<div class="text-gray-500 text-xs italic p-4 text-center">Evolution queue is clean. All candidates processed!</div>`;
        return;
      }

      this.evoQueueListEl.innerHTML = queue.map(q => {
        return `
          <div class="p-2.5 rounded-lg bg-[#070c1a] border border-white/10 hover:border-yellow-500/40 transition flex flex-col space-y-2 shadow-sm">
            <div class="flex items-center justify-between text-[10px]">
              <span class="text-yellow-400 font-bold flex items-center space-x-1">
                <span>🎯 Priority: ${q.priority}</span>
              </span>
              <span class="text-[9px] px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-gray-300">${q.type}</span>
            </div>

            <p class="text-xs text-gray-200 font-sans leading-relaxed">${q.content}</p>

            ${q.contradictions > 0 ? `<div class="p-1 px-2 rounded bg-rose-950/80 border border-rose-500/40 text-[10px] text-rose-300">⚠️ Detected ${q.contradictions} contradiction(s) with existing verified facts.</div>` : ''}

            <div class="flex items-center justify-end space-x-1.5 pt-1 border-t border-white/5">
              <button onclick="window.app.memory.verifyCandidate('${q.id}', true)" class="px-2 py-0.5 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-200 text-[10px] font-semibold transition">
                ✓ Verify & Promote
              </button>
              <button onclick="window.app.memory.verifyCandidate('${q.id}', false, true)" class="px-2 py-0.5 rounded bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-200 text-[10px] font-semibold transition">
                🔬 Popper Falsify
              </button>
              <button onclick="window.app.memory.verifyCandidate('${q.id}', false)" class="px-2 py-0.5 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-200 text-[10px] font-semibold transition">
                ✕ Reject
              </button>
            </div>
          </div>
        `;
      }).join('');
    } catch (e) {
      this.evoQueueListEl.innerHTML = `<div class="text-red-400 text-xs p-3">Failed to load evolution queue: ${e.message}</div>`;
    }
  }

  renderEvolutionTelemetry(stats) {
    if (!stats || !stats.tokenBudget) return;
    const b = stats.tokenBudget;

    if (this.evoTokenSpentBadge) {
      this.evoTokenSpentBadge.textContent = `${b.spentTotal.toLocaleString()} / ${b.dailyLimit.toLocaleString()}`;
    }

    if (this.evoAllocTask && b.allocations.task) {
      this.evoAllocTask.textContent = `${(b.allocations.task.spent || 0).toLocaleString()} / ${(b.allocations.task.limit || 0).toLocaleString()}`;
    }

    if (this.evoAllocIdle && b.allocations.idle) {
      this.evoAllocIdle.textContent = `${(b.allocations.idle.spent || 0).toLocaleString()} / ${(b.allocations.idle.limit || 0).toLocaleString()}`;
    }

    if (this.evoAllocAudit && b.allocations.audit) {
      this.evoAllocAudit.textContent = `${(b.allocations.audit.spent || 0).toLocaleString()} / ${(b.allocations.audit.limit || 0).toLocaleString()}`;
    }
  }

  async verifyCandidate(candidateId, approved, popperFalsified = false) {
    try {
      await window.API.verifyKnowledgeCandidate(candidateId, {
        approved,
        popperFalsified,
        resolverReason: popperFalsified ? 'Popperian falsification testing discovered counter-example' : 'Manually verified via Workbench Cockpit'
      });
      await this.loadEvolution();
      await this.loadKnowledge();
    } catch (e) {
      alert('Verification error: ' + e.message);
    }
  }

  // ==========================================
  // SUBTAB 4: EXPERIENCE BANK METHODS
  // ==========================================
  async loadExperience() {
    if (!this.experienceListEl) return;
    try {
      const data = await window.API.fetchExperiences();
      const exps = data.experiences || [];

      if (exps.length === 0) {
        this.experienceListEl.innerHTML = `<div class="text-gray-500 text-xs italic p-4 text-center">No task experiences logged yet. Run agent tasks to populate!</div>`;
        return;
      }

      this.experienceListEl.innerHTML = exps.map(exp => {
        const isSuccess = exp.success;
        const statusBadge = isSuccess
          ? '<span class="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/40 text-[9px] font-bold">SUCCESS</span>'
          : '<span class="px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-500/40 text-[9px] font-bold">FAILED</span>';

        const toolBadges = (exp.toolsUsed || []).map(t => `<span class="px-1 py-0.5 rounded bg-black/40 border border-white/10 text-[9px] text-cyan-300">${t}</span>`).join(' ') || '<span class="text-gray-500 text-[10px]">No tools</span>';

        const lessonBlock = exp.lessonsCandidate ? `
          <div class="p-2 rounded bg-purple-950/40 border border-purple-500/30 text-[11px] text-purple-200 mt-1.5 font-sans">
            <strong class="text-purple-300 font-mono text-[10px]">🧠 Extracted Lesson:</strong>
            <p class="mt-0.5">${exp.lessonsCandidate.lesson}</p>
          </div>
        ` : '';

        return `
          <div class="p-2.5 rounded-lg bg-[#070c1a] border border-white/10 hover:border-emerald-500/30 transition flex flex-col space-y-1.5 shadow-sm">
            <div class="flex items-center justify-between text-[10px]">
              <span class="text-gray-300 font-bold">${exp.taskId}</span>
              ${statusBadge}
            </div>

            <p class="text-xs text-gray-200 font-sans">${exp.intent}</p>

            <div class="flex flex-wrap items-center space-x-1 pt-1">
              <span class="text-[10px] text-gray-400">Tools:</span>
              ${toolBadges}
            </div>

            ${lessonBlock}
          </div>
        `;
      }).join('');
    } catch (e) {
      this.experienceListEl.innerHTML = `<div class="text-red-400 text-xs p-3">Failed to load experiences: ${e.message}</div>`;
    }
  }
}

window.MemoryComponent = MemoryComponent;
