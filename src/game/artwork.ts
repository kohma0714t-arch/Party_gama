import { CHARACTERS, CROUCH_H, PLAYER_H, PLAYER_W, TILE } from './constants';
import { dirVector, isFlipSpikeActive } from './physics';
import { CharacterId, ItemId, PlacedBlock } from './types';

export const INK = '#231F20';

export interface ItemDrawOptions {
  itemId: ItemId;
  x: number;
  y: number;
  w: number; // pixel width (typically tilesW * TILE)
  h: number; // pixel height (typically tilesH * TILE)
  rot?: 0 | 1 | 2 | 3;
  flipX?: boolean;
  time: number;
  state?: PlacedBlock['state'];
  angle?: number;
  honeyed?: boolean;
  previewDemo?: boolean;
}

export interface CharDrawOptions {
  character: CharacterId;
  cx: number;
  bottomY: number;
  w?: number;
  h?: number;
  facing?: 1 | -1;
  time: number;
  vx?: number;
  vy?: number;
  onGround?: boolean;
  crouching?: boolean;
  dancing?: boolean;
  alive?: boolean;
  wallSliding?: boolean;
  squashX?: number;
  squashY?: number;
  portrait?: boolean;
}

export function drawItemArtwork(ctx: CanvasRenderingContext2D, opts: ItemDrawOptions): void {
  const {
    itemId,
    x,
    y,
    w,
    h,
    rot = 0,
    flipX = false,
    time,
    state = 'idle',
    angle = 0,
    honeyed = false,
    previewDemo = false,
  } = opts;

  if (state === 'collapsed' || state === 'collected') {
    if (itemId === 'crumble_block') {
      ctx.save();
      ctx.strokeStyle = 'rgba(35,31,32,0.28)';
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
      ctx.restore();
    }
    return;
  }

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;

  switch (itemId) {
    case 'wood_beam':
    case 'wood_small': {
      const grad = ctx.createLinearGradient(x, y, x, y + h);
      grad.addColorStop(0, '#DFA465');
      grad.addColorStop(0.5, '#C98847');
      grad.addColorStop(1, '#A96B30');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 5);
      ctx.fill();
      // Top bevel highlight
      ctx.fillStyle = 'rgba(255, 244, 214, 0.35)';
      ctx.fillRect(x + 3, y + 2, w - 6, 5);
      // Wood grain lines
      ctx.strokeStyle = 'rgba(92, 52, 20, 0.35)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x + 6, y + h * 0.38);
      ctx.quadraticCurveTo(x + w * 0.5, y + h * 0.28, x + w - 6, y + h * 0.42);
      ctx.moveTo(x + 8, y + h * 0.72);
      ctx.quadraticCurveTo(x + w * 0.45, y + h * 0.82, x + w - 8, y + h * 0.68);
      ctx.stroke();
      // Outline
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 5);
      ctx.stroke();
      // Corner nails
      ctx.fillStyle = '#E5E7EB';
      const nails = w > TILE * 1.5 ? [6, w - 6] : [6, w - 6];
      for (const nx of nails) {
        for (const ny of [7, h - 7]) {
          ctx.beginPath();
          ctx.arc(x + nx, y + ny, 2.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
      break;
    }

    case 'crumble_block': {
      const demoShake = previewDemo && (time % 2.4) > 1.4 ? Math.sin(time * 55) * 2.5 : 0;
      const jitter = state === 'triggered' ? Math.sin(time * 60) * 3 : demoShake;
      const bx = x + jitter;
      const grad = ctx.createLinearGradient(bx, y, bx, y + h);
      grad.addColorStop(0, '#E8C59B');
      grad.addColorStop(1, '#BD8B5A');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(bx, y, w, h, 5);
      ctx.fill();
      ctx.stroke();

      // Deep fracture cracks
      ctx.strokeStyle = '#5C3A21';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx + w * 0.28, y + 1);
      ctx.lineTo(bx + w * 0.36, y + h * 0.48);
      ctx.lineTo(bx + w * 0.29, y + h - 1);
      ctx.moveTo(bx + w * 0.36, y + h * 0.48);
      ctx.lineTo(bx + w * 0.52, y + h * 0.62);
      ctx.moveTo(bx + w * 0.72, y + 1);
      ctx.lineTo(bx + w * 0.64, y + h * 0.55);
      ctx.lineTo(bx + w * 0.75, y + h - 1);
      ctx.stroke();

      if (previewDemo && (time % 2.4) > 1.55) {
        const drop = ((time % 2.4) - 1.55) * 26;
        ctx.fillStyle = '#BD8B5A';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.5;
        ctx.fillRect(bx + w * 0.3, y + h + drop * 0.4, 6, 5);
        ctx.strokeRect(bx + w * 0.3, y + h + drop * 0.4, 6, 5);
        ctx.fillRect(bx + w * 0.65, y + h + drop * 0.7, 5, 4);
        ctx.strokeRect(bx + w * 0.65, y + h + drop * 0.7, 5, 4);
      }
      break;
    }

    case 'ice_block': {
      const grad = ctx.createLinearGradient(x, y, x, y + h);
      grad.addColorStop(0, '#CAF0F8');
      grad.addColorStop(0.55, '#90E0EF');
      grad.addColorStop(1, '#48CAE4');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 6);
      ctx.fill();

      // Frost cap
      ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, w - 4, 7, 4);
      ctx.fill();

      // Shimmering diagonal glints
      const glintShift = ((time * 48) % (w + 40)) - 20;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, w - 4, h - 4, 4);
      ctx.clip();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.moveTo(x + glintShift, y + h);
      ctx.lineTo(x + glintShift + 16, y);
      ctx.lineTo(x + glintShift + 28, y);
      ctx.lineTo(x + glintShift + 12, y + h);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 6);
      ctx.stroke();
      break;
    }

    case 'spring_pad': {
      const bounceCycle = previewDemo ? Math.max(0, Math.sin(time * 4.2)) : 0;
      const lift = bounceCycle * 9;
      // Steel base
      ctx.fillStyle = '#6C757D';
      ctx.beginPath();
      ctx.roundRect(x + 4, y + h - 9, w - 8, 9, 3);
      ctx.fill();
      ctx.stroke();

      // Zigzag spring coil
      const topPlateY = y + 10 - lift;
      ctx.strokeStyle = '#ADB5BD';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x + 12, y + h - 9);
      ctx.lineTo(x + w - 12, (y + h - 9 + topPlateY + 8) / 2 + 3);
      ctx.lineTo(x + 12, (y + h - 9 + topPlateY + 8) / 2 - 3);
      ctx.lineTo(x + w - 12, topPlateY + 9);
      ctx.stroke();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Green bouncy pad
      ctx.fillStyle = '#2BB673';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(x + 2, topPlateY, w - 4, 11, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#A7F3D0';
      ctx.fillRect(x + 7, topPlateY + 2, w - 14, 3);
      break;
    }

    case 'spike_strip': {
      // Metal base plate
      ctx.fillStyle = '#5C677D';
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 4);
      ctx.fill();
      ctx.stroke();

      // Rivets on base
      ctx.fillStyle = '#CED4DA';
      ctx.beginPath();
      ctx.arc(x + 10, y + h / 2, 3, 0, Math.PI * 2);
      ctx.arc(x + w - 10, y + h / 2, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Sharp spikes with red blood-warning tips
      const spikes = 4;
      for (let i = 0; i < spikes; i++) {
        ctx.beginPath();
        if (rot === 0) {
          const sx = x + (i * w) / spikes;
          ctx.moveTo(sx + 2, y);
          ctx.lineTo(sx + w / spikes / 2, y - 14);
          ctx.lineTo(sx + w / spikes - 2, y);
        } else if (rot === 1) {
          const sy = y + (i * h) / spikes;
          ctx.moveTo(x + w, sy + 2);
          ctx.lineTo(x + w + 14, sy + h / spikes / 2);
          ctx.lineTo(x + w, sy + h / spikes - 2);
        } else if (rot === 2) {
          const sx = x + (i * w) / spikes;
          ctx.moveTo(sx + 2, y + h);
          ctx.lineTo(sx + w / spikes / 2, y + h + 14);
          ctx.lineTo(sx + w / spikes - 2, y + h);
        } else {
          const sy = y + (i * h) / spikes;
          ctx.moveTo(x, sy + 2);
          ctx.lineTo(x - 14, sy + h / spikes / 2);
          ctx.lineTo(x, sy + h / spikes - 2);
        }
        ctx.closePath();
        ctx.fillStyle = '#E63946';
        ctx.fill();
        ctx.stroke();
      }
      break;
    }

    case 'saw_blade':
    case 'moving_saw': {
      const { dx, dy } = dirVector(rot);
      let drawX = x;
      let drawY = y;
      if (itemId === 'moving_saw' && previewDemo) {
        // Draw mini rail & slide blade back and forth
        const railOffset = Math.sin(time * 3.2) * 18;
        ctx.save();
        ctx.strokeStyle = '#495057';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(x + w / 2 - dx * 20, y + h / 2 - dy * 20);
        ctx.lineTo(x + w / 2 + dx * 20, y + h / 2 + dy * 20);
        ctx.stroke();
        ctx.fillStyle = '#ADB5BD';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x + w / 2 - dx * 20, y + h / 2 - dy * 20, 4, 0, Math.PI * 2);
        ctx.arc(x + w / 2 + dx * 20, y + h / 2 + dy * 20, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        drawX += dx * railOffset;
        drawY += dy * railOffset;
      }

      const cx = drawX + TILE / 2;
      const cy = drawY + TILE / 2;
      const spin = previewDemo ? time * 9 : angle;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(spin);

      // Steel toothed wheel
      ctx.fillStyle = '#DCE1E7';
      ctx.beginPath();
      const teeth = 12;
      for (let i = 0; i < teeth * 2; i++) {
        const r = i % 2 === 0 ? 21 : 14;
        const a = (i * Math.PI) / teeth;
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Red danger inner ring
      ctx.fillStyle = '#E63946';
      ctx.beginPath();
      ctx.arc(0, 0, 10.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Center axle nut
      ctx.fillStyle = '#FFFDF7';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      break;
    }

    case 'flame_thrower': {
      const { dx, dy } = dirVector(rot);
      const cx = x + w / 2;
      const cy = y + h / 2;

      if (previewDemo && (time % 2.2) < 1.1) {
        const len = 36 + Math.sin(time * 24) * 5;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(Math.atan2(dy, dx));
        ctx.fillStyle = '#FF7A00';
        ctx.strokeStyle = '#E63946';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(18, -9);
        ctx.quadraticCurveTo(18 + len * 0.6, -15, 18 + len, 0);
        ctx.quadraticCurveTo(18 + len * 0.6, 15, 18, 9);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#FFD166';
        ctx.beginPath();
        ctx.moveTo(18, -5);
        ctx.quadraticCurveTo(18 + len * 0.45, -7, 18 + len * 0.72, 0);
        ctx.quadraticCurveTo(18 + len * 0.45, 7, 18, 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.atan2(dy, dx));
      // Hazard-striped body
      ctx.fillStyle = '#F48C06';
      ctx.beginPath();
      ctx.roundRect(-18, -16, 30, 32, 6);
      ctx.fill();
      ctx.stroke();
      // Warning stripe
      ctx.fillStyle = '#E63946';
      ctx.fillRect(-13, -10, 12, 20);
      ctx.strokeRect(-13, -10, 12, 20);
      // Burner nozzle
      ctx.fillStyle = '#495057';
      ctx.beginPath();
      ctx.roundRect(10, -9, 10, 18, 3);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      break;
    }

    case 'falling_spike': {
      const demoDrop = previewDemo ? Math.max(0, Math.sin(time * 2.6 - 1.0)) * 9 : 0;
      const by = y + demoDrop;
      // Heavy iron stone block
      const grad = ctx.createLinearGradient(x, by, x, by + h);
      grad.addColorStop(0, '#6C757D');
      grad.addColorStop(1, '#495057');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x + 1, by, w - 2, h - 2, 5);
      ctx.fill();
      ctx.stroke();

      // Angry eyes & furrowed brow
      const eyeLook = previewDemo ? Math.sin(time * 2.6) * 2 : 0;
      ctx.fillStyle = '#FFFDF7';
      ctx.fillRect(x + 7, by + 11, 9, 9);
      ctx.fillRect(x + 24, by + 11, 9, 9);
      ctx.strokeRect(x + 7, by + 11, 9, 9);
      ctx.strokeRect(x + 24, by + 11, 9, 9);
      ctx.fillStyle = '#E63946';
      ctx.beginPath();
      ctx.arc(x + 11.5 + eyeLook, by + 16, 2.5, 0, Math.PI * 2);
      ctx.arc(x + 28.5 + eyeLook, by + 16, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Furrowed brows
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + 6, by + 8);
      ctx.lineTo(x + 17, by + 12);
      ctx.moveTo(x + 34, by + 8);
      ctx.lineTo(x + 23, by + 12);
      ctx.stroke();

      // 3 bottom iron spikes
      ctx.lineWidth = 2.2;
      ctx.fillStyle = '#E63946';
      for (let i = 0; i < 3; i++) {
        const sx = x + 4 + i * 11;
        ctx.beginPath();
        ctx.moveTo(sx, by + h - 2);
        ctx.lineTo(sx + 5, by + h + 10);
        ctx.lineTo(sx + 10, by + h - 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      break;
    }

    case 'punch_glove': {
      const { dx, dy } = dirVector(rot);
      const cx = x + w / 2;
      const cy = y + h / 2;
      const demoExtend =
        previewDemo && (time % 2.0) > 1.1 && (time % 2.0) < 1.55
          ? Math.sin((((time % 2.0) - 1.1) / 0.45) * Math.PI) * 26
          : 0;
      const extend = state === 'punching' ? 28 : demoExtend;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.atan2(dy, dx));
      // Housing box
      ctx.fillStyle = '#343A40';
      ctx.beginPath();
      ctx.roundRect(-18, -17, 34, 34, 6);
      ctx.fill();
      ctx.stroke();

      // Pantograph scissor arm when extended
      if (extend > 2) {
        ctx.strokeStyle = '#CED4DA';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(extend * 0.5, 6);
        ctx.lineTo(extend, -4);
        ctx.moveTo(0, 6);
        ctx.lineTo(extend * 0.5, -6);
        ctx.lineTo(extend, 4);
        ctx.stroke();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
      }

      // Red boxing glove
      ctx.fillStyle = '#E63946';
      ctx.beginPath();
      ctx.roundRect(6 + extend, -11, 16, 22, 8);
      ctx.fill();
      ctx.stroke();
      // Thumb + highlight
      ctx.beginPath();
      ctx.arc(13 + extend, -10, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.arc(16 + extend, -2, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    }

    case 'crossbow': {
      const { dx, dy } = dirVector(rot);
      const cx = x + w / 2;
      const cy = y + h / 2;
      const cycle = previewDemo ? (time % 1.8) / 1.8 : 0.2;
      const drawPull = cycle < 0.65 ? cycle / 0.65 : 0;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.atan2(dy, dx));

      // Wood stock
      ctx.fillStyle = '#9C5A25';
      ctx.beginPath();
      ctx.roundRect(-17, -7, 30, 14, 4);
      ctx.fill();
      ctx.stroke();

      // Bow limbs
      ctx.strokeStyle = '#582F0E';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(8, -17);
      ctx.quadraticCurveTo(16, 0, 8, 17);
      ctx.stroke();

      // Bowstring
      ctx.strokeStyle = '#FFFDF7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(8, -17);
      ctx.lineTo(3 - drawPull * 10, 0);
      ctx.lineTo(8, 17);
      ctx.stroke();

      // Arrow (loaded or flying)
      const arrowOffset = previewDemo && cycle >= 0.65 ? (cycle - 0.65) * 95 : -drawPull * 8;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.fillStyle = '#8D5524';
      ctx.fillRect(-4 + arrowOffset, -2, 20, 4);
      ctx.fillStyle = '#E63946';
      ctx.beginPath();
      ctx.moveTo(20 + arrowOffset, 0);
      ctx.lineTo(12 + arrowOffset, -5);
      ctx.lineTo(12 + arrowOffset, 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      break;
    }

    case 'hockey_shooter': {
      const { dx, dy } = dirVector(rot);
      const cx = x + w / 2;
      const cy = y + h / 2;
      const cycle = previewDemo ? (time % 2.0) / 2.0 : 0;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.atan2(dy, dx));

      if (previewDemo && cycle > 0.55) {
        const dist = (cycle - 0.55) * 85;
        ctx.fillStyle = '#231F20';
        ctx.strokeStyle = '#E63946';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(16 + dist, 0, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.fillStyle = '#2D7FF9';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-18, -16, 32, 32, 7);
      ctx.fill();
      ctx.stroke();

      // Roller wheels + barrel
      ctx.fillStyle = '#231F20';
      ctx.beginPath();
      ctx.arc(6, -10, 5, 0, Math.PI * 2);
      ctx.arc(6, 10, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFD166';
      ctx.beginPath();
      ctx.arc(-6, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      break;
    }

    case 'conveyor': {
      ctx.fillStyle = '#343A40';
      ctx.beginPath();
      ctx.roundRect(x, y + 3, w, h - 6, 15);
      ctx.fill();
      ctx.stroke();

      // End rollers
      ctx.fillStyle = '#ADB5BD';
      ctx.beginPath();
      ctx.arc(x + 15, y + h / 2, 9, 0, Math.PI * 2);
      ctx.arc(x + w - 15, y + h / 2, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Animated chevron belt
      const dir = flipX ? -1 : 1;
      const shift = ((time * 42 * dir) % 24 + 24) % 24;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x + 18, y + 6, w - 36, h - 12, 6);
      ctx.clip();
      ctx.fillStyle = '#FFB703';
      for (let ix = -24; ix < w; ix += 24) {
        const ax = x + ix + shift;
        const ay = y + h / 2;
        ctx.beginPath();
        ctx.moveTo(ax + dir * 7, ay);
        ctx.lineTo(ax - dir * 5, ay - 6);
        ctx.lineTo(ax - dir * 5, ay + 6);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      break;
    }

    case 'fan': {
      const { dx, dy } = dirVector(rot);
      const cx = x + w / 2;
      const cy = y + h / 2;

      if (previewDemo) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(Math.atan2(dy, dx));
        ctx.strokeStyle = 'rgba(45, 127, 249, 0.72)';
        ctx.lineWidth = 2.5;
        for (let i = 0; i < 3; i++) {
          const prog = ((time * 1.8 + i * 0.33) % 1);
          const lx = 20 + prog * 28;
          const ly = (i - 1) * 9 + Math.sin(time * 8 + i) * 2;
          ctx.globalAlpha = 1 - prog;
          ctx.beginPath();
          ctx.moveTo(lx, ly);
          ctx.lineTo(lx + 12, ly);
          ctx.stroke();
        }
        ctx.restore();
      }

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.atan2(dy, dx));
      // Fan housing
      ctx.fillStyle = '#4CC9F0';
      ctx.beginPath();
      ctx.roundRect(-18, -17, 36, 34, 8);
      ctx.fill();
      ctx.stroke();

      // Grill bars
      ctx.fillStyle = '#E0FBFC';
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Spinning blades
      ctx.save();
      ctx.rotate(time * 14);
      ctx.fillStyle = '#2D7FF9';
      for (let i = 0; i < 3; i++) {
        ctx.rotate((Math.PI * 2) / 3);
        ctx.beginPath();
        ctx.ellipse(5, 0, 6, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle = '#FFFDF7';
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      break;
    }

    case 'moving_platform': {
      const { dx, dy } = dirVector(rot);
      let drawX = x;
      let drawY = y;
      if (previewDemo) {
        const slide = Math.sin(time * 2.5) * 14;
        ctx.save();
        ctx.strokeStyle = 'rgba(35,31,32,0.3)';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + w / 2 - dx * 18, y + h / 2 - dy * 18);
        ctx.lineTo(x + w / 2 + dx * 18, y + h / 2 + dy * 18);
        ctx.stroke();
        ctx.restore();
        drawX += dx * slide;
        drawY += dy * slide;
      }

      const grad = ctx.createLinearGradient(drawX, drawY, drawX, drawY + h);
      grad.addColorStop(0, '#4EA8DE');
      grad.addColorStop(1, '#2D7FF9');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(drawX, drawY, w, h, 9);
      ctx.fill();
      ctx.stroke();

      // Glowing indicator lights
      ctx.fillStyle = '#FFD166';
      ctx.beginPath();
      ctx.arc(drawX + 12, drawY + h / 2, 4, 0, Math.PI * 2);
      ctx.arc(drawX + w - 12, drawY + h / 2, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#CAF0F8';
      ctx.fillRect(drawX + 22, drawY + 6, Math.max(8, w - 44), 6);
      break;
    }

    case 'bomb': {
      const cx = x + w / 2;
      const cy = y + h / 2 + 2;
      const pulse = previewDemo ? 1 + Math.sin(time * 8) * 0.05 : 1;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(pulse, pulse);

      // Fuse
      ctx.strokeStyle = '#C98A4B';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(4, -14);
      ctx.quadraticCurveTo(10, -24, 17, -20);
      ctx.stroke();

      // Fuse spark
      const sparkR = 3.5 + Math.sin(time * 28) * 1.5;
      ctx.fillStyle = '#FFD166';
      ctx.strokeStyle = '#E63946';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(17, -20, sparkR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Metal cap
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.5;
      ctx.fillStyle = '#6C757D';
      ctx.fillRect(-6, -18, 12, 6);
      ctx.strokeRect(-6, -18, 12, 6);

      // Black sphere
      ctx.fillStyle = '#2B2D42';
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Glossy highlight & warning mark
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.ellipse(-5, -5, 4.5, 2.5, -0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#E63946';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', 0, 5);
      ctx.restore();
      break;
    }

    case 'honey': {
      const drip = Math.sin(time * 3.5) * 2.5;
      ctx.fillStyle = '#FFB703';
      ctx.beginPath();
      ctx.roundRect(x + 3, y + 3, w - 6, h - 8, 12);
      ctx.fill();
      ctx.stroke();
      // Dripping blobs
      ctx.beginPath();
      ctx.arc(x + 12, y + h - 4 + drip * 0.5, 4.5, 0, Math.PI * 2);
      ctx.arc(x + 26, y + h - 3 - drip * 0.5, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Sticky shine
      ctx.fillStyle = 'rgba(255, 253, 247, 0.65)';
      ctx.beginPath();
      ctx.ellipse(x + 13, y + 11, 5, 2.5, -0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'portal': {
      const cx = x + w / 2;
      const cy = y + h / 2;
      ctx.fillStyle = '#5A189A';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 15, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#9D4EDD';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 11, time * 3.8, time * 3.8 + Math.PI * 1.4);
      ctx.stroke();

      ctx.strokeStyle = '#4CC9F0';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.arc(cx, cy, 6.5, -time * 5.2, -time * 5.2 + Math.PI * 1.3);
      ctx.stroke();
      break;
    }

    case 'coin': {
      const cx = x + w / 2;
      const cy = y + h / 2 + Math.sin(time * 4) * 3;
      const spinScaleX = 0.35 + Math.abs(Math.cos(time * 3.2)) * 0.65;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(spinScaleX, 1);
      ctx.fillStyle = '#FFB703';
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FFD166';
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFDF7';
      ctx.fillRect(-2, -6, 4, 12);
      ctx.restore();
      break;
    }

    case 'one_way_platform': {
      ctx.fillStyle = '#E9C46A';
      ctx.beginPath();
      ctx.roundRect(x, y, w, 14, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillRect(x + 4, y + 2, w - 8, 4);
      // Upward pass-through indicator chevrons
      ctx.strokeStyle = 'rgba(43, 182, 115, 0.85)';
      ctx.lineWidth = 2.5;
      const bob = Math.sin(time * 4) * 2;
      for (let i = 0; i < 3; i++) {
        const cx = x + w * (0.25 + i * 0.25);
        const cy = y + 26 + bob;
        ctx.beginPath();
        ctx.moveTo(cx - 7, cy + 4);
        ctx.lineTo(cx, cy - 3);
        ctx.lineTo(cx + 7, cy + 4);
        ctx.stroke();
      }
      break;
    }

    case 'bounce_block': {
      const squish = previewDemo ? Math.sin(time * 5) * 2 : 0;
      const grad = ctx.createLinearGradient(x, y, x, y + h);
      grad.addColorStop(0, '#FF70A6');
      grad.addColorStop(1, '#E63946');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x - squish * 0.5, y + squish, w + squish, h - squish, 14);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FFD166';
      ctx.beginPath();
      ctx.roundRect(x + 8, y + 7 + squish, w - 16, h - 14 - squish * 0.5, 8);
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'stairs': {
      const upperX = flipX ? x : x + TILE;
      ctx.fillStyle = '#C98847';
      // Lower 2x1 step
      ctx.beginPath();
      ctx.roundRect(x, y + TILE, w, TILE, 5);
      ctx.fill();
      ctx.stroke();
      // Upper 1x1 step
      ctx.beginPath();
      ctx.roundRect(upperX, y, TILE, TILE + 4, 5);
      ctx.fill();
      ctx.stroke();
      // Top bevels
      ctx.fillStyle = 'rgba(255, 244, 214, 0.35)';
      ctx.fillRect(upperX + 4, y + 3, TILE - 8, 5);
      ctx.fillRect(x + 4, y + TILE + 3, w - 8, 5);
      break;
    }

    case 'barbed_wire': {
      ctx.strokeStyle = '#6C757D';
      ctx.lineWidth = 3.5;
      for (let row = 0; row < 2; row++) {
        const cy = y + 12 + row * 16;
        ctx.beginPath();
        for (let wx = x + 3; wx <= x + w - 3; wx += 8) {
          const wy = cy + Math.sin((wx - x) * 0.35 + row) * 4;
          if (wx === x + 3) ctx.moveTo(wx, wy);
          else ctx.lineTo(wx, wy);
        }
        ctx.stroke();
      }
      // Sharp barbs
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      for (let bx = x + 10; bx < x + w - 6; bx += 16) {
        const by = y + h / 2 + Math.sin(bx) * 5;
        ctx.beginPath();
        ctx.moveTo(bx - 5, by - 6);
        ctx.lineTo(bx + 5, by + 6);
        ctx.moveTo(bx + 5, by - 6);
        ctx.lineTo(bx - 5, by + 6);
        ctx.stroke();
      }
      break;
    }

    case 'flip_spike': {
      const active = previewDemo ? isFlipSpikeActive(time) : isFlipSpikeActive(time);
      const pop = active ? 1 : 0.15;
      // Red spikes extending/retracting
      ctx.fillStyle = '#E63946';
      const spikes = 4;
      for (let i = 0; i < spikes; i++) {
        ctx.beginPath();
        if (rot === 0) {
          const sx = x + (i * w) / spikes;
          ctx.moveTo(sx + 2, y);
          ctx.lineTo(sx + w / spikes / 2, y - 14 * pop);
          ctx.lineTo(sx + w / spikes - 2, y);
        } else if (rot === 1) {
          const sy = y + (i * h) / spikes;
          ctx.moveTo(x + w, sy + 2);
          ctx.lineTo(x + w + 14 * pop, sy + h / spikes / 2);
          ctx.lineTo(x + w, sy + h / spikes - 2);
        } else if (rot === 2) {
          const sx = x + (i * w) / spikes;
          ctx.moveTo(sx + 2, y + h);
          ctx.lineTo(sx + w / spikes / 2, y + h + 14 * pop);
          ctx.lineTo(sx + w / spikes - 2, y + h);
        } else {
          const sy = y + (i * h) / spikes;
          ctx.moveTo(x, sy + 2);
          ctx.lineTo(x - 14 * pop, sy + h / spikes / 2);
          ctx.lineTo(x, sy + h / spikes - 2);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      // Mechanical base with timing indicator light
      ctx.fillStyle = '#495057';
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = active ? '#E63946' : '#FFD166';
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'wrecking_ball': {
      // Anchor block
      ctx.fillStyle = '#495057';
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, w - 4, h - 4, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FFB703';
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (previewDemo) {
        const ax = x + w / 2;
        const ay = y + h;
        const theta = Math.sin(time * 2.5) * 0.9;
        const len = 48;
        const bx = ax + Math.sin(theta) * len;
        const by = ay + Math.cos(theta) * len;
        ctx.strokeStyle = '#6C757D';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2.5;
        ctx.fillStyle = '#2B2D42';
        ctx.beginPath();
        ctx.arc(bx, by, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#E63946';
        for (let k = 0; k < 6; k++) {
          const a = (k * Math.PI) / 3 + theta;
          ctx.beginPath();
          ctx.arc(bx + Math.cos(a) * 14, by + Math.sin(a) * 14, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }

    case 'beehive': {
      const cx = x + w / 2;
      const cy = y + h / 2;
      // Striped oval beehive
      ctx.fillStyle = '#FFB703';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 16, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#9C5121';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx - 14, cy - 6);
      ctx.lineTo(cx + 14, cy - 6);
      ctx.moveTo(cx - 15, cy + 2);
      ctx.lineTo(cx + 15, cy + 2);
      ctx.moveTo(cx - 12, cy + 10);
      ctx.lineTo(cx + 12, cy + 10);
      ctx.stroke();
      ctx.strokeStyle = INK;
      ctx.fillStyle = '#231F20';
      ctx.beginPath();
      ctx.arc(cx, cy + 4, 5, 0, Math.PI * 2);
      ctx.fill();

      if (previewDemo) {
        const bx = cx + Math.cos(time * 4.5) * 18;
        const by = cy - 16 + Math.sin(time * 7) * 6;
        ctx.fillStyle = '#FFD166';
        ctx.beginPath();
        ctx.arc(bx, by, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      break;
    }

    case 'fire_tennis': {
      const { dx, dy } = dirVector(rot);
      const cx = x + w / 2;
      const cy = y + h / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.atan2(dy, dx));
      if (previewDemo) {
        const p = (time * 1.4) % 1;
        const fx = 16 + p * 34;
        const fy = -Math.sin(p * Math.PI) * 14;
        ctx.fillStyle = '#FF7A00';
        ctx.beginPath();
        ctx.arc(fx, fy, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = '#D62828';
      ctx.beginPath();
      ctx.roundRect(-18, -15, 34, 30, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FFB703';
      ctx.fillRect(-10, -8, 12, 16);
      ctx.strokeRect(-10, -8, 12, 16);
      ctx.restore();
      break;
    }

    case 'paper_plane': {
      const { dx, dy } = dirVector(rot);
      const cx = x + w / 2;
      const cy = y + h / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.atan2(dy, dx));
      if (previewDemo) {
        const p = (time * 1.3) % 1;
        const px = 16 + p * 36;
        const py = Math.sin(p * Math.PI * 2) * 8;
        ctx.fillStyle = '#FFFDF7';
        ctx.beginPath();
        ctx.moveTo(px + 10, py);
        ctx.lineTo(px - 8, py - 6);
        ctx.lineTo(px - 4, py);
        ctx.lineTo(px - 8, py + 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = '#48CAE4';
      ctx.beginPath();
      ctx.roundRect(-18, -15, 34, 30, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FFFDF7';
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(-8, -7);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-8, 7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      break;
    }

    case 'rotating_gear': {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const r = Math.min(w, h) / 2 - 2;
      const spin = previewDemo ? (flipX ? -1 : 1) * time * 2.2 : angle;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(spin);

      // Rubber tire ring with tread bumps
      ctx.fillStyle = '#2B2D42';
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        ctx.fillStyle = '#495057';
        ctx.beginPath();
        ctx.arc(Math.cos(a) * (r - 2), Math.sin(a) * (r - 2), 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Yellow rim & spokes
      ctx.fillStyle = '#FFB703';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.56, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * r * 0.56, Math.sin(a) * r * 0.56);
        ctx.stroke();
      }
      ctx.fillStyle = '#FFFDF7';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      break;
    }

    case 'black_hole': {
      const cx = x + w / 2;
      const cy = y + h / 2;
      ctx.save();
      ctx.translate(cx, cy);
      // Outer purple accretion glow
      ctx.fillStyle = 'rgba(114, 9, 183, 0.32)';
      ctx.beginPath();
      ctx.arc(0, 0, 21 + Math.sin(time * 6) * 2, 0, Math.PI * 2);
      ctx.fill();

      // Swirl rings
      ctx.strokeStyle = '#9D4EDD';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 16, time * 4, time * 4 + Math.PI * 1.4);
      ctx.stroke();

      ctx.strokeStyle = '#F72585';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 12, -time * 5, -time * 5 + Math.PI * 1.2);
      ctx.stroke();

      // Pitch black event horizon
      ctx.fillStyle = '#0B090A';
      ctx.strokeStyle = '#FFFDF7';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      break;
    }

    case 'mega_bomb': {
      const cx = x + w / 2;
      const cy = y + h / 2 + 2;
      const pulse = previewDemo ? 1 + Math.sin(time * 9) * 0.06 : 1;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(pulse, pulse);

      ctx.strokeStyle = '#C98A4B';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(4, -15);
      ctx.quadraticCurveTo(12, -25, 19, -20);
      ctx.stroke();

      const sparkR = 4.5 + Math.sin(time * 32) * 1.8;
      ctx.fillStyle = '#FFD166';
      ctx.strokeStyle = '#E63946';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(19, -20, sparkR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.5;
      ctx.fillStyle = '#E63946';
      ctx.beginPath();
      ctx.arc(0, 0, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#231F20';
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFD166';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('5×5', 0, 4);
      ctx.restore();
      break;
    }
  }

  // Honey sticky coating on glued blocks
  if (honeyed && itemId !== 'honey') {
    const drip = Math.sin(time * 3.5) * 1.5;
    ctx.fillStyle = '#FFB703';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(x + 2, y - 4, w - 4, 9, 4);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 12, y + 6 + drip, 3.5, 0, Math.PI * 2);
    ctx.arc(x + w - 12, y + 6 - drip, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

export function drawCharacterArtwork(ctx: CanvasRenderingContext2D, opts: CharDrawOptions): void {
  const {
    character,
    cx,
    bottomY,
    facing = 1,
    time,
    vx = 0,
    onGround = true,
    crouching = false,
    dancing = false,
    alive = true,
    wallSliding = false,
    squashX = 1,
    squashY = 1,
    portrait = false,
  } = opts;

  const meta = CHARACTERS.find((c) => c.id === character) ?? CHARACTERS[0];
  const h = crouching ? CROUCH_H : PLAYER_H;

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (!alive) {
    ctx.globalAlpha = 0.48;
  }

  // Ground shadow
  if (onGround && alive && !portrait) {
    ctx.fillStyle = 'rgba(35, 31, 32, 0.22)';
    ctx.beginPath();
    ctx.ellipse(cx, bottomY, 13 * squashX, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.translate(cx, bottomY);

  const danceRot = dancing ? Math.sin(time * 13) * 0.16 : 0;
  const danceHop = dancing ? Math.abs(Math.sin(time * 13)) * 5 : 0;
  const idleBob = portrait || dancing ? 0 : Math.sin(time * 4) * 0.8;

  ctx.translate(0, -danceHop - idleBob);
  ctx.rotate(danceRot);
  ctx.scale(facing * squashX, squashY);

  // Feet
  const runCycle = Math.abs(vx) > 20 && onGround ? Math.sin(time * 18) * 5.5 : 0;
  ctx.fillStyle = meta.accentColor;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.ellipse(-6 + runCycle, -3, 5.5, 3.8, 0, 0, Math.PI * 2);
  ctx.ellipse(6 - runCycle, -3, 5.5, 3.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Tail behind body
  if (character === 'raccoon') {
    ctx.fillStyle = '#6C757D';
    ctx.beginPath();
    ctx.roundRect(-PLAYER_W / 2 - 11, -16, 13, 7, 3.5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.fillRect(-PLAYER_W / 2 - 8, -15, 3, 5);
  } else if (character === 'fox') {
    ctx.fillStyle = '#F47C2C';
    ctx.beginPath();
    ctx.ellipse(-PLAYER_W / 2 - 6, -11, 8, 4.5, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FFF7EC';
    ctx.beginPath();
    ctx.arc(-PLAYER_W / 2 - 11, -13, 3.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (character === 'platypus') {
    ctx.fillStyle = '#D99B26';
    ctx.beginPath();
    ctx.ellipse(-PLAYER_W / 2 - 6, -9, 7.5, 4, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Main body
  ctx.fillStyle = meta.bodyColor;
  ctx.beginPath();
  ctx.roundRect(-PLAYER_W / 2, -h, PLAYER_W, h - 3, 12);
  ctx.fill();
  ctx.stroke();

  // Fluffy wool puffs for sheep
  if (character === 'sheep') {
    const puffs = [
      [-10, -h + 4],
      [0, -h + 1],
      [10, -h + 4],
      [-12, -h + 16],
      [11, -h + 17],
    ];
    ctx.fillStyle = '#FFFDF7';
    for (const [px, py] of puffs) {
      ctx.beginPath();
      ctx.arc(px, py, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    // Dark face circle
    ctx.fillStyle = meta.accentColor;
    ctx.beginPath();
    ctx.ellipse(4, -h + 14, 8.5, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Character head/face specifics
  if (character === 'chicken') {
    // 3-lobe red comb
    ctx.fillStyle = '#E63946';
    ctx.beginPath();
    ctx.arc(-3, -h - 1, 4.8, 0, Math.PI * 2);
    ctx.arc(3, -h - 2, 5.2, 0, Math.PI * 2);
    ctx.arc(8, -h, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Little flapping wing
    const wingY = onGround ? 0 : Math.sin(time * 24) * 3;
    ctx.fillStyle = '#F3EDE2';
    ctx.beginPath();
    ctx.ellipse(-3, -h + 20 + wingY, 6, 4.5, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Beak & wattle
    ctx.fillStyle = '#FFB703';
    ctx.beginPath();
    ctx.moveTo(PLAYER_W / 2 - 2, -h + 11);
    ctx.lineTo(PLAYER_W / 2 + 9, -h + 14.5);
    ctx.lineTo(PLAYER_W / 2 - 2, -h + 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#E63946';
    ctx.beginPath();
    ctx.arc(PLAYER_W / 2 + 1, -h + 20, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (character === 'horse') {
    // Mane & ears
    ctx.fillStyle = meta.accentColor;
    ctx.beginPath();
    ctx.roundRect(-13, -h - 3, 7, 17, 3);
    ctx.fill();
    ctx.stroke();
    // Muzzle
    ctx.fillStyle = '#D4A373';
    ctx.beginPath();
    ctx.roundRect(4, -h + 11, 13, 10, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(13, -h + 15, 1.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (character === 'raccoon') {
    // Ears
    ctx.fillStyle = meta.bodyColor;
    ctx.beginPath();
    ctx.arc(-7, -h + 1, 5, 0, Math.PI * 2);
    ctx.arc(6, -h + 1, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Eye mask
    ctx.fillStyle = meta.accentColor;
    ctx.beginPath();
    ctx.roundRect(-1, -h + 7, 14, 8, 4);
    ctx.fill();
  } else if (character === 'fox') {
    // Big pointy ears
    ctx.fillStyle = meta.bodyColor;
    ctx.beginPath();
    ctx.moveTo(-9, -h + 2);
    ctx.lineTo(-5, -h - 9);
    ctx.lineTo(1, -h + 2);
    ctx.moveTo(3, -h + 2);
    ctx.lineTo(8, -h - 9);
    ctx.lineTo(12, -h + 2);
    ctx.fill();
    ctx.stroke();
    // White cheek
    ctx.fillStyle = '#FFF7EC';
    ctx.beginPath();
    ctx.ellipse(6, -h + 17, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (character === 'platypus') {
    // Flat duck bill
    ctx.fillStyle = meta.accentColor;
    ctx.beginPath();
    ctx.roundRect(PLAYER_W / 2 - 4, -h + 12, 12, 7, 3.5);
    ctx.fill();
    ctx.stroke();
  }

  // Rosy cheek & Eye (with blink)
  const isBlinking = alive && !portrait && (time % 3.6) > 3.48;
  const eyeX = character === 'sheep' ? 7 : 6;
  const eyeY = -h + 11;

  if (alive) {
    ctx.fillStyle = 'rgba(255, 117, 143, 0.55)';
    ctx.beginPath();
    ctx.arc(eyeX - 3, eyeY + 5, 3, 0, Math.PI * 2);
    ctx.fill();

    if (isBlinking) {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(eyeX - 2.5, eyeY);
      ctx.lineTo(eyeX + 2.5, eyeY);
      ctx.stroke();
    } else {
      ctx.fillStyle = character === 'sheep' || character === 'raccoon' ? '#FFFDF7' : INK;
      ctx.beginPath();
      ctx.arc(eyeX, eyeY, 2.8, 0, Math.PI * 2);
      ctx.fill();
      if (character !== 'sheep' && character !== 'raccoon') {
        ctx.fillStyle = '#FFFDF7';
        ctx.beginPath();
        ctx.arc(eyeX + 0.9, eyeY - 0.9, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else {
    ctx.strokeStyle = '#E63946';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(eyeX - 3, eyeY - 3);
    ctx.lineTo(eyeX + 3, eyeY + 3);
    ctx.moveTo(eyeX + 3, eyeY - 3);
    ctx.lineTo(eyeX - 3, eyeY + 3);
    ctx.stroke();
  }

  // Wall slide sweat drop
  if (wallSliding && alive) {
    ctx.fillStyle = '#4CC9F0';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(-8, -h + 6, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();

  // Dance music note above head
  if (dancing && alive) {
    ctx.save();
    ctx.fillStyle = '#2D7FF9';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    const ny = bottomY - h - 16 - Math.abs(Math.sin(time * 8)) * 6;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('♪', cx + 10, ny);
    ctx.restore();
  }
}
