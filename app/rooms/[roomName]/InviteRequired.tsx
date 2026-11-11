import Link from 'next/link';
import { displayFont } from '@/lib/fonts';
import styles from '../../../styles/Home.module.css';

/** Shown to people without an account who opened a room without a valid invite. */
export function InviteRequired({ roomName }: { roomName: string }) {
  return (
    <main className={styles.page} data-lk-theme="default">
      <section className={styles.panel}>
        <img className={styles.logo} src="/images/logo.svg" alt="Taevo Meet" width="148" height="40" />
        <div className={styles.content}>
          <h1 className={`${styles.title} ${displayFont.className}`}>
            Precisa de
            <br />
            um convite.
          </h1>
          <p className={styles.lead}>
            Para entrar nesta sala sem conta, use o link de convite completo enviado por quem criou a
            reunião. Peça para copiarem o link de novo pelo botão &quot;Copiar link&quot;.
          </p>
          <div className={styles.actions}>
            <Link
              className={styles.primary}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
              href={`/login?next=${encodeURIComponent(`/rooms/${roomName}`)}`}
            >
              Sou da equipe Taevo
            </Link>
          </div>
        </div>
        <span />
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
