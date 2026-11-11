'use client';

import React, { useState } from 'react';
import { displayFont } from '@/lib/fonts';
import styles from '../../styles/Home.module.css';

export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Não foi possível entrar. Tente de novo.');
        setBusy(false);
        return;
      }
      // Full navigation so server components see the new cookie.
      window.location.assign(next);
    } catch {
      setError('Sem conexão. Tente de novo.');
      setBusy(false);
    }
  };

  return (
    <main className={styles.page} data-lk-theme="default">
      <section className={styles.panel}>
        <img className={styles.logo} src="/images/logo.svg" alt="Taevo Meet" width="148" height="40" />

        <form className={styles.content} onSubmit={submit}>
          <h1 className={`${styles.title} ${displayFont.className}`}>
            Entre na
            <br />
            sua conta.
          </h1>
          <p className={styles.lead}>Acesso exclusivo para a equipe Taevo.</p>

          <div className={styles.actions}>
            <label htmlFor="email" className={styles.fieldLabel}>
              E-mail
            </label>
            <input
              id="email"
              className={styles.input}
              type="email"
              autoComplete="username"
              placeholder="voce@taevo.com.br"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <label htmlFor="password" className={styles.fieldLabel}>
              Senha
            </label>
            <input
              id="password"
              className={styles.input}
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
            <button type="submit" className={styles.primary} disabled={busy}>
              {busy ? 'Entrando…' : 'Entrar'}
            </button>
          </div>
        </form>

        <p className={styles.footnote}>
          Recebeu um link de convite? Abra o link direto, não precisa de conta. Esqueceu a senha? Fale
          com o administrador da equipe.
        </p>
      </section>

      <section className={styles.mosaic} aria-hidden="true">
        <div className={`${styles.tile} ${styles.t1}`} />
        <div className={`${styles.tile} ${styles.t2}`} />
        <div className={`${styles.tile} ${styles.t3}`} />
        <div className={`${styles.tile} ${styles.t4}`} />
      </section>
    </main>
  );
}
