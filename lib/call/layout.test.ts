import { describe, expect, it } from 'vitest';
import { computeLayout, DEFAULT_LAYOUT_PREFS, gridColumns, LayoutItem } from './layout';

const cam = (id: string, extra: Partial<LayoutItem> = {}): LayoutItem => ({
  id,
  isLocal: false,
  isScreen: false,
  hasVideo: true,
  lastSpokeAt: 0,
  ...extra,
});
const me = cam('me', { isLocal: true });
const auto = DEFAULT_LAYOUT_PREFS;

describe('computeLayout (auto)', () => {
  it('alone: spotlight on yourself, no self pip', () => {
    expect(computeLayout([me], auto)).toMatchObject({ kind: 'spotlight', main: 'me', selfPip: undefined });
  });

  it('two people: the other person big, you floating', () => {
    expect(computeLayout([me, cam('ana')], auto)).toMatchObject({
      kind: 'duo',
      main: 'ana',
      selfPip: 'me',
    });
  });

  it('three or more: grid with everyone', () => {
    const r = computeLayout([me, cam('ana'), cam('rafa')], auto);
    expect(r.kind).toBe('grid');
    expect(r.others).toEqual(['me', 'ana', 'rafa']);
  });

  it('screen share: share big, cameras in the side strip (remote share preferred)', () => {
    const r = computeLayout(
      [me, cam('ana'), cam('me:screen', { isLocal: true, isScreen: true }), cam('ana:screen', { isScreen: true })],
      auto,
    );
    expect(r.kind).toBe('sidebar');
    expect(r.main).toBe('ana:screen');
    expect(r.others).toEqual(['me:screen', 'me', 'ana']);
  });

  it('pinned tile goes big in the sidebar layout', () => {
    const r = computeLayout([me, cam('ana'), cam('rafa')], auto, 'rafa');
    expect(r).toMatchObject({ kind: 'sidebar', main: 'rafa', others: ['me', 'ana'] });
  });

  it('spotlight picks the most recent remote speaker', () => {
    const r = computeLayout(
      [me, cam('ana', { lastSpokeAt: 10 }), cam('rafa', { lastSpokeAt: 20 })],
      { ...auto, mode: 'spotlight' },
    );
    expect(r).toMatchObject({ kind: 'spotlight', main: 'rafa', selfPip: 'me' });
  });
});

describe('computeLayout (limits and filters)', () => {
  it('caps the grid and keeps recent speakers, reporting the overflow', () => {
    const people = [me, ...Array.from({ length: 9 }, (_, i) => cam(`p${i}`, { lastSpokeAt: i }))];
    const r = computeLayout(people, { ...auto, mode: 'grid', maxTiles: 6 });
    expect(r.others).toHaveLength(5);
    expect(r.overflow).toBe(5);
    expect(r.others).toEqual(['p4', 'p5', 'p6', 'p7', 'p8']);
  });

  it('hides tiles without video when asked', () => {
    const r = computeLayout([me, cam('ana', { hasVideo: false }), cam('rafa'), cam('bia')], {
      ...auto,
      hideNoVideo: true,
    });
    expect(r.others).toEqual(['me', 'rafa', 'bia']);
  });
});

describe('gridColumns', () => {
  it('fits tiles in a wide box', () => {
    expect(gridColumns(1, 1200, 700)).toBe(1);
    expect(gridColumns(2, 1200, 700)).toBe(2);
    expect(gridColumns(4, 1200, 700)).toBe(2);
    expect(gridColumns(9, 1200, 700)).toBe(3);
  });
  it('stacks on a tall (phone) box', () => {
    expect(gridColumns(2, 380, 700)).toBe(1);
  });
});
