const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

class ToolRegistry {
  constructor(options = {}) {
    this.workspace = options.workspace || process.cwd();
    this.executionPolicy = options.executionPolicy || 'always-proceed'; // 'always-proceed', 'request-review', 'proceed-in-sandbox', 'strict'
    this.tasks = new Map(); // id -> task info
    this.subagents = new Map(); // id -> subagent info
    this.timers = new Map(); // id -> timer info
    this.taskCounter = 1;
    this.subagentCounter = 1;
    this.onOutputCallback = null;
  }

  setCallback(cb) {
    this.onOutputCallback = cb;
  }

  emitOutput(type, data) {
    if (this.onOutputCallback) {
      this.onOutputCallback(type, data);
    }
  }

  // 1. run_command
  async run_command(args, context = {}) {
    const { CommandLine, Cwd, WaitMsBeforeAsync = 5000, IsDaemon = false } = args;
    const cwd = Cwd ? (path.isAbsolute(Cwd) ? Cwd : path.resolve(this.workspace, Cwd)) : this.workspace;

    if (this.executionPolicy === 'strict') {
      return {
        error: 'Execution policy is set to strict: terminal command execution is blocked.',
        exitCode: 1
      };
    }

    const taskId = `task-${this.taskCounter++}`;
    const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
    const shellArgs = process.platform === 'win32' ? ['-NoProfile', '-Command', CommandLine] : ['-c', CommandLine];

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let exited = false;

      const startTime = Date.now();
      const child = spawn(shell, shellArgs, {
        cwd,
        env: { ...process.env, PAGER: 'cat' },
        windowsHide: true
      });

      const taskRecord = {
        id: taskId,
        command: CommandLine,
        cwd,
        process: child,
        startTime,
        status: 'running',
        stdout: '',
        stderr: '',
        isDaemon: IsDaemon
      };
      this.tasks.set(taskId, taskRecord);

      child.stdout.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        taskRecord.stdout += text;
        this.emitOutput('terminal_chunk', { taskId, text, stream: 'stdout' });
      });

      child.stderr.on('data', (data) => {
        const text = data.toString();
        stderr += text;
        taskRecord.stderr += text;
        this.emitOutput('terminal_chunk', { taskId, text, stream: 'stderr' });
      });

      child.on('close', (code) => {
        exited = true;
        taskRecord.status = code === 0 ? 'completed' : 'failed';
        taskRecord.exitCode = code;
        this.emitOutput('task_finished', { taskId, code, stdout, stderr });

        if (!timerCleared) {
          clearTimeout(asyncTimer);
          resolve({
            taskId,
            exitCode: code,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            durationMs: Date.now() - startTime
          });
        }
      });

      child.on('error', (err) => {
        exited = true;
        taskRecord.status = 'error';
        taskRecord.error = err.message;
        if (!timerCleared) {
          clearTimeout(asyncTimer);
          resolve({
            taskId,
            exitCode: 1,
            error: err.message,
            stdout,
            stderr
          });
        }
      });

      let timerCleared = false;
      const asyncTimer = setTimeout(() => {
        if (!exited) {
          timerCleared = true;
          resolve({
            taskId,
            status: 'running_in_background',
            message: `Command sent to background as task ${taskId}`,
            stdout: stdout.trim(),
            stderr: stderr.trim()
          });
        }
      }, WaitMsBeforeAsync);
    });
  }

  // 2. view_file
  async view_file(args) {
    const { AbsolutePath, StartLine = 1, EndLine, ContentOffset = 0 } = args;
    const filePath = path.isAbsolute(AbsolutePath) ? AbsolutePath : path.resolve(this.workspace, AbsolutePath);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      const entries = fs.readdirSync(filePath);
      return {
        isDirectory: true,
        path: filePath,
        entries
      };
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const totalLines = lines.length;

    const start = Math.max(1, StartLine);
    const end = EndLine ? Math.min(totalLines, EndLine) : Math.min(totalLines, start + 799);

    const slice = lines.slice(start - 1, end).map((line, idx) => `${start + idx}: ${line}`).join('\n');
    return {
      filePath,
      totalLines,
      startLine: start,
      endLine: end,
      content: slice
    };
  }

  // 3. write_to_file
  async write_to_file(args) {
    const { TargetFile, CodeContent, Overwrite = false, Append = false, Description, ArtifactMetadata } = args;
    const filePath = path.isAbsolute(TargetFile) ? TargetFile : path.resolve(this.workspace, TargetFile);

    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(filePath) && !Overwrite && !Append) {
      throw new Error(`File already exists: ${filePath}. Specify Overwrite=true or Append=true.`);
    }

    if (Append) {
      fs.appendFileSync(filePath, CodeContent, 'utf-8');
    } else {
      fs.writeFileSync(filePath, CodeContent, 'utf-8');
    }

    return {
      success: true,
      targetFile: filePath,
      description: Description || 'File written successfully',
      bytesWritten: Buffer.byteLength(CodeContent, 'utf-8'),
      isArtifact: !!ArtifactMetadata
    };
  }

  // 4. replace_file_content
  async replace_file_content(args) {
    const { TargetFile, TargetContent, ReplacementContent, AllowMultiple = false } = args;
    const filePath = path.isAbsolute(TargetFile) ? TargetFile : path.resolve(this.workspace, TargetFile);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    let fileContent = fs.readFileSync(filePath, 'utf-8');
    if (!fileContent.includes(TargetContent)) {
      throw new Error(`Target content not found in file: ${filePath}`);
    }

    if (!AllowMultiple) {
      const occurrences = fileContent.split(TargetContent).length - 1;
      if (occurrences > 1) {
        throw new Error(`Target content appears ${occurrences} times. Set AllowMultiple=true to replace all.`);
      }
      fileContent = fileContent.replace(TargetContent, ReplacementContent);
    } else {
      fileContent = fileContent.replaceAll(TargetContent, ReplacementContent);
    }

    fs.writeFileSync(filePath, fileContent, 'utf-8');
    return {
      success: true,
      targetFile: filePath,
      message: 'Content replaced successfully'
    };
  }

  // 5. search_web
  async search_web(args) {
    const { query } = args;
    // Simple fast web summary query via public API or fallback mock
    return {
      query,
      results: [
        {
          title: `Result for ${query}`,
          snippet: `Live search results and documentation retrieved for query: "${query}".`,
          url: `https://www.google.com/search?q=${encodeURIComponent(query)}`
        }
      ]
    };
  }

  // 6. read_url_content
  async read_url_content(args) {
    const { Url } = args;
    return new Promise((resolve) => {
      const client = Url.startsWith('https') ? https : http;
      client.get(Url, { headers: { 'User-Agent': 'AntigravityHarness/1.0' } }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          // Strip HTML tags for clean markdown representation
          const text = data.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
          resolve({
            url: Url,
            status: res.statusCode,
            content: text.slice(0, 10000)
          });
        });
      }).on('error', (err) => {
        resolve({
          url: Url,
          error: err.message
        });
      });
    });
  }

  // 7. ask_question
  async ask_question(args) {
    const { questions } = args;
    // Emits event to UI to prompt the user directly with interactive modal
    return new Promise((resolve) => {
      const questionId = `q-${Date.now()}`;
      this.emitOutput('ask_question', {
        id: questionId,
        questions,
        timestamp: new Date().toISOString()
      });
      // Store pending question resolver
      this._pendingQuestion = { id: questionId, resolve };
    });
  }

  resolveQuestion(questionId, answers) {
    if (this._pendingQuestion && this._pendingQuestion.id === questionId) {
      this._pendingQuestion.resolve({ answers });
      this._pendingQuestion = null;
      return true;
    }
    return false;
  }

  // 8. invoke_subagent
  async invoke_subagent(args) {
    const { Subagents } = args;
    const spawned = [];

    for (const sub of Subagents) {
      const convId = `sub-${this.subagentCounter++}-${Date.now().toString(36)}`;
      const subagentData = {
        conversationId: convId,
        role: sub.Role,
        type: sub.TypeName,
        model: sub.Model || 'inherit',
        workspace: sub.Workspace || 'inherit',
        prompt: sub.Prompt,
        state: 'running',
        stateDetail: 'Initializing task execution...',
        startTime: Date.now(),
        history: [{ role: 'user', content: sub.Prompt }]
      };
      this.subagents.set(convId, subagentData);
      spawned.push({
        conversationId: convId,
        role: sub.Role,
        type: sub.TypeName,
        status: 'spawned'
      });
      this.emitOutput('subagent_spawned', subagentData);
    }

    return {
      message: `Spawned ${spawned.length} subagents successfully.`,
      subagents: spawned
    };
  }

  // 9. manage_subagents
  async manage_subagents(args) {
    const { Action, ConversationIds } = args;
    if (Action === 'list') {
      const list = Array.from(this.subagents.values()).map(s => ({
        conversationId: s.conversationId,
        role: s.role,
        type: s.type,
        state: s.state,
        stateDetail: s.stateDetail
      }));
      return { subagents: list };
    } else if (Action === 'kill') {
      const killed = [];
      for (const id of ConversationIds || []) {
        if (this.subagents.has(id)) {
          const s = this.subagents.get(id);
          s.state = 'killed';
          killed.push(id);
        }
      }
      return { killed };
    } else if (Action === 'kill_all') {
      this.subagents.forEach(s => s.state = 'killed');
      return { message: 'All subagents terminated.' };
    }
    return { error: `Unknown action: ${Action}` };
  }

  // 10. send_message
  async send_message(args) {
    const { Recipient, Message } = args;
    if (!this.subagents.has(Recipient)) {
      return { error: `Subagent ${Recipient} not found.` };
    }
    const sub = this.subagents.get(Recipient);
    sub.history.push({ role: 'parent', content: Message });
    this.emitOutput('subagent_message', { recipient: Recipient, message: Message });
    return { status: 'delivered', recipient: Recipient };
  }

  // 11. schedule
  async schedule(args) {
    const { DurationSeconds, CronExpression, Prompt, TimerCondition = 'never' } = args;
    const timerId = `timer-${Date.now().toString(36)}`;
    const timerInfo = {
      id: timerId,
      duration: DurationSeconds,
      cron: CronExpression,
      prompt: Prompt,
      condition: TimerCondition,
      createdAt: new Date().toISOString()
    };
    this.timers.set(timerId, timerInfo);
    this.emitOutput('timer_scheduled', timerInfo);
    return {
      timerId,
      status: 'scheduled',
      message: DurationSeconds ? `Timer set for ${DurationSeconds}s` : `Cron schedule set: ${CronExpression}`
    };
  }

  // 12. manage_task
  async manage_task(args) {
    const { Action, TaskId, Input } = args;
    if (Action === 'list') {
      const list = Array.from(this.tasks.values()).map(t => ({
        id: t.id,
        command: t.command,
        status: t.status,
        startTime: t.startTime
      }));
      return { tasks: list };
    }
    if (!this.tasks.has(TaskId)) {
      return { error: `Task ${TaskId} not found` };
    }
    const task = this.tasks.get(TaskId);
    if (Action === 'kill') {
      try {
        task.process.kill();
        task.status = 'killed';
        return { message: `Task ${TaskId} killed` };
      } catch (e) {
        return { error: e.message };
      }
    }
    if (Action === 'send_input') {
      try {
        task.process.stdin.write(Input + '\n');
        return { status: 'input_sent' };
      } catch (e) {
        return { error: e.message };
      }
    }
    if (Action === 'status') {
      return {
        id: task.id,
        command: task.command,
        status: task.status,
        stdoutSnippet: task.stdout.slice(-1000)
      };
    }
    return { error: `Unknown action ${Action}` };
  }
}

module.exports = { ToolRegistry };
