// ===== 세이브 시스템 =====
var SaveSystem = {

  save: function() {
    try {
      var saveData = {
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
        }
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

  applySaveData: function(saveData) {
    if (!saveData) return;

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
