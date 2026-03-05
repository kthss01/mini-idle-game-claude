// ===== 프레스티지 (환생) 시스템 =====

// GameState에 prestige 필드 추가 (state.js 이후 로드됨)
GameState.prestige = {
  count: 0,
  soulStones: 0,
  totalSoulStones: 0,
  buffs: {
    permAtk: 0, permHp: 0, permGold: 0,
    permExp: 0, permOffline: 0, fastStart: 0
  }
};

var PrestigeSystem = {

  PRESTIGE_MIN_STAGE: 20,

  BUFF_DEFS: {
    permAtk:     { name: '영혼의 힘',   desc: 'ATK +10%',        icon: '⚔️', baseCost: 3, costPerLevel: 2, maxLevel: 20 },
    permHp:      { name: '영혼의 생명', desc: 'MaxHP +15%',      icon: '❤️', baseCost: 2, costPerLevel: 1, maxLevel: 20 },
    permGold:    { name: '영혼의 탐욕', desc: '골드 +15%',       icon: '💰', baseCost: 4, costPerLevel: 2, maxLevel: 15 },
    permExp:     { name: '영혼의 지혜', desc: 'EXP +20%',        icon: '✨', baseCost: 5, costPerLevel: 3, maxLevel: 10 },
    permOffline: { name: '영혼의 시간', desc: '오프라인 +30%',   icon: '🌙', baseCost: 6, costPerLevel: 3, maxLevel: 10 },
    fastStart:   { name: '빠른 시작',   desc: '시작 스테이지 +2',icon: '🚀', baseCost: 8, costPerLevel: 5, maxLevel: 5 }
  },

  BUFF_KEYS: ['permAtk', 'permHp', 'permGold', 'permExp', 'permOffline', 'fastStart'],

  canPrestige: function() {
    return GameState.stage.current >= this.PRESTIGE_MIN_STAGE;
  },

  getPrestigeReward: function() {
    return Math.floor(GameState.stage.current / 10) + (GameState.prestige.count * 2);
  },

  doPrestige: function() {
    if (!this.canPrestige()) return false;

    var stones = this.getPrestigeReward();
    GameState.prestige.soulStones += stones;
    GameState.prestige.totalSoulStones += stones;
    GameState.prestige.count++;

    // hero 초기화
    GameState.hero.level = 1;
    GameState.hero.exp = 0;
    GameState.hero.gold = 0;

    // upgrades 초기화
    var ukeys = Object.keys(GameState.upgrades);
    for (var i = 0; i < ukeys.length; i++) {
      GameState.upgrades[ukeys[i]] = 0;
    }

    // skills 초기화
    if (GameState.skills) {
      var skeys = ['powerStrike', 'shield', 'drain'];
      for (var j = 0; j < skeys.length; j++) {
        var sk = GameState.skills[skeys[j]];
        if (sk) { sk.level = 0; sk.timer = 0; sk.unlocked = false; }
      }
    }

    // equipment 초기화
    if (GameState.equipment) {
      GameState.equipment.equipped = { weapon: null, armor: null, ring: null };
      GameState.equipment.inventory = [];
    }

    // stage 초기화 (fastStart 적용)
    var startStage = 1 + GameState.prestige.buffs.fastStart * 2;
    GameState.stage.current = startStage;
    GameState.stage.killCount = 0;
    GameState.stage.isBoss = false;

    // 퀘스트 active 리셋 (스테이지 기반이므로)
    if (GameState.quests && typeof QuestSystem !== 'undefined') {
      GameState.quests.active = [];
      for (var k = 0; k < 3; k++) {
        GameState.quests.active.push(QuestSystem.generateQuest());
      }
    }

    // 스탯 재계산 (프레스티지 버프 적용)
    UpgradeSystem.recalculateStats();
    GameState.hero.hp = GameState.hero.maxHp;

    // 업적 체크
    if (typeof AchievementSystem !== 'undefined') {
      AchievementSystem.check('prestige', GameState.prestige.count);
    }

    SaveSystem.save();
    return true;
  },

  getBuffCost: function(key) {
    var def = this.BUFF_DEFS[key];
    if (!def) return 999;
    var level = GameState.prestige.buffs[key] || 0;
    return def.baseCost + level * def.costPerLevel;
  },

  buyBuff: function(key) {
    var def = this.BUFF_DEFS[key];
    if (!def) return false;
    var level = GameState.prestige.buffs[key] || 0;
    if (level >= def.maxLevel) return false;
    var cost = this.getBuffCost(key);
    if (GameState.prestige.soulStones < cost) return false;
    GameState.prestige.soulStones -= cost;
    GameState.prestige.buffs[key]++;
    UpgradeSystem.recalculateStats();
    return true;
  },

  getMultipliers: function() {
    var buffs = GameState.prestige.buffs;
    return {
      atk:     1 + (buffs.permAtk || 0) * 0.10,
      hp:      1 + (buffs.permHp || 0) * 0.15,
      gold:    1 + (buffs.permGold || 0) * 0.15,
      exp:     1 + (buffs.permExp || 0) * 0.20,
      offline: 1 + (buffs.permOffline || 0) * 0.30
    };
  }
};
