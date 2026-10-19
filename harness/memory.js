const fs = require('fs');
const path = require('path');

/**
 * HermesMemoryBank
 * 
 * Implements the Nous Research Hermes AI tiered persistent memory architecture:
 * - Layer 1 Built-in Memory Bank stored directly in workspace (default: ./memory/)
 * - Core bounded Markdown files:
 *   1. MEMORY.md: Durable facts, architecture patterns, tech conventions, tool workarounds (~2,500 char budget)
 *   2. USER.md: Persistent user profile, role, preferences, communication style (~1,500 char budget)
 *   3. activeContext.md: Immediate session focus, current task goals, recent changes (~3,000 char budget)
 *   4. decisions.md: Architectural Decision Records (ADR log) (~5,000 char budget)
 * - Automatic initialization & scaffolding ("直接在里边生成记忆库")
 * - Bounded budget enforcement and self-compaction assistance
 * - System prompt snapshot generation for persistent cross-session recall
 * - Full-text search and category extraction
 */
class HermesMemoryBank {
  constructor(options = {}) {
    this.workspace = options.workspace || process.cwd();
    // Default memory bank directory inside the workspace
    this.memoryDir = options.memoryDir || path.resolve(this.workspace, 'memory');
    this.broadcast = options.broadcast || (() => {});

    // Standard Hermes character budgets (bounded memory preventing context bloat)
    this.budgets = {
      'MEMORY.md': 2500,
      'USER.md': 1500,
      'activeContext.md': 3000,
      'decisions.md': 5000
    };

    // Ensure memory directory and core files exist on startup
    this.ensureBankExists();
  }

  /**
   * Check if memory bank directory exists, otherwise generate default files
   */
  ensureBankExists() {
    try {
      if (!fs.existsSync(this.memoryDir)) {
        fs.mkdirSync(this.memoryDir, { recursive: true });
        this.generateDefaultBank();
      } else {
        // Check if core files are present; if empty directory, generate
        const files = fs.readdirSync(this.memoryDir);
        if (files.length === 0 || !files.includes('MEMORY.md')) {
          this.generateDefaultBank();
        }
      }
    } catch (err) {
      console.error('Failed to initialize Hermes Memory Bank:', err);
    }
  }

  /**
   * Generate initial Hermes Memory Bank template files directly in the directory
   */
  generateDefaultBank(force = false) {
    if (!fs.existsSync(this.memoryDir)) {
      fs.mkdirSync(this.memoryDir, { recursive: true });
    }

    const defaultFiles = {
      'MEMORY.md': `# 🧠 Project Memory Bank (Durable Knowledge)
<!-- HERMES_MEMORY_TYPE: durable_facts -->
<!-- BOUNDED_BUDGET: 2500 chars -->

## Architecture & System
- **Framework**: Antigravity Harness (AGH) built on DeepSeek Harness (DSH) slot architecture.
- **Plugin System**: Powered by Cordis kernel (\`apply(ctx)\` plugin interface with slots \`composer:command\`, \`composer:mention\`, \`sidebar:tab\`).
- **Multi-Agent Fleet**: Worker mesh featuring Active Front Staff workers and Passive Hybrid Guardians.
- **Security Policy**: Configurable tool sandbox execution (\`always-proceed\`, \`request-review\`, \`proceed-in-sandbox\`, \`strict\`).
- **Memory Engine**: Hermes AI Layer-1 persistent markdown memory bank with character bounded budgets.

## Frontend & Anti-Slop Standards
- **Design Taste**: Enforce anti-slop frontend standards; avoid generic AI gray cards, use refined contrast, device frames, and intentional typography.
- **Code Integrity**: Zero truncated code blocks, no \`// TODO ... rest of code\` placeholders; always output complete runnable implementations.
- **File Links**: Always link referenced files with clickable Markdown links \`[file.ext](file:///path)\`.

## Tool Workarounds & Environment
- Terminal execution runs PowerShell on Windows with \`windowsHide: true\` and custom wait timeout.
- Cordis slots allow hot-reloading and reversible teardown via \`ctx.effect()\`.
- MCP servers auto-discovered from \`~/.gemini/antigravity-cli/mcp/\` (Brevo, Chrome DevTools, Supabase).
`,

      'USER.md': `# 👤 User Profile & Preferences
<!-- HERMES_MEMORY_TYPE: user_profile -->
<!-- BOUNDED_BUDGET: 1500 chars -->

## Identity & Role
- **Role**: Lead Architect & Full-Stack AI Engineer.
- **Workspace Root**: D:\\02_Development_Tools\\Antigravity harness
- **Language**: Chinese & English bilingual communication (concise, precise, and practical).

## Workflow Preferences
- **Tone**: Direct, concise, highly technical, action-oriented.
- **Architecture**: Modular plugin-based architectures (Cordis / DSH specification).
- **Memory System**: Prefers self-contained, human-readable Markdown Memory Banks (Hermes AI style) with persistent cross-session recall and direct workspace file generation.
- **Verification**: Always verify changes and state before concluding tasks.
`,

      'activeContext.md': `# 🎯 Active Context & Next Goals
<!-- HERMES_MEMORY_TYPE: active_context -->
<!-- BOUNDED_BUDGET: 3000 chars -->

## Current Focus
- Upgraded Antigravity Harness Memory system to Hermes AI Memory Bank architecture.
- Direct in-workspace memory bank generation (\`memory/\` folder with \`MEMORY.md\`, \`USER.md\`, \`activeContext.md\`, \`decisions.md\`).
- Integrated Memory Drawer UI with live character budgeting and self-compaction.

## Recent Milestones
- [x] Implemented \`HermesMemoryBank\` engine in \`harness/memory.js\`.
- [x] Connected Memory Bank snapshot injection to Antigravity Agent Engine system prompt.
- [x] Exposed REST APIs for memory bank reading, editing, generating, and curating.
- [x] Added dedicated Memory Bank tab in the Auxiliary Workbench Drawer.
`,

      'decisions.md': `# 🏛️ Architectural Decision Log (ADR)
<!-- HERMES_MEMORY_TYPE: decision_log -->
<!-- BOUNDED_BUDGET: 5000 chars -->

## ADR-001: Hermes AI Markdown Memory Bank over Flat JSON Store
- **Status**: Accepted
- **Context**: The previous memory system used a single flat JSON file (\`.dsh_memory.json\`), lacking human readability, categorization, and bounded context management.
- **Decision**: Adopt Hermes AI's Markdown-first memory bank structure directly in the workspace (\`memory/\`).
- **Consequences**:
  1. Human-readable and agent-editable via standard file tools.
  2. Bounded character limits with self-compaction prevents context window bloat.
  3. Direct snapshot injection into the agent's system prompt ensures continuous cross-session recall.
`
    };

    const results = [];
    for (const [filename, content] of Object.entries(defaultFiles)) {
      const filePath = path.join(this.memoryDir, filename);
      if (force || !fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, content.trim() + '\n', 'utf-8');
        results.push({ filename, status: 'created', bytes: Buffer.byteLength(content) });
      } else {
        results.push({ filename, status: 'preserved' });
      }
    }

