'use client';

import * as React from 'react';
import {
  TrackReferenceOrPlaceholder,
  VideoTrack,
  isTrackReference,
  useIsMuted,
  useIsSpeaking,
} from '@livekit/components-react';
import { Participant, ParticipantEvent, Track } from 'livekit-client';
import { displayFont } from '../fonts';
import { MicIcon, PinIcon } from './icons';
import styles from '../../styles/Call.module.css';

const AVATAR_COLORS = ['#FFC2A8', '#FF9871', '#FFE2D4', '#FF5B2E'];

export function participantName(p: Participant) {
  return p.name || p.identity;
}

export function avatarColor(p: Participant) {
  let h = 0;
  for (const ch of p.identity) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

/** Re-renders when the participant's microphone is muted/unmuted/published. */
export function useMicEnabled(p: Participant) {
  const [, force] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => {
    const events = [
      ParticipantEvent.TrackMuted,
      ParticipantEvent.TrackUnmuted,
      ParticipantEvent.TrackPublished,
      ParticipantEvent.TrackUnpublished,
      ParticipantEvent.LocalTrackPublished,
      ParticipantEvent.LocalTrackUnpublished,
    ];
    const listener = () => force();
    // Typed per-event in livekit-client; all of these just need a re-render.
    const emitter = p as unknown as { on(e: string, l: () => void): void; off(e: string, l: () => void): void };
    events.forEach((e) => emitter.on(e, listener));
    return () => {
      events.forEach((e) => emitter.off(e, listener));
    };
  }, [p]);
  return p.isMicrophoneEnabled;
}

export function Avatar({ participant, size }: { participant: Participant; size: 'lg' | 'md' | 'sm' }) {
  const name = participantName(participant);
  return (
    <div
      className={`${styles.avatar} ${displayFont.className}`}
      data-size={size}
      style={{ background: avatarColor(participant) }}
      aria-hidden="true"
    >
      {name.trim()[0]?.toUpperCase() ?? '?'}
    </div>
  );
}

export function Tile({
  trackRef,
  variant = 'grid',
  pinned,
  onTogglePin,
}: {
  trackRef: TrackReferenceOrPlaceholder;
  variant?: 'main' | 'grid' | 'strip' | 'pip';
  pinned?: boolean;
  onTogglePin?: () => void;
}) {
  const p = trackRef.participant;
  const isScreen = trackRef.source === Track.Source.ScreenShare;
  const speaking = useIsSpeaking(p);
  const videoMuted = useIsMuted(trackRef);
  const micEnabled = useMicEnabled(p);
  const hasVideo = isTrackReference(trackRef) && !videoMuted;
  const name = participantName(p) + (p.isLocal ? ' (você)' : '');
  const label = isScreen ? `Tela de ${participantName(p)}${p.isLocal ? ' (você)' : ''}` : name;

  return (
    <div
      className={styles.tile}
      data-variant={variant}
      data-speaking={(!isScreen && speaking) || undefined}
      data-screen={isScreen || undefined}
    >
      {hasVideo ? (
        <VideoTrack
          trackRef={trackRef}
          className={styles.video}
          data-mirror={(p.isLocal && !isScreen) || undefined}
        />
      ) : (
        <Avatar participant={p} size={variant === 'main' ? 'lg' : variant === 'grid' ? 'md' : 'sm'} />
      )}

      <span className={styles.nameChip}>
        {!isScreen && !micEnabled && (
          <span className={styles.mutedIcon} title="Microfone desligado">
            <MicIcon size={14} off />
          </span>
        )}
        <span className={styles.nameText}>{label}</span>
      </span>

      {onTogglePin && variant !== 'pip' && (
        <button
          type="button"
          className={styles.pinButton}
          aria-pressed={pinned}
          aria-label={pinned ? `Desafixar ${label}` : `Fixar ${label}`}
          title={pinned ? 'Desafixar' : 'Fixar'}
          onClick={onTogglePin}
        >
          <PinIcon />
        </button>
      )}
    </div>
  );
}
