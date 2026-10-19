const fs = require('fs');
const path = require('path');

/**
 * CellularKnowledgeGraph
 * 
 * Implements Obsidian-style cellular knowledge graph for Antigravity Harness:
 * - Reifies the knowledge base into physical, interconnected Markdown files
 * - Each Project is a primary Cell node
 * - Memory cells (ADRs, conventions, technical specs, rules) connect to projects
 * - Bidirectional linking via Obsidian [[wikilinks]] syntax
 * - Generates node-link topology for real-time 2D/3D force-directed visualization
 */
class CellularKnowledgeGraph {
  constructor(options = {}) {
    this.workspace = options.workspace || process.cwd();
    this.memoryDir = options.memoryDir || path.resolve(this.workspace, 'memory');
    this.projectsDir = path.join(this.memoryDir, 'projects');
    this.cellsDir = path.join(this.memoryDir, 'cells');
    this.broadcast = options.broadcast || (() => {});

    this.ensureDirectories();
  }

  ensureDirectories() {
    try {
      if (!fs.existsSync(this.memoryDir)) fs.mkdirSync(this.memoryDir, { recursive: true });
      if (!fs.existsSync(this.projectsDir)) fs.mkdirSync(this.projectsDir, { recursive: true });
      if (!fs.existsSync(this.cellsDir)) fs.mkdirSync(this.cellsDir, { recursive: true });

      // Check if project cells exist, otherwise scaffold initial project cells
      const projects = fs.readdirSync(this.projectsDir);
      if (projects.length === 0) {
        this.scaffoldDefaultCells();
      }
    } catch (e) {
      console.error('Failed to initialize Cellular Knowledge Graph directories:', e);
    }
  }

