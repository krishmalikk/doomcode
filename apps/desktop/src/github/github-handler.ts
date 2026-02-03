import { execSync } from 'child_process';
import type {
  GitHubTokenShareMessage,
  PRCreateRequestMessage,
  PRCreateResultMessage,
} from '@doomcode/protocol';

interface GitHubCredentials {
  accessToken: string;
  tokenType: string;
  scope: string;
  expiresAt?: number;
}

export class GitHubHandler {
  private workingDirectory: string;
  private credentials: GitHubCredentials | null = null;

  constructor(workingDirectory: string) {
    this.workingDirectory = workingDirectory;
  }

  handleTokenShare(msg: GitHubTokenShareMessage): void {
    this.credentials = {
      accessToken: msg.accessToken,
      tokenType: msg.tokenType,
      scope: msg.scope,
      expiresAt: msg.expiresAt,
    };
    console.log('[GitHub] Token received from mobile');
  }

  handleTokenRevoke(): void {
    this.credentials = null;
    console.log('[GitHub] Token revoked');
  }

  hasToken(): boolean {
    if (!this.credentials) return false;
    if (this.credentials.expiresAt && Date.now() > this.credentials.expiresAt) {
      this.credentials = null;
      return false;
    }
    return true;
  }

  async createPullRequest(request: PRCreateRequestMessage): Promise<PRCreateResultMessage> {
    const result: PRCreateResultMessage = {
      type: 'pr_create_result',
      requestId: request.requestId,
      success: false,
    };

    if (!this.hasToken()) {
      result.error = 'No GitHub token available. Please share your token from the mobile app.';
      result.errorCode = 'NO_TOKEN';
      return result;
    }

    try {
      // Check if we're in a git repo
      if (!this.isGitRepo()) {
        result.error = 'Not a git repository';
        result.errorCode = 'NOT_GIT_REPO';
        return result;
      }

      // Check for uncommitted changes
      const status = this.execGit('status --porcelain');
      if (!status.trim()) {
        result.error = 'No changes to commit. Make some changes first.';
        result.errorCode = 'NO_CHANGES';
        return result;
      }

      // Get current branch and base branch
      const currentBranch = this.execGit('rev-parse --abbrev-ref HEAD').trim();
      const baseBranch = request.baseBranch || this.getDefaultBranch();

      // Check if target branch already exists
      if (this.branchExists(request.branchName)) {
        result.error = `Branch '${request.branchName}' already exists`;
        result.errorCode = 'BRANCH_EXISTS';
        return result;
      }

      // Get remote info
      const remote = this.getGitHubRemote();
      if (!remote) {
        result.error = 'No GitHub remote found';
        result.errorCode = 'NO_REMOTE';
        return result;
      }

      console.log(`[GitHub] Creating PR: ${request.title}`);
      console.log(`[GitHub] Branch: ${request.branchName} -> ${baseBranch}`);

      // Create and checkout new branch
      console.log(`[GitHub] Creating branch: ${request.branchName}`);
      this.execGit(`checkout -b ${this.escapeShellArg(request.branchName)}`);

      // Stage all changes
      this.execGit('add -A');

      // Commit with message
      const commitMessage = `${request.title}\n\n${request.body || 'Created via DoomCode'}`;
      this.execGit(`commit -m ${this.escapeShellArg(commitMessage)}`);

      // Push with token authentication
      console.log('[GitHub] Pushing to remote...');
      const pushResult = await this.pushWithToken(request.branchName, remote);

      if (!pushResult.success) {
        // Cleanup: go back to original branch and delete the new one
        try {
          this.execGit(`checkout ${this.escapeShellArg(currentBranch)}`);
          this.execGit(`branch -D ${this.escapeShellArg(request.branchName)}`);
        } catch {
          // Ignore cleanup errors
        }

        result.error = pushResult.error || 'Failed to push to remote';
        result.errorCode = 'PUSH_FAILED';
        return result;
      }

      // Create PR via GitHub API
      console.log('[GitHub] Creating pull request via API...');
      const prResult = await this.createPRViaAPI({
        owner: remote.owner,
        repo: remote.repo,
        title: request.title,
        body: request.body || 'Created via DoomCode',
        head: request.branchName,
        base: baseBranch,
        draft: request.draft,
      });

      if (!prResult.success) {
        result.error = prResult.error || 'Failed to create pull request';
        result.errorCode = 'PR_CREATE_FAILED';
        return result;
      }

      result.success = true;
      result.prUrl = prResult.url;
      result.prNumber = prResult.number;

      console.log(`[GitHub] PR created successfully: ${result.prUrl}`);
      return result;
    } catch (error) {
      console.error('[GitHub] Error creating PR:', error);
      result.error = error instanceof Error ? error.message : 'Unknown error';
      return result;
    }
  }

