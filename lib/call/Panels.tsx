'use client';

import * as React from 'react';
import { formatChatMessageLinks, useParticipants, type ReceivedChatMessage } from '@livekit/components-react';
import { CloseIcon, CopyIcon, MicIcon, SendIcon } from './icons';
import { Avatar, participantName, useMicEnabled } from './Tile';
import type { Participant } from 'livekit-client';
import styles from '../../styles/Call.module.css';

function SidePanel({
  title,
  onClose,
  children,
}: React.PropsWithChildren<{ title: string; onClose: () => void }>) {
  return (
    <aside className={styles.panel} aria-label={title}>
      <div className={styles.panelHeader}>
        <h2>{title}</h2>
        <button type="button" className={styles.iconButtonLight} aria-label={`Fechar ${title.toLowerCase()}`} onClick={onClose}>
          <CloseIcon />
        </button>
      </div>
      {children}
    </aside>
  );
}

const timeFmt = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

export function ChatPanel({
  messages,
  send,
  isSending,
  onClose,
}: {
  messages: ReceivedChatMessage[];
  send: (text: string) => Promise<unknown>;
  isSending: boolean;
  onClose: () => void;
}) {
  const [text, setText] = React.useState('');
  const listRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);
  React.useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    await send(value);
    setText('');
  };

  return (
    <SidePanel title="Mensagens" onClose={onClose}>
      <div className={styles.chatList} ref={listRef}>
        {messages.length === 0 && (
          <p className={styles.panelEmpty}>
            As mensagens só ficam visíveis para quem está na chamada e somem quando ela termina.
          </p>
        )}
        {messages.map((m, i) => {
          const mine = !!m.from?.isLocal;
          const prev = messages[i - 1];
          const grouped = prev && prev.from?.identity === m.from?.identity && m.timestamp - prev.timestamp < 60_000;
          return (
            <div key={m.id ?? `${m.timestamp}-${i}`} className={styles.chatMsg} data-mine={mine || undefined}>
              {!grouped && (
                <div className={styles.chatMeta}>
                  <strong>{mine ? 'Você' : m.from ? participantName(m.from) : 'Alguém'}</strong>
                  {' · '}
                  {timeFmt.format(m.timestamp)}
                </div>
              )}
              <div className={styles.chatBody}>{formatChatMessageLinks(m.message)}</div>
            </div>
          );
        })}
      </div>
      <form className={styles.chatForm} onSubmit={submit}>
        <label htmlFor="chat-input" className={styles.srOnly}>
          Mensagem
        </label>
        <input
          id="chat-input"
          ref={inputRef}
          type="text"
          placeholder="Enviar mensagem"
          autoComplete="off"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" aria-label="Enviar" disabled={!text.trim() || isSending}>
          <SendIcon />
        </button>
      </form>
    </SidePanel>
  );
}

function PersonRow({ participant }: { participant: Participant }) {
  const mic = useMicEnabled(participant);
  return (
    <li className={styles.person}>
      <Avatar participant={participant} size="sm" />
      <span className={styles.personName}>
        {participantName(participant)}
        {participant.isLocal && <span> (você)</span>}
      </span>
      <span className={styles.personMic} data-off={!mic || undefined} title={mic ? 'Microfone ligado' : 'Microfone desligado'}>
        <MicIcon size={18} off={!mic} />
      </span>
    </li>
  );
}

export function PeoplePanel({ onClose, onCopyLink, copied }: { onClose: () => void; onCopyLink: () => void; copied: boolean }) {
  const participants = useParticipants();
  return (
    <SidePanel title="Pessoas" onClose={onClose}>
      <div className={styles.peopleBody}>
        <button type="button" className={styles.copyWide} onClick={onCopyLink}>
          <CopyIcon />
          {copied ? 'Link copiado' : 'Copiar link da reunião'}
        </button>
        <div className={styles.peopleHeading}>Na chamada · {participants.length}</div>
        <ul className={styles.peopleList}>
          {participants.map((p) => (
            <PersonRow key={p.identity} participant={p} />
          ))}
        </ul>
      </div>
    </SidePanel>
  );
}

export function InviteCard({
  link,
  copied,
  onCopy,
  onClose,
}: {
  link: string;
  copied: boolean;
  onCopy: () => void;
  onClose: () => void;
}) {
  return (
    <section className={styles.invite} aria-label="Convite">
      <div className={styles.inviteHeader}>
        <h2>Sua reunião está pronta</h2>
        <button type="button" className={styles.iconButtonLight} aria-label="Fechar convite" onClick={onClose}>
          <CloseIcon />
        </button>
      </div>
      <p>Compartilhe este link com quem você quer que participe.</p>
      <div className={styles.inviteLink}>
        <span>{link}</span>
        <button type="button" onClick={onCopy}>
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
    </section>
  );
}
