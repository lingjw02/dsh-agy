const fs = require('fs');
const path = require('path');
const os = require('os');
const { CordisKernel } = require('./cordis');

function classifySkillFunctionality(name, description = '') {
  const n = name.toLowerCase();
  const d = description.toLowerCase();

  // 1. Creative Tools & CLIs
  if (n.startsWith('cli-') || n.includes('gimp') || n.includes('cli-hub')) {
    return {
      functionalCategory: 'Software CLIs & Tools',
      badgeColor: 'emerald',
      icon: 'terminal'
    };
  }

  // 2. Visual, Mobile & Multimodal
  if (n.includes('imagegen') || n.includes('image-to-code') || n.includes('mobile')) {
    return {
      functionalCategory: 'Visual & Mobile UI',
      badgeColor: 'cyan',
      icon: 'smartphone'
    };
  }

  // 3. Frontend Design & Aesthetic Engineering (Anti-Slop)
  if (n.includes('taste') || n.includes('brutalist') || n.includes('minimalist') || n.includes('soft-skill') || n.includes('stitch') || n.includes('brandkit') || n.includes('redesign') || n.includes('output-skill') || n.includes('frontend')) {
    return {
      functionalCategory: 'Frontend Design & Taste',
      badgeColor: 'fuchsia',
      icon: 'palette'
    };
  }

  // 4. Agent Workflow & Planning
  if (n.includes('brainstorm') || n.includes('parallel-agents') || n.includes('plan') || n.includes('development-branch') || n.includes('code-review')) {
    return {
      functionalCategory: 'Agent Workflows & Planning',
      badgeColor: 'amber',
      icon: 'git-pull-request'
    };
  }

  // 5. Architecture & Antigravity Core
  return {
    functionalCategory: 'Architecture & System',
    badgeColor: 'indigo',
    icon: 'layers'
  };
}

class PluginManager {
  constructor(options = {}) {
    this.workspace = options.workspace || process.cwd();
    this.plugins = new Map(); // id -> plugin definition
    this.slots = {
      'sidebar:tab': [],
      'composer:command': [],
      'composer:mention': [],
      'tool:provider': [],
      'canvas:renderer': []
    };
    this.enabledPlugins = new Set();

    // Initialize Cordis Kernel for DeepSeek Harness Plugins
    this.cordis = new CordisKernel({
      workspace: this.workspace,
      slots: this.slots
    });

    this.initDefaultPlugins();
    this.discoverLocalCustomizations();
  }

  setDependencies({ toolRegistry, agentEngine, broadcast }) {
    this.cordis.setDependencies({
      toolRegistry,
      agentEngine,
      broadcast,
      slots: this.slots
    });
    // Auto-discover DSH Plugins now that dependencies are hooked
    this.cordis.discoverDshPlugins();
  }

  registerSlot(slotName, item) {
    if (!this.slots[slotName]) {
      this.slots[slotName] = [];
    }
    this.slots[slotName].push(item);
  }

  registerPlugin(plugin) {
    this.plugins.set(plugin.id, {
      ...plugin,
      enabled: plugin.enabled !== false
    });
    if (plugin.enabled !== false) {
      this.enabledPlugins.add(plugin.id);
    }
  }

  togglePlugin(id, enable) {
    // Check if it's a DSH Plugin
    if (id.startsWith('dsh-')) {
      const result = this.cordis.togglePlugin(id, enable);
      return result;
    }

    if (this.plugins.has(id)) {
      const plugin = this.plugins.get(id);
      plugin.enabled = typeof enable === 'boolean' ? enable : !plugin.enabled;
      if (plugin.enabled) {
        this.enabledPlugins.add(id);
      } else {
        this.enabledPlugins.delete(id);
      }
      return plugin;
    }
    return null;
  }

  // Allow creating/loading DSH plugin dynamically
  loadDshPluginFromCode(name, code) {
    const pluginDir = path.join(this.cordis.pluginsDirectory, name);
    if (!fs.existsSync(pluginDir)) {
      fs.mkdirSync(pluginDir, { recursive: true });
    }
    const filePath = path.join(pluginDir, 'index.js');
    fs.writeFileSync(filePath, code, 'utf-8');
    return this.cordis.loadPlugin(filePath);
  }

