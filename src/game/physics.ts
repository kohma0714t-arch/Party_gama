import {
  AIR_ACCEL,
  CONVEYOR_SPEED,
  COYOTE_TIME,
  CROUCH_H,
  FAN_FORCE,
  FAN_RANGE_TILES,
  GRAVITY,
  GROUND_ACCEL,
  HONEY_JUMP_MULT,
  HONEY_SPEED_MULT,
  ICE_ACCEL,
  JUMP_BUFFER,
  JUMP_CUT_MULT,
  JUMP_VEL,
  MAX_FALL_SPEED,
  PLAYER_H,
  PLAYER_W,
  POST_MORTEM_WINDOW,
  SPRING_VEL,
  SPRINT_SPEED,
  TILE,
  WALL_JUMP_LOCK,
  WALL_JUMP_VX,
  WALL_JUMP_VY,
  WALL_SLIDE_MAX_VY,
  WALK_SPEED,
  WORLD_W,
} from './constants';
import { ITEM_MAP } from './catalog';
import {
  GameRules,
  InputState,
  PlacedBlock,
  PlayerState,
  Projectile,
  Rect,
  SimEvent,
  StageDef,
  WindmillBladeState,
} from './types';

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function dirVector(rot: 0 | 1 | 2 | 3): { dx: number; dy: number } {
  switch (rot) {
    case 0:
      return { dx: 1, dy: 0 };
    case 1:
      return { dx: 0, dy: 1 };
    case 2:
      return { dx: -1, dy: 0 };
    case 3:
      return { dx: 0, dy: -1 };
  }
}

export function getPlayerRect(p: PlayerState): Rect {
  const h = p.crouching ? CROUCH_H : PLAYER_H;
  return { x: p.x, y: p.y + (PLAYER_H - h), w: PLAYER_W, h };
}

export function getBlockRect(b: PlacedBlock): Rect {
  return { x: b.x, y: b.y, w: b.w * TILE, h: b.h * TILE };
}

export function getGoalRect(stage: StageDef): Rect {
  return {
    x: stage.goalPoint.x - 22,
    y: stage.goalPoint.y - 54,
    w: 44,
    h: 54,
  };
}

export function getFlameRect(b: PlacedBlock): Rect | null {
  const cycle = b.timer % 2.2;
  if (cycle >= 0.9) return null;
  const { dx, dy } = dirVector(b.rot);
  const len = 3 * TILE;
  const thickness = TILE * 0.72;
  const pad = (TILE - thickness) / 2;
  if (dx > 0) return { x: b.x + TILE, y: b.y + pad, w: len, h: thickness };
  if (dx < 0) return { x: b.x - len, y: b.y + pad, w: len, h: thickness };
  if (dy > 0) return { x: b.x + pad, y: b.y + TILE, w: thickness, h: len };
  return { x: b.x + pad, y: b.y - len, w: thickness, h: len };
}

export function getFanRect(b: PlacedBlock): Rect {
  const { dx, dy } = dirVector(b.rot);
  const len = FAN_RANGE_TILES * TILE;
  if (dx > 0) return { x: b.x + TILE, y: b.y, w: len, h: TILE };
  if (dx < 0) return { x: b.x - len, y: b.y, w: len, h: TILE };
  if (dy > 0) return { x: b.x, y: b.y + TILE, w: TILE, h: len };
  return { x: b.x, y: b.y - len, w: TILE, h: len };
}

export function getPunchRect(b: PlacedBlock): Rect {
  const { dx, dy } = dirVector(b.rot);
  const reach = 1.6 * TILE;
  if (dx > 0) return { x: b.x + TILE, y: b.y + 4, w: reach, h: TILE - 8 };
  if (dx < 0) return { x: b.x - reach, y: b.y + 4, w: reach, h: TILE - 8 };
  if (dy > 0) return { x: b.x + 4, y: b.y + TILE, w: TILE - 8, h: reach };
  return { x: b.x + 4, y: b.y - reach, w: TILE - 8, h: reach };
}

export function isFlipSpikeActive(timer: number): boolean {
  return (timer % 2.4) < 1.1;
}

export function getWreckingBallPos(
  b: PlacedBlock,
  time: number
): { ax: number; ay: number; bx: number; by: number; radius: number } {
  const ax = b.x + TILE / 2;
  const ay = b.y + TILE;
  const len = 3.2 * TILE;
  const theta = Math.sin(time * 2.15) * 1.15;
  return {
    ax,
    ay,
    bx: ax + Math.sin(theta) * len,
    by: ay + Math.cos(theta) * len,
    radius: 20,
  };
}

export function getSpikeTipRect(b: PlacedBlock): Rect {
  const br = getBlockRect(b);
  const { dx, dy } = dirVector(b.rot);
  return dx === 1 && dy === 0
    ? { x: br.x + 4, y: br.y - 6, w: br.w - 8, h: 16 } // rot 0: top
    : dx === 0 && dy === 1
      ? { x: br.x + br.w - 10, y: br.y + 4, w: 16, h: br.h - 8 } // rot 1: right
      : dx === -1 && dy === 0
        ? { x: br.x + 4, y: br.y + br.h - 10, w: br.w - 8, h: 16 } // rot 2: bottom
        : { x: br.x - 6, y: br.y + 4, w: 16, h: br.h - 8 }; // rot 3: left
}

