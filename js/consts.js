// 世界単位はピクセル（論理解像度）。表示倍率とは独立。
export const TILE = 16;
export const GRAVITY = 1500;
export const STEP = 1 / 60;
export const VIEW_H = 360;
export const MAX_FALL = 950;
export const MAX_SPEED = 1100;

// 反発倍率（押下長で 0.72 → 1.2、下入力で 0.5）
export const BOUNCE_BASE = 0.72;
export const BOUNCE_MAX = 1.2;
export const BOUNCE_LOW = 0.5;
export const BOUNCE_CHARGE_TIME = 0.35;

export const STOMP_MIN_VY = 460;
export const HEAVY_BREAK_SPEED = 230;

// タイル種別
export const T = {
  EMPTY: 0, SOLID: 1, BRICK: 2, ONEWAY: 3, SPIKE: 4, LAVA: 5, ICE: 6,
  MAGNET: 7, HEAVY: 8, MELT: 9, DOOR: 10, GATE: 11,
};
export const SOLID_TYPES = new Set([T.SOLID, T.BRICK, T.SPIKE, T.LAVA, T.ICE, T.MAGNET, T.HEAVY, T.MELT, T.DOOR, T.GATE]);

// 強制区間の番号 → ボール
export const ZONE_BALL = { 1: 'marble', 2: 'bowling', 3: 'bubble', 4: 'pingpong', 5: 'fire', 6: 'magnet', 7: 'slime', 8: 'soccer', 9: 'rugby' };

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const sign = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);
