// ===== 통계 추적 시스템 (실시간 DPS + 세션/누적 지표) =====
var StatsTracker = {

  // 슬라이딩 윈도우 버퍼
  _damageBuffer: [],  // [{time, amount, isCrit}]  5초 윈도우
  _goldBuffer:   [],  // [{time, amount}]           60초 윈도우
  _expBuffer:    [],  // [{time, amount}]           60초 윈도우
  _killBuffer:   [],  // [{time}]                   60초 윈도우

  _stageStartTime: 0,

  // 실시간 지표 (processTick에서 갱신)
  realtime: {
    dps: 0,
    goldPerMin: 0,
    expPerMin: 0,
    killsPerMin: 0,
    effectiveAtk: 0,
    survivability: 0
  },

  // 세션 지표 (페이지 로드 이후)
  session: {
    startTime: 0,
    kills: 0,
    goldEarned: 0,
    expEarned: 0,
    stagesCleared: 0,
    equipmentDropped: 0,
    craftsCompleted: 0,
    skillActivations: 0,
    deaths: 0,
    highestDps: 0,
    fastestStageTime: Infinity
  },

  // 최근 20개 스테이지 클리어 기록
  stageHistory: [],

  init: function() {
    this._damageBuffer = [];
    this._goldBuffer   = [];
    this._expBuffer    = [];
    this._killBuffer   = [];
    this._stageStartTime = Date.now();
    this.realtime = { dps: 0, goldPerMin: 0, expPerMin: 0, killsPerMin: 0, effectiveAtk: 0, survivability: 0 };
    this.session = {
      startTime: Date.now(),
      kills: 0, goldEarned: 0, expEarned: 0, stagesCleared: 0,
      equipmentDropped: 0, craftsCompleted: 0, skillActivations: 0,
      deaths: 0, highestDps: 0, fastestStageTime: Infinity
    };
    this.stageHistory = [];
  },

  recordDamage: function(amount, isCrit) {
    var t = Date.now();
    this._damageBuffer.push({ time: t, amount: amount, isCrit: !!isCrit });
    // lifetime 누적
    if (GameState.stats) {
      GameState.stats.lifetime.totalDamageDealt += amount;
      if (isCrit) GameState.stats.lifetime.totalCrits++;
    }
  },

  recordGold: function(amount) {
    this._goldBuffer.push({ time: Date.now(), amount: amount });
    if (GameState.stats) GameState.stats.lifetime.totalGoldEarned += amount;
    this.session.goldEarned += amount;
  },

  recordExp: function(amount) {
    this._expBuffer.push({ time: Date.now(), amount: amount });
    this.session.expEarned += amount;
  },

  recordKill: function(isBoss) {
    this._killBuffer.push({ time: Date.now() });
    this.session.kills++;
    if (GameState.stats) {
      GameState.stats.lifetime.totalKills++;
    }
  },

  recordStageClear: function(stage, clearTimeMs) {
    this.session.stagesCleared++;
    if (GameState.stats) GameState.stats.lifetime.stagesCleared++;

    // stageHistory 앞에 추가, 20개 초과 시 제거
    this.stageHistory.unshift({ stage: stage, clearTime: clearTimeMs, timestamp: Date.now() });
    if (this.stageHistory.length > 20) this.stageHistory.pop();

    // 최속 스테이지 갱신
    if (clearTimeMs < this.session.fastestStageTime) {
      this.session.fastestStageTime = clearTimeMs;
    }

    // 스테이지 시작 시각 리셋
    this._stageStartTime = Date.now();
  },

  recordSkillUse: function() {
    this.session.skillActivations++;
    if (GameState.stats) GameState.stats.lifetime.totalSkillUses++;
  },

  recordCraft: function() {
    this.session.craftsCompleted++;
    if (GameState.stats) GameState.stats.lifetime.totalCrafts++;
  },

  recordDeath: function() {
    this.session.deaths++;
    if (GameState.stats) GameState.stats.lifetime.totalDeaths++;
  },

  recordEquipDrop: function() {
    this.session.equipmentDropped++;
    if (GameState.stats) GameState.stats.lifetime.totalEquipDrops++;
  },

  processTick: function(delta) {
    var now = Date.now();
    var win5s  = now - 5000;
    var win60s = now - 60000;

    // 만료 버퍼 제거
    this._damageBuffer = this._damageBuffer.filter(function(e) { return e.time > win5s; });
    this._goldBuffer   = this._goldBuffer.filter(function(e) { return e.time > win60s; });
    this._expBuffer    = this._expBuffer.filter(function(e) { return e.time > win60s; });
    this._killBuffer   = this._killBuffer.filter(function(e) { return e.time > win60s; });

    // DPS 재계산 (5초 윈도우)
    var totalDmg = 0;
    for (var i = 0; i < this._damageBuffer.length; i++) totalDmg += this._damageBuffer[i].amount;
    this.realtime.dps = Math.floor(totalDmg / 5);

    // Gold/EXP/Kill per minute (60초 윈도우)
    var totalGold = 0;
    for (var g = 0; g < this._goldBuffer.length; g++) totalGold += this._goldBuffer[g].amount;
    this.realtime.goldPerMin = Math.floor(totalGold);

    var totalExp = 0;
    for (var e = 0; e < this._expBuffer.length; e++) totalExp += this._expBuffer[e].amount;
    this.realtime.expPerMin = Math.floor(totalExp);

    this.realtime.killsPerMin = this._killBuffer.length;

    // 유효 DPS 계산
    this.realtime.effectiveAtk = this.calculateEffectiveDps();

    // 생존지수 계산
    this.realtime.survivability = this.calculateSurvivability();

    // 최고 DPS 갱신
    if (this.realtime.dps > this.session.highestDps) {
      this.session.highestDps = this.realtime.dps;
    }
    if (GameState.stats && this.realtime.dps > GameState.stats.lifetime.peakDps) {
      GameState.stats.lifetime.peakDps = this.realtime.dps;
    }
    // 최고 스테이지 갱신
    if (GameState.stats && GameState.stage.current > GameState.stats.lifetime.highestStage) {
      GameState.stats.lifetime.highestStage = GameState.stage.current;
    }
    // 최고 레벨 갱신
    if (GameState.stats && GameState.hero.level > GameState.stats.lifetime.highestLevel) {
      GameState.stats.lifetime.highestLevel = GameState.hero.level;
    }
  },

  calculateEffectiveDps: function() {
    if (!GameState.hero) return 0;
    var atk = GameState.hero.atk || 0;
    var crit = GameState.hero.critChance || 0;
    var mult = GameState.hero.critMult || 2;
    var spd = GameState.hero.spd || 5;
    var cooldownSec = (typeof spdToCooldown === 'function' ? spdToCooldown(spd) : 1000) / 1000;
    if (cooldownSec <= 0) cooldownSec = 1;
    var avgMult = (1 - crit) + crit * mult;
    return Math.floor(atk * avgMult / cooldownSec);
  },

  calculateSurvivability: function() {
    if (!GameState.hero || !GameState.monster) return 999;
    var monAtk = GameState.monster.atk || 0;
    var def = GameState.hero.def || 0;
    var maxHp = GameState.hero.maxHp || 1;
    var net = monAtk - def;
    if (net <= 0) return 999;
    return Math.floor(maxHp / net);
  },

  getRealtime: function() {
    return this.realtime;
  },

  getSession: function() {
    return this.session;
  },

  getLifetime: function() {
    return GameState.stats ? GameState.stats.lifetime : null;
  },

  getStageHistory: function() {
    return this.stageHistory;
  },

  getAverageStageClearTime: function(last) {
    var hist = this.stageHistory.slice(0, last || this.stageHistory.length);
    if (hist.length === 0) return 0;
    var sum = 0;
    for (var i = 0; i < hist.length; i++) sum += hist[i].clearTime;
    return Math.floor(sum / hist.length);
  }
};
