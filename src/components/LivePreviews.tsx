import React, { useEffect, useRef } from 'react';
import { drawCharacterArtwork, drawItemArtwork } from '../game/artwork';
import { getRotatedSize, ITEM_MAP } from '../game/catalog';
import { TILE } from '../game/constants';
import { CharacterId, ItemId } from '../game/types';

type TickListener = (timeSec: number) => void;
const listeners = new Set<TickListener>();
let rafId: number | null = null;
const startEpoch = performance.now();

function startSharedTicker(): void {
  if (rafId !== null) return;
  const loop = (now: number) => {
    const t = (now - startEpoch) / 1000;
    for (const cb of listeners) cb(t);
    if (listeners.size > 0) {
      rafId = window.requestAnimationFrame(loop);
    } else {
      rafId = null;
    }
  };
  rafId = window.requestAnimationFrame(loop);
}

function subscribeTicker(cb: TickListener): () => void {
  listeners.add(cb);
  startSharedTicker();
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && rafId !== null) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
  };
}

interface ItemLivePreviewProps {
  itemId: ItemId;
  width?: number;
  height?: number;
  rot?: 0 | 1 | 2 | 3;
  flipX?: boolean;
}

export const ItemLivePreview: React.FC<ItemLivePreviewProps> = ({
  itemId,
  width = 120,
  height = 76,
  rot = 0,
  flipX = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    const def = ITEM_MAP[itemId];
    const { w, h } = getRotatedSize(def, def.rotatable ? rot : 0);

    // Reserve extra room for spikes, flame, punch arm, projectiles, moving rail, wrecking ball
    const padX =
      itemId === 'flame_thrower' ||
      itemId === 'punch_glove' ||
      itemId === 'crossbow' ||
      itemId === 'hockey_shooter' ||
      itemId === 'fire_tennis' ||
      itemId === 'paper_plane' ||
      itemId === 'fan'
        ? 44
        : itemId === 'moving_saw' || itemId === 'moving_platform' || itemId === 'wrecking_ball'
          ? 28
          : 16;
    const padY =
      itemId === 'wrecking_ball'
        ? 40
        : itemId === 'spike_strip' ||
            itemId === 'flip_spike' ||
            itemId === 'falling_spike' ||
            itemId === 'spring_pad' ||
            itemId === 'bomb' ||
            itemId === 'mega_bomb'
          ? 22
          : 14;

    const itemPxW = w * TILE;
    const itemPxH = h * TILE;
    const totalW = itemPxW + padX * 2;
    const totalH = itemPxH + padY * 2;
    const scale = Math.min((width - 8) / totalW, (height - 6) / totalH);

    const draw = (t: number) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.translate(width / 2, height / 2);
      ctx.scale(scale, scale);

      // Shift slightly left when right-pointing emitters shoot out, or up for wrecking ball
      const shiftX =
        itemId === 'flame_thrower' ||
        itemId === 'punch_glove' ||
        itemId === 'crossbow' ||
        itemId === 'hockey_shooter' ||
        itemId === 'fire_tennis' ||
        itemId === 'paper_plane' ||
        itemId === 'fan'
          ? -14
          : 0;
      const shiftY = itemId === 'wrecking_ball' ? -22 : 0;
      drawItemArtwork(ctx, {
        itemId,
        x: -itemPxW / 2 + shiftX,
        y: -itemPxH / 2 + shiftY,
        w: itemPxW,
        h: itemPxH,
        rot: def.rotatable ? rot : 0,
        flipX,
        time: t,
        previewDemo: true,
      });
      ctx.restore();
    };

    draw(0);
    return subscribeTicker(draw);
  }, [itemId, width, height, rot, flipX]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, display: 'block', pointerEvents: 'none' }}
    />
  );
};

interface CharacterPortraitProps {
  character: CharacterId;
  size?: number;
  dancing?: boolean;
  facing?: 1 | -1;
}

export const CharacterPortrait: React.FC<CharacterPortraitProps> = ({
  character,
  size = 32,
  dancing = false,
  facing = 1,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(size * dpr);
    canvas.height = Math.floor(size * dpr);

    const scale = size / 54;
    const draw = (t: number) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      ctx.translate(size / 2, size * 0.86);
      ctx.scale(scale, scale);
      drawCharacterArtwork(ctx, {
        character,
        cx: 0,
        bottomY: 0,
        facing,
        time: t,
        dancing,
        portrait: true,
      });
      ctx.restore();
    };

    draw(0);
    return subscribeTicker(draw);
  }, [character, size, dancing, facing]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size, display: 'block', flexShrink: 0, pointerEvents: 'none' }}
    />
  );
};
