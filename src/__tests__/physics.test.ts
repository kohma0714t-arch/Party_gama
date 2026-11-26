import { describe, expect, it } from 'vitest';
import {
  CROUCH_H,
  DEFAULT_RULES,
  DT,
  HONEY_SPEED_MULT,
  PLAYER_H,
  PLAYER_W,
  TILE,
  WALK_SPEED,
  WORLD_H,
} from '../game/constants';
import { getPlayerRect, stepPlayerPhysics } from '../game/physics';
import { InputState, PlacedBlock, PlayerState, StageDef } from '../game/types';

function makeStage(): StageDef {
  return {
    id: 'farm',
    nameJa: 'テスト',
    subtitleJa: '',
    theme: 'farm',
    startPoint: { x: 100, y: 500 },
    goalPoint: { x: 1100, y: 500 },
    killY: WORLD_H + 100,
    risingLava: false,
    staticPlatforms: [
      { x: 0, y: 500, w: 1280, h: 100, kind: 'ground' },
      { x: 300, y: 200, w: 40, h: 300, kind: 'wall' },
    ],
  };
}

function makePlayer(x = 100, y = 500 - PLAYER_H): PlayerState {
  return {
    id: 'p1',
    name: 'テスト',
    character: 'chicken',
    isHost: true,
    slotIndex: 0,
    score: 0,
    zeroStreak: 0,
    x,
    y,
    vx: 0,
    vy: 0,
    facing: 1,
    onGround: true,
    onWallLeft: false,
    onWallRight: false,
    crouching: false,
    dancing: false,
    coyoteTimer: 0.1,
    jumpBufferTimer: 0,
    wallJumpLockTimer: 0,
    jumpHeldPrev: false,
    inHoney: false,
    portalCooldown: 0,
    ridingPlatformId: null,
    alive: true,
    finished: false,
    finishTime: null,
    deathTime: null,
    killedByOwnerId: null,
    postMortemPending: 0,
    hasCoin: false,
    pickedBoxIndex: null,
    heldItemId: null,
    hasPlaced: false,
    portalFirstPos: null,
    cursor: { gx: 0, gy: 0, rot: 0, flipX: false, visible: false },
    animTime: 0,
    squashX: 1,
    squashY: 1,
    stunTimer: 0,
  };
}

const IDLE: InputState = {
  left: false,
  right: false,
  up: false,
  down: false,
  jump: false,
  sprint: false,
  dance: false,
};

