import { Counterparty, TransactionRule } from '../types/finance.ts';

export interface BackendUserProfile {
  userId?: number;
  fullName: string;
  initialBalance: number;
  startDate: string;
  period: 30 | 60 | 90 | 180;
}

export interface BackendStateResponse {
  profile: BackendUserProfile;
  counterparties: Counterparty[];
  rules: TransactionRule[];
}

// адреса шлюза (через nginx или напрямую в докере)
const getCandidateBaseUrls = (): string[] => {
  const urls = ['/api/v1'];
  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ) {
    urls.push('http://localhost:9800/api/v1');
  }
  return urls;
};

let resolvedBaseUrl: string | null = null;

async function fetchWithGateway(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const reqInit: RequestInit = {
    ...options,
    credentials: 'include',
    headers,
  };

  if (resolvedBaseUrl) {
    const res = await fetch(`${resolvedBaseUrl}${path}`, reqInit);
    return res;
  }

  const candidates = getCandidateBaseUrls();
  let lastError: any = null;

  for (const base of candidates) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${base}${path}`, {
        ...reqInit,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      // если вернулся html вместо json значит бэка нет
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        continue;
      }

      resolvedBaseUrl = base;
      return res;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('BACKEND_UNAVAILABLE');
}

async function parseJsonOrThrow(res: Response) {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    throw new Error('BACKEND_UNAVAILABLE');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error(data.error || data.message || `HTTP Error ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const backendApi = {
  auth: {
    async login(login: string, password: string): Promise<{ login: string; fullName: string }> {
      const res = await fetchWithGateway('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: login, login, password }),
      });
      const data = await parseJsonOrThrow(res);
      const userLogin = data.login || data.email || login;
      const defaultName =
        userLogin.toLowerCase() === 'sarioglo'
          ? 'Сариогло С.Д.'
          : userLogin.toLowerCase() === 'admin'
          ? 'Администратор (Фин. отдел)'
          : userLogin;
      return {
        login: userLogin,
        fullName: data.fullName || defaultName,
      };
    },

    async register(
      login: string,
      password: string,
      fullName: string
    ): Promise<{ login: string; fullName: string }> {
      const res = await fetchWithGateway('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email: login, login, password, fullName }),
      });
      const data = await parseJsonOrThrow(res);
      const userLogin = data.login || data.email || login;
      return {
        login: userLogin,
        fullName: fullName || userLogin,
      };
    },

    async me(): Promise<{ login: string }> {
      const res = await fetchWithGateway('/auth/me', { method: 'GET' });
      const data = await parseJsonOrThrow(res);
      return { login: data.login || data.email };
    },

    async logout(): Promise<void> {
      try {
        await fetchWithGateway('/auth/logout', { method: 'POST' });
      } catch {
        // пофиг если сервер выключен
      }
    },
  },

  state: {
    async get(): Promise<BackendStateResponse> {
      const res = await fetchWithGateway('/state', { method: 'GET' });
      return parseJsonOrThrow(res);
    },

    async updateProfile(profile: BackendUserProfile): Promise<BackendUserProfile> {
      const res = await fetchWithGateway('/profile', {
        method: 'PUT',
        body: JSON.stringify(profile),
      });
      return parseJsonOrThrow(res);
    },

    async resetDemoData(): Promise<BackendStateResponse> {
      const res = await fetchWithGateway('/demo-reset', { method: 'POST' });
      return parseJsonOrThrow(res);
    },

    async importPayload(payload: {
      rules?: Omit<TransactionRule, 'id'>[];
      counterparties?: Omit<Counterparty, 'id'>[];
    }): Promise<BackendStateResponse> {
      const res = await fetchWithGateway('/import', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return parseJsonOrThrow(res);
    },
  },

  rules: {
    async create(rule: Omit<TransactionRule, 'id'>): Promise<TransactionRule> {
      const res = await fetchWithGateway('/rules', {
        method: 'POST',
        body: JSON.stringify(rule),
      });
      return parseJsonOrThrow(res);
    },

    async update(rule: TransactionRule): Promise<TransactionRule> {
      const res = await fetchWithGateway(`/rules?id=${encodeURIComponent(rule.id)}`, {
        method: 'PUT',
        body: JSON.stringify(rule),
      });
      return parseJsonOrThrow(res);
    },

    async delete(id: string): Promise<void> {
      const res = await fetchWithGateway(`/rules?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      await parseJsonOrThrow(res);
    },
  },

  counterparties: {
    async create(cp: Omit<Counterparty, 'id'>): Promise<Counterparty> {
      const res = await fetchWithGateway('/counterparties', {
        method: 'POST',
        body: JSON.stringify(cp),
      });
      return parseJsonOrThrow(res);
    },

    async update(cp: Counterparty): Promise<Counterparty> {
      const res = await fetchWithGateway(`/counterparties?id=${encodeURIComponent(cp.id)}`, {
        method: 'PUT',
        body: JSON.stringify(cp),
      });
      return parseJsonOrThrow(res);
    },

    async delete(id: string): Promise<void> {
      const res = await fetchWithGateway(`/counterparties?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      await parseJsonOrThrow(res);
    },
  },
};
