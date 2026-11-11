'use client';

import * as React from 'react';
import {
  ConnectionStateToast,
  LayoutContextProvider,
  MediaDeviceSelect,
  RoomAudioRenderer,
  StartAudio,
  TrackReferenceOrPlaceholder,
  isTrackReference,
  useChat,
  useLayoutContext,
  useParticipants,
  useRoomContext,
  useSpeakingParticipants,
  useTrackToggle,
  useTracks,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { useNoiseFilter } from '../NoiseFilterButton';
import { usePictureInPicture } from '../PictureInPicture';
import { SettingsMenu } from '../SettingsMenu';
import { computeLayout, DEFAULT_LAYOUT_PREFS, gridColumns, LayoutItem, LayoutPrefs } from './layout';
import { LayoutDialog } from './LayoutDialog';
import { ChatPanel, InviteCard, PeoplePanel } from './Panels';
import { Tile } from './Tile';
import {
  CamIcon,
  ChatIcon,
  ChevronUpIcon,
  ExpandIcon,
  GearIcon,
  HangUpIcon,
  InfoIcon,
  LayoutIcon,
  MicIcon,
  MoreIcon,
  NoiseIcon,
  PeopleIcon,
  PipIcon,
  ShareIcon,
} from './icons';
import styles from '../../styles/Call.module.css';

const PREFS_KEY = 'meet:layout';

function useLayoutPrefs() {
  const [prefs, setPrefs] = React.useState<LayoutPrefs>(DEFAULT_LAYOUT_PREFS);
  React.useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PREFS_KEY) ?? 'null');
      if (saved) setPrefs({ ...DEFAULT_LAYOUT_PREFS, ...saved });
    } catch {}
  }, []);
  const update = React.useCallback((next: LayoutPrefs) => {
    setPrefs(next);
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch {}
  }, []);
  return [prefs, update] as const;
}

function useClock() {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);
  return now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function useSize<T extends HTMLElement>() {
  const ref = React.useRef<T>(null);
  const [size, setSize] = React.useState({ width: 0, height: 0 });
  React.useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

/** Closes a popover when clicking outside of it or pressing Escape. */
function useDismiss(open: boolean, close: () => void) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, close]);
  return ref;
}

/** Device errors are already shown to the user by the room (RoomEvent.MediaDevicesError). */
const ignoreDeviceError = () => {};

const trackId = (t: TrackReferenceOrPlaceholder) => `${t.participant.identity}:${t.source}`;

export function CallView(props: { roomName: string; showSettings: boolean }) {
  return (
    <LayoutContextProvider>
      <CallInner {...props} />
    </LayoutContextProvider>
  );
}

