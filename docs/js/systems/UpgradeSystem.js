// ===== 업그레이드 시스템 =====
var UpgradeSystem = {

  getCost: function(type) {
    var baseCost = CONFIG.UPGRADE_BASE_COST[type] || 20;
    var level = GameState.upgrades[type] || 0;
    return Math.floor(baseCost * Math.pow(CONFIG.UPGRADE_COST_MULT, level));
  },

  canAfford: function(type) {
    return GameState.hero.gold >= this.getCost(type);
  },

  applyUpgrade: function(type) {
    if (!this.canAfford(type)) return false;

    var cost = this.getCost(type);
    GameState.hero.gold -= cost;
    GameState.upgrades[type]++;

    // 업적 통계 & 체크
    if (GameState.achievements) {
      GameState.achievements.stats.totalGoldSpent += cost;
      if (typeof AchievementSystem !== 'undefined') {
        AchievementSystem.check('goldSpent', GameState.achievements.stats.totalGoldSpent);
        if (GameState.upgrades[type] >= 20) {
          AchievementSystem.check('upgMax', GameState.upgrades[type]);
        }
      }
    }

    // 퀘스트 업데이트
    if (typeof QuestSystem !== 'undefined') {
      QuestSystem.updateProgress('upgrade', 1);
    }

    this.recalculateStats();
    return true;
  },

  recalculateStats: function() {
    var base = CONFIG.BASE_STATS;
    var u = GameState.upgrades;
    var perLv = CONFIG.UPGRADE_STAT_PER_LEVEL;
    var heroLevel = GameState.hero.level;

    // 레벨 보너스
    var levelAtk = (heroLevel - 1) * 3;
    var levelDef = (heroLevel - 1) * 1;
    var levelHp = (heroLevel - 1) * 20;

    // 기본값 + 업그레이드 보너스
    GameState.hero.maxHp     = base.hp + levelHp + u.hp * perLv.hp;
    GameState.hero.atk       = base.atk + levelAtk + u.atk * perLv.atk;
    GameState.hero.def       = base.def + levelDef + u.def * perLv.def;
    GameState.hero.spd       = base.spd + u.spd * perLv.spd;
    GameState.hero.critChance = base.critChance + u.critChance * perLv.critChance;
    GameState.hero.critMult  = base.critMult;

    // 장비 보너스 합산
    if (typeof EquipmentSystem !== 'undefined') {
      var eqStats = EquipmentSystem.getEquippedStats();
      GameState.hero.maxHp      += eqStats.hp        || 0;
      GameState.hero.atk        += eqStats.atk       || 0;
      GameState.hero.def        += eqStats.def       || 0;
      GameState.hero.critChance += eqStats.critChance || 0;
    }

    // 업적 flat 보너스
    if (typeof AchievementSystem !== 'undefined') {
      var achFlat = AchievementSystem.getFlatBonuses();
      GameState.hero.maxHp      += achFlat.maxHp;
      GameState.hero.atk        += achFlat.atk;
      GameState.hero.def        += achFlat.def;
      GameState.hero.spd        += achFlat.spd;
      GameState.hero.critChance += achFlat.critChance;

      // 업적 statAll 배율
      var achMult = AchievementSystem.getBonusMultipliers();
      GameState.hero.maxHp      = Math.floor(GameState.hero.maxHp * achMult.statAll);
      GameState.hero.atk        = Math.floor(GameState.hero.atk * achMult.statAll);
      GameState.hero.def        = Math.floor(GameState.hero.def * achMult.statAll);
      GameState.hero.spd        = Math.floor(GameState.hero.spd * achMult.statAll);
    }

    // 프레스티지 배율 (최종 적용)
    if (typeof PrestigeSystem !== 'undefined') {
      var prestMult = PrestigeSystem.getMultipliers();
      GameState.hero.atk   = Math.floor(GameState.hero.atk * prestMult.atk);
      GameState.hero.maxHp = Math.floor(GameState.hero.maxHp * prestMult.hp);
    }

    // 펫 스탯 배율
    if (typeof PetSystem !== 'undefined') {
      var petStats = PetSystem.getPetStats();
      if (petStats.atk)        GameState.hero.atk        = Math.floor(GameState.hero.atk        * (1 + petStats.atk));
      if (petStats.hp)         GameState.hero.maxHp      = Math.floor(GameState.hero.maxHp      * (1 + petStats.hp));
      if (petStats.def)        GameState.hero.def        = Math.floor(GameState.hero.def        * (1 + petStats.def));
      if (petStats.critChance) GameState.hero.critChance += petStats.critChance;
    }

    // HP가 최대HP를 초과하지 않도록
    GameState.hero.hp = Math.min(GameState.hero.hp, GameState.hero.maxHp);

    // 비밀 업적: 공격속도 최대치 (spd >= 24 → cooldown 200ms)
    if (GameState.hero.spd >= 24 && typeof AchievementSystem !== 'undefined') {
      AchievementSystem.check('maxSpeed', 1);
    }
  },

  getExpRequired: function(level) {
    return Math.floor(CONFIG.EXP_BASE * Math.pow(level, CONFIG.EXP_EXPONENT));
  },

  addExp: function(amount) {
    GameState.hero.exp += amount;
    var leveled = false;

    while (GameState.hero.exp >= this.getExpRequired(GameState.hero.level)) {
      GameState.hero.exp -= this.getExpRequired(GameState.hero.level);
      GameState.hero.level++;
      this.recalculateStats();
      GameState.hero.hp = GameState.hero.maxHp;
      leveled = true;
    }

    // 레벨 업적 체크
    if (leveled && typeof AchievementSystem !== 'undefined') {
      AchievementSystem.check('level', GameState.hero.level);
    }

    return leveled;
  }
};
