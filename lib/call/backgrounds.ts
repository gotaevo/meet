/**
 * Virtual background catalog. Photos from Unsplash (Unsplash License: free to use,
 * including commercially, no attribution required). Credits in public/backgrounds/CREDITS.md.
 * Each image is 1920×1080 in /backgrounds/<id>.jpg with a 320×180 thumbnail in /backgrounds/thumbs.
 */
export interface BackgroundImage {
  id: string;
  label: string;
}

export interface BackgroundCategory {
  id: string;
  label: string;
  images: BackgroundImage[];
}

export const BACKGROUND_CATEGORIES: BackgroundCategory[] = [
  {
    id: 'escritorio',
    label: 'Escritório',
    images: [
      { id: 'escritorio-hsmvmgngmwm', label: 'Mesa na janela' },
      { id: 'escritorio-k1xmklq7haw', label: 'Home office com plantas' },
      { id: 'escritorio-xtmez98cqam', label: 'Escritório claro' },
      { id: 'escritorio-xqh-rlfjvx4', label: 'Setup de trabalho' },
      { id: 'escritorio-blihvfxbi9s', label: 'Escrivaninha' },
    ],
  },
  {
    id: 'casa',
    label: 'Casa',
    images: [
      { id: 'casa-fi4zn6aawq0', label: 'Sala com sofá de couro' },
      { id: 'casa-4itqffuifzc', label: 'Sala com lareira' },
      { id: 'casa-2jbmnqzxeds', label: 'Sala clara' },
      { id: 'casa-8czis0mx55e', label: 'Sala com plantas' },
      { id: 'casa-f03hf_pnes0', label: 'Poltrona na janela' },
    ],
  },
  {
    id: 'estante',
    label: 'Estante e café',
    images: [
      { id: 'estante-g-4wx5tznue', label: 'Estante colorida' },
      { id: 'estante-h9_y2iq8yhq', label: 'Livros' },
      { id: 'estante-fcty7_xt2wy', label: 'Café à noite' },
    ],
  },
  {
    id: 'natureza',
    label: 'Natureza',
    images: [
      { id: 'natureza-1kcgpq1ap9e', label: 'Lago ao pôr do sol' },
      { id: 'natureza-9qkqcrzgma8', label: 'Floresta e lago' },
      { id: 'natureza-tbw_kqe3cbg', label: 'Estrada na montanha' },
    ],
  },
  {
    id: 'praia',
    label: 'Praia',
    images: [
      { id: 'praia-kxkzp4e7gak', label: 'Praia com pedras' },
      { id: 'praia-ox_6m68vqfq', label: 'Coqueiros' },
      { id: 'praia-v1hb2slp-80', label: 'Enseada vista de cima' },
    ],
  },
  {
    id: 'cidade',
    label: 'Cidade',
    images: [
      { id: 'cidade-zwrcxgkv30w', label: 'Cidade à noite' },
      { id: 'cidade-ukvkevmziti', label: 'Skyline iluminado' },
    ],
  },
];

export const backgroundSrc = (id: string) => `/backgrounds/${id}.jpg`;
export const backgroundThumb = (id: string) => `/backgrounds/thumbs/${id}.jpg`;

export type BackgroundChoice =
  | { type: 'none' }
  | { type: 'blur'; strength: 'light' | 'strong' }
  | { type: 'image'; id: string };

export const BLUR_RADIUS = { light: 6, strong: 18 } as const;

export function sameChoice(a: BackgroundChoice, b: BackgroundChoice) {
  if (a.type !== b.type) return false;
  if (a.type === 'blur' && b.type === 'blur') return a.strength === b.strength;
  if (a.type === 'image' && b.type === 'image') return a.id === b.id;
  return true;
}

/** Validates a saved choice (images may be removed from the catalog over time). */
export function parseChoice(value: unknown): BackgroundChoice {
  const v = value as Partial<BackgroundChoice> | null;
  if (v?.type === 'blur' && (v.strength === 'light' || v.strength === 'strong')) {
    return { type: 'blur', strength: v.strength };
  }
  if (v?.type === 'image' && typeof (v as { id?: unknown }).id === 'string') {
    const id = (v as { id: string }).id;
    if (BACKGROUND_CATEGORIES.some((c) => c.images.some((i) => i.id === id))) return { type: 'image', id };
  }
  return { type: 'none' };
}
