// ===== VFX 매니저 =====
var VFXManager = {

  // 데미지 숫자 팝업
  showDamageNumber: function(scene, x, y, damage, isCrit) {
    var text = isCrit ? '💥 ' + formatNumber(damage) + '!' : formatNumber(damage);
    var color = isCrit ? '#ff6b35' : '#ffffff';
    var fontSize = isCrit ? '20px' : '15px';

    var dmgText = scene.add.text(x + randomBetween(-20, 20), y - 20, text, {
      fontSize: fontSize,
      fontFamily: 'Arial, sans-serif',
      color: color,
      stroke: '#000',
      strokeThickness: 3,
      fontStyle: isCrit ? 'bold' : 'normal'
    }).setDepth(50);

    scene.tweens.add({
      targets: dmgText,
      y: dmgText.y - (isCrit ? 70 : 50),
      alpha: 0,
      scaleX: isCrit ? 1.3 : 1,
      scaleY: isCrit ? 1.3 : 1,
      duration: isCrit ? 1000 : 750,
      ease: 'Power2',
      onComplete: function() {
        dmgText.destroy();
      }
    });
  },

  // 히트 이펙트 (원형 번쩍임)
  showHitEffect: function(scene, x, y, color) {
    color = color || 0xffffff;
    var circle = scene.add.circle(x, y, 20, color, 0.8).setDepth(45);

    scene.tweens.add({
      targets: circle,
      scaleX: 2.5,
      scaleY: 2.5,
      alpha: 0,
      duration: 250,
      ease: 'Power2',
      onComplete: function() {
        circle.destroy();
      }
    });
  },

  // 코인 파티클
  showCoinEffect: function(scene, x, y, amount) {
    var count = Math.min(5, Math.ceil(Math.log10(amount + 1)));
    for (var i = 0; i < count; i++) {
      var coin = scene.add.text(
        x + randomBetween(-30, 30),
        y + randomBetween(-10, 10),
        '💰',
        { fontSize: '14px' }
      ).setDepth(48);

      scene.tweens.add({
        targets: coin,
        y: coin.y - randomBetween(40, 70),
        x: coin.x + randomBetween(-20, 20),
        alpha: 0,
        duration: 800 + randomBetween(0, 400),
        ease: 'Power1',
        delay: i * 80,
        onComplete: function() {
          coin.destroy();
        }
      });
    }
  },

  // 레벨업 이펙트
  showLevelUp: function(scene) {
    // 화면 플래시
    var flash = scene.add.rectangle(
      CONFIG.GAME_WIDTH / 2,
      CONFIG.GAME_HEIGHT / 2,
      CONFIG.GAME_WIDTH,
      CONFIG.GAME_HEIGHT,
      0xffd700,
      0.3
    ).setDepth(60);

    scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 500,
      onComplete: function() { flash.destroy(); }
    });

    // 레벨업 텍스트
    var lvText = scene.add.text(
      CONFIG.GAME_WIDTH / 2,
      CONFIG.GAME_HEIGHT / 2 - 40,
      '⬆ LEVEL UP! ⬆',
      {
        fontSize: '28px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffd700',
        stroke: '#000',
        strokeThickness: 4,
        fontStyle: 'bold'
      }
    ).setOrigin(0.5).setDepth(65);

    var subText = scene.add.text(
      CONFIG.GAME_WIDTH / 2,
      CONFIG.GAME_HEIGHT / 2,
      'Lv. ' + GameState.hero.level,
      {
        fontSize: '20px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
        stroke: '#000',
        strokeThickness: 3
      }
    ).setOrigin(0.5).setDepth(65);

    scene.tweens.add({
      targets: [lvText, subText],
      y: '-=50',
      alpha: 0,
      duration: 1500,
      delay: 500,
      ease: 'Power2',
      onComplete: function() {
        lvText.destroy();
        subText.destroy();
      }
    });

    // DOM 배너도 표시
    var banner = document.getElementById('levelup-banner');
    if (banner) {
      banner.textContent = '⬆ Lv.' + GameState.hero.level + ' LEVEL UP!';
      banner.style.opacity = '1';
      setTimeout(function() {
        banner.style.transition = 'opacity 1s';
        banner.style.opacity = '0';
      }, 1500);
    }
  },

  // 스테이지 클리어 이펙트
  showStageClear: function(scene) {
    var text = scene.add.text(
      CONFIG.GAME_WIDTH / 2,
      CONFIG.GAME_HEIGHT / 2 - 60,
      'STAGE ' + (GameState.stage.current - 1) + ' CLEAR!',
      {
        fontSize: '24px',
        fontFamily: 'Arial, sans-serif',
        color: '#4ecdc4',
        stroke: '#000',
        strokeThickness: 3,
        fontStyle: 'bold'
      }
    ).setOrigin(0.5).setDepth(65);

    scene.tweens.add({
      targets: text,
      y: '-=40',
      alpha: 0,
      duration: 1200,
      delay: 200,
      ease: 'Power2',
      onComplete: function() { text.destroy(); }
    });
  },

  // 몬스터 사망 이펙트
  showMonsterDeath: function(scene, x, y, color) {
    for (var i = 0; i < 8; i++) {
      var particle = scene.add.circle(x, y, randomBetween(4, 10), color, 1).setDepth(44);
      var angle = (i / 8) * Math.PI * 2;
      var speed = randomBetween(50, 120);

      scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        scaleX: 0,
        scaleY: 0,
        duration: 500 + randomBetween(0, 300),
        ease: 'Power2',
        onComplete: function() { particle.destroy(); }
      });
    }
  },

  // 영웅 피격 이펙트 (캐릭터 깜빡임)
  showHeroHit: function(scene, heroSprite) {
    if (!heroSprite) return;
    scene.tweens.add({
      targets: heroSprite,
      alpha: 0.3,
      duration: 80,
      yoyo: true,
      repeat: 2,
      onComplete: function() {
        if (heroSprite.active) heroSprite.setAlpha(1);
      }
    });
  },

  // 독 피해 숫자 (초록)
  showPoisonNumber: function(scene, x, y, damage) {
    var txt = scene.add.text(x + randomBetween(-10, 10), y - 10, '☠' + damage, {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#44ff88',
      stroke: '#000',
      strokeThickness: 3
    }).setDepth(51);

    scene.tweens.add({
      targets: txt,
      y: txt.y - 40,
      alpha: 0,
      duration: 900,
      ease: 'Power2',
      onComplete: function() { txt.destroy(); }
    });
  },

  // 스킬 발동 이펙트 (아이콘 + 링)
  showSkillProc: function(scene, x, y, icon, color) {
    color = color || 0xffffff;
    var ring = scene.add.circle(x, y, 22, color, 0.25).setDepth(49);
    var iconTxt = scene.add.text(x, y - 18, icon, {
      fontSize: '18px'
    }).setOrigin(0.5).setDepth(52);

    scene.tweens.add({
      targets: [ring, iconTxt],
      scaleX: 1.8,
      scaleY: 1.8,
      alpha: 0,
      duration: 500,
      ease: 'Power2',
      onComplete: function() { ring.destroy(); iconTxt.destroy(); }
    });
  },

  // 아이템 드롭 알림
  showItemDrop: function(scene, x, y, item) {
    if (!item) return;
    var color = (typeof ItemSystem !== 'undefined') ? ItemSystem.getRarityColor(item.rarity) : '#ffffff';
    var border = (typeof ItemSystem !== 'undefined') ? ItemSystem.getRarityBorder(item.rarity) : '#888888';

    // 배경 박스
    var bg = scene.add.rectangle(x, y - 60, 140, 30, 0x000000, 0.85).setDepth(53);
    bg.setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(border).color);

    // 아이템 이름 텍스트
    var txt = scene.add.text(x, y - 60, item.icon + ' ' + item.name, {
      fontSize: '11px',
      fontFamily: 'Arial, sans-serif',
      color: color,
      stroke: '#000',
      strokeThickness: 2,
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(54);

    scene.tweens.add({
      targets: [bg, txt],
      y: '-=35',
      alpha: 0,
      duration: 1800,
      delay: 200,
      ease: 'Power1',
      onComplete: function() { bg.destroy(); txt.destroy(); }
    });
  }
};
