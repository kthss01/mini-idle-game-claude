// ===== Phaser 게임 초기화 =====
var gameConfig = {
  type: Phaser.AUTO,
  width: CONFIG.GAME_WIDTH,
  height: CONFIG.GAME_HEIGHT,
  backgroundColor: '#0a0a1a',
  parent: 'game-container',
  scene: [TitleScene, BootScene, GameScene, UIScene],
  fps: {
    target: 60,
    forceSetTimeOut: false
  }
};

var game = new Phaser.Game(gameConfig);
