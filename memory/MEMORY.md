# 🧠 Project Memory Bank (Durable Knowledge)
<!-- HERMES_MEMORY_TYPE: durable_facts -->
<!-- BOUNDED_BUDGET: 2500 chars -->

## Architecture & System
- **Framework**: Antigravity Harness (AGH) built on DeepSeek Harness (DSH) slot architecture.
- **Plugin System**: Powered by Cordis kernel (`apply(ctx)` plugin interface with slots `composer:command`, `composer:mention`, `sidebar:tab`).
- **Multi-Agent Fleet**: Worker mesh featuring Active Front Staff workers and Passive Hybrid Guardians.
- **Security Policy**: Configurable tool sandbox execution (`always-proceed`, `request-review`, `proceed-in-sandbox`, `strict`).
- **Memory Engine**: Hermes AI Layer-1 persistent markdown memory bank with character bounded budgets.

## Frontend & Anti-Slop Standards
- **Design Taste**: Enforce anti-slop frontend standards; avoid generic AI gray cards, use refined contrast, device frames, and intentional typography.
- **Code Integrity**: Zero truncated code blocks, no `// TODO ... rest of code` placeholders; always output complete runnable implementations.
- **File Links**: Always link referenced files with clickable Markdown links `[file.ext](file:///path)`.

## Tool Workarounds & Environment
- Terminal execution runs PowerShell on Windows with `windowsHide: true` and custom wait timeout.
- Cordis slots allow hot-reloading and reversible teardown via `ctx.effect()`.
- MCP servers auto-discovered from `~/.gemini/antigravity-cli/mcp/` (Brevo, Chrome DevTools, Supabase).