    // Write manifest.json
    this.updateManifest();

    this.broadcast({
      type: 'memory_bank_generated',
      directory: this.memoryDir,
      files: results,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      directory: this.memoryDir,
      files: results
    };
  }

  /**
   * Update manifest metadata file
   */
  updateManifest() {
    try {
      const manifestPath = path.join(this.memoryDir, 'manifest.json');
      const stats = this.getStats();
      const manifest = {
        name: 'Antigravity Hermes Memory Bank',
        version: '2.0.0',
        architecture: 'Hermes AI Tier-1 Persistent Markdown',
        lastUpdated: new Date().toISOString(),
        directory: this.memoryDir,
        files: stats.files
      };
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
    } catch (_) {}
  }

  /**
   * List all memory files and their stats (size, chars, budget usage)
   */
  getStats() {
    this.ensureBankExists();
    const files = ['MEMORY.md', 'USER.md', 'activeContext.md', 'decisions.md'];
    const fileStats = [];

    let totalChars = 0;

    for (const filename of files) {
      const filePath = path.join(this.memoryDir, filename);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const charCount = content.length;
        const budget = this.budgets[filename] || 3000;
        const usagePercent = Math.min(100, Math.round((charCount / budget) * 100));
        const stat = fs.statSync(filePath);

        totalChars += charCount;

        fileStats.push({
          filename,
          path: filePath,
          charCount,
          budget,
          usagePercent,
          isOverBudget: charCount > budget,
          lastModified: stat.mtime.toISOString()
        });
      } else {
        fileStats.push({
          filename,
          path: filePath,
          charCount: 0,
          budget: this.budgets[filename] || 3000,
          usagePercent: 0,
          isOverBudget: false,
          missing: true
        });
      }
    }