  /**
   * Scaffold standard project cells and connected memory cells
   */
  scaffoldDefaultCells() {
    // 1. Projects
    const defaultProjects = [
      {
        id: 'antigravity-harness',
        name: 'Antigravity Harness (AGH)',
        type: 'project',
        color: '#06b6d4', // Cyan
        tags: ['harness', 'workbench', 'orchestrator'],
        status: 'active',
        content: `---
id: antigravity-harness
name: Antigravity Harness (AGH)
type: project
color: "#06b6d4"
tags: [harness, workbench, orchestrator]
status: active
updatedAt: ${new Date().toISOString()}
---

# 🪐 Project: Antigravity Harness

The central developer cockpit and agentic runtime implementing DeepSeek Harness slot architecture.

## 🔗 Connected Subsystems & Projects
- Runtime Engine: [[cordis-runtime]]
- Multi-Agent Fleet: [[worker-mesh]]
- Trajectory Inspector: [[deepseek-trajectory]]
- Knowledge Core: [[hermes-memory-system]]

## 🧠 Linked Memory Cells
- Design Standard: [[anti-slop-ui-standard]]
- Shell Environment: [[powershell-sandbox]]
- Model Telemetry: [[quota-telemetry-engine]]
`
      },
      {
        id: 'cordis-runtime',
        name: 'Cordis Slot Runtime',
        type: 'project',
        color: '#a855f7', // Purple
        tags: ['cordis', 'kernel', 'plugins'],
        status: 'active',
        content: `---
id: cordis-runtime
name: Cordis Slot Runtime
type: project
color: "#a855f7"
tags: [cordis, kernel, plugins]
status: active
updatedAt: ${new Date().toISOString()}
---

# 🔌 Project: Cordis Slot Runtime

Modular plugin kernel powering "Everything is a Plugin" slot architecture.

## 🔗 Connected Projects
- Host Container: [[antigravity-harness]]
- Plugin Ecosystem: [[dsh-plugin-ecosystem]]
- Multi-Agent Fleet: [[worker-mesh]]

## 🧠 Linked Memory Cells
- Extension API: [[cordis-slot-specification]]
- Lifecycle Management: [[hot-reload-reversible-teardown]]
`
      },
      {
        id: 'worker-mesh',
        name: 'Hybrid Worker Mesh',
        type: 'project',
        color: '#10b981', // Emerald
        tags: ['fleet', 'agents', 'guardians'],
        status: 'active',
        content: `---
id: worker-mesh
name: Hybrid Worker Mesh
type: project
color: "#10b981"
tags: [fleet, agents, guardians]
status: active
updatedAt: ${new Date().toISOString()}
---

# 🛡️ Project: Hybrid Worker Mesh

Dual-tier multi-agent swarm architecture fusing Active Front Staff with Passive Hybrid Guardians.

## 🔗 Connected Projects
- Orchestrator: [[antigravity-harness]]
- Plugin Host: [[cordis-runtime]]

## 🧠 Linked Memory Cells
- Token Watchdog: [[token-saver-protocol]]
- Safety Auditing: [[passive-guardians-rules]]
- Aesthetic Guard: [[anti-slop-ui-standard]]
`
      },
      {
        id: 'deepseek-trajectory',
        name: 'DeepSeek Trajectory Stream',
        type: 'project',
        color: '#f59e0b', // Amber
        tags: ['trajectory', 'stream', 'observability'],
        status: 'active',
        content: `---
id: deepseek-trajectory
name: DeepSeek Trajectory Stream
type: project
color: "#f59e0b"
tags: [trajectory, stream, observability]
status: active
updatedAt: ${new Date().toISOString()}
---

# 🔍 Project: DeepSeek Trajectory Stream

Real-time Chain of Thought inspector with tool execution telemetry and JSONL stream logging.

## 🔗 Connected Projects
- Main Workbench: [[antigravity-harness]]
- Memory Hub: [[hermes-memory-system]]

## 🧠 Linked Memory Cells
- Token Metrics: [[quota-telemetry-engine]]
`
      },
      {
        id: 'hermes-memory-system',
        name: 'Hermes Memory Engine',
        type: 'project',
        color: '#ec4899', // Pink / Rose
        tags: ['memory', 'hermes', 'knowledge-graph'],
        status: 'active',
        content: `---
id: hermes-memory-system
name: Hermes Memory Engine
type: project
color: "#ec4899"
tags: [memory, hermes, knowledge-graph]
status: active
updatedAt: ${new Date().toISOString()}
---

# 🧠 Project: Hermes Memory Engine

Tier-1 persistent Markdown memory bank and cellular knowledge graph with Obsidian wikilinks.

## 🔗 Connected Projects
- Core Host: [[antigravity-harness]]
- Visual Graph: [[cellular-obsidian-graph]]

## 🧠 Linked Memory Cells
- Decision Log: [[adr-001-obsidian-cellular-graph]]
- Budget Watchdog: [[bounded-memory-budget-rules]]
`
      }
    ];

    // 2. Memory Cells (Satellites attached to projects)
    const defaultMemoryCells = [
      {
        id: 'anti-slop-ui-standard',
        name: 'Anti-Slop Design Taste',
        type: 'memory',
        color: '#f43f5e',
        tags: ['design-taste', 'ui', 'anti-slop'],
        content: `---
id: anti-slop-ui-standard
name: Anti-Slop Design Taste
type: memory
color: "#f43f5e"
tags: [design-taste, ui, anti-slop]
updatedAt: ${new Date().toISOString()}
---

# 🎨 Memory Cell: Anti-Slop UI Standard

Enforces high-taste frontend engineering. Eliminates generic AI gray cards, enforces high-contrast palettes, device mockups, and intentional typography.

## 🔗 Associated Projects
- Applied to: [[antigravity-harness]]
- Monitored by: [[worker-mesh]]
`
      },
      {
        id: 'powershell-sandbox',
        name: 'PowerShell Sandbox Execution',
        type: 'memory',
        color: '#3b82f6',
        tags: ['terminal', 'powershell', 'sandbox'],
        content: `---
id: powershell-sandbox
name: PowerShell Sandbox Execution
type: memory
color: "#3b82f6"
tags: [terminal, powershell, sandbox]
updatedAt: ${new Date().toISOString()}
---

# 🖥️ Memory Cell: PowerShell Sandbox

Handles asynchronous shell execution on Windows host with strict timeout, stderr/stdout streaming, and process isolation.

## 🔗 Associated Projects
- Core Tool for: [[antigravity-harness]]
`
      },
      {
        id: 'token-saver-protocol',
        name: 'Token-Saver & Code Integrity',
        type: 'memory',
        color: '#10b981',
        tags: ['token-saver', 'code-integrity', 'anti-truncation'],
        content: `---
id: token-saver-protocol
name: Token-Saver & Code Integrity
type: memory
color: "#10b981"
tags: [token-saver, code-integrity, anti-truncation]
updatedAt: ${new Date().toISOString()}
---

# 🛡️ Memory Cell: Token-Saver Protocol

Prevents cut-off code, incomplete functions, and \`// TODO ... rest of code\` comments. Mandates 100% fully implemented solutions.

## 🔗 Associated Projects
- Enforced by: [[worker-mesh]]
`
      },
      {
        id: 'quota-telemetry-engine',
        name: 'Model Quota & Cost Telemetry',
        type: 'memory',
        color: '#eab308',
        tags: ['quota', 'tokens', 'cost'],
        content: `---
id: quota-telemetry-engine
name: Model Quota & Cost Telemetry
type: memory
color: "#eab308"
tags: [quota, tokens, cost]
updatedAt: ${new Date().toISOString()}
---

# 📊 Memory Cell: Quota Telemetry

Tracks token consumption, RPM/TPM rate limits, and estimated API expenditure across Gemini, DeepSeek V3, and DeepSeek R1.

## 🔗 Associated Projects
- Displayed in: [[antigravity-harness]]
- Monitored by: [[deepseek-trajectory]]
`
      },
      {
        id: 'dsh-plugin-ecosystem',
        name: 'DSH Plugin Ecosystem Catalog',
        type: 'memory',
        color: '#8b5cf6',
        tags: ['dsh-plugin', 'marketplace', 'cordis'],
        content: `---
id: dsh-plugin-ecosystem
name: DSH Plugin Ecosystem Catalog
type: memory
color: "#8b5cf6"
tags: [dsh-plugin, marketplace, cordis]
updatedAt: ${new Date().toISOString()}
---

# 🧩 Memory Cell: DSH Plugin Ecosystem

Standardized repository of DeepSeek Harness plugins with \`apply(ctx)\` hooks, dynamic slots, and reversibility.

## 🔗 Associated Projects
- Managed by: [[cordis-runtime]]
`
      },
      {
        id: 'adr-001-obsidian-cellular-graph',
        name: 'ADR-001: Obsidian Cellular Graph View',
        type: 'memory',
        color: '#ec4899',
        tags: ['adr', 'architecture', 'graph-view', 'obsidian'],
        content: `---
id: adr-001-obsidian-cellular-graph
name: ADR-001: Obsidian Cellular Graph View
type: memory
color: "#ec4899"
tags: [adr, architecture, graph-view, obsidian]
updatedAt: ${new Date().toISOString()}
---

# 🏛️ Memory Cell: ADR-001 Obsidian Graph

Decision to reify the agent's knowledge base into cellular project entities linked via Obsidian-compatible wikilinks (\`[[...]]\`) and force-directed graph rendering.

## 🔗 Associated Projects
- Built into: [[hermes-memory-system]]
- Visualized on: [[antigravity-harness]]
`
      }
    ];

    // Write projects
    for (const p of defaultProjects) {
      const filePath = path.join(this.projectsDir, `${p.id}.md`);
      fs.writeFileSync(filePath, p.content.trim() + '\n', 'utf-8');
    }

    // Write memory cells
    for (const m of defaultMemoryCells) {
      const filePath = path.join(this.cellsDir, `${m.id}.md`);
      fs.writeFileSync(filePath, m.content.trim() + '\n', 'utf-8');
    }

    console.log(`🕸️ [CellularKnowledgeGraph] Scaffolded ${defaultProjects.length} Projects & ${defaultMemoryCells.length} Memory Cells.`);
  }

