'use client';

import * as React from 'react';
import { useRoomContext } from '@livekit/components-react';
import { RoomEvent } from 'livekit-client';

/**
 * Short chimes when someone joins (two rising notes) or leaves (two falling
 * notes), like Google Meet. Synthesized with Web Audio — no sound files.
 * Only for other people, never on your own join, and rate-limited so a
 * crowd joining at once doesn't turn into noise.
 */
export const SOUNDS_PREF_KEY = 'meet:join-sounds';

export function readSoundsPref() {
  try {
    return localStorage.getItem(SOUNDS_PREF_KEY) !== '0';
  } catch {
    return true;
  }
}

export function writeSoundsPref(on: boolean) {
  try {
    localStorage.setItem(SOUNDS_PREF_KEY, on ? '1' : '0');
  } catch {}
}

let ctx: AudioContext | undefined;

export function playChime(kind: 'join' | 'leave') {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    // join: G5 → C6 (up)   leave: C6 → G5 (down)
    const notes = kind === 'join' ? [783.99, 1046.5] : [1046.5, 783.99];
    const start = ctx.currentTime + 0.02;
    notes.forEach((freq, i) => {
      const t = start + i * 0.13;
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      // soft attack, gentle decay
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.12, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  } catch {
    // audio not available — ignore
  }
}

export function useJoinLeaveSounds(enabled: boolean) {
  const room = useRoomContext();
  React.useEffect(() => {
    if (!enabled) return;
    let last = 0;
    const play = (kind: 'join' | 'leave') => {
      const now = Date.now();
      if (now - last < 1200) return; // several people at once → one chime
      last = now;
      playChime(kind);
    };
    const onJoin = () => play('join');
    const onLeave = () => play('leave');
    room.on(RoomEvent.ParticipantConnected, onJoin);
    room.on(RoomEvent.ParticipantDisconnected, onLeave);
    return () => {
      room.off(RoomEvent.ParticipantConnected, onJoin);
      room.off(RoomEvent.ParticipantDisconnected, onLeave);
    };
  }, [room, enabled]);
}