  private isGitRepo(): boolean {
    try {
      this.execGit('rev-parse --is-inside-work-tree');
      return true;
    } catch {
      return false;
    }
  }

  private execGit(command: string): string {
    return execSync(`git ${command}`, {
      cwd: this.workingDirectory,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  }

  private getDefaultBranch(): string {
    try {
      // Try to get default branch from remote
      const result = this.execGit('symbolic-ref refs/remotes/origin/HEAD 2>/dev/null || echo ""');
      const ref = result.trim();
      if (ref) {
        return ref.replace('refs/remotes/origin/', '');
      }
    } catch {
      // Ignore
    }

    // Fallback: check if main or master exists
    try {
      this.execGit('rev-parse --verify main 2>/dev/null');
      return 'main';
    } catch {
      // Ignore
    }

    try {
      this.execGit('rev-parse --verify master 2>/dev/null');
      return 'master';
    } catch {
      // Ignore
    }

    return 'main';
  }

  private branchExists(branchName: string): boolean {
    try {
      this.execGit(`rev-parse --verify ${this.escapeShellArg(branchName)} 2>/dev/null`);
      return true;
    } catch {
      return false;
    }
  }

  private getGitHubRemote(): { owner: string; repo: string } | null {
    try {
      const remoteUrl = this.execGit('remote get-url origin').trim();
      // Match both HTTPS and SSH URLs
      // https://github.com/owner/repo.git
      // git@github.com:owner/repo.git
      const match = remoteUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)/);

      if (match) {
        return {
          owner: match[1],
          repo: match[2].replace(/\.git$/, ''),
        };
      }
    } catch {
      // Ignore
    }
    return null;
  }

  private async pushWithToken(
    branchName: string,
    remote: { owner: string; repo: string }
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.credentials) {
      return { success: false, error: 'No token' };
    }

    try {
      // Build authenticated URL
      const authUrl = `https://x-access-token:${this.credentials.accessToken}@github.com/${remote.owner}/${remote.repo}.git`;

      // Push using authenticated URL (don't save to remote config)
      execSync(
        `git push ${this.escapeShellArg(authUrl)} ${this.escapeShellArg(branchName)}:${this.escapeShellArg(branchName)}`,
        {
          cwd: this.workingDirectory,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
        }
      );

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Push failed';
      // Don't leak the token in error messages
      const sanitizedMessage = message.replace(/x-access-token:[^@]+@/g, 'x-access-token:***@');
      return { success: false, error: sanitizedMessage };
    }
  }

  private async createPRViaAPI(params: {
    owner: string;
    repo: string;
    title: string;
    body: string;
    head: string;
    base: string;
    draft?: boolean;
  }): Promise<{ success: boolean; url?: string; number?: number; error?: string }> {
    if (!this.credentials) {
      return { success: false, error: 'No token' };
    }

    try {
      const response = await fetch(
        `https://api.github.com/repos/${params.owner}/${params.repo}/pulls`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.credentials.accessToken}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'DoomCode-Desktop',
          },
          body: JSON.stringify({
            title: params.title,
            body: params.body,
            head: params.head,
            base: params.base,
            draft: params.draft || false,
          }),
        }
      );

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as {
          message?: string;
          errors?: Array<{ message?: string }>;
        };
        const message =
          errorData.message ||
          errorData.errors?.[0]?.message ||
          `HTTP ${response.status}`;
        return { success: false, error: message };
      }

      const data = (await response.json()) as { html_url: string; number: number };
      return {
        success: true,
        url: data.html_url,
        number: data.number,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'API call failed',
      };
    }
  }

  private escapeShellArg(arg: string): string {
    // Escape single quotes and wrap in single quotes
    return `'${arg.replace(/'/g, "'\\''")}'`;
  }

  // Called when session ends to clear credentials
  clearCredentials(): void {
    this.credentials = null;
  }
}