  /**
   * Parse YAML frontmatter and markdown body
   */
  parseMarkdownFile(filePath) {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    const filename = path.basename(filePath, '.md');

    let frontmatter = {};
    let body = raw;

    const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (fmMatch) {
      const yamlBlock = fmMatch[1];
      body = fmMatch[2];

      yamlBlock.split('\n').forEach(line => {
        const parts = line.split(':');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          let val = parts.slice(1).join(':').trim();
          // Strip quotes
          val = val.replace(/^["']|["']$/g, '');
          // Parse array [a, b]
          if (val.startsWith('[') && val.endsWith(']')) {
            val = val.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
          }
          frontmatter[key] = val;
        }
      });
    }

    // Extract [[wikilinks]]
    const wikilinks = [];
    const linkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
    let match;
    while ((match = linkRegex.exec(body)) !== null) {
      const targetId = match[1].trim();
      const label = match[2] ? match[2].trim() : targetId;
      if (!wikilinks.some(l => l.targetId === targetId)) {
        wikilinks.push({ targetId, label });
      }
    }

    // Extract tags (#tag)
    const tagMatches = body.match(/#[a-zA-Z0-9_\-]+/g) || [];
    const explicitTags = Array.isArray(frontmatter.tags) ? frontmatter.tags : (frontmatter.tags ? [frontmatter.tags] : []);
    const mergedTags = Array.from(new Set([...explicitTags, ...tagMatches.map(t => t.slice(1))]));

    // First heading as title fallback
    const titleMatch = body.match(/^#\s+(.+)$/m);
    const title = frontmatter.name || (titleMatch ? titleMatch[1].trim() : filename);

    return {
      id: frontmatter.id || filename,
      name: title,
      type: frontmatter.type || 'memory',
      color: frontmatter.color || (frontmatter.type === 'project' ? '#06b6d4' : '#a855f7'),
      tags: mergedTags,
      status: frontmatter.status || 'active',
      summary: body.slice(0, 160).replace(/[#*`>]/g, '').trim(),
      content: raw,
      body,
      wikilinks,
      filePath,
      filename
    };
  }

  /**
   * Get complete Obsidian Graph data (nodes & links) with backlinks
   */
  getGraphData() {
    this.ensureDirectories();

    const nodeMap = new Map();
    const linkList = [];

    // 1. Read Project Cells
    if (fs.existsSync(this.projectsDir)) {
      const files = fs.readdirSync(this.projectsDir).filter(f => f.endsWith('.md'));
      for (const file of files) {
        const parsed = this.parseMarkdownFile(path.join(this.projectsDir, file));
        if (parsed) {
          parsed.type = 'project';
          parsed.backlinks = [];
          nodeMap.set(parsed.id, parsed);
        }
      }
    }

    // 2. Read Memory Cells
    if (fs.existsSync(this.cellsDir)) {
      const files = fs.readdirSync(this.cellsDir).filter(f => f.endsWith('.md'));
      for (const file of files) {
        const parsed = this.parseMarkdownFile(path.join(this.cellsDir, file));
        if (parsed) {
          parsed.type = parsed.type === 'project' ? 'project' : 'memory';
          parsed.backlinks = [];
          nodeMap.set(parsed.id, parsed);
        }
      }
    }

    // 3. Resolve links and compute bidirectional backlinks
    for (const [sourceId, node] of nodeMap.entries()) {
      for (const link of node.wikilinks) {
        const targetId = link.targetId;
        // Check if target exists in nodeMap
        if (nodeMap.has(targetId)) {
          const targetNode = nodeMap.get(targetId);
          // Add backlink
          if (!targetNode.backlinks.some(b => b.id === sourceId)) {
            targetNode.backlinks.push({ id: sourceId, name: node.name, type: node.type });
          }

          // Edge
          const edgeId = `${sourceId}->${targetId}`;
          if (!linkList.some(l => (l.source === sourceId && l.target === targetId) || (l.source === targetId && l.target === sourceId))) {
            linkList.push({
              id: edgeId,
              source: sourceId,
              target: targetId,
              label: link.label !== targetId ? link.label : ''
            });
          }
        }
      }
    }

    // Format nodes for force simulation
    const nodes = Array.from(nodeMap.values()).map(n => ({
      id: n.id,
      name: n.name,
      type: n.type,
      color: n.color,
      tags: n.tags,
      status: n.status,
      summary: n.summary,
      filePath: n.filePath,
      filename: n.filename,
      linksCount: n.wikilinks.length,
      backlinksCount: n.backlinks.length,
      // Node visual scale (Projects are larger cells)
      size: n.type === 'project' ? 14 : 9,
      wikilinks: n.wikilinks,
      backlinks: n.backlinks
    }));

    return {
      stats: {
        totalNodes: nodes.length,
        projectCells: nodes.filter(n => n.type === 'project').length,
        memoryCells: nodes.filter(n => n.type === 'memory').length,
        totalLinks: linkList.length
      },
      nodes,
      links: linkList
    };
  }

  /**
   * Get single cell details with full markdown and links
   */
  getCell(id) {
    const projectPath = path.join(this.projectsDir, `${id}.md`);
    const cellPath = path.join(this.cellsDir, `${id}.md`);

    const filePath = fs.existsSync(projectPath) ? projectPath : (fs.existsSync(cellPath) ? cellPath : null);
    if (!filePath) {
      throw new Error(`Cell "${id}" not found`);
    }

    const parsed = this.parseMarkdownFile(filePath);
    const graph = this.getGraphData();
    const nodeFromGraph = graph.nodes.find(n => n.id === id);

    return {
      ...parsed,
      backlinks: nodeFromGraph ? nodeFromGraph.backlinks : []
    };
  }

  /**
   * Save / update a cell markdown file
   */
  saveCell(id, content) {
    const projectPath = path.join(this.projectsDir, `${id}.md`);
    const cellPath = path.join(this.cellsDir, `${id}.md`);

    const filePath = fs.existsSync(projectPath) ? projectPath : cellPath;
    fs.writeFileSync(filePath, content, 'utf-8');

    const updated = this.getCell(id);
    this.broadcast({
      type: 'cell_updated',
      cell: updated,
      graph: this.getGraphData()
    });
    return updated;
  }

  /**
   * Create a new project cell or memory cell
   */
  createCell({ id, name, type = 'project', tags = [], color, content }) {
    this.ensureDirectories();
    const cleanId = (id || name).toLowerCase().replace(/[^a-z0-9\-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const dir = type === 'project' ? this.projectsDir : this.cellsDir;
    const filePath = path.join(dir, `${cleanId}.md`);

    if (fs.existsSync(filePath)) {
      throw new Error(`Cell with ID "${cleanId}" already exists.`);
    }

    const cellColor = color || (type === 'project' ? '#06b6d4' : '#a855f7');
    const tagList = Array.isArray(tags) ? tags : [tags];

    const markdown = content || `---
id: ${cleanId}
name: ${name}
type: ${type}
color: "${cellColor}"
tags: [${tagList.join(', ')}]
status: active
updatedAt: ${new Date().toISOString()}
---

# ${type === 'project' ? '🪐 Project' : '🧠 Memory'}: ${name}

Describe the core purpose, technical specifications, and key deliverables of this cell here.

## 🔗 Related Cells
- Host: [[antigravity-harness]]
`;

    fs.writeFileSync(filePath, markdown.trim() + '\n', 'utf-8');
    const newCell = this.getCell(cleanId);

    this.broadcast({
      type: 'cell_created',
      cell: newCell,
      graph: this.getGraphData()
    });

    return newCell;
  }

  /**
   * Link two cells by appending [[targetId]] to source cell markdown
   */
  linkCells(sourceId, targetId, relation = 'relates-to') {
    const sourceCell = this.getCell(sourceId);
    let content = sourceCell.content;

    if (content.includes(`[[${targetId}]]`)) {
      return { success: true, message: 'Already linked', sourceId, targetId };
    }

    const linkText = `\n- [[${targetId}]] (${relation})\n`;
    if (content.includes('## 🔗 Related') || content.includes('## 🔗 Connected')) {
      content = content.trimEnd() + linkText;
    } else {
      content = content.trimEnd() + `\n\n## 🔗 Related Cells\n${linkText}`;
    }

    this.saveCell(sourceId, content);
    return { success: true, sourceId, targetId, relation };
  }

  /**
   * Delete a cell file
   */
  deleteCell(id) {
    const projectPath = path.join(this.projectsDir, `${id}.md`);
    const cellPath = path.join(this.cellsDir, `${id}.md`);
    const filePath = fs.existsSync(projectPath) ? projectPath : (fs.existsSync(cellPath) ? cellPath : null);

    if (!filePath) throw new Error(`Cell "${id}" not found`);
    fs.unlinkSync(filePath);

    this.broadcast({
      type: 'cell_deleted',
      id,
      graph: this.getGraphData()
    });

    return { success: true, id };
  }
}

module.exports = { CellularKnowledgeGraph };