describe('Physics Engine', () => {
  it('標準ジャンプで5マス（200px）以上の高さに到達できる', () => {
    const stage = makeStage();
    const p = makePlayer();
    const startY = p.y;
    let minY = p.y;

    for (let i = 0; i < 60; i++) {
      stepPlayerPhysics(p, { ...IDLE, jump: true }, stage, [], [], [], 900, i * DT, DT, DEFAULT_RULES, [], false);
      minY = Math.min(minY, p.y);
    }

    expect(startY - minY).toBeGreaterThanOrEqual(5 * TILE);
  });

  it('壁ジャンプで3マス（120px）以上上昇し反対方向へ跳ぶ', () => {
    const stage = makeStage();
    const p = makePlayer(340, 380);
    p.onGround = false;
    p.coyoteTimer = 0;
    p.onWallLeft = true;
    const startY = p.y;
    let minY = p.y;

    let launchVx = 0;
    for (let i = 0; i < 45; i++) {
      stepPlayerPhysics(p, { ...IDLE, jump: true }, stage, [], [], [], 900, i * DT, DT, DEFAULT_RULES, [], false);
      if (i === 0) launchVx = p.vx;
      minY = Math.min(minY, p.y);
    }

    expect(startY - minY).toBeGreaterThanOrEqual(3 * TILE);
    expect(launchVx).toBeGreaterThan(0);
  });

  it('コヨーテタイム中は足場離脱後でもジャンプできる', () => {
    const stage = makeStage();
    const p = makePlayer(100, 440);
    p.onGround = false;
    p.coyoteTimer = 0.08;
    // Step 3 frames (~0.05s) without jump, then press jump
    for (let i = 0; i < 3; i++) {
      stepPlayerPhysics(p, IDLE, stage, [], [], [], 900, i * DT, DT, DEFAULT_RULES, [], false);
    }
    stepPlayerPhysics(p, { ...IDLE, jump: true }, stage, [], [], [], 900, 3 * DT, DT, DEFAULT_RULES, [], false);
    expect(p.vy).toBeLessThan(-700);
  });

  it('しゃがみ状態は高さ22pxになり1マス（40px）天井の下を通過できる', () => {
    const stage = makeStage();
    // 1 tile (40px) gap above ground (460..500)
    stage.staticPlatforms.push({ x: 160, y: 420, w: 80, h: 40, kind: 'girder' });
    const p = makePlayer(120, 500 - PLAYER_H);

    for (let i = 0; i < 45; i++) {
      stepPlayerPhysics(
        p,
        { ...IDLE, down: true, right: true },
        stage,
        [],
        [],
        [],
        900,
        i * DT,
        DT,
        DEFAULT_RULES,
        [],
        false
      );
    }

    expect(getPlayerRect(p).h).toBe(CROUCH_H);
    expect(p.x).toBeGreaterThan(180);
  });

  it('ハチミツに触れると移動速度が低下し、バネ足場では大跳躍する', () => {
    const stage = makeStage();
    const honeyBlock: PlacedBlock = {
      id: 'h1',
      itemId: 'honey',
      ownerId: 'p1',
      gx: 3,
      gy: 11,
      w: 1,
      h: 1,
      rot: 0,
      flipX: false,
      honeyed: false,
      attachedToId: null,
      attachOffsetX: 0,
      attachOffsetY: 0,
      attachAngleOffset: 0,
      x: 120,
      y: 500 - TILE,
      prevX: 120,
      prevY: 500 - TILE,
      angle: 0,
      timer: 0,
      state: 'idle',
      vy: 0,
      fireCooldown: 0,
    };

    const pHoney = makePlayer(120, 500 - PLAYER_H);
    for (let i = 0; i < 20; i++) {
      stepPlayerPhysics(
        pHoney,
        { ...IDLE, right: true },
        stage,
        [honeyBlock],
        [],
        [],
        900,
        i * DT,
        DT,
        DEFAULT_RULES,
        [],
        false
      );
    }
    expect(pHoney.inHoney).toBe(true);
    expect(pHoney.vx).toBeLessThanOrEqual(WALK_SPEED * HONEY_SPEED_MULT + 5);

    const springBlock: PlacedBlock = {
      ...honeyBlock,
      id: 's1',
      itemId: 'spring_pad',
      x: 400,
      y: 500 - TILE,
    };
    const pSpring = makePlayer(400 + (TILE - PLAYER_W) / 2, 500 - TILE - PLAYER_H - 2);
    pSpring.onGround = false;
    pSpring.vy = 120;
    stepPlayerPhysics(pSpring, IDLE, stage, [springBlock], [], [], 900, 0, DT, DEFAULT_RULES, [], false);
    expect(pSpring.vy).toBeLessThan(-1100);
  });

  it('すり抜け足場は下からジャンプで通過でき上から着地できる', () => {
    const stage = makeStage();
    const oneWay: PlacedBlock = {
      id: 'ow1',
      itemId: 'one_way_platform',
      ownerId: 'p1',
      gx: 4,
      gy: 10,
      w: 3,
      h: 1,
      rot: 0,
      flipX: false,
      honeyed: false,
      attachedToId: null,
      attachOffsetX: 0,
      attachOffsetY: 0,
      attachAngleOffset: 0,
      x: 160,
      y: 400,
      prevX: 160,
      prevY: 400,
      angle: 0,
      timer: 0,
      state: 'idle',
      vy: 0,
      fireCooldown: 0,
    };

    const p = makePlayer(180, 500 - PLAYER_H);
    for (let i = 0; i < 45; i++) {
      stepPlayerPhysics(p, { ...IDLE, jump: i < 18 }, stage, [oneWay], [], [], 900, i * DT, DT, DEFAULT_RULES, [], false);
    }
    expect(p.onGround).toBe(true);
    expect(p.y).toBe(400 - PLAYER_H);
  });

  it('バウンスゴム床は上面から触れると高く弾き返す', () => {
    const stage = makeStage();
    const bounce: PlacedBlock = {
      id: 'bb1',
      itemId: 'bounce_block',
      ownerId: 'p1',
      gx: 5,
      gy: 11,
      w: 2,
      h: 1,
      rot: 0,
      flipX: false,
      honeyed: false,
      attachedToId: null,
      attachOffsetX: 0,
      attachOffsetY: 0,
      attachAngleOffset: 0,
      x: 200,
      y: 440,
      prevX: 200,
      prevY: 440,
      angle: 0,
      timer: 0,
      state: 'idle',
      vy: 0,
      fireCooldown: 0,
    };
    const p = makePlayer(210, 440 - PLAYER_H - 2);
    p.onGround = false;
    p.vy = 180;
    stepPlayerPhysics(p, IDLE, stage, [bounce], [], [], 900, 0, DT, DEFAULT_RULES, [], false);
    expect(p.vy).toBeLessThan(-950);
  });

  it('ブラックホールは周囲を引き寄せ中心接触で即死させる', () => {
    const stage = makeStage();
    const bh: PlacedBlock = {
      id: 'bh1',
      itemId: 'black_hole',
      ownerId: 'p2',
      gx: 15,
      gy: 10,
      w: 1,
      h: 1,
      rot: 0,
      flipX: false,
      honeyed: false,
      attachedToId: null,
      attachOffsetX: 0,
      attachOffsetY: 0,
      attachAngleOffset: 0,
      x: 600,
      y: 400,
      prevX: 600,
      prevY: 400,
      angle: 0,
      timer: 0,
      state: 'idle',
      vy: 0,
      fireCooldown: 0,
    };

    const pFar = makePlayer(500, 400);
    pFar.onGround = false;
    stepPlayerPhysics(pFar, IDLE, stage, [bh], [], [], 900, 0, DT, DEFAULT_RULES, [], false);
    expect(pFar.vx).toBeGreaterThan(0);

    const pNear = makePlayer(600 + 6, 400);
    stepPlayerPhysics(pNear, IDLE, stage, [bh], [], [], 900, 0, DT, DEFAULT_RULES, [], false);
    expect(pNear.alive).toBe(false);
    expect(pNear.killedByOwnerId).toBe('p2');
  });
});
