const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const os = require('os');
const cors = require('cors');

const { ToolRegistry } = require('./harness/tools');
const { PluginManager } = require('./harness/plugins');
const { AntigravityAgentEngine } = require('./harness/agent');
const { WorkerRegistry } = require('./harness/workers');
const { CellularKnowledgeGraph } = require('./harness/graph');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3080;
const WORKSPACE_DIR = process.env.WORKSPACE || 'C:\\Users\\ling5';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Broadcast helper for WebSocket
function broadcast(data) {
  const payload = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// Initialize Antigravity Harness Core, Worker Mesh & Cellular Knowledge Graph
const toolRegistry = new ToolRegistry({ workspace: WORKSPACE_DIR });
const pluginManager = new PluginManager({ workspace: WORKSPACE_DIR });
const workerRegistry = new WorkerRegistry({ workspace: WORKSPACE_DIR, broadcast });
const knowledgeGraph = new CellularKnowledgeGraph({ workspace: WORKSPACE_DIR, broadcast });
workerRegistry.setPluginManager(pluginManager);

// Hook tool output callback to WebSocket
toolRegistry.setCallback((type, data) => {
  broadcast({ type, ...data });
});

const agentEngine = new AntigravityAgentEngine({
  workspace: WORKSPACE_DIR,
  tools: toolRegistry,
  plugins: pluginManager,
  workers: workerRegistry,
  broadcast
});
agentEngine.knowledgeGraph = knowledgeGraph;
const knowledgeEngine = agentEngine.knowledgeEngine;

// Hook Cordis DSH Plugin dependencies
pluginManager.setDependencies({
  toolRegistry,
  agentEngine,
  knowledgeEngine,
  broadcast
});

// WebSocket Connection Handler
wss.on('connection', (ws) => {
  // Send initial state sync
  ws.send(JSON.stringify({
    type: 'init_sync',
    workspace: WORKSPACE_DIR,
    session: agentEngine.getActiveSession(),
    config: agentEngine.config,
    account: agentEngine.googleAccount,
    quota: agentEngine.geminiBridge.tracker.getMetrics(),
    plugins: pluginManager.getAllPlugins(),
    slots: pluginManager.getSlots(),
    workers: workerRegistry.getAllWorkers(),
    activeStaff: workerRegistry.getActiveWorkers(),
    passiveGuardians: workerRegistry.getPassiveGuardians(),
    memory: agentEngine.memoryBank.getStats(),
    graph: knowledgeGraph.getGraphData(),
    knowledge: knowledgeEngine.getStats()
  }));

  ws.on('message', async (raw) => {
    try {
      const data = JSON.parse(raw);
      if (data.type === 'user_message') {
        await agentEngine.handleUserMessage(data.content, {
          command: data.command,
          mentions: data.mentions,
          workerId: data.workerId
        });
      } else if (data.type === 'answer_question') {
        toolRegistry.resolveQuestion(data.questionId, data.answers);
        broadcast({ type: 'question_resolved', questionId: data.questionId, answers: data.answers });
      } else if (data.type === 'run_terminal_command') {
        const result = await toolRegistry.run_command({
          CommandLine: data.command,
          Cwd: data.cwd || WORKSPACE_DIR
        });
        ws.send(JSON.stringify({ type: 'terminal_run_result', result }));
      }
    } catch (e) {
      console.error('WS Error:', e);
      ws.send(JSON.stringify({ type: 'error', message: e.message }));
    }
  });
});

// ==================== REST API ENDPOINTS ====================

// 1. Status & Workspace Info
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    harness: 'Antigravity Harness (AGH)',
    version: '2.5.0-cordis',
    workspace: WORKSPACE_DIR,
    model: agentEngine.config.model,
    executionPolicy: agentEngine.config.executionPolicy,
    activeTasks: toolRegistry.tasks.size,
    subagents: toolRegistry.subagents.size,
    loadedPlugins: pluginManager.getAllPlugins().length
  });
});

// 2. Directory Tree
function getDirectoryTree(dirPath, depth = 0, maxDepth = 2) {
  if (depth > maxDepth || !fs.existsSync(dirPath)) return [];
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const items = [];
    for (const entry of entries) {
      // Ignore noisy dirs
      if (entry.name.startsWith('.') && entry.name !== '.antigravity') continue;
      if (['node_modules', 'dist', 'build', 'AppData'].includes(entry.name)) continue;

      const fullPath = path.join(dirPath, entry.name);
      const isDir = entry.isDirectory();
      items.push({
        name: entry.name,
        path: fullPath,
        isDirectory: isDir,
        children: isDir && depth < maxDepth ? getDirectoryTree(fullPath, depth + 1, maxDepth) : undefined
      });
    }
    return items;
  } catch (err) {
    return [];
  }
}

