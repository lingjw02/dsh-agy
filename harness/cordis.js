const fs = require('fs');
const path = require('path');

class CordisContext {
  constructor(kernel, pluginId, pluginName, config = {}) {
    this.kernel = kernel;
    this.pluginId = pluginId;
    this.name = pluginName || pluginId;
    this.config = config;

    this.disposables = [];
    this.eventListeners = [];

    // 1. Tool Service API
    this.tools = {
      register: (definition) => {
        if (!definition || !definition.name) {
          throw new Error('Tool definition must include a "name"');
        }
        const toolName = definition.name;
        const toolRecord = {
          id: `dsh-tool-${this.pluginId}-${toolName}`,
          pluginId: this.pluginId,
          name: toolName,
          description: definition.description || '',
          parameters: definition.parameters || {},
          execute: definition.execute || (async () => ({}))
        };

        this.kernel.registeredTools.set(toolName, toolRecord);

        // Hook into toolRegistry
        if (this.kernel.toolRegistry) {
          this.kernel.toolRegistry[toolName] = async (args) => {
            return await toolRecord.execute(args, this);
          };
        }

        const dispose = () => {
          this.kernel.registeredTools.delete(toolName);
          if (this.kernel.toolRegistry && this.kernel.toolRegistry[toolName]) {
            delete this.kernel.toolRegistry[toolName];
          }
        };
        this.disposables.push(dispose);
        return dispose;
      },
      get: (name) => this.kernel.registeredTools.get(name),
      list: () => Array.from(this.kernel.registeredTools.values())
    };

    // 2. Slot Architecture API
    this.slots = {
      register: (slotName, item) => {
        const slotItem = {
          ...item,
          _pluginId: this.pluginId
        };
        if (!this.kernel.slots[slotName]) {
          this.kernel.slots[slotName] = [];
        }
        this.kernel.slots[slotName].push(slotItem);

        const dispose = () => {
          if (this.kernel.slots[slotName]) {
            this.kernel.slots[slotName] = this.kernel.slots[slotName].filter(
              i => i._pluginId !== this.pluginId || i.id !== item.id
            );
          }
        };
        this.disposables.push(dispose);
        return dispose;
      },
      inject: (slotName) => this.kernel.slots[slotName] || []
    };

    // 3. Shell Service API
    this.shell = {
      exec: async (command, options = {}) => {
        if (this.kernel.toolRegistry) {
          return await this.kernel.toolRegistry.run_command({
            CommandLine: command,
            Cwd: options.cwd || this.kernel.workspace,
            WaitMsBeforeAsync: options.waitMs || 5000
          });
        }
        return { error: 'Shell service not available' };
      }
    };

    // 4. File System Service API
    this.fs = {
      read: async (filePath) => {
        if (this.kernel.toolRegistry) {
          return await this.kernel.toolRegistry.view_file({ AbsolutePath: filePath });
        }
        return { error: 'FS service not available' };
      },
      write: async (filePath, content, options = {}) => {
        if (this.kernel.toolRegistry) {
          return await this.kernel.toolRegistry.write_to_file({
            TargetFile: filePath,
            CodeContent: content,
            Overwrite: options.overwrite !== false,
            Description: options.description || 'Written via Cordis DSH plugin'
          });
        }
        return { error: 'FS service not available' };
      },
      list: (dirPath) => {
        const target = path.isAbsolute(dirPath) ? dirPath : path.resolve(this.kernel.workspace, dirPath);
        return fs.readdirSync(target);
      }
    };

    // 5. Sessions & Broadcast Service API
    this.sessions = {
      current: () => this.kernel.agentEngine ? this.kernel.agentEngine.getActiveSession() : null,
      broadcast: (payload) => {
        if (this.kernel.broadcast) {
          this.kernel.broadcast(payload);
        }
      }
    };

    // 6. LLM Generation API
    this.llm = {
      generate: async (prompt, options = {}) => {
        if (this.kernel.agentEngine) {
          return await this.kernel.agentEngine.handleUserMessage(prompt, options);
        }
        return null;
      }
    };

    // 7. Compatibility Shim (dshLoader)
    this.dshLoader = {
      version: '1.0.0-cordis-compat',
      ctx: this
    };
  }

