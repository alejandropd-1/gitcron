const GITHUB_OWNER_SEGMENT = '[A-Za-z0-9](?:[A-Za-z0-9-]{0,38}[A-Za-z0-9])?';
const GITHUB_REPO_SEGMENT = '[A-Za-z0-9._-]+';

const GITHUB_HTTPS_REMOTE_RE = new RegExp(
  `^https://github\\.com/${GITHUB_OWNER_SEGMENT}/${GITHUB_REPO_SEGMENT}(?:\\.git)?$`,
  'i',
);

const GITHUB_SSH_REMOTE_RE = new RegExp(
  `^git@github\\.com:${GITHUB_OWNER_SEGMENT}/${GITHUB_REPO_SEGMENT}(?:\\.git)?$`,
  'i',
);

export function isValidExistingGitHubRemoteUrl(remoteUrl: string): boolean {
  const trimmed = remoteUrl.trim();
  return GITHUB_HTTPS_REMOTE_RE.test(trimmed) || GITHUB_SSH_REMOTE_RE.test(trimmed);
}