app.get('/api/workspace/tree', (req, res) => {
  const targetDir = req.query.dir || WORKSPACE_DIR;
  const tree = getDirectoryTree(targetDir, 0, 2);
  res.json({ root: targetDir, tree });
});

// 3. File Read & Write
app.get('/api/workspace/file', (req, res) => {
  const filePath = req.query.path;
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  try {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      const files = fs.readdirSync(filePath);
      return res.json({ isDirectory: true, files });
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    res.json({ path: filePath, content, size: stat.size });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/workspace/file', (req, res) => {
  const { path: filePath, content } = req.body;
  if (!filePath) return res.status(400).json({ error: 'Path required' });
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf-8');
    res.json({ success: true, path: filePath });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 4. Plugins & MCP
app.get('/api/plugins', (req, res) => {
  res.json({
    plugins: pluginManager.getAllPlugins(),
    slots: pluginManager.getSlots()
  });
});

app.post('/api/plugins/:id/toggle', (req, res) => {
  const plugin = pluginManager.togglePlugin(req.params.id, req.body.enabled);
  if (!plugin) return res.status(404).json({ error: 'Plugin not found' });
  broadcast({ type: 'plugin_toggled', plugin });
  res.json({ success: true, plugin });
});

app.post('/api/plugins/dsh/create', (req, res) => {
  const { name, code } = req.body;
  if (!name || !code) return res.status(400).json({ error: 'Name and code required' });
  try {
    const pluginMeta = pluginManager.loadDshPluginFromCode(name, code);
    broadcast({ type: 'plugin_created', plugin: pluginMeta });
    broadcast({ type: 'init_sync', slots: pluginManager.getSlots(), plugins: pluginManager.getAllPlugins() });
    res.json({ success: true, plugin: pluginMeta });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/skills/:id/doc', (req, res) => {
  const plugin = pluginManager.plugins.get(req.params.id);
  if (!plugin || !plugin.docPath || !fs.existsSync(plugin.docPath)) {
    return res.status(404).json({ error: 'Skill documentation not found' });
  }
  try {
    const content = fs.readFileSync(plugin.docPath, 'utf-8');
    res.json({ name: plugin.name, path: plugin.docPath, content });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 4a. DeepSeek Market & Quota Telemetry Endpoints
app.get('/api/market/plugins', (req, res) => {
  try {
    const market = require('./plugins/dsh-plugin-market/index.js');
    res.json({ plugins: market.REGISTRY_PLUGINS || [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/quota/metrics', (req, res) => {
  res.json(agentEngine.geminiBridge.tracker.getMetrics());
});

app.get('/api/account/status', (req, res) => {
  const acc = agentEngine.googleAccount;
  const metrics = agentEngine.geminiBridge.tracker.getMetrics();
  res.json({
    email: acc.email,
    authType: acc.authType,
    connected: acc.connected,
    service: acc.service,
    status: acc.status,
    activeModel: agentEngine.config.model,
    hasApiKey: Boolean(agentEngine.geminiBridge.apiKey || process.env.GEMINI_API_KEY),
    geminiKey: agentEngine.geminiBridge.apiKey ? (agentEngine.geminiBridge.apiKey.slice(0, 4) + '...' + agentEngine.geminiBridge.apiKey.slice(-4)) : '',
    totalTokens: metrics.totalTokens,
    estimatedCostUsd: metrics.estimatedCostUsd,
    averageLatencyMs: metrics.averageLatencyMs,
    harness: 'Antigravity Harness (AGH) - DeepSeek Slot Architecture'
  });
});

app.post('/api/gemini/test', async (req, res) => {
  try {
    const { apiKey } = req.body || {};
    const result = await agentEngine.geminiBridge.testConnection(apiKey);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4a-2. Hermes AI Memory Bank Endpoints
app.get('/api/memory/bank', (req, res) => {
  try {
    const stats = agentEngine.memoryBank.getStats();
    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/memory/bank/generate', (req, res) => {
  try {
    const force = Boolean(req.body && req.body.force);
    const result = agentEngine.memoryBank.generateDefaultBank(force);
    broadcast({ type: 'memory_bank_generated', result, stats: agentEngine.memoryBank.getStats() });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/memory/bank/curate', (req, res) => {
  try {
    const session = agentEngine.getActiveSession();
    const result = agentEngine.memoryBank.curateSession(session ? session.messages : []);
    broadcast({ type: 'memory_bank_curated', result, stats: agentEngine.memoryBank.getStats() });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/memory/bank/:filename', (req, res) => {
  try {
    const data = agentEngine.memoryBank.readFile(req.params.filename);
    res.json(data);
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

app.post('/api/memory/bank/:filename', (req, res) => {
  try {
    const { content } = req.body || {};
    if (typeof content !== 'string') return res.status(400).json({ error: 'Content string required' });
    const result = agentEngine.memoryBank.writeFile(req.params.filename, content);
    broadcast({ type: 'memory_bank_updated', filename: req.params.filename, result });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/memory/search', (req, res) => {
  try {
    const q = req.query.q || '';
    const results = agentEngine.memoryBank.search(q, null, 15);
    res.json(results);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 4a-3. Cellular Knowledge Graph & Project Cells Endpoints
app.get('/api/graph', (req, res) => {
  try {
    const graphData = knowledgeGraph.getGraphData();
    res.json(graphData);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/graph/cells/:id', (req, res) => {
  try {
    const cell = knowledgeGraph.getCell(req.params.id);
    res.json(cell);
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

app.post('/api/graph/cells', (req, res) => {
  try {
    const cell = knowledgeGraph.createCell(req.body);
    res.json({ success: true, cell });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/graph/cells/:id', (req, res) => {
  try {
    const { content } = req.body;
    if (typeof content !== 'string') return res.status(400).json({ error: 'Content required' });
    const cell = knowledgeGraph.saveCell(req.params.id, content);
    res.json({ success: true, cell });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/graph/cells/link', (req, res) => {
  try {
    const { sourceId, targetId, relation } = req.body;
    if (!sourceId || !targetId) return res.status(400).json({ error: 'sourceId and targetId required' });
    const result = knowledgeGraph.linkCells(sourceId, targetId, relation);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/graph/cells/:id', (req, res) => {
  try {
    const result = knowledgeGraph.deleteCell(req.params.id);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 4a-4. AI Knowledge Base & Self-Evolution System Endpoints
app.get('/api/knowledge', (req, res) => {
  try {
    const { q, taxonomy, status, limit } = req.query;
    const items = knowledgeEngine.queryKnowledge(q, {
      taxonomy: taxonomy || null,
      status: status || null,
      limit: parseInt(limit, 10) || 50,
      minConfidence: 0.0
    });
    res.json({ count: items.length, items });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/knowledge/stats', (req, res) => {
  try {
    res.json(knowledgeEngine.getStats());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/knowledge/queue', (req, res) => {
  try {
    res.json({
      count: knowledgeEngine.evolutionQueue.length,
      queue: knowledgeEngine.evolutionQueue,
      tokenBudget: knowledgeEngine.tokenBudget
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/knowledge/candidate', (req, res) => {
  try {
    const candidate = knowledgeEngine.proposeCandidate(req.body);
    res.json({ success: true, candidate });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/knowledge/:id/verify', (req, res) => {
  try {
    const result = knowledgeEngine.verifyCandidate(req.params.id, req.body);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/knowledge/audit', (req, res) => {
  try {
    const report = knowledgeEngine.runDeepAuditCycle();
    res.json({ success: true, report, stats: knowledgeEngine.getStats() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/knowledge/experience', (req, res) => {
  try {
    const expItems = [];
    if (fs.existsSync(knowledgeEngine.experienceDir)) {
      const files = fs.readdirSync(knowledgeEngine.experienceDir);
      for (const file of files.slice(-25)) {
        if (file.endsWith('.json')) {
          const raw = fs.readFileSync(path.join(knowledgeEngine.experienceDir, file), 'utf-8');
          expItems.push(JSON.parse(raw));
        }
      }
    }
    res.json({ count: expItems.length, experiences: expItems.reverse() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/knowledge/ingest', (req, res) => {
  try {
    const { sourceName, content, importance, tags } = req.body;
    const result = knowledgeEngine.ingestExternalSource(sourceName, content, { importance, tags });
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// 4b. Worker Mesh & Problem Matcher Endpoints
app.get('/api/workers', (req, res) => {
  res.json({
    workers: workerRegistry.getAllWorkers(),
    activeStaff: workerRegistry.getActiveWorkers(),
    passiveGuardians: workerRegistry.getPassiveGuardians(),
    counts: {
      total: workerRegistry.getAllWorkers().length,
      active: workerRegistry.getActiveWorkers().length,
      passive: workerRegistry.getPassiveGuardians().length
    }
  });
});

app.post('/api/workers/match', (req, res) => {
  const { prompt } = req.body;
  const match = workerRegistry.matchProblemToWorker(prompt);
  res.json(match || { matched: false, rationale: 'No matching worker found' });
});

app.post('/api/workers/:id/tier', (req, res) => {
  const { tier } = req.body;
  const worker = workerRegistry.setWorkerTier(req.params.id, tier);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });
  broadcast({ type: 'worker_tier_changed', worker });
  res.json({ success: true, worker });
});

app.post('/api/workers/:id/toggle', (req, res) => {
  const { status } = req.body;
  const worker = workerRegistry.toggleWorker(req.params.id, status);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });
  broadcast({ type: 'worker_toggled', worker });
  res.json({ success: true, worker });
});

app.get('/api/guardians/logs', (req, res) => {
  res.json({ logs: workerRegistry.guardianLogs });
});

app.post('/api/guardians/audit', (req, res) => {
  const { type, payload, context } = req.body;
  const results = workerRegistry.runPassiveAudits(type || 'manual_audit', payload, context || {});
  res.json({ success: true, audits: results });
});

// 5. Subagents & Tasks
app.get('/api/subagents', (req, res) => {
  const list = Array.from(toolRegistry.subagents.values());
  res.json({ subagents: list });
});

app.post('/api/subagents/spawn', async (req, res) => {
  const result = await toolRegistry.invoke_subagent({ Subagents: [req.body] });
  res.json(result);
});

app.post('/api/subagents/kill', async (req, res) => {
  const result = await toolRegistry.manage_subagents({ Action: 'kill', ConversationIds: [req.body.id] });
  broadcast({ type: 'subagents_updated', result });
  res.json(result);
});

app.get('/api/tasks', (req, res) => {
  const tasks = Array.from(toolRegistry.tasks.values()).map(t => ({
    id: t.id,
    command: t.command,
    status: t.status,
    startTime: t.startTime
  }));
  const timers = Array.from(toolRegistry.timers.values());
  res.json({ tasks, timers });
});

// 6. Direct Terminal Execution
app.post('/api/terminal/run', async (req, res) => {
  const { command, cwd } = req.body;
  try {
    const result = await toolRegistry.run_command({
      CommandLine: command,
      Cwd: cwd || WORKSPACE_DIR,
      WaitMsBeforeAsync: 8000
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 7. Antigravity Brain Transcripts Discovery
app.get('/api/transcripts', (req, res) => {
  const brainDir = path.join(os.homedir(), '.gemini', 'antigravity-cli', 'brain');
  if (!fs.existsSync(brainDir)) return res.json({ sessions: [] });
  try {
    const sessionDirs = fs.readdirSync(brainDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => {
        const transcriptPath = path.join(brainDir, d.name, '.system_generated', 'logs', 'transcript.jsonl');
        const hasTranscript = fs.existsSync(transcriptPath);
        return {
          id: d.name,
          hasTranscript,
          transcriptPath: hasTranscript ? transcriptPath : null
        };
      });
    res.json({ sessions: sessionDirs });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 8. Configuration
app.get('/api/config', (req, res) => {
  res.json(agentEngine.config);
});

app.post('/api/config', (req, res) => {
  agentEngine.updateConfig(req.body);
  broadcast({ type: 'config_updated', config: agentEngine.config });
  res.json({ success: true, config: agentEngine.config });
});

// Start Server with Port Availability Check
function startServer(port) {
  server.listen(port, () => {
    console.log(`\n=================================================`);
    console.log(`🚀 Antigravity Harness (AGH) Web UI Running!`);
    console.log(`   URL: http://127.0.0.1:${port}`);
    console.log(`   DeepSeek Harness Slot Architecture Ready`);
    console.log(`   Workspace Root: ${WORKSPACE_DIR}`);
    console.log(`=================================================\n`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${port} is in use, trying port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer(PORT);
