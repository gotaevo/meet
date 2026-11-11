'use client';

import * as React from 'react';
import { CloseIcon } from './icons';
import { LayoutMode, LayoutPrefs, TILE_STEPS } from './layout';
import styles from '../../styles/Call.module.css';

const MODES: { value: LayoutMode; label: string; hint?: string }[] = [
  { value: 'auto', label: 'Automático', hint: 'Muda sozinho conforme a chamada' },
  { value: 'grid', label: 'Mosaico' },
  { value: 'spotlight', label: 'Destaque' },
  { value: 'sidebar', label: 'Barra lateral' },
];

/** Tiny drawings of each layout, in the brand colors. */
function Preview({ mode }: { mode: LayoutMode }) {
  const cell = (key: string, style: React.CSSProperties) => <span key={key} style={style} />;
  const cells: React.ReactNode[] = [];
  if (mode === 'auto') {
    cells.push(cell('a', { gridArea: '1 / 1 / 3 / 3' }), cell('b', { gridArea: '1 / 3 / 2 / 4' }), cell('c', { gridArea: '2 / 3 / 3 / 4' }));
  } else if (mode === 'grid') {
    for (let i = 0; i < 6; i++) cells.push(cell(String(i), {}));
  } else if (mode === 'spotlight') {
    cells.push(cell('a', { gridArea: '1 / 1 / 3 / 4' }));
  } else {
    cells.push(cell('a', { gridArea: '1 / 1 / 3 / 3' }), cell('b', { gridArea: '1 / 3 / 2 / 4' }), cell('c', { gridArea: '2 / 3 / 3 / 4' }));
  }
  return (
    <span className={styles.layoutPreview} data-mode={mode} aria-hidden="true">
      {cells}
    </span>
  );
}

export function LayoutDialog({
  prefs,
  onChange,
  onClose,
}: {
  prefs: LayoutPrefs;
  onChange: (prefs: LayoutPrefs) => void;
  onClose: () => void;
}) {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const stepIndex = Math.max(0, TILE_STEPS.findIndex((s) => s >= prefs.maxTiles));

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    dialogRef.current?.querySelector<HTMLInputElement>('input:checked')?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="layout-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.inviteHeader}>
          <h2 id="layout-title">Ajustar visualização</h2>
          <button type="button" className={styles.iconButtonLight} aria-label="Fechar" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <p className={styles.dialogNote}>Sua escolha fica salva para as próximas reuniões.</p>

        <fieldset className={styles.modeList}>
          <legend className={styles.srOnly}>Layout</legend>
          {MODES.map((m) => (
            <label key={m.value} className={styles.modeOption} data-checked={prefs.mode === m.value || undefined}>
              <input
                type="radio"
                name="layout-mode"
                value={m.value}
                checked={prefs.mode === m.value}
                onChange={() => onChange({ ...prefs, mode: m.value })}
              />
              <span className={styles.modeText}>
                {m.label}
                {m.hint && <small>{m.hint}</small>}
              </span>
              <Preview mode={m.value} />
            </label>
          ))}
        </fieldset>

        <div className={styles.dialogSection}>
          <label htmlFor="max-tiles" className={styles.dialogLabel}>
            Blocos
            <small>Máximo de pessoas na tela ao mesmo tempo: {TILE_STEPS[stepIndex]}</small>
          </label>
          <input
            id="max-tiles"
            type="range"
            min={0}
            max={TILE_STEPS.length - 1}
            step={1}
            value={stepIndex}
            onChange={(e) => onChange({ ...prefs, maxTiles: TILE_STEPS[Number(e.target.value)] })}
            className={styles.range}
          />
        </div>

        <label className={styles.switchRow}>
          <span>Ocultar blocos sem vídeo</span>
          <input
            type="checkbox"
            role="switch"
            checked={prefs.hideNoVideo}
            onChange={(e) => onChange({ ...prefs, hideNoVideo: e.target.checked })}
            className={styles.switch}
          />
        </label>
      </div>
    </div>
  );
}