function CallInner({ roomName, showSettings }: { roomName: string; showSettings: boolean }) {
  const room = useRoomContext();
  const layoutCtx = useLayoutContext();
  const [prefs, setPrefs] = useLayoutPrefs();
  const [pinned, setPinned] = React.useState<string>();
  const [panel, setPanel] = React.useState<'chat' | 'people' | null>(null);
  const [layoutOpen, setLayoutOpen] = React.useState(false);
  const [inviteDismissed, setInviteDismissed] = React.useState(false);
  const [inviteForced, setInviteForced] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const clock = useClock();
  const participants = useParticipants();
  useSpeakingParticipants(); // re-render when the active speaker changes
  const pip = usePictureInPicture();

  // ----- Chat (kept here so history and unread count survive closing the panel)
  const { chatMessages, send, isSending } = useChat();
  const [seen, setSeen] = React.useState(0);
  React.useEffect(() => {
    if (panel === 'chat') setSeen(chatMessages.length);
  }, [panel, chatMessages.length]);
  const unread = panel === 'chat' ? 0 : chatMessages.length - seen;

  // ----- Tracks and layout
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );
  const byId = new Map(tracks.map((t) => [trackId(t), t]));
  const items: LayoutItem[] = tracks.map((t) => ({
    id: trackId(t),
    isLocal: t.participant.isLocal,
    isScreen: t.source === Track.Source.ScreenShare,
    hasVideo: isTrackReference(t) && !t.publication.isMuted,
    lastSpokeAt: t.participant.lastSpokeAt?.getTime() ?? 0,
  }));
  const validPin = pinned && byId.has(pinned) ? pinned : undefined;
  const layout = computeLayout(items, prefs, validPin);
  const [stageRef, stage] = useSize<HTMLDivElement>();

  const togglePin = (id: string) => setPinned((cur) => (cur === id ? undefined : id));
  const tile = (id: string, variant: 'main' | 'grid' | 'strip' | 'pip') => {
    const t = byId.get(id);
    if (!t) return null;
    return (
      <Tile
        key={id}
        trackRef={t}
        variant={variant}
        pinned={validPin === id}
        onTogglePin={participants.length > 1 || t.source === Track.Source.ScreenShare ? () => togglePin(id) : undefined}
      />
    );
  };

  // ----- Invite card: shown while you're alone (until dismissed), or from the info button
  const alone = participants.length <= 1;
  const showInvite = inviteForced || (alone && !inviteDismissed);
  const link = typeof window !== 'undefined' ? `${window.location.host}/rooms/${roomName}` : `/rooms/${roomName}`;
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const settingsOpen = !!layoutCtx.widget.state?.showSettings;

  return (
    <div className={styles.call} data-lk-theme="default">
      <header className={styles.topBar}>
        <div className={styles.meetingInfo}>
          <span className={styles.clock}>{clock}</span>
          <span className={styles.divider} />
          <span className={styles.roomName}>{roomName}</span>
          <button
            type="button"
            className={styles.iconButtonGhost}
            aria-label="Detalhes da reunião"
            title="Detalhes da reunião"
            onClick={() => {
              setInviteForced((v) => !v);
              setInviteDismissed(true);
            }}
          >
            <InfoIcon />
          </button>
        </div>
        <button
          type="button"
          className={styles.countChip}
          aria-label={`${participants.length} ${participants.length === 1 ? 'pessoa' : 'pessoas'} na chamada`}
          onClick={() => setPanel((p) => (p === 'people' ? null : 'people'))}
        >
          <PeopleIcon size={16} />
          {participants.length}
        </button>
      </header>

      <div className={styles.body}>
        <main className={styles.stage} ref={stageRef} data-kind={layout.kind}>
          {layout.kind === 'grid' && (
            <div
              className={styles.grid}
              style={{
                gridTemplateColumns: `repeat(${gridColumns(
                  layout.others.length + (layout.overflow ? 1 : 0),
                  stage.width,
                  stage.height,
                )}, minmax(0, 1fr))`,
              }}
            >
              {layout.others.map((id) => tile(id, 'grid'))}
              {layout.overflow > 0 && (
                <button type="button" className={styles.overflowTile} onClick={() => setPanel('people')}>
                  +{layout.overflow}
                  <small>ver todos</small>
                </button>
              )}
            </div>
          )}

          {(layout.kind === 'spotlight' || layout.kind === 'duo') && layout.main && (
            <div className={styles.spotlight}>
              {tile(layout.main, 'main')}
              {layout.selfPip && <div className={styles.selfPip}>{tile(layout.selfPip, 'pip')}</div>}
            </div>
          )}

          {layout.kind === 'sidebar' && layout.main && (
            <div className={styles.sidebarLayout}>
              <div className={styles.sidebarMain}>{tile(layout.main, 'main')}</div>
              <div className={styles.strip}>
                {layout.others.map((id) => tile(id, 'strip'))}
                {layout.overflow > 0 && (
                  <button type="button" className={styles.overflowTile} onClick={() => setPanel('people')}>
                    +{layout.overflow}
                  </button>
                )}
              </div>
            </div>
          )}

          {showInvite && (
            <InviteCard
              link={link}
              copied={copied}
              onCopy={copyLink}
              onClose={() => {
                setInviteDismissed(true);
                setInviteForced(false);
              }}
            />
          )}
        </main>

        {panel === 'chat' && (
          <ChatPanel messages={chatMessages} send={send} isSending={isSending} onClose={() => setPanel(null)} />
        )}
        {panel === 'people' && (
          <PeoplePanel onClose={() => setPanel(null)} onCopyLink={copyLink} copied={copied} />
        )}
      </div>

      <footer className={styles.bottomBar}>
        <div className={styles.barSide}>{roomName}</div>

        <nav className={styles.controls} aria-label="Controles da chamada">
          <MediaControl source={Track.Source.Microphone} />
          <MediaControl source={Track.Source.Camera} />
          <ScreenShareButton />
          <NoiseButton />
          <MoreMenu
            onLayout={() => setLayoutOpen(true)}
            onSettings={showSettings ? () => layoutCtx.widget.dispatch?.({ msg: 'toggle_settings' }) : undefined}
            onChat={() => setPanel('chat')}
            onPeople={() => setPanel('people')}
            onPip={pip.supported ? pip.open : undefined}
          />
          <button
            type="button"
            className={styles.leave}
            aria-label="Sair da chamada"
            title="Sair da chamada"
            onClick={() => room.disconnect()}
          >
            <HangUpIcon />
          </button>
        </nav>

        <div className={`${styles.barSide} ${styles.barRight}`}>
          <button
            type="button"
            className={styles.iconButtonGhost}
            data-active={panel === 'chat' || undefined}
            aria-label={unread > 0 ? `Chat, ${unread} novas` : 'Chat'}
            title="Chat"
            onClick={() => setPanel((p) => (p === 'chat' ? null : 'chat'))}
          >
            <ChatIcon />
            {unread > 0 && <span className={styles.badge}>{unread > 9 ? '9+' : unread}</span>}
          </button>
          <button
            type="button"
            className={styles.iconButtonGhost}
            data-active={panel === 'people' || undefined}
            aria-label="Pessoas"
            title="Pessoas"
            onClick={() => setPanel((p) => (p === 'people' ? null : 'people'))}
          >
            <PeopleIcon />
          </button>
          {pip.supported && (
            <button
              type="button"
              className={styles.iconButtonGhost}
              data-active={pip.isOpen || undefined}
              aria-label="Janela flutuante"
              title="Janela flutuante"
              onClick={pip.isOpen ? pip.close : pip.open}
            >
              <PipIcon />
            </button>
          )}
        </div>
      </footer>

      {layoutOpen && <LayoutDialog prefs={prefs} onChange={setPrefs} onClose={() => setLayoutOpen(false)} />}
      {showSettings && settingsOpen && (
        <div className={styles.backdrop} onClick={() => layoutCtx.widget.dispatch?.({ msg: 'toggle_settings' })}>
          <div onClick={(e) => e.stopPropagation()}>
            <SettingsMenu className="lk-settings-menu-modal" />
          </div>
        </div>
      )}

      <RoomAudioRenderer />
      <StartAudio label="Clique para ativar o áudio" className={styles.startAudio} />
      <ConnectionStateToast />
      {pip.portal}
    </div>
  );
}

