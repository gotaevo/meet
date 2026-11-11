'use client';

import * as React from 'react';
import { useRemoteParticipants } from '@livekit/components-react';
import { Track } from 'livekit-client';

/**
 * "Silenciar para mim": stops playing someone's audio on THIS device only.
 * Nothing is sent to the server or to the other person — they keep talking and
 * everyone else keeps hearing them; they are never told.
 *
 * Implemented with RemoteParticipant.setVolume(0), which livekit-client also
 * re-applies to tracks published later (e.g. after they turn their mic off and on).
 */
type LocalMuteApi = {
  isMuted: (identity: string) => boolean;
  toggle: (identity: string) => void;
};

const LocalMuteContext = React.createContext<LocalMuteApi>({
  isMuted: () => false,
  toggle: () => {},
});

export function LocalMuteProvider({ children }: React.PropsWithChildren) {
  const [muted, setMuted] = React.useState<ReadonlySet<string>>(new Set());
  const remotes = useRemoteParticipants();

  // Apply (and re-apply when someone rejoins with a new participant object).
  React.useEffect(() => {
    for (const p of remotes) {
      const volume = muted.has(p.identity) ? 0 : 1;
      p.setVolume(volume, Track.Source.Microphone);
      p.setVolume(volume, Track.Source.ScreenShareAudio);
    }
  }, [remotes, muted]);

  const api = React.useMemo<LocalMuteApi>(
    () => ({
      isMuted: (identity) => muted.has(identity),
      toggle: (identity) =>
        setMuted((prev) => {
          const next = new Set(prev);
          if (next.has(identity)) next.delete(identity);
          else next.add(identity);
          return next;
        }),
    }),
    [muted],
  );

  return <LocalMuteContext.Provider value={api}>{children}</LocalMuteContext.Provider>;
}

export const useLocalMute = () => React.useContext(LocalMuteContext);
