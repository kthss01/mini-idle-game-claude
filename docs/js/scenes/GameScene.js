// ===== 게임 씬 (핵심 전투 루프) =====
class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.heroSprite = null;
    this.monsterSprite = null;
    this.bgRect = null;
    this.groundRect = null;
    this.heroSword = null;
    this.autoSaveTimer = 0;
    this.monsterNameText = null;
    this.stageTransitioning = false;
    this.monsterIsDead = false; // 이중 사망 방지 플래그
    this.petContainer = null;
    this._lastEquippedPetUid = null;
  }

  create() {
    // 배경 생성
    this._createBackground();

    // 캐릭터 생성
    this._createHero();

    // 첫 번째 몬스터 스폰
    MonsterSystem.spawnMonster();
    this._createMonster();

    // 전투 시스템 초기화
    CombatSystem.init();

    // StatsTracker 초기화
    if (typeof StatsTracker !== 'undefined') {
      StatsTracker.init();
    }

    // 펫 스프라이트 생성
    this._createPet();

    // UIScene 시작 (병렬 실행)
    this.scene.launch('UIScene');

    // 스테이지 변경 이벤트 리스너
    this.events.on('stageChanged', this._onStageChanged, this);

    // 장비 드롭 이벤트 리스너
    this.events.on('itemDropped', function(item) {
      var uiScene = this.scene.get('UIScene');
      if (uiScene && uiScene.showDropToast) {
        uiScene.showDropToast(item);
      }
    }, this);

    // 재료 드롭 이벤트 리스너
    this.events.on('materialDropped', function(matId) {
      var uiScene = this.scene.get('UIScene');
      if (uiScene && uiScene.showMaterialToast) {
        uiScene.showMaterialToast(matId);
      }
    }, this);

    // 첫 렌더링
    this._updateHeroVisual();
  }

  update(time, delta) {
    if (this.stageTransitioning || this.monsterIsDead) return;

    // 자동 저장
    this.autoSaveTimer += delta;
    if (this.autoSaveTimer >= CONFIG.AUTO_SAVE_INTERVAL) {
      this.autoSaveTimer = 0;
      GameState.meta.playTime += CONFIG.AUTO_SAVE_INTERVAL / 1000;
      SaveSystem.save();
    }

    // StatsTracker 틱
    if (typeof StatsTracker !== 'undefined') {
      StatsTracker.processTick(delta);
    }

    // 상점 시스템 틱
    if (typeof ShopSystem !== 'undefined') {
      ShopSystem.processTick(delta);
    }

    // 펫 스프라이트 업데이트
    this._updatePetSprite();

    // 전투 처리
    var events = CombatSystem.processTick(delta, this);

    for (var i = 0; i < events.length; i++) {
      var ev = events[i];

      if (ev.type === 'heroAttack') {
        this._onHeroAttack(ev);
      } else if (ev.type === 'monsterAttack') {
        this._onMonsterAttack(ev);
      } else if (ev.type === 'heroDeath') {
        this._onHeroDeath();
      } else if (ev.type === 'skillActivated') {
        this._onSkillActivated(ev);
      } else if (ev.type === 'poison') {
        this._onPoisonTick(ev);
      }
    }

    // UI 씬에 업데이트 알림
    var uiScene = this.scene.get('UIScene');
    if (uiScene && uiScene.onGameUpdate) {
      uiScene.onGameUpdate();
    }
  }

  // ===== 배경 =====
  _createBackground() {
    var colorData = this._getStageColor();
    this.bgRect = this.add.rectangle(
      CONFIG.GAME_WIDTH / 2,
      CONFIG.GAME_HEIGHT / 2,
      CONFIG.GAME_WIDTH,
      CONFIG.GAME_HEIGHT,
      Phaser.Display.Color.HexStringToColor(colorData.bg).color
    );

    // 바닥
    this.groundRect = this.add.rectangle(
      CONFIG.GAME_WIDTH / 2,
      CONFIG.GAME_HEIGHT - 60,
      CONFIG.GAME_WIDTH,
      120,
      Phaser.Display.Color.HexStringToColor(colorData.ground).color
    );

    // 바닥 라인
    this.groundLine = this.add.rectangle(
      CONFIG.GAME_WIDTH / 2,
      CONFIG.GAME_HEIGHT - 120,
      CONFIG.GAME_WIDTH,
      2,
      0x444466,
      0.5
    );
  }

  _getStageColor() {
    var stage = GameState.stage.current;
    var idx = Math.min(Math.floor((stage - 1) / 5), CONFIG.STAGE_COLORS.length - 1);
    return CONFIG.STAGE_COLORS[idx];
  }

  _updateBackground() {
    var colorData = this._getStageColor();
    this.bgRect.setFillStyle(Phaser.Display.Color.HexStringToColor(colorData.bg).color);
    this.groundRect.setFillStyle(Phaser.Display.Color.HexStringToColor(colorData.ground).color);
  }

  // ===== 영웅 =====
  _createHero() {
    var x = CONFIG.HERO_X;
    var y = CONFIG.HERO_Y;

    // 영웅 바디 (파란 사각형)
    this.heroSprite = this.add.container(x, y);

    // 몸통
    var body = this.add.rectangle(0, 0, 36, 50, 0x3498db);
    // 머리
    var head = this.add.circle(0, -38, 18, 0xf39c12);
    // 눈
    var eyeL = this.add.circle(-7, -40, 4, 0x2c3e50);
    var eyeR = this.add.circle(7, -40, 4, 0x2c3e50);
    // 눈동자
    var pupilL = this.add.circle(-7, -40, 2, 0xecf0f1);
    var pupilR = this.add.circle(7, -40, 2, 0xecf0f1);
    // 검 (오른쪽)
    var sword = this.add.rectangle(28, -5, 6, 40, 0xbdc3c7);
    var swordGuard = this.add.rectangle(28, 8, 18, 5, 0x95a5a6);
    var swordHandle = this.add.rectangle(28, 18, 5, 12, 0x8e44ad);

    this.heroSprite.add([body, head, eyeL, eyeR, pupilL, pupilR, swordHandle, swordGuard, sword]);
    this.heroSprite.setDepth(10);

    // 영웅 이름 텍스트
    this.add.text(x, y + 42, '영웅', {
      fontSize: '12px',
      color: '#4ecdc4',
      fontFamily: 'Arial, sans-serif',
      stroke: '#000',
      strokeThickness: 2
    }).setOrigin(0.5).setDepth(11);

    // 호버 애니메이션 (위아래 흔들림)
    this.tweens.add({
      targets: this.heroSprite,
      y: y - 8,
      duration: 1200,
      ease: 'Sine.inOut',
      yoyo: true,
      repeat: -1
    });
  }

  _updateHeroVisual() {
    // 필요시 영웅 비주얼 업데이트
  }

  // ===== 펫 스프라이트 =====
  _createPet() {
    if (this.petContainer) {
      this.petContainer.destroy();
      this.petContainer = null;
    }
    if (typeof PetSystem === 'undefined') return;
    var pet = PetSystem.getEquippedPet();
    if (!pet) return;

    var px = CONFIG.HERO_X - 55;
    var py = CONFIG.HERO_Y + 15;
    this.petContainer = this.add.container(px, py);

    if (pet.type === 'dragon') {
      var body = this.add.triangle(0, 0, 0, -18, -14, 10, 14, 10, 0xcc2200);
      var wingL = this.add.triangle(-14, 0, -28, -12, -10, 4, -6, 8, 0xff4422, 0.8);
      var wingR = this.add.triangle(14, 0, 28, -12, 10, 4, 6, 8, 0xff4422, 0.8);
      var eye = this.add.circle(0, -6, 3, 0xffd700);
      this.petContainer.add([wingL, wingR, body, eye]);
    } else if (pet.type === 'turtle') {
      var shell = this.add.circle(0, 0, 16, 0x27ae60);
      var head = this.add.circle(0, -18, 8, 0x2ecc71);
      var pattern = this.add.circle(0, 0, 8, 0x1e8449, 0.5);
      this.petContainer.add([shell, head, pattern]);
    } else { // fox
      var fbody = this.add.circle(0, 0, 14, 0xe67e22);
      var ftail = this.add.triangle(16, 8, 28, -4, 22, 16, 14, 12, 0xe67e22);
      var fhead = this.add.circle(0, -16, 9, 0xe67e22);
      var fear1 = this.add.triangle(-6, -22, -10, -32, -2, -22, -6, -18, 0xe67e22);
      var fear2 = this.add.triangle(6, -22, 10, -32, 2, -22, 6, -18, 0xe67e22);
      var feye = this.add.circle(0, -16, 3, 0x2c3e50);
      this.petContainer.add([ftail, fbody, fhead, fear1, fear2, feye]);
    }

    this.petContainer.setDepth(9);
    this.tweens.add({
      targets: this.petContainer,
      y: py - 6,
      duration: 1000 + Math.random() * 400,
      ease: 'Sine.inOut',
      yoyo: true,
      repeat: -1
    });

    this._lastEquippedPetUid = pet.uid;
  }

  _updatePetSprite() {
    if (typeof PetSystem === 'undefined') return;
    var pet = PetSystem.getEquippedPet();
    var newUid = pet ? pet.uid : null;
    if (newUid !== this._lastEquippedPetUid) {
      this._createPet();
    }
  }

  // ===== 몬스터 =====
  _createMonster() {
    var x = CONFIG.MONSTER_X;
    var y = CONFIG.MONSTER_Y;
    var data = GameState.monster;

    if (this.monsterContainer) {
      this.monsterContainer.destroy();
    }
    if (this.monsterNameText) {
      this.monsterNameText.destroy();
    }

    this.monsterContainer = this.add.container(x, y);
    var size = data.size;
    var color = data.color;

    if (data.isBoss) {
      // 보스: 뿔 달린 큰 몬스터
      var bossBody = this.add.rectangle(0, 0, size, size * 1.2, color);
      var bossHead = this.add.circle(0, -size * 0.7, size * 0.55, color);
      var hornL = this.add.triangle(
        -size * 0.3, -size * 0.9,
        -size * 0.5, -size * 1.3,
        -size * 0.1, -size * 0.9,
        0xff4444
      );
      var hornR = this.add.triangle(
        size * 0.1, -size * 0.9,
        size * 0.3, -size * 1.3,
        size * 0.5, -size * 0.9,
        0xff4444
      );
      var eyeL = this.add.circle(-size * 0.2, -size * 0.75, size * 0.12, 0xff0000);
      var eyeR = this.add.circle(size * 0.2, -size * 0.75, size * 0.12, 0xff0000);
      this.monsterContainer.add([bossBody, bossHead, hornL, hornR, eyeL, eyeR]);

      // 보스 글로우
      var glow = this.add.circle(0, 0, size * 0.8, color, 0.15);
      this.monsterContainer.addAt(glow, 0);
    } else {
      // 일반 몬스터: 슬라임 형태
      var monBody = this.add.ellipse(0, 0, size * 1.2, size, color);
      var monEyeL = this.add.circle(-size * 0.2, -size * 0.15, size * 0.1, 0x2c3e50);
      var monEyeR = this.add.circle(size * 0.2, -size * 0.15, size * 0.1, 0x2c3e50);
      var pupilL = this.add.circle(-size * 0.2, -size * 0.15, size * 0.05, 0xffffff);
      var pupilR = this.add.circle(size * 0.2, -size * 0.15, size * 0.05, 0xffffff);
      this.monsterContainer.add([monBody, monEyeL, monEyeR, pupilL, pupilR]);
    }

    this.monsterContainer.setDepth(10);

    // 몬스터 이름
    this.monsterNameText = this.add.text(x, y + size * 0.8 + 10, data.name, {
      fontSize: '12px',
      color: data.isBoss ? '#ff6b6b' : '#ff9f9f',
      fontFamily: 'Arial, sans-serif',
      stroke: '#000',
      strokeThickness: 2,
      fontStyle: data.isBoss ? 'bold' : 'normal'
    }).setOrigin(0.5).setDepth(11);

    // 몬스터 호버 애니메이션
    this.tweens.add({
      targets: this.monsterContainer,
      y: y + 10,
      duration: 900 + Math.random() * 300,
      ease: 'Sine.inOut',
      yoyo: true,
      repeat: -1
    });
  }

  // ===== 이벤트 핸들러 =====
  _onHeroAttack(ev) {
    // 히트 이펙트 (몬스터 위치)
    var mx = CONFIG.MONSTER_X;
    var my = CONFIG.MONSTER_Y;

    VFXManager.showHitEffect(this, mx + randomBetween(-15, 15), my + randomBetween(-15, 15), GameState.monster.color);
    VFXManager.showDamageNumber(this, mx, my - GameState.monster.size * 0.7, ev.damage, ev.isCrit);

    // 번개 VFX
    if (ev.thunderBonus > 0) {
      VFXManager.showDamageNumber(this, mx + 30, my - GameState.monster.size - 10, ev.thunderBonus, false);
      VFXManager.showSkillProc(this, mx, my, '⚡', 0xffff00);
    }
    // 연타 VFX
    if (ev.doubleStrike) {
      VFXManager.showDamageNumber(this, mx - 25, my - GameState.monster.size * 0.5, ev.doubleStrikeDmg, false);
      VFXManager.showSkillProc(this, mx - 20, my - 10, '🌀', 0x88aaff);
    }
    // 흡혈 힐 VFX
    if (ev.lifestealHeal > 0) {
      VFXManager.showHealNumber(this, CONFIG.HERO_X, CONFIG.HERO_Y, ev.lifestealHeal);
    }
    // 광전사 VFX (30% 확률로 표시, 스팸 방지)
    if (ev.berserkerActive && Math.random() < 0.3) {
      VFXManager.showBerserkerFlame(this, CONFIG.HERO_X, CONFIG.HERO_Y);
    }

    // 몬스터 피격 흔들림
    if (this.monsterContainer) {
      this.tweens.add({
        targets: this.monsterContainer,
        x: CONFIG.MONSTER_X + 8,
        duration: 50,
        yoyo: true,
        repeat: 2,
        onComplete: function() {
          if (this.monsterContainer && this.monsterContainer.active) {
            this.monsterContainer.setX(CONFIG.MONSTER_X);
          }
        }.bind(this)
      });
    }

    // 몬스터 사망 (이중 처리 방지)
    if (ev.targetDead && !this.monsterIsDead) {
      this.monsterIsDead = true;
      this._onMonsterDead();
    }
  }

  _onMonsterAttack(ev) {
    VFXManager.showDamageNumber(this, CONFIG.HERO_X, CONFIG.HERO_Y - 60, ev.damage, ev.isCrit);
    VFXManager.showHeroHit(this, this.heroSprite);
    // 강철 피부 방어막 VFX
    if (ev.ironSkinBlocked > 0) {
      VFXManager.showShieldBlock(this, CONFIG.HERO_X, CONFIG.HERO_Y);
    }
  }

  _onSkillActivated(ev) {
    var mx = CONFIG.MONSTER_X;
    var my = CONFIG.MONSTER_Y;

    // 스킬별 색상 이펙트
    VFXManager.showHitEffect(this, mx + randomBetween(-20, 20), my + randomBetween(-20, 20), ev.phaserColor);

    if (ev.damage) {
      VFXManager.showDamageNumber(this, mx, my - GameState.monster.size * 0.8, ev.damage, false);
    }
    if (ev.heal) {
      // 힐 숫자 (영웅 위치)
      VFXManager.showDamageNumber(this, CONFIG.HERO_X, CONFIG.HERO_Y - 80, ev.heal, false);
    }

    // 스킬 이름 텍스트 표시
    var skillText = this.add.text(mx, my - GameState.monster.size - 30, ev.name, {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: ev.cssColor,
      stroke: '#000',
      strokeThickness: 3,
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(52);

    this.tweens.add({
      targets: skillText,
      y: skillText.y - 30,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: function() { skillText.destroy(); }
    });

    // 몬스터 사망 처리 (이중 처리 방지)
    if (ev.targetDead && !this.monsterIsDead) {
      this.monsterIsDead = true;
      this._onMonsterDead();
    }
  }

  _onHeroDeath() {
    // 영웅이 죽으면 HP 30%로 회복 (이미 CombatSystem에서 처리됨)
    // 시각적 피드백
    var flash = this.add.rectangle(
      CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT / 2,
      CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT,
      0xff0000, 0.3
    ).setDepth(70);

    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 400,
      onComplete: function() { flash.destroy(); }
    });
  }

  _onMonsterDead() {
    var mx = CONFIG.MONSTER_X;
    var my = CONFIG.MONSTER_Y;

    // 사망 이펙트
    VFXManager.showMonsterDeath(this, mx, my, GameState.monster.color);
    VFXManager.showCoinEffect(this, mx, my, GameState.monster.goldDrop);

    // 몬스터 컨테이너 제거
    if (this.monsterContainer) {
      this.monsterContainer.setVisible(false);
    }

    // 보상 처리
    var result = MonsterSystem.onMonsterDead(this);

    // 레벨업
    if (result.leveled) {
      VFXManager.showLevelUp(this);
    }

    // ItemSystem 드롭 VFX
    if (result.droppedItemSimple) {
      VFXManager.showItemDrop(this, mx, my, result.droppedItemSimple);
    }

    // 다음 몬스터 스폰 (짧은 딜레이)
    this.time.delayedCall(400, function() {
      if (!this.stageTransitioning) {
        MonsterSystem.spawnMonster();
        this._createMonster();
        CombatSystem.heroAttackTimer = 0;
        CombatSystem.monsterAttackTimer = 0;
        CombatSystem.poisonTimer = 0;
        this.monsterIsDead = false; // 플래그 초기화
      }
    }.bind(this));
  }

  _onStageChanged(newStage) {
    this.stageTransitioning = true;
    VFXManager.showStageClear(this);

    this.time.delayedCall(600, function() {
      this._updateBackground();
      this.stageTransitioning = false;
      this.monsterIsDead = false;
      MonsterSystem.spawnMonster();
      this._createMonster();
      CombatSystem.heroAttackTimer = 0;
      CombatSystem.monsterAttackTimer = 0;
      CombatSystem.poisonTimer = 0;
    }.bind(this));
  }

  _onPoisonTick(ev) {
    var mx = CONFIG.MONSTER_X;
    var my = CONFIG.MONSTER_Y;
    VFXManager.showPoisonNumber(this, mx, my - GameState.monster.size * 0.5, ev.damage);
    if (ev.targetDead && !this.monsterIsDead) {
      this.monsterIsDead = true;
      this._onMonsterDead();
    }
  }
}
