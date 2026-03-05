// ===== 게임 상수 및 공식 =====
var CONFIG = {
  // 기본 스탯
  BASE_STATS: {
    hp: 100,
    atk: 10,
    def: 2,
    spd: 5,
    critChance: 0.05,
    critMult: 2.0,
    gold: 0
  },

  // 업그레이드 기본 비용
  UPGRADE_BASE_COST: {
    atk: 20,
    def: 15,
    hp: 15,
    spd: 30,
    critChance: 50,
    goldBonus: 25
  },

  // 업그레이드 비용 배율 (level당)
  UPGRADE_COST_MULT: 1.18,

  // 업그레이드당 스탯 증가량
  UPGRADE_STAT_PER_LEVEL: {
    atk: 5,
    def: 3,
    hp: 30,
    spd: 1,
    critChance: 0.02,
    goldBonus: 0.1  // 10% 추가 골드
  },

  // 몬스터 스케일링
  MONSTER_BASE_HP: 40,
  MONSTER_HP_MULT: 1.12,
  MONSTER_BASE_ATK: 5,
  MONSTER_ATK_MULT: 1.10,
  MONSTER_BASE_GOLD: 8,
  MONSTER_GOLD_MULT: 1.10,
  MONSTER_BASE_EXP: 10,
  MONSTER_EXP_MULT: 1.08,

  // 보스 배수 (5의 배수 스테이지)
  BOSS_HP_MULT: 5,
  BOSS_ATK_MULT: 2,
  BOSS_GOLD_MULT: 5,
  BOSS_EXP_MULT: 3,
  BOSS_SIZE_MULT: 1.6,

  // 스테이지 진행 (킬 수 기준)
  KILLS_PER_STAGE: 10,

  // 레벨업 공식: 100 * level^1.5
  EXP_BASE: 100,
  EXP_EXPONENT: 1.5,

  // 오프라인 보상
  OFFLINE_GOLD_PER_SECOND_BASE: 0.5,
  OFFLINE_MAX_HOURS: 8,

  // 자동 저장 간격 (ms)
  AUTO_SAVE_INTERVAL: 15000,

  // 세이브 버전 (마이그레이션 관리)
  SAVE_VERSION: 2,

  // 로컬 저장 키
  SAVE_KEY: 'idleRPG_v1_save',

  // 화면 크기
  GAME_WIDTH: 800,
  GAME_HEIGHT: 600,

  // 영웅 위치
  HERO_X: 180,
  HERO_Y: 310,

  // 몬스터 위치
  MONSTER_X: 600,
  MONSTER_Y: 310,

  // 스테이지별 배경색
  STAGE_COLORS: [
    { bg: '#1a1a2e', ground: '#16213e' },  // 1-5: 어두운 숲
    { bg: '#1a0a0a', ground: '#2d1515' },  // 6-10: 불의 동굴
    { bg: '#0a1a0a', ground: '#152d15' },  // 11-15: 독의 늪
    { bg: '#0a0a1a', ground: '#15152d' },  // 16-20: 얼음 던전
    { bg: '#1a1000', ground: '#2d2000' },  // 21-25: 사막 유적
    { bg: '#100a1a', ground: '#201530' },  // 26+: 마계
  ]
};