    return {
      directory: this.memoryDir,
      totalChars,
      filesCount: fileStats.filter(f => !f.missing).length,
      files: fileStats
    };
  }

  /**
   * Read raw content of a specific memory file
   */
  readFile(filename) {
    this.ensureBankExists();
    const cleanName = path.basename(filename);
    const filePath = path.join(this.memoryDir, cleanName);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Memory file "${cleanName}" not found in memory bank`);
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const budget = this.budgets[cleanName] || 3000;
    return {
      filename: cleanName,
      path: filePath,
      content,
      charCount: content.length,
      budget,
      usagePercent: Math.min(100, Math.round((content.length / budget) * 100)),
      isOverBudget: content.length > budget
    };
  }

  /**
   * Write/update a memory file with bounded limit check
   */
  writeFile(filename, content) {
    this.ensureBankExists();
    const cleanName = path.basename(filename);
    const filePath = path.join(this.memoryDir, cleanName);
    const budget = this.budgets[cleanName] || 3000;
    const charCount = content.length;

    fs.writeFileSync(filePath, content, 'utf-8');
    this.updateManifest();

    const result = {
      success: true,
      filename: cleanName,
      path: filePath,
      charCount,
      budget,
      usagePercent: Math.min(100, Math.round((charCount / budget) * 100)),
      isOverBudget: charCount > budget,
      warning: charCount > budget ? `File exceeds recommended Hermes budget of ${budget} characters (${charCount} chars). Consider self-compacting entries.` : null
    };

    this.broadcast({
      type: 'memory_bank_file_saved',
      ...result
    });

    return result;
  }

  /**
   * Store structured fact/decision into the memory bank
   */
  storeFact({ key, fact, category = 'general', tags = [] }) {
    this.ensureBankExists();
    const targetFile = category === 'preference' || category === 'user' ? 'USER.md' : 'MEMORY.md';
    const filePath = path.join(this.memoryDir, targetFile);

    let content = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';
    const formattedTagList = (Array.isArray(tags) ? tags : [tags]).filter(Boolean).map(t => `#${t}`).join(' ');

    const newEntry = `\n- **${key}**: ${fact}${formattedTagList ? ` (${formattedTagList})` : ''}\n`;

    // Append under matching or new section
    if (content.includes(`## `)) {
      content = content.trimEnd() + '\n' + newEntry;
    } else {
      content += `\n## Saved Notes\n${newEntry}`;
    }

    return this.writeFile(targetFile, content);
  }

  /**
   * Search across all memory files with full text matching and relevance scoring
   */
  search(query = '', category = null, limit = 10) {
    this.ensureBankExists();
    const q = (query || '').toLowerCase().trim();
    const stats = this.getStats();
    const matches = [];

    for (const fileInfo of stats.files) {
      if (fileInfo.missing) continue;
      const content = fs.readFileSync(fileInfo.path, 'utf-8');
      const lines = content.split('\n');

      let currentSection = 'General';
      lines.forEach((line, lineIndex) => {
        if (line.startsWith('#')) {
          currentSection = line.replace(/^#+\s*/, '').trim();
          return;
        }

        const lowerLine = line.toLowerCase();
        if (!q || lowerLine.includes(q)) {
          if (line.trim().length > 3) {
            matches.push({
              filename: fileInfo.filename,
              section: currentSection,
              line: lineIndex + 1,
              content: line.trim(),
              relevance: q ? (lowerLine.split(q).length - 1) * 10 : 1
            });
          }
        }
      });
    }

    // Sort by relevance
    matches.sort((a, b) => b.relevance - a.relevance);

    return {
      query,
      count: matches.length,
      matches: matches.slice(0, limit)
    };
  }

  /**
   * Generate Hermes AI prompt snapshot injected into the agent's system prompt
   */
  getSnapshotForPrompt() {
    this.ensureBankExists();
    let snapshot = '<hermes_memory_bank>\n';

    try {
      const userFile = path.join(this.memoryDir, 'USER.md');
      if (fs.existsSync(userFile)) {
        snapshot += `<user_profile>\n${fs.readFileSync(userFile, 'utf-8').trim()}\n</user_profile>\n\n`;
      }

      const memoryFile = path.join(this.memoryDir, 'MEMORY.md');
      if (fs.existsSync(memoryFile)) {
        snapshot += `<durable_facts>\n${fs.readFileSync(memoryFile, 'utf-8').trim()}\n</durable_facts>\n\n`;
      }

      const activeFile = path.join(this.memoryDir, 'activeContext.md');
      if (fs.existsSync(activeFile)) {
        snapshot += `<active_context>\n${fs.readFileSync(activeFile, 'utf-8').trim()}\n</active_context>\n`;
      }
    } catch (e) {
      console.warn('Error reading memory snapshot:', e);
    }

    snapshot += '</hermes_memory_bank>';
    return snapshot;
  }

  /**
   * Curate and distill recent conversation trajectory into memory bank
   */
  curateSession(messages = [], executions = []) {
    this.ensureBankExists();
    const activeFile = path.join(this.memoryDir, 'activeContext.md');
    let content = fs.existsSync(activeFile) ? fs.readFileSync(activeFile, 'utf-8') : '';

    const timestamp = new Date().toLocaleTimeString();
    const userMsgs = messages.filter(m => m.role === 'user').slice(-3);
    const summaryPoints = userMsgs.map(m => `- [${timestamp}] Prompt: "${m.content.slice(0, 80)}${m.content.length > 80 ? '...' : ''}"`).join('\n');

    const updateBlock = `\n\n### Session Sync (${new Date().toLocaleDateString()})\n${summaryPoints}\n`;
    content = content.trimEnd() + updateBlock;

    const result = this.writeFile('activeContext.md', content);
    return {
      success: true,
      message: 'Active context successfully updated with recent trajectory.',
      result
    };
  }
}

module.exports = { HermesMemoryBank };
