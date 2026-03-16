// ===== 상점 시스템 (소모품 + 부스터) =====

// GameState에 shop 필드 추가 (state.js 이후 로드됨)
GameState.shop = {
  inventory: { hpPotion: 0, goldBooster: 0, expBooster: 0, revive: 0, dropBooster: 0, fullHpPotion: 0, atkBooster: 0, critBooster: 0 },
  activeBuffs: { goldBooster: 0, expBooster: 0, dropBooster: 0, atkBooster: 0, critBooster: 0 }
};

var ShopSystem = {

  CONSUMABLES: [
    { id: 'hpPotion',     name: 'HP 포션',       icon: '🧪', maxStack: 20, desc: 'HP 50% 회복' },
    { id: 'fullHpPotion', name: '완전 회복 포션', icon: '💉', maxStack: 5,  desc: 'HP 100% 회복' },
    { id: 'goldBooster',  name: '황금 부스터',   icon: '💰', maxStack: 5,  desc: '10분 골드 2배',       isBuff: true },
    { id: 'expBooster',   name: 'EXP 부스터',    icon: '✨', maxStack: 5,  desc: '10분 EXP 2배',        isBuff: true },
    { id: 'dropBooster',  name: '드롭 부스터',   icon: '🎁', maxStack: 5,  desc: '10분 드롭률 2배',     isBuff: true },
    { id: 'atkBooster',   name: '전투 부스터',   icon: '⚔️', maxStack: 5,  desc: '10분 ATK 1.5배',      isBuff: true },
    { id: 'critBooster',  name: '집중 부스터',   icon: '🎯', maxStack: 5,  desc: '10분 크리티컬 1.5배', isBuff: true },
    { id: 'revive',       name: '부활석',        icon: '💎', maxStack: 3,  desc: '사망 시 자동 부활' }
  ],

  PRICE_MULT: { hpPotion: 5, fullHpPotion: 10, goldBooster: 30, expBooster: 30, dropBooster: 30, atkBooster: 40, critBooster: 35, revive: 50 },

  getPrice: function(id) {
    return Math.floor(GameState.stage.current * (this.PRICE_MULT[id] || 10));
  },

  buyConsumable: function(id) {
    var def = this._getDef(id);
    if (!def) return false;
    var price = this.getPrice(id);
    if (GameState.hero.gold < price) return false;
    var current = GameState.shop.inventory[id] || 0;
    if (current >= def.maxStack) return false;
    GameState.hero.gold -= price;
    GameState.shop.inventory[id] = current + 1;
    return true;
  },

  useConsumable: function(id) {
    var inv = GameState.shop.inventory;
    if (!inv[id] || inv[id] <= 0) return false;
    if (id === 'hpPotion') {
      GameState.hero.hp = Math.min(
        GameState.hero.maxHp,
        GameState.hero.hp + Math.floor(GameState.hero.maxHp * 0.5)
      );
    } else if (id === 'fullHpPotion') {
      GameState.hero.hp = GameState.hero.maxHp;
    } else if (id === 'goldBooster' || id === 'expBooster' || id === 'dropBooster' || id === 'atkBooster' || id === 'critBooster') {
      GameState.shop.activeBuffs[id] = Date.now() + 600000;
    } else {
      return false; // revive는 직접 사용 불가 (자동 소모)
    }
    inv[id]--;
    return true;
  },

  // 버프가 활성이면 남은 초 반환, 아니면 0
  isBuffActive: function(id) {
    if (!GameState.shop || !GameState.shop.activeBuffs) return 0;
    var expiry = GameState.shop.activeBuffs[id] || 0;
    var remaining = expiry - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
  },

  processTick: function(delta) {
    // timestamp 기반이므로 별도 처리 없음
  },

  _getDef: function(id) {
    for (var i = 0; i < this.CONSUMABLES.length; i++) {
      if (this.CONSUMABLES[i].id === id) return this.CONSUMABLES[i];
    }
    return null;
  }
};
