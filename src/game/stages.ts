import { TILE, WORLD_H, WORLD_W } from './constants';
import { StageDef, StageId } from './types';

export const TREEHOUSE_STAGE: StageDef = {
  id: 'treehouse',
  nameJa: 'ツリーハウス広場',
  subtitleJa: 'みんなで集まって操作を試せるロビー',
  theme: 'treehouse',
  startPoint: { x: 260, y: WORLD_H - 80 },
  goalPoint: { x: 1320, y: 580 },
  killY: WORLD_H + 120,
  risingLava: false,
  staticPlatforms: [
    // Main trunk floor
    { x: 0, y: WORLD_H - 80, w: WORLD_W, h: 80, kind: 'ground' },
    // Left deck
    { x: 100, y: 600, w: 340, h: 32, kind: 'roof' },
    // Center loft
    { x: 580, y: 480, w: 440, h: 32, kind: 'roof' },
    // Right balcony
    { x: 1140, y: 580, w: 340, h: 32, kind: 'roof' },
    // Top lookout
    { x: 650, y: 300, w: 300, h: 28, kind: 'roof' },
    // Side walls
    { x: -40, y: 0, w: 40, h: WORLD_H, kind: 'wall' },
    { x: WORLD_W, y: 0, w: 40, h: WORLD_H, kind: 'wall' },
  ],
};

export const STAGES: Record<StageId, StageDef> = {
  farm: {
    id: 'farm',
    nameJa: 'のどかな農場',
    subtitleJa: '標準レイアウト。初めてのパーティに最適！',
    theme: 'farm',
    startPoint: { x: 4 * TILE, y: 18 * TILE },
    goalPoint: { x: 36 * TILE, y: 9 * TILE },
    killY: WORLD_H + 100,
    risingLava: false,
    staticPlatforms: [
      // Start barn porch (top = 18 * TILE)
      { x: 1 * TILE, y: 18 * TILE, w: 6 * TILE, h: 4 * TILE, kind: 'ground' },
      // Mid hay bale
      { x: 17 * TILE, y: 16 * TILE, w: 4 * TILE, h: 6 * TILE, kind: 'ground' },
      // Goal platform (top = 9 * TILE)
      { x: 33 * TILE, y: 9 * TILE, w: 6 * TILE, h: 13 * TILE, kind: 'ground' },
    ],
  },
  rooftops: {
    id: 'rooftops',
    nameJa: '高層ビルの屋上',
    subtitleJa: '深い谷間と壁ジャンプが熱い都市ステージ',
    theme: 'rooftops',
    startPoint: { x: 3 * TILE, y: 14 * TILE },
    goalPoint: { x: 36.5 * TILE, y: 8 * TILE },
    killY: WORLD_H + 100,
    risingLava: false,
    staticPlatforms: [
      // Left rooftop (top = 14 * TILE)
      { x: 0 * TILE, y: 14 * TILE, w: 7 * TILE, h: 8 * TILE, kind: 'roof' },
      // Center slender tower for walljumps
      { x: 18 * TILE, y: 10 * TILE, w: 3 * TILE, h: 12 * TILE, kind: 'wall' },
      // Right high building (top = 8 * TILE)
      { x: 33 * TILE, y: 8 * TILE, w: 7 * TILE, h: 14 * TILE, kind: 'roof' },
    ],
  },
  windmill: {
    id: 'windmill',
    nameJa: '回転風車の丘',
    subtitleJa: '回る羽根に足場や罠をハチミツ接着できる！',
    theme: 'windmill',
    startPoint: { x: 3 * TILE, y: 16 * TILE },
    goalPoint: { x: 36.5 * TILE, y: 9 * TILE },
    killY: WORLD_H + 100,
    risingLava: false,
    windmillHub: {
      cx: 20 * TILE,
      cy: 11.5 * TILE,
      speed: 0.72,
      armCount: 4,
      radius: 4.4 * TILE,
      armLength: 3.2 * TILE,
      armThickness: 0.75 * TILE,
    },
    staticPlatforms: [
      // Start hill (top = 16 * TILE)
      { x: 0 * TILE, y: 16 * TILE, w: 7 * TILE, h: 6 * TILE, kind: 'ground' },
      // Windmill base pillar
      { x: 19 * TILE, y: 18 * TILE, w: 2 * TILE, h: 4 * TILE, kind: 'wall' },
      // Goal hill (top = 9 * TILE)
      { x: 33 * TILE, y: 9 * TILE, w: 7 * TILE, h: 13 * TILE, kind: 'ground' },
    ],
  },
  volcano: {
    id: 'volcano',
    nameJa: '灼熱の火山洞窟',
    subtitleJa: '5秒後から下からマグマが迫るスリル満点コース',
    theme: 'volcano',
    startPoint: { x: 4 * TILE, y: 19 * TILE },
    goalPoint: { x: 36 * TILE, y: 6 * TILE },
    killY: WORLD_H + 80,
    risingLava: true,
    staticPlatforms: [
      // Start rock (top = 19 * TILE)
      { x: 1 * TILE, y: 19 * TILE, w: 6 * TILE, h: 3 * TILE, kind: 'ground' },
      // Mid stepping cliff 1
      { x: 11 * TILE, y: 15 * TILE, w: 4 * TILE, h: 1 * TILE, kind: 'girder' },
      // Mid stepping cliff 2
      { x: 22 * TILE, y: 11 * TILE, w: 4 * TILE, h: 1 * TILE, kind: 'girder' },
      // Goal peak (top = 6 * TILE)
      { x: 33 * TILE, y: 6 * TILE, w: 6 * TILE, h: 2 * TILE, kind: 'ground' },
    ],
  },
};

export const STAGE_LIST: StageDef[] = [
  STAGES.farm,
  STAGES.rooftops,
  STAGES.windmill,
  STAGES.volcano,
];
