'use client';

import * as React from 'react';
import {
  VideoTrack,
  useIsRecording,
  useLocalParticipant,
  useMediaDeviceSelect,
  useRoomContext,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { useNoiseFilter } from '../NoiseFilterButton';
import {
  BACKGROUND_CATEGORIES,
  BackgroundChoice,
  backgroundSrc,
  backgroundThumb,
  sameChoice,
} from './backgrounds';
import { CloseIcon } from './icons';
import { Avatar } from './Tile';
import styles from '../../styles/Call.module.css';

export type SettingsTab = 'audio' | 'video' | 'background' | 'recording';

const RECORD_ENDPOINT = process.env.NEXT_PUBLIC_LK_RECORD_ENDPOINT;

export function SettingsPanel({
  tab,
  onTabChange,
  onClose,
  background,
}: {
  tab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  onClose: () => void;
  background: {
    choice: BackgroundChoice;
    setChoice: (c: BackgroundChoice) => void;
    supported: boolean;
    pending: boolean;
    hasCamera: boolean;
  };
}) {
  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'audio', label: 'Áudio' },
    { id: 'video', label: 'Vídeo' },
    { id: 'background', label: 'Fundo' },
    ...(RECORD_ENDPOINT ? [{ id: 'recording' as const, label: 'Gravação' }] : []),
  ];

  return (
    <aside className={styles.panel} aria-label="Configurações">
      <div className={styles.panelHeader}>
        <h2>Configurações</h2>
        <button type="button" className={styles.iconButtonLight} aria-label="Fechar configurações" onClick={onClose}>
          <CloseIcon />
        </button>
      </div>

      <div className={styles.segmented} role="tablist" aria-label="Seções">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => onTabChange(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.settingsBody} role="tabpanel">
        {tab === 'audio' && <AudioTab />}
        {tab === 'video' && <VideoTab />}
        {tab === 'background' && <BackgroundTab {...background} />}
        {tab === 'recording' && <RecordingTab />}
      </div>
    </aside>
  );
}

function SelfPreview() {
  const { localParticipant, cameraTrack, isCameraEnabled } = useLocalParticipant();
  return (
    <div className={styles.settingsPreview}>
      {cameraTrack && isCameraEnabled ? (
        <VideoTrack
          trackRef={{ participant: localParticipant, publication: cameraTrack, source: Track.Source.Camera }}
          className={styles.video}
          data-mirror
        />
      ) : (
        <>
          <Avatar participant={localParticipant} size="md" />
          <span className={styles.previewNote}>Câmera desligada</span>
        </>
      )}
    </div>
  );
}

function DeviceSelect({ kind, label }: { kind: MediaDeviceKind; label: string }) {
  const room = useRoomContext();
  const { devices, activeDeviceId, setActiveMediaDevice } = useMediaDeviceSelect({ kind, room });
  const id = `device-${kind}`;
  if (kind === 'audiooutput' && devices.length === 0) {
    return (
      <div className={styles.field}>
        <span className={styles.fieldLabel}>{label}</span>
        <p className={styles.fieldHint}>Este navegador usa a saída de áudio do sistema.</p>
      </div>
    );
  }
  const hasActive = devices.some((d) => d.deviceId === activeDeviceId);
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.fieldLabel}>
        {label}
      </label>
      <div className={styles.selectWrap}>
        <select
          id={id}
          value={hasActive ? activeDeviceId : (devices[0]?.deviceId ?? '')}
          onChange={(e) => setActiveMediaDevice(e.target.value)}
        >
          {devices.length === 0 && <option value="">Nenhum dispositivo encontrado</option>}
          {devices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label.replace(/^Default - /, 'Padrão - ') || 'Dispositivo sem nome'}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function AudioTab() {
  const noise = useNoiseFilter();
  return (
    <>
      <DeviceSelect kind="audioinput" label="Microfone" />
      <DeviceSelect kind="audiooutput" label="Alto-falante" />
      <label className={styles.switchRowLight}>
        <span>
          Redução de ruído
          <small>Remove ventilador, ar-condicionado e chiados.</small>
        </span>
        <input
          type="checkbox"
          role="switch"
          className={styles.switch}
          checked={noise.active || noise.pending}
          disabled={!noise.supported || !noise.microphoneEnabled || noise.pending}
          onChange={(e) => noise.toggle(e.target.checked)}
        />
      </label>
    </>
  );
}

function VideoTab() {
  return (
    <>
      <SelfPreview />
      <DeviceSelect kind="videoinput" label="Câmera" />
    </>
  );
}

