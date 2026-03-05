// ===== 업적 시스템 =====

// GameState에 achievements 필드 추가 (state.js 이후 로드됨)
GameState.achievements = {
  unlocked: [],
  stats: {
    bossKills: 0,
    totalGoldSpent: 0,
    deaths: 0,
    consecutiveCrits: 0
  }
};

var AchievementSystem = {

  ACHIEVEMENTS: [
    // === 처치 (6개) ===
    { id: 'kill100',        cat: 'kill',   name: '첫 학살',       cond: '총 100킬',                       trigger: 'kill',           req: 100,     reward: { atk: 2 } },
    { id: 'kill1000',       cat: 'kill',   name: '숙련된 사냥꾼', cond: '총 1,000킬',                     trigger: 'kill',           req: 1000,    reward: { atk: 5 } },
    { id: 'kill10000',      cat: 'kill',   name: '학살자',        cond: '총 10,000킬',                    trigger: 'kill',           req: 10000,   reward: { atk: 15 } },
    { id: 'bossKill10',     cat: 'kill',   name: '보스 사냥꾼',   cond: '보스 10마리',                    trigger: 'bossKill',       req: 10,      reward: { maxHp: 50 } },
    { id: 'bossKill50',     cat: 'kill',   name: '보스 학살자',   cond: '보스 50마리',                    trigger: 'bossKill',       req: 50,      reward: { maxHp: 200 } },
    { id: 'bossKill100',    cat: 'kill',   name: '보스의 천적',   cond: '보스 100마리',                   trigger: 'bossKill',       req: 100,     reward: { atk: 20, maxHp: 100 } },
    // === 골드 (5개) ===
    { id: 'gold10k',        cat: 'gold',   name: '소액 투자자',   cond: '누적 골드 10,000',               trigger: 'gold',           req: 10000,   reward: { goldPct: 5 } },
    { id: 'gold100k',       cat: 'gold',   name: '부자',          cond: '누적 골드 100,000',              trigger: 'gold',           req: 100000,  reward: { goldPct: 10 } },
    { id: 'gold1m',         cat: 'gold',   name: '백만장자',      cond: '누적 골드 1,000,000',            trigger: 'gold',           req: 1000000, reward: { goldPct: 20 } },
    { id: 'gold10m',        cat: 'gold',   name: '억만장자',      cond: '누적 골드 10,000,000',           trigger: 'gold',           req: 10000000,reward: { goldPct: 30 } },
    { id: 'spendGold',      cat: 'gold',   name: '큰 손',         cond: '업그레이드에 골드 500,000 소모', trigger: 'goldSpent',       req: 500000,  reward: { def: 10 } },
    // === 스테이지 (5개) ===
    { id: 'stage10',        cat: 'stage',  name: '탐험가',        cond: '스테이지 10 도달',               trigger: 'stage',          req: 10,      reward: { maxHp: 30 } },
    { id: 'stage25',        cat: 'stage',  name: '베테랑',        cond: '스테이지 25 도달',               trigger: 'stage',          req: 25,      reward: { atk: 8 } },
    { id: 'stage50',        cat: 'stage',  name: '영웅',          cond: '스테이지 50 도달',               trigger: 'stage',          req: 50,      reward: { statPct: 5 } },
    { id: 'stage100',       cat: 'stage',  name: '전설',          cond: '스테이지 100 도달',              trigger: 'stage',          req: 100,     reward: { statPct: 10 } },
    { id: 'stage200',       cat: 'stage',  name: '신화',          cond: '스테이지 200 도달',              trigger: 'stage',          req: 200,     reward: { statPct: 20 } },
    // === 레벨/강화 (5개) ===
    { id: 'level20',        cat: 'other',  name: '성장하는 영웅', cond: '영웅 레벨 20',                   trigger: 'level',          req: 20,      reward: { expPct: 10 } },
    { id: 'level50',        cat: 'other',  name: '강인한 영웅',   cond: '영웅 레벨 50',                   trigger: 'level',          req: 50,      reward: { expPct: 20 } },
    { id: 'upgMaxOne',      cat: 'other',  name: '전문가',        cond: '업그레이드 1종 레벨 20',         trigger: 'upgMax',         req: 20,      reward: { statPct: 10 } },
    { id: 'skillMax',       cat: 'other',  name: '스킬 마스터',   cond: '스킬 1개 레벨 10',               trigger: 'skillMax',       req: 10,      reward: { cooldownPct: 10 } },
    { id: 'equipLegend',    cat: 'other',  name: '전설의 수집가', cond: '전설 장비 1개 획득',             trigger: 'legendEquip',    req: 1,       reward: { goldPct: 15 } },
    // === 환생/기타 (5개) ===
    { id: 'prestige1',      cat: 'other',  name: '환생자',        cond: '환생 1회',                       trigger: 'prestige',       req: 1,       reward: { soulStones: 5 } },
    { id: 'prestige5',      cat: 'other',  name: '반복하는 자',   cond: '환생 5회',                       trigger: 'prestige',       req: 5,       reward: { soulStones: 20 } },
    { id: 'prestige10',     cat: 'other',  name: '윤회',          cond: '환생 10회',                      trigger: 'prestige',       req: 10,      reward: { statPct: 15 } },
    { id: 'playTime60',     cat: 'other',  name: '헌신',          cond: '총 플레이 1시간',                trigger: 'playTime',       req: 3600,    reward: { maxHp: 100 } },
    { id: 'playTime600',    cat: 'other',  name: '중독',          cond: '총 플레이 10시간',               trigger: 'playTime',       req: 36000,   reward: { statPct: 5 } },
    // === 비밀 (4개) ===
    { id: 'secretSpeed',    cat: 'secret', name: '번개',          cond: '???', trigger: 'maxSpeed',       req: 1,  reward: { spd: 5 },      secret: true },
    { id: 'secretCrit',     cat: 'secret', name: '행운아',        cond: '???', trigger: 'consecCrit',     req: 10, reward: { critPct: 5 },  secret: true },
    { id: 'secretDeath',    cat: 'secret', name: '불사신',        cond: '???', trigger: 'deaths',         req: 50, reward: { maxHp: 500 },  secret: true },
    { id: 'secretGoldDrop', cat: 'secret', name: '황금손',        cond: '???', trigger: 'singleGoldDrop', req: 10000, reward: { goldPct: 25 }, secret: true }
  ],

  check: function(triggerId, value) {
    for (var i = 0; i < this.ACHIEVEMENTS.length; i++) {
      var ach = this.ACHIEVEMENTS[i];
      if (ach.trigger !== triggerId) continue;
      if (GameState.achievements.unlocked.indexOf(ach.id) >= 0) continue;
      if (value >= ach.req) {
        this.unlock(ach.id);
      }
    }
  },

  unlock: function(id) {
    if (GameState.achievements.unlocked.indexOf(id) >= 0) return;
    GameState.achievements.unlocked.push(id);
    var ach = this._getById(id);
    if (!ach) return;
    this.applyReward(ach);
    if (typeof UISceneInstance !== 'undefined' && UISceneInstance && UISceneInstance.showAchievementToast) {
      UISceneInstance.showAchievementToast(ach);
    }
  },

  applyReward: function(ach) {
    var r = ach.reward;
    if (!r) return;
    // 영혼석은 즉시 지급
    if (r.soulStones && GameState.prestige) {
      GameState.prestige.soulStones += r.soulStones;
      GameState.prestige.totalSoulStones += r.soulStones;
    }
    // flat 보너스(atk/def/maxHp/spd/critChance)와 비율 보너스(statPct/goldPct/expPct/cooldownPct)는
    // recalculateStats / getBonusMultipliers 를 통해 반영됨
    UpgradeSystem.recalculateStats();
  },

  getProgress: function() {
    return {
      unlocked: GameState.achievements.unlocked.length,
      total: this.ACHIEVEMENTS.length
    };
  },

  // 달성된 업적의 flat 스탯 보너스 합산 (recalculateStats에서 호출)
  getFlatBonuses: function() {
    var flat = { atk: 0, def: 0, maxHp: 0, spd: 0, critChance: 0 };
    for (var i = 0; i < GameState.achievements.unlocked.length; i++) {
      var id = GameState.achievements.unlocked[i];
      var ach = this._getById(id);
      if (!ach || !ach.reward) continue;
      if (ach.reward.atk)     flat.atk += ach.reward.atk;
      if (ach.reward.def)     flat.def += ach.reward.def;
      if (ach.reward.maxHp)   flat.maxHp += ach.reward.maxHp;
      if (ach.reward.spd)     flat.spd += ach.reward.spd;
      if (ach.reward.critPct) flat.critChance += ach.reward.critPct / 100;
    }
    return flat;
  },

  // 비율 보너스 (골드, EXP, 전체스탯, 쿨타임 감소)
  getBonusMultipliers: function() {
    var gold = 0, exp = 0, statAll = 0, cd = 0;
    for (var i = 0; i < GameState.achievements.unlocked.length; i++) {
      var id = GameState.achievements.unlocked[i];
      var ach = this._getById(id);
      if (!ach || !ach.reward) continue;
      if (ach.reward.goldPct)     gold    += ach.reward.goldPct;
      if (ach.reward.expPct)      exp     += ach.reward.expPct;
      if (ach.reward.statPct)     statAll += ach.reward.statPct;
      if (ach.reward.cooldownPct) cd      += ach.reward.cooldownPct;
    }
    return {
      gold:     1 + gold / 100,
      exp:      1 + exp / 100,
      statAll:  1 + statAll / 100,
      cooldown: Math.max(0.1, 1 - cd / 100)
    };
  },

  _getById: function(id) {
    for (var i = 0; i < this.ACHIEVEMENTS.length; i++) {
      if (this.ACHIEVEMENTS[i].id === id) return this.ACHIEVEMENTS[i];
    }
    return null;
  }
};
