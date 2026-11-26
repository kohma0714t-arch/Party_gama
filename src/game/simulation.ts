import { getRotatedSize, ITEM_CATALOG, ITEM_MAP } from './catalog';
import {
  CHARACTERS,
  DEFAULT_RULES,
  DT,
  GRID_H,
  GRID_W,
  MAX_PLAYERS,
  PLAYER_H,
  PLAYER_W,
  SCORE_VALUES,
  TILE,
  WORLD_H,
} from './constants';
import {
  getBlockRect,
  rectsOverlap,
  resolvePlayerCollisions,
  stepPlayerPhysics,
  updateDynamicBlocksAndProjectiles,
  updateWindmillBlades,
} from './physics';
import { STAGE_LIST, STAGES, TREEHOUSE_STAGE } from './stages';
import {
  CharacterId,
  CursorState,
  GamePhase,
  GameRules,
  GameSnapshot,
  InputState,
  ItemId,
  PartyBoxSlot,
  PlacedBlock,
  PlayerState,
  Projectile,
  Rect,
  RoundSummary,
  ScoreBreakdown,
  SimEvent,
  StageDef,
  StageId,
  StageSelection,
  WindmillBladeState,
} from './types';

const EMPTY_INPUT: InputState = {
  left: false,
  right: false,
  up: false,
  down: false,
  jump: false,
  sprint: false,
  dance: false,
};

let uidCounter = 1;
function nextUid(prefix: string): string {
  uidCounter += 1;
  return `${prefix}_${uidCounter}`;
}

export class GameSimulation {
  public tick = 0;
  public phase: GamePhase = 'LOBBY';
  public round = 0;
  public phaseTimer = 0;
  public phaseDuration = 0;
  public stageId: StageId = 'farm';
  public stageSelection: StageSelection = 'farm';
  public rules: GameRules = { ...DEFAULT_RULES };
  public players: PlayerState[] = [];
  public blocks: PlacedBlock[] = [];
  public projectiles: Projectile[] = [];
  public partyBox: PartyBoxSlot[] = [];
  public windmillBlades: WindmillBladeState[] = [];
  public lavaY = WORLD_H + 80;
  public lastSummary: RoundSummary | null = null;
  public winnerIds: string[] = [];
  public freeplayTesting = false;

  private inputs = new Map<string, InputState>();
  private actionElapsed = 0;
  private countdownTickSent = -1;
  private pendingEvents: SimEvent[] = [];

  public getCurrentStage(): StageDef {
    if (this.phase === 'LOBBY') return TREEHOUSE_STAGE;
    return STAGES[this.stageId];
  }

  public addPlayer(id: string, name: string, isHost: boolean, preferredChar?: CharacterId): PlayerState | null {
    if (this.players.length >= MAX_PLAYERS) return null;
    const usedChars = new Set(this.players.map((p) => p.character));
    const charMeta =
      (preferredChar && !usedChars.has(preferredChar) ? CHARACTERS.find((c) => c.id === preferredChar) : undefined) ??
      CHARACTERS.find((c) => !usedChars.has(c.id)) ??
      CHARACTERS[this.players.length % CHARACTERS.length];

    const slotIndex = this.players.length;
    const spawn = TREEHOUSE_STAGE.startPoint;
    const player: PlayerState = {
      id,
      name: name.trim().slice(0, 14) || `プレイヤー${slotIndex + 1}`,
      character: charMeta.id,
      isHost,
      slotIndex,
      score: 0,
      zeroStreak: 0,
      x: spawn.x + slotIndex * 42,
      y: spawn.y - PLAYER_H,
      vx: 0,
      vy: 0,
      facing: 1,
      onGround: false,
      onWallLeft: false,
      onWallRight: false,
      crouching: false,
      dancing: false,
      coyoteTimer: 0,
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
      cursor: { gx: Math.floor(GRID_W / 2), gy: Math.floor(GRID_H / 2), rot: 0, flipX: false, visible: false },
      animTime: 0,
      squashX: 1,
      squashY: 1,
      stunTimer: 0,
    };
    this.players.push(player);
    this.inputs.set(id, { ...EMPTY_INPUT });
    return player;
  }

  public removePlayer(id: string): void {
    this.players = this.players.filter((p) => p.id !== id);
    this.inputs.delete(id);
    this.players.forEach((p, idx) => {
      p.slotIndex = idx;
    });
    // Prevent soft-lock if guest left mid-phase
    if (this.phase === 'BOX_PICK') {
      this.checkAllPicked();
    } else if (this.phase === 'PLACE') {
      this.checkAllPlaced();
    } else if (this.phase === 'ACTION') {
      this.checkActionFinished();
    }
  }

