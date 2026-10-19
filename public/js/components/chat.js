/**
 * ChatComponent - High-Fidelity Agent Stream & Micro-Interaction Engine
 * Designed under Emil Kowalski + Apple WWDC + Disney 12 Principles standards.
 */
class ChatComponent {
  constructor() {
    this.container = document.getElementById('chat-messages');
    this.welcomeHero = document.getElementById('welcome-hero');
    this.currentAssistantTurn = null;
    this.currentThoughtBlock = null;
    this.currentResponseBlock = null;
    this.currentThoughtText = '';
    this.currentResponseText = '';
    this.initSocketEvents();
  }

  initSocketEvents() {
    window.SocketService.on('init_sync', (data) => {
      if (data.session && data.session.messages.length > 0) {
        if (this.welcomeHero) this.welcomeHero.classList.add('hidden');
        data.session.messages.forEach(msg => {
          if (msg.role === 'user') {
            this.renderUserMessage(msg);
          } else {
            this.renderHistoricalAssistantMessage(msg);
          }
        });
        this.scrollToBottom();
      }
    });

    window.SocketService.on('user_message', (data) => {
      if (this.welcomeHero) this.welcomeHero.classList.add('hidden');
      this.renderUserMessage(data.message);
      this.scrollToBottom();
    });

    window.SocketService.on('step_start', (data) => {
      this.startAssistantTurn(data.stepIndex, data.worker);
      this.scrollToBottom();
    });

    window.SocketService.on('thought_chunk', (data) => {
      this.appendThought(data.chunk);
      this.scrollToBottom();
    });

    window.SocketService.on('tool_call_start', (data) => {
      this.renderToolCallStart(data);
      this.scrollToBottom();
    });

    window.SocketService.on('tool_call_result', (data) => {
      this.updateToolCallResult(data);
      this.scrollToBottom();
    });

    window.SocketService.on('response_start', () => {
      this.startResponseStream();
    });

    window.SocketService.on('response_chunk', (data) => {
      this.appendResponse(data.chunk);
      this.scrollToBottom();
    });

    window.SocketService.on('turn_complete', (data) => {
      this.completeTurn(data);
      this.scrollToBottom();
    });

    window.SocketService.on('ask_question', (data) => {
      this.renderAskQuestion(data);
    });
  }

  renderUserMessage(msg) {
    const div = document.createElement('div');
    div.className = 'max-w-3xl mx-auto flex items-start space-x-3 select-text chat-entry-anim';

    let mentionBadges = '';
    if (msg.mentions && msg.mentions.length > 0) {
      mentionBadges = msg.mentions.map(m => `
        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-950/80 border border-purple-500/40 text-purple-300 mr-1.5 shadow-sm">
          @${m}
        </span>
      `).join('');
    }

    let commandBadge = '';
    if (msg.command) {
      commandBadge = `
        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 mr-2 font-bold shadow-sm">
          ${msg.command}
        </span>
      `;
    }

    div.innerHTML = `
      <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-700 border border-cyan-400/30 flex items-center justify-center flex-shrink-0 text-white font-bold text-xs shadow-md shadow-cyan-600/25">
        <i data-lucide="user" class="w-4 h-4"></i>
      </div>
      <div class="flex-1 space-y-1.5">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-300">User</span>
          <span class="text-[10px] text-slate-500 font-mono">${new Date(msg.timestamp || Date.now()).toLocaleTimeString()}</span>
        </div>
        <div class="p-3.5 rounded-2xl user-msg-bubble text-sm text-slate-100 leading-relaxed shadow-md">
          ${commandBadge}${mentionBadges}${this.escapeHtml(msg.content)}
        </div>
      </div>
    `;

    this.container.appendChild(div);
    if (window.lucide) window.lucide.createIcons();
  }

