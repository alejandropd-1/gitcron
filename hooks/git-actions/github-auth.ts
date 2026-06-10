'use client';

// GitHub auth actions: conexión por token, OAuth device flow y bootstrap del
// token persistido (safeStorage). Sub-hook de useGitActions — no usar directo.

import { useGitStore } from '@/lib/git-store';

export const useGitHubAuthActions = () => {
  const {
    setLoading,
    setError,
    setGithubToken,
    setGithubUser,
  } = useGitStore();

  const connectGitHub = async (token: string) => {
    if (!window.api) return { success: false, error: 'Electron API no disponible' };
    setLoading(true); setError(null);
    try {
      const result = await window.api.githubAuth(token);
      if (result.success && result.data) {
        setGithubToken(token);
        setGithubUser(result.data);
        // Persist encrypted via OS keychain (safeStorage)
        await window.api.storageSet('githubToken', token);
        return { success: true };
      } else {
        setError(result.error ?? 'Token de GitHub inválido');
        return { success: false, error: result.error };
      }
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally { setLoading(false); }
  };

  const disconnectGitHub = async () => {
    setGithubToken(null);
    setGithubUser(null);
    if (window.api) {
      await window.api.storageDelete('githubToken').catch(() => {});
    }
  };

  /** Loads token from encrypted storage on app mount. */
  const bootstrapGitHub = async () => {
    if (!window.api) return;
    const r = await window.api.storageGet('githubToken');
    if (r.success && r.data) {
      setGithubToken(r.data);
      // Validate token + fetch user
      const userResult = await window.api.githubAuth(r.data);
      if (userResult.success && userResult.data) {
        setGithubUser(userResult.data);
      } else {
        // Only clean up the token if we are sure it was revoked/expired (401)
        if (userResult.isAuthError) {
          await window.api.storageDelete('githubToken').catch(() => {});
          setGithubToken(null);
        } else {
          console.warn('Temporary network/server error while validating GitHub token on startup:', userResult.error);
        }
      }
    }
  };

  /**
   * GitHub OAuth Device Flow.
   * Calls onCode(userCode, verificationUri) so the UI can show the code and
   * open the browser. Polls until the user authorizes or the code expires.
   * The resulting access token is persisted via OS keychain (safeStorage).
   */
  const loginWithGitHubDevice = async (
    onCode: (info: { userCode: string; verificationUri: string }) => void,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!window.api) return { success: false, error: 'Electron API no disponible' };
    setError(null);

    const start = await window.api.githubDeviceStart();
    if (!start.success || !start.data) {
      const msg = start.error ?? 'No se pudo iniciar el login con GitHub';
      setError(msg);
      return { success: false, error: msg };
    }

    const { deviceCode, userCode, verificationUri, expiresIn, interval } = start.data;
    onCode({ userCode, verificationUri });

    // Open browser to the verification URL
    if (window.api.shellOpenPath) {
      window.api.shellOpenPath(verificationUri);
    }

    const deadline = Date.now() + expiresIn * 1000;
    let pollInterval = Math.max(interval, 5) * 1000;
    let transientPollFailures = 0;

    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, pollInterval));
      const poll = await window.api.githubDevicePoll(deviceCode);
      if (poll.success && poll.data?.accessToken) {
        const token = poll.data.accessToken;
        // Now fetch user info
        const userResult = await window.api.githubAuth(token);
        if (userResult.success && userResult.data) {
          setGithubToken(token);
          setGithubUser(userResult.data);
          // Persist encrypted via OS keychain
          await window.api.storageSet('githubToken', token);
          return { success: true };
        }
        return { success: false, error: 'Token obtenido pero no se pudo leer el usuario' };
      }
      const isTransientNetworkError = !!poll.error && /fetch failed|network|timed out|ECONN|ENOTFOUND|EAI_AGAIN/i.test(poll.error);
      if (isTransientNetworkError) {
        transientPollFailures += 1;
        if (transientPollFailures >= 3) {
          const msg = `Login fallido por red: ${poll.error}`;
          setError(msg);
          return { success: false, error: msg };
        }
        continue;
      }
      transientPollFailures = 0;
      // Slow down if requested
      if (poll.error === 'slow_down') pollInterval += 5000;
      // Stop on permanent failures
      if (poll.error && !poll.data?.pending) {
        const msg = `Login cancelado o expirado: ${poll.error}`;
        setError(msg);
        return { success: false, error: msg };
      }
    }
    const msg = 'El código expiró antes de autorizar. Probá de nuevo.';
    setError(msg);
    return { success: false, error: msg };
  };

  return {
    connectGitHub,
    disconnectGitHub,
    bootstrapGitHub,
    loginWithGitHubDevice,
  };
};
