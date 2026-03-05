// ===== 전역 게임 상태 =====
var GameState = {
  hero: {
    level: 1,
    exp: 0,
    hp: 100,
    maxHp: 100,
    atk: 10,
    def: 2,
    spd: 5,
    critChance: 0.05,
    critMult: 2.0,
    gold: 0
  },

  upgrades: {
    atk: 0,
    def: 0,
    hp: 0,
    spd: 0,
    critChance: 0,
    goldBonus: 0
  },

  stage: {
    current: 1,
    killCount: 0,
    isBoss: false
  },

  meta: {
    totalKills: 0,
    totalGold: 0,
    playTime: 0,
    lastSaveTime: Date.now()
  },

  // 현재 몬스터 상태 (저장하지 않음)
  monster: {
    name: '',
    hp: 0,
    maxHp: 0,
    atk: 0,
    def: 0,
    goldDrop: 0,
    expDrop: 0,
    color: 0xe74c3c,
    size: 48
  }
};

// 기본 GameState 반환 (초기화용)
function getDefaultGameState() {
  return {
    hero: {
      level: 1,
      exp: 0,
      hp: 100,
      maxHp: 100,
      atk: 10,
      def: 2,
      spd: 5,
      critChance: 0.05,
      critMult: 2.0,
      gold: 0
    },
    upgrades: {
      atk: 0,
      def: 0,
      hp: 0,
      spd: 0,
      critChance: 0,
      goldBonus: 0
    },
    stage: {
      current: 1,
      killCount: 0,
      isBoss: false
    },
    meta: {
      totalKills: 0,
      totalGold: 0,
      playTime: 0,
      lastSaveTime: Date.now()
    }
  };
}
