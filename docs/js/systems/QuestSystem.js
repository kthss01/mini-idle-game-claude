// ===== 퀘스트 시스템 =====

// GameState에 quests 필드 추가 (state.js 이후 로드됨)
GameState.quests = {
  active: [],
  daily: [],
  lastDailyReset: 0,
  totalCompleted: 0
};

var QuestSystem = {

  QUEST_POOL: [
    { type: 'kill',     targets: [30, 80, 150, 300],         reward: 'gold', rewardMults: [1.5, 3, 5, 10] },
    { type: 'killBoss', targets: [1, 3, 5, 10],              reward: 'gold', rewardMults: [3, 6, 10, 20] },
    { type: 'stage',    targets: [3, 5, 10, 15],             reward: 'gold', rewardMults: [2, 4, 8, 15] },
    { type: 'gold',     targets: [500, 2000, 8000, 30000],   reward: 'exp',  rewardMults: [2, 4, 8, 15] },
    { type: 'upgrade',  targets: [3, 5, 8, 12],              reward: 'gold', rewardMults: [2, 5, 10, 20] },
    { type: 'crit',     targets: [10, 30, 60, 100],          reward: 'gold', rewardMults: [1.5, 3, 6, 12] }
  ],

  DAILY_DEFS: [
    { id: 'daily_kill',    name: '일일 사냥',  type: 'kill',       target: 200, reward: { gold: 5000, soulStone: 1 } },
    { id: 'daily_stage',   name: '일일 탐험',  type: 'stageReach', target: 5,   reward: { gold: 3000, soulStone: 1 } },
    { id: 'daily_upgrade', name: '일일 강화',  type: 'upgrade',    target: 5,   reward: { gold: 4000, soulStone: 1 } }
  ],

  init: function() {
    if (!GameState.quests.active || GameState.quests.active.length < 3) {
      GameState.quests.active = [];
      for (var i = 0; i < 3; i++) {
        GameState.quests.active.push(this.generateQuest());
      }
    }
    if (!GameState.quests.daily || GameState.quests.daily.length === 0) {
      this._resetDailyQuests();
    }
  },

  generateQuest: function() {
    var pool = this.QUEST_POOL;
    var def = pool[Math.floor(Math.random() * pool.length)];
    var stage = GameState.stage.current;
    var tier = Math.min(3, Math.floor(stage / 10));
    var target = def.targets[tier];
    var rewardMult = def.rewardMults[tier];

    var rewardValue;
    if (def.reward === 'gold') {
      var baseGold = CONFIG.MONSTER_BASE_GOLD * Math.pow(CONFIG.MONSTER_GOLD_MULT, stage - 1);
      rewardValue = Math.floor(stage * baseGold * rewardMult);
    } else {
      var expReq = UpgradeSystem.getExpRequired(GameState.hero.level);
      rewardValue = Math.floor(expReq * rewardMult);
    }

    return {
      id: 'q_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
      type: def.type,
      target: target,
      current: 0,
      reward: def.reward,
      rewardValue: rewardValue,
      completed: false
    };
  },

  updateProgress: function(type, amount) {
    var i;
    // 일반 퀘스트
    for (i = 0; i < GameState.quests.active.length; i++) {
      var q = GameState.quests.active[i];
      if (q.completed) continue;
      if (q.type === type) {
        q.current = Math.min(q.current + amount, q.target);
        if (q.current >= q.target) {
          this.complete(q.id);
        }
      }
    }
    // 일일 퀘스트
    for (var j = 0; j < GameState.quests.daily.length; j++) {
      var dq = GameState.quests.daily[j];
      if (dq.claimed) continue;
      if (dq.type === type) {
        dq.current = Math.min(dq.current + amount, dq.target);
        if (dq.current >= dq.target) {
          dq.completed = true;
        }
      }
    }
  },

  complete: function(questId) {
    for (var i = 0; i < GameState.quests.active.length; i++) {
      var q = GameState.quests.active[i];
      if (q.id !== questId || q.completed) continue;
      q.completed = true;

      // 보상 지급
      if (q.reward === 'gold') {
        GameState.hero.gold += q.rewardValue;
        GameState.meta.totalGold += q.rewardValue;
      } else {
        UpgradeSystem.addExp(q.rewardValue);
      }
      GameState.quests.totalCompleted++;

      // UI 알림
      if (typeof UISceneInstance !== 'undefined' && UISceneInstance && UISceneInstance.showQuestComplete) {
        UISceneInstance.showQuestComplete(q);
      }

      // 새 퀘스트로 교체 (딜레이)
      var self = this;
      var idx = i;
      setTimeout(function() {
        if (GameState.quests.active[idx]) {
          GameState.quests.active[idx] = self.generateQuest();
        }
      }, 1500);
      return;
    }
  },

  checkDailyReset: function() {
    var nowDate = new Date().toLocaleDateString('ko-KR');
    var lastDate = GameState.quests.lastDailyReset > 0
      ? new Date(GameState.quests.lastDailyReset).toLocaleDateString('ko-KR')
      : '';
    if (nowDate !== lastDate) {
      this._resetDailyQuests();
    }
    this.init();
  },

  _resetDailyQuests: function() {
    var defs = this.DAILY_DEFS;
    GameState.quests.daily = [];
    for (var i = 0; i < defs.length; i++) {
      GameState.quests.daily.push({
        id: defs[i].id,
        name: defs[i].name,
        type: defs[i].type,
        target: defs[i].target,
        current: 0,
        completed: false,
        claimed: false,
        reward: defs[i].reward
      });
    }
    GameState.quests.lastDailyReset = Date.now();
  },

  claimDaily: function(questId) {
    for (var i = 0; i < GameState.quests.daily.length; i++) {
      var dq = GameState.quests.daily[i];
      if (dq.id !== questId) continue;
      if (!dq.completed || dq.claimed) return false;
      dq.claimed = true;

      var def = this._getDailyDef(questId);
      if (def && def.reward) {
        if (def.reward.gold) {
          GameState.hero.gold += def.reward.gold;
          GameState.meta.totalGold += def.reward.gold;
        }
        if (def.reward.soulStone && GameState.prestige) {
          GameState.prestige.soulStones += def.reward.soulStone;
          GameState.prestige.totalSoulStones += def.reward.soulStone;
        }
      }
      GameState.quests.totalCompleted++;
      return true;
    }
    return false;
  },

  _getDailyDef: function(questId) {
    for (var i = 0; i < this.DAILY_DEFS.length; i++) {
      if (this.DAILY_DEFS[i].id === questId) return this.DAILY_DEFS[i];
    }
    return null;
  },

  getTimeUntilReset: function() {
    var now = new Date();
    var tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    var diff = tomorrow - now;
    var h = Math.floor(diff / 3600000);
    var m = Math.floor((diff % 3600000) / 60000);
    var s = Math.floor((diff % 60000) / 1000);
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }
};