export function isBlockSolid(b: PlacedBlock): boolean {
  if (b.state === 'collapsed') return false;
  return ITEM_MAP[b.itemId].solid;
}

export function updateWindmillBlades(
  stage: StageDef,
  actionElapsed: number,
  prevBlades: WindmillBladeState[]
): WindmillBladeState[] {
  const hub = stage.windmillHub;
  if (!hub) return [];
  const blades: WindmillBladeState[] = [];
  for (let i = 0; i < hub.armCount; i++) {
    const id = `windmill_${i}`;
    const prev = prevBlades.find((b) => b.id === id);
    const angle = actionElapsed * hub.speed + (i * Math.PI * 2) / hub.armCount;
    const armCx = hub.cx + Math.cos(angle) * hub.radius;
    const armCy = hub.cy + Math.sin(angle) * hub.radius;
    const w = hub.armLength;
    const h = hub.armThickness;
    const x = armCx - w / 2;
    const y = armCy - h / 2;
    blades.push({
      id,
      x,
      y,
      w,
      h,
      prevX: prev ? prev.x : x,
      prevY: prev ? prev.y : y,
      angle,
    });
  }
  return blades;
}

export function updateDynamicBlocksAndProjectiles(
  blocks: PlacedBlock[],
  projectiles: Projectile[],
  players: PlayerState[],
  stage: StageDef,
  blades: WindmillBladeState[],
  actionElapsed: number,
  dt: number,
  events: SimEvent[]
): void {
  const solids = collectSolidWorldRects(stage, blocks, blades);

  // 1. Update unattached moving blocks first
  for (const b of blocks) {
    b.prevX = b.x;
    b.prevY = b.y;

    if (b.itemId === 'moving_platform' && !b.attachedToId) {
      const { dx, dy } = dirVector(b.rot);
      const offset = (Math.sin(actionElapsed * 1.65 - Math.PI / 2) * 0.5 + 0.5) * (4 * TILE);
      b.x = b.gx * TILE + dx * offset;
      b.y = b.gy * TILE + dy * offset;
    } else if (b.itemId === 'moving_saw' && !b.attachedToId) {
      const { dx, dy } = dirVector(b.rot);
      const offset = (Math.sin(actionElapsed * 2.2 - Math.PI / 2) * 0.5 + 0.5) * (4 * TILE);
      b.x = b.gx * TILE + dx * offset;
      b.y = b.gy * TILE + dy * offset;
      b.angle += dt * 11;
    } else if (b.itemId === 'saw_blade') {
      b.angle += dt * 10;
    } else if (b.itemId === 'rotating_gear' && !b.attachedToId) {
      b.angle += (b.flipX ? -1 : 1) * dt * 1.9;
    }
  }

  // 2. Update honey-attached children to follow their parent
  for (const b of blocks) {
    if (!b.attachedToId) continue;
    const blade = blades.find((bl) => bl.id === b.attachedToId);
    if (blade) {
      b.x = blade.x + b.attachOffsetX;
      b.y = blade.y + b.attachOffsetY;
      continue;
    }
    const parent = blocks.find((p) => p.id === b.attachedToId);
    if (parent && parent.state !== 'collapsed') {
      if (parent.itemId === 'rotating_gear') {
        const pcx = parent.x + TILE;
        const pcy = parent.y + TILE;
        const radius = b.attachOffsetX;
        const theta = parent.angle + b.attachAngleOffset;
        b.x = pcx + Math.cos(theta) * radius - (b.w * TILE) / 2;
        b.y = pcy + Math.sin(theta) * radius - (b.h * TILE) / 2;
      } else {
        b.x = parent.x + b.attachOffsetX;
        b.y = parent.y + b.attachOffsetY;
      }
    }
  }

  // 3. Update stateful traps & shooters
  for (const b of blocks) {
    b.timer += dt;

    if (b.itemId === 'crumble_block') {
      if (b.state === 'triggered') {
        b.fireCooldown -= dt;
        if (b.fireCooldown <= 0) {
          b.state = 'collapsed';
          b.fireCooldown = 2.5;
          events.push({ type: 'particle', particleKind: 'dust', x: b.x + TILE, y: b.y + 20 });
        }
      } else if (b.state === 'collapsed') {
        b.fireCooldown -= dt;
        if (b.fireCooldown <= 0) {
          b.state = 'idle';
        }
      }
    }

    if (b.itemId === 'falling_spike') {
      if (b.state === 'idle') {
        const sensor: Rect = { x: b.x + 2, y: b.y + TILE, w: TILE - 4, h: 6 * TILE };
        const triggered = players.some((p) => p.alive && !p.finished && rectsOverlap(getPlayerRect(p), sensor));
        if (triggered) {
          b.state = 'falling';
          b.vy = 40;
          events.push({ type: 'sfx', sfx: 'punch' });
        }
      } else if (b.state === 'falling') {
        b.vy = Math.min(820, b.vy + 1800 * dt);
        b.y += b.vy * dt;
        const rect = getBlockRect(b);
        for (const s of solids) {
          if (s.blockId === b.id) continue;
          if (rectsOverlap(rect, s.rect)) {
            b.y = s.rect.y - rect.h;
            b.vy = 0;
            b.state = 'landed';
            events.push({ type: 'particle', particleKind: 'dust', x: b.x + TILE / 2, y: b.y + TILE });
            break;
          }
        }
        if (b.y > stage.killY) {
          b.state = 'collapsed';
        }
      }
    }

    if (b.itemId === 'punch_glove') {
      if (b.state === 'idle') {
        const { dx, dy } = dirVector(b.rot);
        const sensor: Rect =
          dx > 0
            ? { x: b.x + TILE, y: b.y, w: 2.5 * TILE, h: TILE }
            : dx < 0
              ? { x: b.x - 2.5 * TILE, y: b.y, w: 2.5 * TILE, h: TILE }
              : dy > 0
                ? { x: b.x, y: b.y + TILE, w: TILE, h: 2.5 * TILE }
                : { x: b.x, y: b.y - 2.5 * TILE, w: TILE, h: 2.5 * TILE };
        if (players.some((p) => p.alive && !p.finished && rectsOverlap(getPlayerRect(p), sensor))) {
          b.state = 'triggered';
          b.fireCooldown = 0.14;
        }
      } else if (b.state === 'triggered') {
        b.fireCooldown -= dt;
        if (b.fireCooldown <= 0) {
          b.state = 'punching';
          b.fireCooldown = 0.24;
          events.push({ type: 'sfx', sfx: 'punch' });
        }
      } else if (b.state === 'punching') {
        b.fireCooldown -= dt;
        if (b.fireCooldown <= 0) {
          b.state = 'collapsed'; // cooldown state reuse (not solid=false? keep solid via special check)
          b.fireCooldown = 0.85;
        }
      } else if (b.state === 'collapsed') {
        b.fireCooldown -= dt;
        if (b.fireCooldown <= 0) {
          b.state = 'idle';
        }
      }
    }

    if (b.itemId === 'crossbow' || b.itemId === 'hockey_shooter' || b.itemId === 'fire_tennis' || b.itemId === 'paper_plane') {
      b.fireCooldown -= dt;
      if (b.fireCooldown <= 0) {
        const { dx, dy } = dirVector(b.rot);
        const cx = b.x + TILE / 2 + dx * 22;
        const cy = b.y + TILE / 2 + dy * 22;
        if (b.itemId === 'crossbow') {
          b.fireCooldown = 1.8;
          projectiles.push({
            id: `${b.id}_p_${Math.round(actionElapsed * 1000)}`,
            kind: 'arrow',
            ownerId: b.ownerId,
            x: cx,
            y: cy,
            vx: dx * 460,
            vy: dy * 460,
            radius: 6,
            bouncesLeft: 0,
            life: 6.0,
          });
        } else if (b.itemId === 'hockey_shooter') {
          b.fireCooldown = 2.35;
          projectiles.push({
            id: `${b.id}_p_${Math.round(actionElapsed * 1000)}`,
            kind: 'puck',
            ownerId: b.ownerId,
            x: cx,
            y: cy,
            vx: dx * 340,
            vy: dy * 340,
            radius: 10,
            bouncesLeft: 3,
            life: 6.0,
          });
        } else if (b.itemId === 'fire_tennis') {
          b.fireCooldown = 2.1;
          projectiles.push({
            id: `${b.id}_p_${Math.round(actionElapsed * 1000)}`,
            kind: 'fireball',
            ownerId: b.ownerId,
            x: cx,
            y: cy,
            vx: dx * 320,
            vy: dy === 0 ? -360 : dy * 340,
            radius: 10,
            bouncesLeft: 1,
            life: 5.0,
          });
        } else {
          b.fireCooldown = 2.2;
          projectiles.push({
            id: `${b.id}_p_${Math.round(actionElapsed * 1000)}`,
            kind: 'plane',
            ownerId: b.ownerId,
            x: cx,
            y: cy,
            vx: dx * 240,
            vy: dy * 240,
            radius: 9,
            bouncesLeft: 0,
            life: 5.5,
          });
        }
        events.push({ type: 'sfx', sfx: 'shoot' });
      }
    }

    if (b.itemId === 'beehive') {
      b.fireCooldown -= dt;
      if (b.fireCooldown <= 0) {
        const hiveCx = b.x + TILE / 2;
        const hiveCy = b.y + TILE / 2;
        const nearby = players.some(
          (p) =>
            p.alive &&
            !p.finished &&
            Math.hypot(p.x + PLAYER_W / 2 - hiveCx, p.y + PLAYER_H / 2 - hiveCy) < 4.5 * TILE
        );
        const activeBees = projectiles.filter((pr) => pr.kind === 'bee' && pr.sourceBlockId === b.id).length;
        if (nearby && activeBees < 2) {
          b.fireCooldown = 2.6;
          projectiles.push({
            id: `${b.id}_bee_${Math.round(actionElapsed * 1000)}`,
            kind: 'bee',
            ownerId: b.ownerId,
            sourceBlockId: b.id,
            x: hiveCx,
            y: hiveCy,
            vx: 0,
            vy: -40,
            radius: 8,
            bouncesLeft: 0,
            life: 4.8,
          });
          events.push({ type: 'sfx', sfx: 'shoot' });
        }
      }
    }
  }

  // 4. Update projectiles
  const blackHoles = blocks.filter((b) => b.itemId === 'black_hole');
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const pr = projectiles[i];
    pr.life -= dt;
    if (pr.life <= 0 || pr.x < -80 || pr.x > WORLD_W + 80 || pr.y < -80 || pr.y > stage.killY) {
      projectiles.splice(i, 1);
      continue;
    }

    // Black hole pull on projectiles
    let swallowed = false;
    for (const bh of blackHoles) {
      const bhX = bh.x + TILE / 2;
      const bhY = bh.y + TILE / 2;
      const dx = bhX - pr.x;
      const dy = bhY - pr.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 20) {
        swallowed = true;
        break;
      }
      if (dist < 4.5 * TILE && dist > 1) {
        pr.vx += (dx / dist) * 520 * dt;
        pr.vy += (dy / dist) * 520 * dt;
      }
    }
    if (swallowed) {
      projectiles.splice(i, 1);
      continue;
    }

    if (pr.kind === 'fireball') {
      pr.vy += 680 * dt;
    } else if (pr.kind === 'bee') {
      let nearest: PlayerState | null = null;
      let bestDist = Infinity;
      for (const p of players) {
        if (!p.alive || p.finished) continue;
        const d = Math.hypot(p.x + PLAYER_W / 2 - pr.x, p.y + PLAYER_H / 2 - pr.y);
        if (d < bestDist) {
          bestDist = d;
          nearest = p;
        }
      }
      if (nearest && bestDist > 1) {
        const tx = nearest.x + PLAYER_W / 2 - pr.x;
        const ty = nearest.y + PLAYER_H / 2 - pr.y;
        pr.vx += (tx / bestDist) * 380 * dt;
        pr.vy += (ty / bestDist) * 380 * dt;
        const spd = Math.hypot(pr.vx, pr.vy);
        if (spd > 155) {
          pr.vx = (pr.vx / spd) * 155;
          pr.vy = (pr.vy / spd) * 155;
        }
      }
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      continue;
    }

    const prevX = pr.x;
    const prevY = pr.y;
    if (pr.kind === 'plane') {
      const spd = Math.hypot(pr.vx, pr.vy) || 1;
      const perpX = -pr.vy / spd;
      const perpY = pr.vx / spd;
      const wave = Math.cos(pr.life * 6.5) * 95;
      pr.x += (pr.vx + perpX * wave) * dt;
      pr.y += (pr.vy + perpY * wave) * dt;
    } else {
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
    }

    const prRect: Rect = {
      x: pr.x - pr.radius,
      y: pr.y - pr.radius,
      w: pr.radius * 2,
      h: pr.radius * 2,
    };

    let destroyed = false;
    for (const s of solids) {
      if (!rectsOverlap(prRect, s.rect)) continue;
      if (pr.bouncesLeft <= 0) {
        destroyed = true;
        events.push({ type: 'particle', particleKind: 'spark', x: pr.x, y: pr.y });
        break;
      } else {
        pr.bouncesLeft -= 1;
        const wasLeftRight = prevX + pr.radius <= s.rect.x || prevX - pr.radius >= s.rect.x + s.rect.w;
        const wasTopBottom = prevY + pr.radius <= s.rect.y || prevY - pr.radius >= s.rect.y + s.rect.h;
        if (wasLeftRight || !wasTopBottom) {
          pr.vx = -pr.vx;
          pr.x = prevX + pr.vx * dt;
        }
        if (wasTopBottom || !wasLeftRight) {
          pr.vy = -pr.vy;
          pr.y = prevY + pr.vy * dt;
        }
        events.push({ type: 'particle', particleKind: 'spark', x: pr.x, y: pr.y });
        break;
      }
    }
    if (destroyed) {
      projectiles.splice(i, 1);
    }
  }
}

