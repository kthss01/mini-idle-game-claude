// ===== 아이템 시스템 =====

var ItemSystem = {

  _nextId: 1,

  RARITIES: {
    common:    { name: '일반',   color: '#aaaaaa', border: '#555555', mult: 1.0 },
    rare:      { name: '희귀',   color: '#4499ff', border: '#2266dd', mult: 1.5 },
    epic:      { name: '영웅',   color: '#bb44ff', border: '#8822cc', mult: 2.2 },
    legendary: { name: '전설',   color: '#ffaa00', border: '#cc7700', mult: 3.5 }
  },

  NAMES: {
    weapon:    ['검', '도끼', '활', '단검', '창', '망치'],
    armor:     ['갑옷', '방패', '망토', '투구', '흉갑', '각반'],
    accessory: ['반지', '목걸이', '팔찌', '부적', '귀걸이', '메달']
  },

  ICONS: {
    weapon: '⚔️',
    armor:  '🛡️',
    accessory: '💎'
  },

  generateItem: function(stage) {
    // 희귀도 결정
    var roll = Math.random();
    var rarity;
    if (roll < 0.03)       rarity = 'legendary';
    else if (roll < 0.12)  rarity = 'epic';
    else if (roll < 0.35)  rarity = 'rare';
    else                   rarity = 'common';

    // 타입 결정
    var types = ['weapon', 'armor', 'accessory'];
    var type = types[Math.floor(Math.random() * 3)];

    // 스탯 계산
    var stageFactor = 1 + (stage - 1) * 0.09;
    var rarityMult = this.RARITIES[rarity].mult;
    var base = Math.floor(3 * stageFactor * rarityMult);

    var stats = {};
    if (type === 'weapon') {
      stats.atk = base * 2 + Math.floor(Math.random() * base);
      if (rarity === 'epic' || rarity === 'legendary') {
        stats.critChance = parseFloat((0.01 + Math.random() * 0.02 * rarityMult).toFixed(3));
      }
    } else if (type === 'armor') {
      stats.def = base + Math.floor(Math.random() * Math.max(1, base * 0.5));
      stats.hp  = base * 8 + Math.floor(Math.random() * base * 4);
    } else { // accessory
      stats.critChance = parseFloat((0.01 * rarityMult + Math.random() * 0.01).toFixed(3));
      stats.spd = Math.max(1, Math.floor(0.5 * rarityMult + Math.random()));
    }

    // 이름 결정
    var nameList = this.NAMES[type];
    var name = nameList[Math.floor(Math.random() * nameList.length)];

    return {
      id: this._nextId++,
      type: type,
      rarity: rarity,
      name: this.RARITIES[rarity].name + ' ' + name,
      icon: this.ICONS[type],
      stats: stats,
      stage: stage
    };
  },

  tryDrop: function(isBoss, stage) {
    var dropChance = isBoss ? 0.60 : 0.15;
    if (Math.random() >= dropChance) return null;
    return this.generateItem(stage);
  },

  addToInventory: function(item) {
    if (!GameState.items) return;
    var inv = GameState.items.inventory;
    if (inv.length >= 6) inv.shift(); // 가장 오래된 것 삭제
    inv.push(item);
  },

  equipItem: function(item) {
    if (!GameState.items) return;
    var slot = item.type;
    var existing = GameState.items.equipped[slot];
    // 기존 장비는 인벤토리로
    if (existing) {
      this.addToInventory(existing);
    }
    GameState.items.equipped[slot] = item;
    // 인벤토리에서 제거
    var inv = GameState.items.inventory;
    var idx = inv.indexOf(item);
    if (idx !== -1) inv.splice(idx, 1);
    // 스탯 재계산
    if (typeof UpgradeSystem !== 'undefined') UpgradeSystem.recalculateStats();
  },

  unequipItem: function(slot) {
    if (!GameState.items) return;
    var item = GameState.items.equipped[slot];
    if (!item) return;
    GameState.items.equipped[slot] = null;
    this.addToInventory(item);
    if (typeof UpgradeSystem !== 'undefined') UpgradeSystem.recalculateStats();
  },

  getStatBonuses: function() {
    var bonus = { atk: 0, def: 0, hp: 0, spd: 0, critChance: 0 };
    if (!GameState.items) return bonus;
    var slots = ['weapon', 'armor', 'accessory'];
    for (var i = 0; i < slots.length; i++) {
      var item = GameState.items.equipped[slots[i]];
      if (!item || !item.stats) continue;
      if (item.stats.atk)        bonus.atk        += item.stats.atk;
      if (item.stats.def)        bonus.def        += item.stats.def;
      if (item.stats.hp)         bonus.hp         += item.stats.hp;
      if (item.stats.spd)        bonus.spd        += item.stats.spd;
      if (item.stats.critChance) bonus.critChance += item.stats.critChance;
    }
    return bonus;
  },

  getRarityColor:  function(rarity) { return (this.RARITIES[rarity] || this.RARITIES.common).color;  },
  getRarityBorder: function(rarity) { return (this.RARITIES[rarity] || this.RARITIES.common).border; },
  getRarityName:   function(rarity) { return (this.RARITIES[rarity] || this.RARITIES.common).name;   },

  formatStats: function(stats) {
    if (!stats) return '';
    var parts = [];
    if (stats.atk)        parts.push('ATK +' + stats.atk);
    if (stats.def)        parts.push('DEF +' + stats.def);
    if (stats.hp)         parts.push('HP +'  + stats.hp);
    if (stats.spd)        parts.push('SPD +' + stats.spd);
    if (stats.critChance) parts.push('CRIT +' + Math.round(stats.critChance * 100) + '%');
    return parts.join(' / ');
  }
};