  initDefaultPlugins() {
    // 1. Antigravity Built-in Slash Commands (Slots: composer:command)
    const defaultSlashCommands = [
      { id: 'cmd-goal', name: '/goal', description: 'Run a persistent, deep task until the goal is fully accomplished without stopping early', category: 'Workflow' },
      { id: 'cmd-plan', name: '/plan', description: 'Create an exhaustive step-by-step implementation plan before writing any code', category: 'Workflow' },
      { id: 'cmd-schedule', name: '/schedule', description: 'Schedule one-shot timer or recurring cron background agent tasks', category: 'Automation' },
      { id: 'cmd-browser', name: '/browser', description: 'Trigger browser automation, web scraping, and automated visual QA testing', category: 'Tools' },
      { id: 'cmd-grill-me', name: '/grill-me', description: 'Interactive interview mode to clarify ambiguities and design decisions', category: 'Interaction' },
      { id: 'cmd-boost', name: '/boost', description: 'Activate high-reasoning mode with multi-perspective verification', category: 'Reasoning' },
      { id: 'cmd-learn', name: '/learn', description: 'Extract learnings, corrections, and persist new skill instructions', category: 'Memory' },
      { id: 'cmd-memory', name: '/memory', description: 'Hermes AI Memory Bank: inspect, search, curate, or initialize persistent markdown memories', category: 'Memory' },
      { id: 'cmd-graph', name: '/graph', description: 'Obsidian Cellular Knowledge Graph: inspect project cells, links, and wikilink topology', category: 'Knowledge Graph' },
      { id: 'cmd-teamwork', name: '/teamwork-preview', description: 'Orchestrate a swarm of autonomous subagents working collaboratively', category: 'Multi-Agent' }
    ];

    defaultSlashCommands.forEach(cmd => {
      this.registerSlot('composer:command', cmd);
    });

    // 2. Default Core Tools (Slots: tool:provider)
    const coreTools = [
      { id: 'tool-run-command', name: 'run_command', description: 'Execute powershell/bash commands directly in terminal sandbox' },
      { id: 'tool-view-file', name: 'view_file', description: 'Read files or inspect directories in workspace' },
      { id: 'tool-write-file', name: 'write_to_file', description: 'Create or overwrite files and generate artifacts' },
      { id: 'tool-replace-file', name: 'replace_file_content', description: 'Targeted code block replacement' },
      { id: 'tool-invoke-subagent', name: 'invoke_subagent', description: 'Spawn specialized subagents concurrently' },
      { id: 'tool-manage-subagents', name: 'manage_subagents', description: 'Inspect or terminate active subagents' },
      { id: 'tool-send-message', name: 'send_message', description: 'Send peer or subagent communication' },
      { id: 'tool-schedule', name: 'schedule', description: 'One-shot timer or recurring cron job' },
      { id: 'tool-manage-task', name: 'manage_task', description: 'Background task management and interactive stdin' },
      { id: 'tool-search-web', name: 'search_web', description: 'Fast web and documentation search' },
      { id: 'tool-ask-question', name: 'ask_question', description: 'Prompt interactive multiple-choice question to user' }
    ];

    this.registerPlugin({
      id: 'plugin-antigravity-core',
      name: 'Antigravity Core Tools',
      type: 'other',
      kind: 'other',
      category: 'Core Runtime Tools',
      version: '2.5.0',
      description: 'Native Antigravity tooling for terminal, workspace, and multi-agent management',
      items: coreTools,
      enabled: true
    });

    // 3. GenUI Renderers (Slots: canvas:renderer)
    this.registerSlot('canvas:renderer', { id: 'renderer-markdown', name: 'GFM Markdown & Alerts' });
    this.registerSlot('canvas:renderer', { id: 'renderer-code-diff', name: 'Unified / Split Code Diff' });
    this.registerSlot('canvas:renderer', { id: 'renderer-mermaid', name: 'Mermaid Diagrams & Flowcharts' });
    this.registerSlot('canvas:renderer', { id: 'renderer-trajectory', name: 'DeepSeek Monospace Trajectory' });
  }

