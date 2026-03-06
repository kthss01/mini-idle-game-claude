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

  // 통계 (lifetime은 저장, session은 저장하지 않음)
  stats: {
    lifetime: {
      totalDamageDealt: 0,
      totalDamageTaken: 0,
      totalGoldEarned: 0,
      totalKills: 0,
      totalDeaths: 0,
      totalCrits: 0,
      totalSkillUses: 0,
      totalCrafts: 0,
      totalPrestige: 0,
      highestStage: 0,
      highestLevel: 0,
      peakDps: 0,
      totalEquipDrops: 0,
      stagesCleared: 0
    }
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
  },

  // 패시브 스킬 (레벨업 포인트 기반)
  skills: {
    points: 0,
    lifesteal: 0, berserker: 0, ironSkin: 0,
    doubleStrike: 0, poison: 0, thunder: 0
  },

  // 아이템 시스템 (weapon/armor/accessory)
  items: {
    equipped: { weapon: null, armor: null, accessory: null },
    inventory: []
  },

  // 자동 업그레이드
  autoUpgrade: {
    atk: false, def: false, hp: false,
    spd: false, critChance: false, goldBonus: false
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
    },
    skills: {
      points: 0,
      lifesteal: 0, berserker: 0, ironSkin: 0,
      doubleStrike: 0, poison: 0, thunder: 0
    },
    items: {
      equipped: { weapon: null, armor: null, accessory: null },
      inventory: []
    },
    autoUpgrade: {
      atk: false, def: false, hp: false,
      spd: false, critChance: false, goldBonus: false
    }
  };
}
