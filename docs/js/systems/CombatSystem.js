// ===== 전투 시스템 =====
var CombatSystem = {

  heroAttackTimer: 0,
  monsterAttackTimer: 0,
  heroAttackCooldown: 0,
  monsterAttackCooldown: 2000,
  poisonTimer: 0,

  init: function() {
    this.heroAttackTimer = 0;
    this.monsterAttackTimer = 0;
    this.heroAttackCooldown = spdToCooldown(GameState.hero.spd);
    this.monsterAttackCooldown = 2200;
    this.poisonTimer = 0;
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

      // 광전사: 유효 ATK 계산
      var effectiveAtk = GameState.hero.atk;
      if (typeof SkillSystem !== 'undefined') {
        effectiveAtk = Math.floor(GameState.hero.atk * SkillSystem.getBerserkerMult());
      }
      // 전투 부스터: ATK 1.5배
      if (typeof ShopSystem !== 'undefined' && ShopSystem.isBuffActive('atkBooster')) {
        effectiveAtk = Math.floor(effectiveAtk * 1.5);
      }

      // 집중 부스터: 크리티컬 확률 1.5배
      var effectiveCrit = GameState.hero.critChance;
      if (typeof ShopSystem !== 'undefined' && ShopSystem.isBuffActive('critBooster')) {
        effectiveCrit = Math.min(1, effectiveCrit * 1.5);
      }

      var heroResult = this.calculateDamage(
        effectiveAtk,
        GameState.monster.def,
        effectiveCrit,
        GameState.hero.critMult
      );

      var totalDamage = heroResult.damage;

      // 번개: 크리티컬 시 추가 피해
      var thunderBonus = 0;
      if (heroResult.isCrit && typeof SkillSystem !== 'undefined') {
        thunderBonus = SkillSystem.getThunderBonus(heroResult.damage);
        totalDamage += thunderBonus;
      }

      // 연타: 2번째 공격
      var doubleStrike = false, doubleStrikeDmg = 0;
      if (typeof SkillSystem !== 'undefined' && SkillSystem.rollDoubleStrike()) {
        doubleStrike = true;
        var second = this.calculateDamage(effectiveAtk, GameState.monster.def, effectiveCrit, GameState.hero.critMult);
        doubleStrikeDmg = second.damage;
        totalDamage += doubleStrikeDmg;
      }

      GameState.monster.hp = Math.max(0, GameState.monster.hp - totalDamage);

      // 흡혈: HP 회복
      if (typeof SkillSystem !== 'undefined') {
        SkillSystem.applyLifesteal(totalDamage);
      }

      // StatsTracker 데미지 기록
      if (typeof StatsTracker !== 'undefined') {
        StatsTracker.recordDamage(heroResult.damage, heroResult.isCrit);
      }

      // 연속 크리티컬 추적 (비밀 업적 + 퀘스트)
      if (heroResult.isCrit) {
        if (GameState.achievements) {
          GameState.achievements.stats.consecutiveCrits++;
          if (typeof AchievementSystem !== 'undefined') {
            AchievementSystem.check('consecCrit', GameState.achievements.stats.consecutiveCrits);
          }
        }
        if (typeof QuestSystem !== 'undefined') {
          QuestSystem.updateProgress('crit', 1);
        }
      } else {
        if (GameState.achievements) {
          GameState.achievements.stats.consecutiveCrits = 0;
        }
      }

      events.push({
        type: 'heroAttack',
        damage: heroResult.damage,
        totalDamage: totalDamage,
        isCrit: heroResult.isCrit,
        thunderBonus: thunderBonus,
        doubleStrike: doubleStrike,
        doubleStrikeDmg: doubleStrikeDmg,
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

      // 강철 피부: 받는 피해 감소
      var actualDamage = monsterResult.damage;
      if (typeof SkillSystem !== 'undefined') {
        actualDamage = Math.max(1, actualDamage - SkillSystem.getIronSkinReduction());
      }

      GameState.hero.hp = Math.max(0, GameState.hero.hp - actualDamage);

      // StatsTracker 피해 기록
      if (typeof StatsTracker !== 'undefined') {
        if (GameState.stats) GameState.stats.lifetime.totalDamageTaken += actualDamage;
      }

      events.push({
        type: 'monsterAttack',
        damage: actualDamage,
        isCrit: monsterResult.isCrit,
        shielded: false
      });

      // 영웅 사망 처리 (HP가 0이 되면 회복)
      if (GameState.hero.hp <= 0) {
        // 부활석 자동 소모 체크
        if (typeof ShopSystem !== 'undefined' && GameState.shop && GameState.shop.inventory.revive > 0) {
          GameState.shop.inventory.revive--;
          GameState.hero.hp = GameState.hero.maxHp;
          events.push({ type: 'reviveUsed' });
        } else {
          GameState.hero.hp = Math.floor(GameState.hero.maxHp * 0.3);
          // 사망 횟수 추적 (비밀 업적)
          if (GameState.achievements) {
            GameState.achievements.stats.deaths++;
            if (typeof AchievementSystem !== 'undefined') {
              AchievementSystem.check('deaths', GameState.achievements.stats.deaths);
            }
          }
          // StatsTracker 사망 기록
          if (typeof StatsTracker !== 'undefined') {
            StatsTracker.recordDeath();
          }
          events.push({ type: 'heroDeath' });
        }
      }
    }

    // 맹독 틱 (1초마다)
    this.poisonTimer += delta;
    if (this.poisonTimer >= 1000) {
      this.poisonTimer -= 1000;
      if (typeof SkillSystem !== 'undefined') {
        var poisonDps = SkillSystem.getPoisonDps();
        if (poisonDps > 0 && GameState.monster.hp > 0) {
          GameState.monster.hp = Math.max(0, GameState.monster.hp - poisonDps);
          events.push({ type: 'poison', damage: poisonDps, targetDead: GameState.monster.hp <= 0 });
        }
      }
    }

    return events;
  }
};
