// ===== 몬스터 시스템 =====
var MonsterSystem = {

  // 몬스터 이름 풀
  NAMES: [
    ['슬라임', '고블린', '박쥐', '쥐', '해골'],
    ['오크', '트롤', '좀비', '늑대인간', '미믹'],
    ['오우거', '버서커', '아라크네', '거인 지네', '마법사'],
    ['드래곤 새끼', '데스나이트', '메두사', '사이클롭스', '불사조'],
    ['지옥 악마', '고대 리치', '심연 군주', '타락 천사', '혼돈의 신']
  ],

  BOSS_NAMES: ['슬라임 킹', '고블린 왕', '오크 군주', '골렘', '불사의 왕', '어둠의 제왕'],

  // 몬스터 색상 풀
  COLORS: [
    0x2ecc71,  // 초록
    0xe74c3c,  // 빨강
    0x9b59b6,  // 보라
    0xe67e22,  // 주황
    0x3498db,  // 파랑
    0xf39c12,  // 노랑
    0x1abc9c,  // 민트
    0xe91e63,  // 분홍
  ],

  isBossStage: function(stage) {
    return stage % 5 === 0;
  },

  getMonsterData: function(stage) {
    var isBoss = this.isBossStage(stage);

    var baseHp = CONFIG.MONSTER_BASE_HP * Math.pow(CONFIG.MONSTER_HP_MULT, stage - 1);
    var baseAtk = CONFIG.MONSTER_BASE_ATK * Math.pow(CONFIG.MONSTER_ATK_MULT, stage - 1);
    var baseDef = Math.floor((stage - 1) * 0.8);
    var baseGold = CONFIG.MONSTER_BASE_GOLD * Math.pow(CONFIG.MONSTER_GOLD_MULT, stage - 1);
    var baseExp = CONFIG.MONSTER_BASE_EXP * Math.pow(CONFIG.MONSTER_EXP_MULT, stage - 1);

    // 색상 선택
    var colorIndex = (stage - 1) % this.COLORS.length;
    var color = isBoss ? 0xff0000 : this.COLORS[colorIndex];

    // 이름 선택
    var tier = Math.min(Math.floor((stage - 1) / 5), this.NAMES.length - 1);
    var nameIndex = (stage - 1) % this.NAMES[tier].length;
    var name = isBoss
      ? (this.BOSS_NAMES[Math.floor((stage - 1) / 5) % this.BOSS_NAMES.length] + ' (BOSS)')
      : this.NAMES[tier][nameIndex];

    var data = {
      name: name,
      hp: Math.floor(baseHp * (isBoss ? CONFIG.BOSS_HP_MULT : 1)),
      atk: Math.floor(baseAtk * (isBoss ? CONFIG.BOSS_ATK_MULT : 1)),
      def: baseDef,
      goldDrop: Math.floor(baseGold * (isBoss ? CONFIG.BOSS_GOLD_MULT : 1)),
      expDrop: Math.floor(baseExp * (isBoss ? CONFIG.BOSS_EXP_MULT : 1)),
      color: color,
      size: isBoss ? 58 : 42,
      isBoss: isBoss
    };

    return data;
  },

  spawnMonster: function() {
    var data = this.getMonsterData(GameState.stage.current);
    GameState.monster.name = data.name;
    GameState.monster.hp = data.hp;
    GameState.monster.maxHp = data.hp;
    GameState.monster.atk = data.atk;
    GameState.monster.def = data.def;
    GameState.monster.goldDrop = data.goldDrop;
    GameState.monster.expDrop = data.expDrop;
    GameState.monster.color = data.color;
    GameState.monster.size = data.size;
    GameState.monster.isBoss = data.isBoss;
    GameState.stage.isBoss = data.isBoss;
    return data;
  },

  onMonsterDead: function(scene) {
    // 골드 보상
    var goldMult = 1 + GameState.upgrades.goldBonus * CONFIG.UPGRADE_STAT_PER_LEVEL.goldBonus;
    var goldGained = Math.floor(GameState.monster.goldDrop * goldMult);
    GameState.hero.gold += goldGained;
    GameState.meta.totalGold += goldGained;

    // EXP 보상
    var expGained = GameState.monster.expDrop;
    var leveled = UpgradeSystem.addExp(expGained);

    // 통계
    GameState.meta.totalKills++;
    GameState.stage.killCount++;

    // 장비 드롭 체크
    var droppedItem = null;
    if (typeof EquipmentSystem !== 'undefined') {
      droppedItem = EquipmentSystem.tryDrop(GameState.stage.current);
      if (droppedItem) {
        var added = EquipmentSystem._addToInventory(droppedItem);
        if (!added) droppedItem = null; // 인벤토리 가득 찼으면 드롭 취소
        if (droppedItem && scene && scene.events) {
          scene.events.emit('itemDropped', droppedItem);
        }
      }
    }

    // 스테이지 완료 체크
    if (GameState.stage.killCount >= CONFIG.KILLS_PER_STAGE) {
      this.onStageComplete(scene);
    }

    return { goldGained, expGained, leveled, droppedItem };
  },

  onStageComplete: function(scene) {
    GameState.stage.current++;
    GameState.stage.killCount = 0;
    GameState.stage.isBoss = this.isBossStage(GameState.stage.current);

    // 씬에 스테이지 변경 이벤트 발행
    if (scene && scene.events) {
      scene.events.emit('stageChanged', GameState.stage.current);
    }
  }
};