  public setCharacter(playerId: string, character: CharacterId): void {
    const p = this.players.find((pl) => pl.id === playerId);
    if (!p) return;
    p.character = character;
  }

  public setStage(selection: StageSelection): void {
    this.stageSelection = selection;
    if (selection !== 'random') {
      this.stageId = selection;
    }
  }

  public setRules(partial: Partial<GameRules>): void {
    this.rules = { ...this.rules, ...partial };
  }

  public setInput(playerId: string, input: InputState): void {
    this.inputs.set(playerId, input);
  }

  public updateCursor(playerId: string, cursor: CursorState): void {
    const p = this.players.find((pl) => pl.id === playerId);
    if (!p) return;
    p.cursor = { ...cursor };
  }

  public startGame(): void {
    if (this.stageSelection === 'random') {
      const chosen = STAGE_LIST[Math.floor(Math.random() * STAGE_LIST.length)];
      this.stageId = chosen.id as StageId;
    }
    this.round = 0;
    this.blocks = [];
    this.projectiles = [];
    this.lastSummary = null;
    this.winnerIds = [];
    this.freeplayTesting = false;
    for (const p of this.players) {
      p.score = 0;
      p.zeroStreak = 0;
    }

    if (this.rules.mode === 'freeplay') {
      this.enterFreeplayBuild();
    } else {
      this.startNextRound();
    }
  }

  public returnToLobby(): void {
    this.phase = 'LOBBY';
    this.round = 0;
    this.blocks = [];
    this.projectiles = [];
    this.partyBox = [];
    this.windmillBlades = [];
    this.freeplayTesting = false;
    this.lastSummary = null;
    this.winnerIds = [];
    for (const p of this.players) {
      p.score = 0;
      p.zeroStreak = 0;
      this.resetPlayerForRun(p, TREEHOUSE_STAGE);
    }
    this.pendingEvents.push({ type: 'phase', phase: 'LOBBY' });
  }

  public enterFreeplayBuild(): void {
    this.phase = 'PLACE';
    this.freeplayTesting = false;
    this.phaseTimer = 9999;
    this.phaseDuration = 9999;
    this.projectiles = [];
    this.resetBlocksToPlacedPositions();
    for (const p of this.players) {
      p.heldItemId = 'wood_beam';
      p.hasPlaced = false;
      p.portalFirstPos = null;
      p.cursor.visible = true;
    }
    this.pendingEvents.push({ type: 'phase', phase: 'PLACE' });
  }

  public toggleFreeplayTest(): void {
    if (this.rules.mode !== 'freeplay') return;
    if (!this.freeplayTesting) {
      this.freeplayTesting = true;
      this.enterActionPhase();
    } else {
      this.enterFreeplayBuild();
    }
  }

  public freeplaySelectItem(playerId: string, itemId: ItemId): void {
    if (this.rules.mode !== 'freeplay') return;
    const p = this.players.find((pl) => pl.id === playerId);
    if (p) {
      p.heldItemId = itemId;
      p.portalFirstPos = null;
    }
  }

  public freeplayRemoveAt(gx: number, gy: number): boolean {
    if (this.rules.mode !== 'freeplay' || this.freeplayTesting) return false;
    const idx = this.blocks.findIndex(
      (b) => gx >= b.gx && gx < b.gx + b.w && gy >= b.gy && gy < b.gy + b.h
    );
    if (idx === -1) return false;
    const removed = this.blocks[idx];
    this.removeBlockWithCleanup(removed.id);
    this.pendingEvents.push({ type: 'sfx', sfx: 'bomb' });
    return true;
  }

  public freeplayClearBlocks(): void {
    if (this.rules.mode !== 'freeplay') return;
    this.blocks = [];
    this.pendingEvents.push({ type: 'sfx', sfx: 'bomb' });
  }

  public startNextRound(): void {
    this.round += 1;
    this.projectiles = [];
    this.resetBlocksToPlacedPositions();
    this.windmillBlades = updateWindmillBlades(this.getCurrentStage(), 0, []);

    for (const p of this.players) {
      p.pickedBoxIndex = null;
      p.heldItemId = null;
      p.hasPlaced = false;
      p.portalFirstPos = null;
      p.cursor.visible = false;
    }

    this.generatePartyBox();
    this.phase = 'BOX_PICK';
    this.phaseTimer = this.rules.pickTime;
    this.phaseDuration = this.rules.pickTime;
    this.pendingEvents.push({ type: 'phase', phase: 'BOX_PICK' });
  }

