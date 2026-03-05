// ===== 스킬 시스템 =====

// GameState에 skills 필드 추가 (state.js 이후 로드됨)
GameState.skills = {
  powerStrike: { level: 0, timer: 0, unlocked: false },
  shield:      { level: 0, timer: 0, unlocked: false },
  drain:       { level: 0, timer: 0, unlocked: false }
};
GameState.shieldActive = false;
GameState.shieldTimer  = 0;

var SkillSystem = {

  SKILLS: {
    powerStrike: {
      name: '강타',
      icon: '⚡',
      baseCooldown: 8000,
      baseDamageMultiplier: 2.5,
      damageMultPerLevel: 0.2,
      cooldownReducPerLevel: 300,
      unlockLevel: 5,
      maxLevel: 10,
      baseCost: 100,
      cssColor: '#f39c12',
      phaserColor: 0xf39c12
    },
    shield: {
      name: '방어막',
      icon: '🛡️',
      baseCooldown: 15000,
      baseDuration: 3000,
      durationPerLevel: 500,
      cooldownReducPerLevel: 500,
      unlockLevel: 10,
      maxLevel: 10,
      baseCost: 150,
      cssColor: '#3498db',
      phaserColor: 0x3498db
    },
    drain: {
      name: '흡혈',
      icon: '🩸',
      baseCooldown: 12000,
      baseDamageMultiplier: 1.5,
      baseAbsorbRate: 0.5,
      absorbPerLevel: 0.1,
      cooldownReducPerLevel: 400,
      unlockLevel: 15,
      maxLevel: 10,
      baseCost: 200,
      cssColor: '#9b59b6',
      phaserColor: 0x9b59b6
    }
  },

  getCooldown: function(key) {
    var skill = this.SKILLS[key];
    var level = GameState.skills[key].level;
    return Math.max(2000, skill.baseCooldown - level * skill.cooldownReducPerLevel);
  },

  getSkillCost: function(key) {
    var skill = this.SKILLS[key];
    var level = GameState.skills[key].level;
    return Math.floor(skill.baseCost * Math.pow(1.5, level));
  },

  unlockSkill: function(key) {
    var skill = this.SKILLS[key];
    var skillState = GameState.skills[key];
    if (skillState.unlocked) return true;
    if (GameState.hero.level < skill.unlockLevel) return false;
    skillState.unlocked = true;
    return true;
  },

  upgradeSkill: function(key) {
    var skillState = GameState.skills[key];
    var skill = this.SKILLS[key];
    if (!skillState.unlocked) return false;
    if (skillState.level >= skill.maxLevel) return false;
    var cost = this.getSkillCost(key);
    if (GameState.hero.gold < cost) return false;
    GameState.hero.gold -= cost;
    skillState.level++;
    return true;
  },

  processTick: function(delta) {
    var events = [];

    // 방어막 지속 타이머
    if (GameState.shieldActive) {
      GameState.shieldTimer -= delta;
      if (GameState.shieldTimer <= 0) {
        GameState.shieldActive = false;
        GameState.shieldTimer = 0;
      }
    }

    // 몬스터가 없으면 스킬 발동 안 함
    if (GameState.monster.hp <= 0) return events;

    var keys = ['powerStrike', 'shield', 'drain'];
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var skillState = GameState.skills[key];

      // 레벨 조건 충족 시 자동 해금
      if (!skillState.unlocked) {
        this.unlockSkill(key);
        continue;
      }

      skillState.timer += delta;
      var cooldown = this.getCooldown(key);
      if (skillState.timer >= cooldown) {
        skillState.timer = 0;
        var ev = this._activateSkill(key);
        if (ev) events.push(ev);
      }
    }

    return events;
  },

  _activateSkill: function(key) {
    var skill = this.SKILLS[key];
    var skillState = GameState.skills[key];
    var ev = {
      type: 'skillActivated',
      skill: key,
      name: skill.name,
      cssColor: skill.cssColor,
      phaserColor: skill.phaserColor
    };

    if (key === 'powerStrike') {
      var multiplier = skill.baseDamageMultiplier + skillState.level * skill.damageMultPerLevel;
      var rawDamage = GameState.hero.atk * multiplier;
      var damage = Math.max(1, Math.floor(rawDamage - GameState.monster.def));
      GameState.monster.hp = Math.max(0, GameState.monster.hp - damage);
      ev.damage = damage;
      ev.targetDead = GameState.monster.hp <= 0;

    } else if (key === 'shield') {
      var duration = skill.baseDuration + skillState.level * skill.durationPerLevel;
      GameState.shieldActive = true;
      GameState.shieldTimer = duration;
      ev.duration = duration;

    } else if (key === 'drain') {
      var absorbRate = skill.baseAbsorbRate + skillState.level * skill.absorbPerLevel;
      var rawDrain = GameState.hero.atk * skill.baseDamageMultiplier;
      var drainDamage = Math.max(1, Math.floor(rawDrain - GameState.monster.def));
      GameState.monster.hp = Math.max(0, GameState.monster.hp - drainDamage);
      var healAmount = Math.floor(drainDamage * absorbRate);
      GameState.hero.hp = Math.min(GameState.hero.maxHp, GameState.hero.hp + healAmount);
      ev.damage = drainDamage;
      ev.heal = healAmount;
      ev.targetDead = GameState.monster.hp <= 0;
    }

    return ev;
  },

  // 다음 레벨 효과 설명 문자열
  getNextLevelDesc: function(key) {
    var skill = this.SKILLS[key];
    var level = GameState.skills[key].level;
    var nextCd = (Math.max(2000, skill.baseCooldown - (level + 1) * skill.cooldownReducPerLevel) / 1000).toFixed(1);

    if (key === 'powerStrike') {
      var nextMult = Math.floor((skill.baseDamageMultiplier + (level + 1) * skill.damageMultPerLevel) * 100);
      return '배율 ' + nextMult + '% / 쿨타임 ' + nextCd + '초';
    } else if (key === 'shield') {
      var nextDur = ((skill.baseDuration + (level + 1) * skill.durationPerLevel) / 1000).toFixed(1);
      return '지속 ' + nextDur + '초 / 쿨타임 ' + nextCd + '초';
    } else if (key === 'drain') {
      var nextAbsorb = Math.floor((skill.baseAbsorbRate + (level + 1) * skill.absorbPerLevel) * 100);
      return '흡수율 ' + nextAbsorb + '% / 쿨타임 ' + nextCd + '초';
    }
    return '';
  },

  // 현재 레벨 효과 설명 문자열
  getCurrentDesc: function(key) {
    var skill = this.SKILLS[key];
    var level = GameState.skills[key].level;
    var cd = (this.getCooldown(key) / 1000).toFixed(1);

    if (key === 'powerStrike') {
      var mult = Math.floor((skill.baseDamageMultiplier + level * skill.damageMultPerLevel) * 100);
      return '배율 ' + mult + '% / 쿨타임 ' + cd + '초';
    } else if (key === 'shield') {
      var dur = ((skill.baseDuration + level * skill.durationPerLevel) / 1000).toFixed(1);
      return '지속 ' + dur + '초 / 쿨타임 ' + cd + '초';
    } else if (key === 'drain') {
      var absorb = Math.floor((skill.baseAbsorbRate + level * skill.absorbPerLevel) * 100);
      return '흡수율 ' + absorb + '% / 쿨타임 ' + cd + '초';
    }
    return '';
  }
};