  startAssistantTurn(stepIndex, worker = null) {
    const turnDiv = document.createElement('div');
    turnDiv.className = 'max-w-3xl mx-auto flex items-start space-x-3 select-text chat-entry-anim';
    turnDiv.id = `turn-${stepIndex}`;

    const workerHeader = worker ? `
      <div class="flex items-center space-x-2">
        <span class="text-sm">${worker.icon || '🚀'}</span>
        <span class="text-xs font-bold text-purple-300">${worker.name}</span>
        <span class="text-[10px] px-2 py-0.5 rounded-full bg-purple-950/90 border border-purple-500/40 text-purple-200 font-mono font-semibold">Front Staff</span>
        <span class="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/90 border border-cyan-500/30 text-cyan-300 font-mono">Step #${stepIndex}</span>
      </div>
    ` : `
      <div class="flex items-center space-x-2">
        <span class="text-xs font-bold tracking-wide text-cyan-400">Antigravity Agent</span>
        <span class="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/90 border border-cyan-500/30 text-cyan-300 font-mono">Step #${stepIndex}</span>
      </div>
    `;

    turnDiv.innerHTML = `
      <div class="w-8 h-8 rounded-xl ${worker ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-purple-600/30' : 'dsh-emblem-glow shadow-cyan-500/30'} flex items-center justify-center flex-shrink-0 text-white shadow-lg">
        ${worker ? `<span class="text-base">${worker.icon || '🚀'}</span>` : `<i data-lucide="orbit" class="w-4 h-4"></i>`}
      </div>
      <div class="flex-1 space-y-3 min-w-0" id="turn-body-${stepIndex}">
        <div class="flex items-center justify-between">
          ${workerHeader}
          <div class="flex items-center space-x-1.5">
            <span class="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            <span class="text-[10px] text-cyan-300 font-mono turn-timer">Reasoning...</span>
          </div>
        </div>

        <!-- Trajectory / Thinking Accordion with Fluid Micro-Interactions -->
        <div class="thought-block expanded">
          <button class="w-full px-3.5 py-2 bg-[#0c1224]/80 hover:bg-[#121c36]/90 flex items-center justify-between text-xs text-purple-300 font-medium transition cursor-pointer select-none" onclick="window.chatComp.toggleThought(this)">
            <div class="flex items-center space-x-2">
              <i data-lucide="brain" class="w-4 h-4 text-purple-400 animate-pulse"></i>
              <span class="font-semibold tracking-wide">Cognitive Stream (Chain of Thought)</span>
            </div>
            <i data-lucide="chevron-down" class="w-4 h-4 text-purple-400 transition-transform duration-200 thought-chevron rotate-180"></i>
          </button>
          <div class="thought-content p-3.5 text-xs font-mono text-purple-200/90 whitespace-pre-wrap leading-relaxed max-h-52 overflow-y-auto bg-[#070b16]/80 border-t border-purple-500/10"></div>
        </div>

        <!-- Tools Execution Container -->
        <div class="tools-container space-y-2.5"></div>

        <!-- Final Markdown Response Canvas -->
        <div class="response-content prose-dark text-sm hidden p-4 assistant-msg-bubble"></div>
      </div>
    `;

    this.container.appendChild(turnDiv);
    if (window.lucide) window.lucide.createIcons();

    this.currentAssistantTurn = turnDiv;
    this.currentThoughtBlock = turnDiv.querySelector('.thought-content');
    this.currentThoughtText = '';
    this.currentResponseBlock = turnDiv.querySelector('.response-content');
    this.currentResponseText = '';
  }

  toggleThought(btn) {
    const parent = btn.closest('.thought-block');
    const content = parent.querySelector('.thought-content');
    const chevron = btn.querySelector('.thought-chevron');
    if (!content) return;

    if (content.classList.contains('hidden')) {
      content.classList.remove('hidden');
      parent.classList.add('expanded');
      if (chevron) chevron.classList.add('rotate-180');
    } else {
      content.classList.add('hidden');
      parent.classList.remove('expanded');
      if (chevron) chevron.classList.remove('rotate-180');
    }
  }

  appendThought(chunk) {
    if (this.currentThoughtBlock) {
      this.currentThoughtText += chunk;
      this.currentThoughtBlock.textContent = this.currentThoughtText;
      this.currentThoughtBlock.scrollTop = this.currentThoughtBlock.scrollHeight;
    }
  }