  private generatePartyBox(): void {
    const count = Math.min(10, Math.max(6, this.players.length + 4));
    const slots: PartyBoxSlot[] = [];
    const usedIds = new Set<ItemId>();
    const platforms = ITEM_CATALOG.filter((i) => i.category === 'platform');
    const nonPlatforms = ITEM_CATALOG.filter((i) => i.category !== 'platform');

    const pickWeightedUnique = (poolSource: typeof ITEM_CATALOG) => {
      const avail = poolSource.filter((i) => !usedIds.has(i.id));
      const pool = avail.length > 0 ? avail : ITEM_CATALOG.filter((i) => !usedIds.has(i.id));
      if (pool.length === 0) return ITEM_CATALOG[0];
      const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
      let r = Math.random() * totalWeight;
      let chosen = pool[0];
      for (const item of pool) {
        r -= item.weight;
        if (r <= 0) {
          chosen = item;
          break;
        }
      }
      usedIds.add(chosen.id);
      return chosen;
    };

    // Guarantee at least 3 platforms in rounds 1-2, 2 platforms afterwards
    const guaranteedPlatforms = this.round <= 2 ? 3 : 2;
    for (let i = 0; i < count; i++) {
      const chosen =
        i < guaranteedPlatforms
          ? pickWeightedUnique(platforms)
          : pickWeightedUnique([...nonPlatforms, ...platforms]);
      slots.push({
        index: i,
        itemId: chosen.id,
        pickedByPlayerId: null,
      });
    }

    // Shuffle slot display order
    for (let i = slots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = slots[i].itemId;
      slots[i].itemId = slots[j].itemId;
      slots[j].itemId = tmp;
    }
    this.partyBox = slots;
  }

  public pickBoxItem(playerId: string, boxIndex: number): boolean {
    if (this.phase !== 'BOX_PICK') return false;
    const player = this.players.find((p) => p.id === playerId);
    const slot = this.partyBox[boxIndex];
    if (!player || !slot || player.pickedBoxIndex !== null || slot.pickedByPlayerId !== null) {
      return false;
    }
    slot.pickedByPlayerId = playerId;
    player.pickedBoxIndex = boxIndex;
    player.heldItemId = slot.itemId;
    this.pendingEvents.push({ type: 'sfx', sfx: 'pick' });
    this.checkAllPicked();
    return true;
  }

  private checkAllPicked(): void {
    if (this.phase !== 'BOX_PICK') return;
    if (this.players.length > 0 && this.players.every((p) => p.pickedBoxIndex !== null)) {
      this.enterPlacePhase();
    }
  }

  private assignUnpickedAndProceed(): void {
    for (const p of this.players) {
      if (p.pickedBoxIndex === null) {
        const freeSlot = this.partyBox.find((s) => s.pickedByPlayerId === null);
        if (freeSlot) {
          freeSlot.pickedByPlayerId = p.id;
          p.pickedBoxIndex = freeSlot.index;
          p.heldItemId = freeSlot.itemId;
        } else {
          p.heldItemId = 'wood_small';
        }
      }
    }
    this.enterPlacePhase();
  }

  private enterPlacePhase(): void {
    this.phase = 'PLACE';
    this.phaseTimer = this.rules.placeTime;
    this.phaseDuration = this.rules.placeTime;
    for (const p of this.players) {
      p.hasPlaced = false;
      p.portalFirstPos = null;
      p.cursor.visible = true;
    }
    this.pendingEvents.push({ type: 'phase', phase: 'PLACE' });
  }

  public canPlaceBlock(itemId: ItemId, gx: number, gy: number, rot: 0 | 1 | 2 | 3): { ok: boolean; reason?: string } {
    const def = ITEM_MAP[itemId];
    const { w, h } = getRotatedSize(def, def.rotatable ? rot : 0);

    if (gx < 0 || gy < 0 || gx + w > GRID_W || gy + h > GRID_H) {
      return { ok: false, reason: 'ステージ外には配置できません' };
    }

    const stage = this.getCurrentStage();
    const candidateRect: Rect = { x: gx * TILE, y: gy * TILE, w: w * TILE, h: h * TILE };

    // Protect start & goal safety zones
    const startZone: Rect = {
      x: stage.startPoint.x - TILE * 1.2,
      y: stage.startPoint.y - TILE * 2.2,
      w: TILE * 2.6,
      h: TILE * 2.4,
    };
    const goalZone: Rect = {
      x: stage.goalPoint.x - TILE * 1.1,
      y: stage.goalPoint.y - TILE * 2.0,
      w: TILE * 2.2,
      h: TILE * 2.2,
    };
    if (rectsOverlap(candidateRect, startZone) || rectsOverlap(candidateRect, goalZone)) {
      return { ok: false, reason: 'スタート・ゴール付近には置けません' };
    }

    // Check overlap with static stage platforms
    for (const sp of stage.staticPlatforms) {
      if (rectsOverlap(candidateRect, sp)) {
        return { ok: false, reason: '地形と重なっています' };
      }
    }

    // Bombs & Mega Bombs can overlap placed blocks anywhere else
    if (itemId === 'bomb' || itemId === 'mega_bomb') {
      return { ok: true };
    }

    // Honey must touch or overlap an existing placed block or windmill arm
    if (itemId === 'honey') {
      const expanded: Rect = {
        x: candidateRect.x - 4,
        y: candidateRect.y - 4,
        w: candidateRect.w + 8,
        h: candidateRect.h + 8,
      };
      const touchesBlock = this.blocks.some(
        (b) => b.itemId !== 'honey' && rectsOverlap(expanded, getBlockRect(b))
      );
      const blades = updateWindmillBlades(stage, 0, []);
      const touchesBlade = blades.some((bl) => rectsOverlap(expanded, bl));
      if (!touchesBlock && !touchesBlade) {
        return { ok: false, reason: 'ハチミツは他のブロックや風車に接する場所へ置けます' };
      }
      return { ok: true };
    }

    // Standard blocks cannot overlap existing non-honey placed blocks
    for (const b of this.blocks) {
      if (b.itemId === 'honey') continue;
      if (rectsOverlap(candidateRect, getBlockRect(b))) {
        return { ok: false, reason: 'すでに別のブロックがあります' };
      }
    }

    return { ok: true };
  }

