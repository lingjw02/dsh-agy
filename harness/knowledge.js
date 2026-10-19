const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { EventEmitter } = require('events');

/**
 * KnowledgeTaxonomy categories according to Specification Section 2.2
 */
const TAXONOMY = {
  AUTHORITATIVE: 'authoritative', // Official docs, standards, verified facts
  LEARNED: 'learned',             // AI extracted facts, derived patterns
  EXPERIENCE: 'experience',       // Task successes/failures, lessons learned, tool insights
  USER: 'user',                   // User preferences, habits, project context
  TEMPORARY: 'temporary',         // Hypotheses, unverified candidates
  REJECTED: 'rejected'            // Refuted claims, invalidated assumptions, superseded facts
};

/**
 * KnowledgeStatus lifecycle states
 */
const KNOWLEDGE_STATUS = {
  CANDIDATE: 'candidate',
  VERIFIED: 'verified',
  SUPERSEDED: 'superseded',
  REJECTED: 'rejected'
};

/**
 * KnowledgeEvolutionEngine
 * 
 * Implements the 40-section AI Knowledge Base & Self-Evolving Memory System
 * strictly following Ponytail minimal architecture:
 * 1. Deterministic Content Hashing (SHA-256) - zero token waste on unchanged data
 * 2. 6-Category Taxonomy Separation (No mixing hypotheses with verified facts)
 * 3. Multi-dimensional Confidence & Evidence System
 * 4. Temporal Knowledge & Contradiction Resolution (valid_from, valid_until, superseded)
 * 5. Experience Bank & Autonomous Reflection Loop
 * 6. Priority-Driven Evolution Queue (Importance × Usage × Uncertainty × Conflict)
 * 7. 3-Tier Evolution Scheduler (Real-time, Idle Learning, Deep Audit)
 * 8. Strict Token Budget Manager (70% Tasks, 20% Idle, 10% Audit)
 */
class KnowledgeEvolutionEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    this.workspace = options.workspace || process.cwd();
    this.memoryDir = options.memoryDir || path.resolve(this.workspace, 'memory');
    this.knowledgeDir = path.join(this.memoryDir, 'knowledge');
    this.experienceDir = path.join(this.memoryDir, 'experience');
    this.broadcast = options.broadcast || (() => {});

    // Token Budget Management (Specification Section 16 & 25)
    this.tokenBudget = {
      dailyLimit: options.dailyTokenLimit || 200000,
      spentTotal: 0,
      allocations: {
        task: { percent: 70, spent: 0, limit: 140000 },
        idle: { percent: 20, spent: 0, limit: 40000 },
        audit: { percent: 10, spent: 0, limit: 20000 }
      },
      lastReset: new Date().toISOString().split('T')[0]
    };

    // In-memory indexing for fast retrieval & graph linking
    this.knowledgeIndex = new Map(); // id -> KnowledgeObject
    this.contentHashMap = new Map(); // sha256 -> id
    this.evolutionQueue = [];        // Prioritized queue of candidate/unverified IDs
    this.isIdleRunning = false;
    this.auditIntervalMs = options.auditIntervalMs || 3600000; // 1 hour deep audit check

    this.ensureDirectories();
    this.loadAllKnowledge();
    this.setupScheduler();
  }

  /**
   * Deterministic SHA-256 hash calculation (Ponytail: Node crypto standard library)
   */
  static computeContentHash(content) {
    if (!content) return '';
    const normalized = String(content).trim().toLowerCase().replace(/\s+/g, ' ');
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  ensureDirectories() {
    try {
      if (!fs.existsSync(this.memoryDir)) fs.mkdirSync(this.memoryDir, { recursive: true });
      if (!fs.existsSync(this.knowledgeDir)) fs.mkdirSync(this.knowledgeDir, { recursive: true });
      if (!fs.existsSync(this.experienceDir)) fs.mkdirSync(this.experienceDir, { recursive: true });

      // Create taxonomy subdirectories
      for (const cat of Object.values(TAXONOMY)) {
        const catDir = path.join(this.knowledgeDir, cat);
        if (!fs.existsSync(catDir)) fs.mkdirSync(catDir, { recursive: true });
      }

      // Check if initial seed facts are needed
      const seedCheck = path.join(this.knowledgeDir, TAXONOMY.AUTHORITATIVE, 'kno_core_architecture.json');
      if (!fs.existsSync(seedCheck)) {
        this.scaffoldDefaultKnowledge();
      }
    } catch (err) {
      console.error('[KnowledgeEngine] Failed to initialize directories:', err);
    }
  }

  /**
   * Scaffold initial verified facts, user preferences, and ADRs
   */
  scaffoldDefaultKnowledge() {
    const defaultItems = [
      {
        id: 'kno_core_architecture',
        content: 'Antigravity Harness uses DeepSeek Harness slot architecture with Cordis kernel for plugin isolation.',
        type: 'project_fact',
        category: TAXONOMY.AUTHORITATIVE,
        status: KNOWLEDGE_STATUS.VERIFIED,
        confidence: 0.99,
        importance: 0.95,
        sources: ['package.json', 'harness/agent.js', 'harness/plugins.js'],
        evidence_count: 3,
        contradictions: 0,
        tags: ['architecture', 'cordis', 'deepseek', 'harness'],
        relations: ['[[cordis-runtime]]', '[[antigravity-harness]]']
      },
      {
        id: 'kno_terminal_environment',
        content: 'Terminal commands on Windows run via PowerShell with windowsHide: true and explicit timeout handling.',
        type: 'tech_convention',
        category: TAXONOMY.AUTHORITATIVE,
        status: KNOWLEDGE_STATUS.VERIFIED,
        confidence: 0.98,
        importance: 0.90,
        sources: ['harness/tools.js', 'server.js'],
        evidence_count: 2,
        contradictions: 0,
        tags: ['powershell', 'windows', 'sandbox'],
        relations: ['[[powershell-sandbox]]']
      },
      {
        id: 'kno_memory_architecture',
        content: 'Long-term memory uses Hermes AI bounded Markdown banks and Obsidian cellular wikilinks rather than flat unconstrained dumps.',
        type: 'project_fact',
        category: TAXONOMY.AUTHORITATIVE,
        status: KNOWLEDGE_STATUS.VERIFIED,
        confidence: 0.98,
        importance: 0.92,
        sources: ['harness/memory.js', 'harness/graph.js', 'memory/decisions.md'],
        evidence_count: 3,
        contradictions: 0,
        tags: ['memory', 'hermes', 'obsidian', 'wikilinks'],
        relations: ['[[hermes-memory-system]]', '[[adr-001-obsidian-cellular-graph]]']
      },
      {
        id: 'kno_user_coding_style',
        content: 'User prefers anti-slop, highly complete implementations with zero placeholder omissions or truncated snippets.',
        type: 'user_preference',
        category: TAXONOMY.USER,
        status: KNOWLEDGE_STATUS.VERIFIED,
        confidence: 0.95,
        importance: 0.95,
        sources: ['memory/USER.md'],
        evidence_count: 2,
        contradictions: 0,
        tags: ['anti-slop', 'code-integrity', 'user-preference'],
        relations: ['[[anti-slop-ui-standard]]']
      },
      {
        id: 'hyp_redis_cache_layer',
        content: 'Redis or embedded LMDB caching might accelerate full-text graph traversal when node count exceeds 500.',
        type: 'hypothesis',
        category: TAXONOMY.TEMPORARY,
        status: KNOWLEDGE_STATUS.CANDIDATE,
        confidence: 0.45,
        importance: 0.50,
        sources: ['architecture_review'],
        evidence_count: 1,
        contradictions: 0,
        tags: ['performance', 'hypothesis', 'caching'],
        relations: ['[[cordis-runtime]]']
      }
    ];

    for (const item of defaultItems) {
      this.saveKnowledge(item, false);
    }
  }

  /**
   * Load all knowledge files from disk into memory index
   */
  loadAllKnowledge() {
    this.knowledgeIndex.clear();
    this.contentHashMap.clear();

    let totalLoaded = 0;
    try {
      for (const cat of Object.values(TAXONOMY)) {
        const catDir = path.join(this.knowledgeDir, cat);
        if (!fs.existsSync(catDir)) continue;

        const files = fs.readdirSync(catDir);
        for (const file of files) {
          if (!file.endsWith('.json')) continue;
          try {
            const raw = fs.readFileSync(path.join(catDir, file), 'utf-8');
            const item = JSON.parse(raw);
            if (item && item.id) {
              this.knowledgeIndex.set(item.id, item);
              if (item.content_hash) {
                this.contentHashMap.set(item.content_hash, item.id);
              }
              totalLoaded++;
            }
          } catch (e) {
            console.warn(`[KnowledgeEngine] Corrupt knowledge file: ${file}`, e.message);
          }
        }
      }
      this.recalculateEvolutionQueue();
      console.log(`🧠 [KnowledgeEngine] Loaded ${totalLoaded} knowledge objects across 6 taxonomies.`);
    } catch (err) {
      console.error('[KnowledgeEngine] Error loading knowledge bank:', err);
    }
  }

  /**
   * Recalculate priority-based evolution queue
   * Formula: Importance × (1 + 0.1 × usage) × (1 - confidence) × (contradiction > 0 ? 2 : 1)
   */
  recalculateEvolutionQueue() {
    const queue = [];
    for (const [id, item] of this.knowledgeIndex.entries()) {
      if (item.status === KNOWLEDGE_STATUS.SUPERSEDED || item.status === KNOWLEDGE_STATUS.REJECTED) {
        continue;
      }

      // Prioritize items that are either candidate or have low confidence or detected contradictions
      const uncertainty = Math.max(0.01, 1 - (item.confidence || 0.5));
      const usageBoost = 1 + ((item.usage_count || 0) * 0.1);
      const conflictFactor = (item.contradictions && item.contradictions > 0) ? 2.5 : 1.0;
      const importance = item.importance || 0.5;

      const priorityScore = parseFloat((importance * usageBoost * uncertainty * conflictFactor).toFixed(4));
      
      // If priority is above threshold or it's unverified candidate
      if (item.status === KNOWLEDGE_STATUS.CANDIDATE || priorityScore > 0.25 || item.contradictions > 0) {
        queue.push({
          id,
          priority: priorityScore,
          status: item.status,
          type: item.type,
          content: item.content,
          contradictions: item.contradictions || 0,
          confidence: item.confidence
        });
      }
    }

    queue.sort((a, b) => b.priority - a.priority);
    this.evolutionQueue = queue;
    return this.evolutionQueue;
  }

  /**
   * Save or update a KnowledgeObject to disk and index
   */
  saveKnowledge(item, triggerBroadcast = true) {
    const now = new Date().toISOString();
    const hash = item.content_hash || KnowledgeEvolutionEngine.computeContentHash(item.content);

    const fullObject = {
      id: item.id || `kno_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      content: item.content,
      type: item.type || 'project_fact',
      category: item.category || TAXONOMY.LEARNED,
      status: item.status || KNOWLEDGE_STATUS.CANDIDATE,
      confidence: typeof item.confidence === 'number' ? Math.max(0, Math.min(1, item.confidence)) : 0.5,
      importance: typeof item.importance === 'number' ? Math.max(0, Math.min(1, item.importance)) : 0.5,
      sources: Array.isArray(item.sources) ? item.sources : [item.sources].filter(Boolean),
      evidence_count: item.evidence_count || 1,
      contradictions: item.contradictions || 0,
      content_hash: hash,
      created_at: item.created_at || now,
      updated_at: now,
      valid_from: item.valid_from || now,
      valid_until: item.valid_until || null,
      last_verified: item.last_verified || (item.status === KNOWLEDGE_STATUS.VERIFIED ? now : null),
      usage_count: item.usage_count || 0,
      success_count: item.success_count || 0,
      failure_count: item.failure_count || 0,
      superseded_by: item.superseded_by || null,
      supersedes: item.supersedes || null,
      tags: Array.isArray(item.tags) ? item.tags : [],
      relations: Array.isArray(item.relations) ? item.relations : []
    };

    // Save to disk under designated taxonomy folder
    const targetDir = path.join(this.knowledgeDir, fullObject.category);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    
    const filePath = path.join(targetDir, `${fullObject.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(fullObject, null, 2), 'utf-8');

    // Update in-memory index
    this.knowledgeIndex.set(fullObject.id, fullObject);
    this.contentHashMap.set(hash, fullObject.id);
    this.recalculateEvolutionQueue();

    if (triggerBroadcast) {
      this.broadcast({
        type: 'knowledge_updated',
        knowledge: fullObject,
        stats: this.getStats()
      });
    }

    return fullObject;
  }

  /**
   * Ingestion & Candidate Proposal
   * Core Principle 2.1: Prohibits direct auto-trust. Enters as Candidate Knowledge.
   */
  proposeCandidate(candidate) {
    if (!candidate || !candidate.content) {
      throw new Error('Candidate content is required');
    }

    const hash = KnowledgeEvolutionEngine.computeContentHash(candidate.content);

    // 1. Programmatic Deduplication Check (Section 7)
    if (this.contentHashMap.has(hash)) {
      const existingId = this.contentHashMap.get(hash);
      const existing = this.knowledgeIndex.get(existingId);
      if (existing) {
        // Increment evidence and usage without duplicate LLM tokens
        existing.evidence_count = (existing.evidence_count || 1) + 1;
        if (candidate.sources) {
          const newSources = Array.isArray(candidate.sources) ? candidate.sources : [candidate.sources];
          existing.sources = Array.from(new Set([...existing.sources, ...newSources]));
        }
        existing.updated_at = new Date().toISOString();
        return this.saveKnowledge(existing);
      }
    }

    // 2. Formulate Candidate Object
    const candidateObj = {
      id: candidate.id || `can_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      content: candidate.content,
      type: candidate.type || 'learned',
      category: TAXONOMY.TEMPORARY,
      status: KNOWLEDGE_STATUS.CANDIDATE,
      confidence: candidate.confidence || 0.45,
      importance: candidate.importance || 0.60,
      sources: Array.isArray(candidate.sources) ? candidate.sources : [candidate.sources].filter(Boolean),
      evidence_count: 1,
      contradictions: 0,
      tags: candidate.tags || [],
      relations: candidate.relations || []
    };

    // 3. Contradiction & Compatibility Check
    const contradictionCheck = this.detectContradictions(candidateObj);
    if (contradictionCheck.hasContradiction) {
      candidateObj.contradictions = contradictionCheck.conflicts.length;
      candidateObj.potentialConflicts = contradictionCheck.conflicts.map(c => c.id);
    }

    const saved = this.saveKnowledge(candidateObj);
    this.broadcast({
      type: 'candidate_proposed',
      candidate: saved,
      contradictionCheck
    });

    return saved;
  }

  /**
   * Deterministic & Heuristic Contradiction Detection (Section 10)
   */
  detectContradictions(candidate) {
    const conflicts = [];
    const candidateText = candidate.content.toLowerCase();
    const candidateWords = candidateText.split(/\W+/).filter(w => w.length > 3);

    for (const [id, existing] of this.knowledgeIndex.entries()) {
      if (existing.id === candidate.id || existing.status === KNOWLEDGE_STATUS.SUPERSEDED || existing.status === KNOWLEDGE_STATUS.REJECTED) {
        continue;
      }

      // Check keyword overlap
      const existingText = existing.content.toLowerCase();
      const matchCount = candidateWords.filter(w => existingText.includes(w)).length;
      const overlapRatio = matchCount / Math.max(1, candidateWords.length);

      // Antagonistic patterns (e.g. uses X vs uses Y, enables vs disables)
      const hasAntagonism = (
        (candidateText.includes('uses') && existingText.includes('uses') && overlapRatio > 0.4) ||
        (candidateText.includes('replaces') && existingText.includes(candidateText.split('replaces')[1]?.trim())) ||
        (candidateText.includes('disabled') && existingText.includes('enabled')) ||
        (candidateText.includes('npm') && existingText.includes('pnpm')) ||
        (candidateText.includes('deprecated') && overlapRatio > 0.5)
      );

      if (hasAntagonism && candidateText !== existingText) {
        conflicts.push({
          id: existing.id,
          content: existing.content,
          status: existing.status,
          category: existing.category,
          overlapRatio: parseFloat(overlapRatio.toFixed(2)),
          timestamp: existing.updated_at
        });
      }
    }

    return {
      hasContradiction: conflicts.length > 0,
      conflicts
    };
  }

  /**
   * Verification & Falsification Engine (Popperian verification, Section 2.1 & 4)
   */
  verifyCandidate(candidateId, verificationOptions = {}) {
    const item = this.knowledgeIndex.get(candidateId);
    if (!item) throw new Error(`Candidate with ID "${candidateId}" not found.`);

    const {
      approved = true,
      popperFalsified = false,
      additionalEvidence = [],
      resolverReason = 'Verified via automated evidence and Popper consistency check',
      supersedeId = null
    } = verificationOptions;

    // Check token budget allocation
    if (!this.checkTokenBudget('idle', 50)) {
      console.warn('[KnowledgeEngine] Token budget exhausted for verification.');
      return { success: false, reason: 'Token budget exhausted for background evolution' };
    }
    this.recordTokenUsage('idle', 50);

    const now = new Date().toISOString();

    if (popperFalsified || !approved) {
      // Rejection branch
      this.moveTaxonomy(item, TAXONOMY.REJECTED);
      item.status = KNOWLEDGE_STATUS.REJECTED;
      item.confidence = Math.min(item.confidence, 0.20);
      item.rejectionReason = popperFalsified ? 'Popperian Falsification failed: counter-example discovered' : resolverReason;
      item.updated_at = now;
      this.saveKnowledge(item);

      return {
        success: true,
        action: 'rejected',
        knowledge: item
      };
    }

    // Handle superseding older conflicting facts (Temporal Versioning, Section 9)
    if (supersedeId) {
      const oldItem = this.knowledgeIndex.get(supersedeId);
      if (oldItem) {
        oldItem.status = KNOWLEDGE_STATUS.SUPERSEDED;
        oldItem.valid_until = now;
        oldItem.superseded_by = item.id;
        this.saveKnowledge(oldItem);
        item.supersedes = oldItem.id;
      }
    }

    // Promoted to verified knowledge
    item.status = KNOWLEDGE_STATUS.VERIFIED;
    item.category = item.type === 'user_preference' ? TAXONOMY.USER : TAXONOMY.LEARNED;
    this.moveTaxonomy(item, item.category);

    item.confidence = Math.min(0.99, (item.confidence || 0.5) + 0.35);
    item.evidence_count = (item.evidence_count || 1) + (additionalEvidence.length || 1);
    item.last_verified = now;
    item.valid_from = item.valid_from || now;
    item.valid_until = null;
    item.contradictions = 0;

    if (additionalEvidence.length > 0) {
      item.sources = Array.from(new Set([...item.sources, ...additionalEvidence]));
    }

    const verifiedKnowledge = this.saveKnowledge(item);

    return {
      success: true,
      action: 'promoted',
      knowledge: verifiedKnowledge
    };
  }

  /**
   * Physical filesystem move between taxonomy directories
   */
  moveTaxonomy(item, newCategory) {
    const oldDir = path.join(this.knowledgeDir, item.category);
    const newDir = path.join(this.knowledgeDir, newCategory);
    const oldFile = path.join(oldDir, `${item.id}.json`);
    const newFile = path.join(newDir, `${item.id}.json`);

    try {
      if (fs.existsSync(oldFile)) {
        fs.unlinkSync(oldFile);
      }
      item.category = newCategory;
    } catch (e) {
      console.warn(`[KnowledgeEngine] Could not remove old file: ${oldFile}`, e.message);
    }
  }

  /**
   * Experience Bank Recording (Section 12 & 13)
   */
  recordTaskExperience(experienceData) {
    const now = new Date().toISOString();
    const expId = `exp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

    const experienceRecord = {
      id: expId,
      taskId: experienceData.taskId || `task-${Date.now()}`,
      intent: experienceData.intent || 'Unnamed task',
      plan: experienceData.plan || [],
      actions: experienceData.actions || [],
      toolsUsed: experienceData.toolsUsed || [],
      errors: experienceData.errors || [],
      retries: experienceData.retries || 0,
      finalResult: experienceData.finalResult || '',
      success: Boolean(experienceData.success),
      userFeedback: experienceData.userFeedback || null,
      timestamp: now,
      lessonsCandidate: null
    };

    // Autonomous Reflection trigger (Section 13)
    // Only extract lessons if failure, tool errors, retries, or explicit user correction occurred
    const requiresReflection = (
      !experienceRecord.success ||
      experienceRecord.errors.length > 0 ||
      experienceRecord.retries > 0 ||
      experienceRecord.userFeedback
    );

    if (requiresReflection) {
      const lessonSummary = this.deriveLessonFromExperience(experienceRecord);
      if (lessonSummary) {
        experienceRecord.lessonsCandidate = lessonSummary;
        
        // Propose candidate lesson into temporary queue
        this.proposeCandidate({
          content: lessonSummary.lesson,
          type: 'lesson_learned',
          category: TAXONOMY.TEMPORARY,
          sources: [`task_experience:${experienceRecord.taskId}`],
          importance: experienceRecord.success ? 0.70 : 0.85,
          confidence: 0.50,
          tags: ['experience', 'lesson', ...(experienceData.toolsUsed || [])]
        });
      }
    }

    // Save to memory/experience/
    const expFile = path.join(this.experienceDir, `${expId}.json`);
    fs.writeFileSync(expFile, JSON.stringify(experienceRecord, null, 2), 'utf-8');

    this.broadcast({
      type: 'task_experience_recorded',
      experience: experienceRecord
    });

    return experienceRecord;
  }

  /**
   * Derive practical lesson from failure or retry patterns
   */
  deriveLessonFromExperience(exp) {
    if (exp.errors.length > 0) {
      const firstError = String(exp.errors[0]);
      return {
        context: exp.intent,
        error: firstError.slice(0, 150),
        lesson: `When performing "${exp.intent.slice(0, 80)}", error occurred: "${firstError.slice(0, 100)}". Pre-check parameters and environment to avoid recurrence.`,
        actionableRule: `Inspect requirements before invoking ${exp.toolsUsed.join(', ')}`
      };
    }

    if (!exp.success) {
      return {
        context: exp.intent,
        error: 'Task outcome unresolved',
        lesson: `Strategy for "${exp.intent.slice(0, 80)}" failed to satisfy completion criteria. Alternative toolchain or breakdown required.`,
        actionableRule: 'Split complex goal into discrete sub-goals'
      };
    }

    return null;
  }

  /**
   * External Knowledge Ingestion (Section 5)
   * Ingests external text/markdown/code, performs diff & change detection
   */
  ingestExternalSource(sourceName, rawContent, metadata = {}) {
    if (!rawContent || typeof rawContent !== 'string') {
      return { skipped: true, reason: 'Empty or invalid content' };
    }

    const hash = KnowledgeEvolutionEngine.computeContentHash(rawContent);

    // Section 7: Programmatic Change Detection
    if (this.contentHashMap.has(hash)) {
      return {
        skipped: true,
        reason: 'Identical content hash already registered. Zero token consumption.',
        existingId: this.contentHashMap.get(hash)
      };
    }

    // Chunk or extract knowledge assertions (Minimalist sentence/paragraph parsing)
    const paragraphs = rawContent
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 25 && p.length < 500);

    const candidates = [];
    for (const p of paragraphs.slice(0, 5)) { // Bounded chunk limit
      const candidate = this.proposeCandidate({
        content: p,
        type: metadata.type || 'learned',
        sources: [sourceName],
        importance: metadata.importance || 0.65,
        confidence: 0.50,
        tags: metadata.tags || ['external_ingest', sourceName]
      });
      candidates.push(candidate);
    }

    return {
      success: true,
      source: sourceName,
      hash,
      candidateCount: candidates.length,
      candidates
    };
  }

  /**
   * Query & Retrieve relevant verified knowledge (Section 8 & 16)
   * High performance multi-dimensional search avoiding whole-store prompt injection
   */
  queryKnowledge(query = '', options = {}) {
    const {
      taxonomy = null,
      status = KNOWLEDGE_STATUS.VERIFIED,
      limit = 5,
      minConfidence = 0.5
    } = options;

    const q = (query || '').toLowerCase().trim();
    const queryTokens = q ? q.split(/\W+/).filter(t => t.length > 2) : [];

    const results = [];

    for (const [id, item] of this.knowledgeIndex.entries()) {
      if (status && item.status !== status) continue;
      if (taxonomy && item.category !== taxonomy) continue;
      if (item.confidence < minConfidence) continue;

      let score = 0;
      const contentLower = item.content.toLowerCase();
      const tags = (item.tags || []).join(' ').toLowerCase();

      if (!q) {
        score = item.importance * item.confidence;
      } else {
        for (const token of queryTokens) {
          if (contentLower.includes(token)) score += 3;
          if (tags.includes(token)) score += 4;
        }
        if (contentLower.includes(q)) score += 10;
        score = score * (item.importance || 0.5) * (item.confidence || 0.5);
      }

      if (score > 0) {
        results.push({
          score: parseFloat(score.toFixed(3)),
          knowledge: item
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit).map(r => r.knowledge);
  }

  /**
   * System Prompt Injection Provider (Section 6 & 16)
   * Generates compact, relevant verified knowledge without dumping the whole DB
   */
  getCompactPromptSnapshot(userPrompt = '') {
    const relevantItems = this.queryKnowledge(userPrompt, {
      status: KNOWLEDGE_STATUS.VERIFIED,
      limit: 6,
      minConfidence: 0.70
    });

    if (relevantItems.length === 0) return '';

    let xml = '<verified_knowledge_vault>\n';
    for (const item of relevantItems) {
      xml += `  <fact id="${item.id}" type="${item.type}" confidence="${item.confidence}">\n`;
      xml += `    ${item.content}\n`;
      xml += `  </fact>\n`;
    }
    xml += '</verified_knowledge_vault>';
    return xml;
  }

  /**
   * Token Budget Enforcement (Section 16 & 25)
   */
  checkTokenBudget(allocationType, estimatedTokens = 100) {
    const alloc = this.tokenBudget.allocations[allocationType];
    if (!alloc) return true;
    return (alloc.spent + estimatedTokens) <= alloc.limit;
  }

  recordTokenUsage(allocationType, tokens) {
    if (!this.tokenBudget.allocations[allocationType]) return;
    this.tokenBudget.allocations[allocationType].spent += tokens;
    this.tokenBudget.spentTotal += tokens;
  }

  /**
   * 3-Tier Evolution Scheduler (Section 14 & 15)
   */
  setupScheduler() {
    // Idle Evolution Worker (Triggers every 45 seconds when no interactive task is executing)
    this.idleTimer = setInterval(() => {
      this.runIdleEvolutionCycle();
    }, 45000);
    if (this.idleTimer.unref) this.idleTimer.unref();

    // Periodic Deep Audit (Hourly or on demand)
    this.auditTimer = setInterval(() => {
      this.runDeepAuditCycle();
    }, this.auditIntervalMs);
    if (this.auditTimer.unref) this.auditTimer.unref();
  }

  /**
   * Tier 2: Idle Evolution Cycle
   */
  runIdleEvolutionCycle() {
    if (this.isIdleRunning) return;
    if (this.evolutionQueue.length === 0) return;
    if (!this.checkTokenBudget('idle', 100)) {
      return; // Token budget gated
    }

    this.isIdleRunning = true;
    try {
      const topCandidate = this.evolutionQueue.shift();
      if (topCandidate && topCandidate.status === KNOWLEDGE_STATUS.CANDIDATE) {
        // Auto-evaluate candidate with high confidence & no contradictions
        const item = this.knowledgeIndex.get(topCandidate.id);
        if (item && item.contradictions === 0 && (item.evidence_count >= 2 || item.confidence >= 0.75)) {
          this.verifyCandidate(item.id, {
            approved: true,
            resolverReason: 'Autonomous Idle Learning: Verified via sufficient evidence corroboration and zero conflict.'
          });
        }
      }
    } catch (err) {
      console.error('[KnowledgeEngine] Idle evolution error:', err);
    } finally {
      this.isIdleRunning = false;
    }
  }

  /**
   * Tier 3: Periodic Deep Audit Cycle (Section 14.3)
   */
  runDeepAuditCycle() {
    console.log('🔬 [KnowledgeEngine] Executing Periodic Deep Audit Sweep...');
    const now = new Date();
    const auditReport = {
      timestamp: now.toISOString(),
      staleItems: [],
      contradictionsFound: [],
      lowConfidenceHighUse: [],
      compactedCount: 0
    };

    for (const [id, item] of this.knowledgeIndex.entries()) {
      // 1. Detect low confidence but frequently used items
      if (item.confidence < 0.60 && item.usage_count > 5) {
        auditReport.lowConfidenceHighUse.push(id);
      }

      // 2. Refresh contradiction audits
      const contradiction = this.detectContradictions(item);
      if (contradiction.hasContradiction) {
        item.contradictions = contradiction.conflicts.length;
        auditReport.contradictionsFound.push({ id, conflicts: contradiction.conflicts });
      }
    }

    this.recalculateEvolutionQueue();
    this.broadcast({
      type: 'deep_audit_completed',
      report: auditReport,
      stats: this.getStats()
    });

    return auditReport;
  }

  /**
   * Comprehensive Statistics for Telemetry & UI
   */
  getStats() {
    const stats = {
      total: this.knowledgeIndex.size,
      byTaxonomy: {
        [TAXONOMY.AUTHORITATIVE]: 0,
        [TAXONOMY.LEARNED]: 0,
        [TAXONOMY.EXPERIENCE]: 0,
        [TAXONOMY.USER]: 0,
        [TAXONOMY.TEMPORARY]: 0,
        [TAXONOMY.REJECTED]: 0
      },
      byStatus: {
        [KNOWLEDGE_STATUS.CANDIDATE]: 0,
        [KNOWLEDGE_STATUS.VERIFIED]: 0,
        [KNOWLEDGE_STATUS.SUPERSEDED]: 0,
        [KNOWLEDGE_STATUS.REJECTED]: 0
      },
      evolutionQueueLength: this.evolutionQueue.length,
      averageConfidence: 0,
      tokenBudget: this.tokenBudget
    };

    let totalConfidence = 0;
    for (const item of this.knowledgeIndex.values()) {
      if (stats.byTaxonomy[item.category] !== undefined) {
        stats.byTaxonomy[item.category]++;
      }
      if (stats.byStatus[item.status] !== undefined) {
        stats.byStatus[item.status]++;
      }
      totalConfidence += (item.confidence || 0);
    }

    stats.averageConfidence = stats.total > 0 ? parseFloat((totalConfidence / stats.total).toFixed(3)) : 0;
    return stats;
  }
}

module.exports = {
  KnowledgeEvolutionEngine,
  TAXONOMY,
  KNOWLEDGE_STATUS
};
