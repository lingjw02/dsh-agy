module.exports = {
  name: 'dsh-plugin-calculator',
  description: 'DeepSeek Harness Plugin: Evaluates mathematical and arithmetic expressions using Cordis ctx.tools.register',
  version: '1.2.0',
  inject: ['tools', 'slots'],

  apply(ctx) {
    // 1. Register DSH Tool
    ctx.tools.register({
      name: 'calculate',
      description: 'Perform arithmetic and mathematical computations safely (e.g. 2^10 + sqrt(144) * 5)',
      parameters: {
        expression: { type: 'string', description: 'Math expression to evaluate' }
      },
      async execute({ expression }) {
        try {
          // Sanitize simple arithmetic
          const sanitized = String(expression).replace(/[^0-9+\-*/().^ %]/g, '');
          const result = Function(`'use strict'; return (${sanitized.replace(/\^/g, '**')})`)();
          return {
            expression,
            result,
            formatted: `${expression} = ${result}`
          };
        } catch (e) {
          return { error: `Calculation error: ${e.message}`, expression };
        }
      }
    });

    // 2. Register DSH Slash Command into Cordis composer:command slot
    ctx.slots.register('composer:command', {
      id: 'cmd-calc',
      name: '/calc',
      description: 'Quick math evaluation powered by dsh-plugin-calculator',
      category: 'DSH Plugin'
    });

    // 3. Register Reversible Lifecycle Effect
    ctx.effect(() => {
      console.log('✅ [dsh-plugin-calculator] Activated via Cordis Context');
      return () => {
        console.log('🛑 [dsh-plugin-calculator] Deactivated and cleaned up');
      };
    });
  }
};
