'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import {
  ControlBar,
  GridLayout,
  LayoutContextProvider,
  ParticipantTile,
  RoomContext,
  isTrackReference,
  useRoomContext,
  useTracks,
} from '@livekit/components-react';
import { RoomEvent, Track } from 'livekit-client';

/**
 * Picture-in-Picture like Google Meet:
 * - Opens automatically when the user leaves the tab (Chrome/Edge 134+, via the
 *   Media Session "enterpictureinpicture" action, while camera/mic is in use).
 * - Can be opened manually with the floating button.
 * - Closes automatically when the user comes back to the tab (if it was auto-opened).
 *
 * Uses the Document Picture-in-Picture API, so the PiP window shows the real
 * LiveKit tiles (screen share / cameras) plus mic, camera and leave controls.
 */

type DocumentPiP = {
  requestWindow(options?: { width?: number; height?: number }): Promise<Window>;
  window: Window | null;
};

function getDocumentPiP(): DocumentPiP | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { documentPictureInPicture?: DocumentPiP }).documentPictureInPicture;
}

function copyStyles(target: Window) {
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const css = Array.from(sheet.cssRules)
        .map((rule) => rule.cssText)
        .join('\n');
      const style = target.document.createElement('style');
      style.textContent = css;
      target.document.head.appendChild(style);
    } catch {
      // Cross-origin stylesheet: link it instead.
      if (sheet.href) {
        const link = target.document.createElement('link');
        link.rel = 'stylesheet';
        link.href = sheet.href;
        target.document.head.appendChild(link);
      }
    }
  }
}

export function PictureInPicture() {
  const room = useRoomContext();
  const [pipWindow, setPipWindow] = React.useState<Window | null>(null);
  const autoOpenedRef = React.useRef(false);
  const supported = !!getDocumentPiP();

  const openPip = React.useCallback(async (auto: boolean) => {
    const dpip = getDocumentPiP();
    if (!dpip || dpip.window) return;
    try {
      const win = await dpip.requestWindow({ width: 480, height: 320 });
      copyStyles(win);
      win.document.title = document.title;
      win.document.body.setAttribute('data-lk-theme', 'default');
      win.document.body.style.margin = '0';
      win.document.body.style.background = 'var(--lk-bg, #111)';
      win.addEventListener('pagehide', () => {
        autoOpenedRef.current = false;
        setPipWindow(null);
      });
      autoOpenedRef.current = auto;
      setPipWindow(win);
    } catch (e) {
      console.warn('Could not open picture-in-picture window', e);
    }
  }, []);

  const closePip = React.useCallback(() => {
    getDocumentPiP()?.window?.close();
  }, []);

  // Automatic PiP when leaving the tab (Chrome/Edge).
  React.useEffect(() => {
    if (!supported || !('mediaSession' in navigator)) return;
    const action = 'enterpictureinpicture' as MediaSessionAction;
    try {
      navigator.mediaSession.setActionHandler(action, () => openPip(true));
    } catch {
      // Browser does not support automatic PiP; manual button still works.
      return;
    }
    return () => {
      try {
        navigator.mediaSession.setActionHandler(action, null);
      } catch {}
    };
  }, [supported, openPip]);

  // Close the auto-opened PiP when the user returns to the tab.
  React.useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && autoOpenedRef.current) {
        closePip();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [closePip]);

  // Close PiP when leaving the call.
  React.useEffect(() => {
    room.on(RoomEvent.Disconnected, closePip);
    return () => {
      room.off(RoomEvent.Disconnected, closePip);
      closePip();
    };
  }, [room, closePip]);

  if (!supported) return null;

  return (
    <>
      {!pipWindow && (
        <button
          className="lk-button"
          title="Picture-in-picture"
          aria-label="Picture-in-picture"
          onClick={() => openPip(false)}
          style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', zIndex: 10 }}
        >
          <PipIcon />
        </button>
      )}
      {pipWindow &&
        createPortal(
          <RoomContext.Provider value={room}>
            <PipContent />
          </RoomContext.Provider>,
          pipWindow.document.body,
        )}
    </>
  );
}

function PipContent() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  // Prefer a remote screen share (showing your own screen inside PiP is useless).
  const screenShare = tracks.find(
    (t) =>
      isTrackReference(t) &&
      t.source === Track.Source.ScreenShare &&
      !t.participant.isLocal &&
      !t.publication.isMuted,
  );
  const cameras = tracks.filter((t) => t.source === Track.Source.Camera);

  return (
    <LayoutContextProvider>
      <div
        className="lk-video-conference"
        style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
          {screenShare ? (
            <ParticipantTile trackRef={screenShare} style={{ flex: 1 }} />
          ) : (
            <GridLayout tracks={cameras} style={{ flex: 1, height: 'auto' }}>
              <ParticipantTile />
            </GridLayout>
          )}
        </div>
        <ControlBar
          variation="minimal"
          controls={{
            microphone: true,
            camera: true,
            screenShare: false,
            chat: false,
            settings: false,
            leave: true,
          }}
          style={{ padding: '0.25rem', borderTop: 'none' }}
        />
      </div>
    </LayoutContextProvider>
  );
}

function PipIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <rect x="12" y="11" width="8" height="7" rx="1" fill="currentColor" />
    </svg>
  );
}
