/**
 * Agent Manager
 *
 * Manages the Claude, Codex, or Gemini CLI process.
 */

import { execSync, spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as pty from 'node-pty';
import type {
  PermissionRequestMessage,
  PermissionResponseMessage,
  DiffPatchMessage,
  PatchDecisionMessage,
  AgentId,
} from '@doomcode/protocol';
import { PermissionDetector } from './permission-detector.js';
import { DiffExtractor } from './diff-extractor.js';

export type AgentStatus = 'idle' | 'running' | 'waiting_input' | 'error';

export interface AgentManagerOptions {
  agent: AgentId;
  workingDirectory: string;
  onOutput: (stream: 'stdout' | 'stderr', data: string) => void;
  onPermissionRequest: (request: PermissionRequestMessage) => void;
  onDiff: (diff: DiffPatchMessage) => void;
  onExit: (code: number) => void;
}

export class AgentManager {
  private options: AgentManagerOptions;
  private ptyProcess: pty.IPty | null = null;
  private process: ChildProcessWithoutNullStreams | null = null;
  private status: AgentStatus = 'idle';
  private permissionDetector: PermissionDetector;
  private diffExtractor: DiffExtractor;
  private debugPty = process.env.DOOMCODE_DEBUG_PTY === '1';
  private enterMode = this.normalizeEnterMode(process.env.DOOMCODE_ENTER_MODE);
  private typewriteDelayMs = Number(process.env.DOOMCODE_TYPEWRITE_DELAY_MS ?? '5');
  private typewriteOverride = process.env.DOOMCODE_TYPEWRITE;
  private pendingPermissions: Map<string, (response: PermissionResponseMessage) => void> =
    new Map();
  private pendingPatches: Map<string, (decision: PatchDecisionMessage) => void> = new Map();
  private outputBuffer = '';

  constructor(options: AgentManagerOptions) {
    this.options = options;
    this.permissionDetector = new PermissionDetector();
    this.diffExtractor = new DiffExtractor();
  }

  private logDebug(message: string): void {
    if (this.debugPty) {
      console.log(message);
    }
  }

  private normalizeEnterMode(mode: string | undefined): 'cr' | 'lf' | 'crlf' {
    const value = (mode ?? 'cr').toLowerCase();
    if (value === 'lf' || value === 'crlf') return value;
    return 'cr';
  }

  private getEnterSuffix(): string {
    switch (this.enterMode) {
      case 'lf':
        return '\n';
      case 'crlf':
        return '\r\n';
      case 'cr':
      default:
        return '\r';
    }
  }

  private sendEnter(): void {
    const suffix = this.getEnterSuffix();
    this.logDebug(`>>> [AGENT] sendEnter: ${JSON.stringify(suffix)}`);
    this.writeToAgent(suffix);
  }

  private typewrite(text: string): void {
    const chars = Array.from(text);
    const delay = Math.max(0, this.typewriteDelayMs);

    // For python bridge, send Escape first to ensure Claude is ready for input
    const isPythonBridge = !!this.process && !this.ptyProcess;
    if (isPythonBridge) {
      this.logDebug('>>> [AGENT] Sending Escape (0x1b) to prepare input');
      this.writeToAgent('\x1b');
    }

    const startDelay = isPythonBridge ? 50 : 0;

    if (chars.length === 0) {
      setTimeout(() => {
        this.forceSubmit();
      }, startDelay);
      return;
    }

    chars.forEach((char, index) => {
      setTimeout(() => {
        this.writeToAgent(char);
      }, startDelay + delay * index);
    });

    setTimeout(() => {
      this.forceSubmit();
    }, startDelay + delay * chars.length + 20);
  }

  /**
   * Force submit the current input using multiple methods:
   * - Ctrl+M (0x0d) = Carriage Return
   * - Ctrl+J (0x0a) = Line Feed / Newline
   * This should work regardless of terminal mode.
   */
  private forceSubmit(): void {
    this.logDebug('>>> [AGENT] forceSubmit: sending Ctrl+M (0x0d) then Ctrl+J (0x0a)');
    // Send CR (Ctrl+M)
    this.writeToAgent('\x0d');
    // Small delay, then send LF (Ctrl+J)
    setTimeout(() => {
      this.writeToAgent('\x0a');
    }, 10);
  }

  private writeToAgent(data: string): void {
    const bytes = Buffer.from(data);
    this.logDebug(`>>> [AGENT] writeToAgent: ${bytes.length} bytes, hex: ${bytes.toString('hex')}`);

    try {
      if (this.ptyProcess) {
        this.logDebug('>>> [AGENT] Writing to node-pty...');
        this.ptyProcess.write(data);
        this.logDebug('>>> [AGENT] node-pty write complete');
        return;
      }
      if (this.process?.stdin) {
        this.logDebug('>>> [AGENT] Writing to python bridge stdin...');
        const written = this.process.stdin.write(data);
        this.logDebug(`>>> [AGENT] stdin.write returned: ${written}`);
      }
    } catch (e) {
      console.error('>>> [AGENT] Failed to write to agent:', e);
    }
  }

  private sendLine(line: string): void {
    this.logDebug(`>>> [AGENT] sendLine: "${line}"`);

    if (this.ptyProcess) {
      const suffix = this.getEnterSuffix();
      this.logDebug(`>>> [AGENT] Using node-pty path, appending ${JSON.stringify(suffix)}`);
      this.writeToAgent(line);
      setTimeout(() => this.sendEnter(), 5);
    } else if (this.process) {
      // Python PTY bridge: use forceSubmit for reliable Enter
      this.logDebug('>>> [AGENT] Using python-bridge path with forceSubmit');
      this.writeToAgent(line);
      setTimeout(() => this.forceSubmit(), 10);
    } else {
      console.log('>>> [AGENT] ERROR: No process to write to!');
    }
  }

  private buildPtyEnv(fullPath: string): Record<string, string> {
    // node-pty expects env values to be strings (no undefined).
    const baseEnv = Object.fromEntries(
      Object.entries(process.env).filter(([, v]) => typeof v === 'string')
    ) as Record<string, string>;

    return {
      ...baseEnv,
      PATH: fullPath,
      TERM: 'xterm-256color',
      FORCE_COLOR: '1',
      // Tell Claude we are NOT a CI environment (some CLIs change behavior under CI)
      CI: 'false',
      CLAUDE_CODE_ENTRYPOINT: 'doomcode',
      // Ensure shell is set (some CLIs assume it)
      SHELL: baseEnv.SHELL || '/bin/zsh',
    };
  }

  private spawnPty(command: string, args: string[], fullPath: string): void {
    const env = this.buildPtyEnv(fullPath);

    this.ptyProcess = pty.spawn(command, args, {
      name: 'xterm-256color',
      cols: 120,
      rows: 40,
      cwd: this.options.workingDirectory,
      env,
    });
  }

  private spawnPythonPtyBridge(command: string, args: string[], fullPath: string): void {
    // node-pty is failing on some macOS setups (posix_spawnp failed). We still need a
    // real PTY *and* programmatic stdin/stdout so prompts can come from the phone.
    //
    // This Python bridge uses only the standard library to:
    // - allocate a PTY
    // - spawn the agent with stdin/stdout/stderr attached to the PTY slave
    // - forward PTY master output to stdout
    // - forward our stdin to the PTY master
    //
    // Node then talks to the bridge over pipes (works in any environment).
    const env = this.buildPtyEnv(fullPath);
    // Claude appears to accept LF more reliably under the python bridge; default to LF unless overridden.
    if (!process.env.DOOMCODE_ENTER_MODE) {
      this.enterMode = 'lf';
      env.DOOMCODE_ENTER_MODE = 'lf';
    }

    // Use explicit byte values to avoid any JS/Python escaping issues
    const bridgeSource = `#!/usr/bin/env python3
import os, pty, sys, selectors, subprocess, termios

DEBUG = os.environ.get("DOOMCODE_DEBUG_PTY") == "1"
ENTER_MODE = os.environ.get("DOOMCODE_ENTER_MODE", "cr").lower()

def log(msg):
    if not DEBUG:
        return
    # Write to stderr with flush - use explicit newline byte
    os.write(2, ("[PTY-BRIDGE] " + str(msg) + chr(10)).encode())

def main():
    log("Python PTY bridge starting...")
    
    if len(sys.argv) < 2:
        log("ERROR: No command provided")
        return 2

    cmd = sys.argv[1:]
    log(f"Command: {cmd}")

    # Fork a PTY with a proper controlling terminal for the child.
    pid, master_fd = pty.fork()
    if pid == 0:
        # Child process: configure line discipline on stdin (the PTY slave)
        try:
            attrs = termios.tcgetattr(0)
            if ENTER_MODE == "cr":
                # Map CR to NL in canonical input processing
                attrs[0] |= termios.ICRNL
                attrs[0] &= ~termios.INLCR
                attrs[0] &= ~termios.IGNCR
            else:
                # Don't translate CR/LF automatically; app receives exact bytes
                attrs[0] &= ~termios.ICRNL
                attrs[0] &= ~termios.INLCR
                attrs[0] &= ~termios.IGNCR
            termios.tcsetattr(0, termios.TCSANOW, attrs)
        except Exception:
            pass

        os.execvpe(cmd[0], cmd, os.environ.copy())
        os._exit(1)

    log(f"PTY forked: master={master_fd}, child_pid={pid}, enter_mode={ENTER_MODE}")

    sel = selectors.DefaultSelector()
    sel.register(master_fd, selectors.EVENT_READ, "pty")
    sel.register(0, selectors.EVENT_READ, "stdin")  # fd 0 = stdin

    try:
        while True:
            child_exited = False
            try:
                finished_pid, status = os.waitpid(pid, os.WNOHANG)
                if finished_pid != 0:
                    child_exited = True
                    if os.WIFEXITED(status):
                        log(f"Child exited with code {os.WEXITSTATUS(status)}")
                    elif os.WIFSIGNALED(status):
                        log(f"Child exited with signal {os.WTERMSIG(status)}")
            except ChildProcessError:
                child_exited = True

            if child_exited:
                # Drain remaining output
                try:
                    data = os.read(master_fd, 65536)
                    if data:
                        os.write(1, data)
                except OSError:
                    pass
                break

            for key, _ in sel.select(timeout=0.1):
                if key.data == "pty":
                    try:
                        data = os.read(master_fd, 65536)
                    except OSError:
                        data = b""
                    if data:
                        os.write(1, data)  # Write to stdout (fd 1)
                else:
                    # Read from stdin (fd 0)
                    try:
                        data = os.read(0, 65536)
                    except OSError as e:
                        log(f"stdin read error: {e}")
                        data = b""
                    
                    if not data:
                        log("stdin closed, exiting")
                        try:
                            os.close(master_fd)
                        except OSError:
                            pass
                        return 0

                    log(f"RECV {len(data)} bytes: {data!r}")

                    # Pass-through bytes as-is. We control line endings on the Node side.
                    out = data

                    log(f"SEND {len(out)} bytes: {out!r}")

                    try:
                        os.write(master_fd, out)
                    except OSError as e:
                        log(f"PTY write error: {e}")
    except Exception as e:
        log(f"Main loop error: {e}")
    finally:
        try:
            sel.close()
        except Exception:
            pass
        try:
            os.close(master_fd)
        except Exception:
            pass

    return 0

if __name__ == "__main__":
    raise SystemExit(main())
`;

    const tmpPath = path.join(os.tmpdir(), `doomcode-pty-bridge-${process.pid}.py`);
    fs.writeFileSync(tmpPath, bridgeSource, { encoding: 'utf8' });

    this.process = spawn('python3', ['-u', tmpPath, command, ...args], {
      cwd: this.options.workingDirectory,
      env,
      stdio: 'pipe',
    });
  }

  private findAgentPath(binary: string, label: string, extraPaths: string[] = []): string {
    const possiblePaths = [
      `/opt/homebrew/bin/${binary}`,
      `/usr/local/bin/${binary}`,
      path.join(os.homedir(), '.npm-global/bin', binary),
      path.join(os.homedir(), '.local/bin', binary),
      path.join(os.homedir(), 'bin', binary),
      ...extraPaths,
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        console.log(`Found ${label} at: ${p}`);
        return p;
      }
    }

    try {
      const result = execSync(`which ${binary}`, { encoding: 'utf-8' }).trim();
      if (result) {
        console.log(`Found ${label} via which: ${result}`);
        return result;
      }
    } catch {
      // which failed
    }

    console.error(`Could not find ${label} CLI. Tried:`, possiblePaths.join(', '));
    throw new Error(`${label} CLI not found. Please ensure it is installed and in PATH.`);
  }

  private resolveAgentCommand(): string {
    switch (this.options.agent) {
      case 'claude':
        return this.findAgentPath('claude', 'Claude');
      case 'codex':
        return this.findAgentPath('codex', 'Codex');
      case 'gemini':
        return this.findAgentPath('gemini', 'Gemini');
      default:
        throw new Error(`Unsupported agent: ${this.options.agent}`);
    }
  }

  async start(initialPrompt?: string): Promise<void> {
    let command: string;
    const args: string[] = [];

    try {
      command = this.resolveAgentCommand();
    } catch (error) {
      console.error('Failed to find agent:', error);
      this.status = 'error';
      this.options.onOutput('stderr', `Error: ${error}\n`);
      return;
    }

    // For Claude, we need to use interactive mode
    // Use --dangerously-skip-permissions to avoid TTY requirement for permissions
    if (this.options.agent === 'claude') {
      // Don't add any special flags - let it run in default interactive mode
      // The user will send prompts via stdin
    }

    if (initialPrompt) {
      // Use chat mode with initial prompt
      args.push(initialPrompt);
    }

    console.log(`Starting ${this.options.agent} agent...`);
    console.log(`Command: ${command} ${args.join(' ')}`);
    console.log(`Working directory: ${this.options.workingDirectory}`);
    this.logDebug(`>>> [AGENT] Enter mode: ${this.enterMode}`);
    this.logDebug(
      `>>> [AGENT] Typewrite override: ${this.typewriteOverride ?? 'auto'} (delay=${this.typewriteDelayMs}ms)`
    );

    // Ensure PATH includes common locations for CLI tools
    const envPath = process.env.PATH || '';
    const additionalPaths = ['/opt/homebrew/bin', '/usr/local/bin', '/usr/bin'];
    const fullPath = [...new Set([...additionalPaths, ...envPath.split(':')])].join(':');

    try {
      // Run the agent inside a real pseudo-terminal (PTY). Many interactive CLIs
      // (including Claude) behave differently without a TTY and may produce no output.
      try {
        this.spawnPty(command, args, fullPath);

        const ptyProc = this.ptyProcess;
        if (!ptyProc) {
          throw new Error('Failed to start PTY process');
      }

        console.log(`Agent started with PID: ${ptyProc.pid}`);
      this.status = 'running';

        // PTY output is a single stream; treat as stdout for the protocol.
        ptyProc.onData((text) => {
          console.log('[Agent pty]:', text.substring(0, 200));
        this.handleOutput('stdout', text);
      });

        ptyProc.onExit(({ exitCode, signal }) => {
          console.log(`Agent exited with code ${exitCode}, signal ${signal}`);
          this.status = 'idle';
          this.options.onExit(exitCode ?? 0);
        });
      } catch (e) {
        // node-pty is failing on some macOS setups with `posix_spawnp failed`.
        // Fall back to a python-based PTY bridge (still supports programmatic stdin/stdout).
        console.warn('PTY spawn failed, falling back to python PTY bridge:', e);
        this.ptyProcess = null;
        this.spawnPythonPtyBridge(command, args, fullPath);

        if (!this.process?.pid) {
          throw new Error('Failed to start agent via python PTY bridge');
        }

        console.log(`Agent started (python PTY bridge) with PID: ${this.process.pid}`);
        this.status = 'running';

        this.process.stdout.on('data', (buf: Buffer) => this.handleOutput('stdout', buf.toString()));
        // Python bridge stderr contains debug info - print to console only when enabled
        this.process.stderr.on('data', (buf: Buffer) => {
          if (!this.debugPty) return;
          const text = buf.toString().trim();
          if (text) {
            console.log(`>>> [PTY-BRIDGE-STDERR] ${text}`);
          }
        });
      this.process.on('exit', (code, signal) => {
        console.log(`Agent exited with code ${code}, signal ${signal}`);
        this.status = 'idle';
        this.options.onExit(code ?? 0);
      });
      this.process.on('error', (err) => {
        console.error('Process spawn error:', err.message);
        this.status = 'error';
        this.options.onOutput('stderr', `Process error: ${err.message}\n`);
      });
      }

      // Send a small test to see if process is responsive
      setTimeout(() => {
        if ((this.ptyProcess || this.process) && this.status === 'running') {
          console.log('Agent appears to be running. Waiting for user input from mobile.');
          this.options.onOutput('stdout', 'DoomCode: Agent ready. Send a prompt from your mobile device.\n');
        }
      }, 1000);

    } catch (error) {
      console.error('Failed to spawn agent:', error);
      this.status = 'error';
      const errMsg =
        error instanceof Error
          ? `${error.message}\n${error.stack ?? ''}`
          : String(error);
      this.options.onOutput('stderr', `Failed to start agent: ${error}\n`);
      this.options.onOutput('stderr', `Details: ${errMsg}\n`);
    }
  }

  private handleOutput(stream: 'stdout' | 'stderr', data: string): void {
    // Buffer output for pattern detection
    this.outputBuffer += data;

    // Check for permission requests
    const permissionRequest = this.permissionDetector.detect(this.outputBuffer);
    if (permissionRequest) {
      this.status = 'waiting_input';
      this.options.onPermissionRequest(permissionRequest);

      // Store pending permission handler
      this.pendingPermissions.set(permissionRequest.requestId, (response) => {
        if (response.decision === 'approve' || response.decision === 'approve_always') {
          this.sendLine('y');
        } else {
          this.sendLine('n');
        }
        this.status = 'running';
      });

      // Clear buffer after detection
      this.outputBuffer = '';
    }

    // Check for diff output
    const diff = this.diffExtractor.extract(this.outputBuffer);
    if (diff) {
      this.options.onDiff(diff);
      this.outputBuffer = '';
    }

    // Keep buffer from growing too large
    if (this.outputBuffer.length > 10000) {
      this.outputBuffer = this.outputBuffer.slice(-5000);
    }

    // Forward output
    this.options.onOutput(stream, data);
  }

  handlePermissionResponse(response: PermissionResponseMessage): void {
    const handler = this.pendingPermissions.get(response.requestId);
    if (handler) {
      handler(response);
      this.pendingPermissions.delete(response.requestId);
    }
  }

  handlePatchDecision(decision: PatchDecisionMessage): void {
    const handler = this.pendingPatches.get(decision.patchId);
    if (handler) {
      handler(decision);
      this.pendingPatches.delete(decision.patchId);
    }
  }

  sendPrompt(prompt: string): void {
    this.logDebug(`>>> [AGENT] sendPrompt called with: "${prompt}"`);

    if (!this.ptyProcess && !this.process) {
      console.error('>>> [AGENT] ERROR: Cannot send prompt: no process running');
      return;
    }

    const mode = this.ptyProcess ? 'node-pty' : 'python-bridge';
    this.logDebug(`>>> [AGENT] Sending via ${mode}, prompt length: ${prompt.length}`);

    try {
      const useTypewrite =
        this.typewriteOverride === '1' ? true : this.typewriteOverride === '0' ? false : !!this.process;
      if (useTypewrite) this.typewrite(prompt);
      else this.sendLine(prompt);
      this.logDebug('>>> [AGENT] sendLine() completed');
    } catch (error) {
      console.error('>>> [AGENT] Failed to write to PTY:', error);
    }
  }

  getStatus(): AgentStatus {
    return this.status;
  }

  stop(): void {
    if (this.ptyProcess) {
      try {
        this.ptyProcess.kill();
      } catch {
        // ignore
      }
      this.ptyProcess = null;
      this.status = 'idle';
    }
    if (this.process) {
      try {
      this.process.kill();
      } catch {
        // ignore
      }
      this.process = null;
      this.status = 'idle';
    }
  }
}