  renderToolCallStart(data) {
    if (!this.currentAssistantTurn) return;
    const toolsContainer = this.currentAssistantTurn.querySelector('.tools-container');
    const card = document.createElement('div');
    card.id = `tool-${data.callId}`;
    card.className = 'tool-card p-3 overflow-hidden';

    card.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center space-x-2.5 truncate">
          <div class="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></div>
          <span class="text-xs font-mono font-bold text-cyan-300">${data.tool}</span>
          <span class="text-[11px] text-slate-400 truncate max-w-xs">${data.summary || ''}</span>
        </div>
        <span class="text-[10px] px-2.5 py-0.5 rounded-full status-badge-running font-mono font-bold tracking-wider status-badge">
          EXECUTING
        </span>
      </div>
      <details class="text-[11px] font-mono text-slate-400 bg-black/40 rounded-lg p-2 border border-white/5 transition">
        <summary class="cursor-pointer text-slate-300 hover:text-cyan-300 font-semibold select-none">Inspect Parameters</summary>
        <pre class="mt-2 text-cyan-200 overflow-x-auto whitespace-pre-wrap leading-relaxed">${JSON.stringify(data.args, null, 2)}</pre>
      </details>
      <div class="output-container mt-2.5 hidden text-[11px] font-mono text-slate-300 bg-[#040712] rounded-lg p-3 border border-white/5 max-h-48 overflow-y-auto leading-relaxed"></div>
    `;

    toolsContainer.appendChild(card);
    if (window.lucide) window.lucide.createIcons();
  }

  updateToolCallResult(data) {
    const card = document.getElementById(`tool-${data.callId}`);
    if (!card) return;

    const badge = card.querySelector('.status-badge');
    if (badge) {
      if (data.result && data.result.error) {
        badge.className = 'text-[10px] px-2.5 py-0.5 rounded-full status-badge-error font-mono font-bold tracking-wider';
        badge.textContent = 'FAILED';
      } else {
        badge.className = 'text-[10px] px-2.5 py-0.5 rounded-full status-badge-success font-mono font-bold tracking-wider';
        badge.textContent = 'COMPLETED';
      }
    }

    const outputContainer = card.querySelector('.output-container');
    if (outputContainer) {
      outputContainer.classList.remove('hidden');
      const text = typeof data.result === 'string' ? data.result : JSON.stringify(data.result, null, 2);
      outputContainer.textContent = text;
    }
  }

  startResponseStream() {
    if (this.currentResponseBlock) {
      this.currentResponseBlock.classList.remove('hidden');
      // Collapse thought block when streaming answer to focus attention smoothly
      if (this.currentAssistantTurn) {
        const thoughtBlock = this.currentAssistantTurn.querySelector('.thought-block');
        if (thoughtBlock) {
          const content = thoughtBlock.querySelector('.thought-content');
          const chevron = thoughtBlock.querySelector('.thought-chevron');
          if (content && !content.classList.contains('hidden')) {
            content.classList.add('hidden');
            thoughtBlock.classList.remove('expanded');
            if (chevron) chevron.classList.remove('rotate-180');
          }
        }
      }
    }
  }

  appendResponse(chunk) {
    if (this.currentResponseBlock) {
      this.currentResponseText += chunk;
      this.currentResponseBlock.innerHTML = this.renderMarkdown(this.currentResponseText);
      this.postProcessCodeBlocks(this.currentResponseBlock);
    }
  }

  completeTurn(data) {
    if (this.currentAssistantTurn) {
      const timer = this.currentAssistantTurn.querySelector('.turn-timer');
      if (timer) {
        timer.textContent = `${data.durationSeconds || '0.8'}s`;
        timer.classList.remove('text-cyan-300');
        timer.classList.add('text-slate-500');
      }
      const pingDot = this.currentAssistantTurn.querySelector('.animate-ping');
      if (pingDot) {
        pingDot.classList.remove('animate-ping', 'bg-cyan-400');
        pingDot.classList.add('bg-emerald-400');
      }
    }

    if (data.stats) {
      const elTokens = document.getElementById('metric-tokens');
      const elCost = document.getElementById('metric-cost');
      const elLatency = document.getElementById('metric-latency');
      if (elTokens && data.stats.totalTokens) elTokens.textContent = data.stats.totalTokens.toLocaleString();
      if (elCost && data.stats.cost) elCost.textContent = `$${data.stats.cost.toFixed(4)}`;
      if (elLatency && data.stats.latency) elLatency.textContent = `${data.stats.latency}ms`;
    }

    if (window.app && window.app.terminal) {
      window.app.terminal.renderQuotaMetrics();
    }
  }

  renderHistoricalAssistantMessage(msg) {
    const turnDiv = document.createElement('div');
    turnDiv.className = 'max-w-3xl mx-auto flex items-start space-x-3 select-text chat-entry-anim';

    turnDiv.innerHTML = `
      <div class="w-8 h-8 rounded-xl dsh-emblem-glow flex items-center justify-center flex-shrink-0 text-white shadow-lg shadow-cyan-500/25">
        <i data-lucide="orbit" class="w-4 h-4"></i>
      </div>
      <div class="flex-1 space-y-3 min-w-0">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-cyan-400">Antigravity Agent</span>
          <span class="text-[10px] text-slate-500 font-mono">${msg.durationSeconds ? msg.durationSeconds + 's' : ''}</span>
        </div>
        <div class="response-content prose-dark text-sm p-4 assistant-msg-bubble">
          ${this.renderMarkdown(msg.content || '')}
        </div>
      </div>
    `;

    this.container.appendChild(turnDiv);
    if (window.lucide) window.lucide.createIcons();
    this.postProcessCodeBlocks(turnDiv);
  }

  /**
   * Resilient Markdown renderer with syntax highlight support
   */
  renderMarkdown(text) {
    if (window.marked && typeof window.marked.parse === 'function') {
      try {
        return window.marked.parse(text);
      } catch (e) {
        console.warn('marked.parse error, using fallback:', e);
      }
    }
    // Zero-dependency markdown fallback
    let html = this.escapeHtml(text);
    // Code blocks
    html = html.replace(/```([a-zA-Z0-9_\-+]*)\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre><code class="language-${lang}">${code}</code></pre>`;
    });
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    // Bold / Italic
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    // Obsidian [[wikilinks]]
    html = html.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match, target, alias) => {
      return `<a href="#" onclick="window.app.openGraphAndSelect('${target}'); return false;" class="text-cyan-400 underline font-mono text-xs">[[${alias || target}]]</a>`;
    });
    // Paragraphs
    html = html.split('\n\n').map(p => p.trim() ? `<p>${p}</p>` : '').join('');
    return html;
  }

  /**
   * Transforms raw <pre><code> into high-end interactive code blocks with copy feedback
   */
  postProcessCodeBlocks(container) {
    container.querySelectorAll('pre:not(.wrapped-code)').forEach((pre) => {
      pre.classList.add('wrapped-code');
      const code = pre.querySelector('code');
      if (!code) return;

      if (window.hljs) {
        try {
          window.hljs.highlightElement(code);
        } catch (e) {}
      }

      const langMatch = code.className.match(/language-([a-zA-Z0-9_\-+]+)/);
      const languageName = langMatch ? langMatch[1].toUpperCase() : 'CODE';

      const wrapper = document.createElement('div');
      wrapper.className = 'code-block-wrapper';

      const header = document.createElement('div');
      header.className = 'code-block-header';
      header.innerHTML = `
        <span class="font-bold tracking-wider text-slate-400 text-[10px]">${languageName}</span>
        <button class="btn-copy-code" title="Copy code to clipboard">
          <i data-lucide="copy" class="w-3.5 h-3.5"></i>
          <span>Copy</span>
        </button>
      `;

      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(header);
      wrapper.appendChild(pre);

      const copyBtn = header.querySelector('.btn-copy-code');
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(code.innerText).then(() => {
          copyBtn.innerHTML = `
            <i data-lucide="check" class="w-3.5 h-3.5 text-emerald-400"></i>
            <span class="text-emerald-400 font-bold">Copied!</span>
          `;
          if (window.lucide) window.lucide.createIcons();
          if (window.showToast) window.showToast('Code copied to clipboard', 'success');

          setTimeout(() => {
            copyBtn.innerHTML = `
              <i data-lucide="copy" class="w-3.5 h-3.5"></i>
              <span>Copy</span>
            `;
            if (window.lucide) window.lucide.createIcons();
          }, 2000);
        });
      });
    });

    if (window.lucide) window.lucide.createIcons();
  }

  renderAskQuestion(data) {
    const box = document.getElementById('ask-question-box');
    const title = document.getElementById('ask-question-title');
    const text = document.getElementById('ask-question-text');
    const optionsContainer = document.getElementById('ask-question-options');
    const submitBtn = document.getElementById('btn-submit-question-answer');

    if (!box || !data.questions || data.questions.length === 0) return;
    const q = data.questions[0];

    title.textContent = 'Agent Requests User Input';
    text.textContent = q.question;
    optionsContainer.innerHTML = '';

    const isMulti = q.is_multi_select;
    const inputType = isMulti ? 'checkbox' : 'radio';

    (q.options || []).forEach((opt) => {
      const optDiv = document.createElement('label');
      optDiv.className = 'flex items-center space-x-3 p-2.5 rounded-xl bg-black/40 border border-white/10 hover:border-cyan-500/50 hover:bg-cyan-950/20 cursor-pointer text-xs text-slate-200 transition';
      optDiv.innerHTML = `
        <input type="${inputType}" name="ask_opt" value="${opt}" class="text-cyan-500 focus:ring-0 rounded">
        <span class="font-medium">${opt}</span>
      `;
      optionsContainer.appendChild(optDiv);
    });

    box.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();

    submitBtn.onclick = () => {
      const selected = [];
      optionsContainer.querySelectorAll('input:checked').forEach(inp => selected.push(inp.value));
      window.SocketService.send('answer_question', {
        questionId: data.id,
        answers: selected
      });
      box.classList.add('hidden');
    };
  }

  scrollToBottom() {
    this.container.scrollTo({
      top: this.container.scrollHeight,
      behavior: 'smooth'
    });
  }

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

window.ChatComponent = ChatComponent;
