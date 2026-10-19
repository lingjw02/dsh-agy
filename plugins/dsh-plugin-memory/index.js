const fs = require('fs');
const path = require('path');
const { HermesMemoryBank } = require('../../harness/memory');
const { CellularKnowledgeGraph } = require('../../harness/graph');
const { KnowledgeEvolutionEngine, TAXONOMY, KNOWLEDGE_STATUS } = require('../../harness/knowledge');

module.exports = {
  name: 'dsh-plugin-memory',
  version: '3.0.0',
  description: 'Self-Evolving Knowledge Base, Hermes Memory Bank, Experience Bank & Obsidian Cellular Graph.',
  apply(ctx) {
    const workspace = (ctx.kernel && ctx.kernel.workspace) || process.cwd();
    const broadcast = (ctx.kernel && ctx.kernel.broadcast) || (() => {});

    const memoryBank = (ctx.kernel && ctx.kernel.memoryBank) || new HermesMemoryBank({
      workspace,
      broadcast
    });

    const knowledgeGraph = (ctx.kernel && ctx.kernel.knowledgeGraph) || new CellularKnowledgeGraph({
      workspace,
      broadcast
    });

    const knowledgeEngine = (ctx.kernel && ctx.kernel.knowledgeEngine) || new KnowledgeEvolutionEngine({
      workspace,
      broadcast
    });

    // 1. Slash Command: /memory
    ctx.slots.register('composer:command', {
      id: 'cmd-memory',
      name: '/memory',
      description: 'Hermes AI Memory Bank: inspect, search, curate, or initialize persistent markdown memories',
      category: 'Memory',
      handler: async (args = '') => {
        const trimmed = (args || '').trim();
        const lower = trimmed.toLowerCase();

        if (lower === 'init' || lower === 'generate') {
          const genResult = memoryBank.generateDefaultBank(true);
          return {
            action: 'generate',
            success: true,
            message: 'Hermes AI Memory Bank generated directly in workspace memory directory.',
            directory: genResult.directory,
            files: genResult.files
          };
        }

        if (lower === 'curate') {
          const curateResult = memoryBank.curateSession([]);
          return {
            action: 'curate',
            success: true,
            message: 'Curated active session into Hermes Memory Bank (activeContext.md).',
            result: curateResult
          };
        }

        if (lower.startsWith('search ')) {
          const q = trimmed.replace(/^search\s+/i, '');
          const searchResult = memoryBank.search(q);
          return {
            action: 'search',
            query: q,
            count: searchResult.count,
            matches: searchResult.matches
          };
        }

        if (trimmed && trimmed !== 'status' && trimmed !== 'bank') {
          const searchResult = memoryBank.search(trimmed);
          return {
            action: 'search',
            query: trimmed,
            count: searchResult.count,
            matches: searchResult.matches
          };
        }

        const stats = memoryBank.getStats();
        return {
          action: 'status',
          memorySystem: 'Hermes AI Layer-1 Memory Bank',
          directory: stats.directory,
          totalChars: stats.totalChars,
          files: stats.files
        };
      }
    });

    // 2. Slash Command: /knowledge
    ctx.slots.register('composer:command', {
      id: 'cmd-knowledge',
      name: '/knowledge',
      description: 'AI Knowledge Base: query verified facts, inspect 6 taxonomies, or propose candidate facts',
      category: 'Knowledge Base',
      handler: async (args = '') => {
        const trimmed = (args || '').trim();
        const lower = trimmed.toLowerCase();

        if (lower.startsWith('search ') || (trimmed && !lower.startsWith('propose ') && !lower.startsWith('verify '))) {
          const q = trimmed.replace(/^search\s+/i, '');
          const results = knowledgeEngine.queryKnowledge(q, { limit: 8 });
          return {
            action: 'query',
            query: q,
            count: results.length,
            knowledge: results
          };
        }

        if (lower.startsWith('propose ')) {
          const content = trimmed.replace(/^propose\s+/i, '');
          const candidate = knowledgeEngine.proposeCandidate({
            content,
            sources: ['user_slash_command'],
            importance: 0.70
          });
          return {
            action: 'propose_candidate',
            success: true,
            candidate
          };
        }

        return {
          action: 'stats',
          system: 'AI Knowledge Base & Self-Evolution System',
          stats: knowledgeEngine.getStats()
        };
      }
    });

    // 3. Slash Command: /evolve
    ctx.slots.register('composer:command', {
      id: 'cmd-evolve',
      name: '/evolve',
      description: 'Evolution Engine: inspect priority queue, trigger idle learning, or run deep audit',
      category: 'Evolution',
      handler: async (args = '') => {
        const lower = (args || '').toLowerCase().trim();

        if (lower === 'audit' || lower === 'deep') {
          const report = knowledgeEngine.runDeepAuditCycle();
          return {
            action: 'deep_audit',
            success: true,
            report
          };
        }

        knowledgeEngine.runIdleEvolutionCycle();
        return {
          action: 'evolution_status',
          queue: knowledgeEngine.evolutionQueue,
          tokenBudget: knowledgeEngine.tokenBudget,
          stats: knowledgeEngine.getStats()
        };
      }
    });

    // 4. Slash Command: /experience
    ctx.slots.register('composer:command', {
      id: 'cmd-experience',
      name: '/experience',
      description: 'Experience Bank: inspect recorded task outcomes, failure post-mortems, and lessons learned',
      category: 'Experience',
      handler: async () => {
        const expItems = [];
        try {
          const files = fs.readdirSync(knowledgeEngine.experienceDir);
          for (const file of files.slice(-10)) {
            if (file.endsWith('.json')) {
              const raw = fs.readFileSync(path.join(knowledgeEngine.experienceDir, file), 'utf-8');
              expItems.push(JSON.parse(raw));
            }
          }
        } catch (_) {}

        return {
          action: 'list_experiences',
          count: expItems.length,
          recentExperiences: expItems.reverse()
        };
      }
    });

    // 5. Slash Command: /graph
    ctx.slots.register('composer:command', {
      id: 'cmd-graph',
      name: '/graph',
      description: 'Obsidian Cellular Knowledge Graph: inspect project cells, interconnected links, and wikilink topology',
      category: 'Knowledge Graph',
      handler: async (args = '') => {
        const trimmed = (args || '').trim();
        const graphData = knowledgeGraph.getGraphData();

        if (trimmed.startsWith('new ') || trimmed.startsWith('create ')) {
          const name = trimmed.replace(/^(new|create)\s+/i, '').trim();
          const cell = knowledgeGraph.createCell({ name, type: 'project' });
          return {
            action: 'create_cell',
            success: true,
            cell,
            stats: knowledgeGraph.getGraphData().stats
          };
        }

        return {
          action: 'graph_status',
          stats: graphData.stats,
          projects: graphData.nodes.filter(n => n.type === 'project').map(p => ({
            id: p.id,
            name: p.name,
            linksCount: p.linksCount,
            backlinksCount: p.backlinksCount
          })),
          totalLinks: graphData.links.length
        };
      }
    });

    // 6. Mention context: @memory
    ctx.slots.register('composer:mention', {
      id: 'mention-memory',
      label: 'memory',
      description: 'Attach Hermes AI persistent memory bank snapshot',
      icon: 'brain',
      category: 'Memory',
      resolve: async () => {
        return memoryBank.getSnapshotForPrompt();
      }
    });

    // 7. Mention context: @knowledge
    ctx.slots.register('composer:mention', {
      id: 'mention-knowledge',
      label: 'knowledge',
      description: 'Attach verified knowledge vault facts relevant to active workspace',
      icon: 'database',
      category: 'Knowledge Base',
      resolve: async () => {
        return knowledgeEngine.getCompactPromptSnapshot();
      }
    });

    // 8. Mention context: @evolution
    ctx.slots.register('composer:mention', {
      id: 'mention-evolution',
      label: 'evolution',
      description: 'Attach evolution priority queue & token budget telemetry',
      icon: 'cpu',
      category: 'Evolution',
      resolve: async () => {
        const stats = knowledgeEngine.getStats();
        return `### 🧬 Evolution Telemetry\n` +
          `- **Verified Knowledge**: ${stats.byStatus.verified}\n` +
          `- **Pending Candidates**: ${stats.byStatus.candidate}\n` +
          `- **Evolution Queue**: ${stats.evolutionQueueLength} items\n` +
          `- **Token Budget**: Spent ${stats.tokenBudget.spentTotal} / ${stats.tokenBudget.dailyLimit} (Task 70%, Idle 20%, Audit 10%)\n`;
      }
    });

    // 9. Mention context: @graph
    ctx.slots.register('composer:mention', {
      id: 'mention-graph',
      label: 'graph',
      description: 'Attach Obsidian cellular knowledge graph project topology',
      icon: 'network',
      category: 'Knowledge Graph',
      resolve: async () => {
        const data = knowledgeGraph.getGraphData();
        return `### 🕸️ Obsidian Cellular Knowledge Graph\n` +
          `- **Project Cells**: ${data.stats.projectCells} (${data.nodes.filter(n => n.type === 'project').map(n => n.name).join(', ')})\n` +
          `- **Memory Cells**: ${data.stats.memoryCells}\n` +
          `- **Connected Links**: ${data.stats.totalLinks}\n`;
      }
    });

    // 10. Tools Registration
    // Tool: knowledge_query
    ctx.tools.register({
      name: 'knowledge_query',
      description: 'Queries verified facts from the Knowledge Base across the 6 taxonomies with multi-dimensional confidence filters',
      parameters: {
        query: { type: 'string', description: 'Semantic query or search keywords' },
        taxonomy: { type: 'string', description: 'Optional taxonomy filter ("authoritative", "learned", "experience", "user", "temporary", "rejected")' },
        limit: { type: 'number', description: 'Max items to return (default: 5)' }
      },
      execute: async (args) => {
        const results = knowledgeEngine.queryKnowledge(args.query, {
          taxonomy: args.taxonomy,
          limit: args.limit || 5
        });
        return { success: true, count: results.length, results };
      }
    });

    // Tool: knowledge_propose_candidate
    ctx.tools.register({
      name: 'knowledge_propose_candidate',
      description: 'Proposes new candidate fact into temporary knowledge queue for evidence collection and verification (Prohibits direct auto-trust)',
      parameters: {
        content: { type: 'string', description: 'The factual claim, pattern, or convention' },
        type: { type: 'string', description: 'Type: "project_fact", "tech_convention", "tool_workaround", "lesson_learned", "hypothesis"' },
        sources: { type: 'array', description: 'Array of evidence files, tools, or URLs' },
        importance: { type: 'number', description: 'Importance score from 0.0 to 1.0' },
        tags: { type: 'array', description: 'Searchable tags' }
      },
      execute: async (args) => {
        const candidate = knowledgeEngine.proposeCandidate(args);
        return { success: true, candidate };
      }
    });

    // Tool: knowledge_verify
    ctx.tools.register({
      name: 'knowledge_verify',
      description: 'Verifies, promotes, falsifies, or supersedes candidate knowledge using Popperian falsification and contradiction checking',
      parameters: {
        candidateId: { type: 'string', description: 'Candidate ID to verify' },
        approved: { type: 'boolean', description: 'Whether to approve or reject' },
        popperFalsified: { type: 'boolean', description: 'Set true if Popper falsification discovered counter-examples' },
        supersedeId: { type: 'string', description: 'Optional ID of older conflicting fact to supersede' },
        additionalEvidence: { type: 'array', description: 'New evidence sources' }
      },
      execute: async (args) => {
        return knowledgeEngine.verifyCandidate(args.candidateId, args);
      }
    });

    // Tool: experience_record
    ctx.tools.register({
      name: 'experience_record',
      description: 'Records task execution outcome, tool failures, and reflections into Experience Bank',
      parameters: {
        intent: { type: 'string', description: 'Task objective' },
        toolsUsed: { type: 'array', description: 'List of tools invoked' },
        errors: { type: 'array', description: 'List of errors encountered' },
        success: { type: 'boolean', description: 'Whether task completed successfully' },
        finalResult: { type: 'string', description: 'Summary of outcome' }
      },
      execute: async (args) => {
        const exp = knowledgeEngine.recordTaskExperience(args);
        return { success: true, experience: exp };
      }
    });

    // Tool: evolution_run_audit
    ctx.tools.register({
      name: 'evolution_run_audit',
      description: 'Executes Periodic Deep Audit across the entire Knowledge Base detecting contradictions, stale facts, and low-confidence items',
      parameters: {},
      execute: async () => {
        const report = knowledgeEngine.runDeepAuditCycle();
        return { success: true, report };
      }
    });

    // Tool: knowledge_ingest
    ctx.tools.register({
      name: 'knowledge_ingest',
      description: 'Ingests external text/document with SHA-256 change detection, deduplication, and candidate chunking',
      parameters: {
        sourceName: { type: 'string', description: 'Name of file, url, or documentation source' },
        content: { type: 'string', description: 'Raw document or text content' },
        importance: { type: 'number', description: 'Importance score from 0.0 to 1.0' }
      },
      execute: async (args) => {
        return knowledgeEngine.ingestExternalSource(args.sourceName, args.content, { importance: args.importance });
      }
    });

    // Tool: memory_store
    ctx.tools.register({
      name: 'memory_store',
      description: 'Stores an architectural decision, user preference, or project insight directly into Hermes Memory Bank (MEMORY.md / USER.md)',
      parameters: {
        key: { type: 'string', description: 'Unique identifier or concept name (e.g. "ui_color_palette")' },
        fact: { type: 'string', description: 'The knowledge, rule, or preference to remember' },
        category: { type: 'string', description: 'Category: "architecture", "preference", "user", "conventions", "tool-workarounds"' },
        tags: { type: 'array', description: 'Array of searchable keyword tags' }
      },
      execute: async (args) => {
        const result = memoryBank.storeFact(args);
        return {
          success: true,
          message: `Memory "${args.key}" saved into Hermes Memory Bank file: ${result.filename}`,
          charCount: result.charCount,
          budget: result.budget,
          usagePercent: result.usagePercent,
          warning: result.warning
        };
      }
    });

    // Tool: memory_search
    ctx.tools.register({
      name: 'memory_search',
      description: 'Searches persistent Hermes Memory Bank (MEMORY.md, USER.md, activeContext.md, decisions.md) for relevant facts or preferences',
      parameters: {
        query: { type: 'string', description: 'Search term or keyword' },
        category: { type: 'string', description: 'Optional category filter' },
        limit: { type: 'number', description: 'Maximum number of matches to return (default: 5)' }
      },
      execute: async (args) => {
        const searchResult = memoryBank.search(args.query, args.category, args.limit || 5);
        return {
          success: true,
          query: args.query,
          count: searchResult.count,
          matches: searchResult.matches
        };
      }
    });

    // Tool: graph_get_topology
    ctx.tools.register({
      name: 'graph_get_topology',
      description: 'Returns the full Obsidian-style cellular knowledge graph with Project Cells, Memory Cells, and [[wikilink]] edges',
      parameters: {},
      execute: async () => {
        return knowledgeGraph.getGraphData();
      }
    });

    // Tool: graph_create_project_cell
    ctx.tools.register({
      name: 'graph_create_project_cell',
      description: 'Materializes a new Project Cell entity in memory/projects/ with frontmatter and wikilinks',
      parameters: {
        name: { type: 'string', description: 'Name of the project (e.g. "E-Commerce Gateway")' },
        tags: { type: 'array', description: 'Tags for categorization' },
        content: { type: 'string', description: 'Initial markdown body' }
      },
      execute: async (args) => {
        const cell = knowledgeGraph.createCell({ name: args.name, type: 'project', tags: args.tags, content: args.content });
        return { success: true, cell };
      }
    });

    // Tool: graph_link_cells
    ctx.tools.register({
      name: 'graph_link_cells',
      description: 'Connects two cells in the knowledge graph using an Obsidian [[wikilink]]',
      parameters: {
        sourceId: { type: 'string', description: 'ID of source project cell' },
        targetId: { type: 'string', description: 'ID of target cell to link' },
        relation: { type: 'string', description: 'Relation descriptor (e.g. "depends-on", "subsystem-of")' }
      },
      execute: async (args) => {
        return knowledgeGraph.linkCells(args.sourceId, args.targetId, args.relation);
      }
    });

    ctx.memoryBank = memoryBank;
    ctx.knowledgeGraph = knowledgeGraph;
    ctx.knowledgeEngine = knowledgeEngine;

    console.log('🧠 [dsh-plugin-memory] Hermes Memory, Obsidian Graph & Self-Evolving Knowledge Engine Activated (v3.0.0)');
  }
};
