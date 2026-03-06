// ===== 세이브 시스템 (SaveSlotManager 위임) =====
var SaveSystem = {

  save: function() {
    try {
      var saveData = this._buildSaveData();
      SaveSlotManager.saveToSlot(SaveSlotManager.getActiveSlot(), saveData);

      // 플레이 타임 업적 체크
      if (typeof AchievementSystem !== 'undefined') {
        AchievementSystem.check('playTime', GameState.meta.playTime);
      }
    } catch (e) {
      console.warn('저장 실패:', e);
    }
  },

  _buildSaveData: function() {
    return {
      version: CONFIG.SAVE_VERSION,
      hero: {
        level: GameState.hero.level,
        exp: GameState.hero.exp,
        gold: GameState.hero.gold,
        maxHp: GameState.hero.maxHp,
        atk: GameState.hero.atk,
        def: GameState.hero.def,
        spd: GameState.hero.spd,
        critChance: GameState.hero.critChance,
        critMult: GameState.hero.critMult
      },
      upgrades: Object.assign({}, GameState.upgrades),
      stage: {
        current: GameState.stage.current,
        killCount: GameState.stage.killCount
      },
      meta: {
        totalKills: GameState.meta.totalKills,
        totalGold: GameState.meta.totalGold,
        playTime: GameState.meta.playTime,
        lastSaveTime: Date.now()
      },
      skills: GameState.skills ? {
        powerStrike: { level: GameState.skills.powerStrike.level, unlocked: GameState.skills.powerStrike.unlocked },
        shield:      { level: GameState.skills.shield.level,      unlocked: GameState.skills.shield.unlocked },
        drain:       { level: GameState.skills.drain.level,       unlocked: GameState.skills.drain.unlocked }
      } : null,
      equipment: GameState.equipment ? {
        equipped: GameState.equipment.equipped,
        inventory: GameState.equipment.inventory
      } : null,
      prestige: GameState.prestige ? {
        count: GameState.prestige.count,
        soulStones: GameState.prestige.soulStones,
        totalSoulStones: GameState.prestige.totalSoulStones,
        buffs: Object.assign({}, GameState.prestige.buffs)
      } : null,
      achievements: GameState.achievements ? {
        unlocked: GameState.achievements.unlocked.slice(),
        stats: Object.assign({}, GameState.achievements.stats)
      } : null,
      quests: GameState.quests ? {
        active: GameState.quests.active.slice(),
        daily: GameState.quests.daily.slice(),
        lastDailyReset: GameState.quests.lastDailyReset,
        totalCompleted: GameState.quests.totalCompleted
      } : null,
      shop: GameState.shop ? {
        inventory: Object.assign({}, GameState.shop.inventory),
        activeBuffs: Object.assign({}, GameState.shop.activeBuffs)
      } : null,
      pets: GameState.pets ? {
        equipped: GameState.pets.equipped,
        inventory: GameState.pets.inventory.slice(),
        eggs: Object.assign({}, GameState.pets.eggs),
        food: Object.assign({}, GameState.pets.food)
      } : null,
      crafting: GameState.crafting ? {
        materials: Object.assign({}, GameState.crafting.materials),
        enhanceMaterials: Object.assign({}, GameState.crafting.enhanceMaterials)
      } : null,
      stats: GameState.stats ? {
        lifetime: Object.assign({}, GameState.stats.lifetime)
      } : null
    };
  },

  load: function() {
    try {
      return SaveSlotManager.loadFromSlot(SaveSlotManager.getActiveSlot());
    } catch (e) {
      console.warn('로드 실패:', e);
      return null;
    }
  },

  // 구버전 세이브 데이터를 현재 버전으로 마이그레이션
  _migrate: function(saveData) {
    if (!saveData.version) {
      saveData.version = 0;
    }

    // v0 → v1: skills, equipment 필드 추가
    if (saveData.version < 1) {
      saveData.skills = saveData.skills || {
        powerStrike: { level: 0, unlocked: false },
        shield:      { level: 0, unlocked: false },
        drain:       { level: 0, unlocked: false }
      };
      saveData.equipment = saveData.equipment || {
        equipped: { weapon: null, armor: null, ring: null },
        inventory: []
      };
      saveData.version = 1;
    }

    // v1 → v2: prestige, achievements, quests 필드 추가
    if (saveData.version < 2) {
      saveData.prestige = saveData.prestige || {
        count: 0,
        soulStones: 0,
        totalSoulStones: 0,
        buffs: { permAtk: 0, permHp: 0, permGold: 0, permExp: 0, permOffline: 0, fastStart: 0 }
      };
      saveData.achievements = saveData.achievements || {
        unlocked: [],
        stats: { bossKills: 0, totalGoldSpent: 0, deaths: 0, consecutiveCrits: 0 }
      };
      saveData.quests = saveData.quests || {
        active: [],
        daily: [],
        lastDailyReset: 0,
        totalCompleted: 0
      };
      saveData.version = 2;
    }

    // v2 → v3: shop, pets 필드 추가
    if (saveData.version < 3) {
      saveData.shop = saveData.shop || {
        inventory: { hpPotion: 0, goldBooster: 0, expBooster: 0, revive: 0, dropBooster: 0 },
        activeBuffs: { goldBooster: 0, expBooster: 0, dropBooster: 0 }
      };
      saveData.pets = saveData.pets || {
        equipped: null,
        inventory: [],
        eggs: { dragonEgg: 0, turtleEgg: 0, foxEgg: 0 },
        food: { petFood_s: 0, petFood_m: 0, petFood_l: 0 }
      };
      saveData.version = 3;
    }

    // v3 → v4: crafting 필드 추가
    if (saveData.version < 4) {
      saveData.crafting = saveData.crafting || {
        materials: { ironOre: 0, magicCrystal: 0, dragonScale: 0, voidEssence: 0, ancientShard: 0 },
        enhanceMaterials: { enhanceStone: 0, legendStone: 0 }
      };
      saveData.version = 4;
    }

    // v4 → v5: SaveSlotManager 전환 (데이터 구조 변경 없음 - 패스스루)
    if (saveData.version < 5) {
      saveData.version = 5;
    }

    // v5 → v6: stats.lifetime 필드 추가
    if (saveData.version < 6) {
      saveData.stats = saveData.stats || {};
      saveData.stats.lifetime = saveData.stats.lifetime || {
        totalDamageDealt: 0, totalDamageTaken: 0, totalGoldEarned: 0,
        totalKills: 0, totalDeaths: 0, totalCrits: 0, totalSkillUses: 0,
        totalCrafts: 0, totalPrestige: 0, highestStage: 0, highestLevel: 0,
        peakDps: 0, totalEquipDrops: 0, stagesCleared: 0
      };
      saveData.version = 6;
    }

    return saveData;
  },

  applySaveData: function(saveData) {
    if (!saveData) return;

    // 마이그레이션 적용
    saveData = this._migrate(saveData);

    // hero 데이터 복원
    var h = saveData.hero || {};
    GameState.hero.level = h.level || 1;
    GameState.hero.exp = h.exp || 0;
    GameState.hero.gold = h.gold || 0;

    // upgrades 복원
    var u = saveData.upgrades || {};
    GameState.upgrades.atk = u.atk || 0;
    GameState.upgrades.def = u.def || 0;
    GameState.upgrades.hp = u.hp || 0;
    GameState.upgrades.spd = u.spd || 0;
    GameState.upgrades.critChance = u.critChance || 0;
    GameState.upgrades.goldBonus = u.goldBonus || 0;

    // prestige 복원
    if (GameState.prestige && saveData.prestige) {
      var p = saveData.prestige;
      GameState.prestige.count = p.count || 0;
      GameState.prestige.soulStones = p.soulStones || 0;
      GameState.prestige.totalSoulStones = p.totalSoulStones || 0;
      if (p.buffs) {
        GameState.prestige.buffs.permAtk     = p.buffs.permAtk     || 0;
        GameState.prestige.buffs.permHp      = p.buffs.permHp      || 0;
        GameState.prestige.buffs.permGold    = p.buffs.permGold    || 0;
        GameState.prestige.buffs.permExp     = p.buffs.permExp     || 0;
        GameState.prestige.buffs.permOffline = p.buffs.permOffline || 0;
        GameState.prestige.buffs.fastStart   = p.buffs.fastStart   || 0;
      }
    }

    // achievements 복원
    if (GameState.achievements && saveData.achievements) {
      var ac = saveData.achievements;
      GameState.achievements.unlocked = ac.unlocked || [];
      if (ac.stats) {
        GameState.achievements.stats.bossKills        = ac.stats.bossKills       || 0;
        GameState.achievements.stats.totalGoldSpent   = ac.stats.totalGoldSpent  || 0;
        GameState.achievements.stats.deaths           = ac.stats.deaths          || 0;
        GameState.achievements.stats.consecutiveCrits = ac.stats.consecutiveCrits|| 0;
      }
    }

    // 스탯 재계산 (prestige/achievement 반영)
    UpgradeSystem.recalculateStats();

    // HP는 최대HP로 복원
    GameState.hero.hp = GameState.hero.maxHp;

    // stage 복원
    var s = saveData.stage || {};
    GameState.stage.current = s.current || 1;
    GameState.stage.killCount = 0;

    // meta 복원
    var m = saveData.meta || {};
    GameState.meta.totalKills = m.totalKills || 0;
    GameState.meta.totalGold = m.totalGold || 0;
    GameState.meta.playTime = m.playTime || 0;
    GameState.meta.lastSaveTime = m.lastSaveTime || Date.now();

    // skills 복원
    if (GameState.skills && saveData.skills) {
      var sk = saveData.skills;
      var keys = ['powerStrike', 'shield', 'drain'];
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (sk[key] && GameState.skills[key]) {
          GameState.skills[key].level   = sk[key].level   || 0;
          GameState.skills[key].unlocked = sk[key].unlocked || false;
          GameState.skills[key].timer   = 0;
        }
      }
    }

    // equipment 복원
    if (GameState.equipment && saveData.equipment) {
      var eq = saveData.equipment;
      GameState.equipment.equipped  = eq.equipped  || { weapon: null, armor: null, ring: null };
      GameState.equipment.inventory = eq.inventory || [];
      UpgradeSystem.recalculateStats();
    }

    // quests 복원
    if (GameState.quests && saveData.quests) {
      var qd = saveData.quests;
      GameState.quests.active        = qd.active        || [];
      GameState.quests.daily         = qd.daily         || [];
      GameState.quests.lastDailyReset= qd.lastDailyReset|| 0;
      GameState.quests.totalCompleted= qd.totalCompleted || 0;
    }

    // shop 복원
    if (GameState.shop && saveData.shop) {
      var sh = saveData.shop;
      if (sh.inventory) {
        GameState.shop.inventory.hpPotion    = sh.inventory.hpPotion    || 0;
        GameState.shop.inventory.goldBooster = sh.inventory.goldBooster || 0;
        GameState.shop.inventory.expBooster  = sh.inventory.expBooster  || 0;
        GameState.shop.inventory.dropBooster = sh.inventory.dropBooster || 0;
        GameState.shop.inventory.revive      = sh.inventory.revive      || 0;
      }
      if (sh.activeBuffs) {
        GameState.shop.activeBuffs.goldBooster = sh.activeBuffs.goldBooster || 0;
        GameState.shop.activeBuffs.expBooster  = sh.activeBuffs.expBooster  || 0;
        GameState.shop.activeBuffs.dropBooster = sh.activeBuffs.dropBooster || 0;
      }
    }

    // pets 복원
    if (GameState.pets && saveData.pets) {
      var pt = saveData.pets;
      GameState.pets.equipped  = pt.equipped  || null;
      GameState.pets.inventory = pt.inventory || [];
      GameState.pets.eggs      = pt.eggs      || { dragonEgg: 0, turtleEgg: 0, foxEgg: 0 };
      GameState.pets.food      = pt.food      || { petFood_s: 0, petFood_m: 0, petFood_l: 0 };
    }

    // crafting 복원
    if (GameState.crafting && saveData.crafting) {
      var cr = saveData.crafting;
      if (cr.materials) {
        GameState.crafting.materials.ironOre      = cr.materials.ironOre      || 0;
        GameState.crafting.materials.magicCrystal = cr.materials.magicCrystal || 0;
        GameState.crafting.materials.dragonScale  = cr.materials.dragonScale  || 0;
        GameState.crafting.materials.voidEssence  = cr.materials.voidEssence  || 0;
        GameState.crafting.materials.ancientShard = cr.materials.ancientShard || 0;
      }
      if (cr.enhanceMaterials) {
        GameState.crafting.enhanceMaterials.enhanceStone = cr.enhanceMaterials.enhanceStone || 0;
        GameState.crafting.enhanceMaterials.legendStone  = cr.enhanceMaterials.legendStone  || 0;
      }
    }

    // stats.lifetime 복원
    if (GameState.stats && saveData.stats && saveData.stats.lifetime) {
      var lt = saveData.stats.lifetime;
      var d  = GameState.stats.lifetime;
      d.totalDamageDealt = lt.totalDamageDealt || 0;
      d.totalDamageTaken = lt.totalDamageTaken || 0;
      d.totalGoldEarned  = lt.totalGoldEarned  || 0;
      d.totalKills       = lt.totalKills       || 0;
      d.totalDeaths      = lt.totalDeaths      || 0;
      d.totalCrits       = lt.totalCrits       || 0;
      d.totalSkillUses   = lt.totalSkillUses   || 0;
      d.totalCrafts      = lt.totalCrafts      || 0;
      d.totalPrestige    = lt.totalPrestige    || 0;
      d.highestStage     = lt.highestStage     || 0;
      d.highestLevel     = lt.highestLevel     || 0;
      d.peakDps          = lt.peakDps          || 0;
      d.totalEquipDrops  = lt.totalEquipDrops  || 0;
      d.stagesCleared    = lt.stagesCleared    || 0;
    }

    // pets 포함한 스탯 재계산
    if (typeof PetSystem !== 'undefined') UpgradeSystem.recalculateStats();
  },

  calculateOfflineReward: function() {
    var lastSave = GameState.meta.lastSaveTime;
    if (!lastSave) return 0;

    var now = Date.now();
    var elapsed = (now - lastSave) / 1000;

    // 최대 8시간 캡
    var maxSeconds = CONFIG.OFFLINE_MAX_HOURS * 3600;
    elapsed = Math.min(elapsed, maxSeconds);

    if (elapsed < 5) return 0;

    var stage = GameState.stage.current;
    var goldBonus = 1 + GameState.upgrades.goldBonus * CONFIG.UPGRADE_STAT_PER_LEVEL.goldBonus;
    var goldPerSec = CONFIG.OFFLINE_GOLD_PER_SECOND_BASE * stage * goldBonus;

    // 프레스티지 오프라인 배율
    if (typeof PrestigeSystem !== 'undefined') {
      goldPerSec *= PrestigeSystem.getMultipliers().offline;
    }

    return Math.floor(elapsed * goldPerSec);
  },

  resetSave: function(all) {
    if (all) {
      for (var i = 1; i <= SaveSlotManager.SLOT_COUNT; i++) {
        SaveSlotManager.deleteSlot(i);
      }
      localStorage.removeItem(SaveSlotManager.ACTIVE_KEY);
    } else {
      SaveSlotManager.deleteSlot(SaveSlotManager.getActiveSlot());
    }
    window.location.reload();
  }
};