  // Reversible Event Listener
  on(event, handler) {
    if (!this.kernel.eventHandlers[event]) {
      this.kernel.eventHandlers[event] = [];
    }
    const record = { pluginId: this.pluginId, handler };
    this.kernel.eventHandlers[event].push(record);
    this.eventListeners.push({ event, record });

    const dispose = () => {
      if (this.kernel.eventHandlers[event]) {
        this.kernel.eventHandlers[event] = this.kernel.eventHandlers[event].filter(r => r !== record);
      }
    };
    this.disposables.push(dispose);
    return dispose;
  }

  emit(event, ...args) {
    this.kernel.emitEvent(event, ...args);
  }

  // Reversible Lifecycle Effect
  effect(fn) {
    try {
      const teardown = fn();
      if (typeof teardown === 'function') {
        this.disposables.push(teardown);
      }
    } catch (e) {
      console.error(`[Cordis:${this.pluginId}] Error in effect:`, e);
    }
  }

  extend(subName) {
    return new CordisContext(this.kernel, `${this.pluginId}:${subName}`, `${this.name}:${subName}`, this.config);
  }

  isolate(serviceName) {
    const child = this.extend(`iso-${serviceName}`);
    return child;
  }

  dispose() {
    for (const d of this.disposables) {
      try { d(); } catch (e) { console.error(`[Cordis:${this.pluginId}] Teardown error:`, e); }
    }
    this.disposables = [];
    this.eventListeners = [];
  }
}

class CordisKernel {
  constructor(options = {}) {
    this.workspace = options.workspace || process.cwd();
    this.toolRegistry = options.toolRegistry || null;
    this.agentEngine = options.agentEngine || null;
    this.broadcast = options.broadcast || (() => {});
    this.slots = options.slots || {};

    this.registeredTools = new Map(); // toolName -> toolRecord
    this.activePlugins = new Map(); // pluginId -> { id, name, ctx, module, path, enabled, config }
    this.eventHandlers = {}; // eventName -> Array<{ pluginId, handler }>

    this.pluginsDirectory = path.resolve(__dirname, '..', 'plugins');
    if (!fs.existsSync(this.pluginsDirectory)) {
      try { fs.mkdirSync(this.pluginsDirectory, { recursive: true }); } catch (_) {}
    }
  }

  setDependencies({ toolRegistry, agentEngine, broadcast, slots }) {
    if (toolRegistry) this.toolRegistry = toolRegistry;
    if (agentEngine) this.agentEngine = agentEngine;
    if (broadcast) this.broadcast = broadcast;
    if (slots) this.slots = slots;
  }

  emitEvent(eventName, ...args) {
    const handlers = this.eventHandlers[eventName] || [];
    for (const h of handlers) {
      try {
        h.handler(...args);
      } catch (err) {
        console.error(`Error in event handler for "${eventName}" (plugin: ${h.pluginId}):`, err);
      }
    }
  }

  // Load a DSH Plugin from a file or directory
  loadPlugin(pluginPath, config = {}) {
    try {
      const resolved = path.isAbsolute(pluginPath) ? pluginPath : path.resolve(this.workspace, pluginPath);
      delete require.cache[require.resolve(resolved)]; // Enable Hot Reloading
      const mod = require(resolved);

      const pluginName = mod.name || (mod.default && mod.default.name) || path.basename(pluginPath).replace(/\.[^/.]+$/, '');
      const applyFn = mod.apply || (mod.default && mod.default.apply) || (typeof mod === 'function' ? mod : null);

      if (!applyFn || typeof applyFn !== 'function') {
        throw new Error(`Plugin at "${pluginPath}" does not export an "apply(ctx)" function`);
      }

      const pluginId = `dsh-${pluginName}`;
      // Clean up previous instance if reloading
      if (this.activePlugins.has(pluginId)) {
        this.unloadPlugin(pluginId);
      }

      const ctx = new CordisContext(this, pluginId, pluginName, config);
      applyFn(ctx, config);

      const pluginMeta = {
        id: pluginId,
        name: pluginName,
        type: 'dsh-plugin',
        description: mod.description || (mod.default && mod.default.description) || 'DeepSeek Harness Cordis Plugin',
        version: mod.version || '1.0.0',
        path: resolved,
        inject: mod.inject || [],
        enabled: true,
        ctx,
        module: mod,
        config
      };

      this.activePlugins.set(pluginId, pluginMeta);
      console.log(`🔌 [Cordis] Loaded DeepSeek Harness Plugin: "${pluginName}" (${pluginId})`);
      ctx.emit('ready');
      return pluginMeta;
    } catch (e) {
      console.error(`[Cordis] Failed to load DSH plugin at "${pluginPath}":`, e.message);
      throw e;
    }
  }

