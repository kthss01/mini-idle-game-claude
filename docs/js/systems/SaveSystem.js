// ===== 세이브 시스템 =====
var SaveSystem = {

  save: function() {
    try {
      var saveData = {
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
        } : null
      };
      localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify(saveData));
    } catch (e) {
      console.warn('저장 실패:', e);
    }
  },

  load: function() {
    try {
      var raw = localStorage.getItem(CONFIG.SAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
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

    // 스탯 재계산
    UpgradeSystem.recalculateStats();

    // HP는 최대HP로 복원 (오프라인 중 회복)
    GameState.hero.hp = GameState.hero.maxHp;

    // stage 복원
    var s = saveData.stage || {};
    GameState.stage.current = s.current || 1;
    GameState.stage.killCount = 0; // 킬카운트는 리셋

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
      // 장비 스탯 재반영
      UpgradeSystem.recalculateStats();
    }
  },

  calculateOfflineReward: function() {
    var lastSave = GameState.meta.lastSaveTime;
    if (!lastSave) return 0;

    var now = Date.now();
    var elapsed = (now - lastSave) / 1000; // 초 단위

    // 최대 8시간 캡
    var maxSeconds = CONFIG.OFFLINE_MAX_HOURS * 3600;
    elapsed = Math.min(elapsed, maxSeconds);

    if (elapsed < 5) return 0; // 5초 미만은 무시

    var stage = GameState.stage.current;
    var goldBonus = 1 + GameState.upgrades.goldBonus * CONFIG.UPGRADE_STAT_PER_LEVEL.goldBonus;
    var goldPerSec = CONFIG.OFFLINE_GOLD_PER_SECOND_BASE * stage * goldBonus;
    return Math.floor(elapsed * goldPerSec);
  },

  resetSave: function() {
    localStorage.removeItem(CONFIG.SAVE_KEY);
    window.location.reload();
  }
};