  public placeBlock(playerId: string, gx: number, gy: number, rot: 0 | 1 | 2 | 3, flipX: boolean): boolean {
    if (this.phase !== 'PLACE') return false;
    const player = this.players.find((p) => p.id === playerId);
    if (!player || !player.heldItemId) return false;
    if (this.rules.mode !== 'freeplay' && player.hasPlaced) return false;

    const itemId = player.heldItemId;
    const def = ITEM_MAP[itemId];
    const usedRot = def.rotatable ? rot : 0;
    const usedFlip = def.flippable ? flipX : false;
    const check = this.canPlaceBlock(itemId, gx, gy, usedRot);
    if (!check.ok) {
      this.pendingEvents.push({ type: 'sfx', sfx: 'invalid' });
      return false;
    }

    // Bomb (3x3) & Mega Bomb (5x5) destroy placed blocks around (gx, gy)
    if (itemId === 'bomb' || itemId === 'mega_bomb') {
      const half = itemId === 'mega_bomb' ? 2 : 1;
      const span = half * 2 + 1;
      const blastRect: Rect = {
        x: (gx - half) * TILE,
        y: (gy - half) * TILE,
        w: span * TILE,
        h: span * TILE,
      };
      const toDestroy = this.blocks.filter((b) => rectsOverlap(getBlockRect(b), blastRect));
      for (const target of toDestroy) {
        this.removeBlockWithCleanup(target.id);
      }
      this.pendingEvents.push({ type: 'sfx', sfx: 'bomb' });
      this.pendingEvents.push({ type: 'shake', intensity: itemId === 'mega_bomb' ? 15 : 10 });
      this.pendingEvents.push({
        type: 'particle',
        particleKind: 'explosion',
        x: gx * TILE + TILE / 2,
        y: gy * TILE + TILE / 2,
      });
      if (this.rules.mode !== 'freeplay') {
        player.hasPlaced = true;
        player.cursor.visible = false;
        this.checkAllPlaced();
      }
      return true;
    }

    // Portal requires 2 placements
    if (itemId === 'portal') {
      if (!player.portalFirstPos) {
        player.portalFirstPos = { gx, gy };
        this.pendingEvents.push({ type: 'sfx', sfx: 'place' });
        return true;
      } else {
        if (player.portalFirstPos.gx === gx && player.portalFirstPos.gy === gy) {
          this.pendingEvents.push({ type: 'sfx', sfx: 'invalid' });
          return false;
        }
        const pairId = nextUid('pair');
        this.blocks.push(this.createPlacedBlock('portal', playerId, player.portalFirstPos.gx, player.portalFirstPos.gy, 0, false, pairId));
        this.blocks.push(this.createPlacedBlock('portal', playerId, gx, gy, 0, false, pairId));
        player.portalFirstPos = null;
        this.pendingEvents.push({ type: 'sfx', sfx: 'portal' });
        if (this.rules.mode !== 'freeplay') {
          player.hasPlaced = true;
          player.cursor.visible = false;
          this.checkAllPlaced();
        }
        return true;
      }
    }

    // Honey attachment & sticky marking
    if (itemId === 'honey') {
      const honeyBlock = this.createPlacedBlock('honey', playerId, gx, gy, 0, false);
      this.blocks.push(honeyBlock);
      this.applyHoneyGlue(honeyBlock);
      this.pendingEvents.push({ type: 'sfx', sfx: 'honey' });
      this.pendingEvents.push({
        type: 'particle',
        particleKind: 'honey',
        x: gx * TILE + TILE / 2,
        y: gy * TILE + TILE / 2,
      });
      if (this.rules.mode !== 'freeplay') {
        player.hasPlaced = true;
        player.cursor.visible = false;
        this.checkAllPlaced();
      }
      return true;
    }

    // Standard block placement
    const placed = this.createPlacedBlock(itemId, playerId, gx, gy, usedRot, usedFlip);
    this.blocks.push(placed);
    this.pendingEvents.push({ type: 'sfx', sfx: 'place' });

    if (this.rules.mode !== 'freeplay') {
      player.hasPlaced = true;
      player.cursor.visible = false;
      this.checkAllPlaced();
    }
    return true;
  }

