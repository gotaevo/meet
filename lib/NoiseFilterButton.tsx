'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { useLocalParticipant } from '@livekit/components-react';
import { LocalAudioTrack } from 'livekit-client';
import type { KrispNoiseFilterProcessor } from '@livekit/krisp-noise-filter';
import { isLowPowerDevice } from './client-utils';
import { NoiseFilterControl } from './NoiseFilterControl';

const PREF_KEY = 'meet:noise-filter';
const KRISP_NAME = 'livekit-noise-filter';

function readPref() {
  try {
    return localStorage.getItem(PREF_KEY) === '1';
  } catch {
    return false;
  }
}

function writePref(value: boolean) {
  try {
    localStorage.setItem(PREF_KEY, value ? '1' : '0');
  } catch {}
}

/**
 * Krisp noise cancellation, opt-in per participant.
 *
 * Why not `useKrispNoiseFilter` from components-react:
 * - When "disabled" it keeps the Krisp processor attached in bypass, and Krisp turns the
 *   browser's own noise suppression off on attach, so "off" was worse than no filter at all
 *   and the difference between on/off was barely noticeable.
 * - It reports "enabled" even when Krisp refuses to start (Cloud validation) or disables
 *   itself on CPU overload, so the button lied about the real state.
 *
 * Here "off" removes the processor entirely (restoring the browser's noise suppression),
 * "on" uses the strongest model the device can handle plus background voice cancellation,
 * and the button reflects what the processor is actually doing.
 */
function useNoiseFilter() {
  const { microphoneTrack, isMicrophoneEnabled } = useLocalParticipant();
  const track =
    microphoneTrack?.track instanceof LocalAudioTrack ? microphoneTrack.track : undefined;

  const [wanted, setWanted] = React.useState(false);
  const [active, setActive] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [supported, setSupported] = React.useState(false);

  React.useEffect(() => {
    setWanted(readPref());
    void import('@livekit/krisp-noise-filter')
      .then(({ isKrispNoiseFilterSupported }) => setSupported(isKrispNoiseFilterSupported()))
      .catch(() => setSupported(false));
  }, []);

  const sync = React.useCallback(() => {
    const proc = track?.getProcessor() as KrispNoiseFilterProcessor | undefined;
    setActive(!!proc && proc.name === KRISP_NAME && proc.isEnabled());
  }, [track]);

  // Apply the participant's choice to the current microphone track
  // (also re-applies after switching microphone, since that creates a new track).
  React.useEffect(() => {
    if (!track || !supported) {
      setActive(false);
      return;
    }
    let cancelled = false;
    const apply = async () => {
      const current = track.getProcessor();
      const hasKrisp = current?.name === KRISP_NAME;
      if (wanted && !hasKrisp) {
        setPending(true);
        const { KrispNoiseFilter } = await import('@livekit/krisp-noise-filter');
        const lowPower = isLowPowerDevice();
        await track.setProcessor(
          KrispNoiseFilter({
            quality: lowPower ? 'medium' : 'high',
            // Also removes other people talking / TV in the background, like Google Meet.
            useBVC: !lowPower,
            onBufferDrop: () => console.warn('Krisp: CPU overloaded, audio buffer dropped'),
          }),
        );
        const proc = track.getProcessor() as KrispNoiseFilterProcessor | undefined;
        const ok = await proc?.setEnabled(true);
        if (ok === false) console.warn('Krisp: noise filter could not be enabled');
      } else if (!wanted && hasKrisp) {
        setPending(true);
        // Removing the processor restores the original mic constraints,
        // so the browser's built-in noise suppression comes back.
        await track.stopProcessor();
      }
    };
    apply()
      .catch((e) => console.error('Krisp: failed to apply noise filter', e))
      .finally(() => {
        if (cancelled) return;
        setPending(false);
        sync();
      });
    return () => {
      cancelled = true;
    };
  }, [track, wanted, supported, sync]);

  // Krisp can turn itself off (CPU overload, Cloud validation): keep the UI honest.
  React.useEffect(() => {
    if (!track) return;
    const id = setInterval(sync, 1000);
    return () => clearInterval(id);
  }, [track, sync]);

  const toggle = React.useCallback((value: boolean) => {
    writePref(value);
    setWanted(value);
  }, []);

  return {
    active,
    pending,
    supported,
    failed: wanted && !active && !pending && !!track && supported,
    microphoneEnabled: isMicrophoneEnabled,
    toggle,
  };
}

/** Mount next to LiveKit's microphone controls without replacing its conference layout. */
export function NoiseFilterButton() {
  const [target, setTarget] = React.useState<HTMLElement | null>(null);
  const filter = useNoiseFilter();

  React.useEffect(() => {
    const findMicrophone = () => {
      setTarget(
        document.querySelector<HTMLElement>(
          '.lk-video-conference .lk-control-bar > .lk-button-group',
        ),
      );
    };
    findMicrophone();
    const observer = new MutationObserver(findMicrophone);
    observer.observe(document.querySelector('.lk-room-container') ?? document.body, {
      childList: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, []);

  if (!target) return null;
  return createPortal(
    <NoiseFilterControl
      enabled={filter.active}
      pending={filter.pending}
      supported={filter.supported}
      failed={filter.failed}
      microphoneEnabled={filter.microphoneEnabled}
      // If it failed to start, clicking again turns the request off.
      onToggle={(enabled) => filter.toggle(filter.failed ? false : enabled)}
    />,
    target,
  );
}
