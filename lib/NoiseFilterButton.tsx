'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { useLocalParticipant } from '@livekit/components-react';
import { LocalAudioTrack } from 'livekit-client';
import { NoiseFilterControl } from './NoiseFilterControl';
import { RNNOISE_PROCESSOR_NAME, RnnoiseProcessor, isRnnoiseSupported } from './RnnoiseProcessor';

const PREF_KEY = 'meet:noise-filter';

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
 * RNNoise noise suppression, opt-in per participant.
 *
 * "On" runs the mic through RNNoise on top of the browser's own noise suppression;
 * "off" removes the processor entirely. The button reflects the processor's real state.
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
    setSupported(isRnnoiseSupported());
  }, []);

  const sync = React.useCallback(() => {
    const proc = track?.getProcessor();
    setActive(
      !!proc && proc.name === RNNOISE_PROCESSOR_NAME && proc.processedTrack?.readyState === 'live',
    );
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
      const hasFilter = track.getProcessor()?.name === RNNOISE_PROCESSOR_NAME;
      if (wanted && !hasFilter) {
        setPending(true);
        await track.setProcessor(new RnnoiseProcessor());
      } else if (!wanted && hasFilter) {
        setPending(true);
        await track.stopProcessor();
      }
    };
    apply()
      .catch((e) => console.error('RNNoise: failed to apply noise filter', e))
      .finally(() => {
        if (cancelled) return;
        setPending(false);
        sync();
      });
    return () => {
      cancelled = true;
    };
  }, [track, wanted, supported, sync]);

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
