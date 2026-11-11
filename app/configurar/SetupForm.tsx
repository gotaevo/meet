'use client';

import React, { useState } from 'react';
import { displayFont } from '@/lib/fonts';
import { api } from '@/lib/auth/client';
import styles from '../../styles/Account.module.css';

export function SetupForm() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) return setError('As senhas não conferem.');
    setBusy(true);
    setError(undefined);
    const r = await api('/api/auth/setup', 'POST', form);
    if (r.ok) window.location.assign('/equipe');
    else {
      setError(r.error);
      setBusy(false);
    }
  };

  return (
    <main className={styles.page} data-lk-theme="default">
      <div className={`${styles.wrap} ${styles.narrow}`}>
        <div className={styles.top}>
          <img src="/images/logo.svg" alt="Taevo Meet" width="133" height="36" />
        </div>
        <h1 className={`${styles.title} ${displayFont.className}`}>Bem-vindo! Crie a sua conta.</h1>
        <p className={styles.lead}>
          Esta é a primeira vez que o Taevo Meet é aberto. A conta criada agora será a de
          administrador: com ela você adiciona o resto da equipe.
        </p>
        <form className={`${styles.card} ${styles.form}`} onSubmit={submit}>
          <div className={styles.field}>
            <label htmlFor="name">Seu nome</label>
            <input id="name" className={styles.input} required value={form.name} onChange={set('name')} />
          </div>
          <div className={styles.field}>
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              className={styles.input}
              placeholder="voce@taevo.com.br"
              required
              value={form.email}
              onChange={set('email')}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="password">Senha (mínimo 10 caracteres)</label>
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
            <label htmlFor="confirm">Repita a senha</label>
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
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <button type="submit" className={styles.primary} disabled={busy}>
            {busy ? 'Criando…' : 'Criar conta de administrador'}
          </button>
        </form>
      </div>
    </main>
  );
}
