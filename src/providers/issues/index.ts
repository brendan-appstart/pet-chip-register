/**
 * Files public feature suggestions as issues in an external tracker, without the
 * submitter needing any account. The default GitHub adapter posts via a
 * server-side token; if no token is configured the tracker is disabled and
 * callers degrade gracefully. The interface keeps the tracker swappable.
 */
export interface IssueSubmission {
  title: string;
  body: string;
  labels?: string[];
}

export interface IssueTracker {
  readonly name: string;
  readonly enabled: boolean;
  createIssue(input: IssueSubmission): Promise<{ url: string }>;
}

export function createNoopIssueTracker(): IssueTracker {
  return {
    name: 'noop',
    enabled: false,
    async createIssue() {
      throw new Error('Issue tracker is not configured (no GITHUB_ISSUE_TOKEN).');
    },
  };
}

export function createGitHubIssueTracker(opts: { token: string; repo: string }): IssueTracker {
  return {
    name: 'github',
    enabled: true,
    async createIssue(input) {
      const res = await fetch(`https://api.github.com/repos/${opts.repo}/issues`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${opts.token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
          'User-Agent': 'open-pet-registry-suggestions',
        },
        body: JSON.stringify({ title: input.title, body: input.body, labels: input.labels }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`GitHub issue create failed: ${res.status} ${detail.slice(0, 200)}`);
      }
      const json = (await res.json()) as { html_url?: string };
      return { url: json.html_url ?? `https://github.com/${opts.repo}/issues` };
    },
  };
}
