// ===== 세이브 슬롯 매니저 (3슬롯 CRUD + export/import) =====
var SaveSlotManager = {
  SLOT_COUNT: 3,
  SLOT_KEY_PREFIX: 'idleRPG_v1_slot_',
  ACTIVE_KEY: 'idleRPG_v1_active',

  getActiveSlot: function() {
    var v = parseInt(localStorage.getItem(this.ACTIVE_KEY));
    return (v >= 1 && v <= this.SLOT_COUNT) ? v : 1;
  },

  setActiveSlot: function(n) {
    localStorage.setItem(this.ACTIVE_KEY, String(n));
  },

  _key: function(n) {
    return this.SLOT_KEY_PREFIX + n;
  },

  saveToSlot: function(n, saveData) {
    try {
      var copy = JSON.parse(JSON.stringify(saveData));
      copy._checksum = this.generateChecksum(copy);
      localStorage.setItem(this._key(n), JSON.stringify(copy));
      return true;
    } catch (e) {
      console.warn('슬롯 ' + n + ' 저장 실패:', e);
      return false;
    }
  },

  loadFromSlot: function(n) {
    try {
      var raw = localStorage.getItem(this._key(n));
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!this.validateChecksum(data)) {
        console.warn('슬롯 ' + n + ' 체크섬 불일치 - 데이터가 변조되었을 수 있습니다');
        data._checksumWarning = true;
      }
      return data;
    } catch (e) {
      console.warn('슬롯 ' + n + ' 로드 실패:', e);
      return null;
    }
  },

  deleteSlot: function(n) {
    localStorage.removeItem(this._key(n));
  },

  getSlotMeta: function(n) {
    try {
      var raw = localStorage.getItem(this._key(n));
      if (!raw) return { slot: n, isEmpty: true };
      var data = JSON.parse(raw);
      return {
        slot: n,
        isEmpty: false,
        heroLevel: data.hero ? (data.hero.level || 1) : 1,
        stage: data.stage ? (data.stage.current || 1) : 1,
        prestigeCount: data.prestige ? (data.prestige.count || 0) : 0,
        totalPlayTime: data.meta ? (data.meta.playTime || 0) : 0,
        lastSaveTime: data.meta ? (data.meta.lastSaveTime || 0) : 0,
        checksum: data._checksum || null
      };
    } catch (e) {
      return { slot: n, isEmpty: true };
    }
  },

  getAllSlotsMeta: function() {
    var metas = [];
    for (var i = 1; i <= this.SLOT_COUNT; i++) {
      metas.push(this.getSlotMeta(i));
    }
    return metas;
  },

  copySlot: function(from, to) {
    var raw = localStorage.getItem(this._key(from));
    if (!raw) return false;
    localStorage.setItem(this._key(to), raw);
    return true;
  },

  generateChecksum: function(data) {
    var level = data.hero ? (data.hero.level || 0) : 0;
    var stage = data.stage ? (data.stage.current || 0) : 0;
    var gold = data.hero ? (data.hero.gold || 0) : 0;
    var prestige = data.prestige ? (data.prestige.count || 0) : 0;
    return [level, stage, gold, prestige].join('|');
  },

  validateChecksum: function(data) {
    if (!data._checksum) return true; // 구버전 세이브는 통과
    var copy = JSON.parse(JSON.stringify(data));
    delete copy._checksum;
    var expected = this.generateChecksum(copy);
    return data._checksum === expected;
  },

  exportSlot: function(n) {
    var raw = localStorage.getItem(this._key(n));
    if (!raw) return null;
    try {
      return btoa(encodeURIComponent(raw));
    } catch (e) {
      console.warn('export 실패:', e);
      return null;
    }
  },

  importSlot: function(base64Str, n) {
    try {
      var jsonStr = decodeURIComponent(atob(base64Str.trim()));
      var data = JSON.parse(jsonStr);
      if (!data || typeof data.version !== 'number') {
        return '유효하지 않은 세이브 데이터입니다.';
      }
      if (!data.hero || typeof data.hero.level !== 'number') {
        return '영웅 데이터가 없거나 잘못되었습니다.';
      }
      localStorage.setItem(this._key(n), JSON.stringify(data));
      return null; // null = 성공
    } catch (e) {
      return '가져오기 실패: ' + e.message;
    }
  }
};
