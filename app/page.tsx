'use client';

import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { Bricolage_Grotesque } from 'next/font/google';
import { encodePassphrase, generateRoomId, randomString } from '@/lib/client-utils';
import styles from '../styles/Home.module.css';

const display = Bricolage_Grotesque({ subsets: ['latin'], weight: ['700'] });

/**
 * Accepts a bare room code or a full meeting link (…/rooms/<code>#<key>).
 * A link keeps its #hash, which carries the passphrase of an encrypted meeting.
 */
function roomPathFromInput(value: string) {
  const text = value.trim();
  const match = text.match(/\/rooms\/([^/?#\s]+)(#\S+)?/);
  const room = match ? decodeURIComponent(match[1]) : text;
  if (!/^[\w-]+$/.test(room)) return null;
  return `/rooms/${room}${match?.[2] ?? ''}`;
}

export default function Page() {
  const router = useRouter();
  const [e2ee, setE2ee] = useState(false);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState(false);

  const startMeeting = () => {
    const hash = e2ee ? `#${encodePassphrase(randomString(64))}` : '';
    router.push(`/rooms/${generateRoomId()}${hash}`);
  };

  const onJoin: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    const path = roomPathFromInput(code);
    if (!path) {
      setCodeError(true);
      return;
    }
    router.push(path);
  };

  return (
    <main className={styles.page} data-lk-theme="default">
      <section className={styles.panel}>
        <img className={styles.logo} src="/images/logo.svg" alt="Taevo Meet" width="148" height="40" />

        <div className={styles.content}>
          <h1 className={`${styles.title} ${display.className}`}>
            Todo mundo
            <br />
            na mesma tela.
          </h1>
          <p className={styles.lead}>Abra uma sala, compartilhe o link e comece. Simples assim.</p>

          <div className={styles.actions}>
            <button type="button" className={styles.primary} onClick={startMeeting}>
              Iniciar reunião
            </button>
            <form className={styles.join} onSubmit={onJoin}>
              <label htmlFor="room-code" className={styles.srOnly}>
                Código ou link da sala
              </label>
              <input
                id="room-code"
                type="text"
                placeholder="Código ou link da sala"
                autoComplete="off"
                value={code}
                aria-invalid={codeError || undefined}
                onChange={(ev) => {
                  setCode(ev.target.value);
                  setCodeError(false);
                }}
              />
              <button type="submit" className={styles.secondary} disabled={!code.trim()}>
                Entrar
              </button>
            </form>
            {codeError && <p className={styles.error}>Código ou link inválido.</p>}
          </div>
        </div>

        <label className={styles.e2ee}>
          <input type="checkbox" checked={e2ee} onChange={(ev) => setE2ee(ev.target.checked)} />
          Nova reunião com criptografia de ponta a ponta
        </label>
      </section>

      <section className={styles.mosaic} aria-hidden="true">
        <div className={`${styles.tile} ${styles.t1}`}>
          <span className={display.className}>A</span>
          <em>Você</em>
        </div>
        <div className={`${styles.tile} ${styles.t2}`}>
          <span className={display.className}>B</span>
          <em>Convidado</em>
        </div>
        <div className={`${styles.tile} ${styles.t3}`}>
          <span className={display.className}>C</span>
          <em>Convidado</em>
        </div>
        <div className={`${styles.tile} ${styles.t4}`}>
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </div>
      </section>
    </main>
  );
}
