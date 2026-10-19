const API = {
  async get(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res.json();
  },

  async post(url, data) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res.json();
  },

  async put(url, data) {
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res.json();
  },

  async delete(url) {
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res.json();
  },

  fetchStatus() {
    return this.get('/api/status');
  },

  fetchFileTree(dir) {
    return this.get(`/api/workspace/tree${dir ? '?dir=' + encodeURIComponent(dir) : ''}`);
  },

  fetchFile(path) {
    return this.get(`/api/workspace/file?path=${encodeURIComponent(path)}`);
  },

  saveFile(path, content) {
    return this.post('/api/workspace/file', { path, content });
  },

  fetchPlugins() {
    return this.get('/api/plugins');
  },

  togglePlugin(id, enabled) {
    return this.post(`/api/plugins/${encodeURIComponent(id)}/toggle`, { enabled });
  },

  createDshPlugin(name, code) {
    return this.post('/api/plugins/dsh/create', { name, code });
  },

  fetchSkillDoc(id) {
    return this.get(`/api/skills/${encodeURIComponent(id)}/doc`);
  },

  fetchSubagents() {
    return this.get('/api/subagents');
  },

  spawnSubagent(subagent) {
    return this.post('/api/subagents/spawn', subagent);
  },

  killSubagent(id) {
    return this.post('/api/subagents/kill', { id });
  },

  fetchTasks() {
    return this.get('/api/tasks');
  },

  runTerminalCommand(command, cwd) {
    return this.post('/api/terminal/run', { command, cwd });
  },

  fetchTranscripts() {
    return this.get('/api/transcripts');
  },

  fetchConfig() {
    return this.get('/api/config');
  },

  fetchMarketPlugins() {
    return this.get('/api/market/plugins');
  },

  fetchQuotaMetrics() {
    return this.get('/api/quota/metrics');
  },

  fetchAccountStatus() {
    return this.get('/api/account/status');
  },

  testGemini(apiKey) {
    return this.post('/api/gemini/test', { apiKey });
  },

  saveConfig(config) {
    return this.post('/api/config', config);
  },

  // Hermes AI Memory Bank APIs
  fetchMemoryBank() {
    return this.get('/api/memory/bank');
  },

  fetchMemoryFile(filename) {
    return this.get(`/api/memory/bank/${encodeURIComponent(filename)}`);
  },

  saveMemoryFile(filename, content) {
    return this.post(`/api/memory/bank/${encodeURIComponent(filename)}`, { content });
  },

  generateMemoryBank(force = false) {
    return this.post('/api/memory/bank/generate', { force });
  },

  curateMemory() {
    return this.post('/api/memory/bank/curate', {});
  },

  searchMemory(q) {
    return this.get(`/api/memory/search?q=${encodeURIComponent(q || '')}`);
  },

  // Cellular Knowledge Graph & Project Cells APIs
  fetchGraph() {
    return this.get('/api/graph');
  },

  fetchCell(id) {
    return this.get(`/api/graph/cells/${encodeURIComponent(id)}`);
  },

  createCell(data) {
    return this.post('/api/graph/cells', data);
  },

  saveCell(id, content) {
    return this.put(`/api/graph/cells/${encodeURIComponent(id)}`, { content });
  },

  linkCells(sourceId, targetId, relation = 'relates-to') {
    return this.post('/api/graph/cells/link', { sourceId, targetId, relation });
  },

  deleteCell(id) {
    return this.delete(`/api/graph/cells/${encodeURIComponent(id)}`);
  },

  // AI Knowledge Base & Self-Evolution APIs
  fetchKnowledge(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.get(`/api/knowledge${q ? '?' + q : ''}`);
  },

  fetchKnowledgeStats() {
    return this.get('/api/knowledge/stats');
  },

  fetchEvolutionQueue() {
    return this.get('/api/knowledge/queue');
  },

  proposeKnowledgeCandidate(data) {
    return this.post('/api/knowledge/candidate', data);
  },

  verifyKnowledgeCandidate(id, data) {
    return this.post(`/api/knowledge/${encodeURIComponent(id)}/verify`, data);
  },

  runDeepAudit() {
    return this.post('/api/knowledge/audit', {});
  },

  fetchExperiences() {
    return this.get('/api/knowledge/experience');
  },

  ingestKnowledge(data) {
    return this.post('/api/knowledge/ingest', data);
  }
};

window.API = API;
