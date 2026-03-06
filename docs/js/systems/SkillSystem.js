// ===== 스킬 시스템 (패시브) =====

var SkillSystem = {

  SKILLS: [
    {
      key: 'lifesteal',
      name: '흡혈',
      icon: '🩸',
      unlockLevel: 5,
      desc: '공격 시 피해의 %만큼 HP 회복',
      values: [0.03, 0.06, 0.09, 0.12, 0.15]
    },
    {
      key: 'berserker',
      name: '광전사',
      icon: '🔥',
      unlockLevel: 10,
      desc: 'HP 50% 이하 시 ATK 증가',
      values: [0.15, 0.25, 0.35, 0.50, 0.70]
    },
    {
      key: 'ironSkin',
      name: '강철 피부',
      icon: '🪨',
      unlockLevel: 15,
      desc: '받는 피해 고정 감소',
      values: [2, 5, 9, 14, 20]
    },
    {
      key: 'doubleStrike',
      name: '연타',
      icon: '🌀',
      unlockLevel: 20,
      desc: '확률로 2회 공격',
      values: [0.10, 0.18, 0.28, 0.40, 0.55]
    },
    {
      key: 'poison',
      name: '맹독',
      icon: '☠️',
      unlockLevel: 25,
      desc: '초당 독 피해',
      values: [3, 7, 13, 20, 30]
    },
    {
      key: 'thunder',
      name: '번개',
      icon: '⚡',
      unlockLevel: 30,
      desc: '크리티컬 시 추가 피해',
      values: [0.30, 0.50, 0.75, 1.00, 1.50]
    }
  ],

  getSkillDef: function(key) {
    for (var i = 0; i < this.SKILLS.length; i++) {
      if (this.SKILLS[i].key === key) return this.SKILLS[i];
    }
    return null;
  },

  getSkillValue: function(key) {
    var def = this.getSkillDef(key);
    if (!def) return 0;
    var level = (GameState.skills && GameState.skills[key]) || 0;
    if (level <= 0) return 0;
    return def.values[level - 1];
  },

  isUnlocked: function(key) {
    var def = this.getSkillDef(key);
    if (!def) return false;
    return GameState.hero.level >= def.unlockLevel;
  },

  canUpgrade: function(key) {
    if (!this.isUnlocked(key)) return false;
    if (!GameState.skills || GameState.skills.points <= 0) return false;
    var def = this.getSkillDef(key);
    if (!def) return false;
    return ((GameState.skills[key] || 0) < def.values.length);
  },

  upgradeSkill: function(key) {
    if (!this.canUpgrade(key)) return false;
    GameState.skills.points--;
    GameState.skills[key] = (GameState.skills[key] || 0) + 1;
    return true;
  },

  onLevelUp: function() {
    if (GameState.skills) {
      GameState.skills.points++;
    }
  },

  // === 전투 효과 메서드 ===

  applyLifesteal: function(damage) {
    var rate = this.getSkillValue('lifesteal');
    if (rate <= 0) return;
    var heal = Math.floor(damage * rate);
    if (heal > 0) {
      GameState.hero.hp = Math.min(GameState.hero.maxHp, GameState.hero.hp + heal);
    }
  },

  getBerserkerMult: function() {
    var rate = this.getSkillValue('berserker');
    if (rate <= 0) return 1.0;
    var hpPct = GameState.hero.hp / GameState.hero.maxHp;
    return (hpPct <= 0.5) ? (1 + rate) : 1.0;
  },

  getIronSkinReduction: function() {
    return this.getSkillValue('ironSkin') || 0;
  },

  rollDoubleStrike: function() {
    var chance = this.getSkillValue('doubleStrike');
    if (chance <= 0) return false;
    return Math.random() < chance;
  },

  getPoisonDps: function() {
    return this.getSkillValue('poison') || 0;
  },

  getThunderBonus: function(baseDamage) {
    var rate = this.getSkillValue('thunder');
    if (rate <= 0) return 0;
    return Math.floor(baseDamage * rate);
  },

  // 스킬 효과 설명 문자열
  getValueDesc: function(key, level) {
    var def = this.getSkillDef(key);
    if (!def || level <= 0 || level > def.values.length) return '-';
    var v = def.values[level - 1];
    if (key === 'lifesteal')     return Math.round(v * 100) + '% 흡혈';
    if (key === 'berserker')     return Math.round(v * 100) + '% ATK 증가';
    if (key === 'ironSkin')      return v + ' 피해 감소';
    if (key === 'doubleStrike')  return Math.round(v * 100) + '% 확률';
    if (key === 'poison')        return v + ' 독/초';
    if (key === 'thunder')       return Math.round(v * 100) + '% 추가 피해';
    return String(v);
  }
};
