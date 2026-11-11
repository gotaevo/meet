import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { hashPassword, verifyPassword, DUMMY_HASH } from './password';
import { createInviteCode, createSessionToken, isValidInvite, readSessionToken } from './tokens';
import { memoryKV, setKV } from './store';
import {
  createFirstAdmin,
  createUser,
  getUser,
  isTeamEmail,
  listUsers,
  removeUser,
  setPassword,
  updateUser,
  userForSession,
} from './users';

beforeAll(() => {
  process.env.AUTH_SECRET = 'test-secret-test-secret-test-secret-1234';
});

describe('password hashing', () => {
  it('verifies the right password and rejects others', async () => {
    const hash = await hashPassword('correct horse battery');
    expect(hash.startsWith('scrypt:32768:8:1:')).toBe(true);
    expect(hash).not.toContain('$');
    expect(await verifyPassword('correct horse battery', hash)).toBe(true);
    expect(await verifyPassword('correct horse batterY', hash)).toBe(false);
    expect(await verifyPassword('', hash)).toBe(false);
  });
  it('uses a random salt', async () => {
    expect(await hashPassword('same')).not.toBe(await hashPassword('same'));
  });
  it('rejects malformed hashes and the dummy hash', async () => {
    expect(await verifyPassword('x', 'nope')).toBe(false);
    expect(await verifyPassword('x', DUMMY_HASH)).toBe(false);
  });
});

describe('session tokens', () => {
  it('round-trips a session', async () => {
    const token = await createSessionToken('ana@taevo.com.br', 'Ana');
    expect(await readSessionToken(token)).toMatchObject({ email: 'ana@taevo.com.br', name: 'Ana' });
  });
  it('rejects tampered tokens', async () => {
    const token = await createSessionToken('ana@taevo.com.br', 'Ana');
    const [payload, sig] = token.split('.');
    const forged = btoa(JSON.stringify({ email: 'chefe@taevo.com.br', name: 'X', exp: 9e9 }))
      .replace(/=+$/, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    expect(await readSessionToken(`${forged}.${sig}`)).toBeNull();
    expect(await readSessionToken(`${payload}.${sig.slice(0, -2)}xx`)).toBeNull();
    expect(await readSessionToken(`${payload}`)).toBeNull();
    expect(await readSessionToken(undefined)).toBeNull();
  });
  it('rejects expired sessions', async () => {
    const old = await createSessionToken('ana@taevo.com.br', 'Ana', 1, Date.now() - 31 * 24 * 3600 * 1000);
    expect(await readSessionToken(old)).toBeNull();
  });
  it('rejects tokens signed with another secret', async () => {
    const token = await createSessionToken('ana@taevo.com.br', 'Ana');
    process.env.AUTH_SECRET = 'another-secret-another-secret-another-1';
    expect(await readSessionToken(token)).toBeNull();
    process.env.AUTH_SECRET = 'test-secret-test-secret-test-secret-1234';
  });
});

describe('room invites', () => {
  it('is valid only for its own room', async () => {
    const code = await createInviteCode('abcd-1234');
    expect(code).toHaveLength(22);
    expect(await isValidInvite('abcd-1234', code)).toBe(true);
    expect(await isValidInvite('outra-sala', code)).toBe(false);
    expect(await isValidInvite('abcd-1234', code.replace(/.$/, code.endsWith('A') ? 'B' : 'A'))).toBe(false);
    expect(await isValidInvite('abcd-1234', null)).toBe(false);
  });
});

describe('team accounts', () => {
  beforeEach(() => setKV(memoryKV()));

  it('only accepts @taevo.com.br e-mails', async () => {
    expect(isTeamEmail('ana@taevo.com.br')).toBe(true);
    expect(isTeamEmail('ana@gmail.com')).toBe(false);
    expect(isTeamEmail('ana@taevo.com.br.evil.com')).toBe(false);
    await expect(createUser({ email: 'x@gmail.com', name: 'X', password: 'senha-longa-1', role: 'member' })).rejects.toThrow(
      '@taevo.com.br',
    );
  });

  it('first-run setup works exactly once, and only for the owner e-mail', async () => {
    await expect(
      createFirstAdmin({ email: 'intruso@taevo.com.br', name: 'Intruso', password: 'senha-longa-1' }),
    ).rejects.toThrow('administrador da Taevo');
    const admin = await createFirstAdmin({ email: 'Klismam.Aires@Taevo.com.br', name: 'Klismam', password: 'senha-longa-1' });
    expect(admin).toMatchObject({ email: 'klismam.aires@taevo.com.br', role: 'admin' });
    await expect(
      createFirstAdmin({ email: 'klismam.aires@taevo.com.br', name: 'Outro', password: 'senha-longa-2' }),
    ).rejects.toThrow('já foi feita');
  });

  it('rejects short passwords and duplicates', async () => {
    await expect(createUser({ email: 'a@taevo.com.br', name: 'A', password: 'curta', role: 'member' })).rejects.toThrow(
      '10 caracteres',
    );
    await createUser({ email: 'a@taevo.com.br', name: 'A', password: 'senha-longa-1', role: 'member' });
    await expect(
      createUser({ email: 'A@taevo.com.br', name: 'A2', password: 'senha-longa-1', role: 'member' }),
    ).rejects.toThrow('Já existe');
  });

  it('password change and removal end existing sessions', async () => {
    const u = await createUser({ email: 'b@taevo.com.br', name: 'B', password: 'senha-longa-1', role: 'member' });
    const session = await readSessionToken(await createSessionToken(u.email, u.name, u.v));
    expect(await userForSession(session)).not.toBeNull();
    await setPassword(u.email, 'outra-senha-longa');
    expect(await userForSession(session)).toBeNull();
    const fresh = (await getUser(u.email))!;
    const s2 = await readSessionToken(await createSessionToken(fresh.email, fresh.name, fresh.v));
    expect(await userForSession(s2)).not.toBeNull();
    await removeUser(u.email);
    expect(await userForSession(s2)).toBeNull();
    expect(await listUsers()).toEqual([]);
  });

  it('always keeps at least one administrator', async () => {
    await createUser({ email: 'adm@taevo.com.br', name: 'Adm', password: 'senha-longa-1', role: 'admin' });
    await expect(removeUser('adm@taevo.com.br')).rejects.toThrow('pelo menos um administrador');
    await expect(updateUser('adm@taevo.com.br', { role: 'member' })).rejects.toThrow('pelo menos um administrador');
    await createUser({ email: 'adm2@taevo.com.br', name: 'Adm2', password: 'senha-longa-1', role: 'admin' });
    await removeUser('adm@taevo.com.br');
    expect((await listUsers()).map((u) => u.email)).toEqual(['adm2@taevo.com.br']);
  });
});

describe('auto-generated secret', () => {
  it('creates and reuses a secret in the store when AUTH_SECRET is not set', async () => {
    const kv = memoryKV();
    setKV(kv);
    const saved = process.env.AUTH_SECRET;
    delete process.env.AUTH_SECRET;
    vi.resetModules();
    const t = await import('./tokens');
    const token = await t.createSessionToken('c@taevo.com.br', 'C', 1);
    const secret = await kv.get('auth:secret');
    expect(secret?.length).toBeGreaterThanOrEqual(60);
    expect(await t.readSessionToken(token)).toMatchObject({ email: 'c@taevo.com.br' });
    process.env.AUTH_SECRET = saved;
  });
});
