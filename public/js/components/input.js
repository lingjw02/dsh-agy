class InputComponent {
  constructor() {
    this.textarea = document.getElementById('user-input');
    this.sendBtn = document.getElementById('btn-send');
    this.popup = document.getElementById('autocomplete-popup');
    this.popupHeader = document.getElementById('autocomplete-header');
    this.popupItems = document.getElementById('autocomplete-items');
    this.chipsBar = document.getElementById('input-chips-bar');

    // Worker suggestion elements
    this.workerCard = document.getElementById('worker-suggestion-card');
    this.workerIcon = document.getElementById('worker-sug-icon');
    this.workerName = document.getElementById('worker-sug-name');
    this.workerConfidence = document.getElementById('worker-sug-confidence');
    this.workerRationale = document.getElementById('worker-sug-rationale');
    this.btnLaunchWorker = document.getElementById('btn-launch-worker');
    this.btnSwitchWorkerMenu = document.getElementById('btn-switch-worker-menu');
    this.dropdownWorkerSwitcher = document.getElementById('worker-switcher-dropdown');
    this.listWorkerSwitcher = document.getElementById('worker-switcher-list');
    this.btnDismissWorkerSug = document.getElementById('btn-dismiss-worker-sug');

    this.chips = []; // context chips attached
    this.slashCommands = [];
    this.mentionItems = [];
    this.activeWorkers = [];
    this.selectedWorker = null;
    this.matchedWorker = null;
    this.debounceTimer = null;
    this.activeAutocompleteMode = null; // 'slash' | 'mention' | null

    this.initEvents();
    this.loadSlots();
  }

  loadSlots() {
    window.SocketService.on('init_sync', (data) => {
      if (data.slots) {
        this.slashCommands = data.slots['composer:command'] || [];
        this.mentionItems = data.slots['composer:mention'] || [];
      }
      if (data.workers) {
        this.activeWorkers = data.workers.filter(w => w.tier === 'active' && w.status === 'active');
      }
    });

    window.SocketService.on('worker_updated', (data) => {
      if (!data.worker) return;
      const idx = this.activeWorkers.findIndex(w => w.id === data.worker.id);
      if (data.worker.tier === 'active' && data.worker.status === 'active') {
        if (idx !== -1) this.activeWorkers[idx] = data.worker;
        else this.activeWorkers.push(data.worker);
      } else {
        if (idx !== -1) this.activeWorkers.splice(idx, 1);
      }
    });
  }

  initEvents() {
    if (!this.textarea) return;

    // Auto-grow textarea & check triggers
    this.textarea.addEventListener('input', () => {
      this.textarea.style.height = 'auto';
      this.textarea.style.height = Math.min(this.textarea.scrollHeight, 180) + 'px';
      this.checkAutocomplete();
      this.debounceWorkerMatch();
    });

    // Keydown handling: Enter to submit, Escape to dismiss
    this.textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || !e.shiftKey)) {
        e.preventDefault();
        this.submit();
      } else if (e.key === 'Escape') {
        this.closeAutocomplete();
        this.hideWorkerSuggestion();
      }
    });

    if (this.sendBtn) {
      this.sendBtn.addEventListener('click', () => this.submit());
    }

    // Attach button
    const btnAttach = document.getElementById('btn-attach');
    if (btnAttach) {
      btnAttach.addEventListener('click', () => {
        const file = prompt('Enter relative or absolute path of file to attach context:', 'package.json');
        if (file) {
          this.addChip(`file:${file}`);
        }
      });
    }

    // Worker Suggestion Action Handlers
    if (this.btnLaunchWorker) {
      this.btnLaunchWorker.addEventListener('click', () => {
        this.selectedWorker = this.matchedWorker;
        this.submit();
      });
    }

    if (this.btnSwitchWorkerMenu) {
      this.btnSwitchWorkerMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleWorkerSwitcher();
      });
    }

    if (this.btnDismissWorkerSug) {
      this.btnDismissWorkerSug.addEventListener('click', () => {
        this.hideWorkerSuggestion();
      });
    }

    // Close switcher when clicking outside
    document.addEventListener('click', (e) => {
      if (this.dropdownWorkerSwitcher && !this.dropdownWorkerSwitcher.contains(e.target) && e.target !== this.btnSwitchWorkerMenu) {
        this.dropdownWorkerSwitcher.classList.add('hidden');
      }
    });
  }

  debounceWorkerMatch() {
    clearTimeout(this.debounceTimer);
    const text = this.textarea.value.trim();

    // Don't match if empty, too short, or is a pure slash command
    if (!text || text.length < 5 || text.startsWith('/')) {
      this.hideWorkerSuggestion();
      return;
    }

    this.debounceTimer = setTimeout(async () => {
      try {
        const res = await fetch('/api/workers/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: text })
        });
        const match = await res.json();
        if (match && match.matched && match.primaryWorker) {
          this.showWorkerSuggestion(match.primaryWorker, match.confidence, match.rationale);
        } else {
          this.hideWorkerSuggestion();
        }
      } catch (err) {
        console.warn('Worker match error:', err);
      }
    }, 300);
  }

  showWorkerSuggestion(worker, confidence = 90, rationale = '') {
    if (!this.workerCard) return;
    this.matchedWorker = worker;
    this.selectedWorker = worker;

    if (this.workerIcon) this.workerIcon.textContent = worker.icon || '🚀';
    if (this.workerName) this.workerName.textContent = worker.name;
    if (this.workerConfidence) this.workerConfidence.textContent = `${confidence}% Match`;
    if (this.workerRationale) this.workerRationale.textContent = rationale || worker.description;

    this.workerCard.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  hideWorkerSuggestion() {
    if (this.workerCard) {
      this.workerCard.classList.add('hidden');
    }
    if (this.dropdownWorkerSwitcher) {
      this.dropdownWorkerSwitcher.classList.add('hidden');
    }
  }

  toggleWorkerSwitcher() {
    if (!this.dropdownWorkerSwitcher) return;
    const isHidden = this.dropdownWorkerSwitcher.classList.contains('hidden');
    if (isHidden) {
      this.renderWorkerSwitcherList();
      this.dropdownWorkerSwitcher.classList.remove('hidden');
    } else {
      this.dropdownWorkerSwitcher.classList.add('hidden');
    }
  }

  renderWorkerSwitcherList() {
    if (!this.listWorkerSwitcher) return;
    this.listWorkerSwitcher.innerHTML = '';

    if (this.activeWorkers.length === 0) {
      this.listWorkerSwitcher.innerHTML = `<div class="p-2 text-xs text-gray-400">No active workers found</div>`;
      return;
    }

    this.activeWorkers.forEach(w => {
      const isSelected = this.selectedWorker && this.selectedWorker.id === w.id;
      const el = document.createElement('div');
      el.className = `p-2 rounded cursor-pointer text-xs flex items-center space-x-2 transition ${isSelected ? 'bg-purple-900/60 border border-purple-500/40 text-purple-200' : 'hover:bg-white/5 text-gray-300'}`;
      el.innerHTML = `
        <span class="text-base">${w.icon || '🚀'}</span>
        <div class="truncate">
          <div class="font-semibold">${w.name}</div>
          <div class="text-[10px] text-gray-400 truncate">${w.role}</div>
        </div>
      `;
      el.onclick = () => {
        this.selectedWorker = w;
        this.showWorkerSuggestion(w, 100, `Manually selected as Active Front Staff`);
        this.dropdownWorkerSwitcher.classList.add('hidden');
      };
      this.listWorkerSwitcher.appendChild(el);
    });
  }

  checkAutocomplete() {
    const text = this.textarea.value;
    const cursorPos = this.textarea.selectionStart;
    const textBefore = text.slice(0, cursorPos);

    // Check for Slash Command (at the start of text)
    if (/^\/([a-zA-Z0-9\-_]*)$/.test(textBefore)) {
      const match = textBefore.match(/^\/([a-zA-Z0-9\-_]*)$/)[1].toLowerCase();
      this.showSlashCommands(match);
      return;
    }

    // Check for Mention (last word starting with @)
    const mentionMatch = textBefore.match(/@([a-zA-Z0-9:\-_]*)$/);
    if (mentionMatch) {
      this.showMentions(mentionMatch[1].toLowerCase());
      return;
    }

    this.closeAutocomplete();
  }

  showSlashCommands(filter = '') {
    this.activeAutocompleteMode = 'slash';
    this.popupHeader.textContent = 'Slash Commands (Antigravity Workflows)';
    this.popupItems.innerHTML = '';

    const filtered = this.slashCommands.filter(c => c.name.toLowerCase().includes(filter));
    if (filtered.length === 0) {
      this.closeAutocomplete();
      return;
    }

    filtered.forEach((cmd, idx) => {
      const item = document.createElement('div');
      item.className = `autocomplete-item p-2 rounded cursor-pointer text-xs flex items-center justify-between ${idx === 0 ? 'selected' : ''}`;
      item.innerHTML = `
        <div class="flex items-center space-x-2">
          <span class="font-mono font-bold text-cyan-400">${cmd.name}</span>
          <span class="text-gray-400 text-[11px] truncate max-w-[180px]">${cmd.description}</span>
        </div>
        <span class="text-[10px] text-gray-500 font-mono">${cmd.category || 'Workflow'}</span>
      `;
      item.onclick = () => {
        this.textarea.value = cmd.name + ' ';
        this.closeAutocomplete();
        this.textarea.focus();
      };
      this.popupItems.appendChild(item);
    });

    this.popup.classList.remove('hidden');
  }

  showMentions(filter = '') {
    this.activeAutocompleteMode = 'mention';
    this.popupHeader.textContent = 'Attach Context (@files, @mcp, @skills)';
    this.popupItems.innerHTML = '';

    const filtered = this.mentionItems.filter(m => m.name.toLowerCase().includes(filter));
    if (filtered.length === 0) {
      this.closeAutocomplete();
      return;
    }

    filtered.slice(0, 8).forEach((itemData, idx) => {
      const item = document.createElement('div');
      item.className = `autocomplete-item p-2 rounded cursor-pointer text-xs flex items-center justify-between ${idx === 0 ? 'selected' : ''}`;
      item.innerHTML = `
        <div class="flex items-center space-x-2">
          <span class="font-mono font-bold text-purple-400">${itemData.name}</span>
          <span class="text-gray-400 text-[11px] truncate max-w-[180px]">${itemData.description || ''}</span>
        </div>
        <span class="text-[10px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 font-mono">${itemData.type || 'Context'}</span>
      `;
      item.onclick = () => {
        this.addChip(itemData.name.replace('@', ''));
        this.textarea.value = this.textarea.value.replace(/@[a-zA-Z0-9:\-_]*$/, '').trim();
        this.closeAutocomplete();
        this.textarea.focus();
      };
      this.popupItems.appendChild(item);
    });

    this.popup.classList.remove('hidden');
  }

  closeAutocomplete() {
    this.popup.classList.add('hidden');
    this.activeAutocompleteMode = null;
  }

  addChip(name) {
    if (this.chips.includes(name)) return;
    this.chips.push(name);
    this.renderChips();
  }

  removeChip(name) {
    this.chips = this.chips.filter(c => c !== name);
    this.renderChips();
  }

  renderChips() {
    if (this.chips.length === 0) {
      this.chipsBar.classList.add('hidden');
      this.chipsBar.innerHTML = '';
      return;
    }

    this.chipsBar.classList.remove('hidden');
    this.chipsBar.innerHTML = '';
    this.chips.forEach(chip => {
      const el = document.createElement('div');
      el.className = 'flex items-center space-x-1 px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300 text-[11px] font-mono';
      el.innerHTML = `
        <span>@${chip}</span>
        <button class="hover:text-white" onclick="window.inputComp.removeChip('${chip}')">&times;</button>
      `;
      this.chipsBar.appendChild(el);
    });
  }

  submit() {
    const text = this.textarea.value.trim();
    if (!text && this.chips.length === 0) return;

    // Detect if slash command
    let command = null;
    if (text.startsWith('/')) {
      const match = text.match(/^(\/[a-zA-Z0-9\-_]+)/);
      if (match) command = match[1];
    }

    const assignedWorkerId = this.selectedWorker ? this.selectedWorker.id : (this.matchedWorker ? this.matchedWorker.id : null);

    window.SocketService.send('user_message', {
      content: text,
      command,
      mentions: [...this.chips],
      workerId: assignedWorkerId
    });

    this.textarea.value = '';
    this.textarea.style.height = 'auto';
    this.chips = [];
    this.renderChips();
    this.closeAutocomplete();
    this.hideWorkerSuggestion();
    this.selectedWorker = null;
    this.matchedWorker = null;
  }

  insertText(text) {
    this.textarea.value = text;
    this.textarea.focus();
    this.checkAutocomplete();
    this.debounceWorkerMatch();
  }
}

window.InputComponent = InputComponent;
