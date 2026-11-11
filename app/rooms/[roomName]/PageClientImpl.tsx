'use client';


import React from 'react';
import { decodePassphrase } from '@/lib/client-utils';
import { DebugMode } from '@/lib/Debug';
import { KeyboardShortcuts } from '@/lib/KeyboardShortcuts';
import { RecordingIndicator } from '@/lib/RecordingIndicator';
import { CallView } from '@/lib/call/CallView';
import { TranslateLiveKit } from '@/lib/TranslateLiveKit';
import { JoinScreen } from '@/lib/JoinScreen';
import { ConnectionDetails } from '@/lib/types';
import {
  LocalUserChoices,
  RoomContext,
} from '@livekit/components-react';
import {
  ExternalE2EEKeyProvider,
  RoomOptions,
  VideoCodec,
  VideoPresets,
  Room,
  DeviceUnsupportedError,
  RoomConnectOptions,
  RoomEvent,
  TrackPublishDefaults,
  VideoCaptureOptions,
} from 'livekit-client';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useSetupE2EE } from '@/lib/useSetupE2EE';
import { useLowCPUOptimizer } from '@/lib/usePerfomanceOptimiser';

const CONN_DETAILS_ENDPOINT =
  process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT ?? '/api/connection-details';

export function PageClientImpl(props: {
  roomName: string;
  serverUrl?: string;
  region?: string;
  hq: boolean;
  codec: VideoCodec;
  singlePeerConnection: boolean;
}) {
  const [preJoinChoices, setPreJoinChoices] = React.useState<LocalUserChoices | undefined>(
    undefined,
  );
  const [connectionDetails, setConnectionDetails] = React.useState<ConnectionDetails | undefined>(
    undefined,
  );

  // DNS and TLS state is cached by the browser, not the Room, so warming up on a separate Room
  // speeds up the conference Room's connect.
  React.useEffect(() => {
    if (props.serverUrl) {
      new Room().prepareConnection(props.serverUrl);
    }
  }, [props.serverUrl]);

  const handlePreJoinSubmit = React.useCallback(async (values: LocalUserChoices) => {
    setPreJoinChoices(values);
    const url = new URL(CONN_DETAILS_ENDPOINT, window.location.origin);
    url.searchParams.append('roomName', props.roomName);
    url.searchParams.append('participantName', values.username);
    if (props.region) {
      url.searchParams.append('region', props.region);
    }
    const connectionDetailsResp = await fetch(url.toString());
    const connectionDetailsData = await connectionDetailsResp.json();
    setConnectionDetails(connectionDetailsData);
  }, []);
  // The join screen already tells the user when camera/mic are blocked.
  const handlePreJoinError = React.useCallback((e: any) => console.warn(e), []);

  return (
    <main data-lk-theme="default" style={{ height: '100%' }}>
      <TranslateLiveKit />
      {connectionDetails === undefined || preJoinChoices === undefined ? (
        <JoinScreen
          roomName={props.roomName}
          onSubmit={handlePreJoinSubmit}
          onError={handlePreJoinError}
        />
      ) : (
        <VideoConferenceComponent
          roomName={props.roomName}
          connectionDetails={connectionDetails}
          userChoices={preJoinChoices}
          options={{
            codec: props.codec,
            hq: props.hq,
            singlePeerConnection: props.singlePeerConnection,
          }}
        />
      )}
    </main>
  );
}

