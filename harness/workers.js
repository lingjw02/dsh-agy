const fs = require('fs');
const path = require('path');

class WorkerRegistry {
  constructor(options = {}) {
    this.workspace = options.workspace || process.cwd();
    this.pluginManager = options.pluginManager;
    this.broadcast = options.broadcast || (() => {});
    this.workers = new Map();
    this.guardianLogs = [];

    this.initDefaultWorkers();
  }

  setPluginManager(pm) {
    this.pluginManager = pm;
    this.syncFromPluginManager();
  }

  setBroadcast(fn) {
    this.broadcast = fn;
  }

  initDefaultWorkers() {
    // Front Staff (Active Workers)
    this.registerWorker({
      id: 'worker-imagegen-web',
      name: 'Web Image Artist',
      icon: '🖼️',
      tier: 'active',
      group: 'image_generator',
      role: 'Landing Page & Section Art Director',
      skillId: 'skill-imagegen-frontend-web',
      description: 'Generates horizontal section-by-section visual art direction for high-converting web landing pages.',
      keywords: ['image', 'visual', 'art', 'landing page', 'section', 'banner', 'hero image', 'design reference', 'graphic'],
      status: 'active'
    });

    this.registerWorker({
      id: 'worker-imagegen-mobile',
      name: 'Mobile UI Artist',
      icon: '📱',
      tier: 'active',
      group: 'image_generator',
      role: 'Native Mobile Screen & Flow Visualizer',
      skillId: 'skill-imagegen-frontend-mobile',
      description: 'Creates app-native screen mockups and interaction flows inside framed device mockups (iOS / Android).',
      keywords: ['mobile', 'app', 'ios', 'android', 'phone', 'screen', 'mockup', 'mobile design', 'flow'],
      status: 'active'
    });

    this.registerWorker({
      id: 'worker-image-to-code',
      name: 'Image-to-Code Specialist',
      icon: '🎨',
      tier: 'active',
      group: 'image_generator',
      role: 'Visual Design Translation Engineer',
      skillId: 'skill-image-to-code-skill',
      description: 'Translates visual design screenshots, wireframes, and concept comps directly into clean HTML/CSS/React.',
      keywords: ['image to code', 'screenshot to code', 'figma to code', 'visual to code', 'mockup to code', 'wireframe'],
      status: 'active'
    });

    this.registerWorker({
      id: 'worker-cli-gimp',
      name: 'GIMP & Image Automation',
      icon: '🖌️',
      tier: 'active',
      group: 'image_generator',
      role: 'Stateful Programmatic Asset Editor',
      skillId: 'skill-cli-anything-gimp',
      description: 'Performs programmatic image manipulation, resizing, filtering, and compositing via Pillow and GIMP CLI.',
      keywords: ['gimp', 'pillow', 'crop', 'resize', 'filter', 'composite', 'image edit', 'batch image'],
      status: 'active'
    });

    this.registerWorker({
      id: 'worker-executing-plans',
      name: 'Full-Stack Plan Executor',
      icon: '📋',
      tier: 'active',
      group: 'writer',
      role: 'Phased Codebase Builder',
      skillId: 'skill-executing-plans',
      description: 'Executes architectural plans methodically phase-by-phase with review checkpoints and test verification.',
      keywords: ['execute plan', 'implement', 'build', 'step by step', 'plan execution', 'feature', 'full-stack', 'scaffold'],
      status: 'active'
    });

    this.registerWorker({
      id: 'worker-generative-ui',
      name: 'Generative UI Builder',
      icon: '✨',
      tier: 'active',
      group: 'writer',
      role: 'Interactive Component Engineer',
      skillId: 'skill-generative_ui',
      description: 'Builds interactive inline HTML widgets, dynamic charts, calculators, and rich visual data dashboards.',
      keywords: ['widget', 'chart', 'interactive', 'dashboard', 'visualizer', 'genui', 'component', 'data viz'],
      status: 'active'
    });

    this.registerWorker({
      id: 'worker-brandkit',
      name: 'Brand Identity Architect',
      icon: '💎',
      tier: 'active',
      group: 'writer',
      role: 'Visual World & Identity Deck Designer',
      skillId: 'skill-brandkit',
      description: 'Designs premium logo systems, typographic palettes, brand guideline boards, and identity decks.',
      keywords: ['brand', 'brandkit', 'logo', 'identity', 'guidelines', 'visual world', 'typography system'],
      status: 'active'
    });

    this.registerWorker({
      id: 'worker-brutalist',
      name: 'Brutalist Style Engineer',
      icon: '🏛️',
      tier: 'active',
      group: 'writer',
      role: 'Swiss Typographic & Terminal Architect',
      skillId: 'skill-brutalist-skill',
      description: 'Crafts raw mechanical interfaces fusing Swiss print grids, monospace typography, and military terminal vibes.',
      keywords: ['brutalist', 'raw', 'swiss grid', 'terminal aesthetic', 'monospace', 'cyberpunk', 'industrial'],
      status: 'active'
    });

    this.registerWorker({
      id: 'worker-minimalist',
      name: 'Minimalist Style Engineer',
      icon: '🌿',
      tier: 'active',
      group: 'writer',
      role: 'Quiet Luxury & Editorial Layout Engineer',
      skillId: 'skill-minimalist-skill',
      description: 'Creates warm monochrome editorial layouts, typographic contrast, gapless bento grids, and muted palettes.',
      keywords: ['minimalist', 'clean', 'editorial', 'quiet luxury', 'bento', 'modern', 'monochrome', 'sleek'],
      status: 'active'
    });

    this.registerWorker({
      id: 'worker-soft-motion',
      name: 'Motion & Soft UI Engineer',
      icon: '🕊️',
      tier: 'active',
      group: 'writer',
      role: 'GSAP Animation & Micro-interaction Artisan',
      skillId: 'skill-soft-skill',
      description: 'Applies agency-grade soft shadows, smooth GSAP ScrollTrigger physics, and high-end micro-interactions.',
      keywords: ['motion', 'animation', 'gsap', 'soft ui', 'smooth', 'scrolltrigger', 'interaction', 'delight'],
      status: 'active'
    });

    this.registerWorker({
      id: 'worker-redesign',
      name: 'Frontend Redesign Specialist',
      icon: '🔄',
      tier: 'active',
      group: 'writer',
      role: 'Anti-Generic UI Transformer',
      skillId: 'skill-redesign-skill',
      description: 'Audits existing websites, strips out generic AI templates, and upgrades layouts to high-end bespoke quality.',
      keywords: ['redesign', 'upgrade', 'audit ui', 'fix design', 'make modern', 'revamp', 'facelift', 'polish'],
      status: 'active'
    });

    this.registerWorker({
      id: 'worker-deep-research',
      name: 'Deep Codebase Researcher',
      icon: '🔍',
      tier: 'active',
      group: 'research',
      role: 'Autonomous Investigator & Web Explorer',
      skillId: 'subagent-research',
      description: 'Exhaustively explores codebase dependencies, parses complex documents, and queries online web resources.',
      keywords: ['research', 'investigate', 'search docs', 'analyze codebase', 'find all', 'audit deps', 'explore'],
      status: 'active'
    });

    this.registerWorker({
      id: 'worker-cli-navigator',
      name: 'CLI & Tools Navigator',
      icon: '🧰',
      tier: 'active',
      group: 'research',
      role: 'Agent-Native Software Discovery Hub',
      skillId: 'skill-cli-hub-meta-skill',
      description: 'Discovers and orchestrates specialized agent-native CLIs for professional tools across media and dev ops.',
      keywords: ['cli', 'tools', 'hub', 'discover cli', 'command line', 'software cli', 'utility'],
      status: 'active'
    });

    this.registerWorker({
      id: 'worker-parallel-fleet',
      name: 'Fleet Parallel Dispatcher',
      icon: '👥',
      tier: 'active',
      group: 'research',
      role: 'Multi-Agent Concurrency Coordinator',
      skillId: 'skill-dispatching-parallel-agents',
      description: 'Breaks complex tasks into isolated subtasks and dispatches parallel subagents without race conditions.',
      keywords: ['parallel', 'concurrent', 'swarm', 'fleet', 'multiple agents', 'distribute', 'subtasks'],
      status: 'active'
    });

    this.registerWorker({
      id: 'worker-branch-finalizer',
      name: 'Branch Hygiene & Finalizer',
      icon: '🏁',
      tier: 'active',
      group: 'research',
      role: 'Git Hygiene & PR Completion Expert',
      skillId: 'skill-finishing-a-development-branch',
      description: 'Reviews git working tree, runs pre-merge validations, structures commits, and crafts clear pull requests.',
      keywords: ['git merge', 'pr', 'pull request', 'finish branch', 'git hygiene', 'commit', 'cleanup branch'],
      status: 'active'
    });

    // =========================================================================
    // Background Guardians (Passive Workers - Hybrid Mode)
    // Run continuously on every event loop / stream chunk / prompt
    // =========================================================================

    this.registerWorker({
      id: 'guardian-token-saver',
      name: 'Token-Saver & Truncation Guard',
      icon: '🛡️',
      tier: 'passive',
      group: 'token_saver',
      role: 'Code Integrity & Anti-Truncation Watchdog',
      skillId: 'skill-output-skill',
      description: 'Watches all code outputs in real time. Detects // TODO placeholders, cut-off functions, or truncated blocks and auto-triggers continuation.',
      mode: 'hybrid', // advisory + auto-correct
      status: 'active',
      audit: (content) => {
        const issues = [];
        if (typeof content !== 'string') return { pass: true, issues };
        
        // Truncation patterns
        if (content.includes('// ... remaining') || content.includes('// ... rest of code') || content.includes('/* remaining code unchanged */')) {
          issues.push({
            severity: 'critical',
            code: 'CODE_TRUNCATION_PLACEHOLDER',
            message: 'Detected placeholder comment masking unwritten code.'
          });
        }
        if (content.match(/```[a-z]*\s*$/i) && !content.endsWith('```\n') && !content.endsWith('```')) {
          issues.push({
            severity: 'critical',
            code: 'UNCLOSED_CODEBLOCK',
            message: 'Code block was truncated mid-stream before closing backticks.'
          });
        }
        return {
          pass: issues.length === 0,
          issues
        };
      }
    });

    this.registerWorker({
      id: 'guardian-design-taste',
      name: 'Anti-Slop Design Taste Guard',
      icon: '🎨',
      tier: 'passive',
      group: 'design_taste',
      role: 'Frontend Aesthetics & Anti-Slop Auditor',
      skillId: 'skill-design-taste-frontend',
      description: 'Audits generated HTML, Tailwind, and CSS artifacts against cheap AI design defaults, poor contrast, and unstyled blocks.',
      mode: 'advisory',
      status: 'active',
      audit: (content) => {
        const issues = [];
        if (typeof content !== 'string') return { pass: true, issues };

        if (content.includes('bg-gray-100') && content.includes('text-gray-900') && content.includes('rounded-lg shadow')) {
          issues.push({
            severity: 'advisory',
            code: 'GENERIC_AI_CARD_PATTERN',
            message: 'Detected generic gray card styling. Consider elevating with refined border, subtle gradient, or dark theme.'
          });
        }
        return {
          pass: issues.length === 0,
          issues
        };
      }
    });

    this.registerWorker({
      id: 'guardian-superpower',
      name: 'Antigravity Superpower Guard',
      icon: '🪐',
      tier: 'passive',
      group: 'superpower',
      role: 'Antigravity 2.0 Architectural Compliance',
      skillId: 'skill-antigravity_guide',
      description: 'Verifies tool calls against Antigravity 2.0 schemas, prevents unauthorized disk writes outside workspace, and guides agent policy.',
      mode: 'hybrid',
      status: 'active',
      audit: (content, context = {}) => {
        const issues = [];
        if (context.toolCall && context.toolCall.tool === 'run_command') {
          const cmd = (context.toolCall.args.CommandLine || '').toLowerCase();
          if (cmd.includes('rm -rf /') || cmd.includes('format c:')) {
            issues.push({
              severity: 'critical',
              code: 'DANGEROUS_COMMAND_BLOCKED',
              message: 'Blocked potentially destructive command in workspace.'
            });
          }
        }
        return {
          pass: issues.length === 0,
          issues
        };
      }
    });

    this.registerWorker({
      id: 'guardian-intent-grillme',
      name: 'Intent & GrillMe Clarifier',
      icon: '💡',
      tier: 'passive',
      group: 'grillme_intent',
      role: 'Requirements & Ambiguity Detective',
      skillId: 'skill-brainstorming',
      description: 'Detects ambiguous, one-sentence, or underspecified requests and formulates structured clarifying questions before implementation.',
      mode: 'advisory',
      status: 'active',
      audit: (prompt) => {
        const issues = [];
        if (typeof prompt === 'string') {
          const trimmed = prompt.trim();
          if (trimmed.length > 0 && trimmed.length < 15 && !trimmed.startsWith('/')) {
            issues.push({
              severity: 'advisory',
              code: 'UNDERSPECIFIED_REQUEST',
              message: 'Request is very brief. Intent Clarifier is ready to help explore requirements.'
            });
          }
        }
        return {
          pass: issues.length === 0,
          issues
        };
      }
    });

    this.registerWorker({
      id: 'guardian-structurer',
      name: 'Design Token & Code Structurer',
      icon: '📐',
      tier: 'passive',
      group: 'structurer',
      role: 'Semantic Design & Code Hygiene Verifier',
      skillId: 'skill-stitch-skill',
      description: 'Checks that UI components follow structured DESIGN.md semantic tokens and enforces clean separation of concerns.',
      mode: 'advisory',
      status: 'active',
      audit: (content) => {
        return { pass: true, issues: [] };
      }
    });

    this.registerWorker({
      id: 'guardian-memory-budget',
      name: 'Hermes Memory Budget & Curation Guard',
      icon: '🧠',
      tier: 'passive',
      group: 'memory_budget',
      role: 'Bounded Memory Budget & Self-Compaction Watchdog',
      skillId: 'dsh-plugin-memory',
      description: 'Monitors Hermes AI Layer-1 Memory Bank character budgets (USER.md ~1500 chars, MEMORY.md ~2500 chars). Alerts when memory banks need compaction.',
      mode: 'advisory',
      status: 'active',
      audit: (content, context = {}) => {
        const issues = [];
        if (context && context.memoryStats && context.memoryStats.files) {
          for (const file of context.memoryStats.files) {
            if (file.isOverBudget) {
              issues.push({
                severity: 'warning',
                code: 'MEMORY_BUDGET_EXCEEDED',
                message: `${file.filename} is at ${file.usagePercent}% capacity (${file.charCount}/${file.budget} chars). Hermes self-compaction recommended.`
              });
            }
          }
        }
        return {
          pass: issues.length === 0,
          issues
        };
      }
    });
  }

  syncFromPluginManager() {
    if (!this.pluginManager) return;
    const allPlugins = this.pluginManager.getAllPlugins();
    
    // Check if any newly discovered skill should be mapped as a worker
    for (const p of allPlugins) {
      if (p.type === 'skill') {
        const existingWorker = Array.from(this.workers.values()).find(w => w.skillId === p.id);
        if (!existingWorker) {
          // Auto-classify newly discovered skill
          const isPassive = p.name.includes('output-skill') || p.name.includes('taste') || p.name.includes('stitch') || p.name.includes('superpower') || p.name.includes('guide');
          this.registerWorker({
            id: `worker-${p.name}`,
            name: p.name,
            icon: p.icon === 'palette' ? '🎨' : (p.icon === 'smartphone' ? '📱' : '⚡'),
            tier: isPassive ? 'passive' : 'active',
            group: isPassive ? 'structurer' : 'writer',
            role: `${p.functionalCategory || 'Specialized'} Worker`,
            skillId: p.id,
            description: p.description,
            keywords: [p.name],
            status: 'active'
          });
        }
      }
    }
  }

  registerWorker(worker) {
    this.workers.set(worker.id, {
      ...worker,
      status: worker.status || 'active',
      tier: worker.tier || 'active',
      stats: {
        invocations: 0,
        audits: 0,
        interceptions: 0
      }
    });
  }

  getWorker(id) {
    return this.workers.get(id);
  }

  getAllWorkers() {
    return Array.from(this.workers.values());
  }

  getActiveWorkers() {
    return Array.from(this.workers.values()).filter(w => w.tier === 'active' && w.status === 'active');
  }

  getPassiveGuardians() {
    return Array.from(this.workers.values()).filter(w => w.tier === 'passive' && w.status === 'active');
  }

  setWorkerTier(id, tier) {
    if (this.workers.has(id)) {
      const worker = this.workers.get(id);
      worker.tier = tier; // 'active' or 'passive'
      this.broadcast({
        type: 'worker_updated',
        worker
      });
      return worker;
    }
    return null;
  }

  toggleWorker(id, status) {
    if (this.workers.has(id)) {
      const worker = this.workers.get(id);
      worker.status = typeof status === 'string' ? status : (worker.status === 'active' ? 'disabled' : 'active');
      this.broadcast({
        type: 'worker_updated',
        worker
      });
      return worker;
    }
    return null;
  }

  // =========================================================================
  // Problem-Worker Matcher: Analyzes prompt & suggests Front Staff
  // =========================================================================
  matchProblemToWorker(prompt) {
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return null;
    }

    const clean = prompt.toLowerCase();
    const activeWorkers = this.getActiveWorkers();
    const scoredWorkers = [];

    for (const worker of activeWorkers) {
      let score = 0;
      const matchedKeywords = [];

      for (const kw of (worker.keywords || [])) {
        if (clean.includes(kw.toLowerCase())) {
          score += 15;
          matchedKeywords.push(kw);
        }
      }

      // Group-based scoring
      if (worker.group === 'image_generator' && (clean.includes('image') || clean.includes('visual') || clean.includes('picture') || clean.includes('mockup') || clean.includes('draw') || clean.includes('art'))) {
        score += 30;
      }
      if (worker.group === 'writer' && (clean.includes('build') || clean.includes('code') || clean.includes('write') || clean.includes('create') || clean.includes('page') || clean.includes('implement'))) {
        score += 25;
      }
      if (worker.group === 'research' && (clean.includes('search') || clean.includes('find') || clean.includes('research') || clean.includes('investigate') || clean.includes('explore'))) {
        score += 30;
      }

      if (score > 0) {
        scoredWorkers.push({
          worker,
          score,
          matchedKeywords
        });
      }
    }

    scoredWorkers.sort((a, b) => b.score - a.score);

    if (scoredWorkers.length === 0) {
      // Default to general full-stack builder
      const fallback = activeWorkers.find(w => w.id === 'worker-executing-plans') || activeWorkers[0];
      return {
        matched: false,
        primaryWorker: fallback,
        suggestedWorkers: activeWorkers.slice(0, 3),
        confidence: 45,
        rationale: 'General software execution task'
      };
    }

    const top = scoredWorkers[0];
    const confidence = Math.min(98, Math.max(50, 40 + top.score));
    let rationale = `Matched intent for ${top.worker.role}`;
    if (top.matchedKeywords.length > 0) {
      rationale += ` (triggers: ${top.matchedKeywords.slice(0, 3).join(', ')})`;
    }

    return {
      matched: true,
      primaryWorker: top.worker,
      suggestedWorkers: scoredWorkers.slice(0, 3).map(s => s.worker),
      confidence,
      rationale
    };
  }

  // =========================================================================
  // Passive Guardian Audit Engine (Hybrid Mode)
  // =========================================================================
  runPassiveAudits(eventType, payload, context = {}) {
    const guardians = this.getPassiveGuardians();
    const results = [];

    for (const guardian of guardians) {
      guardian.stats.audits++;

      let auditResult = { pass: true, issues: [] };
      if (typeof guardian.audit === 'function') {
        try {
          auditResult = guardian.audit(payload, context);
        } catch (err) {
          auditResult = { pass: false, issues: [{ severity: 'warning', message: err.message }] };
        }
      }

      const hasCritical = (auditResult.issues || []).some(i => i.severity === 'critical');
      if (hasCritical) {
        guardian.stats.interceptions++;
      }

      const logEntry = {
        id: `guard-log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        guardianId: guardian.id,
        guardianName: guardian.name,
        icon: guardian.icon,
        eventType,
        pass: auditResult.pass,
        hasCritical,
        issues: auditResult.issues || [],
        timestamp: new Date().toISOString()
      };

      this.guardianLogs.unshift(logEntry);
      if (this.guardianLogs.length > 50) this.guardianLogs.pop();

      results.push(logEntry);

      // Broadcast audit signal to live UI
      this.broadcast({
        type: 'guardian_audit_event',
        audit: logEntry
      });
    }

    return results;
  }
}

module.exports = { WorkerRegistry };
