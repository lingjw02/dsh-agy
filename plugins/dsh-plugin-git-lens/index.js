module.exports = {
  name: 'dsh-plugin-git-lens',
  description: 'DeepSeek Harness Plugin: Inspect git commit log, status, and active branch via Cordis ctx.shell',
  version: '1.0.0',
  inject: ['tools', 'shell', 'slots'],

  apply(ctx) {
    // 1. Register DSH Tool
    ctx.tools.register({
      name: 'git_status_lens',
      description: 'Quick snapshot of current git repository status and branch',
      parameters: {},
      async execute() {
        const statusRes = await ctx.shell.exec('git status -s');
        const branchRes = await ctx.shell.exec('git branch --show-current');
        const logRes = await ctx.shell.exec('git log -n 3 --oneline');

        return {
          branch: branchRes.stdout ? branchRes.stdout.trim() : 'unknown',
          status: statusRes.stdout ? statusRes.stdout.trim() : 'clean',
          recentCommits: logRes.stdout ? logRes.stdout.trim().split('\n') : []
        };
      }
    });

    // 2. Register Slash Command
    ctx.slots.register('composer:command', {
      id: 'cmd-git-lens',
      name: '/git-lens',
      description: 'View Git repository overview powered by dsh-plugin-git-lens',
      category: 'DSH Plugin'
    });

    ctx.effect(() => {
      console.log('✅ [dsh-plugin-git-lens] Activated via Cordis Context');
      return () => {
        console.log('🛑 [dsh-plugin-git-lens] Deactivated');
      };
    });
  }
};