function BackgroundTab({
  choice,
  setChoice,
  supported,
  pending,
  hasCamera,
}: {
  choice: BackgroundChoice;
  setChoice: (c: BackgroundChoice) => void;
  supported: boolean;
  pending: boolean;
  hasCamera: boolean;
}) {
  const [category, setCategory] = React.useState(
    choice.type === 'image'
      ? (BACKGROUND_CATEGORIES.find((c) => c.images.some((i) => i.id === choice.id))?.id ?? 'todas')
      : 'todas',
  );
  const images =
    category === 'todas'
      ? BACKGROUND_CATEGORIES.flatMap((c) => c.images)
      : (BACKGROUND_CATEGORIES.find((c) => c.id === category)?.images ?? []);

  const option = (c: BackgroundChoice, content: React.ReactNode, label: string) => (
    <button
      key={c.type === 'image' ? c.id : c.type === 'blur' ? `blur-${c.strength}` : 'none'}
      type="button"
      role="radio"
      aria-checked={sameChoice(choice, c)}
      aria-label={label}
      title={label}
      className={styles.bgOption}
      onClick={() => setChoice(c)}
    >
      {content}
    </button>
  );

  return (
    <>
      <SelfPreview />
      {!supported && <p className={styles.fieldHint}>Seu navegador não suporta efeitos de fundo.</p>}
      {supported && !hasCamera && <p className={styles.fieldHint}>Ligue a câmera para ver o efeito.</p>}
      {pending && <p className={styles.fieldHint}>Aplicando efeito…</p>}

      <div className={styles.fieldLabel}>Desfoque</div>
      <div className={styles.bgGrid} role="radiogroup" aria-label="Desfoque">
        {option(
          { type: 'none' },
          <span className={styles.bgPlain}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M5.6 5.6l12.8 12.8" />
            </svg>
            Nenhum
          </span>,
          'Sem efeito',
        )}
        {option(
          { type: 'blur', strength: 'light' },
          <>
            <img src={backgroundThumb('casa-fi4zn6aawq0')} alt="" style={{ filter: 'blur(2px)' }} />
            <span className={styles.bgTag}>Leve</span>
          </>,
          'Desfoque leve',
        )}
        {option(
          { type: 'blur', strength: 'strong' },
          <>
            <img src={backgroundThumb('casa-fi4zn6aawq0')} alt="" style={{ filter: 'blur(5px)', transform: 'scale(1.15)' }} />
            <span className={styles.bgTag}>Forte</span>
          </>,
          'Desfoque forte',
        )}
      </div>

      <div className={styles.fieldLabel}>Imagens</div>
      <div className={styles.chips} role="tablist" aria-label="Categorias">
        {[{ id: 'todas', label: 'Todas' }, ...BACKGROUND_CATEGORIES].map((c) => (
          <button key={c.id} type="button" role="tab" aria-selected={category === c.id} onClick={() => setCategory(c.id)}>
            {c.label}
          </button>
        ))}
      </div>
      <div className={styles.bgGrid} role="radiogroup" aria-label="Imagens de fundo">
        {images.map((img) =>
          option(
            { type: 'image', id: img.id },
            <img src={backgroundThumb(img.id)} alt="" loading="lazy" />,
            img.label,
          ),
        )}
      </div>
      {/* Warm the browser cache for the selected image */}
      {choice.type === 'image' && <link rel="prefetch" href={backgroundSrc(choice.id)} />}
    </>
  );
}

function RecordingTab() {
  const room = useRoomContext();
  const isRecording = useIsRecording();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string>();
  React.useEffect(() => setBusy(false), [isRecording]);

  const toggle = async () => {
    if (!RECORD_ENDPOINT) return;
    if (room.isE2EEEnabled) {
      setError('Gravação de reuniões criptografadas ainda não é suportada.');
      return;
    }
    setBusy(true);
    setError(undefined);
    const res = await fetch(`${RECORD_ENDPOINT}/${isRecording ? 'stop' : 'start'}?roomName=${encodeURIComponent(room.name)}`);
    if (!res.ok) {
      setBusy(false);
      setError('Não foi possível alterar a gravação. Tente de novo.');
    }
  };

  return (
    <>
      <p className={styles.fieldHint}>
        {isRecording ? 'Esta reunião está sendo gravada.' : 'Nenhuma gravação em andamento.'}
      </p>
      {error && <p className={styles.fieldError}>{error}</p>}
      <button type="button" className={styles.copyWide} disabled={busy} onClick={toggle}>
        {busy ? 'Aguarde…' : isRecording ? 'Parar gravação' : 'Iniciar gravação'}
      </button>
    </>
  );
}
