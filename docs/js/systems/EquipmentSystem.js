// ===== 장비 시스템 =====

// GameState에 equipment 필드 추가 (state.js 이후 로드됨)
GameState.equipment = {
  equipped:  { weapon: null, armor: null, ring: null },
  inventory: []  // 최대 20칸
};

var EquipmentSystem = {

  GRADE_COLORS: {
    common: '#ffffff',
    rare:   '#4ecdc4',
    hero:   '#9b59b6',
    legend: '#ffd700'
  },

  GRADE_DROP_WEIGHTS: [40, 30, 20, 10], // common, rare, hero, legend
  GRADE_STAT_MULT: { common: 1.0, rare: 1.8, hero: 3.0, legend: 5.0 },
  GRADES: ['common', 'rare', 'hero', 'legend'],

  NAMES: {
    weapon: {
      common: ['낡은 검', '돌도끼', '나무 창', '구리 단검'],
      rare:   ['강철 검', '은도끼', '철창', '청동 대검'],
      hero:   ['마법 검', '룬 도끼', '성스러운 창', '드래곤 검'],
      legend: ['전설의 검', '신화의 대검', '신성 창', '혼돈의 검']
    },
    armor: {
      common: ['낡은 갑옷', '가죽 갑옷', '천 로브', '낡은 방패'],
      rare:   ['강철 갑옷', '사슬 갑옷', '마법 로브', '강화 방패'],
      hero:   ['미스릴 갑옷', '드래곤 가죽', '마법사 로브', '영웅의 방패'],
      legend: ['전설의 갑옷', '신화의 판금', '고대 로브', '신성한 방패']
    },
    ring: {
      common: ['청동 반지', '철 반지', '돌 반지', '구리 반지'],
      rare:   ['은 반지', '금 반지', '루비 반지', '사파이어 반지'],
      hero:   ['마법 반지', '룬 반지', '드래곤 반지', '영웅의 반지'],
      legend: ['전설의 반지', '신화의 반지', '신성한 반지', '고대의 반지']
    }
  },

  // 몬스터 처치 시 호출 - 드롭 여부 결정 (dropRateBonus: 펫 dropRate)
  tryDrop: function(stage, dropRateBonus) {
    var base = GameState.stage.isBoss ? 0.4 : 0.15;
    var dropChance = base * (1 + (dropRateBonus || 0));
    if (typeof ShopSystem !== 'undefined') {
      dropChance *= (ShopSystem.isBuffActive('dropBooster') ? 2 : 1);
    }
    if (Math.random() >= dropChance) return null;
    return this.generateEquipment(stage);
  },

  // 스테이지 기반 장비 생성
  generateEquipment: function(stage) {
    var grade = this._rollGrade();
    var slot  = this._rollSlot();
    var mult  = this.GRADE_STAT_MULT[grade];
    var stageScale = 1 + stage * 0.3;

    var stats = { atk: 0, def: 0, hp: 0, critChance: 0, goldBonus: 0 };

    if (slot === 'weapon') {
      stats.atk = Math.floor((3 + Math.random() * 5) * stageScale * mult);
      if (Math.random() < 0.5) {
        stats.critChance = Math.round((0.01 + Math.random() * 0.02) * mult * 100) / 100;
      }
    } else if (slot === 'armor') {
      stats.def = Math.floor((2 + Math.random() * 4) * stageScale * mult);
      stats.hp  = Math.floor((15 + Math.random() * 25) * stageScale * mult);
      if (Math.random() < 0.3) {
        stats.goldBonus = Math.round((0.05 + Math.random() * 0.05) * mult * 100) / 100;
      }
    } else { // ring
      if (Math.random() < 0.5) {
        stats.critChance = Math.round((0.01 + Math.random() * 0.03) * mult * 100) / 100;
      }
      if (Math.random() < 0.5) {
        stats.goldBonus = Math.round((0.05 + Math.random() * 0.1) * mult * 100) / 100;
      }
      stats.atk = Math.floor((1 + Math.random() * 2) * stageScale * mult);
      stats.hp  = Math.floor((5 + Math.random() * 10) * stageScale * mult);
    }

    var namePool = this.NAMES[slot][grade];
    var name = namePool[Math.floor(Math.random() * namePool.length)];

    return {
      id:    'eq_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
      slot:  slot,
      grade: grade,
      name:  name,
      stats: stats,
      level: 0
    };
  },

  _rollGrade: function() {
    var r = Math.random() * 100;
    var cum = 0;
    for (var i = 0; i < this.GRADES.length; i++) {
      cum += this.GRADE_DROP_WEIGHTS[i];
      if (r < cum) return this.GRADES[i];
    }
    return 'common';
  },

  _rollSlot: function() {
    var slots = ['weapon', 'armor', 'ring'];
    return slots[Math.floor(Math.random() * slots.length)];
  },

  // 장착 - 기존 장비는 인벤토리로
  equip: function(item) {
    var existing = GameState.equipment.equipped[item.slot];
    if (existing) {
      this._addToInventory(existing);
    }
    GameState.equipment.equipped[item.slot] = item;
    // 인벤토리에서 제거
    GameState.equipment.inventory = GameState.equipment.inventory.filter(function(i) {
      return i.id !== item.id;
    });
  },

  // 장착 해제
  unequip: function(slot) {
    var item = GameState.equipment.equipped[slot];
    if (!item) return;
    if (this._addToInventory(item)) {
      GameState.equipment.equipped[slot] = null;
    }
  },

  // 강화 (+1, 최대 +10, 실패 없음)
  enhance: function(itemId) {
    var item = this._findInInventory(itemId);
    if (!item) return false;
    if (item.level >= 10) return false;

    var cost = this.getEnhanceCost(item);
    if (GameState.hero.gold < cost) return false;

    GameState.hero.gold -= cost;
    item.level++;

    // 스탯 증가: 기본 스탯의 10%씩
    var base = item.stats;
    if (base.atk)       item.stats.atk       = Math.floor(item.stats.atk       * 1.1);
    if (base.def)       item.stats.def       = Math.floor(item.stats.def       * 1.1);
    if (base.hp)        item.stats.hp        = Math.floor(item.stats.hp        * 1.1);
    if (base.critChance) item.stats.critChance = Math.round(item.stats.critChance * 1.1 * 1000) / 1000;
    if (base.goldBonus)  item.stats.goldBonus  = Math.round(item.stats.goldBonus  * 1.1 * 1000) / 1000;

    return true;
  },

  // 판매
  sell: function(itemId) {
    var item = this._findInInventory(itemId);
    if (!item) return false;
    GameState.hero.gold += this.getSellPrice(item);
    GameState.equipment.inventory = GameState.equipment.inventory.filter(function(i) {
      return i.id !== itemId;
    });
    return true;
  },

  // 장착 장비 스탯 합산
  getEquippedStats: function() {
    var total = { atk: 0, def: 0, hp: 0, critChance: 0, goldBonus: 0 };
    var equipped = GameState.equipment.equipped;
    ['weapon', 'armor', 'ring'].forEach(function(slot) {
      var item = equipped[slot];
      if (!item) return;
      total.atk       += item.stats.atk       || 0;
      total.def       += item.stats.def       || 0;
      total.hp        += item.stats.hp        || 0;
      total.critChance += item.stats.critChance || 0;
      total.goldBonus  += item.stats.goldBonus  || 0;
    });
    return total;
  },

  getEnhanceCost: function(item) {
    return Math.floor(80 * Math.pow(2, item.level));
  },

  getSellPrice: function(item) {
    var gradeMult = { common: 1, rare: 3, hero: 8, legend: 20 };
    var base = (item.stats.atk || 0) + (item.stats.def || 0) + (item.stats.hp || 0) / 5;
    return Math.floor((base * 10 + item.level * 30) * (gradeMult[item.grade] || 1));
  },

  _addToInventory: function(item) {
    if (GameState.equipment.inventory.length >= 20) {
      return false; // 인벤토리 가득 찼음
    }
    GameState.equipment.inventory.push(item);
    return true;
  },

  _findInInventory: function(itemId) {
    return GameState.equipment.inventory.find(function(i) { return i.id === itemId; }) || null;
  }
};
