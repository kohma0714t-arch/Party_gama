export type CharacterId = 'chicken' | 'horse' | 'sheep' | 'raccoon' | 'fox' | 'platypus';

export type StageId = 'farm' | 'rooftops' | 'windmill' | 'volcano';

export type StageSelection = StageId | 'random';

export type GameMode = 'party' | 'freeplay';

export type GamePhase =
  | 'LOBBY'
  | 'BOX_PICK'
  | 'PLACE'
  | 'COUNTDOWN'
  | 'ACTION'
  | 'SCORE'
  | 'PODIUM';

export type ItemCategory = 'platform' | 'trap' | 'shooty' | 'moving' | 'special' | 'bomb';

export type ItemId =
  | 'wood_beam'
  | 'wood_small'
  | 'one_way_platform'
  | 'crumble_block'
  | 'ice_block'
  | 'spring_pad'
  | 'bounce_block'
  | 'stairs'
  | 'spike_strip'
  | 'flip_spike'
  | 'barbed_wire'
  | 'saw_blade'
  | 'moving_saw'
  | 'wrecking_ball'
  | 'flame_thrower'
  | 'falling_spike'
  | 'punch_glove'
  | 'beehive'
  | 'crossbow'
  | 'hockey_shooter'
  | 'fire_tennis'
  | 'paper_plane'
  | 'conveyor'
  | 'fan'
  | 'moving_platform'
  | 'rotating_gear'
  | 'bomb'
  | 'mega_bomb'
  | 'honey'
  | 'portal'
  | 'black_hole'
  | 'coin';

export interface ItemDef {
  id: ItemId;
  nameJa: string;
  category: ItemCategory;
  w: number; // grid tiles (at rotation 0)
  h: number;
  rotatable: boolean;
  flippable: boolean;
  weight: number;
  solid: boolean;
  lethal: boolean;
  descriptionJa: string;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface StaticPlatform extends Rect {
  kind: 'ground' | 'wall' | 'roof' | 'girder';
}

export interface WindmillArmConfig {
  id: string;
  cx: number;
  cy: number;
  radius: number;
  armLength: number;
  armThickness: number;
  angularSpeed: number; // rad/s
  angleOffset: number;
}

export interface StageDef {
  id: StageId | 'treehouse';
  nameJa: string;
  subtitleJa: string;
  theme: 'farm' | 'rooftops' | 'windmill' | 'volcano' | 'treehouse';
  startPoint: { x: number; y: number };
  goalPoint: { x: number; y: number };
  staticPlatforms: StaticPlatform[];
  killY: number;
  risingLava: boolean;
  windmillHub?: { cx: number; cy: number; speed: number; armCount: number; radius: number; armLength: number; armThickness: number };
}

export interface GameRules {
  mode: GameMode;
  targetScore: number;
  maxRounds: number;
  pickTime: number;
  placeTime: number;
  actionTime: number;
  gravityScale: number;
  jumpScale: number;
  playerCollision: boolean;
}

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
  sprint: boolean;
  dance: boolean;
}

export interface CursorState {
  gx: number;
  gy: number;
  rot: 0 | 1 | 2 | 3; // * 90 deg
  flipX: boolean;
  visible: boolean;
}

export interface PlayerState {
  id: string;
  name: string;
  character: CharacterId;
  isHost: boolean;
  slotIndex: number;
  score: number;
  zeroStreak: number;

  // Action state
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  onGround: boolean;
  onWallLeft: boolean;
  onWallRight: boolean;
  crouching: boolean;
  dancing: boolean;
  coyoteTimer: number;
  jumpBufferTimer: number;
  wallJumpLockTimer: number;
  jumpHeldPrev: boolean;
  inHoney: boolean;
  portalCooldown: number;
  ridingPlatformId: string | null;

  alive: boolean;
  finished: boolean;
  finishTime: number | null;
  deathTime: number | null;
  killedByOwnerId: string | null;
  postMortemPending: number;
  hasCoin: boolean;

  // Build state
  pickedBoxIndex: number | null;
  heldItemId: ItemId | null;
  hasPlaced: boolean;
  portalFirstPos: { gx: number; gy: number } | null;
  cursor: CursorState;

  // Animation
  animTime: number;
  squashX: number;
  squashY: number;
  stunTimer: number;
}

export interface PlacedBlock {
  id: string;
  itemId: ItemId;
  ownerId: string;
  gx: number;
  gy: number;
  w: number; // current rotated tiles
  h: number;
  rot: 0 | 1 | 2 | 3;
  flipX: boolean;

  // Honey attachment
  honeyed: boolean;
  attachedToId: string | null; // moving_platform id or 'windmill_0..3'
  attachOffsetX: number;
  attachOffsetY: number;
  attachAngleOffset: number;

  // Portal pairing
  pairId?: string;

  // Dynamic runtime state during ACTION
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  angle: number;
  timer: number;
  state: 'idle' | 'triggered' | 'collapsed' | 'falling' | 'landed' | 'punching' | 'collected';
  vy: number;
  fireCooldown: number;
}

export interface Projectile {
  id: string;
  kind: 'arrow' | 'puck' | 'fireball' | 'plane' | 'bee';
  ownerId: string;
  sourceBlockId?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  bouncesLeft: number;
  life: number;
}

export interface PartyBoxSlot {
  index: number;
  itemId: ItemId;
  pickedByPlayerId: string | null;
}

export interface ScoreBreakdown {
  playerId: string;
  name: string;
  character: CharacterId;
  goal: number;
  first: number;
  solo: number;
  trap: number;
  coin: number;
  comeback: number;
  postMortem: number;
  totalAdded: number;
  newTotal: number;
}

export interface RoundSummary {
  round: number;
  outcome: 'normal' | 'too_easy' | 'no_points';
  entries: ScoreBreakdown[];
}

export type SoundEffectId =
  | 'jump'
  | 'wall_jump'
  | 'land'
  | 'pick'
  | 'place'
  | 'invalid'
  | 'bomb'
  | 'honey'
  | 'spring'
  | 'shoot'
  | 'punch'
  | 'portal'
  | 'coin'
  | 'death'
  | 'goal'
  | 'too_easy'
  | 'countdown'
  | 'win';

export interface SimEvent {
  type: 'sfx' | 'particle' | 'shake' | 'phase' | 'toast';
  sfx?: SoundEffectId;
  particleKind?: 'explosion' | 'feathers' | 'stars' | 'dust' | 'honey' | 'spark' | 'confetti';
  x?: number;
  y?: number;
  color?: string;
  intensity?: number;
  phase?: GamePhase;
  message?: string;
}

export interface WindmillBladeState {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  prevX: number;
  prevY: number;
  angle: number;
}

export interface GameSnapshot {
  tick: number;
  phase: GamePhase;
  round: number;
  phaseTimer: number;
  phaseDuration: number;
  stageId: StageId;
  stageSelection: StageSelection;
  rules: GameRules;
  players: PlayerState[];
  blocks: PlacedBlock[];
  projectiles: Projectile[];
  partyBox: PartyBoxSlot[];
  windmillBlades: WindmillBladeState[];
  lavaY: number;
  lastSummary: RoundSummary | null;
  winnerIds: string[];
  freeplayTesting: boolean;
}