  discoverLocalCustomizations() {
    const homeDir = os.homedir();

    // 0. Harness Native Skills Library (D:\02_Development_Tools\Antigravity harness\skills)
    const harnessSkillsDir = path.resolve(__dirname, '..', 'skills');
    this.loadSkillsFromDir(harnessSkillsDir, 'Harness Library');

    // 1. Antigravity Built-in Skills
    const builtinSkillsDir = path.join(homeDir, '.gemini', 'antigravity-cli', 'builtin', 'skills');
    this.loadSkillsFromDir(builtinSkillsDir, 'Built-in Skill');

    // 2. User Installed Agent Skills
    const userSkillsDir = path.join(homeDir, '.agents', 'skills');
    this.loadSkillsFromDir(userSkillsDir, 'Agent Skill');

    // 3. Workspace Workflow Skills
    const workspaceSkillsDir = path.join(homeDir, 'skills');
    this.loadSkillsFromDir(workspaceSkillsDir, 'Workflow Skill');

    // 4. Taste & Design Skills
    const tasteSkillsDir = path.join(homeDir, 'taste-skill', 'skills');
    this.loadSkillsFromDir(tasteSkillsDir, 'Taste & Design');

    // 5. Discover MCP Servers
    const mcpDir = path.join(homeDir, '.gemini', 'antigravity-cli', 'mcp');
    this.loadMcpServersFromDir(mcpDir);
  }

  loadSkillsFromDir(dirPath, category) {
    if (!fs.existsSync(dirPath)) return;
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skillPath = path.join(dirPath, entry.name);
          const skillMd = path.join(skillPath, 'SKILL.md');
          const skillMdAlt = path.join(skillPath, 'skill.md');
          const readmeMd = path.join(skillPath, 'README.md');

          let docPath = fs.existsSync(skillMd) ? skillMd : (fs.existsSync(skillMdAlt) ? skillMdAlt : (fs.existsSync(readmeMd) ? readmeMd : null));

          let description = `${category}: ${entry.name}`;
          if (docPath && fs.existsSync(docPath)) {
            const content = fs.readFileSync(docPath, 'utf-8');
            const descMatch = content.match(/description:\s*(.+)/i);
            if (descMatch) {
              description = descMatch[1].trim();
            } else {
              const lines = content.split('\n').filter(l => l.trim().length > 0 && !l.startsWith('#') && !l.startsWith('---'));
              if (lines.length > 0) {
                description = lines[0].slice(0, 140);
              }
            }
          }

          const pluginId = `skill-${entry.name}`;
          if (this.plugins.has(pluginId)) {
            continue;
          }

          const classification = classifySkillFunctionality(entry.name, description);

          this.registerPlugin({
            id: pluginId,
            name: entry.name,
            type: 'skill',
            kind: 'skill',
            category: classification.functionalCategory,
            functionalCategory: classification.functionalCategory,
            badgeColor: classification.badgeColor,
            icon: classification.icon,
            origin: category,
            path: skillPath,
            docPath,
            description,
            enabled: true
          });

          this.registerSlot('composer:mention', {
            id: `@skill:${entry.name}`,
            name: `@${entry.name}`,
            type: 'skill',
            functionalCategory: classification.functionalCategory,
            description
          });
        }
      }
    } catch (e) {
      console.warn(`Error scanning skills in ${dirPath}:`, e.message);
    }
  }

  loadMcpServersFromDir(mcpDir) {
    if (!fs.existsSync(mcpDir)) return;
    try {
      const entries = fs.readdirSync(mcpDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const serverName = entry.name;
          const serverPath = path.join(mcpDir, serverName);
          let toolCount = 0;
          let tools = [];

          try {
            const files = fs.readdirSync(serverPath);
            tools = files.filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
            toolCount = tools.length;
          } catch (_) {}

          const pluginId = `mcp-${serverName}`;
          this.registerPlugin({
            id: pluginId,
            name: `MCP: ${serverName}`,
            type: 'mcp',
            kind: 'mcp',
            category: 'Model Context Protocol Server',
            serverName,
            path: serverPath,
            description: `Model Context Protocol server with ${toolCount} lazy-loaded tools`,
            tools,
            enabled: true
          });

          this.registerSlot('composer:mention', {
            id: `@mcp:${serverName}`,
            name: `@mcp:${serverName}`,
            type: 'mcp',
            description: `Attach MCP server ${serverName} context`
          });
        }
      }
    } catch (e) {
      console.warn(`Error scanning MCP servers in ${mcpDir}:`, e.message);
    }
  }

  getAllPlugins() {
    const dshPlugins = this.cordis ? this.cordis.getAllPlugins() : [];
    const regularPlugins = Array.from(this.plugins.values());
    return [...dshPlugins, ...regularPlugins];
  }

  getSlots() {
    return this.slots;
  }
}

module.exports = { PluginManager, classifySkillFunctionality };
