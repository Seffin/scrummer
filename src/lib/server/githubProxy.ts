const GITHUB_API_BASE = 'https://api.github.com';

export async function githubProxyFetch(path: string, githubToken: string, init: RequestInit = {}) {
  const response = await fetch(`${GITHUB_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  const responseText = await response.text();
  const data = responseText ? JSON.parse(responseText) : null;

  return { response, data };
}