interface SolidEntry {
  rect: Rect;
  blockId?: string;
  itemId?: PlacedBlock['itemId'];
  ownerId?: string;
  block?: PlacedBlock;
  dx: number;
  dy: number;
}

export function collectSolidWorldRects(
  stage: StageDef,
  blocks: PlacedBlock[],
  blades: WindmillBladeState[]
): SolidEntry[] {
  const list: SolidEntry[] = [];
  for (const sp of stage.staticPlatforms) {
    list.push({ rect: sp, dx: 0, dy: 0 });
  }
  for (const bl of blades) {
    list.push({
      rect: { x: bl.x, y: bl.y, w: bl.w, h: bl.h },
      blockId: bl.id,
      dx: bl.x - bl.prevX,
      dy: bl.y - bl.prevY,
    });
  }
  for (const b of blocks) {
    if (!ITEM_MAP[b.itemId].solid) continue;
    if (b.itemId === 'crumble_block' && b.state === 'collapsed') continue;
    if (b.itemId === 'stairs') {
      // Lower 2x1 step
      list.push({
        rect: { x: b.x, y: b.y + TILE, w: 2 * TILE, h: TILE },
        blockId: b.id,
        itemId: b.itemId,
        ownerId: b.ownerId,
        block: b,
        dx: b.x - b.prevX,
        dy: b.y - b.prevY,
      });
      // Upper 1x1 step
      list.push({
        rect: { x: b.flipX ? b.x : b.x + TILE, y: b.y, w: TILE, h: TILE },
        blockId: b.id,
        itemId: b.itemId,
        ownerId: b.ownerId,
        block: b,
        dx: b.x - b.prevX,
        dy: b.y - b.prevY,
      });
      continue;
    }
    list.push({
      rect: getBlockRect(b),
      blockId: b.id,
      itemId: b.itemId,
      ownerId: b.ownerId,
      block: b,
      dx: b.x - b.prevX,
      dy: b.y - b.prevY,
    });
  }
  return list;
}

