// ===== 제작 시스템 =====

// GameState에 crafting 필드 추가 (state.js 이후 로드됨)
GameState.crafting = {
  materials: { ironOre: 0, magicCrystal: 0, dragonScale: 0, voidEssence: 0, ancientShard: 0 },
  enhanceMaterials: { enhanceStone: 0, legendStone: 0 }
};

var CraftingSystem = {

  MATERIALS: [
    { id: 'ironOre',      name: '철광석',      icon: '⚙', color: '#95a5a6', dropStage: 1,  dropChance: 0.12, bossChance: 0.25 },
    { id: 'magicCrystal', name: '마법 수정',   icon: '💠', color: '#3498db', dropStage: 5,  dropChance: 0.08, bossChance: 0.18 },
    { id: 'dragonScale',  name: '용의 비늘',   icon: '🐲', color: '#e74c3c', dropStage: 10, dropChance: 0.05, bossChance: 0.14 },
    { id: 'voidEssence',  name: '공허의 정수', icon: '🌑', color: '#9b59b6', dropStage: 15, dropChance: 0.04, bossChance: 0.10 },
    { id: 'ancientShard', name: '고대의 파편', icon: '⭐', color: '#ffd700', dropStage: 20, dropChance: 0.03, bossChance: 0.08 }
  ],

  RECIPES: [
    { id: 'craftWeapon',       cat: 'equipment', name: '무기 제작',      icon: '⚔', cost: { ironOre: 5, magicCrystal: 2 },                      result: { type: 'equipment', slot: 'weapon' } },
    { id: 'craftArmor',        cat: 'equipment', name: '방어구 제작',    icon: '🛡', cost: { ironOre: 5, dragonScale: 2 },                       result: { type: 'equipment', slot: 'armor' } },
    { id: 'craftRing',         cat: 'equipment', name: '반지 제작',      icon: '💍', cost: { magicCrystal: 3, voidEssence: 2 },                  result: { type: 'equipment', slot: 'ring' } },
    { id: 'craftHeroEquip',    cat: 'equipment', name: '영웅 장비 보장', icon: '🌟', cost: { dragonScale: 3, voidEssence: 3, ancientShard: 2 },   result: { type: 'equipment', slot: null, minGrade: 'hero' } },
    { id: 'craftEnhanceStone', cat: 'material',  name: '강화석',         icon: '🔧', cost: { ironOre: 3, magicCrystal: 2 },                      result: { type: 'enhanceStone', amount: 1 } },
    { id: 'craftEnhanceStone3',cat: 'material',  name: '강화석 x3',      icon: '🔧', cost: { ironOre: 8, magicCrystal: 5 },                      result: { type: 'enhanceStone', amount: 3 } },
    { id: 'craftLegendStone',  cat: 'material',  name: '전설 변환석',    icon: '✨', cost: { dragonScale: 5, voidEssence: 3, ancientShard: 1 },   result: { type: 'legendStone', amount: 1 } },
    { id: 'craftExpBook',      cat: 'special',   name: '경험의 서',      icon: '📖', cost: { magicCrystal: 5, voidEssence: 2 },                          result: { type: 'expBook' } },
    { id: 'craftGoldScroll',   cat: 'special',   name: '황금 주문서',    icon: '📜', cost: { ancientShard: 2, dragonScale: 3 },                          result: { type: 'goldScroll' } },
    { id: 'craftExpBook2',     cat: 'special',   name: '대형 경험의 서', icon: '📚', cost: { magicCrystal: 8, voidEssence: 4, ancientShard: 2 },           result: { type: 'expBook2' } },
    { id: 'craftPetFoodS',     cat: 'special',   name: '펫 먹이(소) ×3', icon: '🌿', cost: { ironOre: 3, magicCrystal: 1 },                               result: { type: 'petFood', foodId: 'petFood_s', amount: 3 } },
    { id: 'craftPetFoodM',     cat: 'special',   name: '펫 먹이(중) ×2', icon: '🍖', cost: { dragonScale: 2, magicCrystal: 2 },                            result: { type: 'petFood', foodId: 'petFood_m', amount: 2 } },
    { id: 'craftHpPotion',     cat: 'special',   name: 'HP 포션 ×2',     icon: '🧪', cost: { ironOre: 4, magicCrystal: 2 },                               result: { type: 'shopItem', itemId: 'hpPotion', amount: 2 } },
    { id: 'craftRevive',       cat: 'special',   name: '부활석',         icon: '💎', cost: { dragonScale: 3, ancientShard: 1 },                            result: { type: 'shopItem', itemId: 'revive', amount: 1 } },
    { id: 'craftSoulStone',    cat: 'special',   name: '영혼석',         icon: '🔮', cost: { ancientShard: 3, voidEssence: 2 },                            result: { type: 'soulStone', amount: 1 } }
  ],

  canCraft: function(recipeId) {
    var recipe = this._getRecipe(recipeId);
    if (!recipe) return false;
    var mats = GameState.crafting.materials;
    var eMats = GameState.crafting.enhanceMaterials;
    for (var matId in recipe.cost) {
      var have = mats[matId] !== undefined ? mats[matId] : (eMats[matId] || 0);
      if (have < recipe.cost[matId]) return false;
    }
    return true;
  },

  craft: function(recipeId) {
    if (!this.canCraft(recipeId)) return null;
    var recipe = this._getRecipe(recipeId);
    // StatsTracker 제작 기록 (성공 시점에 기록 - 재료 차감 전)
    if (typeof StatsTracker !== 'undefined') {
      StatsTracker.recordCraft();
    }

    // 재료 차감
    for (var matId in recipe.cost) {
      if (GameState.crafting.materials[matId] !== undefined) {
        GameState.crafting.materials[matId] -= recipe.cost[matId];
      } else {
        GameState.crafting.enhanceMaterials[matId] -= recipe.cost[matId];
      }
    }

    // 결과물 지급
    var res = recipe.result;
    var craftResult = null;
    if (res.type === 'equipment') {
      var item = this._craftEquipment(res);
      if (item && typeof EquipmentSystem !== 'undefined') {
        if (EquipmentSystem._addToInventory(item)) craftResult = { type: 'equipment', item: item };
      }
    } else if (res.type === 'enhanceStone') {
      GameState.crafting.enhanceMaterials.enhanceStone += res.amount;
      craftResult = { type: 'enhanceStone', amount: res.amount };
    } else if (res.type === 'legendStone') {
      GameState.crafting.enhanceMaterials.legendStone += res.amount;
      craftResult = { type: 'legendStone', amount: res.amount };
    } else if (res.type === 'expBook') {
      var expAmt = 1000 * GameState.stage.current;
      if (typeof UpgradeSystem !== 'undefined') UpgradeSystem.addExp(expAmt);
      craftResult = { type: 'expBook', amount: expAmt };
    } else if (res.type === 'expBook2') {
      var expAmt2 = 3000 * GameState.stage.current;
      if (typeof UpgradeSystem !== 'undefined') UpgradeSystem.addExp(expAmt2);
      craftResult = { type: 'expBook2', amount: expAmt2 };
    } else if (res.type === 'goldScroll') {
      var goldGain = Math.floor(GameState.hero.gold * 0.5);
      GameState.hero.gold += goldGain;
      craftResult = { type: 'goldScroll', amount: goldGain };
    } else if (res.type === 'petFood') {
      if (GameState.pets && GameState.pets.food) {
        GameState.pets.food[res.foodId] = (GameState.pets.food[res.foodId] || 0) + res.amount;
      }
      craftResult = { type: 'petFood', foodId: res.foodId, amount: res.amount };
    } else if (res.type === 'shopItem') {
      if (GameState.shop && GameState.shop.inventory) {
        GameState.shop.inventory[res.itemId] = (GameState.shop.inventory[res.itemId] || 0) + res.amount;
      }
      craftResult = { type: 'shopItem', itemId: res.itemId, amount: res.amount };
    } else if (res.type === 'soulStone') {
      if (GameState.prestige) {
        GameState.prestige.soulStones += res.amount;
        GameState.prestige.totalSoulStones += res.amount;
      }
      craftResult = { type: 'soulStone', amount: res.amount };
    }

    // 제작 완료 퀘스트 진행도 업데이트
    if (craftResult && typeof QuestSystem !== 'undefined') {
      QuestSystem.updateProgress('craft', 1);
    }
    return craftResult;
  },

  // 강화석으로 골드 없이 장비 강화
  enhanceWithStone: function(itemId) {
    if (!GameState.crafting.enhanceMaterials.enhanceStone) return false;
    if (GameState.crafting.enhanceMaterials.enhanceStone <= 0) return false;
    if (!GameState.equipment) return false;
    var item = null;
    for (var i = 0; i < GameState.equipment.inventory.length; i++) {
      if (GameState.equipment.inventory[i].id === itemId) { item = GameState.equipment.inventory[i]; break; }
    }
    if (!item || item.level >= 10) return false;
    GameState.crafting.enhanceMaterials.enhanceStone--;
    item.level++;
    if (item.stats.atk)        item.stats.atk        = Math.floor(item.stats.atk * 1.1);
    if (item.stats.def)        item.stats.def        = Math.floor(item.stats.def * 1.1);
    if (item.stats.hp)         item.stats.hp         = Math.floor(item.stats.hp  * 1.1);
    if (item.stats.critChance) item.stats.critChance = Math.round(item.stats.critChance * 1.1 * 1000) / 1000;
    if (item.stats.goldBonus)  item.stats.goldBonus  = Math.round(item.stats.goldBonus  * 1.1 * 1000) / 1000;
    return true;
  },

  // 전설 변환석: 장비를 legend 등급으로 변환
  applyLegendStone: function(itemId) {
    if (!GameState.crafting.enhanceMaterials.legendStone) return false;
    if (GameState.crafting.enhanceMaterials.legendStone <= 0) return false;
    if (!GameState.equipment) return false;
    var item = null;
    for (var i = 0; i < GameState.equipment.inventory.length; i++) {
      if (GameState.equipment.inventory[i].id === itemId) { item = GameState.equipment.inventory[i]; break; }
    }
    if (!item || item.grade === 'legend') return false;
    var oldMult = typeof EquipmentSystem !== 'undefined' ? (EquipmentSystem.GRADE_STAT_MULT[item.grade] || 1) : 1;
    var newMult = typeof EquipmentSystem !== 'undefined' ? (EquipmentSystem.GRADE_STAT_MULT['legend'] || 5) : 5;
    var ratio = newMult / oldMult;
    GameState.crafting.enhanceMaterials.legendStone--;
    item.grade = 'legend';
    if (typeof EquipmentSystem !== 'undefined') {
      var namePool = EquipmentSystem.NAMES[item.slot]['legend'];
      item.name = namePool[Math.floor(Math.random() * namePool.length)];
    }
    if (item.stats.atk)        item.stats.atk        = Math.floor(item.stats.atk * ratio);
    if (item.stats.def)        item.stats.def        = Math.floor(item.stats.def * ratio);
    if (item.stats.hp)         item.stats.hp         = Math.floor(item.stats.hp  * ratio);
    if (item.stats.critChance) item.stats.critChance = Math.round(item.stats.critChance * ratio * 1000) / 1000;
    if (item.stats.goldBonus)  item.stats.goldBonus  = Math.round(item.stats.goldBonus  * ratio * 1000) / 1000;
    return true;
  },

  tryDropMaterial: function(stage, isBoss) {
    // 고급 재료부터 역순 체크 (고급 드롭 우선 판정)
    for (var i = this.MATERIALS.length - 1; i >= 0; i--) {
      var mat = this.MATERIALS[i];
      if (stage < mat.dropStage) continue;
      var chance = isBoss ? mat.bossChance : mat.dropChance;
      if (Math.random() < chance) return mat.id;
    }
    return null;
  },

  getMaterialDef: function(id) {
    for (var i = 0; i < this.MATERIALS.length; i++) {
      if (this.MATERIALS[i].id === id) return this.MATERIALS[i];
    }
    return null;
  },

  _craftEquipment: function(res) {
    if (typeof EquipmentSystem === 'undefined') return null;
    var stage = GameState.stage.current;
    var item = EquipmentSystem.generateEquipment(stage);
    if (res.slot) item.slot = res.slot;
    if (res.minGrade) {
      var grades = ['common', 'rare', 'hero', 'legend'];
      if (grades.indexOf(item.grade) < grades.indexOf(res.minGrade)) {
        item.grade = res.minGrade;
      }
      var namePool = EquipmentSystem.NAMES[item.slot][item.grade];
      item.name = namePool[Math.floor(Math.random() * namePool.length)];
    }
    return item;
  },

  _getRecipe: function(id) {
    for (var i = 0; i < this.RECIPES.length; i++) {
      if (this.RECIPES[i].id === id) return this.RECIPES[i];
    }
    return null;
  }
};
