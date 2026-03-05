// ===== UI 씬 (HUD + 패널 오버레이) =====
class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
    this.lastUpdateTime = 0;
    this.UPDATE_INTERVAL = 100; // 100ms마다 DOM 업데이트
  }

  create() {
    this._buildHUD();
    this._buildUpgradePanel();
    this._buildSettingsPanel();
    // 오프라인 팝업은 BootScene에서 동적 생성하므로 여기서는 생략

    // 초기 UI 업데이트
    this.onGameUpdate();
  }

  onGameUpdate() {
    var now = Date.now();
    if (now - this.lastUpdateTime < this.UPDATE_INTERVAL) return;
    this.lastUpdateTime = now;

    this._updateHUD();
    this._updateHPBars();
    this._updateStatBar();
    this._updateUpgradeButtons();
  }

  // ===== HUD 빌드 =====
  _buildHUD() {
    var overlay = document.getElementById('ui-overlay');

    // 상단 HUD
    var hudTop = document.createElement('div');
    hudTop.id = 'hud-top';
    hudTop.innerHTML = `
      <div class="hud-badge" id="hud-stage">스테이지 <span>1</span></div>
      <div class="hud-badge" id="hud-kills">처치 <span>0</span> / 10</div>
      <div class="hud-badge" id="hud-gold">💰 <span>0</span></div>
    `;
    overlay.appendChild(hudTop);

    // HP 바
    var hpBars = document.createElement('div');
    hpBars.id = 'hp-bars';
    hpBars.innerHTML = `
      <div class="hp-bar-container">
        <div class="hp-bar-label">
          <span>영웅 HP</span>
          <span id="hero-hp-text">100 / 100</span>
        </div>
        <div class="hp-bar-bg">
          <div class="hp-bar-fill" id="hero-hp-fill" style="width:100%"></div>
        </div>
      </div>
      <div class="hp-bar-container">
        <div class="hp-bar-label">
          <span id="monster-name-hud">슬라임</span>
          <span id="monster-hp-text">40 / 40</span>
        </div>
        <div class="hp-bar-bg">
          <div class="hp-bar-fill" id="monster-hp-fill" style="width:100%"></div>
        </div>
      </div>
    `;
    overlay.appendChild(hpBars);

    // 하단 스탯바
    var statBar = document.createElement('div');
    statBar.id = 'stat-bar';
    statBar.innerHTML = `
      <div class="stat-item">
        <div class="stat-label">레벨</div>
        <div class="stat-value" id="stat-level">1</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">ATK</div>
        <div class="stat-value" id="stat-atk">10</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">DEF</div>
        <div class="stat-value" id="stat-def">2</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">SPD</div>
        <div class="stat-value" id="stat-spd">5</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">CRIT</div>
        <div class="stat-value" id="stat-crit">5%</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">EXP</div>
        <div class="stat-value" id="stat-exp">0%</div>
      </div>
    `;
    overlay.appendChild(statBar);

    // 세팅 버튼
    var settingsBtn = document.createElement('button');
    settingsBtn.id = 'settings-btn';
    settingsBtn.innerHTML = '⚙';
    settingsBtn.title = '설정';
    settingsBtn.onclick = function() {
      document.getElementById('settings-panel').classList.add('visible');
    };
    overlay.appendChild(settingsBtn);

    // 레벨업 배너
    var lvBanner = document.createElement('div');
    lvBanner.id = 'levelup-banner';
    lvBanner.textContent = '⬆ LEVEL UP!';
    overlay.appendChild(lvBanner);
  }

  // ===== 업그레이드 패널 빌드 =====
  _buildUpgradePanel() {
    var overlay = document.getElementById('ui-overlay');

    var upgrades = [
      { key: 'atk',       icon: '⚔️',  name: 'ATK',   desc: '공격력' },
      { key: 'def',       icon: '🛡️',  name: 'DEF',   desc: '방어력' },
      { key: 'hp',        icon: '❤️',  name: 'HP',    desc: '최대 HP' },
      { key: 'spd',       icon: '⚡',  name: 'SPD',   desc: '공속' },
      { key: 'critChance',icon: '💫',  name: 'CRIT',  desc: '치명타' },
      { key: 'goldBonus', icon: '💰',  name: 'GOLD',  desc: '골드 보너스' }
    ];

    var panel = document.createElement('div');
    panel.id = 'upgrade-panel';

    upgrades.forEach(function(upg) {
      var btn = document.createElement('button');
      btn.className = 'upgrade-btn';
      btn.id = 'upg-' + upg.key;
      btn.innerHTML = `
        <div class="btn-icon">${upg.icon}</div>
        <div class="btn-name">${upg.name}</div>
        <div class="btn-level" id="upg-lv-${upg.key}">Lv.0</div>
        <div class="btn-cost" id="upg-cost-${upg.key}">💰 0</div>
      `;

      btn.onclick = function() {
        if (UpgradeSystem.applyUpgrade(upg.key)) {
          // 구매 성공 시 즉시 UI 업데이트
          this._updateUpgradeButtons();
          this._updateStatBar();
          this._updateHPBars();
        }
      }.bind(this);

      panel.appendChild(btn);
    }.bind(this));

    overlay.appendChild(panel);
  }

  // ===== 세팅 패널 빌드 =====
  _buildSettingsPanel() {
    var overlay = document.getElementById('ui-overlay');

    var panel = document.createElement('div');
    panel.id = 'settings-panel';
    panel.innerHTML = `
      <button id="settings-close">✕</button>
      <h2>설정</h2>
      <div class="settings-row">
        <button class="settings-btn" id="btn-manual-save">💾 지금 저장</button>
        <button class="settings-btn danger" id="btn-reset">🗑️ 데이터 초기화</button>
      </div>
      <div id="settings-info">
        총 플레이: <span id="info-playtime">0분</span><br>
        총 킬: <span id="info-kills">0</span><br>
        총 골드: <span id="info-gold">0</span>
      </div>
    `;
    overlay.appendChild(panel);

    // 이벤트 연결
    document.getElementById('settings-close').onclick = function() {
      panel.classList.remove('visible');
    };

    document.getElementById('btn-manual-save').onclick = function() {
      SaveSystem.save();
      var btn = document.getElementById('btn-manual-save');
      btn.textContent = '✅ 저장됨!';
      setTimeout(function() { btn.textContent = '💾 지금 저장'; }, 1500);
    };

    document.getElementById('btn-reset').onclick = function() {
      if (confirm('모든 데이터가 삭제됩니다. 정말 초기화하시겠습니까?')) {
        SaveSystem.resetSave();
      }
    };
  }

  // ===== 오프라인 팝업 빌드 =====
  _buildOfflinePopup() {
    var overlay = document.getElementById('ui-overlay');

    var popup = document.createElement('div');
    popup.id = 'offline-popup';
    popup.innerHTML = `
      <h2>오프라인 보상 🌙</h2>
      <p>0분 동안 오프라인이었습니다.</p>
      <div class="offline-amount">+0 💰</div>
      <button>받기!</button>
    `;
    overlay.appendChild(popup);
  }

  // ===== UI 업데이트 =====
  _updateHUD() {
    var stageEl = document.querySelector('#hud-stage span');
    var killsEl = document.querySelector('#hud-kills span');
    var goldEl = document.querySelector('#hud-gold span');

    if (stageEl) stageEl.textContent = GameState.stage.current + (GameState.stage.isBoss ? ' 👑' : '');
    if (killsEl) killsEl.textContent = GameState.stage.killCount;
    if (goldEl) goldEl.textContent = formatNumber(GameState.hero.gold);
  }

  _updateHPBars() {
    // 영웅 HP
    var heroHpFill = document.getElementById('hero-hp-fill');
    var heroHpText = document.getElementById('hero-hp-text');
    if (heroHpFill) {
      var heroPct = clamp(GameState.hero.hp / GameState.hero.maxHp * 100, 0, 100);
      heroHpFill.style.width = heroPct + '%';
      // HP에 따라 색상 변화
      if (heroPct > 50) {
        heroHpFill.style.background = 'linear-gradient(90deg, #2ecc71, #27ae60)';
      } else if (heroPct > 25) {
        heroHpFill.style.background = 'linear-gradient(90deg, #f39c12, #e67e22)';
      } else {
        heroHpFill.style.background = 'linear-gradient(90deg, #e74c3c, #c0392b)';
      }
    }
    if (heroHpText) {
      heroHpText.textContent = Math.ceil(GameState.hero.hp) + ' / ' + GameState.hero.maxHp;
    }

    // 몬스터 HP
    var monHpFill = document.getElementById('monster-hp-fill');
    var monHpText = document.getElementById('monster-hp-text');
    var monName = document.getElementById('monster-name-hud');
    if (monHpFill) {
      var monPct = clamp(
        GameState.monster.maxHp > 0 ? GameState.monster.hp / GameState.monster.maxHp * 100 : 100,
        0, 100
      );
      monHpFill.style.width = monPct + '%';
    }
    if (monHpText) {
      monHpText.textContent = Math.ceil(Math.max(0, GameState.monster.hp)) + ' / ' + GameState.monster.maxHp;
    }
    if (monName) {
      monName.textContent = GameState.monster.name || '몬스터';
    }
  }

  _updateStatBar() {
    var h = GameState.hero;
    var expReq = UpgradeSystem.getExpRequired(h.level);
    var expPct = Math.floor(h.exp / expReq * 100);

    var els = {
      'stat-level': 'Lv.' + h.level,
      'stat-atk': formatNumber(h.atk),
      'stat-def': formatNumber(h.def),
      'stat-spd': h.spd,
      'stat-crit': Math.floor(h.critChance * 100) + '%',
      'stat-exp': expPct + '%'
    };

    for (var id in els) {
      var el = document.getElementById(id);
      if (el) el.textContent = els[id];
    }

    // 세팅 패널 정보 업데이트
    var infoPlaytime = document.getElementById('info-playtime');
    var infoKills = document.getElementById('info-kills');
    var infoGold = document.getElementById('info-gold');
    if (infoPlaytime) {
      var mins = Math.floor(GameState.meta.playTime / 60);
      infoPlaytime.textContent = mins + '분';
    }
    if (infoKills) infoKills.textContent = formatNumber(GameState.meta.totalKills);
    if (infoGold) infoGold.textContent = formatNumber(GameState.meta.totalGold);
  }

  _updateUpgradeButtons() {
    var types = ['atk', 'def', 'hp', 'spd', 'critChance', 'goldBonus'];
    types.forEach(function(type) {
      var btn = document.getElementById('upg-' + type);
      var lvEl = document.getElementById('upg-lv-' + type);
      var costEl = document.getElementById('upg-cost-' + type);

      if (!btn) return;

      var level = GameState.upgrades[type];
      var cost = UpgradeSystem.getCost(type);
      var canAfford = UpgradeSystem.canAfford(type);

      if (lvEl) lvEl.textContent = 'Lv.' + level;
      if (costEl) costEl.textContent = '💰 ' + formatNumber(cost);

      btn.disabled = !canAfford;
      if (canAfford) {
        btn.classList.add('can-afford');
      } else {
        btn.classList.remove('can-afford');
      }
    });
  }
}
