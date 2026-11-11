'use client';

/** Small fetch helper for the account pages: returns `{ ok, data, error }`. */
export async function api<T = unknown>(
  url: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  body?: unknown,
): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname)}`);
    }
    return res.ok ? { ok: true, data } : { ok: false, error: data.error ?? 'Algo deu errado.' };
  } catch {
    return { ok: false, error: 'Sem conexão. Tente de novo.' };
  }
}

/** Suggests a strong, easy-to-type password like "k7mq-2xwp-h9ra" (~60 bits). */
export function suggestPassword() {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'; // no look-alikes (l/1, o/0, i)
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
  return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}
