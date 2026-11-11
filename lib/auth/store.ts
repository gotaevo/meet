/**
 * Tiny key-value store for accounts. In production: Upstash Redis through its REST
 * API (plain fetch, so it also works in middleware). The Vercel ↔ Upstash
 * integration injects KV_REST_API_URL / KV_REST_API_TOKEN automatically.
 * Without those variables (local development, tests) it falls back to memory.
 */
export interface KV {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, opts?: { nx?: boolean }): Promise<boolean>;
  del(key: string): Promise<void>;
  sadd(key: string, member: string): Promise<void>;
  srem(key: string, member: string): Promise<void>;
  smembers(key: string): Promise<string[]>;
}

function upstash(url: string, token: string): KV {
  const call = async <T>(...command: (string | number)[]): Promise<T> => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
      cache: 'no-store',
    });
    const data = (await res.json().catch(() => ({}))) as { result?: T; error?: string };
    if (!res.ok || data.error) throw new Error(`Upstash: ${data.error ?? res.status}`);
    return data.result as T;
  };
  return {
    get: (k) => call<string | null>('GET', k),
    set: async (k, v, o) => (await call<string | null>('SET', k, v, ...(o?.nx ? ['NX'] : []))) === 'OK',
    del: async (k) => void (await call('DEL', k)),
    sadd: async (k, m) => void (await call('SADD', k, m)),
    srem: async (k, m) => void (await call('SREM', k, m)),
    smembers: (k) => call<string[]>('SMEMBERS', k),
  };
}

export function memoryKV(): KV {
  const strings = new Map<string, string>();
  const sets = new Map<string, Set<string>>();
  return {
    get: async (k) => strings.get(k) ?? null,
    set: async (k, v, o) => {
      if (o?.nx && strings.has(k)) return false;
      strings.set(k, v);
      return true;
    },
    del: async (k) => {
      strings.delete(k);
      sets.delete(k);
    },
    sadd: async (k, m) => {
      if (!sets.has(k)) sets.set(k, new Set());
      sets.get(k)!.add(m);
    },
    srem: async (k, m) => {
      sets.get(k)?.delete(m);
    },
    smembers: async (k) => [...(sets.get(k) ?? [])],
  };
}

const g = globalThis as unknown as { __taevoKV?: KV };

/** Accepts the names the Vercel integration creates with the "KV" or default "STORAGE" prefix. */
function restCredentials() {
  const env = process.env;
  const url = env.KV_REST_API_URL ?? env.STORAGE_REST_API_URL ?? env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN ?? env.STORAGE_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

export function hasPersistentStore() {
  return !!restCredentials();
}

export function getKV(): KV {
  if (g.__taevoKV) return g.__taevoKV;
  const { url, token } = restCredentials() ?? {};
  if (url && token) {
    g.__taevoKV = upstash(url, token);
  } else {
    if (process.env.NODE_ENV === 'production' && process.env.VERCEL) {
      throw new Error('Banco de contas não configurado: conecte o Upstash Redis ao projeto na Vercel.');
    }
    g.__taevoKV = memoryKV();
  }
  return g.__taevoKV;
}

/** For tests. */
export function setKV(kv: KV | undefined) {
  g.__taevoKV = kv;
}
