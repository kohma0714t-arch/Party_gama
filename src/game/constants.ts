import { CharacterId, GameRules } from './types';

export const TILE = 40;
export const GRID_W = 40;
export const GRID_H = 22;
export const WORLD_W = TILE * GRID_W; // 1600
export const WORLD_H = TILE * GRID_H; // 880

export const DT = 1 / 60;
export const MAX_PLAYERS = 6;

// Physics constants (tuned to grid scale)
export const GRAVITY = 1900;
export const JUMP_VEL = -890; // ~208px = 5.2 tiles
export const JUMP_CUT_MULT = 0.52;
export const WALL_JUMP_VY = -715; // ~134px = 3.35 tiles
export const WALL_JUMP_VX = 390;
export const WALL_SLIDE_MAX_VY = 125;
export const WALL_JUMP_LOCK = 0.12;
export const COYOTE_TIME = 0.11;
export const JUMP_BUFFER = 0.11;
export const WALK_SPEED = 270;
export const SPRINT_SPEED = 390;
export const GROUND_ACCEL = 2600;
export const AIR_ACCEL = 1850;
export const ICE_ACCEL = 420;
export const MAX_FALL_SPEED = 980;

export const PLAYER_W = 28;
export const PLAYER_H = 36;
export const CROUCH_H = 22;

export const HONEY_SPEED_MULT = 0.42;
export const HONEY_JUMP_MULT = 0.55;
export const SPRING_VEL = -1220;
export const CONVEYOR_SPEED = 190;
export const FAN_FORCE = 760;
export const FAN_RANGE_TILES = 4.5;
export const POST_MORTEM_WINDOW = 0.45;

// Scoring constants
export const SCORE_VALUES = {
  GOAL: 1.0,
  FIRST: 0.2,
  SOLO: 0.6,
  TRAP: 0.2,
  COIN: 0.6,
  COMEBACK: 0.8,
  POST_MORTEM: 0.6,
} as const;

export interface CharacterMeta {
  id: CharacterId;
  nameJa: string;
  bodyColor: string;
  accentColor: string;
  badgeColor: string;
}

export const CHARACTERS: CharacterMeta[] = [
  {
    id: 'chicken',
    nameJa: 'ニワトリ',
    bodyColor: '#FFFDF7',
    accentColor: '#E63946',
    badgeColor: '#E63946',
  },
  {
    id: 'horse',
    nameJa: 'ウマ',
    bodyColor: '#A96938',
    accentColor: '#5B3219',
    badgeColor: '#9C5121',
  },
  {
    id: 'sheep',
    nameJa: 'ヒツジ',
    bodyColor: '#F3EFE6',
    accentColor: '#3A3532',
    badgeColor: '#6D6875',
  },
  {
    id: 'raccoon',
    nameJa: 'アライグマ',
    bodyColor: '#8B95A1',
    accentColor: '#2B2E33',
    badgeColor: '#4A5568',
  },
  {
    id: 'fox',
    nameJa: 'キツネ',
    bodyColor: '#F47C2C',
    accentColor: '#FFF7EC',
    badgeColor: '#E65C00',
  },
  {
    id: 'platypus',
    nameJa: 'カモノハシ',
    bodyColor: '#2CA59B',
    accentColor: '#F4B942',
    badgeColor: '#1F7A73',
  },
];

export const DEFAULT_RULES: GameRules = {
  mode: 'party',
  targetScore: 5,
  maxRounds: 15,
  pickTime: 12,
  placeTime: 18,
  actionTime: 45,
  gravityScale: 1.0,
  jumpScale: 1.0,
  playerCollision: false,
};

export const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
