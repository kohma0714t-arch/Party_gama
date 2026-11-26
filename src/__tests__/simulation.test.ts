import { describe, expect, it } from 'vitest';
import { ITEM_CATALOG } from '../game/catalog';
import { DT, TILE } from '../game/constants';
import { GameSimulation } from '../game/simulation';
import { STAGE_LIST, TREEHOUSE_STAGE } from '../game/stages';

describe('GameSimulation Rules & Mechanics', () => {
  it('最大6人まで参加でき7人目は拒否される', () => {
    const sim = new GameSimulation();
    for (let i = 0; i < 6; i++) {
      expect(sim.addPlayer(`p${i}`, `プレイヤー${i + 1}`, i === 0)).not.toBeNull();
    }
    expect(sim.players).toHaveLength(6);
    expect(sim.addPlayer('p7', '7人目', false)).toBeNull();
  });

  it('パーティーボックスで同じ枠を2人が選んでも早い者勝ちになる', () => {
    const sim = new GameSimulation();
    sim.addPlayer('p1', 'A', true);
    sim.addPlayer('p2', 'B', false);
    sim.startGame();

    expect(sim.phase).toBe('BOX_PICK');
    expect(sim.pickBoxItem('p1', 0)).toBe(true);
    expect(sim.pickBoxItem('p2', 0)).toBe(false);
    expect(sim.pickBoxItem('p2', 1)).toBe(true);
    expect(sim.phase).toBe('PLACE');
  });

  it('2人以上で全員ゴール時はTOO EASYとなり全員0点、全員脱落時はNO POINTSで全員0点になる', () => {
    const sim = new GameSimulation();
    const p1 = sim.addPlayer('p1', 'A', true)!;
    const p2 = sim.addPlayer('p2', 'B', false)!;
    sim.round = 1;

    // Too Easy
    p1.alive = true;
    p1.finished = true;
    p1.finishTime = 3.0;
    p2.alive = true;
    p2.finished = true;
    p2.finishTime = 4.0;
    const tooEasy = sim.calculateRoundScores();
    expect(tooEasy.outcome).toBe('too_easy');
    expect(tooEasy.entries.every((e) => e.totalAdded === 0)).toBe(true);

    // No Points
    p1.alive = false;
    p1.finished = false;
    p2.alive = false;
    p2.finished = false;
    const noPts = sim.calculateRoundScores();
    expect(noPts.outcome).toBe('no_points');
    expect(noPts.entries.every((e) => e.totalAdded === 0)).toBe(true);
  });

  it('ソロ・1位・罠キル・コイン・カムバックの各ボーナスが正確に加算される', () => {
    const sim = new GameSimulation();
    const p1 = sim.addPlayer('p1', 'A', true)!;
    const p2 = sim.addPlayer('p2', 'B', false)!;
    sim.round = 3;

    // Give p2 existing score and p1 a 2-round zero streak
    p2.score = 1.0;
    p1.zeroStreak = 2;

    p1.alive = true;
    p1.finished = true;
    p1.finishTime = 5.2;
    p1.hasCoin = true;

    p2.alive = false;
    p2.finished = false;
    p2.killedByOwnerId = p1.id;

    const summary = sim.calculateRoundScores();
    expect(summary.outcome).toBe('normal');
    const e1 = summary.entries.find((e) => e.playerId === p1.id)!;
    expect(e1.goal).toBe(1.0);
    expect(e1.first).toBe(0.2);
    expect(e1.solo).toBe(0.6);
    expect(e1.trap).toBe(0.2);
    expect(e1.coin).toBe(0.6);
    expect(e1.comeback).toBe(0.8);
    expect(e1.totalAdded).toBe(3.4);
  });

  it('爆弾は周囲3x3の配置ブロックのみ破壊し、離れたブロックは残る', () => {
    const sim = new GameSimulation();
    const p1 = sim.addPlayer('p1', 'A', true)!;
    sim.setRules({ mode: 'freeplay' });
    sim.startGame();

    p1.heldItemId = 'wood_small';
    expect(sim.placeBlock(p1.id, 10, 10, 0, false)).toBe(true);
    expect(sim.placeBlock(p1.id, 11, 10, 0, false)).toBe(true);
    expect(sim.placeBlock(p1.id, 15, 10, 0, false)).toBe(true);
    expect(sim.blocks).toHaveLength(3);

    p1.heldItemId = 'bomb';
    expect(sim.placeBlock(p1.id, 10, 10, 0, false)).toBe(true);
    expect(sim.blocks).toHaveLength(1);
    expect(sim.blocks[0].gx).toBe(15);
  });

  it('ハチミツで動くリフトに接着したブロックはアクション時に親と一緒に移動する', () => {
    const sim = new GameSimulation();
    const p1 = sim.addPlayer('p1', 'A', true)!;
    sim.setRules({ mode: 'freeplay' });
    sim.startGame();

    p1.heldItemId = 'moving_platform';
    expect(sim.placeBlock(p1.id, 10, 10, 0, false)).toBe(true);

    p1.heldItemId = 'wood_small';
    expect(sim.placeBlock(p1.id, 10, 9, 0, false)).toBe(true);

    p1.heldItemId = 'honey';
    expect(sim.placeBlock(p1.id, 10, 9, 0, false)).toBe(true);

    const parent = sim.blocks.find((b) => b.itemId === 'moving_platform')!;
    const child = sim.blocks.find((b) => b.itemId === 'wood_small')!;
    expect(child.attachedToId).toBe(parent.id);

    // Switch to test run and advance 1 second
    sim.toggleFreeplayTest();
    const initialChildX = child.x;
    for (let i = 0; i < 60; i++) {
      sim.step(DT);
    }
    expect(parent.x).toBeGreaterThan(10 * TILE);
    expect(child.x).toBeCloseTo(parent.x, 1);
    expect(child.x).toBeGreaterThan(initialChildX);
  });

  it('全ステージのスタート看板とゴール旗が静的足場の上面にぴったり接地している', () => {
    const allStages = [...STAGE_LIST, TREEHOUSE_STAGE];
    for (const stage of allStages) {
      const startGrounded = stage.staticPlatforms.some(
        (sp) =>
          stage.startPoint.x >= sp.x &&
          stage.startPoint.x <= sp.x + sp.w &&
          stage.startPoint.y === sp.y
      );
      const goalGrounded = stage.staticPlatforms.some(
        (sp) =>
          stage.goalPoint.x >= sp.x &&
          stage.goalPoint.x <= sp.x + sp.w &&
          stage.goalPoint.y === sp.y
      );
      expect(startGrounded, `${stage.id} startPoint`).toBe(true);
      expect(goalGrounded, `${stage.id} goalPoint`).toBe(true);
    }
  });

  it('ステージのランダム選択設定でゲーム開始時に有効な4ステージのいずれかが選ばれる', () => {
    const sim = new GameSimulation();
    sim.addPlayer('p1', 'A', true);
    sim.setStage('random');
    expect(sim.stageSelection).toBe('random');

    sim.startGame();
    const validIds = STAGE_LIST.map((s) => s.id);
    expect(validIds).toContain(sim.stageId);
    expect(sim.getSnapshot().stageSelection).toBe('random');
  });

  it('全32種カタログが登録され、6人パーティーボックスで重複なし10枠が選出される', () => {
    expect(ITEM_CATALOG).toHaveLength(32);

    const sim = new GameSimulation();
    for (let i = 0; i < 6; i++) {
      sim.addPlayer(`p${i}`, `P${i + 1}`, i === 0);
    }
    sim.startGame();
    expect(sim.partyBox).toHaveLength(10);
    const ids = sim.partyBox.map((s) => s.itemId);
    expect(new Set(ids).size).toBe(10);
  });

  it('メガ爆弾は周囲5x5の配置済みブロックを一掃し、範囲外は残す', () => {
    const sim = new GameSimulation();
    const p1 = sim.addPlayer('p1', 'A', true)!;
    sim.setRules({ mode: 'freeplay' });
    sim.startGame();

    p1.heldItemId = 'wood_small';
    expect(sim.placeBlock(p1.id, 10, 10, 0, false)).toBe(true);
    expect(sim.placeBlock(p1.id, 12, 12, 0, false)).toBe(true); // 距離2マス（5x5内）
    expect(sim.placeBlock(p1.id, 14, 10, 0, false)).toBe(true); // 距離4マス（5x5外）
    expect(sim.blocks).toHaveLength(3);

    p1.heldItemId = 'mega_bomb';
    expect(sim.placeBlock(p1.id, 10, 10, 0, false)).toBe(true);
    expect(sim.blocks).toHaveLength(1);
    expect(sim.blocks[0].gx).toBe(14);
  });

  it('回転タイヤにハチミツで接着したブロックは周囲を公転する', () => {
    const sim = new GameSimulation();
    const p1 = sim.addPlayer('p1', 'A', true)!;
    sim.setRules({ mode: 'freeplay' });
    sim.startGame();

    p1.heldItemId = 'rotating_gear';
    expect(sim.placeBlock(p1.id, 10, 10, 0, false)).toBe(true);

    p1.heldItemId = 'wood_small';
    expect(sim.placeBlock(p1.id, 12, 10, 0, false)).toBe(true);

    p1.heldItemId = 'honey';
    expect(sim.placeBlock(p1.id, 12, 10, 0, false)).toBe(true);

    const gear = sim.blocks.find((b) => b.itemId === 'rotating_gear')!;
    const child = sim.blocks.find((b) => b.itemId === 'wood_small')!;
    expect(child.attachedToId).toBe(gear.id);

    sim.toggleFreeplayTest();
    const startY = child.y;
    for (let i = 0; i < 30; i++) {
      sim.step(DT);
    }
    expect(gear.angle).toBeGreaterThan(0);
    expect(child.y).not.toBeCloseTo(startY, 0);
  });
});