  private createPlacedBlock(
    itemId: ItemId,
    ownerId: string,
    gx: number,
    gy: number,
    rot: 0 | 1 | 2 | 3,
    flipX: boolean,
    pairId?: string
  ): PlacedBlock {
    const def = ITEM_MAP[itemId];
    const { w, h } = getRotatedSize(def, rot);
    return {
      id: nextUid('blk'),
      itemId,
      ownerId,
      gx,
      gy,
      w,
      h,
      rot,
      flipX,
      honeyed: false,
      attachedToId: null,
      attachOffsetX: 0,
      attachOffsetY: 0,
      attachAngleOffset: 0,
      pairId,
      x: gx * TILE,
      y: gy * TILE,
      prevX: gx * TILE,
      prevY: gy * TILE,
      angle: 0,
      timer: 0,
      state: 'idle',
      vy: 0,
      fireCooldown:
        itemId === 'crossbow'
          ? 0.8
          : itemId === 'hockey_shooter'
            ? 1.1
            : itemId === 'fire_tennis' || itemId === 'paper_plane' || itemId === 'beehive'
              ? 0.9
              : 0,
    };
  }

  private removeBlockWithCleanup(blockId: string): void {
    const target = this.blocks.find((b) => b.id === blockId);
    if (!target) return;
    const pairId = target.pairId;
    this.blocks = this.blocks.filter((b) => b.id !== blockId && (!pairId || b.pairId !== pairId));
    // Detach children if parent was destroyed
    for (const b of this.blocks) {
      if (b.attachedToId === blockId) {
        b.attachedToId = null;
        b.gx = Math.round(b.x / TILE);
        b.gy = Math.round(b.y / TILE);
      }
    }
  }

  private applyHoneyGlue(honeyBlock: PlacedBlock): void {
    const stage = this.getCurrentStage();
    const blades = updateWindmillBlades(stage, 0, []);
    const honeyRect = getBlockRect(honeyBlock);
    const expanded: Rect = {
      x: honeyRect.x - 4,
      y: honeyRect.y - 4,
      w: honeyRect.w + 8,
      h: honeyRect.h + 8,
    };

    // Mark touched blocks as honeyed
    const touched: PlacedBlock[] = [];
    for (const b of this.blocks) {
      if (b.id === honeyBlock.id) continue;
      if (rectsOverlap(expanded, getBlockRect(b))) {
        b.honeyed = true;
        touched.push(b);
      }
    }

    // BFS over contiguous placed blocks connected by touch to find at most 1 moving parent
    const component = new Set<PlacedBlock>([honeyBlock, ...touched]);
    const queue: PlacedBlock[] = [...touched];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      const curR = getBlockRect(cur);
      const curExp: Rect = { x: curR.x - 3, y: curR.y - 3, w: curR.w + 6, h: curR.h + 6 };
      for (const other of this.blocks) {
        if (component.has(other)) continue;
        if ((cur.honeyed || other.honeyed || other.id === honeyBlock.id) && rectsOverlap(curExp, getBlockRect(other))) {
          component.add(other);
          queue.push(other);
        }
      }
    }

    // Find moving parent (moving_platform or windmill blade)
    let parentId: string | null = null;
    let parentX = 0;
    let parentY = 0;

    for (const blade of blades) {
      for (const member of component) {
        const mr = getBlockRect(member);
        const me: Rect = { x: mr.x - 4, y: mr.y - 4, w: mr.w + 8, h: mr.h + 8 };
        if (rectsOverlap(me, blade)) {
          parentId = blade.id;
          parentX = blade.x;
          parentY = blade.y;
          break;
        }
      }
      if (parentId) break;
    }

    if (!parentId) {
      const movingPlat = Array.from(component).find(
        (m) => (m.itemId === 'moving_platform' || m.itemId === 'rotating_gear') && !m.attachedToId
      );
      if (movingPlat) {
        parentId = movingPlat.id;
        parentX = movingPlat.x;
        parentY = movingPlat.y;
      }
    }

