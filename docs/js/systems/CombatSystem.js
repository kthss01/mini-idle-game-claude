// ===== 전투 시스템 =====
var CombatSystem = {

  heroAttackTimer: 0,
  monsterAttackTimer: 0,
  heroAttackCooldown: 0,
  monsterAttackCooldown: 2000,

  init: function() {
    this.heroAttackTimer = 0;
    this.monsterAttackTimer = 0;
    this.heroAttackCooldown = spdToCooldown(GameState.hero.spd);
    this.monsterAttackCooldown = 2200;
  },

  calculateDamage: function(atk, def, critChance, critMult) {
    var isCrit = Math.random() < critChance;
    var rawDamage = atk * (0.9 + Math.random() * 0.2); // ±10% 변동
    var damage = Math.max(1, rawDamage - def);
    if (isCrit) damage = Math.floor(damage * critMult);
    else damage = Math.floor(damage);
    return { damage, isCrit };
  },

  processTick: function(delta, scene) {
    this.heroAttackTimer += delta;
    this.monsterAttackTimer += delta;

    // 영웅 공격 쿨다운 업데이트 (spd 변화 반영)
    this.heroAttackCooldown = spdToCooldown(GameState.hero.spd);

    var events = [];

    // 영웅 → 몬스터 공격
    if (this.heroAttackTimer >= this.heroAttackCooldown) {
      this.heroAttackTimer = 0;

      var heroResult = this.calculateDamage(
        GameState.hero.atk,
        GameState.monster.def,
        GameState.hero.critChance,
        GameState.hero.critMult
      );

      GameState.monster.hp = Math.max(0, GameState.monster.hp - heroResult.damage);
      events.push({
        type: 'heroAttack',
        damage: heroResult.damage,
        isCrit: heroResult.isCrit,
        targetDead: GameState.monster.hp <= 0
      });
    }

    // 몬스터 → 영웅 공격 (몬스터가 살아있을 때만)
    if (this.monsterAttackTimer >= this.monsterAttackCooldown && GameState.monster.hp > 0) {
      this.monsterAttackTimer = 0;

      var monsterResult = this.calculateDamage(
        GameState.monster.atk,
        GameState.hero.def,
        0.03,
        1.5
      );

      GameState.hero.hp = Math.max(0, GameState.hero.hp - monsterResult.damage);
      events.push({
        type: 'monsterAttack',
        damage: monsterResult.damage,
        isCrit: monsterResult.isCrit
      });

      // 영웅 사망 처리 (HP가 0이 되면 회복)
      if (GameState.hero.hp <= 0) {
        GameState.hero.hp = Math.floor(GameState.hero.maxHp * 0.3);
        events.push({ type: 'heroDeath' });
      }
    }

    return events;
  }
};
