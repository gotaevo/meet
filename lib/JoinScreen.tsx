'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  LocalUserChoices,
  MediaDeviceMenu,
  usePersistentUserChoices,
  usePreviewTracks,
} from '@livekit/components-react';
import { LocalVideoTrack, Track, facingModeFromLocalTrack } from 'livekit-client';
import { displayFont } from './fonts';
import { inviteUrl } from './call/inviteLink';
import styles from '../styles/JoinScreen.module.css';

/**
 * Taevo Meet pre-join screen ("Lado a lado"): big camera preview with round
 * mic/camera toggles on the left, room info, name and join on the right.
 * Same contract as LiveKit's <PreJoin>: calls onSubmit with LocalUserChoices.
 */
export function JoinScreen(props: JoinScreenProps) {
  // Saved choices live in localStorage, so render only in the browser.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  return mounted ? <JoinScreenInner {...props} /> : null;
}

type JoinScreenProps = {
  roomName: string;
  inviteCode: string;
  memberName?: string;
  /** resolves false when joining failed, so the button becomes clickable again */
  onSubmit: (choices: LocalUserChoices) => Promise<boolean> | void;
  onError?: (error: Error) => void;
};

function JoinScreenInner({ roomName, inviteCode, memberName, onSubmit, onError }: JoinScreenProps) {
  const {
    userChoices: initial,
    saveAudioInputDeviceId,
    saveAudioInputEnabled,
    saveVideoInputDeviceId,
    saveVideoInputEnabled,
    saveUsername,
  } = usePersistentUserChoices({ defaults: { videoEnabled: true, audioEnabled: true } });

  const [audioEnabled, setAudioEnabled] = React.useState(initial.audioEnabled);
  const [videoEnabled, setVideoEnabled] = React.useState(initial.videoEnabled);
  const [audioDeviceId, setAudioDeviceId] = React.useState(initial.audioDeviceId);
  const [videoDeviceId, setVideoDeviceId] = React.useState(initial.videoDeviceId);
  const [username, setUsername] = React.useState(initial.username || memberName || '');
  const [copied, setCopied] = React.useState(false);
  const [joining, setJoining] = React.useState(false);
  const [deviceError, setDeviceError] = React.useState(false);

  React.useEffect(() => saveAudioInputEnabled(audioEnabled), [audioEnabled, saveAudioInputEnabled]);
  React.useEffect(() => saveVideoInputEnabled(videoEnabled), [videoEnabled, saveVideoInputEnabled]);
  React.useEffect(() => saveAudioInputDeviceId(audioDeviceId), [audioDeviceId, saveAudioInputDeviceId]);
  React.useEffect(() => saveVideoInputDeviceId(videoDeviceId), [videoDeviceId, saveVideoInputDeviceId]);
  React.useEffect(() => saveUsername(username), [username, saveUsername]);

  // A saved device that no longer exists (unplugged headset, other browser profile)
  // would make the preview fail: fall back to the system default.
  React.useEffect(() => {
    navigator.mediaDevices
      ?.enumerateDevices()
      .then((devices) => {
        const has = (kind: MediaDeviceKind, id: string) =>
          !id || devices.some((d) => d.kind === kind && d.deviceId === id);
        if (!has('audioinput', audioDeviceId)) setAudioDeviceId('');
        if (!has('videoinput', videoDeviceId)) setVideoDeviceId('');
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Separate previews, so a microphone problem never takes the camera down (and vice versa).
  const onAudioError = React.useCallback(
    (error: Error) => {
      if (audioDeviceId) return setAudioDeviceId('');
      setDeviceError(true);
      onError?.(error);
    },
    [audioDeviceId, onError],
  );
  const onVideoError = React.useCallback(
    (error: Error) => {
      if (videoDeviceId) return setVideoDeviceId('');
      setDeviceError(true);
      onError?.(error);
    },
    [videoDeviceId, onError],
  );
  const audioTracks = usePreviewTracks(
    { audio: audioEnabled ? { deviceId: audioDeviceId } : false },
    onAudioError,
  );
  const videoTracks = usePreviewTracks(
    { video: videoEnabled ? { deviceId: videoDeviceId } : false },
    onVideoError,
  );
  const videoTrack = videoTracks?.find((t) => t.kind === Track.Kind.Video) as
    | LocalVideoTrack
    | undefined;

  React.useEffect(() => {
    if (audioTracks?.length || videoTracks?.length) setDeviceError(false);
  }, [audioTracks, videoTracks]);

  const videoEl = React.useRef<HTMLVideoElement>(null);
  React.useEffect(() => {
    if (videoEl.current && videoTrack) {
      videoTrack.unmute();
      videoTrack.attach(videoEl.current);
    }
    return () => {
      videoTrack?.detach();
    };
  }, [videoTrack]);
  const facingMode = videoTrack ? facingModeFromLocalTrack(videoTrack).facingMode : undefined;

  const name = username.trim();
  const showVideo = videoEnabled && !!videoTrack;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl(roomName, inviteCode));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name || joining) return;
    setJoining(true);
    Promise.resolve(onSubmit({ username: name, audioEnabled, videoEnabled, audioDeviceId, videoDeviceId }))
      .then((ok) => ok === false && setJoining(false))
      .catch(() => setJoining(false));
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" aria-label="Taevo Meet — início">
          <img src="/images/logo.svg" alt="Taevo Meet" width="133" height="36" />
        </Link>
        <Link href="/" className={styles.back}>
          Voltar ao início
        </Link>
      </header>

      <main className={styles.main}>
        <div className={styles.preview}>
          {videoTrack && (
            <video
              ref={videoEl}
              className={styles.video}
              data-facing-mode={facingMode}
              hidden={!showVideo}
              muted
              playsInline
            />
          )}
          {!showVideo && (
            <div className={`${styles.avatar} ${displayFont.className}`} aria-hidden="true">
              {name ? name[0].toUpperCase() : '?'}
            </div>
          )}
          {!showVideo && (
            <span className={styles.badge}>
              {deviceError
                ? 'Permita o acesso à câmera e ao microfone no navegador'
                : 'Câmera desligada'}
            </span>
          )}

          <div className={styles.controls}>
            <div className={styles.control}>
              <button
                type="button"
                className={styles.round}
                data-off={!audioEnabled || undefined}
                aria-pressed={audioEnabled}
                aria-label={audioEnabled ? 'Desligar microfone' : 'Ligar microfone'}
                onClick={() => setAudioEnabled((v) => !v)}
              >
                {audioEnabled ? <MicIcon /> : <MicOffIcon />}
              </button>
              <MediaDeviceMenu
                kind="audioinput"
                className={styles.menu}
                aria-label="Escolher microfone"
                initialSelection={audioDeviceId || 'default'}
                onActiveDeviceChange={(_, id) => setAudioDeviceId(id)}
              />
            </div>
            <div className={styles.control}>
              <button
                type="button"
                className={styles.round}
                data-off={!videoEnabled || undefined}
                aria-pressed={videoEnabled}
                aria-label={videoEnabled ? 'Desligar câmera' : 'Ligar câmera'}
                onClick={() => setVideoEnabled((v) => !v)}
              >
                {videoEnabled ? <CamIcon /> : <CamOffIcon />}
              </button>
              <MediaDeviceMenu
                kind="videoinput"
                className={styles.menu}
                aria-label="Escolher câmera"
                initialSelection={videoDeviceId || 'default'}
                onActiveDeviceChange={(_, id) => setVideoDeviceId(id)}
              />
            </div>
          </div>
        </div>

        <form className={styles.side} onSubmit={submit}>
          <h1 className={`${styles.title} ${displayFont.className}`}>
            Pronto para
            <br />
            entrar?
          </h1>

          <div className={styles.room}>
            <span>
              Sala <strong>{roomName}</strong>
            </span>
            <button type="button" className={styles.copy} onClick={copyLink}>
              {copied ? 'Link copiado' : 'Copiar link'}
            </button>
          </div>

          <div className={styles.field}>
            <label htmlFor="username">Seu nome</label>
            <input
              id="username"
              type="text"
              placeholder="Como vão te chamar"
              autoComplete="off"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <button type="submit" className={styles.join} disabled={!name || joining}>
            {joining ? 'Entrando…' : 'Entrar na sala'}
          </button>
        </form>
      </main>
    </div>
  );
}

const iconProps = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

function MicIcon() {
  return (
    <svg {...iconProps}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}
function MicOffIcon() {
  return (
    <svg {...iconProps}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3M3 3l18 18" />
    </svg>
  );
}
function CamIcon() {
  return (
    <svg {...iconProps}>
      <rect x="2" y="6" width="14" height="12" rx="3" />
      <path d="M16 10l6-3v10l-6-3" />
    </svg>
  );
}
function CamOffIcon() {
  return (
    <svg {...iconProps}>
      <rect x="2" y="6" width="14" height="12" rx="3" />
      <path d="M16 10l6-3v10l-6-3M3 3l18 18" />
    </svg>
  );
}
