# 🏛️ Architectural Decision Log (ADR)
<!-- HERMES_MEMORY_TYPE: decision_log -->
<!-- BOUNDED_BUDGET: 5000 chars -->

## ADR-001: Hermes AI Markdown Memory Bank over Flat JSON Store
- **Status**: Accepted
- **Context**: The previous memory system used a single flat JSON file (`.dsh_memory.json`), lacking human readability, categorization, and bounded context management.
- **Decision**: Adopt Hermes AI's Markdown-first memory bank structure directly in the workspace (`memory/`).
- **Consequences**:
  1. Human-readable and agent-editable via standard file tools.
  2. Bounded character limits with self-compaction prevents context window bloat.
  3. Direct snapshot injection into the agent's system prompt ensures continuous cross-session recall.
