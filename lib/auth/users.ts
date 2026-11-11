import { hashPassword } from './password';
import { getKV } from './store';
import { ALLOWED_DOMAIN, Session } from './tokens';

/**
 * Team accounts, kept in the account store (Upstash Redis in production).
 * Only @taevo.com.br e-mails. Passwords are stored only as scrypt hashes.
 */
export type Role = 'admin' | 'member';

export interface TeamUser {
  email: string;
  name: string;
  hash: string;
  role: Role;
  /** bumped on password change / role change, which ends existing sessions */
  v: number;
  createdAt: number;
}

export type PublicUser = Omit<TeamUser, 'hash' | 'v'>;

export const MIN_PASSWORD = 10;
const USERS_SET = 'users';
const userKey = (email: string) => `user:${email}`;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isTeamEmail(email: string) {
  const e = normalizeEmail(email);
  return /^[^\s@]+@taevo\.com\.br$/.test(e) && e.endsWith(ALLOWED_DOMAIN);
}

export function toPublic(u: TeamUser): PublicUser {
  return { email: u.email, name: u.name, role: u.role, createdAt: u.createdAt };
}

export class AccountError extends Error {}

function validate(email: string, name: string, password?: string) {
  if (!isTeamEmail(email)) throw new AccountError('Use um e-mail @taevo.com.br.');
  if (!name.trim() || name.trim().length > 64) throw new AccountError('Informe um nome (até 64 letras).');
  if (password !== undefined && password.length < MIN_PASSWORD) {
    throw new AccountError(`A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`);
  }
  if (password !== undefined && password.length > 256) throw new AccountError('Senha longa demais.');
}

export async function getUser(email: string): Promise<TeamUser | null> {
  const raw = await getKV().get(userKey(normalizeEmail(email)));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TeamUser;
  } catch {
    return null;
  }
}

async function save(user: TeamUser) {
  const kv = getKV();
  await kv.set(userKey(user.email), JSON.stringify(user));
  await kv.sadd(USERS_SET, user.email);
}

export async function listUsers(): Promise<TeamUser[]> {
  const emails = await getKV().smembers(USERS_SET);
  const users = await Promise.all(emails.map(getUser));
  return users
    .filter((u): u is TeamUser => !!u)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export async function hasAnyUser() {
  return (await getKV().smembers(USERS_SET)).length > 0;
}

export async function createUser(input: { email: string; name: string; password: string; role: Role }) {
  const email = normalizeEmail(input.email);
  validate(email, input.name, input.password);
  if (await getUser(email)) throw new AccountError('Já existe uma conta com esse e-mail.');
  const user: TeamUser = {
    email,
    name: input.name.trim(),
    hash: await hashPassword(input.password),
    role: input.role,
    v: 1,
    createdAt: Date.now(),
  };
  await save(user);
  return user;
}

/** The only e-mail allowed to create the very first (administrator) account. */
export const FIRST_ADMIN_EMAIL = 'klismam.aires@taevo.com.br';

/**
 * First-run setup: creates the first administrator. Works only once, only while
 * there is no account yet (guarded by an atomic SET NX lock), and only for
 * FIRST_ADMIN_EMAIL — so nobody else can claim the site before the owner does.
 */
export async function createFirstAdmin(input: { email: string; name: string; password: string }) {
  validate(normalizeEmail(input.email), input.name, input.password);
  if (normalizeEmail(input.email) !== FIRST_ADMIN_EMAIL) {
    throw new AccountError('A primeira conta só pode ser criada pelo administrador da Taevo.');
  }
  if (await hasAnyUser()) throw new AccountError('A configuração inicial já foi feita.');
  const won = await getKV().set('auth:setup', String(Date.now()), { nx: true });
  if (!won) throw new AccountError('A configuração inicial já foi feita.');
  return createUser({ ...input, role: 'admin' });
}

export async function setPassword(email: string, password: string) {
  const user = await getUser(email);
  if (!user) throw new AccountError('Conta não encontrada.');
  validate(user.email, user.name, password);
  await save({ ...user, hash: await hashPassword(password), v: user.v + 1 });
}

export async function updateUser(email: string, changes: { name?: string; role?: Role }) {
  const user = await getUser(email);
  if (!user) throw new AccountError('Conta não encontrada.');
  const next = { ...user, ...('name' in changes && changes.name ? { name: changes.name.trim() } : {}) };
  if (changes.role && changes.role !== user.role) {
    if (user.role === 'admin' && changes.role !== 'admin') await assertAnotherAdmin(user.email);
    next.role = changes.role;
    next.v = user.v + 1;
  }
  validate(next.email, next.name);
  await save(next);
  return next;
}

export async function removeUser(email: string) {
  const user = await getUser(email);
  if (!user) return;
  if (user.role === 'admin') await assertAnotherAdmin(user.email);
  const kv = getKV();
  await kv.del(userKey(user.email));
  await kv.srem(USERS_SET, user.email);
}

async function assertAnotherAdmin(email: string) {
  const admins = (await listUsers()).filter((u) => u.role === 'admin' && u.email !== email);
  if (admins.length === 0) throw new AccountError('A equipe precisa ter pelo menos um administrador.');
}

/** The account behind a session, or null if it was removed / its password changed. */
export async function userForSession(session: Session | null) {
  if (!session) return null;
  const user = await getUser(session.email);
  return user && user.v === session.v ? user : null;
}
