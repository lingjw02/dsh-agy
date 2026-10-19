class SocketService {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.reconnectTimer = null;
    this.isConnected = false;
  }

  connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.isConnected = true;
      console.log('🔗 WebSocket connected to Antigravity Harness Core');
      const indicator = document.getElementById('ws-indicator');
      if (indicator) {
        indicator.innerHTML = `
          <span class="w-2 h-2 rounded-full bg-emerald-400 pulse-live"></span>
          <span class="hidden sm:inline">ONLINE</span>
        `;
        indicator.className = 'flex items-center space-x-1.5 px-2 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-[11px] font-mono text-emerald-400';
      }
      this.emit('connection_status', { connected: true });
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit(data.type, data);
        this.emit('*', data);
      } catch (err) {
        console.error('WS Parse error:', err);
      }
    };

    this.ws.onclose = () => {
      this.isConnected = false;
      console.warn('⚠️ WebSocket disconnected. Reconnecting in 2s...');
      const indicator = document.getElementById('ws-indicator');
      if (indicator) {
        indicator.innerHTML = `
          <span class="w-2 h-2 rounded-full bg-rose-500"></span>
          <span class="hidden sm:inline">OFFLINE</span>
        `;
        indicator.className = 'flex items-center space-x-1.5 px-2 py-1 rounded-full bg-rose-950/60 border border-rose-500/30 text-[11px] font-mono text-rose-400';
      }
      this.emit('connection_status', { connected: false });
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => this.connect(), 2000);
    };

    this.ws.onerror = (err) => {
      console.error('WS Socket error:', err);
    };
  }

  send(type, payload = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...payload }));
    } else {
      console.warn('WebSocket not ready to send:', type);
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => {
        try { cb(data); } catch (e) { console.error('Listener error:', e); }
      });
    }
  }
}

window.SocketService = new SocketService();
