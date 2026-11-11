'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { useKrispNoiseFilter } from '@livekit/components-react/krisp';
import { useLocalParticipant } from '@livekit/components-react';
import { isKrispNoiseFilterSupported } from '@livekit/krisp-noise-filter';
import { isLowPowerDevice } from './client-utils';
import { NoiseFilterControl } from './NoiseFilterControl';

/** Mount next to LiveKit's microphone controls without replacing its conference layout. */
export function NoiseFilterButton() {
  const [target, setTarget] = React.useState<HTMLElement | null>(null);
  const [supported, setSupported] = React.useState(false);
  const { isMicrophoneEnabled } = useLocalParticipant();
  const { isNoiseFilterEnabled, setNoiseFilterEnabled, isNoiseFilterPending } = useKrispNoiseFilter(
    {
      filterOptions: {
        quality: typeof navigator !== 'undefined' && isLowPowerDevice() ? 'low' : 'medium',
      },
    },
  );

  React.useEffect(() => {
    setSupported(isKrispNoiseFilterSupported());
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
      enabled={isNoiseFilterEnabled}
      pending={isNoiseFilterPending}
      supported={supported}
      microphoneEnabled={isMicrophoneEnabled}
      onToggle={(enabled) => {
        void setNoiseFilterEnabled(enabled);
      }}
    />,
    target,
  );
}