  unloadPlugin(pluginId) {
    if (!this.activePlugins.has(pluginId)) return false;
    const meta = this.activePlugins.get(pluginId);
    if (meta.ctx) {
      meta.ctx.dispose();
    }
    meta.enabled = false;
    this.activePlugins.delete(pluginId);
    console.log(`🔌 [Cordis] Unloaded DSH Plugin: "${meta.name}"`);
    return true;
  }

  togglePlugin(pluginId, enable) {
    if (!this.activePlugins.has(pluginId)) return null;
    const meta = this.activePlugins.get(pluginId);
    if (enable === false && meta.enabled) {
      meta.ctx.dispose();
      meta.enabled = false;
    } else if (enable === true && !meta.enabled) {
      return this.loadPlugin(meta.path, meta.config);
    }
    return meta;
  }

  // Scan and discover DSH plugins in plugins/ directory and node_modules
  discoverDshPlugins() {
    const discovered = [];

    // 1. Scan harness `plugins/` directory
    if (fs.existsSync(this.pluginsDirectory)) {
      try {
        const entries = fs.readdirSync(this.pluginsDirectory, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(this.pluginsDirectory, entry.name);
          if (entry.isDirectory()) {
            const indexJs = path.join(fullPath, 'index.js');
            const pkgJson = path.join(fullPath, 'package.json');
            if (fs.existsSync(indexJs)) {
              discovered.push(indexJs);
            } else if (fs.existsSync(pkgJson)) {
              try {
                const pkg = JSON.parse(fs.readFileSync(pkgJson, 'utf-8'));
                const main = pkg.main || 'index.js';
                discovered.push(path.join(fullPath, main));
              } catch (_) {}
            }
          } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.cjs'))) {
            discovered.push(fullPath);
          }
        }
      } catch (err) {
        console.warn('[Cordis] Error reading plugins directory:', err.message);
      }
    }

    // 2. Scan node_modules for `dsh-plugin-*`
    const nodeModulesDir = path.join(this.workspace, 'node_modules');
    if (fs.existsSync(nodeModulesDir)) {
      try {
        const modules = fs.readdirSync(nodeModulesDir);
        for (const mod of modules) {
          if (mod.startsWith('dsh-plugin-')) {
            discovered.push(path.join(nodeModulesDir, mod));
          }
        }
      } catch (_) {}
    }

    // Auto-load discovered plugins
    for (const p of discovered) {
      try {
        this.loadPlugin(p);
      } catch (err) {
        console.warn(`[Cordis] Could not auto-load "${p}":`, err.message);
      }
    }

    return Array.from(this.activePlugins.values());
  }

  getAllPlugins() {
    return Array.from(this.activePlugins.values()).map(p => ({
      id: p.id,
      name: p.name,
      type: 'plugin',
      kind: 'plugin',
      category: 'DeepSeek Harness Plugin',
      description: p.description,
      version: p.version,
      path: p.path,
      inject: p.inject,
      enabled: p.enabled,
      tools: Array.from(this.registeredTools.values()).filter(t => t.pluginId === p.id).map(t => t.name)
    }));
  }
}

module.exports = { CordisKernel, CordisContext };
