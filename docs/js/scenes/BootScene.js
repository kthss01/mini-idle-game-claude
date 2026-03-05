// ===== 부트 씬 =====
class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // 로딩 텍스트
    this.add.text(
      CONFIG.GAME_WIDTH / 2,
      CONFIG.GAME_HEIGHT / 2,
      '로딩 중...',
      {
        fontSize: '20px',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif'
      }
    ).setOrigin(0.5);
  }

  create() {
    // 세이브 데이터 로드
    var saveData = SaveSystem.load();
    var offlineGold = 0;

    if (saveData) {
      SaveSystem.applySaveData(saveData);
      offlineGold = SaveSystem.calculateOfflineReward();

      if (offlineGold > 0) {
        GameState.hero.gold += offlineGold;
        GameState.meta.totalGold += offlineGold;
      }
    } else {
      // 신규 게임 — 기본 스탯 계산
      UpgradeSystem.recalculateStats();
      GameState.hero.hp = GameState.hero.maxHp;
    }

    // 오프라인 보상이 있으면 팝업 표시 후 게임 씬으로 이동
    if (offlineGold > 0) {
      this.showOfflinePopup(offlineGold, function() {
        this.scene.start('GameScene');
      }.bind(this));
    } else {
      this.scene.start('GameScene');
    }
  }

  showOfflinePopup(gold, callback) {
    // UIScene이 아직 시작 전이므로 BootScene이 직접 팝업 DOM을 생성
    var overlay = document.getElementById('ui-overlay');
    if (!overlay) {
      callback();
      return;
    }

    var elapsed = (Date.now() - GameState.meta.lastSaveTime) / 1000;
    var hours = Math.floor(elapsed / 3600);
    var minutes = Math.floor((elapsed % 3600) / 60);
    var timeStr = (hours > 0 ? hours + '시간 ' : '') + minutes + '분';

    var popup = document.createElement('div');
    popup.id = 'offline-popup';
    popup.className = 'visible';
    popup.innerHTML = `
      <h2>오프라인 보상 🌙</h2>
      <p>${timeStr} 동안 오프라인이었습니다.</p>
      <div class="offline-amount">+${formatNumber(gold)} 💰</div>
      <button>받기!</button>
    `;
    overlay.appendChild(popup);

    popup.querySelector('button').onclick = function() {
      popup.remove();
      callback();
    };
  }
}
