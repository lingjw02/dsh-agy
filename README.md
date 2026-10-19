# 🪐 Antigravity Harness (AGH)
### A DeepSeek Harness (DSH) Architecture Implementation for Google Antigravity

Antigravity Harness (AGH) is a developer workbench and agentic harness inspired by the **DeepSeek Harness (`dsh`)** design and powered by the **Cordis** "everything is a plugin" slot architecture. It provides full observability into agent reasoning, tool execution trajectories, multi-agent fleet swarms, and workspace automation.

---

## 🌟 Key Features

1. **DeepSeek Harness Slot Architecture**:
   - **`ConversationRoot`**: Central chat canvas with streaming responses, syntax highlighting, and GFM markdown.
   - **`dsh-trajectory`**: Real-time Chain of Thought (Thinking Process) inspector with duration timers and token metrics.
   - **Tool Execution Cards**: Monospace visual inspection of tool parameters (JSON), live execution status, and return values.
   - **`InputBar`**: Smart composer with auto-complete for slash commands (`/`) and context mentions (`@`).

2. **Full Antigravity Agent Capabilities**:
   - **Core Tools**:
     - `run_command`: Terminal powershell/bash executor with configurable security policies (`always-proceed`, `request-review`, `proceed-in-sandbox`, `strict`).
     - `view_file`, `write_to_file`, `replace_file_content`: Workspace file manipulation and artifact generation.
     - `invoke_subagent`, `manage_subagents`, `send_message`: Multi-agent fleet orchestration.
     - `schedule`, `manage_task`: One-shot timers, cron schedules, and background task management.
     - `ask_question`: Interactive multiple-choice prompts rendered directly in the workbench.
     - `search_web`, `read_url_content`: Live documentation retrieval and web research.
   - **Comprehensive Skills Library (29 Skills Included)**:
     - Directly bundled in `skills/`: `agy-customizations`, `antigravity_guide`, `design-taste-frontend`, `taste-skill`, `gpt-tasteskill`, `brutalist-skill`, `minimalist-skill`, `soft-skill`, `stitch-skill`, `brandkit`, `redesign-skill`, `image-to-code-skill`, `imagegen-frontend-web`, `imagegen-frontend-mobile`, `cli-anything-gimp`, `cli-hub-meta-skill`, `brainstorming`, `dispatching-parallel-agents`, `executing-plans`, `finishing-a-development-branch`, `receiving-code-review`, `generative_ui`, `automation`, `migrate-workflows`, `permissioned-github`, `plugin`, `ui-plugin-navigation`.
     - 1-click **"Read SKILL.md"** directly opens complete skill documentation in the Artifact Viewer.
   - **MCP Server Auto-Discovery**:
     - Automatically loads Model Context Protocol servers from `~/.gemini/antigravity-cli/mcp/` (`brevo`, `chrome-devtools`, `supabase`).
   - **Transcripts Importer**:
     - Direct access to previous Antigravity session trajectories stored in `~/.gemini/antigravity-cli/brain/`.

3. **Auxiliary Workbench Drawer**:
   - 🖥️ **Live Terminal**: Integrated PowerShell shell runner with streaming outputs.
   - 📄 **Artifacts & Diff Previewer**: Syntax-highlighted code viewer and in-place file editor.
   - 🔍 **Trajectory JSONL Stream**: Real-time audit log of every step, prompt, and tool invocation.
   - 🛠️ **Tool Runner (MCP Playground)**: Direct manual testing for any Antigravity or MCP tool.

---

## 🚀 Quick Start

### 1. Launch the Workbench
The server runs on port `3080` (DeepSeek Harness default port):

```powershell
cd "D:\02_Development_Tools\Antigravity harness"
npm start
```

Open your browser at:
👉 **`http://127.0.0.1:3080`**

### 2. Slash Commands (`/`)
Type `/` in the input bar to activate built-in workflows:
- `/plan`: Engage deliberate multi-phase architectural planning.
- `/goal`: Launch an autonomous, persistent execution loop until full completion.
- `/schedule`: Set up delayed timers or recurring background tasks.
- `/browser`: Automate Chrome DevTools web interaction and QA.
- `/boost`: Enable deep multi-perspective reasoning mode.
- `/grill-me`: Start an interactive interview to resolve design decisions.
- `/learn`: Extract learnings and create persistent agent rules.
- `/teamwork-preview`: Orchestrate autonomous subagents in parallel.
- `/calc`: Quick math calculation powered by `dsh-plugin-calculator`.
- `/git-lens`: Git commit log and branch status via `dsh-plugin-git-lens`.

### 3. Context Mentions (`@`)
Type `@` in the input bar to attach context chips:
- `@files`: Attach workspace files (e.g. `@package.json`).
- `@mcp:<server>`: Attach MCP server context (e.g. `@mcp:chrome-devtools`, `@mcp:supabase`).
- `@skill:<name>`: Direct the agent to follow a specific skill (e.g. `@skill:design-taste-frontend`, `@skill:antigravity_guide`, `@skill:brainstorming`).

---

## 🔌 DeepSeek Harness (`dsh-plugin`) Plugin Compatibility

Antigravity Harness includes a built-in **Cordis Kernel (`CordisKernel`)** providing 100% native compatibility with standard DeepSeek Harness plugins (`dsh-plugin-*`).

### 1. Plugin Structure
Any standard DSH plugin with an `apply(ctx)` entry point can be dropped into `plugins/`:

```javascript
module.exports = {
  name: 'dsh-plugin-weather',
  description: 'Weather forecaster for DeepSeek Harness',
  version: '1.0.0',
  inject: ['tools', 'slots'], // Request services from Cordis Context

  apply(ctx) {
    // Register custom tool
    ctx.tools.register({
      name: 'get_weather',
      description: 'Fetch current weather',
      parameters: { city: { type: 'string' } },
      async execute({ city }) {
        return { city, condition: 'Sunny', temperature: '22°C' };
      }
    });

    // Register slash command in Cordis composer:command slot
    ctx.slots.register('composer:command', {
      id: 'cmd-weather',
      name: '/weather',
      description: 'Check weather forecast',
      category: 'DSH Plugin'
    });

    // Register reversible lifecycle teardown
    ctx.effect(() => {
      console.log('Weather plugin ready');
      return () => console.log('Weather plugin cleaned up');
    });
  }
};
```

### 2. Supported Cordis `ctx` Services:
- `ctx.tools.register(def)`: Registers agent tools with arguments schema & execute callback.
- `ctx.slots.register(slot, item)`: Injects UI slots (`composer:command`, `composer:mention`, `sidebar:tab`).
- `ctx.shell.exec(command, options)`: Invokes shell commands via Antigravity runner.
- `ctx.fs.read(path)` & `ctx.fs.write(path, data)`: File system manipulation.
- `ctx.sessions.current()` & `ctx.sessions.broadcast(data)`: Real-time event bus.
- `ctx.on(event, handler)` & `ctx.effect(fn)`: Reversible event subscriptions and cleanup.
- `ctx.dshLoader`: Compatibility shim for DeepSeek runtime dependencies.

### 3. Adding Plugins:
1. **Drop into folder**: Place any DSH plugin folder in `D:\02_Development_Tools\Antigravity harness\plugins\`.
2. **From UI**: Click **Plugins** in the top bar -> **+ Add DSH Plugin** to write or paste JavaScript code directly.
3. **NPM**: Install any `dsh-plugin-*` package in `node_modules`.

---

## 🏗️ Architecture & Directory Structure

```
Antigravity harness/
├── server.js                 # Express API + WebSocket real-time bus
├── harness/
│   ├── agent.js              # Antigravity agent loop & reasoning engine
│   ├── tools.js              # Native Antigravity tools implementation
│   ├── cordis.js             # Cordis Kernel & Context for DSH plugins
│   └── plugins.js            # Plugin manager (Skills, MCP, & DSH plugins)
├── plugins/                  # DeepSeek Harness plugins directory
│   ├── dsh-plugin-calculator/
│   └── dsh-plugin-git-lens/
├── skills/                   # Antigravity Skills Library (29 skills)
│   ├── design-taste-frontend/
│   ├── antigravity_guide/
│   ├── agy-customizations/
│   └── ...
├── public/
│   ├── index.html            # DeepSeek Harness slot layout
│   ├── css/
│   │   └── style.css         # Dark cyberpunk cockpit design system
│   └── js/
│       ├── app.js            # App coordinator
│       ├── services/         # REST API & WebSocket clients
│       └── components/       # Chat, Sidebar, InputBar, Terminal, Plugins
└── README.md
```

---

## 🧠 Hermes AI Tier-1 Persistent Memory Bank

Antigravity Harness features a **Nous Hermes AI-style Tier-1 persistent markdown memory system** that automatically scaffolds, persists, and monitors human-readable memory files directly inside your workspace:

### 1. Direct Workspace Memory Bank Structure (`memory/`)
- **`MEMORY.md`** (~2,500 chars budget): Durable project facts, architecture patterns, tech stack rules, anti-slop frontend standards, and tool workarounds.
- **`USER.md`** (~1,500 chars budget): Persistent user profile, role, bilingual preferences, tone guidelines, and workflow habits.
- **`activeContext.md`** (~3,000 chars budget): Immediate session goals, current development focus, recent changes, and blockers.
- **`decisions.md`** (~5,000 chars budget): Architectural Decision Records (ADR log) capturing trade-offs and consequences.
- **`manifest.json`**: Metadata tracking version, character counts, and sync timestamps.

### 2. Core Capabilities:
- **Instant System Prompt Injection**: Every session injects a `<hermes_memory_bank>` snapshot into the agent loop, ensuring continuous cross-session awareness without bloating the context window.
- **Interactive Memory Drawer**: Live character budget gauges (`Current / Limit` with colored progress bars), in-place Markdown editor with save confirmation, quick search filter, and 1-click **⚡ Generate Bank** and **✨ Auto-Curate** actions.
- **Slash Commands & Mentions**:
  - `/memory`: Inspect memory bank status, character budget utilization, and files.
  - `/memory init`: Scaffold or reset default Hermes memory files directly in workspace.
  - `/memory curate`: Distill active session learnings into `activeContext.md`.
  - `/memory <query>`: Full-text search across all memory files with snippet relevance.
  - `@memory`: Attach persistent memory bank snapshot directly into composer input.
- **Passive Memory Guardian**: `guardian-memory-budget` monitors memory file character budgets and provides Hermes self-compaction recommendations.

---

## ⚙️ Configuration & Custom Models
Access the **Settings** modal via the top bar to configure:
- **Models**: Gemini 3.8 Flash, Gemini Pro, DeepSeek V3 (671B MoE), DeepSeek R1, or local endpoints (Ollama / vLLM).
- **Execution Policy**: Toggle between `always-proceed` (Full Auto), `request-review`, `proceed-in-sandbox`, and `strict` (read-only).
- **API Keys**: Add `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`, or custom OpenAI-compatible endpoints.
