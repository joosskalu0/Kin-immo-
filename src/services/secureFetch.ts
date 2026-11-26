import { getCandidateApiBaseUrls, setResolvedApiBaseUrl } from '../utils/mediaUrl';

const LEGACY_AUTH_STORAGE_KEYS = [
  'kinimmo_token',
  'kinimmo_jwt_token',
  'kinimmo_auth_token',
  'token',
  'kinimmo_user',
  'kinimmo_admin_session',
  'estatik_local_registered_accounts',
  'kinimmo_stored_accounts',
  'kinimmo_session_user',
];

let inMemoryCsrfToken: string | null = null;
let csrfFetchPromise: Promise<string | null> | null = null;
let refreshPromise: Promise<boolean> | null = null;

export function isEmbeddedIframe(): boolean {
  try {
    return typeof window !== 'undefined' && window.self !== window.top;
  } catch {
    return true;
  }
}

export function purgeLegacyAuthStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    for (const key of LEGACY_AUTH_STORAGE_KEYS) {
      window.localStorage?.removeItem(key);
    }
  } catch {}
}

export function getInMemoryCsrfToken(): string | null {
  return inMemoryCsrfToken;
}

export function setInMemoryCsrfToken(token: string | null): void {
  inMemoryCsrfToken = token || null;
}

export function clearInMemoryAuth(): void {
  inMemoryCsrfToken = null;
  csrfFetchPromise = null;
  refreshPromise = null;
  purgeLegacyAuthStorage();
}

export function buildSecurityHeaders(
  extraHeaders?: HeadersInit,
  options?: { isFormData?: boolean; csrfToken?: string | null }
): Headers {
  const headers = new Headers(extraHeaders || {});
  if (!options?.isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (isEmbeddedIframe()) {
    headers.set('X-Kinimmo-Embedded', '1');
  }
  if (options?.csrfToken) {
    headers.set('X-CSRF-Token', options.csrfToken);
  }
  return headers;
}

export async function ensureCsrfToken(forceRefresh = false): Promise<string | null> {
  if (inMemoryCsrfToken && !forceRefresh) {
    return inMemoryCsrfToken;
  }
  if (csrfFetchPromise && !forceRefresh) {
    return csrfFetchPromise;
  }

  csrfFetchPromise = (async () => {
    const candidates = getCandidateApiBaseUrls();
    for (const baseUrl of candidates) {
      try {
        const res = await fetch(`${baseUrl}/auth/csrf`, {
          method: 'GET',
          credentials: 'include',
          headers: buildSecurityHeaders(undefined, { isFormData: true }),
        });
        const ct = (res.headers.get('content-type') || '').toLowerCase();
        if (ct.includes('text/html')) continue;
        const json = await res.json().catch(() => ({}));
        if (res.ok && json?.csrfToken) {
          inMemoryCsrfToken = String(json.csrfToken);
          setResolvedApiBaseUrl(baseUrl);
          return inMemoryCsrfToken;
        }
      } catch {}
    }
    return null;
  })();

  try {
    return await csrfFetchPromise;
  } finally {
    csrfFetchPromise = null;
  }
}

export async function refreshSessionSingleFlight(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const csrfToken = await ensureCsrfToken();
    const candidates = getCandidateApiBaseUrls();

    for (const baseUrl of candidates) {
      try {
        const res = await fetch(`${baseUrl}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: buildSecurityHeaders(undefined, { csrfToken }),
          body: JSON.stringify({}),
        });
        const ct = (res.headers.get('content-type') || '').toLowerCase();
        if (ct.includes('text/html')) continue;
        const json = await res.json().catch(() => ({}));
        setResolvedApiBaseUrl(baseUrl);
        if (json?.csrfToken) {
          inMemoryCsrfToken = String(json.csrfToken);
        }
        return res.ok && Boolean(json?.success);
      } catch {}
    }
    return false;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

function isMutatingMethod(method?: string): boolean {
  const m = (method || 'GET').toUpperCase();
  return m === 'POST' || m === 'PUT' || m === 'PATCH' || m === 'DELETE';
}

function shouldSkipAutoRefresh(endpoint: string): boolean {
  return /^\/auth\/(login|register|refresh|logout|csrf)/i.test(endpoint);
}

export interface SecureFetchOptions extends RequestInit {
  skipAutoRefresh?: boolean;
}

export async function secureFetch(
  endpoint: string,
  options: SecureFetchOptions = {}
): Promise<Response> {
  const { skipAutoRefresh, ...fetchOptions } = options;
  const method = (fetchOptions.method || 'GET').toUpperCase();
  const isMutation = isMutatingMethod(method);
  const isFormData = typeof FormData !== 'undefined' && fetchOptions.body instanceof FormData;

  let csrfToken = isMutation ? await ensureCsrfToken() : inMemoryCsrfToken;
  const candidates = /^https?:\/\//i.test(endpoint) ? [''] : getCandidateApiBaseUrls();

  let lastError: any = null;
  let lastHtmlResponse: Response | null = null;

  for (const baseUrl of candidates) {
    const targetUrl = baseUrl ? `${baseUrl}${endpoint}` : endpoint;

    const executeRequest = async (overrideCsrf?: string | null) => {
      const headers = buildSecurityHeaders(fetchOptions.headers, {
        isFormData,
        csrfToken: isMutation ? (overrideCsrf ?? csrfToken) : undefined,
      });
      return fetch(targetUrl, {
        ...fetchOptions,
        method,
        headers,
        credentials: 'include',
      });
    };

    try {
      let response = await executeRequest();
      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      if (contentType.includes('text/html')) {
        lastHtmlResponse = response;
        continue;
      }

      if (baseUrl) {
        setResolvedApiBaseUrl(baseUrl);
      }

      // Retry once if CSRF token expired or rotated on server
      if (isMutation && response.status === 403) {
        const cloned = response.clone();
        const body = await cloned.json().catch(() => ({}));
        if (body?.code === 'CSRF_INVALID') {
          csrfToken = await ensureCsrfToken(true);
          if (csrfToken) {
            response = await executeRequest(csrfToken);
          }
        }
      }

      // Single-flight transparent access token refresh via HttpOnly refresh cookie
      if (response.status === 401 && !skipAutoRefresh && !shouldSkipAutoRefresh(endpoint)) {
        const refreshed = await refreshSessionSingleFlight();
        if (refreshed) {
          response = await executeRequest(inMemoryCsrfToken);
        }
      }

      return response;
    } catch (err) {
      lastError = err;
    }
  }

  if (lastHtmlResponse) {
    return lastHtmlResponse;
  }

  throw lastError || new Error('Impossible de joindre le serveur API Kinimmo.');
}