/** Round mic / camera toggle with a chevron that opens the device picker (Meet style). */
function MediaControl({ source }: { source: Track.Source.Microphone | Track.Source.Camera }) {
  const { enabled, pending, toggle } = useTrackToggle({ source, onDeviceError: ignoreDeviceError });
  const [open, setOpen] = React.useState(false);
  const close = React.useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);
  const isMic = source === Track.Source.Microphone;
  const noun = isMic ? 'microfone' : 'câmera';

  return (
    <div className={styles.mediaGroup} ref={ref}>
      <button
        type="button"
        className={styles.chevron}
        aria-label={`Escolher ${noun}`}
        aria-expanded={open}
        title={`Escolher ${noun}`}
        onClick={() => setOpen((v) => !v)}
      >
        <ChevronUpIcon />
      </button>
      <button
        type="button"
        className={styles.round}
        data-off={!enabled || undefined}
        aria-pressed={enabled}
        disabled={pending}
        aria-label={enabled ? `Desligar ${noun}` : `Ligar ${noun}`}
        title={`${enabled ? 'Desligar' : 'Ligar'} ${noun} (${isMic ? '⌘⇧A' : '⌘⇧V'})`}
        onClick={() => toggle()}
      >
        {isMic ? <MicIcon off={!enabled} /> : <CamIcon off={!enabled} />}
      </button>
      {open && (
        <div
          className={`lk-device-menu ${styles.devicePopover}`}
          role="dialog"
          aria-label={`Escolher ${noun}`}
          // Close only when a device is actually clicked. (MediaDeviceSelect's
          // onActiveDeviceChange also fires on open when a non-default device is in use.)
          onClick={(e) => {
            if ((e.target as Element).closest('li')) close();
          }}
        >
          <div className="lk-device-menu-heading">{isMic ? 'Microfone' : 'Câmera'}</div>
          <MediaDeviceSelect kind={isMic ? 'audioinput' : 'videoinput'} />
          {isMic && (
            <>
              <div className="lk-device-menu-heading">Alto-falante</div>
              <MediaDeviceSelect kind="audiooutput" />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ScreenShareButton() {
  const { enabled, pending, toggle } = useTrackToggle({
    source: Track.Source.ScreenShare,
    onDeviceError: ignoreDeviceError,
  });
  const supported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia;
  if (!supported) return null;
  return (
    <button
      type="button"
      className={styles.round}
      data-active={enabled || undefined}
      aria-pressed={enabled}
      disabled={pending}
      aria-label={enabled ? 'Parar apresentação' : 'Apresentar tela'}
      title={enabled ? 'Parar apresentação' : 'Apresentar tela'}
      onClick={() => toggle()}
    >
      <ShareIcon />
    </button>
  );
}

function NoiseButton() {
  const filter = useNoiseFilter();
  const label = !filter.supported
    ? 'Redução de ruído indisponível neste navegador'
    : !filter.microphoneEnabled
      ? 'Ligue o microfone para usar a redução de ruído'
      : filter.pending
        ? 'Aplicando redução de ruído…'
        : filter.failed
          ? 'Não foi possível ativar a redução de ruído (clique para desligar)'
          : filter.active
            ? 'Desligar redução de ruído'
            : 'Ligar redução de ruído';
  return (
    <button
      type="button"
      className={styles.round}
      data-noise={filter.active || undefined}
      data-failed={filter.failed || undefined}
      aria-pressed={filter.active}
      disabled={filter.pending || !filter.supported || !filter.microphoneEnabled}
      aria-label={label}
      title={label}
      onClick={() => filter.toggle(filter.failed ? false : !filter.active)}
    >
      <NoiseIcon />
    </button>
  );
}

function MoreMenu({
  onLayout,
  onSettings,
  onChat,
  onPeople,
  onPip,
}: {
  onLayout: () => void;
  onSettings?: () => void;
  onChat: () => void;
  onPeople: () => void;
  onPip?: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const close = React.useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);
  const [fullscreen, setFullscreen] = React.useState(false);
  React.useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const item = (label: string, icon: React.ReactNode, action: () => void, className?: string) => (
    <button
      type="button"
      role="menuitem"
      className={`${styles.menuItem} ${className ?? ''}`}
      onClick={() => {
        close();
        action();
      }}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className={styles.moreWrap} ref={ref}>
      <button
        type="button"
        className={styles.round}
        aria-label="Mais opções"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Mais opções"
        onClick={() => setOpen((v) => !v)}
      >
        <MoreIcon />
      </button>
      {open && (
        <div className={styles.menu} role="menu">
          {item('Ajustar visualização', <LayoutIcon />, onLayout)}
          {item(fullscreen ? 'Sair da tela cheia' : 'Tela cheia', <ExpandIcon />, () =>
            fullscreen ? document.exitFullscreen() : document.documentElement.requestFullscreen(),
          )}
          {onSettings && item('Configurações', <GearIcon />, onSettings)}
          {item('Chat', <ChatIcon size={18} />, onChat, styles.mobileOnly)}
          {item('Pessoas', <PeopleIcon size={18} />, onPeople, styles.mobileOnly)}
          {onPip && item('Janela flutuante', <PipIcon size={18} />, onPip, styles.mobileOnly)}
        </div>
      )}
    </div>
  );
}