    if (parentId) {
      const parentBlock = this.blocks.find((b) => b.id === parentId);
      const isGearParent = parentBlock?.itemId === 'rotating_gear';
      for (const member of component) {
        if (member.id === parentId) continue;
        if (member.itemId === 'moving_platform' || member.itemId === 'rotating_gear') continue;
        member.attachedToId = parentId;
        if (isGearParent && parentBlock) {
          const pcx = parentBlock.x + TILE;
          const pcy = parentBlock.y + TILE;
          const mcx = member.x + (member.w * TILE) / 2;
          const mcy = member.y + (member.h * TILE) / 2;
          member.attachOffsetX = Math.hypot(mcx - pcx, mcy - pcy);
          member.attachOffsetY = 0;
          member.attachAngleOffset = Math.atan2(mcy - pcy, mcx - pcx);
        } else {
          member.attachOffsetX = member.x - parentX;
          member.attachOffsetY = member.y - parentY;
        }
      }
    }
  }

  private checkAllPlaced(): void {
    if (this.phase !== 'PLACE' || this.rules.mode === 'freeplay') return;
    if (this.players.length > 0 && this.players.every((p) => p.hasPlaced)) {
      this.enterCountdownPhase();
    }
  }

  private autoPlaceRemaining(): void {
    for (const p of this.players) {
      if (p.hasPlaced || !p.heldItemId) continue;
      if (p.heldItemId === 'portal' && p.portalFirstPos) {
        // Place pair nearby
        const { gx, gy } = p.portalFirstPos;
        const candidates = [
          { x: gx + 3, y: gy },
          { x: gx - 3, y: gy },
          { x: gx, y: gy - 3 },
          { x: gx, y: gy + 3 },
        ];
        for (const c of candidates) {
          if (this.placeBlock(p.id, c.x, c.y, 0, false)) break;
        }
        if (!p.hasPlaced) {
          p.portalFirstPos = null;
          p.hasPlaced = true;
        }
      } else {
        p.hasPlaced = true;
      }
      p.cursor.visible = false;
    }
    this.enterCountdownPhase();
  }

  private enterCountdownPhase(): void {
    this.phase = 'COUNTDOWN';
    this.phaseTimer = 1.8;
    this.phaseDuration = 1.8;
    this.countdownTickSent = 2;
    this.resetBlocksToPlacedPositions();
    const stage = this.getCurrentStage();
    this.windmillBlades = updateWindmillBlades(stage, 0, []);
    this.lavaY = WORLD_H + 60;
    for (const p of this.players) {
      this.resetPlayerForRun(p, stage);
    }
    this.pendingEvents.push({ type: 'phase', phase: 'COUNTDOWN' });
    this.pendingEvents.push({ type: 'sfx', sfx: 'countdown' });
  }

  private enterActionPhase(): void {
    this.phase = 'ACTION';
    this.actionElapsed = 0;
    this.phaseTimer = this.rules.mode === 'freeplay' ? 9999 : this.rules.actionTime;
    this.phaseDuration = this.phaseTimer;
    this.projectiles = [];
    this.resetBlocksToPlacedPositions();
    const stage = this.getCurrentStage();
    this.windmillBlades = updateWindmillBlades(stage, 0, []);
    this.lavaY = WORLD_H + 60;
    for (const p of this.players) {
      this.resetPlayerForRun(p, stage);
    }
    this.pendingEvents.push({ type: 'phase', phase: 'ACTION' });
  }

  private resetBlocksToPlacedPositions(): void {
    for (const b of this.blocks) {
      b.x = b.gx * TILE;
      b.y = b.gy * TILE;
      b.prevX = b.x;
      b.prevY = b.y;
      b.angle = 0;
      b.timer = 0;
      b.state = 'idle';
      b.vy = 0;
      b.fireCooldown = b.itemId === 'crossbow' ? 0.8 : b.itemId === 'hockey_shooter' ? 1.1 : 0;
    }
  }

  private resetPlayerForRun(p: PlayerState, stage: StageDef): void {
    const spread = (p.slotIndex - (this.players.length - 1) / 2) * 14;
    p.x = stage.startPoint.x - PLAYER_W / 2 + spread;
    p.y = stage.startPoint.y - PLAYER_H;
    p.vx = 0;
    p.vy = 0;
    p.facing = 1;
    p.onGround = false;
    p.onWallLeft = false;
    p.onWallRight = false;
    p.crouching = false;
    p.dancing = false;
    p.coyoteTimer = 0;
    p.jumpBufferTimer = 0;
    p.wallJumpLockTimer = 0;
    p.jumpHeldPrev = false;
    p.inHoney = false;
    p.portalCooldown = 0;
    p.ridingPlatformId = null;
    p.alive = true;
    p.finished = false;
    p.finishTime = null;
    p.deathTime = null;
    p.killedByOwnerId = null;
    p.postMortemPending = 0;
    p.hasCoin = false;
    p.squashX = 1;
    p.squashY = 1;
    p.stunTimer = 0;
    p.cursor.visible = false;
  }

  private checkActionFinished(): void {
    if (this.phase !== 'ACTION' || this.rules.mode === 'freeplay') return;
    const allDone =
      this.players.length > 0 &&
      this.players.every((p) => p.finished || (!p.alive && p.postMortemPending <= 0));
    if (allDone) {
      this.finishActionPhase();
    }
  }

  public finishActionPhase(): void {
    const summary = this.calculateRoundScores();
    this.lastSummary = summary;
    this.phase = 'SCORE';
    this.phaseTimer = 4.5;
    this.phaseDuration = 4.5;
    if (summary.outcome === 'too_easy' || summary.outcome === 'no_points') {
      this.pendingEvents.push({ type: 'sfx', sfx: 'too_easy' });
    }
    this.pendingEvents.push({ type: 'phase', phase: 'SCORE' });
  }

  public calculateRoundScores(): RoundSummary {
    const totalPlayers = this.players.length;
    const finishers = this.players.filter((p) => p.finished);
    const livingFinishers = finishers.filter((p) => p.alive);

    // Too Easy if >= 2 players and everyone survived & finished
    if (totalPlayers >= 2 && livingFinishers.length === totalPlayers) {
      return {
        round: this.round,
        outcome: 'too_easy',
        entries: this.players.map((p) => ({
          playerId: p.id,
          name: p.name,
          character: p.character,
          goal: 0,
          first: 0,
          solo: 0,
          trap: 0,
          coin: 0,
          comeback: 0,
          postMortem: 0,
          totalAdded: 0,
          newTotal: roundPt(p.score),
        })),
      };
    }

    // No Points if nobody reached the goal
    if (finishers.length === 0) {
      return {
        round: this.round,
        outcome: 'no_points',
        entries: this.players.map((p) => ({
          playerId: p.id,
          name: p.name,
          character: p.character,
          goal: 0,
          first: 0,
          solo: 0,
          trap: 0,
          coin: 0,
          comeback: 0,
          postMortem: 0,
          totalAdded: 0,
          newTotal: roundPt(p.score),
        })),
      };
    }

    // Determine fastest finisher
    let firstFinisherId: string | null = null;
    let bestTime = Infinity;
    for (const f of finishers) {
      if (f.finishTime !== null && f.finishTime < bestTime) {
        bestTime = f.finishTime;
        firstFinisherId = f.id;
      }
    }

    // Trap kills per owner
    const trapKills = new Map<string, number>();
    for (const p of this.players) {
      if (p.killedByOwnerId) {
        trapKills.set(p.killedByOwnerId, (trapKills.get(p.killedByOwnerId) ?? 0) + 1);
      }
    }

    const someoneHadScore = this.players.some((p) => p.score > 0);
    const isSoloFinish = totalPlayers >= 2 && finishers.length === 1;

    const entries: ScoreBreakdown[] = this.players.map((p) => {
      const didFinish = p.finished;
      const goal = didFinish && p.alive ? SCORE_VALUES.GOAL : 0;
      const postMortem = didFinish && !p.alive ? SCORE_VALUES.POST_MORTEM : 0;
      const first = didFinish && totalPlayers >= 2 && p.id === firstFinisherId ? SCORE_VALUES.FIRST : 0;
      const solo = didFinish && isSoloFinish ? SCORE_VALUES.SOLO : 0;
      const trap = roundPt((trapKills.get(p.id) ?? 0) * SCORE_VALUES.TRAP);
      const coin = didFinish && p.hasCoin ? SCORE_VALUES.COIN : 0;
      const comeback = didFinish && someoneHadScore && p.zeroStreak >= 2 ? SCORE_VALUES.COMEBACK : 0;

      const totalAdded = roundPt(goal + postMortem + first + solo + trap + coin + comeback);
      if (totalAdded > 0) {
        p.zeroStreak = 0;
      } else {
        p.zeroStreak += 1;
      }
      p.score = roundPt(p.score + totalAdded);

      return {
        playerId: p.id,
        name: p.name,
        character: p.character,
        goal,
        first,
        solo,
        trap,
        coin,
        comeback,
        postMortem,
        totalAdded,
        newTotal: p.score,
      };
    });

    return {
      round: this.round,
      outcome: 'normal',
      entries,
    };
  }

  public advanceAfterScore(): void {
    const winners = this.players.filter((p) => p.score >= this.rules.targetScore);
    if (winners.length > 0 || this.round >= this.rules.maxRounds) {
      const maxScore = Math.max(0, ...this.players.map((p) => p.score));
      this.winnerIds = this.players.filter((p) => p.score === maxScore).map((p) => p.id);
      this.phase = 'PODIUM';
      this.pendingEvents.push({ type: 'sfx', sfx: 'win' });
      this.pendingEvents.push({ type: 'phase', phase: 'PODIUM' });
      return;
    }
    this.startNextRound();
  }

  public step(dt = DT): SimEvent[] {
    this.tick += 1;
    const events = this.pendingEvents;
    this.pendingEvents = [];
    const stage = this.getCurrentStage();

    if (this.phase === 'LOBBY') {
      for (const p of this.players) {
        const input = this.inputs.get(p.id) ?? EMPTY_INPUT;
        stepPlayerPhysics(p, input, stage, [], [], [], WORLD_H + 200, 0, dt, this.rules, events, false);
        if (!p.alive) {
          this.resetPlayerForRun(p, stage);
        }
      }
      return events;
    }

    if (this.phase === 'BOX_PICK') {
      this.phaseTimer = Math.max(0, this.phaseTimer - dt);
      if (this.phaseTimer <= 0) {
        this.assignUnpickedAndProceed();
      }
      return events;
    }

    if (this.phase === 'PLACE') {
      if (this.rules.mode !== 'freeplay') {
        this.phaseTimer = Math.max(0, this.phaseTimer - dt);
        if (this.phaseTimer <= 0) {
          this.autoPlaceRemaining();
        }
      }
      return events;
    }

    if (this.phase === 'COUNTDOWN') {
      this.phaseTimer = Math.max(0, this.phaseTimer - dt);
      const sec = Math.ceil(this.phaseTimer);
      if (sec !== this.countdownTickSent && sec > 0) {
        this.countdownTickSent = sec;
        events.push({ type: 'sfx', sfx: 'countdown' });
      }
      if (this.phaseTimer <= 0) {
        this.enterActionPhase();
      }
      return events;
    }

    if (this.phase === 'ACTION') {
      this.actionElapsed += dt;
      if (this.rules.mode !== 'freeplay') {
        this.phaseTimer = Math.max(0, this.phaseTimer - dt);
      }

      this.windmillBlades = updateWindmillBlades(stage, this.actionElapsed, this.windmillBlades);
      updateDynamicBlocksAndProjectiles(
        this.blocks,
        this.projectiles,
        this.players,
        stage,
        this.windmillBlades,
        this.actionElapsed,
        dt,
        events
      );

      if (stage.risingLava && this.actionElapsed > 5) {
        this.lavaY = Math.max(220, this.lavaY - 16 * dt);
      }

      for (const p of this.players) {
        const input = this.inputs.get(p.id) ?? EMPTY_INPUT;
        stepPlayerPhysics(
          p,
          input,
          stage,
          this.blocks,
          this.windmillBlades,
          this.projectiles,
          this.lavaY,
          this.actionElapsed,
          dt,
          this.rules,
          events,
          true
        );
        if (this.rules.mode === 'freeplay' && !p.alive && p.postMortemPending <= 0) {
          this.resetPlayerForRun(p, stage);
        }
      }

      if (this.rules.playerCollision) {
        resolvePlayerCollisions(this.players);
      }

      if (this.rules.mode !== 'freeplay') {
        this.checkActionFinished();
        if (this.phase === 'ACTION' && this.phaseTimer <= 0) {
          this.finishActionPhase();
        }
      }
      return events;
    }

    if (this.phase === 'SCORE') {
      this.phaseTimer = Math.max(0, this.phaseTimer - dt);
      if (this.phaseTimer <= 0) {
        this.advanceAfterScore();
      }
      return events;
    }

    return events;
  }

  public getSnapshot(): GameSnapshot {
    return {
      tick: this.tick,
      phase: this.phase,
      round: this.round,
      phaseTimer: this.phaseTimer,
      phaseDuration: this.phaseDuration,
      stageId: this.stageId,
      stageSelection: this.stageSelection,
      rules: { ...this.rules },
      players: this.players.map((p) => ({ ...p, cursor: { ...p.cursor } })),
      blocks: this.blocks.map((b) => ({ ...b })),
      projectiles: this.projectiles.map((pr) => ({ ...pr })),
      partyBox: this.partyBox.map((s) => ({ ...s })),
      windmillBlades: this.windmillBlades.map((w) => ({ ...w })),
      lavaY: this.lavaY,
      lastSummary: this.lastSummary,
      winnerIds: [...this.winnerIds],
      freeplayTesting: this.freeplayTesting,
    };
  }
}

function roundPt(val: number): number {
  return Math.round(val * 10) / 10;
}
