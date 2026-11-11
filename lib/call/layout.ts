/**
 * Pure layout rules for the call screen (no React, so they are unit-testable).
 *
 * "auto" behaves like Google Meet:
 *  - alone            → spotlight on yourself
 *  - two people       → the other person big, you in a small floating tile
 *  - three or more    → grid
 *  - someone presents → the shared screen big, cameras in a side strip
 *  - a pinned tile    → that tile big, everyone else in the side strip
 */
export type LayoutMode = 'auto' | 'grid' | 'spotlight' | 'sidebar';
export type LayoutKind = 'grid' | 'spotlight' | 'sidebar' | 'duo';

export const TILE_STEPS = [6, 9, 16, 25, 49] as const;

export interface LayoutPrefs {
  mode: LayoutMode;
  maxTiles: number;
  hideNoVideo: boolean;
}

export const DEFAULT_LAYOUT_PREFS: LayoutPrefs = { mode: 'auto', maxTiles: 16, hideNoVideo: false };

export interface LayoutItem {
  id: string;
  isLocal: boolean;
  isScreen: boolean;
  hasVideo: boolean;
  /** ms timestamp of the last time this participant spoke (0 = never). */
  lastSpokeAt: number;
}

export interface LayoutResult {
  kind: LayoutKind;
  /** Big tile (spotlight, duo, sidebar). */
  main?: string;
  /** Grid tiles, or the side strip. */
  others: string[];
  /** Your own small floating tile (duo / spotlight on someone else). */
  selfPip?: string;
  /** Tiles that did not fit in `maxTiles` ("+N"). */
  overflow: number;
}

export function computeLayout(
  items: LayoutItem[],
  prefs: LayoutPrefs,
  pinnedId?: string,
): LayoutResult {
  const shares = items.filter((i) => i.isScreen);
  const cams = items.filter((i) => !i.isScreen);
  const pinned = pinnedId ? items.find((i) => i.id === pinnedId) : undefined;

  let visibleCams = prefs.hideNoVideo ? cams.filter((c) => c.hasVideo) : cams;
  if (visibleCams.length === 0 && shares.length === 0) visibleCams = cams;

  const self = cams.find((c) => c.isLocal);

  let kind: LayoutKind;
  if (prefs.mode === 'auto') {
    if (pinned || shares.length > 0) kind = 'sidebar';
    else if (visibleCams.length <= 1) kind = 'spotlight';
    else if (visibleCams.length === 2 && self && visibleCams.includes(self)) kind = 'duo';
    else kind = 'grid';
  } else {
    kind = prefs.mode;
  }

  if (kind === 'grid') {
    const tiles = [...shares, ...visibleCams];
    const { kept, overflow } = cap(tiles, prefs.maxTiles);
    return { kind, others: kept.map((t) => t.id), overflow };
  }

  const main = pickMain(shares, visibleCams, pinned);

  if (kind === 'sidebar') {
    const rest = [...shares, ...visibleCams].filter((t) => t.id !== main?.id);
    const { kept, overflow } = cap(rest, Math.max(1, prefs.maxTiles - 1));
    return { kind, main: main?.id, others: kept.map((t) => t.id), overflow };
  }

  // spotlight / duo
  const selfPip = self && main && main.id !== self.id ? self.id : undefined;
  return { kind, main: main?.id, others: [], selfPip, overflow: 0 };
}

function pickMain(shares: LayoutItem[], cams: LayoutItem[], pinned?: LayoutItem) {
  if (pinned) return pinned;
  const share = shares.find((s) => !s.isLocal) ?? shares[0];
  if (share) return share;
  const remotes = cams.filter((c) => !c.isLocal);
  const speaker = [...remotes].sort((a, b) => b.lastSpokeAt - a.lastSpokeAt)[0];
  return speaker ?? cams[0];
}

/** Keeps the most recent speakers when there are more tiles than fit; screens always stay. */
function cap(tiles: LayoutItem[], max: number) {
  if (tiles.length <= max) return { kept: tiles, overflow: 0 };
  const keepCount = Math.max(1, max - 1); // one slot goes to the "+N" tile
  const ranked = [...tiles].sort(
    (a, b) => Number(b.isScreen) - Number(a.isScreen) || b.lastSpokeAt - a.lastSpokeAt,
  );
  const keep = new Set(ranked.slice(0, keepCount).map((t) => t.id));
  const kept = tiles.filter((t) => keep.has(t.id)); // original order, so tiles don't jump around
  return { kept, overflow: tiles.length - kept.length };
}

/** Columns that give the biggest 4:3 tiles (video is cropped to fill) for `count` tiles in a `width`×`height` box. */
export function gridColumns(count: number, width: number, height: number, gap = 12) {
  if (count <= 1 || width <= 0 || height <= 0) return 1;
  let best = 1;
  let bestSize = 0;
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const w = (width - gap * (cols - 1)) / cols;
    const h = (height - gap * (rows - 1)) / rows;
    const size = Math.min(w, (h * 4) / 3);
    if (size > bestSize) {
      bestSize = size;
      best = cols;
    }
  }
  return best;
}