export function stepPlayerPhysics(
  p: PlayerState,
  input: InputState,
  stage: StageDef,
  blocks: PlacedBlock[],
  blades: WindmillBladeState[],
  projectiles: Projectile[],
  lavaY: number,
  actionElapsed: number,
  dt: number,
  rules: GameRules,
  events: SimEvent[],
  allowGoal: boolean
): void {
  p.animTime += dt;
  p.squashX += (1 - p.squashX) * Math.min(1, dt * 14);
  p.squashY += (1 - p.squashY) * Math.min(1, dt * 14);

  if (p.portalCooldown > 0) p.portalCooldown = Math.max(0, p.portalCooldown - dt);
  if (p.stunTimer > 0) p.stunTimer = Math.max(0, p.stunTimer - dt);

  // Dead post-mortem drift window
  if (!p.alive) {
    if (p.postMortemPending > 0 && !p.finished) {
      p.postMortemPending = Math.max(0, p.postMortemPending - dt);
      p.vy += GRAVITY * rules.gravityScale * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (allowGoal && rectsOverlap(getPlayerRect(p), getGoalRect(stage))) {
        p.finished = true;
        p.finishTime = actionElapsed;
        events.push({ type: 'sfx', sfx: 'goal' });
        events.push({ type: 'particle', particleKind: 'confetti', x: p.x + PLAYER_W / 2, y: p.y });
      }
    }
    return;
  }

  if (p.finished) return;

  const solids = collectSolidWorldRects(stage, blocks, blades);

  // Rider carry from moving platform / windmill blade
  if (p.onGround && p.ridingPlatformId) {
    const carrier = solids.find((s) => s.blockId === p.ridingPlatformId);
    if (carrier) {
      p.x += carrier.dx;
      p.y += carrier.dy;
    }
  }

  // Determine crouch state (keep crouched if standing would collide with ceiling)
  const wantsCrouch = input.down && p.onGround;
  if (wantsCrouch) {
    p.crouching = true;
  } else if (p.crouching) {
    const standingRect: Rect = { x: p.x, y: p.y, w: PLAYER_W, h: PLAYER_H };
    const blockedAbove = solids.some((s) => rectsOverlap(standingRect, s.rect));
    if (!blockedAbove) {
      p.crouching = false;
    }
  }

  p.dancing = input.dance && p.onGround && !input.left && !input.right;

  // Check honey overlap / standing
  p.inHoney = false;
  const currentRect = getPlayerRect(p);
  const footProbe: Rect = { x: currentRect.x + 2, y: currentRect.y + currentRect.h, w: currentRect.w - 4, h: 4 };
  let standingOnIce = false;
  let conveyorPush = 0;

  for (const b of blocks) {
    if (b.itemId === 'honey') {
      if (rectsOverlap(currentRect, getBlockRect(b))) {
        p.inHoney = true;
      }
    } else if (b.honeyed && b.state !== 'collapsed') {
      const br = getBlockRect(b);
      if (rectsOverlap(footProbe, br) || rectsOverlap(currentRect, br)) {
        p.inHoney = true;
      }
    }
  }

  for (const s of solids) {
    if (!rectsOverlap(footProbe, s.rect)) continue;
    if (s.itemId === 'ice_block') standingOnIce = true;
    if (s.itemId === 'conveyor' && s.block) {
      conveyorPush = (s.block.flipX ? -1 : 1) * CONVEYOR_SPEED;
    }
    if (s.itemId === 'rotating_gear' && s.block) {
      conveyorPush = (s.block.flipX ? -1 : 1) * 230;
    }
    if (s.itemId === 'crumble_block' && s.block && s.block.state === 'idle') {
      s.block.state = 'triggered';
      s.block.fireCooldown = 0.6;
    }
  }

  // Barbed wire slowdown & friction
  let inBarbedWire = false;
  for (const b of blocks) {
    if (b.itemId === 'barbed_wire' && rectsOverlap(currentRect, getBlockRect(b))) {
      inBarbedWire = true;
      break;
    }
  }

  // Horizontal movement
  const moveDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (moveDir !== 0) p.facing = moveDir as 1 | -1;

  const honeyMult = p.inHoney ? HONEY_SPEED_MULT : 1;
  const wireMult = inBarbedWire ? 0.36 : 1;
  const crouchMult = p.crouching ? 0.58 : 1;
  const maxSpeed = (input.sprint ? SPRINT_SPEED : WALK_SPEED) * honeyMult * wireMult * crouchMult;
  const targetVx = moveDir * maxSpeed + conveyorPush;

  if (p.wallJumpLockTimer > 0) {
    p.wallJumpLockTimer = Math.max(0, p.wallJumpLockTimer - dt);
  } else if (p.stunTimer <= 0) {
    const accel = p.onGround ? (standingOnIce ? ICE_ACCEL : GROUND_ACCEL) : AIR_ACCEL;
    if (p.vx < targetVx) {
      p.vx = Math.min(targetVx, p.vx + accel * dt);
    } else if (p.vx > targetVx) {
      p.vx = Math.max(targetVx, p.vx - accel * dt);
    }
  }

  // External environmental forces (applied after input acceleration/friction)
  for (const b of blocks) {
    if (b.itemId !== 'black_hole') continue;
    const bhX = b.x + TILE / 2;
    const bhY = b.y + TILE / 2;
    const px = p.x + PLAYER_W / 2;
    const py = p.y + PLAYER_H / 2;
    const dx = bhX - px;
    const dy = bhY - py;
    const dist = Math.hypot(dx, dy);
    if (dist > 1 && dist < 4.5 * TILE) {
      const pull = 680 * (1 - dist / (5.2 * TILE));
      p.vx += (dx / dist) * pull * dt;
      p.vy += (dy / dist) * pull * dt;
    }
  }

  for (const b of blocks) {
    if (b.itemId !== 'fan') continue;
    const fanZone = getFanRect(b);
    if (rectsOverlap(currentRect, fanZone)) {
      const { dx, dy } = dirVector(b.rot);
      p.vx += dx * FAN_FORCE * dt;
      p.vy += dy * FAN_FORCE * 1.15 * dt;
    }
  }

  // Timers for coyote & jump buffer
  if (p.onGround) {
    p.coyoteTimer = COYOTE_TIME;
  } else {
    p.coyoteTimer = Math.max(0, p.coyoteTimer - dt);
  }

  const jumpPressed = input.jump && !p.jumpHeldPrev;
  const jumpReleased = !input.jump && p.jumpHeldPrev;
  p.jumpHeldPrev = input.jump;

  if (jumpPressed) {
    p.jumpBufferTimer = JUMP_BUFFER;
  } else {
    p.jumpBufferTimer = Math.max(0, p.jumpBufferTimer - dt);
  }

  const jumpMult = rules.jumpScale * (p.inHoney ? HONEY_JUMP_MULT : 1) * (inBarbedWire ? 0.62 : 1);

  // Jump / Wall jump execution
  if (p.jumpBufferTimer > 0) {
    if (p.coyoteTimer > 0) {
      p.vy = JUMP_VEL * jumpMult;
      p.onGround = false;
      p.coyoteTimer = 0;
      p.jumpBufferTimer = 0;
      p.ridingPlatformId = null;
      p.squashX = 0.78;
      p.squashY = 1.26;
      events.push({ type: 'sfx', sfx: 'jump' });
      events.push({ type: 'particle', particleKind: 'dust', x: p.x + PLAYER_W / 2, y: p.y + PLAYER_H });
    } else if (p.onWallLeft || p.onWallRight) {
      const pushDir = p.onWallLeft ? 1 : -1;
      p.vx = pushDir * WALL_JUMP_VX;
      p.vy = WALL_JUMP_VY * jumpMult;
      p.facing = pushDir;
      p.wallJumpLockTimer = WALL_JUMP_LOCK;
      p.jumpBufferTimer = 0;
      p.squashX = 0.76;
      p.squashY = 1.24;
      events.push({ type: 'sfx', sfx: 'wall_jump' });
      events.push({
        type: 'particle',
        particleKind: 'dust',
        x: p.onWallLeft ? p.x : p.x + PLAYER_W,
        y: p.y + PLAYER_H / 2,
      });
    }
  }

  // Variable jump height
  if (jumpReleased && p.vy < -120) {
    p.vy *= JUMP_CUT_MULT;
  }

  // Gravity & wall slide
  p.vy += GRAVITY * rules.gravityScale * dt;
  const pressingWall = (p.onWallLeft && input.left) || (p.onWallRight && input.right);
  if (!p.onGround && pressingWall && p.vy > WALL_SLIDE_MAX_VY) {
    p.vy = WALL_SLIDE_MAX_VY;
  }
  if (p.vy > MAX_FALL_SPEED) {
    p.vy = MAX_FALL_SPEED;
  }

  // --- Axis-separated AABB resolution ---
  const h = p.crouching ? CROUCH_H : PLAYER_H;
  const yOffset = PLAYER_H - h;

  // X Axis
  p.x += p.vx * dt;
  p.x = Math.max(-20, Math.min(WORLD_W - PLAYER_W + 20, p.x));
  p.onWallLeft = false;
  p.onWallRight = false;

  let box: Rect = { x: p.x, y: p.y + yOffset, w: PLAYER_W, h };
  for (const s of solids) {
    if (!rectsOverlap(box, s.rect)) continue;
    if (s.itemId === 'bounce_block') {
      const pushDir = p.vx >= 0 ? -1 : 1;
      p.x = p.vx >= 0 ? s.rect.x - PLAYER_W : s.rect.x + s.rect.w;
      p.vx = pushDir * 440;
      p.vy = Math.min(p.vy, -260);
      p.stunTimer = 0.12;
      events.push({ type: 'sfx', sfx: 'spring' });
      box.x = p.x;
      continue;
    }
    if (p.vx > 0) {
      p.x = s.rect.x - PLAYER_W;
      p.vx = 0;
      p.onWallRight = true;
    } else if (p.vx < 0) {
      p.x = s.rect.x + s.rect.w;
      p.vx = 0;
      p.onWallLeft = true;
    }
    box.x = p.x;
  }

  // Also detect adjacent walls within 1.5px for reliable wall-slide/wall-jump
  if (!p.onWallLeft) {
    const leftProbe: Rect = { x: p.x - 1.5, y: p.y + yOffset + 4, w: 1.5, h: h - 8 };
    if (solids.some((s) => rectsOverlap(leftProbe, s.rect))) p.onWallLeft = true;
  }
  if (!p.onWallRight) {
    const rightProbe: Rect = { x: p.x + PLAYER_W, y: p.y + yOffset + 4, w: 1.5, h: h - 8 };
    if (solids.some((s) => rectsOverlap(rightProbe, s.rect))) p.onWallRight = true;
  }

  // Y Axis
  const wasOnGround = p.onGround;
  const prevVy = p.vy;
  const prevBottom = p.y + PLAYER_H;
  p.y += p.vy * dt;
  p.onGround = false;
  p.ridingPlatformId = null;

  box = { x: p.x, y: p.y + yOffset, w: PLAYER_W, h };
  for (const s of solids) {
    if (!rectsOverlap(box, s.rect)) continue;
    if (s.itemId === 'bounce_block') {
      if (p.vy >= 0) {
        p.y = s.rect.y - PLAYER_H;
        p.vy = -1020 * jumpMult;
      } else {
        p.y = s.rect.y + s.rect.h - yOffset;
        p.vy = 420;
      }
      p.onGround = false;
      p.squashX = 0.72;
      p.squashY = 1.32;
      events.push({ type: 'sfx', sfx: 'spring' });
      events.push({ type: 'particle', particleKind: 'stars', x: p.x + PLAYER_W / 2, y: p.y + PLAYER_H });
      box.y = p.y + yOffset;
      continue;
    }
    if (p.vy >= 0) {
      p.y = s.rect.y - PLAYER_H;
      p.vy = 0;
      p.onGround = true;
      p.ridingPlatformId = s.blockId ?? null;

      if (s.itemId === 'spring_pad') {
        p.vy = SPRING_VEL * jumpMult;
        p.onGround = false;
        p.ridingPlatformId = null;
        p.squashX = 0.7;
        p.squashY = 1.35;
        events.push({ type: 'sfx', sfx: 'spring' });
        events.push({ type: 'particle', particleKind: 'stars', x: p.x + PLAYER_W / 2, y: p.y + PLAYER_H });
      } else if (!wasOnGround && prevVy > 220) {
        p.squashX = 1.24;
        p.squashY = 0.78;
        events.push({ type: 'sfx', sfx: 'land' });
      }
    } else if (p.vy < 0) {
      p.y = s.rect.y + s.rect.h - yOffset;
      p.vy = 0;
    }
    box.y = p.y + yOffset;
  }

  // One-way platform landing (only from above when not pressing down)
  if (p.vy >= 0 && !input.down) {
    for (const b of blocks) {
      if (b.itemId !== 'one_way_platform') continue;
      const br = getBlockRect(b);
      const overlapsX = p.x + PLAYER_W > br.x && p.x < br.x + br.w;
      if (overlapsX && prevBottom <= br.y + 8 && p.y + PLAYER_H >= br.y) {
        p.y = br.y - PLAYER_H;
        p.vy = 0;
        p.onGround = true;
        p.ridingPlatformId = b.id;
        if (!wasOnGround && prevVy > 220) {
          p.squashX = 1.2;
          p.squashY = 0.82;
          events.push({ type: 'sfx', sfx: 'land' });
        }
        break;
      }
    }
  }

  // --- Hazard, Punch, Portal, Coin & Goal checks ---
  const finalRect = getPlayerRect(p);
  const shrinkRect: Rect = {
    x: finalRect.x + 4,
    y: finalRect.y + 4,
    w: finalRect.w - 8,
    h: finalRect.h - 6,
  };

  // Punch glove active hit
  for (const b of blocks) {
    if (b.itemId === 'punch_glove' && b.state === 'punching') {
      if (rectsOverlap(finalRect, getPunchRect(b))) {
        const { dx, dy } = dirVector(b.rot);
        p.vx = dx !== 0 ? dx * 620 : p.vx;
        p.vy = dy !== 0 ? dy * 580 : -440;
        p.stunTimer = 0.28;
        p.onGround = false;
      }
    }
  }

  // Portals
  if (p.portalCooldown <= 0) {
    for (const b of blocks) {
      if (b.itemId === 'portal' && b.pairId && rectsOverlap(finalRect, getBlockRect(b))) {
        const partner = blocks.find((other) => other.id !== b.id && other.itemId === 'portal' && other.pairId === b.pairId);
        if (partner) {
          p.x = partner.x + (TILE - PLAYER_W) / 2;
          p.y = partner.y + (TILE - PLAYER_H) / 2;
          p.portalCooldown = 0.55;
          events.push({ type: 'sfx', sfx: 'portal' });
          events.push({ type: 'particle', particleKind: 'stars', x: p.x + PLAYER_W / 2, y: p.y + PLAYER_H / 2 });
          break;
        }
      }
    }
  }

  // Coins
  for (const b of blocks) {
    if (b.itemId === 'coin' && b.state !== 'collected') {
      const coinRect: Rect = { x: b.x + 6, y: b.y + 6, w: TILE - 12, h: TILE - 12 };
      if (rectsOverlap(finalRect, coinRect)) {
        b.state = 'collected';
        p.hasCoin = true;
        events.push({ type: 'sfx', sfx: 'coin' });
        events.push({ type: 'particle', particleKind: 'stars', x: b.x + TILE / 2, y: b.y + TILE / 2, color: '#FFB703' });
      }
    }
  }

  // Lethal check helper
  const killPlayer = (killerOwnerId: string | null) => {
    if (!p.alive) return;
    p.alive = false;
    p.deathTime = actionElapsed;
    p.killedByOwnerId = killerOwnerId && killerOwnerId !== p.id ? killerOwnerId : null;
    p.postMortemPending = POST_MORTEM_WINDOW;
    p.vy = Math.min(p.vy, -240);
    events.push({ type: 'sfx', sfx: 'death' });
    events.push({ type: 'shake', intensity: 7 });
    events.push({ type: 'particle', particleKind: 'feathers', x: p.x + PLAYER_W / 2, y: p.y + PLAYER_H / 2 });
  };

  // Pit / Lava death
  if (p.y > stage.killY || (stage.risingLava && finalRect.y + finalRect.h > lavaY)) {
    killPlayer(null);
    return;
  }

  // Block hazards
  for (const b of blocks) {
    if (b.itemId === 'saw_blade' || b.itemId === 'moving_saw') {
      const cx = b.x + TILE / 2;
      const cy = b.y + TILE / 2;
      const px = Math.max(shrinkRect.x, Math.min(cx, shrinkRect.x + shrinkRect.w));
      const py = Math.max(shrinkRect.y, Math.min(cy, shrinkRect.y + shrinkRect.h));
      const distSq = (cx - px) ** 2 + (cy - py) ** 2;
      if (distSq < (TILE * 0.42) ** 2) {
        killPlayer(b.ownerId);
        return;
      }
    } else if (b.itemId === 'wrecking_ball') {
      const wb = getWreckingBallPos(b, actionElapsed);
      const px = Math.max(shrinkRect.x, Math.min(wb.bx, shrinkRect.x + shrinkRect.w));
      const py = Math.max(shrinkRect.y, Math.min(wb.by, shrinkRect.y + shrinkRect.h));
      if ((wb.bx - px) ** 2 + (wb.by - py) ** 2 < (wb.radius - 2) ** 2) {
        killPlayer(b.ownerId);
        return;
      }
    } else if (b.itemId === 'black_hole') {
      const cx = b.x + TILE / 2;
      const cy = b.y + TILE / 2;
      const px = p.x + PLAYER_W / 2;
      const py = p.y + PLAYER_H / 2;
      if (Math.hypot(cx - px, cy - py) < 18) {
        killPlayer(b.ownerId);
        return;
      }
    } else if (b.itemId === 'spike_strip' || (b.itemId === 'flip_spike' && isFlipSpikeActive(b.timer))) {
      if (rectsOverlap(shrinkRect, getSpikeTipRect(b))) {
        killPlayer(b.ownerId);
        return;
      }
    } else if (b.itemId === 'falling_spike') {
      const br = getBlockRect(b);
      const bottomSpike: Rect = { x: br.x + 4, y: br.y + br.h - 8, w: br.w - 8, h: 14 };
      if (rectsOverlap(shrinkRect, bottomSpike) || (b.state === 'falling' && rectsOverlap(finalRect, br))) {
        killPlayer(b.ownerId);
        return;
      }
    } else if (b.itemId === 'flame_thrower') {
      const flame = getFlameRect(b);
      if (flame && rectsOverlap(shrinkRect, flame)) {
        killPlayer(b.ownerId);
        return;
      }
    }
  }

  // Projectiles
  for (const pr of projectiles) {
    const prRect: Rect = {
      x: pr.x - pr.radius * 0.8,
      y: pr.y - pr.radius * 0.8,
      w: pr.radius * 1.6,
      h: pr.radius * 1.6,
    };
    if (rectsOverlap(shrinkRect, prRect)) {
      killPlayer(pr.ownerId);
      return;
    }
  }

  // Goal reached
  if (allowGoal && rectsOverlap(finalRect, getGoalRect(stage))) {
    p.finished = true;
    p.finishTime = actionElapsed;
    events.push({ type: 'sfx', sfx: 'goal' });
    events.push({ type: 'particle', particleKind: 'confetti', x: p.x + PLAYER_W / 2, y: p.y });
  }
}

