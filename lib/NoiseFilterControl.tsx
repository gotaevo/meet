import React from 'react';

export function NoiseFilterControl({
  enabled,
  pending,
  supported,
  onToggle,
  microphoneEnabled = true,
  failed = false,
}: {
  enabled: boolean;
  pending: boolean;
  supported: boolean;
  onToggle: (value: boolean) => void;
  microphoneEnabled?: boolean;
  /** The participant turned it on but the filter could not start. */
  failed?: boolean;
}) {
  const label = !supported
    ? 'Redução de ruído indisponível neste navegador'
    : !microphoneEnabled
      ? 'Ative o microfone para usar a redução de ruído'
      : pending
        ? 'Aplicando redução de ruído...'
        : failed
          ? 'Não foi possível ativar a redução de ruído (clique para desligar)'
          : `${enabled ? 'Desativar' : 'Ativar'} redução de ruído`;
  return (
    <button
      type="button"
      className="lk-button noise-filter-button"
      aria-label={label}
      title={label}
      aria-pressed={enabled}
      data-failed={failed || undefined}
      disabled={pending || !supported || !microphoneEnabled}
      onClick={() => onToggle(!enabled)}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M3 10v4M7 7v10M11 4v16M15 8v8M19 10v4M22 11v2" />
      </svg>
      <span>{pending ? 'Ruído…' : enabled ? 'Ruído: on' : 'Ruído: off'}</span>
    </button>
  );
}
