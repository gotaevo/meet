import type { AudioProcessorOptions, Track, TrackProcessor } from 'livekit-client';

/**
 * RNNoise (open source, runs fully in the browser, no LiveKit Cloud needed) as a
 * LiveKit audio track processor. Removes stationary noise such as fans, AC and hum.
 *
 * Assets are served from /public/noise (copied from @sapphi-red/web-noise-suppressor).
 */
export const RNNOISE_PROCESSOR_NAME = 'rnnoise';

const WORKLET_URL = '/noise/rnnoiseWorklet.js';
const WASM_URL = '/noise/rnnoise.wasm';
const WASM_SIMD_URL = '/noise/rnnoise_simd.wasm';

let wasmPromise: Promise<ArrayBuffer> | undefined;

export function isRnnoiseSupported() {
  return (
    typeof window !== 'undefined' &&
    typeof AudioWorkletNode !== 'undefined' &&
    typeof WebAssembly !== 'undefined'
  );
}

export class RnnoiseProcessor implements TrackProcessor<Track.Kind.Audio, AudioProcessorOptions> {
  readonly name = RNNOISE_PROCESSOR_NAME;
  processedTrack?: MediaStreamTrack;

  private ctx?: AudioContext;
  private source?: MediaStreamAudioSourceNode;
  private node?: AudioWorkletNode & { destroy(): void };
  private destination?: MediaStreamAudioDestinationNode;

  init = async (opts: AudioProcessorOptions) => {
    await this.setup(opts.track);
  };

  restart = async (opts: AudioProcessorOptions) => {
    this.teardownGraph();
    await this.setup(opts.track);
  };

  destroy = async () => {
    this.teardownGraph();
    this.processedTrack = undefined;
    await this.ctx?.close().catch(() => {});
    this.ctx = undefined;
  };

  private async setup(track: MediaStreamTrack) {
    const { RnnoiseWorkletNode, loadRnnoise } = await import('@sapphi-red/web-noise-suppressor');

    if (!this.ctx) {
      // RNNoise only works at 48 kHz; the browser resamples the mic if needed.
      this.ctx = new AudioContext({ sampleRate: 48000, latencyHint: 'interactive' });
      await this.ctx.audioWorklet.addModule(WORKLET_URL);
    }
    wasmPromise ??= loadRnnoise({ url: WASM_URL, simdUrl: WASM_SIMD_URL });
    const wasmBinary = await wasmPromise;
    if (this.ctx.state === 'suspended') await this.ctx.resume().catch(() => {});

    this.source = this.ctx.createMediaStreamSource(new MediaStream([track]));
    this.node = new RnnoiseWorkletNode(this.ctx, { maxChannels: 1, wasmBinary });
    this.destination = this.ctx.createMediaStreamDestination();
    this.destination.channelCount = 1;
    this.source.connect(this.node).connect(this.destination);
    this.processedTrack = this.destination.stream.getAudioTracks()[0];
  }

  private teardownGraph() {
    try {
      this.source?.disconnect();
      this.node?.disconnect();
      this.node?.destroy();
    } catch {}
    this.source = undefined;
    this.node = undefined;
    this.destination = undefined;
  }
}
