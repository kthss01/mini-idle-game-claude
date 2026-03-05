// ===== 펫 시스템 =====

// GameState에 pets 필드 추가 (state.js 이후 로드됨)
GameState.pets = {
  equipped: null,
  inventory: [],
  eggs: { dragonEgg: 0, turtleEgg: 0, foxEgg: 0 },
  food: { petFood_s: 0, petFood_m: 0, petFood_l: 0 }
};

var PetSystem = {

  EGG_TYPES: [
    { id: 'dragonEgg', name: '용의 알',   icon: '🥚', price: 500, petType: 'dragon' },
    { id: 'turtleEgg', name: '거북의 알', icon: '🥚', price: 500, petType: 'turtle' },
    { id: 'foxEgg',    name: '여우의 알', icon: '🥚', price: 500, petType: 'fox' }
  ],

  GRADES:        ['common', 'rare', 'hero', 'legend'],
  GRADE_CHANCES: [0.50, 0.30, 0.15, 0.05],
  GRADE_MULT:    { common: 1.0, rare: 2.0, hero: 3.5, legend: 6.0 },
  GRADE_COLORS:  { common: '#bdc3c7', rare: '#4ecdc4', hero: '#9b59b6', legend: '#ffd700' },
  GRADE_NAMES:   { common: '일반', rare: '희귀', hero: '영웅', legend: '전설' },
  GRADE_PREFIXES:{ common: '', rare: '빛나는 ', hero: '영웅의 ', legend: '전설의 ' },

  BASE_STATS: {
    dragon: { atk: 0.05, critChance: 0.01 },
    turtle: { def: 0.08, hp: 0.10 },
    fox:    { goldBonus: 0.10, dropRate: 0.05 }
  },

  NAME_POOL: {
    dragon: ['이그니스', '드라코', '인페르노', '아이거', '불꽃이'],
    turtle: ['쉘리', '카라파', '안전이', '철갑이', '방패왕'],
    fox:    ['여우비', '샤이니', '럭키', '보물이', '골드']
  },

  PET_ICONS:   { dragon: '🔴', turtle: '🔵', fox: '🟠' },
  PET_NAMES:   { dragon: '용', turtle: '거북', fox: '여우' },
  FOOD_EXP:    { petFood_s: 10, petFood_m: 30, petFood_l: 80 },
  FOOD_NAMES:  { petFood_s: '작은 먹이', petFood_m: '중간 먹이', petFood_l: '큰 먹이' },
  FOOD_ICONS:  { petFood_s: '🌿', petFood_m: '🍖', petFood_l: '🥩' },

  buyEgg: function(type) {
    var def = this._getEggDef(type);
    if (!def) return false;
    if (GameState.hero.gold < def.price) return false;
    GameState.hero.gold -= def.price;
    GameState.pets.eggs[type] = (GameState.pets.eggs[type] || 0) + 1;
    return true;
  },

  hatchEgg: function(type) {
    if (!GameState.pets.eggs[type] || GameState.pets.eggs[type] <= 0) return null;
    if (GameState.pets.inventory.length >= 15) return null;
    GameState.pets.eggs[type]--;
    var grade = this._rollGrade();
    var petType = type.replace('Egg', '');
    var pet = {
      uid: 'pet_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
      type: petType,
      grade: grade,
      name: this.generateName(petType, grade),
      level: 1,
      exp: 0
    };
    GameState.pets.inventory.push(pet);
    return pet;
  },

  equip: function(uid) {
    if (!this._findPet(uid)) return false;
    GameState.pets.equipped = uid;
    if (typeof UpgradeSystem !== 'undefined') UpgradeSystem.recalculateStats();
    return true;
  },

  unequip: function() {
    GameState.pets.equipped = null;
    if (typeof UpgradeSystem !== 'undefined') UpgradeSystem.recalculateStats();
  },

  feedPet: function(uid, foodId) {
    var pet = this._findPet(uid);
    if (!pet) return false;
    var foodCount = GameState.pets.food[foodId] || 0;
    if (foodCount <= 0) return false;
    GameState.pets.food[foodId]--;
    pet.exp += (this.FOOD_EXP[foodId] || 10);
    var leveled = false;
    while (pet.exp >= this.getExpRequired(pet.level)) {
      pet.exp -= this.getExpRequired(pet.level);
      pet.level++;
      leveled = true;
    }
    if (leveled && typeof UpgradeSystem !== 'undefined') UpgradeSystem.recalculateStats();
    return leveled;
  },

  getExpRequired: function(level) {
    return Math.floor(50 * Math.pow(level, 1.3));
  },

  getPetStats: function() {
    if (!GameState.pets || !GameState.pets.equipped) return {};
    var pet = this._findPet(GameState.pets.equipped);
    if (!pet) return {};
    var base = this.BASE_STATS[pet.type] || {};
    var gradeMult = this.GRADE_MULT[pet.grade] || 1.0;
    var levelMult = 1 + (pet.level - 1) * 0.10;
    var result = {};
    for (var key in base) {
      result[key] = base[key] * gradeMult * levelMult;
    }
    return result;
  },

  generateName: function(type, grade) {
    var pool = this.NAME_POOL[type] || ['펫'];
    var name = pool[Math.floor(Math.random() * pool.length)];
    return (this.GRADE_PREFIXES[grade] || '') + name;
  },

  getEquippedPet: function() {
    if (!GameState.pets || !GameState.pets.equipped) return null;
    return this._findPet(GameState.pets.equipped);
  },

  _rollGrade: function() {
    var r = Math.random();
    var cum = 0;
    for (var i = 0; i < this.GRADES.length; i++) {
      cum += this.GRADE_CHANCES[i];
      if (r < cum) return this.GRADES[i];
    }
    return 'common';
  },

  _findPet: function(uid) {
    if (!GameState.pets) return null;
    for (var i = 0; i < GameState.pets.inventory.length; i++) {
      if (GameState.pets.inventory[i].uid === uid) return GameState.pets.inventory[i];
    }
    return null;
  },

  _getEggDef: function(type) {
    for (var i = 0; i < this.EGG_TYPES.length; i++) {
      if (this.EGG_TYPES[i].id === type) return this.EGG_TYPES[i];
    }
    return null;
  }
};
