'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { displayFont } from '@/lib/fonts';
import { api, suggestPassword } from '@/lib/auth/client';
import type { PublicUser } from '@/lib/auth/users';
import styles from '../../styles/Account.module.css';

export function TeamManager({ me, initialUsers }: { me: string; initialUsers: PublicUser[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [form, setForm] = useState({ name: '', email: '', password: suggestPassword(), admin: false });
  const [error, setError] = useState<string>();
  const [created, setCreated] = useState<{ email: string; password: string }>();
  const [busy, setBusy] = useState(false);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    setCreated(undefined);
    const r = await api<{ user: PublicUser }>('/api/team', 'POST', form);
    setBusy(false);
    if (!r.ok || !r.data) return setError(r.error);
    setUsers((u) => [...u, r.data!.user].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
    setCreated({ email: r.data.user.email, password: form.password });
    setForm({ name: '', email: '', password: suggestPassword(), admin: false });
  };

  return (
    <main className={styles.page} data-lk-theme="default">
      <div className={styles.wrap}>
        <div className={styles.top}>
          <img src="/images/logo.svg" alt="Taevo Meet" width="133" height="36" />
          <Link href="/" className={styles.back}>
            ← Voltar para o início
          </Link>
        </div>
        <h1 className={`${styles.title} ${displayFont.className}`}>Equipe</h1>
        <p className={styles.lead}>Quem pode entrar no Taevo Meet e criar reuniões.</p>

        <form className={`${styles.card} ${styles.form}`} onSubmit={add}>
          <h2>Adicionar pessoa</h2>
          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="new-name">Nome</label>
              <input
                id="new-name"
                className={styles.input}
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="new-email">E-mail</label>
              <input
                id="new-email"
                type="email"
                className={styles.input}
                placeholder="nome@taevo.com.br"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>
          <div className={styles.field}>
            <label htmlFor="new-password">Senha inicial</label>
            <div className={styles.actions}>
              <input
                id="new-password"
                className={styles.input}
                style={{ flex: '1 1 220px' }}
                required
                minLength={10}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button
                type="button"
                className={styles.secondary}
                onClick={() => setForm({ ...form, password: suggestPassword() })}
              >
                Gerar outra
              </button>
            </div>
            <p className={styles.hint}>Envie para a pessoa. Ela pode trocar depois em “Minha conta”.</p>
          </div>
          <label className={styles.check}>
            <input type="checkbox" checked={form.admin} onChange={(e) => setForm({ ...form, admin: e.target.checked })} />
            Administrador (pode adicionar e remover pessoas)
          </label>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          {created && (
            <p className={styles.success} role="status">
              Conta criada. Envie para a pessoa: e-mail <strong>{created.email}</strong> e senha{' '}
              <strong>{created.password}</strong>
            </p>
          )}
          <div className={styles.actions}>
            <button type="submit" className={styles.primary} disabled={busy}>
              {busy ? 'Adicionando…' : 'Adicionar'}
            </button>
          </div>
        </form>

        <section className={styles.card} aria-labelledby="people-title">
          <h2 id="people-title">Pessoas · {users.length}</h2>
          <ul className={styles.list}>
            {users.map((u) => (
              <Person
                key={u.email}
                user={u}
                isMe={u.email === me}
                onChange={(next) => setUsers((list) => list.map((x) => (x.email === next.email ? next : x)))}
                onRemove={() => setUsers((list) => list.filter((x) => x.email !== u.email))}
              />
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}

function Person({
  user,
  isMe,
  onChange,
  onRemove,
}: {
  user: PublicUser;
  isMe: boolean;
  onChange: (u: PublicUser) => void;
  onRemove: () => void;
}) {
  const [mode, setMode] = useState<'idle' | 'password' | 'remove'>('idle');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<{ error?: string; ok?: string }>({});
  const [busy, setBusy] = useState(false);
  const path = `/api/team/${encodeURIComponent(user.email)}`;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMsg({});
    await fn();
    setBusy(false);
  };

  return (
    <li className={styles.person}>
      <span className={`${styles.avatar} ${displayFont.className}`} aria-hidden="true">
        {user.name.trim()[0]?.toUpperCase()}
      </span>
      <span className={styles.who}>
        <strong>
          {user.name}
          {isMe && ' (você)'}
        </strong>
        <span>{user.email}</span>
      </span>
      {user.role === 'admin' && <span className={styles.badge}>Administrador</span>}
      {!isMe && mode === 'idle' && (
        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.secondary} ${styles.small}`}
            disabled={busy}
            onClick={() =>
              run(async () => {
                const r = await api<{ user: PublicUser }>(path, 'PATCH', { admin: user.role !== 'admin' });
                if (r.ok && r.data) onChange(r.data.user);
                else setMsg({ error: r.error });
              })
            }
          >
            {user.role === 'admin' ? 'Tirar admin' : 'Tornar admin'}
          </button>
          <button
            type="button"
            className={`${styles.secondary} ${styles.small}`}
            onClick={() => {
              setPassword(suggestPassword());
              setMode('password');
            }}
          >
            Trocar senha
          </button>
          <button type="button" className={`${styles.danger} ${styles.small}`} onClick={() => setMode('remove')}>
            Remover
          </button>
        </div>
      )}

      {mode === 'password' && (
        <div className={styles.inline}>
          <label htmlFor={`pw-${user.email}`} className={styles.label} style={{ width: '100%' }}>
            Nova senha para {user.name}
          </label>
          <input
            id={`pw-${user.email}`}
            className={styles.input}
            value={password}
            minLength={10}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            className={`${styles.primary} ${styles.small}`}
            disabled={busy}
            onClick={() =>
              run(async () => {
                const r = await api(path, 'PATCH', { password });
                if (r.ok) {
                  setMsg({ ok: `Senha trocada. Envie a nova senha para ${user.name}: ${password}` });
                  setMode('idle');
                } else setMsg({ error: r.error });
              })
            }
          >
            Salvar
          </button>
          <button type="button" className={`${styles.secondary} ${styles.small}`} onClick={() => setMode('idle')}>
            Cancelar
          </button>
        </div>
      )}

      {mode === 'remove' && (
        <div className={styles.inline}>
          <span className={styles.hint} style={{ width: '100%' }}>
            Remover {user.name}? A pessoa perde o acesso na hora.
          </span>
          <button
            type="button"
            className={`${styles.danger} ${styles.small}`}
            disabled={busy}
            onClick={() =>
              run(async () => {
                const r = await api(path, 'DELETE');
                if (r.ok) onRemove();
                else {
                  setMsg({ error: r.error });
                  setMode('idle');
                }
              })
            }
          >
            Sim, remover
          </button>
          <button type="button" className={`${styles.secondary} ${styles.small}`} onClick={() => setMode('idle')}>
            Cancelar
          </button>
        </div>
      )}

      {(msg.error || msg.ok) && (
        <p className={msg.error ? styles.error : styles.success} style={{ width: '100%', paddingLeft: 54 }} role="status">
          {msg.error ?? msg.ok}
        </p>
      )}
    </li>
  );
}
