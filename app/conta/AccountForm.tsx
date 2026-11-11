'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { displayFont } from '@/lib/fonts';
import { api } from '@/lib/auth/client';
import styles from '../../styles/Account.module.css';

export function AccountForm({ name, email }: { name: string; email: string }) {
  const [form, setForm] = useState({ current: '', password: '', confirm: '' });
  const [msg, setMsg] = useState<{ error?: string; ok?: string }>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) return setMsg({ error: 'As senhas novas não conferem.' });
    setBusy(true);
    setMsg({});
    const r = await api('/api/account/password', 'POST', { current: form.current, password: form.password });
    setBusy(false);
    if (r.ok) {
      setForm({ current: '', password: '', confirm: '' });
      setMsg({ ok: 'Senha trocada. Outros aparelhos onde você estava logado foram desconectados.' });
    } else setMsg({ error: r.error });
  };

  return (
    <main className={styles.page} data-lk-theme="default">
      <div className={`${styles.wrap} ${styles.narrow}`}>
        <div className={styles.top}>
          <img src="/images/logo.svg" alt="Taevo Meet" width="133" height="36" />
          <Link href="/" className={styles.back}>
            ← Voltar
          </Link>
        </div>
        <h1 className={`${styles.title} ${displayFont.className}`}>Minha conta</h1>
        <p className={styles.lead}>
          {name} · {email}
        </p>
        <form className={`${styles.card} ${styles.form}`} onSubmit={submit}>
          <h2>Trocar senha</h2>
          <input type="text" autoComplete="username" value={email} readOnly hidden />
          <div className={styles.field}>
            <label htmlFor="current">Senha atual</label>
            <input
              id="current"
              type="password"
              autoComplete="current-password"
              className={styles.input}
              required
              value={form.current}
              onChange={set('current')}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="password">Nova senha (mínimo 10 caracteres)</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              className={styles.input}
              required
              minLength={10}
              value={form.password}
              onChange={set('password')}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="confirm">Repita a nova senha</label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              className={styles.input}
              required
              value={form.confirm}
              onChange={set('confirm')}
            />
          </div>
          {msg.error && (
            <p className={styles.error} role="alert">
              {msg.error}
            </p>
          )}
          {msg.ok && (
            <p className={styles.success} role="status">
              {msg.ok}
            </p>
          )}
          <button type="submit" className={styles.primary} disabled={busy}>
            {busy ? 'Salvando…' : 'Salvar nova senha'}
          </button>
        </form>
      </div>
    </main>
  );
}
