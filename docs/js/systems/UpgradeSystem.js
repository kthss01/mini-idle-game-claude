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

    // 업그레이드 보너스
    GameState.hero.maxHp = base.hp + levelHp + u.hp * perLv.hp;
    GameState.hero.atk = base.atk + levelAtk + u.atk * perLv.atk;
    GameState.hero.def = base.def + levelDef + u.def * perLv.def;
    GameState.hero.spd = base.spd + u.spd * perLv.spd;
    GameState.hero.critChance = base.critChance + u.critChance * perLv.critChance;
    GameState.hero.critMult = base.critMult;

    // 장비 보너스 합산
    if (typeof EquipmentSystem !== 'undefined') {
      var eqStats = EquipmentSystem.getEquippedStats();
      GameState.hero.maxHp     += eqStats.hp        || 0;
      GameState.hero.atk       += eqStats.atk       || 0;
      GameState.hero.def       += eqStats.def       || 0;
      GameState.hero.critChance += eqStats.critChance || 0;
    }

    // HP가 최대HP를 초과하지 않도록
    GameState.hero.hp = Math.min(GameState.hero.hp, GameState.hero.maxHp);
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
      // 레벨업 시 HP 전체 회복
      GameState.hero.hp = GameState.hero.maxHp;
      leveled = true;
    }

    return leveled;
  }
};
