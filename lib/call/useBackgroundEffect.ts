'use client';

import * as React from 'react';
import { useLocalParticipant } from '@livekit/components-react';
import { LocalVideoTrack } from 'livekit-client';
import type { BackgroundProcessorWrapper } from '@livekit/track-processors';
import { BackgroundChoice, BLUR_RADIUS, backgroundSrc, parseChoice } from './backgrounds';

const PREF_KEY = 'meet:background';

/**
 * Applies the chosen background effect (blur / image) to the local camera, keeps it
 * when the camera is turned off and on again, and remembers it for the next call.
 * The heavy segmentation library is only loaded once someone picks an effect.
 */
export function useBackgroundEffect() {
  const { cameraTrack } = useLocalParticipant();
  const track = cameraTrack?.track instanceof LocalVideoTrack ? cameraTrack.track : undefined;
  const [choice, setChoiceState] = React.useState<BackgroundChoice>({ type: 'none' });
  const [supported, setSupported] = React.useState(true);
  const [pending, setPending] = React.useState(false);
  const processorRef = React.useRef<BackgroundProcessorWrapper>();

  React.useEffect(() => {
    try {
      setChoiceState(parseChoice(JSON.parse(localStorage.getItem(PREF_KEY) ?? 'null')));
    } catch {}
  }, []);

  const setChoice = React.useCallback((next: BackgroundChoice) => {
    setChoiceState(next);
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  React.useEffect(() => {
    if (!track) return;
    let cancelled = false;
    const apply = async () => {
      if (choice.type === 'none') {
        if (track.getProcessor()) await track.stopProcessor();
        processorRef.current = undefined;
        return;
      }
      setPending(true);
      const { BackgroundProcessor, supportsBackgroundProcessors } = await import('@livekit/track-processors');
      if (!supportsBackgroundProcessors()) {
        setSupported(false);
        return;
      }
      const options =
        choice.type === 'blur'
          ? ({ mode: 'background-blur', blurRadius: BLUR_RADIUS[choice.strength] } as const)
          : ({ mode: 'virtual-background', imagePath: backgroundSrc(choice.id) } as const);
      if (cancelled) return;
      const current = processorRef.current;
      if (current && track.getProcessor() === current) {
        // Same processor still attached: switch mode without restarting the camera.
        await current.switchTo(options);
      } else {
        const processor = BackgroundProcessor(options);
        processorRef.current = processor;
        await track.setProcessor(processor);
      }
    };
    apply()
      .catch((e) => console.warn('Background effect failed', e))
      .finally(() => !cancelled && setPending(false));
    return () => {
      cancelled = true;
    };
  }, [track, choice]);

  return { choice, setChoice, supported, pending, hasCamera: !!track };
}