export function resolvePlayerCollisions(players: PlayerState[]): void {
  for (let i = 0; i < players.length; i++) {
    const a = players[i];
    if (!a.alive || a.finished) continue;
    for (let j = i + 1; j < players.length; j++) {
      const b = players[j];
      if (!b.alive || b.finished) continue;
      const ra = getPlayerRect(a);
      const rb = getPlayerRect(b);
      if (!rectsOverlap(ra, rb)) continue;
      const overlapX = Math.min(ra.x + ra.w, rb.x + rb.w) - Math.max(ra.x, rb.x);
      const overlapY = Math.min(ra.y + ra.h, rb.y + rb.h) - Math.max(ra.y, rb.y);
      if (overlapX < overlapY) {
        const push = overlapX / 2;
        if (ra.x < rb.x) {
          a.x -= push;
          b.x += push;
        } else {
          a.x += push;
          b.x -= push;
        }
        const avgVx = (a.vx + b.vx) * 0.5;
        a.vx = avgVx - Math.sign(b.x - a.x) * 80;
        b.vx = avgVx + Math.sign(b.x - a.x) * 80;
      } else {
        if (ra.y < rb.y && a.vy >= 0) {
          a.y = rb.y - PLAYER_H;
          a.vy = -340;
          b.vy = Math.max(b.vy, 120);
        } else if (rb.y < ra.y && b.vy >= 0) {
          b.y = ra.y - PLAYER_H;
          b.vy = -340;
          a.vy = Math.max(a.vy, 120);
        }
      }
    }
  }
}
