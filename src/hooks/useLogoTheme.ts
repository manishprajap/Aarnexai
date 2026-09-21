import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import logo from '../assets/aarna-logo.png';

/**
 * Reads the logo image and builds a palette from it:
 *  - background = average of the four corners (so the header blends with the logo)
 *  - accent     = the most saturated color in the logo that isn't the background
 *
 * The result is returned as CSS variables. Put them on <IonPage style={...}>
 * (and on any IonModal / IonPopover, because overlays live outside the page).
 */

type RGB = { r: number; g: number; b: number };
type Palette = { bg: RGB; accent: RGB };

const BLACK: RGB = { r: 0, g: 0, b: 0 };
const WHITE: RGB = { r: 255, g: 255, b: 255 };
const FALLBACK_ACCENT: RGB = { r: 23, g: 168, b: 152 };
const CACHE_KEY = 'aarna-logo-palette';

const mix = (a: RGB, b: RGB, t: number): RGB => ({
  r: Math.round(a.r + (b.r - a.r) * t),
  g: Math.round(a.g + (b.g - a.g) * t),
  b: Math.round(a.b + (b.b - a.b) * t),
});
const css = ({ r, g, b }: RGB) => `rgb(${r}, ${g}, ${b})`;
const luminance = ({ r, g, b }: RGB) => 0.299 * r + 0.587 * g + 0.114 * b;
const distance = (a: RGB, b: RGB) => Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);

function analyse(img: HTMLImageElement): Palette | null {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);

  const at = (x: number, y: number): RGB => {
    const i = (y * size + x) * 4;
    return { r: data[i], g: data[i + 1], b: data[i + 2] };
  };

  // Background: average of the four corners
  const corners = [at(1, 1), at(size - 2, 1), at(1, size - 2), at(size - 2, size - 2)];
  const bg: RGB = {
    r: Math.round(corners.reduce((s, c) => s + c.r, 0) / corners.length),
    g: Math.round(corners.reduce((s, c) => s + c.g, 0) / corners.length),
    b: Math.round(corners.reduce((s, c) => s + c.b, 0) / corners.length),
  };

  // Accent: most saturated color bucket that differs from the background
  const buckets = new Map<number, { n: number; r: number; g: number; b: number; sat: number }>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const px: RGB = { r: data[i], g: data[i + 1], b: data[i + 2] };
    if (distance(px, bg) < 70) continue;

    const sat = Math.max(px.r, px.g, px.b) - Math.min(px.r, px.g, px.b);
    if (sat < 40) continue;

    const key = ((px.r >> 5) << 6) | ((px.g >> 5) << 3) | (px.b >> 5);
    const cur = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0, sat: 0 };
    cur.n += 1;
    cur.r += px.r;
    cur.g += px.g;
    cur.b += px.b;
    cur.sat += sat;
    buckets.set(key, cur);
  }

  const candidates = Array.from(buckets.values());
  let best = candidates[0];
  for (const c of candidates) {
    if (c.sat > best.sat) best = c;
  }

  const accent: RGB = best
    ? {
        r: Math.round(best.r / best.n),
        g: Math.round(best.g / best.n),
        b: Math.round(best.b / best.n),
      }
    : FALLBACK_ACCENT;

  return { bg, accent };
}

function readCache(): Palette | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Palette) : null;
  } catch {
    return null;
  }
}

export function useLogoTheme(): CSSProperties {
  // Cached palette avoids a color flash on repeat visits
  const [palette, setPalette] = useState<Palette | null>(readCache);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      try {
        const result = analyse(img);
        if (!result) return;
        setPalette(result);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(result));
        } catch {
          /* storage unavailable */
        }
      } catch {
        /* keep CSS fallback colors */
      }
    };
    img.src = logo;
  }, []);

  if (!palette) return {};

  const { bg } = palette;
  const bgIsDark = luminance(bg) < 140;

  // Keep the accent visible on the dark hero card
  const brand = luminance(palette.accent) < 90 ? mix(palette.accent, WHITE, 0.3) : palette.accent;

  const ink = mix(brand, BLACK, 0.78);
  const brandText = luminance(brand) > 130 ? mix(brand, BLACK, 0.4) : brand;
  const eyebrow = bgIsDark ? mix(brand, WHITE, 0.45) : brandText;

  return {
    '--logo-bg': css(bg),
    '--page-bg': css(bg),
    '--on-bg': bgIsDark ? '#ffffff' : css(ink),
    '--on-bg-muted': bgIsDark ? 'rgba(255,255,255,0.72)' : 'rgba(13,30,28,0.62)',
    '--eyebrow': css(eyebrow),
    '--edge': bgIsDark ? 'rgba(255,255,255,0.14)' : 'rgba(13,30,28,0.10)',
    '--edge-strong': bgIsDark ? 'rgba(255,255,255,0.38)' : 'rgba(13,30,28,0.28)',

    '--brand': css(brand),
    '--brand-light': css(mix(brand, WHITE, 0.25)),
    '--brand-mid': css(mix(brand, BLACK, 0.5)),
    '--brand-deep': css(mix(brand, BLACK, 0.68)),
    '--brand-soft': css(mix(brand, WHITE, 0.86)),
    '--brand-text': css(brandText),
    '--on-brand': luminance(brand) > 160 ? '#10201f' : '#ffffff',
    '--ink': css(ink),
  } as CSSProperties;
}