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

    // 다음 몬스터 스폰 (짧은 딜레이)
    this.time.delayedCall(400, function() {
      if (!this.stageTransitioning) {
        MonsterSystem.spawnMonster();
        this._createMonster();
        CombatSystem.heroAttackTimer = 0;
        CombatSystem.monsterAttackTimer = 0;
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
    }.bind(this));
  }
}
