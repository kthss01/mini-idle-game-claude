// ===== 타이틀 씬 (슬롯 선택 화면) =====
class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create() {
    this.cameras.main.setBackgroundColor('#07070f');
    this._buildTitleUI();
    this._animateStars();
  }

  // 배경 별 파티클 (Phaser Canvas)
  _animateStars() {
    var starCount = 60;
    for (var i = 0; i < starCount; i++) {
      var x = Phaser.Math.Between(0, CONFIG.GAME_WIDTH);
      var y = Phaser.Math.Between(0, CONFIG.GAME_HEIGHT);
      var r = Math.random() * 1.5 + 0.3;
      var alpha = Math.random() * 0.6 + 0.2;
      var star = this.add.circle(x, y, r, 0xffffff, alpha);
      // 깜박임 트윈
      this.tweens.add({
        targets: star,
        alpha: { from: alpha, to: alpha * 0.2 },
        duration: Phaser.Math.Between(1200, 3000),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 2000)
      });
    }
  }

  // DOM 기반 타이틀 UI 생성
  _buildTitleUI() {
    var self = this;
    var overlay = document.getElementById('ui-overlay');

    var screen = document.createElement('div');
    screen.id = 'title-screen';

    // ── 타이틀 헤더 ──
    var header = document.createElement('div');
    header.id = 'title-header';
    header.innerHTML = '<div id="title-logo">⚔️</div><div id="title-name">미니 방치형 RPG</div><div id="title-sub">슬롯을 선택하여 시작하세요</div>';
    screen.appendChild(header);

    // ── 슬롯 카드 영역 ──
    var slotsWrap = document.createElement('div');
    slotsWrap.id = 'title-slots';
    var metas = SaveSlotManager.getAllSlotsMeta();

    for (var i = 0; i < metas.length; i++) {
      slotsWrap.appendChild(this._buildSlotCard(metas[i], self));
    }
    screen.appendChild(slotsWrap);

    // ── 하단 버전 ──
    var footer = document.createElement('div');
    footer.id = 'title-footer';
    footer.textContent = 'v1.0  |  저장: 자동 (15초마다)';
    screen.appendChild(footer);

    overlay.appendChild(screen);
  }

  _buildSlotCard(meta, scene) {
    var card = document.createElement('div');
    card.className = 'title-slot-card' + (meta.isEmpty ? ' slot-empty' : '');

    var slotLabel = document.createElement('div');
    slotLabel.className = 'slot-label';
    slotLabel.textContent = '슬롯 ' + meta.slot;
    card.appendChild(slotLabel);

    if (meta.isEmpty) {
      // 빈 슬롯
      var emptyIcon = document.createElement('div');
      emptyIcon.className = 'slot-empty-icon';
      emptyIcon.textContent = '📂';
      card.appendChild(emptyIcon);

      var emptyText = document.createElement('div');
      emptyText.className = 'slot-empty-text';
      emptyText.textContent = '저장 없음';
      card.appendChild(emptyText);
    } else {
      // 저장 데이터 요약
      var infoWrap = document.createElement('div');
      infoWrap.className = 'slot-info';

      var rows = [
        { label: '레벨', value: 'Lv.' + meta.heroLevel },
        { label: '스테이지', value: meta.stage + ' 스테이지' },
        { label: '환생', value: meta.prestigeCount + '회' },
        { label: '플레이', value: formatTime(Math.floor(meta.totalPlayTime)) }
      ];

      for (var r = 0; r < rows.length; r++) {
        var row = document.createElement('div');
        row.className = 'slot-info-row';
        row.innerHTML = '<span class="slot-info-label">' + rows[r].label + '</span><span class="slot-info-value">' + rows[r].value + '</span>';
        infoWrap.appendChild(row);
      }

      // 마지막 저장 시각
      if (meta.lastSaveTime) {
        var elapsed = Math.floor((Date.now() - meta.lastSaveTime) / 1000);
        var lastSaved = document.createElement('div');
        lastSaved.className = 'slot-last-save';
        lastSaved.textContent = formatTime(elapsed) + ' 전 저장';
        infoWrap.appendChild(lastSaved);
      }

      card.appendChild(infoWrap);
    }

    // 시작 버튼
    var btn = document.createElement('button');
    btn.className = 'slot-start-btn' + (meta.isEmpty ? '' : ' slot-continue-btn');
    btn.textContent = meta.isEmpty ? '새 게임' : '이어하기';
    (function(slotNum) {
      btn.onclick = function() { scene._selectSlot(slotNum); };
    })(meta.slot);
    card.appendChild(btn);

    return card;
  }

  _selectSlot(n) {
    // active slot 설정
    SaveSlotManager.setActiveSlot(n);

    // 타이틀 화면 DOM 제거
    var screen = document.getElementById('title-screen');
    if (screen) screen.remove();

    // BootScene으로 이동
    this.scene.start('BootScene');
  }
}