function VideoConferenceComponent(props: {
  roomName: string;
  userChoices: LocalUserChoices;
  connectionDetails: ConnectionDetails;
  options: {
    hq: boolean;
    codec: VideoCodec;
    singlePeerConnection: boolean;
  };
}) {
  const keyProvider = new ExternalE2EEKeyProvider();
  const { worker, e2eePassphrase } = useSetupE2EE();
  const e2eeEnabled = !!(e2eePassphrase && worker);

  const [e2eeSetupComplete, setE2eeSetupComplete] = React.useState(false);

  const roomOptions = React.useMemo((): RoomOptions => {
    let videoCodec: VideoCodec | undefined = props.options.codec ? props.options.codec : 'vp9';
    if (e2eeEnabled && (videoCodec === 'av1' || videoCodec === 'vp9')) {
      videoCodec = undefined;
    }
    const videoCaptureDefaults: VideoCaptureOptions = {
      deviceId: props.userChoices.videoDeviceId ?? undefined,
      resolution: props.options.hq ? VideoPresets.h2160 : VideoPresets.h720,
    };
    const publishDefaults: TrackPublishDefaults = {
      dtx: false,
      videoSimulcastLayers: props.options.hq
        ? [VideoPresets.h1080, VideoPresets.h720]
        : [VideoPresets.h540, VideoPresets.h216],
      red: !e2eeEnabled,
      videoCodec,
      // Screen share: high bitrate and no simulcast, so text/UI stays sharp
      screenShareEncoding: { maxBitrate: 12_000_000, maxFramerate: 30 },
      screenShareSimulcastLayers: [],
    };
    return {
      videoCaptureDefaults: videoCaptureDefaults,
      publishDefaults: publishDefaults,
      audioCaptureDefaults: {
        deviceId: props.userChoices.audioDeviceId ?? undefined,
      },
      adaptiveStream: true,
      dynacast: true,
      e2ee: keyProvider && worker && e2eeEnabled ? { keyProvider, worker } : undefined,
      singlePeerConnection: props.options.singlePeerConnection,
    };
  }, [props.userChoices, props.options.hq, props.options.codec]);

  const room = React.useMemo(() => {
    const r = new Room(roomOptions);
    // Default capture options for screen share: up to 1440p30 and 'detail' hint
    // (keeps resolution/sharpness over framerate when bandwidth drops).
    const original = r.localParticipant.setScreenShareEnabled.bind(r.localParticipant);
    r.localParticipant.setScreenShareEnabled = (enabled, captureOptions, publishOptions) =>
      original(
        enabled,
        {
          resolution: { width: 2560, height: 1440, frameRate: 30 },
          contentHint: 'detail',
          ...captureOptions,
        },
        publishOptions,
      );
    return r;
  }, []);

  React.useEffect(() => {
    if (e2eeEnabled) {
      keyProvider
        .setKey(decodePassphrase(e2eePassphrase))
        .then(() => {
          room.setE2EEEnabled(true).catch((e) => {
            if (e instanceof DeviceUnsupportedError) {
              alert(
                `Você está tentando entrar em uma reunião criptografada, mas seu navegador não oferece suporte. Atualize para a versão mais recente e tente novamente.`,
              );
              console.error(e);
            } else {
              throw e;
            }
          });
        })
        .then(() => setE2eeSetupComplete(true));
    } else {
      setE2eeSetupComplete(true);
    }
  }, [e2eeEnabled, room, e2eePassphrase]);

  const connectOptions = React.useMemo((): RoomConnectOptions => {
    return {
      autoSubscribe: true,
    };
  }, []);

  React.useEffect(() => {
    room.on(RoomEvent.Disconnected, handleOnLeave);
    room.on(RoomEvent.EncryptionError, handleEncryptionError);
    room.on(RoomEvent.MediaDevicesError, handleDeviceError);

    if (e2eeSetupComplete) {
      room
        .connect(
          props.connectionDetails.serverUrl,
          props.connectionDetails.participantToken,
          connectOptions,
        )
        .catch((error) => {
          handleError(error);
        });
      if (props.userChoices.videoEnabled) {
        room.localParticipant.setCameraEnabled(true).catch(() => {
          // Reported through RoomEvent.MediaDevicesError (handleDeviceError).
        });
      }
      if (props.userChoices.audioEnabled) {
        room.localParticipant.setMicrophoneEnabled(true).catch(() => {
          // Reported through RoomEvent.MediaDevicesError (handleDeviceError).
        });
      }
    }
    return () => {
      room.off(RoomEvent.Disconnected, handleOnLeave);
      room.off(RoomEvent.EncryptionError, handleEncryptionError);
      room.off(RoomEvent.MediaDevicesError, handleDeviceError);
    };
  }, [e2eeSetupComplete, room, props.connectionDetails, props.userChoices]);

  const lowPowerMode = useLowCPUOptimizer(room);

  const router = useRouter();
  const handleOnLeave = React.useCallback(() => router.push('/'), [router]);
  const handleError = React.useCallback((error: Error) => {
    console.error(error);
    alert(`Ocorreu um erro inesperado. Veja o console para mais detalhes: ${error.message}`);
  }, []);
  /**
   * Camera / microphone / screen errors. Cancelling the screen-share picker is a normal
   * user action (NotAllowedError with no device kind): ignore it. Blocked devices get a
   * clear message instead of the generic "unexpected error" alert.
   */
  const handleDeviceError = React.useCallback((error: Error, kind?: MediaDeviceKind) => {
    const denied = error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError';
    if (denied && !kind) return;
    console.warn(error);
    const device = kind === 'audioinput' ? 'o microfone' : kind === 'videoinput' ? 'a câmera' : 'o dispositivo';
    const message = denied
      ? `O navegador bloqueou ${device}. Libere o acesso nas permissões do site (ícone ao lado do endereço).`
      : error.name === 'NotReadableError'
        ? `Não foi possível usar ${device}: pode estar em uso por outro aplicativo.`
        : error.name === 'NotFoundError'
          ? `Não encontramos ${device} neste computador.`
          : `Problema com ${device}: ${error.message}`;
    toast.error(message, { id: `device-${kind}-${error.name}`, duration: 8000 });
  }, []);
  const handleEncryptionError = React.useCallback((error: Error) => {
    console.error(error);
    alert(
      `Ocorreu um erro inesperado de criptografia. Veja o console para mais detalhes: ${error.message}`,
    );
  }, []);

  React.useEffect(() => {
    if (lowPowerMode) {
      console.warn('Low power mode enabled');
    }
  }, [lowPowerMode]);

  return (
    <div className="lk-room-container">
      <RoomContext.Provider value={room}>
        <KeyboardShortcuts />
        <CallView roomName={props.roomName} />
        <DebugMode />
        <RecordingIndicator />
      </RoomContext.Provider>
    </div>
  );
}
