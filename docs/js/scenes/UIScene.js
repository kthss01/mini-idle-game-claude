// ===== UI 씬 (HUD + 패널 오버레이) =====

// 전역 UIScene 인스턴스 (Achievement/Quest 시스템에서 접근용)
var UISceneInstance = null;

class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
    this.lastUpdateTime = 0;
    this.UPDATE_INTERVAL = 100;
    this._skillPopupKey = null;
    this._questSidebarOpen = true;
    this._achieveFilter = 'all';
    this._achieveToastQueue = [];
    this._achieveToastShowing = false;
    this._statsRefreshTimer = null;
    this._dpsWidgetOpen = false;
    this._activeSettingsTab = 'config';
    this._activeBottomTab = 'upgrade';
  }

  create() {
    this._buildHUD();
    this._buildSkillBar();
    this._buildShopPanel();
    this._buildEquipmentPanel();
    this._buildInventoryPanel();
    this._buildSettingsPanel();
    this._buildPrestigeUI();
    this._buildQuestSidebar();
    this._buildPetModal();
    this._buildCraftingModal();
    this._buildDpsWidget();
    this._buildBottomPanel();
    this._buildStageMapModal();

    UISceneInstance = this;
    this.onGameUpdate();

    // 첫 플레이어 튜토리얼 (새 게임이거나 튜토리얼 미완료 시)
    if (typeof TutorialSystem !== 'undefined') {
      var self = this;
      setTimeout(function() { TutorialSystem.start(); }, 600);
    }
  }

  onGameUpdate() {
    var now = Date.now();
    if (now - this.lastUpdateTime < this.UPDATE_INTERVAL) return;
    this.lastUpdateTime = now;

    this._updateHUD();
    this._updateHPBars();
    this._updateStatBar();
    this._updateShopPanel();
    this._updateSkillBar();
    this._updateEquipmentSlots();
    this._updateSoulBadge();
    this._updateQuestSidebar();
    this._updatePetSlot();
    this._updateHudBuffs();
    this._updateDpsWidget();
    this._processAutoUpgrade();
    this._updateBottomPanel();
  }

  // ===== HUD 빌드 =====
  _buildHUD() {
    var overlay = document.getElementById('ui-overlay');
    var self = this;

    // 상단 HUD
    var hudTop = document.createElement('div');
    hudTop.id = 'hud-top';
    hudTop.innerHTML = `
      <div class="hud-badge" id="hud-stage">스테이지 <span>1</span></div>
      <div class="hud-badge" id="hud-kills">처치 <span>0</span> / 10</div>
      <div class="hud-badge" id="hud-gold">💰 <span>0</span></div>
      <div id="hud-buffs"></div>
      <div class="hud-badge hud-souls-badge" id="hud-souls" style="display:none;cursor:pointer;">💎 <span>0</span></div>
    `;
    overlay.appendChild(hudTop);

    // 영혼석 배지 클릭 → 상점 버프 탭으로 이동
    var soulsEl = document.getElementById('hud-souls');
    if (soulsEl) {
      soulsEl.onclick = function() {
        self._openShopTab('buff');
      };
    }

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
      <div class="stat-item">
        <div class="stat-label">스킬P</div>
        <div class="stat-value" id="stat-sp">0</div>
      </div>
    `;
    overlay.appendChild(statBar);

    // 환생 버튼 (💀)
    var prestigeBtn = document.createElement('button');
    prestigeBtn.id = 'prestige-btn';
    prestigeBtn.innerHTML = '💀';
    prestigeBtn.title = '환생 (스테이지 20 필요)';
    prestigeBtn.onclick = function() {
      self._openPrestigeConfirm();
    };
    overlay.appendChild(prestigeBtn);

    // 맵 버튼
    var mapBtn = document.createElement('button');
    mapBtn.id = 'map-btn';
    mapBtn.innerHTML = '🗺️';
    mapBtn.title = '스테이지 맵';
    mapBtn.onclick = function() {
      self._openStageMap();
    };
    overlay.appendChild(mapBtn);

    // 제작 버튼
    var craftingBtn = document.createElement('button');
    craftingBtn.id = 'crafting-btn';
    craftingBtn.innerHTML = '🔨';
    craftingBtn.title = '제작소';
    craftingBtn.onclick = function() {
      self._openCraftingModal();
    };
    overlay.appendChild(craftingBtn);

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

  // ===== 스킬 바 (패시브 스킬로 변경 — bottom panel의 skill 탭 사용) =====
  _buildSkillBar() {
    // 패시브 스킬은 _buildBottomPanel()의 skill 탭에서 처리
    // 기존 active skill bar는 비워둠
  }

  _updateSkillBar() {
    // bottom panel의 skill 탭에서 처리
  }

  highlightSkillSlot(key) {
    // 구 active skill bar 호환 유지용 (no-op)
  }

  // ===== 상점 패널 빌드 (강화 / 소모품 / 버프 탭) =====
  _buildShopPanel() {
    var overlay = document.getElementById('ui-overlay');
    var self = this;

    var panel = document.createElement('div');
    panel.id = 'shop-panel';

    // 탭 바
    var tabBar = document.createElement('div');
    tabBar.className = 'shop-tab-bar';
    tabBar.innerHTML = `
      <button class="shop-tab active" id="stab-enhance">⚔ 강화</button>
      <button class="shop-tab" id="stab-consumable">🧪 소모품</button>
      <button class="shop-tab" id="stab-buff">💎 버프</button>
    `;
    panel.appendChild(tabBar);

    // 강화 탭
    var enhanceTab = document.createElement('div');
    enhanceTab.className = 'shop-tab-content';
    enhanceTab.id = 'shop-tab-enhance';

    var upgrades = [
      { key: 'atk',        icon: '⚔',  name: 'ATK' },
      { key: 'def',        icon: '🛡',  name: 'DEF' },
      { key: 'hp',         icon: '❤',  name: 'HP' },
      { key: 'spd',        icon: '⚡',  name: 'SPD' },
      { key: 'critChance', icon: '💫',  name: 'CRIT' },
      { key: 'goldBonus',  icon: '💰',  name: 'GOLD' }
    ];

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
          self._updateShopPanel();
          self._updateStatBar();
          self._updateHPBars();
          self._updateEquipmentSlots();
        }
      };
      enhanceTab.appendChild(btn);
    });
    panel.appendChild(enhanceTab);

    // 소모품 탭
    var consumableTab = document.createElement('div');
    consumableTab.className = 'shop-tab-content';
    consumableTab.id = 'shop-tab-consumable';
    consumableTab.style.display = 'none';

    if (typeof ShopSystem !== 'undefined') {
      ShopSystem.CONSUMABLES.forEach(function(def) {
        var btn = document.createElement('div');
        btn.className = 'consumable-btn';
        btn.id = 'cons-' + def.id;
        btn.innerHTML = `
          <div class="cons-icon">${def.icon}</div>
          <div class="cons-name">${def.name}</div>
          <div class="cons-stack" id="cons-stack-${def.id}">0</div>
          <div class="cons-price" id="cons-price-${def.id}">💰 0</div>
          <div class="buff-timer-overlay" id="cons-timer-${def.id}" style="display:none"></div>
        `;
        btn.title = def.desc + '\n좌클릭: 구매 / 우클릭: 사용';
        btn.onclick = function() { self._handleConsumableBuy(def.id); };
        btn.oncontextmenu = function(e) { e.preventDefault(); self._handleConsumableUse(def.id); };
        consumableTab.appendChild(btn);
      });
    }
    panel.appendChild(consumableTab);

    // 버프 탭 (영혼석 상점)
    var buffTab = document.createElement('div');
    buffTab.className = 'shop-tab-content';
    buffTab.id = 'shop-tab-buff';
    buffTab.style.display = 'none';
    buffTab.innerHTML = `
      <div id="buff-tab-header">
        <span id="buff-soul-count">💎 0개</span>
        <span id="buff-prestige-count">환생 0회</span>
      </div>
      <div id="buff-tab-grid"></div>
    `;
    panel.appendChild(buffTab);

    overlay.appendChild(panel);

    // 탭 클릭 이벤트
    panel.querySelectorAll('.shop-tab').forEach(function(tab) {
      tab.onclick = function() {
        var tabKey = tab.id.replace('stab-', '');
        self._openShopTab(tabKey);
      };
    });
  }

  _openShopTab(tabKey) {
    var panel = document.getElementById('shop-panel');
    if (!panel) return;
    panel.querySelectorAll('.shop-tab').forEach(function(t) { t.classList.remove('active'); });
    panel.querySelectorAll('.shop-tab-content').forEach(function(c) { c.style.display = 'none'; });
    var tabBtn = document.getElementById('stab-' + tabKey);
    if (tabBtn) tabBtn.classList.add('active');
    var content = document.getElementById('shop-tab-' + tabKey);
    if (content) content.style.display = '';
    if (tabKey === 'buff') this._refreshSoulShop();
  }

  _handleConsumableBuy(id) {
    if (typeof ShopSystem === 'undefined') return;
    ShopSystem.buyConsumable(id);
    this._updateShopPanel();
  }

  _handleConsumableUse(id) {
    if (typeof ShopSystem === 'undefined') return;
    ShopSystem.useConsumable(id);
    this._updateShopPanel();
    this._updateHPBars();
  }

  // ===== 장비 슬롯 패널 빌드 =====
  _buildEquipmentPanel() {
    if (typeof EquipmentSystem === 'undefined') return;
    var overlay = document.getElementById('ui-overlay');
    var self = this;

    var slotDefs = [
      { slot: 'weapon', icon: '⚔️' },
      { slot: 'armor',  icon: '🛡️' },
      { slot: 'ring',   icon: '💍' }
    ];

    var panel = document.createElement('div');
    panel.id = 'equip-panel';

    slotDefs.forEach(function(def) {
      var slotEl = document.createElement('div');
      slotEl.className = 'equip-slot';
      slotEl.id = 'equip-' + def.slot;
      slotEl.dataset.slot = def.slot;
      slotEl.innerHTML = `<div class="equip-slot-icon">${def.icon}</div><div class="equip-slot-name">비어있음</div>`;

      slotEl.onclick = function() {
        self._openInventory(def.slot);
      };

      panel.appendChild(slotEl);
    });

    // 펫 슬롯
    var petSlot = document.createElement('div');
    petSlot.id = 'pet-slot';
    petSlot.innerHTML = '<div class="pet-slot-icon">🐾</div><div class="pet-slot-name">펫</div>';
    petSlot.onclick = function() {
      self._openPetModal();
    };
    panel.appendChild(petSlot);

    overlay.appendChild(panel);
  }

  _updateEquipmentSlots() {
    if (typeof EquipmentSystem === 'undefined') return;

    var slots = ['weapon', 'armor', 'ring'];
    var gradeColors = EquipmentSystem.GRADE_COLORS;

    slots.forEach(function(slot) {
      var slotEl = document.getElementById('equip-' + slot);
      if (!slotEl) return;

      var item = GameState.equipment.equipped[slot];
      var iconEl = slotEl.querySelector('.equip-slot-icon');
      var nameEl = slotEl.querySelector('.equip-slot-name');
      var slotIcons = { weapon: '⚔️', armor: '🛡️', ring: '💍' };

      if (item) {
        slotEl.style.borderColor = gradeColors[item.grade];
        slotEl.style.boxShadow = '0 0 6px ' + gradeColors[item.grade] + '66';
        if (iconEl) iconEl.textContent = slotIcons[slot];
        if (nameEl) {
          nameEl.textContent = item.level > 0 ? '+' + item.level + ' ' + item.name : item.name;
          nameEl.style.color = gradeColors[item.grade];
        }
      } else {
        slotEl.style.borderColor = '';
        slotEl.style.boxShadow = '';
        if (iconEl) iconEl.textContent = slotIcons[slot];
        if (nameEl) {
          nameEl.textContent = '비어있음';
          nameEl.style.color = '';
        }
      }
    });
  }

  // ===== 인벤토리 패널 빌드 =====
  _buildInventoryPanel() {
    if (typeof EquipmentSystem === 'undefined') return;
    var overlay = document.getElementById('ui-overlay');
    var self = this;

    var panel = document.createElement('div');
    panel.id = 'inventory-panel';
    panel.innerHTML = `
      <div class="inv-header">
        <h3>인벤토리</h3>
        <button id="inventory-close">✕</button>
      </div>
      <div id="inventory-grid"></div>
      <div id="item-detail">
        <div id="item-detail-content">아이템을 선택하세요</div>
        <div id="item-detail-actions"></div>
      </div>
    `;
    overlay.appendChild(panel);

    document.getElementById('inventory-close').onclick = function() {
      panel.classList.remove('visible');
      self._selectedItemId = null;
    };
  }

  _openInventory(focusSlot) {
    if (typeof EquipmentSystem === 'undefined') return;
    var panel = document.getElementById('inventory-panel');
    if (!panel) return;

    this._invFocusSlot = focusSlot;
    this._selectedItemId = null;
    this._refreshInventory();
    panel.classList.add('visible');
  }

  _refreshInventory() {
    var self = this;
    var grid = document.getElementById('inventory-grid');
    var detailContent = document.getElementById('item-detail-content');
    var detailActions = document.getElementById('item-detail-actions');
    if (!grid) return;

    grid.innerHTML = '';
    var inv = GameState.equipment.inventory;
    var gradeColors = EquipmentSystem.GRADE_COLORS;
    var slotIcons = { weapon: '⚔️', armor: '🛡️', ring: '💍' };

    inv.forEach(function(item) {
      var cell = document.createElement('div');
      cell.className = 'inv-cell';
      cell.style.borderColor = gradeColors[item.grade];
      cell.style.background = gradeColors[item.grade] + '22';
      cell.innerHTML = `
        <div class="inv-cell-icon">${slotIcons[item.slot]}</div>
        <div class="inv-cell-name" style="color:${gradeColors[item.grade]}">${item.level > 0 ? '+' + item.level + ' ' : ''}${item.name}</div>
      `;
      cell.onclick = function() {
        self._selectedItemId = item.id;
        self._showItemDetail(item);
        grid.querySelectorAll('.inv-cell').forEach(function(c) { c.classList.remove('selected'); });
        cell.classList.add('selected');
      };
      grid.appendChild(cell);
    });

    var maxSlots = 20;
    for (var i = inv.length; i < maxSlots; i++) {
      var empty = document.createElement('div');
      empty.className = 'inv-cell empty';
      grid.appendChild(empty);
    }

    if (!self._selectedItemId) {
      if (detailContent) detailContent.textContent = '아이템을 선택하세요';
      if (detailActions) detailActions.innerHTML = '';
    }
  }

  _showItemDetail(item) {
    var self = this;
    var detailContent = document.getElementById('item-detail-content');
    var detailActions = document.getElementById('item-detail-actions');
    if (!detailContent) return;

    var gradeColors = EquipmentSystem.GRADE_COLORS;
    var gradeNames = { common: '일반', rare: '희귀', hero: '영웅', legend: '전설' };
    var stats = item.stats;
    var statLines = [];
    if (stats.atk)       statLines.push('ATK +' + stats.atk);
    if (stats.def)       statLines.push('DEF +' + stats.def);
    if (stats.hp)        statLines.push('HP +' + stats.hp);
    if (stats.critChance) statLines.push('CRIT +' + Math.floor(stats.critChance * 100) + '%');
    if (stats.goldBonus)  statLines.push('GOLD +' + Math.floor(stats.goldBonus * 100) + '%');

    var enhanceCost = EquipmentSystem.getEnhanceCost(item);
    var sellPrice   = EquipmentSystem.getSellPrice(item);

    detailContent.innerHTML = `
      <div style="color:${gradeColors[item.grade]};font-weight:700;">[${gradeNames[item.grade]}] ${item.level > 0 ? '+' + item.level + ' ' : ''}${item.name}</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.5);margin:4px 0">${item.slot === 'weapon' ? '무기' : item.slot === 'armor' ? '방어구' : '반지'}</div>
      <div style="font-size:12px;color:#4ecdc4">${statLines.join(' / ')}</div>
    `;

    detailActions.innerHTML = '';

    var equipBtn = document.createElement('button');
    equipBtn.className = 'inv-action-btn';
    equipBtn.textContent = '장착';
    equipBtn.onclick = function() {
      EquipmentSystem.equip(item);
      UpgradeSystem.recalculateStats();
      self._selectedItemId = null;
      self._refreshInventory();
      self._updateEquipmentSlots();
      document.getElementById('item-detail-content').textContent = '아이템을 선택하세요';
      document.getElementById('item-detail-actions').innerHTML = '';
    };
    detailActions.appendChild(equipBtn);

    if (item.level < 10) {
      var enhanceBtn = document.createElement('button');
      enhanceBtn.className = 'inv-action-btn';
      enhanceBtn.textContent = '강화 💰' + formatNumber(enhanceCost);
      enhanceBtn.disabled = GameState.hero.gold < enhanceCost;
      enhanceBtn.onclick = function() {
        if (EquipmentSystem.enhance(item.id)) {
          UpgradeSystem.recalculateStats();
          self._refreshInventory();
          self._updateEquipmentSlots();
          var updated = GameState.equipment.inventory.find(function(i) { return i.id === item.id; });
          if (updated) self._showItemDetail(updated);
        }
      };
      detailActions.appendChild(enhanceBtn);
    }

    var sellBtn = document.createElement('button');
    sellBtn.className = 'inv-action-btn sell';
    sellBtn.textContent = '판매 💰' + formatNumber(sellPrice);
    sellBtn.onclick = function() {
      EquipmentSystem.sell(item.id);
      self._selectedItemId = null;
      self._refreshInventory();
      document.getElementById('item-detail-content').textContent = '아이템을 선택하세요';
      document.getElementById('item-detail-actions').innerHTML = '';
    };
    detailActions.appendChild(sellBtn);
  }

  showDropToast(item) {
    var overlay = document.getElementById('ui-overlay');
    var gradeColors = EquipmentSystem.GRADE_COLORS;
    var gradeNames = { common: '일반', rare: '희귀', hero: '영웅', legend: '전설' };
    var slotIcons = { weapon: '⚔️', armor: '🛡️', ring: '💍' };

    var toast = document.createElement('div');
    toast.className = 'drop-toast';
    toast.style.borderColor = gradeColors[item.grade];
    toast.style.color = gradeColors[item.grade];
    toast.innerHTML = slotIcons[item.slot] + ' [' + gradeNames[item.grade] + '] ' + item.name + ' 획득!';
    overlay.appendChild(toast);

    setTimeout(function() { toast.classList.add('visible'); }, 10);
    setTimeout(function() {
      toast.classList.remove('visible');
      setTimeout(function() { toast.remove(); }, 400);
    }, 3000);
  }

  // ===== 세팅 패널 빌드 (탭: 설정 / 업적 / 통계) =====
  _buildSettingsPanel() {
    var overlay = document.getElementById('ui-overlay');
    var self = this;

    var panel = document.createElement('div');
    panel.id = 'settings-panel';
    panel.innerHTML = `
      <button id="settings-close">✕</button>
      <div class="settings-tabs-row">
        <button class="settings-tab active" id="stab-config">설정</button>
        <button class="settings-tab" id="stab-achieve">업적</button>
        <button class="settings-tab" id="stab-stats">통계</button>
      </div>
      <div id="stab-pane-config">
        <div class="settings-row">
          <button class="settings-btn" id="btn-manual-save">💾 지금 저장</button>
          <button class="settings-btn danger" id="btn-reset">🗑️ 활성 슬롯 초기화</button>
          <button class="settings-btn danger" id="btn-reset-all">🗑️ 전체 슬롯 초기화</button>
        </div>
        <div id="settings-info">
          총 플레이: <span id="info-playtime">0분</span><br>
          총 킬: <span id="info-kills">0</span><br>
          총 골드: <span id="info-gold">0</span><br>
          환생 횟수: <span id="info-prestige">0</span>회<br>
          영혼석: <span id="info-souls">0</span>개
        </div>
        <div id="save-slot-section">
          <div class="slot-section-title">📁 세이브 슬롯</div>
          <div id="save-slot-list"></div>
          <div class="slot-section-title" style="margin-top:10px">📤 내보내기 / 📥 가져오기</div>
          <div class="slot-io-row">
            <select id="slot-io-select" class="slot-select">
              <option value="1">슬롯 1</option>
              <option value="2">슬롯 2</option>
              <option value="3">슬롯 3</option>
            </select>
            <button class="settings-btn slot-io-btn" id="btn-export-slot">내보내기</button>
            <button class="settings-btn slot-io-btn" id="btn-import-slot">가져오기</button>
          </div>
        </div>
      </div>
      <div id="stab-pane-achieve" style="display:none">
        <div id="achieve-progress-outer">
          <div id="achieve-progress-text">0 / 30</div>
          <div id="achieve-progress-bar-bg"><div id="achieve-progress-fill" style="width:0%"></div></div>
        </div>
        <div id="achieve-filter-row">
          <button class="achieve-filter-btn active" data-cat="all">전체</button>
          <button class="achieve-filter-btn" data-cat="kill">처치</button>
          <button class="achieve-filter-btn" data-cat="gold">골드</button>
          <button class="achieve-filter-btn" data-cat="stage">스테이지</button>
          <button class="achieve-filter-btn" data-cat="other">기타</button>
          <button class="achieve-filter-btn" data-cat="secret">비밀</button>
        </div>
        <div id="achieve-list"></div>
      </div>
      <div id="stab-pane-stats" style="display:none">
        <div id="stats-content"></div>
      </div>
    `;
    overlay.appendChild(panel);

    // 닫기 버튼
    document.getElementById('settings-close').onclick = function() {
      panel.classList.remove('visible');
      // 통계 탭 인터벌 클리어
      if (self._statsRefreshTimer) {
        clearInterval(self._statsRefreshTimer);
        self._statsRefreshTimer = null;
      }
    };

    // 탭 전환 핸들러
    var switchTab = function(tabKey) {
      self._activeSettingsTab = tabKey;
      panel.querySelectorAll('.settings-tab').forEach(function(t) { t.classList.remove('active'); });
      var tabBtn = document.getElementById('stab-' + tabKey);
      if (tabBtn) tabBtn.classList.add('active');
      document.getElementById('stab-pane-config').style.display  = tabKey === 'config'  ? '' : 'none';
      document.getElementById('stab-pane-achieve').style.display = tabKey === 'achieve' ? '' : 'none';
      document.getElementById('stab-pane-stats').style.display   = tabKey === 'stats'   ? '' : 'none';

      if (tabKey === 'achieve') {
        self._refreshAchievements(self._achieveFilter);
      }
      if (tabKey === 'stats') {
        self._refreshStatsPanel();
        if (!self._statsRefreshTimer) {
          self._statsRefreshTimer = setInterval(function() {
            if (self._activeSettingsTab === 'stats') self._refreshStatsPanel();
          }, 200);
        }
      } else {
        if (self._statsRefreshTimer) {
          clearInterval(self._statsRefreshTimer);
          self._statsRefreshTimer = null;
        }
      }
      if (tabKey === 'config') {
        self._refreshSaveSlots();
      }
    };

    document.getElementById('stab-config').onclick  = function() { switchTab('config'); };
    document.getElementById('stab-achieve').onclick = function() { switchTab('achieve'); };
    document.getElementById('stab-stats').onclick   = function() { switchTab('stats'); };

    // 카테고리 필터
    panel.querySelectorAll('.achieve-filter-btn').forEach(function(btn) {
      btn.onclick = function() {
        panel.querySelectorAll('.achieve-filter-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        self._achieveFilter = btn.dataset.cat;
        self._refreshAchievements(self._achieveFilter);
      };
    });

    // 저장 / 초기화
    document.getElementById('btn-manual-save').onclick = function() {
      SaveSystem.save();
      var btn = document.getElementById('btn-manual-save');
      btn.textContent = '✅ 저장됨!';
      setTimeout(function() { btn.textContent = '💾 지금 저장'; }, 1500);
    };

    document.getElementById('btn-reset').onclick = function() {
      if (confirm('활성 슬롯의 데이터가 삭제됩니다. 정말 초기화하시겠습니까?')) {
        SaveSystem.resetSave(false);
      }
    };

    document.getElementById('btn-reset-all').onclick = function() {
      if (confirm('모든 슬롯의 데이터가 삭제됩니다. 정말 초기화하시겠습니까?')) {
        SaveSystem.resetSave(true);
      }
    };

    // 내보내기
    document.getElementById('btn-export-slot').onclick = function() {
      var n = parseInt(document.getElementById('slot-io-select').value);
      var b64 = SaveSlotManager.exportSlot(n);
      if (!b64) {
        alert('슬롯 ' + n + '에 저장된 데이터가 없습니다.');
        return;
      }
      self._showExportModal(b64, n);
    };

    // 가져오기
    document.getElementById('btn-import-slot').onclick = function() {
      var n = parseInt(document.getElementById('slot-io-select').value);
      self._showImportModal(n);
    };

    // 초기 슬롯 표시
    this._refreshSaveSlots();
  }

  _refreshSaveSlots() {
    var list = document.getElementById('save-slot-list');
    if (!list || typeof SaveSlotManager === 'undefined') return;
    var self = this;
    var metas = SaveSlotManager.getAllSlotsMeta();
    var activeSlot = SaveSlotManager.getActiveSlot();

    list.innerHTML = '';
    metas.forEach(function(meta) {
      var isActive = meta.slot === activeSlot;
      var card = document.createElement('div');
      card.className = 'save-slot-card' + (isActive ? ' save-slot-active' : '');

      var lastSaveStr = '';
      if (!meta.isEmpty && meta.lastSaveTime) {
        var diff = Math.floor((Date.now() - meta.lastSaveTime) / 1000);
        if (diff < 60) lastSaveStr = diff + '초 전';
        else if (diff < 3600) lastSaveStr = Math.floor(diff / 60) + '분 전';
        else lastSaveStr = Math.floor(diff / 3600) + '시간 전';
      }

      var playTimeStr = '';
      if (!meta.isEmpty) {
        var mins = Math.floor((meta.totalPlayTime || 0) / 60);
        playTimeStr = mins + '분';
      }

      card.innerHTML = `
        <div class="slot-card-header">
          <span class="slot-card-num">슬롯 ${meta.slot}</span>
          ${isActive ? '<span class="slot-active-badge">● 활성</span>' : ''}
        </div>
        ${meta.isEmpty
          ? '<div class="slot-card-empty">비어있음</div>'
          : `<div class="slot-card-info">
               Lv.${meta.heroLevel} · 스테이지 ${meta.stage} · 환생 ${meta.prestigeCount}회<br>
               플레이 ${playTimeStr} · ${lastSaveStr} 저장
             </div>`
        }
        <div class="slot-card-btns">
          ${!isActive ? '<button class="slot-btn slot-btn-load" data-slot="' + meta.slot + '">불러오기</button>' : ''}
          ${!meta.isEmpty ? '<button class="slot-btn slot-btn-copy" data-slot="' + meta.slot + '">복사</button>' : ''}
          ${!meta.isEmpty ? '<button class="slot-btn slot-btn-del" data-slot="' + meta.slot + '">삭제</button>' : ''}
        </div>
      `;
      list.appendChild(card);
    });

    // 버튼 이벤트
    list.querySelectorAll('.slot-btn-load').forEach(function(btn) {
      btn.onclick = function() {
        var n = parseInt(this.dataset.slot);
        if (confirm('슬롯 ' + n + '을 불러오시겠습니까? 현재 진행 중인 내용은 저장 후 이동됩니다.')) {
          SaveSystem.save();
          SaveSlotManager.setActiveSlot(n);
          window.location.reload();
        }
      };
    });

    list.querySelectorAll('.slot-btn-copy').forEach(function(btn) {
      btn.onclick = function() {
        var from = parseInt(this.dataset.slot);
        var targets = [1, 2, 3].filter(function(n) { return n !== from; });
        var targetStr = targets.map(function(n) { return n + '번 슬롯'; }).join(' / ');
        var answer = prompt('복사할 대상 슬롯 번호를 입력하세요 (' + targetStr + '):');
        var to = parseInt(answer);
        if (targets.indexOf(to) < 0) { alert('유효하지 않은 슬롯 번호입니다.'); return; }
        var meta = SaveSlotManager.getSlotMeta(to);
        if (!meta.isEmpty && !confirm('슬롯 ' + to + '에 이미 데이터가 있습니다. 덮어쓰시겠습니까?')) return;
        if (SaveSlotManager.copySlot(from, to)) {
          alert('슬롯 ' + from + ' → 슬롯 ' + to + ' 복사 완료!');
          self._refreshSaveSlots();
        }
      };
    });

    list.querySelectorAll('.slot-btn-del').forEach(function(btn) {
      btn.onclick = function() {
        var n = parseInt(this.dataset.slot);
        if (confirm('슬롯 ' + n + '의 데이터를 삭제하시겠습니까?')) {
          SaveSlotManager.deleteSlot(n);
          self._refreshSaveSlots();
        }
      };
    });
  }

  _showExportModal(b64, slotNum) {
    var overlay = document.getElementById('ui-overlay');
    var modal = document.createElement('div');
    modal.className = 'export-modal';
    modal.innerHTML = `
      <button class="export-modal-close">✕</button>
      <div class="export-modal-title">슬롯 ${slotNum} 내보내기</div>
      <textarea class="export-textarea" readonly>${b64}</textarea>
      <button class="export-copy-btn">클립보드에 복사</button>
      <div class="export-hint">위 텍스트를 복사하여 다른 기기에서 가져오기에 붙여넣으세요.</div>
    `;
    overlay.appendChild(modal);

    modal.querySelector('.export-modal-close').onclick = function() { modal.remove(); };
    modal.querySelector('.export-copy-btn').onclick = function() {
      var ta = modal.querySelector('.export-textarea');
      ta.select();
      try {
        navigator.clipboard.writeText(ta.value).then(function() {
          modal.querySelector('.export-copy-btn').textContent = '복사 완료!';
        }).catch(function() {
          document.execCommand('copy');
          modal.querySelector('.export-copy-btn').textContent = '복사 완료!';
        });
      } catch(e) {
        document.execCommand('copy');
        modal.querySelector('.export-copy-btn').textContent = '복사 완료!';
      }
    };
  }

  _showImportModal(slotNum) {
    var overlay = document.getElementById('ui-overlay');
    var modal = document.createElement('div');
    modal.className = 'export-modal';
    modal.innerHTML = `
      <button class="export-modal-close">✕</button>
      <div class="export-modal-title">슬롯 ${slotNum}에 가져오기</div>
      <textarea class="export-textarea" placeholder="내보내기 텍스트를 붙여넣으세요..."></textarea>
      <button class="export-copy-btn">가져오기</button>
      <div class="export-hint">가져오기 후 페이지를 새로고침해야 적용됩니다.</div>
    `;
    overlay.appendChild(modal);

    modal.querySelector('.export-modal-close').onclick = function() { modal.remove(); };
    modal.querySelector('.export-copy-btn').onclick = function() {
      var txt = modal.querySelector('.export-textarea').value.trim();
      if (!txt) { alert('텍스트를 입력해주세요.'); return; }
      var err = SaveSlotManager.importSlot(txt, slotNum);
      if (err) {
        alert('가져오기 실패: ' + err);
      } else {
        alert('슬롯 ' + slotNum + '에 데이터를 가져왔습니다. 불러오기를 하려면 설정에서 슬롯을 불러오세요.');
        modal.remove();
      }
    };
  }

  // ===== 통계 탭 =====
  _refreshStatsPanel() {
    var container = document.getElementById('stats-content');
    if (!container || typeof StatsTracker === 'undefined') return;

    var rt = StatsTracker.getRealtime();
    var sess = StatsTracker.getSession();
    var lt = StatsTracker.getLifetime();
    var hist = StatsTracker.getStageHistory();

    var sessionMins = Math.floor((Date.now() - sess.startTime) / 60000);
    var sessionH = Math.floor(sessionMins / 60);
    var sessionM = sessionMins % 60;
    var sessionStr = (sessionH > 0 ? sessionH + '시간 ' : '') + sessionM + '분';

    var fastestStr = sess.fastestStageTime === Infinity ? '-' : (sess.fastestStageTime / 1000).toFixed(1) + '초';
    var survStr = rt.survivability >= 999 ? '무적' : rt.survivability + '초';
    var dpsGrade = this._getDpsGrade(rt.dps);
    var avgClear5  = StatsTracker.getAverageStageClearTime(5);
    var avgClear10 = StatsTracker.getAverageStageClearTime(10);
    var chart = this._buildAsciiChart(hist);

    container.innerHTML = `
      <div class="stats-section">
        <div class="stats-section-title">⚡ 실시간</div>
        <div class="stats-grid">
          <div class="stats-item"><div class="stats-label">DPS</div><div class="stats-val dps-val">${formatNumber(rt.dps)} <span class="dps-grade ${dpsGrade.cls}">${dpsGrade.label}</span></div></div>
          <div class="stats-item"><div class="stats-label">유효 DPS</div><div class="stats-val">${formatNumber(rt.effectiveAtk)}</div></div>
          <div class="stats-item"><div class="stats-label">골드/분</div><div class="stats-val">${formatNumber(rt.goldPerMin)}</div></div>
          <div class="stats-item"><div class="stats-label">킬/분</div><div class="stats-val">${rt.killsPerMin}</div></div>
          <div class="stats-item"><div class="stats-label">생존지수</div><div class="stats-val">${survStr}</div></div>
        </div>
      </div>
      <div class="stats-section">
        <div class="stats-section-title">📊 이번 세션 (${sessionStr})</div>
        <div class="stats-grid">
          <div class="stats-item"><div class="stats-label">킬</div><div class="stats-val">${formatNumber(sess.kills)}</div></div>
          <div class="stats-item"><div class="stats-label">골드</div><div class="stats-val">${formatNumber(sess.goldEarned)}</div></div>
          <div class="stats-item"><div class="stats-label">스테이지</div><div class="stats-val">${sess.stagesCleared}</div></div>
          <div class="stats-item"><div class="stats-label">장비 드롭</div><div class="stats-val">${sess.equipmentDropped}</div></div>
          <div class="stats-item"><div class="stats-label">스킬 발동</div><div class="stats-val">${sess.skillActivations}</div></div>
          <div class="stats-item"><div class="stats-label">최고 DPS</div><div class="stats-val">${formatNumber(sess.highestDps)}</div></div>
        </div>
      </div>
      <div class="stats-section">
        <div class="stats-section-title">🏆 누적 전체</div>
        <div class="stats-grid">
          <div class="stats-item"><div class="stats-label">총 킬</div><div class="stats-val">${lt ? formatNumber(lt.totalKills) : 0}</div></div>
          <div class="stats-item"><div class="stats-label">총 데미지</div><div class="stats-val">${lt ? formatNumber(lt.totalDamageDealt) : 0}</div></div>
          <div class="stats-item"><div class="stats-label">총 피해</div><div class="stats-val">${lt ? formatNumber(lt.totalDamageTaken) : 0}</div></div>
          <div class="stats-item"><div class="stats-label">총 사망</div><div class="stats-val">${lt ? lt.totalDeaths : 0}</div></div>
          <div class="stats-item"><div class="stats-label">크리티컬</div><div class="stats-val">${lt ? formatNumber(lt.totalCrits) : 0}</div></div>
          <div class="stats-item"><div class="stats-label">최고 스테이지</div><div class="stats-val">${lt ? lt.highestStage : 0}</div></div>
          <div class="stats-item"><div class="stats-label">최고 레벨</div><div class="stats-val">${lt ? lt.highestLevel : 0}</div></div>
          <div class="stats-item"><div class="stats-label">역대 최고 DPS</div><div class="stats-val">${lt ? formatNumber(lt.peakDps) : 0}</div></div>
        </div>
      </div>
      <div class="stats-section">
        <div class="stats-section-title">📈 스테이지 클리어 속도</div>
        <div class="stats-clear-times">
          <span>평균(최근 5개): ${avgClear5 > 0 ? (avgClear5/1000).toFixed(1) + '초' : '-'}</span>
          <span>평균(최근 10개): ${avgClear10 > 0 ? (avgClear10/1000).toFixed(1) + '초' : '-'}</span>
          <span>최속: ${fastestStr}</span>
        </div>
        <div class="stats-chart-container" id="stats-chart">${chart}</div>
      </div>
    `;

    // 차트 툴팁 등록
    var chartEl = document.getElementById('stats-chart');
    if (chartEl) {
      chartEl.querySelectorAll('.chart-bar').forEach(function(bar) {
        bar.title = bar.dataset.tip || '';
      });
    }
  }

  _getDpsGrade(dps) {
    if (dps < 1000)    return { label: 'BRONZE', cls: 'grade-bronze' };
    if (dps < 10000)   return { label: 'SILVER', cls: 'grade-silver' };
    if (dps < 100000)  return { label: 'GOLD',   cls: 'grade-gold' };
    if (dps < 1000000) return { label: 'PLAT',   cls: 'grade-plat' };
    return { label: 'DIAMOND', cls: 'grade-diamond' };
  }

  _buildAsciiChart(hist) {
    if (!hist || hist.length === 0) {
      return '<span style="color:rgba(255,255,255,0.3)">클리어 기록 없음</span>';
    }
    var bars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    var times = hist.map(function(h) { return h.clearTime; });
    var maxT = Math.max.apply(null, times);
    var minT = Math.min.apply(null, times);
    var range = maxT - minT || 1;

    var html = '';
    // 역순으로 표시 (오래된 것부터)
    for (var i = hist.length - 1; i >= 0; i--) {
      var t = hist[i].clearTime;
      var idx = Math.round((t - minT) / range * (bars.length - 1));
      var barChar = bars[idx];
      var tipText = '스테이지 ' + hist[i].stage + ': ' + (t / 1000).toFixed(1) + '초';
      html += '<span class="chart-bar" data-tip="' + tipText + '" title="' + tipText + '">' + barChar + '</span>';
    }
    return html;
  }

  // ===== DPS 미니 위젯 =====
  _buildDpsWidget() {
    var overlay = document.getElementById('ui-overlay');
    var self = this;

    var widget = document.createElement('div');
    widget.id = 'dps-widget';
    widget.innerHTML = `
      <div id="dps-widget-toggle">DPS</div>
      <div id="dps-widget-body" style="display:none">
        <div class="dps-row"><span class="dps-lbl">DPS</span><span class="dps-num" id="dw-dps">0</span></div>
        <div class="dps-row"><span class="dps-lbl">골드/분</span><span class="dps-num" id="dw-gold">0</span></div>
        <div class="dps-row"><span class="dps-lbl">킬/분</span><span class="dps-num" id="dw-kill">0</span></div>
      </div>
    `;
    overlay.appendChild(widget);

    document.getElementById('dps-widget-toggle').onclick = function() {
      self._dpsWidgetOpen = !self._dpsWidgetOpen;
      var body = document.getElementById('dps-widget-body');
      if (body) body.style.display = self._dpsWidgetOpen ? '' : 'none';
      widget.classList.toggle('dps-widget-open', self._dpsWidgetOpen);
    };
  }

  _updateDpsWidget() {
    if (!this._dpsWidgetOpen || typeof StatsTracker === 'undefined') return;
    var rt = StatsTracker.getRealtime();
    var dpEl = document.getElementById('dw-dps');
    var gEl  = document.getElementById('dw-gold');
    var kEl  = document.getElementById('dw-kill');
    if (dpEl) dpEl.textContent = formatNumber(rt.dps);
    if (gEl)  gEl.textContent  = formatNumber(rt.goldPerMin);
    if (kEl)  kEl.textContent  = rt.killsPerMin;
  }

  _refreshAchievements(filter) {
    if (typeof AchievementSystem === 'undefined') return;
    var list = document.getElementById('achieve-list');
    if (!list) return;

    var progress = AchievementSystem.getProgress();
    var fillEl = document.getElementById('achieve-progress-fill');
    var textEl = document.getElementById('achieve-progress-text');
    if (fillEl) fillEl.style.width = (progress.unlocked / progress.total * 100) + '%';
    if (textEl) textEl.textContent = progress.unlocked + ' / ' + progress.total;

    list.innerHTML = '';
    var achievements = AchievementSystem.ACHIEVEMENTS;
    for (var i = 0; i < achievements.length; i++) {
      var ach = achievements[i];
      if (filter !== 'all' && ach.cat !== filter) continue;

      var isUnlocked = GameState.achievements.unlocked.indexOf(ach.id) >= 0;
      var isSecret = ach.secret && !isUnlocked;

      var item = document.createElement('div');
      item.className = 'achieve-item' + (isUnlocked ? ' unlocked' : '') + (isSecret ? ' secret' : '');

      var rewardText = this._getRewardText(ach.reward);
      item.innerHTML = `
        <span class="achieve-icon">${isUnlocked ? '✅' : (isSecret ? '🔒' : '🔒')}</span>
        <div class="achieve-info">
          <div class="achieve-name">${isSecret ? '???' : ach.name}</div>
          <div class="achieve-cond">${isSecret ? '???' : ach.cond}</div>
          <div class="achieve-reward">${rewardText}</div>
        </div>
      `;
      list.appendChild(item);
    }
  }

  _getRewardText(reward) {
    if (!reward) return '';
    var parts = [];
    if (reward.atk)         parts.push('ATK +' + reward.atk);
    if (reward.def)         parts.push('DEF +' + reward.def);
    if (reward.maxHp)       parts.push('MaxHP +' + reward.maxHp);
    if (reward.spd)         parts.push('SPD +' + reward.spd);
    if (reward.critPct)     parts.push('CRIT +' + reward.critPct + '%');
    if (reward.goldPct)     parts.push('골드 +' + reward.goldPct + '%');
    if (reward.expPct)      parts.push('EXP +' + reward.expPct + '%');
    if (reward.statPct)     parts.push('전체 스탯 +' + reward.statPct + '%');
    if (reward.cooldownPct) parts.push('쿨타임 -' + reward.cooldownPct + '%');
    if (reward.soulStones)  parts.push('💎 +' + reward.soulStones);
    return parts.length ? '보상: ' + parts.join(', ') : '';
  }

  // ===== 프레스티지 UI =====
  _buildPrestigeUI() {
    if (typeof PrestigeSystem === 'undefined') return;
    var overlay = document.getElementById('ui-overlay');
    var self = this;

    // 환생 확인 모달
    var confirmModal = document.createElement('div');
    confirmModal.id = 'prestige-modal';
    confirmModal.innerHTML = `
      <h2>💀 환생</h2>
      <div class="prestige-info">
        <div class="prestige-row"><span>현재 스테이지</span><span id="pm-stage">1</span></div>
        <div class="prestige-row"><span>획득 영혼석</span><span id="pm-stones" style="color:#a78bfa">💎 0개</span></div>
      </div>
      <div class="prestige-warn">
        ⚠️ 초기화: 레벨, 골드, 업그레이드, 스킬, 장비<br>
        유지: 영혼석, 영구 버프, 업적
      </div>
      <div class="prestige-modal-btns">
        <button id="pm-confirm" class="pm-btn-do">환생하기</button>
        <button id="pm-cancel" class="pm-btn-cancel">취소</button>
      </div>
    `;
    overlay.appendChild(confirmModal);

    document.getElementById('pm-cancel').onclick = function() {
      confirmModal.classList.remove('visible');
    };
    document.getElementById('pm-confirm').onclick = function() {
      if (PrestigeSystem.doPrestige()) {
        confirmModal.classList.remove('visible');
        // 게임 씬에 스테이지 변경 알림 (배경 업데이트)
        var gameScene = self.scene.get ? self.scene.get('GameScene') : null;
        if (gameScene) {
          gameScene._updateBackground && gameScene._updateBackground();
          MonsterSystem.spawnMonster();
          gameScene._createMonster && gameScene._createMonster();
          if (typeof CombatSystem !== 'undefined') {
            CombatSystem.heroAttackTimer = 0;
            CombatSystem.monsterAttackTimer = 0;
          }
        }
        self._updateSoulBadge();
      }
    };

  }

  _openPrestigeConfirm() {
    if (typeof PrestigeSystem === 'undefined') return;
    var modal = document.getElementById('prestige-modal');
    if (!modal) return;

    var stageEl = document.getElementById('pm-stage');
    var stonesEl = document.getElementById('pm-stones');
    if (stageEl) stageEl.textContent = GameState.stage.current;
    if (stonesEl) stonesEl.textContent = '💎 ' + PrestigeSystem.getPrestigeReward() + '개';

    var confirmBtn = document.getElementById('pm-confirm');
    if (confirmBtn) {
      var canDo = PrestigeSystem.canPrestige();
      confirmBtn.disabled = !canDo;
      confirmBtn.title = canDo ? '' : '스테이지 20 이상 필요';
    }

    modal.classList.add('visible');
  }

  _refreshSoulShop() {
    if (typeof PrestigeSystem === 'undefined') return;
    var self = this;
    var grid = document.getElementById('buff-tab-grid');
    var countEl = document.getElementById('buff-soul-count');
    var prestigeEl = document.getElementById('buff-prestige-count');
    if (!grid) return;

    if (countEl) countEl.textContent = '💎 ' + (GameState.prestige.soulStones || 0) + '개';
    if (prestigeEl) prestigeEl.textContent = '환생 ' + (GameState.prestige.count || 0) + '회';

    grid.innerHTML = '';
    var keys = PrestigeSystem.BUFF_KEYS;
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var def = PrestigeSystem.BUFF_DEFS[key];
      var level = GameState.prestige.buffs[key] || 0;
      var isMax = level >= def.maxLevel;
      var cost = PrestigeSystem.getBuffCost(key);
      var canAfford = GameState.prestige.soulStones >= cost;

      var card = document.createElement('div');
      card.className = 'buff-card';

      card.innerHTML = `
        <div class="buff-card-icon">${def.icon}</div>
        <div class="buff-card-name">${def.name}</div>
        <div class="buff-card-level">Lv.${level} / ${def.maxLevel}</div>
        <div class="buff-card-desc">${def.desc}</div>
        <button class="buff-buy-btn ${isMax ? 'max' : (canAfford ? 'can-afford' : '')}"
          data-key="${key}" ${isMax ? 'disabled' : ''}>
          ${isMax ? 'MAX' : '💎 ' + cost}
        </button>
      `;

      var btn = card.querySelector('.buff-buy-btn');
      if (btn && !isMax) {
        btn.onclick = function() {
          var k = this.dataset.key;
          if (PrestigeSystem.buyBuff(k)) {
            self._refreshSoulShop();
            self._updateSoulBadge();
          }
        };
      }

      grid.appendChild(card);
    }
  }

  _updateSoulBadge() {
    var soulsEl = document.getElementById('hud-souls');
    var prestigeBtn = document.getElementById('prestige-btn');

    if (soulsEl && GameState.prestige) {
      if (GameState.prestige.count > 0) {
        soulsEl.style.display = '';
        var span = soulsEl.querySelector('span');
        if (span) span.textContent = GameState.prestige.soulStones;
      }
    }

    if (prestigeBtn && typeof PrestigeSystem !== 'undefined') {
      var canPrestige = PrestigeSystem.canPrestige();
      prestigeBtn.disabled = false;
      prestigeBtn.style.opacity = canPrestige ? '1' : '0.5';
      prestigeBtn.title = canPrestige ? '환생 가능!' : '환생 (스테이지 20 필요)';
    }
  }

  // ===== 업적 토스트 =====
  showAchievementToast(ach) {
    this._achieveToastQueue.push(ach);
    if (!this._achieveToastShowing) {
      this._showNextAchievementToast();
    }
  }

  _showNextAchievementToast() {
    if (this._achieveToastQueue.length === 0) {
      this._achieveToastShowing = false;
      return;
    }
    this._achieveToastShowing = true;
    var ach = this._achieveToastQueue.shift();
    var overlay = document.getElementById('ui-overlay');

    var toast = document.createElement('div');
    toast.className = 'achieve-toast';
    var rewardText = this._getRewardText(ach.reward);
    toast.innerHTML = `
      <div class="achieve-toast-title">🏆 업적 달성!</div>
      <div class="achieve-toast-name">${ach.name}</div>
      <div class="achieve-toast-reward">${rewardText}</div>
    `;
    overlay.appendChild(toast);

    var self = this;
    setTimeout(function() { toast.classList.add('visible'); }, 10);
    setTimeout(function() {
      toast.classList.remove('visible');
      setTimeout(function() {
        toast.remove();
        self._showNextAchievementToast();
      }, 400);
    }, 4000);
  }

  // ===== 퀘스트 완료 알림 =====
  showQuestComplete(quest) {
    var overlay = document.getElementById('ui-overlay');
    var rewardText = quest.reward === 'gold'
      ? '💰 ' + formatNumber(quest.rewardValue)
      : '✨ EXP +' + formatNumber(quest.rewardValue);

    var toast = document.createElement('div');
    toast.className = 'quest-complete-toast';
    toast.innerHTML = '✅ 퀘스트 완료! ' + rewardText;
    overlay.appendChild(toast);

    setTimeout(function() { toast.classList.add('visible'); }, 10);
    setTimeout(function() {
      toast.classList.remove('visible');
      setTimeout(function() { toast.remove(); }, 400);
    }, 2500);
  }

  // ===== 퀘스트 사이드바 =====
  _buildQuestSidebar() {
    if (typeof QuestSystem === 'undefined') return;
    var overlay = document.getElementById('ui-overlay');
    var self = this;

    var sidebar = document.createElement('div');
    sidebar.id = 'quest-sidebar';

    sidebar.innerHTML = `
      <div class="quest-sidebar-header">
        <span>퀘스트</span>
        <button id="quest-toggle">◀</button>
      </div>
      <div id="quest-sidebar-body">
        <div class="quest-section-title">─ 일일 퀘스트 ─</div>
        <div id="daily-reset-timer" class="quest-timer">00:00:00</div>
        <div id="daily-quest-list"></div>
        <div class="quest-section-title">─ 진행 중 ─</div>
        <div id="active-quest-list"></div>
      </div>
    `;
    overlay.appendChild(sidebar);

    document.getElementById('quest-toggle').onclick = function() {
      self._questSidebarOpen = !self._questSidebarOpen;
      var body = document.getElementById('quest-sidebar-body');
      var toggleBtn = document.getElementById('quest-toggle');
      if (self._questSidebarOpen) {
        body.style.display = '';
        sidebar.style.width = '178px';
        toggleBtn.textContent = '◀';
      } else {
        body.style.display = 'none';
        sidebar.style.width = '32px';
        toggleBtn.textContent = '▶';
      }
    };
  }

  _updateQuestSidebar() {
    if (typeof QuestSystem === 'undefined') return;
    if (!this._questSidebarOpen) return;

    // 일일 리셋 타이머
    var timerEl = document.getElementById('daily-reset-timer');
    if (timerEl) timerEl.textContent = QuestSystem.getTimeUntilReset();

    // 일일 퀘스트
    var dailyList = document.getElementById('daily-quest-list');
    if (dailyList) {
      dailyList.innerHTML = '';
      var self = this;
      var daily = GameState.quests.daily || [];
      daily.forEach(function(dq) {
        var item = document.createElement('div');
        item.className = 'quest-item' + (dq.completed ? ' quest-done' : '');
        var pct = dq.target > 0 ? Math.min(100, dq.current / dq.target * 100) : 0;
        var defItem = QuestSystem.DAILY_DEFS.find(function(d) { return d.id === dq.id; });
        var rewardText = defItem ? '💰' + formatNumber(defItem.reward.gold) + ' + 💎' + defItem.reward.soulStone : '';
        item.innerHTML = `
          <div class="quest-item-name">${dq.name}</div>
          <div class="quest-item-prog">
            <div class="quest-prog-bar"><div class="quest-prog-fill" style="width:${pct}%"></div></div>
            <span class="quest-prog-text">${dq.current}/${dq.target}</span>
          </div>
          ${dq.completed && !dq.claimed ? '<button class="quest-claim-btn" data-id="' + dq.id + '">수령</button>' : ''}
          ${dq.claimed ? '<span class="quest-claimed-text">✅</span>' : ''}
          <div class="quest-reward-text">${rewardText}</div>
        `;
        var claimBtn = item.querySelector('.quest-claim-btn');
        if (claimBtn) {
          claimBtn.onclick = function() {
            var id = this.dataset.id;
            if (QuestSystem.claimDaily(id)) {
              self._updateQuestSidebar();
              self._updateHUD();
            }
          };
        }
        dailyList.appendChild(item);
      });
    }

    // 일반 퀘스트
    var activeList = document.getElementById('active-quest-list');
    if (activeList) {
      activeList.innerHTML = '';
      var active = GameState.quests.active || [];
      var typeNames = {
        kill: '몬스터 처치', killBoss: '보스 처치',
        stage: '스테이지 진행', gold: '골드 모으기',
        upgrade: '업그레이드', crit: '크리티컬'
      };
      active.forEach(function(q) {
        var item = document.createElement('div');
        item.className = 'quest-item' + (q.completed ? ' quest-done' : '');
        var pct = q.target > 0 ? Math.min(100, q.current / q.target * 100) : 0;
        var rewardText = q.reward === 'gold'
          ? '💰 ' + formatNumber(q.rewardValue)
          : '✨ EXP';
        item.innerHTML = `
          <div class="quest-item-name">${typeNames[q.type] || q.type}</div>
          <div class="quest-item-prog">
            <div class="quest-prog-bar"><div class="quest-prog-fill" style="width:${pct}%"></div></div>
            <span class="quest-prog-text">${formatNumber(q.current)}/${formatNumber(q.target)}</span>
          </div>
          <div class="quest-reward-text">${rewardText}</div>
        `;
        activeList.appendChild(item);
      });
    }
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
    var heroHpFill = document.getElementById('hero-hp-fill');
    var heroHpText = document.getElementById('hero-hp-text');
    if (heroHpFill) {
      var heroPct = clamp(GameState.hero.hp / GameState.hero.maxHp * 100, 0, 100);
      heroHpFill.style.width = heroPct + '%';
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

    // 스킬 포인트 표시
    var spEl = document.getElementById('stat-sp');
    if (spEl && GameState.skills) {
      var pts = GameState.skills.points || 0;
      spEl.textContent = pts;
      if (pts > 0) {
        spEl.classList.add('has-points');
      } else {
        spEl.classList.remove('has-points');
      }
    }

    // 세팅 패널 정보 업데이트
    var infoPlaytime = document.getElementById('info-playtime');
    var infoKills = document.getElementById('info-kills');
    var infoGold = document.getElementById('info-gold');
    var infoPrestige = document.getElementById('info-prestige');
    var infoSouls = document.getElementById('info-souls');
    if (infoPlaytime) infoPlaytime.textContent = Math.floor(GameState.meta.playTime / 60) + '분';
    if (infoKills) infoKills.textContent = formatNumber(GameState.meta.totalKills);
    if (infoGold) infoGold.textContent = formatNumber(GameState.meta.totalGold);
    if (infoPrestige && GameState.prestige) infoPrestige.textContent = GameState.prestige.count;
    if (infoSouls && GameState.prestige) infoSouls.textContent = GameState.prestige.soulStones;
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

  // ===== 상점 패널 업데이트 =====
  _updateShopPanel() {
    // 강화 탭: 업그레이드 버튼 업데이트
    this._updateUpgradeButtons();

    // 소모품 탭: 스택/가격/타이머 업데이트
    if (typeof ShopSystem === 'undefined') return;
    ShopSystem.CONSUMABLES.forEach(function(def) {
      var stackEl = document.getElementById('cons-stack-' + def.id);
      var priceEl = document.getElementById('cons-price-' + def.id);
      var timerEl = document.getElementById('cons-timer-' + def.id);
      var btnEl   = document.getElementById('cons-' + def.id);

      var stack = GameState.shop ? (GameState.shop.inventory[def.id] || 0) : 0;
      var price = ShopSystem.getPrice(def.id);
      if (stackEl) stackEl.textContent = stack + '/' + def.maxStack;
      if (priceEl) priceEl.textContent = '💰 ' + formatNumber(price);

      if (timerEl && def.isBuff) {
        var secs = ShopSystem.isBuffActive(def.id);
        if (secs > 0) {
          timerEl.style.display = '';
          timerEl.textContent = secs + 's';
        } else {
          timerEl.style.display = 'none';
        }
      }

      if (btnEl) {
        var canAfford = GameState.hero.gold >= price && stack < def.maxStack;
        btnEl.style.opacity = canAfford ? '1' : '0.5';
      }
    });
  }

  // ===== 펫 슬롯 업데이트 =====
  _updatePetSlot() {
    var slot = document.getElementById('pet-slot');
    if (!slot) return;
    var iconEl = slot.querySelector('.pet-slot-icon');
    var nameEl = slot.querySelector('.pet-slot-name');
    if (typeof PetSystem === 'undefined' || !GameState.pets) return;

    var pet = PetSystem.getEquippedPet();
    if (pet) {
      slot.style.borderColor = PetSystem.GRADE_COLORS[pet.grade];
      slot.style.boxShadow = '0 0 6px ' + PetSystem.GRADE_COLORS[pet.grade] + '66';
      if (iconEl) iconEl.textContent = PetSystem.PET_ICONS[pet.type] || '🐾';
      if (nameEl) { nameEl.textContent = 'Lv.' + pet.level; nameEl.style.color = PetSystem.GRADE_COLORS[pet.grade]; }
    } else {
      slot.style.borderColor = '';
      slot.style.boxShadow = '';
      if (iconEl) iconEl.textContent = '🐾';
      if (nameEl) { nameEl.textContent = '펫'; nameEl.style.color = ''; }
    }
  }

  // ===== HUD 부스터 배지 업데이트 =====
  _updateHudBuffs() {
    var el = document.getElementById('hud-buffs');
    if (!el) return;
    if (typeof ShopSystem === 'undefined' || !GameState.shop) { el.innerHTML = ''; return; }

    var buffIds = ['goldBooster', 'expBooster', 'dropBooster'];
    var buffIcons = { goldBooster: '💰', expBooster: '✨', dropBooster: '🎁' };
    var html = '';
    buffIds.forEach(function(id) {
      var secs = ShopSystem.isBuffActive(id);
      if (secs > 0) {
        html += '<span class="buff-badge">' + buffIcons[id] + ' ' + secs + 's</span>';
      }
    });
    el.innerHTML = html;
  }

  // ===== 펫 모달 빌드 =====
  _buildPetModal() {
    if (typeof PetSystem === 'undefined') return;
    var overlay = document.getElementById('ui-overlay');
    var self = this;

    var modal = document.createElement('div');
    modal.id = 'pet-modal';
    modal.innerHTML = `
      <button id="pet-modal-close">✕</button>
      <h2>🐾 펫</h2>
      <div class="pet-modal-tabs">
        <button class="pet-modal-tab active" id="ptab-equipped">장착됨</button>
        <button class="pet-modal-tab" id="ptab-inventory">인벤토리</button>
        <button class="pet-modal-tab" id="ptab-shop">알/상점</button>
      </div>
      <div id="pet-modal-body"></div>
    `;
    overlay.appendChild(modal);

    document.getElementById('pet-modal-close').onclick = function() {
      modal.classList.remove('visible');
    };

    modal.querySelectorAll('.pet-modal-tab').forEach(function(tab) {
      tab.onclick = function() {
        modal.querySelectorAll('.pet-modal-tab').forEach(function(t) { t.classList.remove('active'); });
        tab.classList.add('active');
        var key = tab.id.replace('ptab-', '');
        self._refreshPetModal(key);
      };
    });
  }

  _openPetModal() {
    var modal = document.getElementById('pet-modal');
    if (!modal) return;
    modal.classList.add('visible');
    this._refreshPetModal('equipped');
  }

  _refreshPetModal(tab) {
    if (typeof PetSystem === 'undefined') return;
    var body = document.getElementById('pet-modal-body');
    if (!body) return;
    body.innerHTML = '';
    var self = this;

    if (tab === 'equipped') {
      var pet = PetSystem.getEquippedPet();
      if (!pet) {
        body.innerHTML = '<div style="color:rgba(255,255,255,0.4);text-align:center;padding:20px">장착된 펫이 없습니다</div>';
      } else {
        var stats = PetSystem.getPetStats();
        var statLines = [];
        if (stats.atk)        statLines.push('ATK +' + Math.floor(stats.atk * 100) + '%');
        if (stats.hp)         statLines.push('HP +'  + Math.floor(stats.hp  * 100) + '%');
        if (stats.def)        statLines.push('DEF +' + Math.floor(stats.def * 100) + '%');
        if (stats.critChance) statLines.push('CRIT +' + Math.floor(stats.critChance * 100) + '%');
        if (stats.goldBonus)  statLines.push('골드 +' + Math.floor(stats.goldBonus * 100) + '%');
        if (stats.dropRate)   statLines.push('드롭 +' + Math.floor(stats.dropRate * 100) + '%');
        var expReq = PetSystem.getExpRequired(pet.level);
        var expPct = Math.floor(pet.exp / expReq * 100);
        var card = document.createElement('div');
        card.className = 'pet-card equipped';
        card.innerHTML = `
          <div class="pet-card-icon">${PetSystem.PET_ICONS[pet.type]}</div>
          <div class="pet-card-info">
            <div class="pet-card-name" style="color:${PetSystem.GRADE_COLORS[pet.grade]}">[${PetSystem.GRADE_NAMES[pet.grade]}] ${pet.name}</div>
            <div class="pet-card-level">Lv.${pet.level} | EXP ${pet.exp}/${expReq}</div>
            <div class="pet-exp-bar"><div class="pet-exp-fill" style="width:${expPct}%"></div></div>
            <div style="font-size:10px;color:#4ecdc4;margin-top:3px">${statLines.join(' / ')}</div>
          </div>
          <div class="pet-card-actions"><button class="pet-action-btn unequip-btn" data-uid="${pet.uid}">해제</button></div>
        `;
        body.appendChild(card);

        // 먹이 주기
        var foodSection = document.createElement('div');
        foodSection.className = 'food-section';
        foodSection.style.marginTop = '8px';
        var foodIds = ['petFood_s', 'petFood_m', 'petFood_l'];
        foodIds.forEach(function(fid) {
          var count = GameState.pets.food[fid] || 0;
          var btn = document.createElement('button');
          btn.className = 'food-btn';
          btn.disabled = count <= 0;
          btn.innerHTML = PetSystem.FOOD_ICONS[fid] + '<br>' + PetSystem.FOOD_NAMES[fid] + '<br>x' + count;
          btn.onclick = function() {
            PetSystem.feedPet(pet.uid, fid);
            self._refreshPetModal('equipped');
            self._updatePetSlot();
          };
          foodSection.appendChild(btn);
        });
        body.appendChild(foodSection);

        card.querySelector('.unequip-btn').onclick = function() {
          PetSystem.unequip();
          self._refreshPetModal('equipped');
          self._updatePetSlot();
        };
      }

    } else if (tab === 'inventory') {
      var inv = GameState.pets.inventory;
      if (inv.length === 0) {
        body.innerHTML = '<div style="color:rgba(255,255,255,0.4);text-align:center;padding:20px">보유한 펫이 없습니다</div>';
      } else {
        inv.forEach(function(pet) {
          var isEquipped = GameState.pets.equipped === pet.uid;
          var card = document.createElement('div');
          card.className = 'pet-card' + (isEquipped ? ' equipped' : '');
          var expPct = Math.floor(pet.exp / PetSystem.getExpRequired(pet.level) * 100);
          card.innerHTML = `
            <div class="pet-card-icon">${PetSystem.PET_ICONS[pet.type]}</div>
            <div class="pet-card-info">
              <div class="pet-card-name" style="color:${PetSystem.GRADE_COLORS[pet.grade]}">[${PetSystem.GRADE_NAMES[pet.grade]}] ${pet.name}</div>
              <div class="pet-card-level">Lv.${pet.level} | ${PetSystem.PET_NAMES[pet.type]}</div>
              <div class="pet-exp-bar"><div class="pet-exp-fill" style="width:${expPct}%"></div></div>
            </div>
            <div class="pet-card-actions">
              ${isEquipped
                ? '<button class="pet-action-btn unequip-btn" data-uid="' + pet.uid + '">해제</button>'
                : '<button class="pet-action-btn equip-btn" data-uid="' + pet.uid + '">장착</button>'}
            </div>
          `;
          var equipBtn = card.querySelector('.equip-btn');
          if (equipBtn) {
            equipBtn.onclick = function() {
              PetSystem.equip(this.dataset.uid);
              self._refreshPetModal('inventory');
              self._updatePetSlot();
            };
          }
          var unequipBtn = card.querySelector('.unequip-btn');
          if (unequipBtn) {
            unequipBtn.onclick = function() {
              PetSystem.unequip();
              self._refreshPetModal('inventory');
              self._updatePetSlot();
            };
          }
          body.appendChild(card);
        });
      }

    } else { // shop
      // 보유 알 현황
      var eggsDiv = document.createElement('div');
      eggsDiv.style.cssText = 'font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:8px';
      eggsDiv.textContent = '보유 알: ' +
        PetSystem.EGG_TYPES.map(function(e) { return e.name + ' x' + (GameState.pets.eggs[e.id] || 0); }).join(' / ');
      body.appendChild(eggsDiv);

      // 알 구매 + 부화
      var eggSection = document.createElement('div');
      eggSection.className = 'egg-buy-section';
      PetSystem.EGG_TYPES.forEach(function(eggDef) {
        var col = document.createElement('div');
        col.style.cssText = 'display:flex;flex-direction:column;gap:4px;align-items:center;flex:1';
        var buyBtn = document.createElement('button');
        buyBtn.className = 'egg-buy-btn';
        buyBtn.innerHTML = eggDef.icon + '<br>' + eggDef.name + '<br>💰 ' + formatNumber(eggDef.price);
        buyBtn.disabled = GameState.hero.gold < eggDef.price;
        buyBtn.onclick = function() {
          if (PetSystem.buyEgg(eggDef.id)) self._refreshPetModal('shop');
        };
        var hatchBtn = document.createElement('button');
        hatchBtn.className = 'hatch-btn';
        var eggCount = GameState.pets.eggs[eggDef.id] || 0;
        hatchBtn.textContent = '부화 (' + eggCount + ')';
        hatchBtn.disabled = eggCount <= 0 || GameState.pets.inventory.length >= 15;
        hatchBtn.onclick = function() {
          var newPet = PetSystem.hatchEgg(eggDef.id);
          if (newPet) {
            self._refreshPetModal('shop');
            self._updatePetSlot();
          }
        };
        col.appendChild(buyBtn);
        col.appendChild(hatchBtn);
        eggSection.appendChild(col);
      });
      body.appendChild(eggSection);

      // 먹이 현황
      var foodDiv = document.createElement('div');
      foodDiv.style.cssText = 'font-size:11px;color:rgba(255,255,255,0.5);margin-top:10px';
      foodDiv.textContent = '먹이: ' +
        Object.keys(PetSystem.FOOD_NAMES).map(function(fid) {
          return PetSystem.FOOD_ICONS[fid] + (GameState.pets.food[fid] || 0);
        }).join('  ');
      body.appendChild(foodDiv);
    }
  }

  // ===== 제작소 모달 빌드 =====
  _buildCraftingModal() {
    if (typeof CraftingSystem === 'undefined') return;
    var overlay = document.getElementById('ui-overlay');
    var self = this;
    this._craftingCatFilter = 'equipment';

    var modal = document.createElement('div');
    modal.id = 'crafting-modal';
    modal.innerHTML = `
      <button id="crafting-modal-close">✕</button>
      <h2>🔨 제작소</h2>
      <div id="craft-materials-bar"></div>
      <div class="crafting-cat-tabs">
        <button class="crafting-cat-tab active" data-cat="equipment">장비</button>
        <button class="crafting-cat-tab" data-cat="material">강화 재료</button>
        <button class="crafting-cat-tab" data-cat="special">특수</button>
      </div>
      <div id="crafting-recipe-list"></div>
    `;
    overlay.appendChild(modal);

    document.getElementById('crafting-modal-close').onclick = function() {
      modal.classList.remove('visible');
    };

    modal.querySelectorAll('.crafting-cat-tab').forEach(function(tab) {
      tab.onclick = function() {
        modal.querySelectorAll('.crafting-cat-tab').forEach(function(t) { t.classList.remove('active'); });
        tab.classList.add('active');
        self._craftingCatFilter = tab.dataset.cat;
        self._refreshCraftingModal();
      };
    });
  }

  _openCraftingModal() {
    var modal = document.getElementById('crafting-modal');
    if (!modal) return;
    modal.classList.add('visible');
    this._refreshCraftingModal();
  }

  _refreshCraftingModal() {
    if (typeof CraftingSystem === 'undefined') return;
    var self = this;

    // 재료 현황 바 업데이트
    var matBar = document.getElementById('craft-materials-bar');
    if (matBar) {
      var html = '';
      CraftingSystem.MATERIALS.forEach(function(mat) {
        var count = GameState.crafting ? (GameState.crafting.materials[mat.id] || 0) : 0;
        html += '<div class="craft-mat-badge' + (count === 0 ? ' craft-mat-zero' : '') + '">'
          + mat.icon + ' ' + mat.name + ' <b>' + count + '</b></div>';
      });
      // 강화 재료도 표시
      var eMats = GameState.crafting ? GameState.crafting.enhanceMaterials : {};
      var eStone = eMats.enhanceStone || 0;
      var lStone = eMats.legendStone  || 0;
      html += '<div class="craft-mat-badge' + (eStone === 0 ? ' craft-mat-zero' : '') + '">🔧 강화석 <b>' + eStone + '</b></div>';
      html += '<div class="craft-mat-badge' + (lStone === 0 ? ' craft-mat-zero' : '') + '">✨ 전설석 <b>' + lStone + '</b></div>';
      matBar.innerHTML = html;
    }

    // 레시피 목록 업데이트
    var recipeList = document.getElementById('crafting-recipe-list');
    if (!recipeList) return;
    recipeList.innerHTML = '';

    var cat = this._craftingCatFilter || 'equipment';
    CraftingSystem.RECIPES.forEach(function(recipe) {
      if (recipe.cat !== cat) return;
      var canCraft = CraftingSystem.canCraft(recipe.id);
      var card = document.createElement('div');
      card.className = 'recipe-card';

      // 재료 표시
      var costParts = [];
      for (var matId in recipe.cost) {
        var have = (GameState.crafting.materials[matId] !== undefined)
          ? GameState.crafting.materials[matId]
          : (GameState.crafting.enhanceMaterials[matId] || 0);
        var need = recipe.cost[matId];
        var cls = have >= need ? 'material-ok' : 'material-lack';
        var matDef = CraftingSystem.getMaterialDef(matId);
        var icon = matDef ? matDef.icon : matId;
        costParts.push('<span class="' + cls + '">' + icon + ' ' + matId + ' ' + have + '/' + need + '</span>');
      }

      card.innerHTML = `
        <div class="recipe-icon">${recipe.icon}</div>
        <div class="recipe-info">
          <div class="recipe-name">${recipe.name}</div>
          <div class="recipe-cost">${costParts.join(' ')}</div>
        </div>
        <button class="craft-btn" ${canCraft ? '' : 'disabled'} data-recipe="${recipe.id}">제작</button>
      `;

      card.querySelector('.craft-btn').onclick = function() {
        var result = CraftingSystem.craft(this.dataset.recipe);
        if (result) {
          self._refreshCraftingModal();
          self._updateShopPanel();
          if (result.type === 'equipment' && result.item) {
            self.showDropToast(result.item);
          }
        }
      };

      recipeList.appendChild(card);
    });
  }

  // ===== 재료 드롭 토스트 =====
  showMaterialToast(matId) {
    if (typeof CraftingSystem === 'undefined') return;
    var matDef = CraftingSystem.getMaterialDef(matId);
    if (!matDef) return;

    var overlay = document.getElementById('ui-overlay');
    var toast = document.createElement('div');
    toast.className = 'drop-toast material';
    toast.textContent = matDef.icon + ' ' + matDef.name + ' 획득!';
    overlay.appendChild(toast);

    setTimeout(function() { toast.classList.add('visible'); }, 10);
    setTimeout(function() {
      toast.classList.remove('visible');
      setTimeout(function() { toast.remove(); }, 400);
    }, 2000);
  }

  // ===== 하단 탭 패널 (업그레이드 / 스킬 / 장비) =====
  _buildBottomPanel() {
    var overlay = document.getElementById('ui-overlay');
    var self = this;

    var panel = document.createElement('div');
    panel.id = 'bottom-panel';

    // 탭 바
    var tabBar = document.createElement('div');
    tabBar.id = 'panel-tabs';
    tabBar.innerHTML = `
      <button class="panel-tab active" data-tab="upgrade">⚔️ 업그레이드</button>
      <button class="panel-tab" data-tab="skill">✨ 스킬</button>
      <button class="panel-tab" data-tab="item">🎒 장비</button>
    `;
    panel.appendChild(tabBar);

    // 탭 콘텐츠 컨테이너
    var contents = document.createElement('div');
    contents.id = 'panel-contents';

    // --- 업그레이드 탭 ---
    var upgradeContent = document.createElement('div');
    upgradeContent.className = 'panel-content active';
    upgradeContent.dataset.content = 'upgrade';

    var upgrades = [
      { key: 'atk',        icon: '⚔',  name: 'ATK' },
      { key: 'def',        icon: '🛡',  name: 'DEF' },
      { key: 'hp',         icon: '❤',  name: 'HP' },
      { key: 'spd',        icon: '⚡',  name: 'SPD' },
      { key: 'critChance', icon: '💫',  name: 'CRIT' },
      { key: 'goldBonus',  icon: '💰',  name: 'GOLD' }
    ];

    upgrades.forEach(function(upg) {
      var card = document.createElement('div');
      card.className = 'upgrade-card';

      var btn = document.createElement('button');
      btn.className = 'bp-upgrade-btn';
      btn.id = 'bp-upg-' + upg.key;
      btn.innerHTML = `<span class="bp-btn-icon">${upg.icon}</span><span class="bp-btn-name">${upg.name}</span><span class="bp-btn-lv" id="bp-upg-lv-${upg.key}">0</span><span class="bp-btn-cost" id="bp-upg-cost-${upg.key}">-</span>`;
      btn.onclick = function() {
        if (UpgradeSystem.applyUpgrade(upg.key)) {
          self._updateStatBar();
          self._updateHPBars();
        }
      };

      var autoBtn = document.createElement('button');
      autoBtn.className = 'auto-toggle';
      autoBtn.id = 'auto-' + upg.key;
      autoBtn.textContent = '🔄 자동';
      autoBtn.onclick = function() {
        if (GameState.autoUpgrade) {
          GameState.autoUpgrade[upg.key] = !GameState.autoUpgrade[upg.key];
          autoBtn.classList.toggle('auto-on', GameState.autoUpgrade[upg.key]);
        }
      };

      card.appendChild(btn);
      card.appendChild(autoBtn);
      upgradeContent.appendChild(card);
    });
    contents.appendChild(upgradeContent);

    // --- 스킬 탭 ---
    var skillContent = document.createElement('div');
    skillContent.className = 'panel-content';
    skillContent.dataset.content = 'skill';

    if (typeof SkillSystem !== 'undefined') {
      SkillSystem.SKILLS.forEach(function(def) {
        var btn = document.createElement('button');
        btn.className = 'skill-btn locked';
        btn.id = 'passive-skill-' + def.key;
        btn.innerHTML = `
          <div class="skill-icon">${def.icon}</div>
          <div class="skill-name">${def.name}</div>
          <div class="skill-lv" id="passive-lv-${def.key}">Lv.0/5</div>
          <div class="skill-unlock" id="passive-unlock-${def.key}">Lv.${def.unlockLevel} 해금</div>
        `;
        btn.onclick = function() {
          if (typeof SkillSystem !== 'undefined' && SkillSystem.upgradeSkill(def.key)) {
            self._updateBottomPanel();
            self._updateStatBar();
          }
        };
        skillContent.appendChild(btn);
      });
    }
    contents.appendChild(skillContent);

    // --- 장비 탭 ---
    var itemContent = document.createElement('div');
    itemContent.className = 'panel-content';
    itemContent.dataset.content = 'item';

    // 장착 슬롯
    var equipArea = document.createElement('div');
    equipArea.id = 'item-equip-area';
    equipArea.innerHTML = '<div class="section-label">장착</div>';
    var equipSlots = document.createElement('div');
    equipSlots.id = 'item-equip-slots';
    ['weapon', 'armor', 'accessory'].forEach(function(slot) {
      var slotEl = document.createElement('div');
      slotEl.className = 'item-equip-slot empty';
      slotEl.id = 'item-slot-' + slot;
      slotEl.dataset.slot = slot;
      var icons = { weapon: '⚔️', armor: '🛡️', accessory: '💎' };
      slotEl.innerHTML = `<div class="item-slot-icon">${icons[slot]}</div><div class="item-slot-name">비어있음</div>`;
      slotEl.onclick = function() {
        if (typeof ItemSystem !== 'undefined') {
          ItemSystem.unequipItem(slot);
          self._updateBottomPanel();
        }
      };
      equipSlots.appendChild(slotEl);
    });
    equipArea.appendChild(equipSlots);
    itemContent.appendChild(equipArea);

    // 인벤토리
    var invArea = document.createElement('div');
    invArea.id = 'item-inv-area';
    invArea.innerHTML = '<div class="section-label">인벤토리</div>';
    var invSlots = document.createElement('div');
    invSlots.id = 'item-inv-slots';
    for (var i = 0; i < 6; i++) {
      var invSlot = document.createElement('div');
      invSlot.className = 'item-inv-slot empty-inv';
      invSlot.id = 'item-inv-' + i;
      invSlots.appendChild(invSlot);
    }
    invArea.appendChild(invSlots);
    itemContent.appendChild(invArea);

    contents.appendChild(itemContent);
    panel.appendChild(contents);
    overlay.appendChild(panel);

    // 탭 전환
    tabBar.querySelectorAll('.panel-tab').forEach(function(tab) {
      tab.onclick = function() {
        tabBar.querySelectorAll('.panel-tab').forEach(function(t) { t.classList.remove('active'); });
        tab.classList.add('active');
        self._activeBottomTab = tab.dataset.tab;
        contents.querySelectorAll('.panel-content').forEach(function(c) { c.classList.remove('active'); });
        var target = contents.querySelector('[data-content="' + tab.dataset.tab + '"]');
        if (target) target.classList.add('active');
        self._updateBottomPanel();
      };
    });
  }

  _updateBottomPanel() {
    var tab = this._activeBottomTab;
    if (tab === 'upgrade') this._updateUpgradeTab();
    else if (tab === 'skill') this._updateSkillTab();
    else if (tab === 'item') this._updateItemTab();
  }

  _updateUpgradeTab() {
    var types = ['atk', 'def', 'hp', 'spd', 'critChance', 'goldBonus'];
    types.forEach(function(type) {
      var lvEl = document.getElementById('bp-upg-lv-' + type);
      var costEl = document.getElementById('bp-upg-cost-' + type);
      var btn = document.getElementById('bp-upg-' + type);
      if (!lvEl || !costEl || !btn) return;

      var lv = GameState.upgrades[type] || 0;
      var cost = UpgradeSystem.getCost(type);
      lvEl.textContent = lv;
      costEl.textContent = '💰' + formatNumber(cost);
      btn.disabled = !UpgradeSystem.canAfford(type);

      var autoBtn = document.getElementById('auto-' + type);
      if (autoBtn && GameState.autoUpgrade) {
        autoBtn.classList.toggle('auto-on', !!GameState.autoUpgrade[type]);
      }
    });
  }

  _updateSkillTab() {
    if (typeof SkillSystem === 'undefined') return;
    SkillSystem.SKILLS.forEach(function(def) {
      var btn = document.getElementById('passive-skill-' + def.key);
      var lvEl = document.getElementById('passive-lv-' + def.key);
      var unlockEl = document.getElementById('passive-unlock-' + def.key);
      if (!btn) return;

      var level = (GameState.skills && GameState.skills[def.key]) || 0;
      var isUnlocked = SkillSystem.isUnlocked(def.key);
      var isMax = level >= def.values.length;
      var canUp = SkillSystem.canUpgrade(def.key);

      btn.className = 'skill-btn' + (isMax ? ' maxed' : isUnlocked ? (canUp ? ' can-learn' : '') : ' locked');
      if (lvEl) lvEl.textContent = 'Lv.' + level + '/' + def.values.length;
      if (unlockEl) {
        if (!isUnlocked) {
          unlockEl.textContent = 'Lv.' + def.unlockLevel + ' 해금';
          unlockEl.style.display = '';
        } else if (isMax) {
          unlockEl.textContent = '최대 레벨';
          unlockEl.style.display = '';
        } else {
          unlockEl.textContent = level > 0 ? SkillSystem.getValueDesc(def.key, level) : '포인트로 습득';
          unlockEl.style.display = '';
        }
      }
      btn.disabled = !canUp;
    });
  }

  _updateItemTab() {
    if (typeof ItemSystem === 'undefined') return;
    var equipped = (GameState.items && GameState.items.equipped) || {};
    var inventory = (GameState.items && GameState.items.inventory) || [];

    // 장착 슬롯 업데이트
    ['weapon', 'armor', 'accessory'].forEach(function(slot) {
      var slotEl = document.getElementById('item-slot-' + slot);
      if (!slotEl) return;
      var item = equipped[slot];
      var icons = { weapon: '⚔️', armor: '🛡️', accessory: '💎' };
      var iconEl = slotEl.querySelector('.item-slot-icon');
      var nameEl = slotEl.querySelector('.item-slot-name');
      if (item) {
        slotEl.className = 'item-equip-slot equipped';
        slotEl.style.borderColor = ItemSystem.getRarityBorder(item.rarity);
        if (iconEl) iconEl.textContent = item.icon;
        if (nameEl) {
          nameEl.textContent = item.name;
          nameEl.style.color = ItemSystem.getRarityColor(item.rarity);
        }
      } else {
        slotEl.className = 'item-equip-slot empty';
        slotEl.style.borderColor = '';
        if (iconEl) iconEl.textContent = icons[slot];
        if (nameEl) { nameEl.textContent = '비어있음'; nameEl.style.color = ''; }
      }
    });

    // 인벤토리 슬롯 업데이트
    for (var i = 0; i < 6; i++) {
      var invSlot = document.getElementById('item-inv-' + i);
      if (!invSlot) continue;
      var invItem = inventory[i];
      if (invItem) {
        invSlot.className = 'item-inv-slot has-item';
        invSlot.style.borderColor = ItemSystem.getRarityBorder(invItem.rarity);
        invSlot.innerHTML = `<div class="item-inv-icon">${invItem.icon}</div><div class="item-inv-name" style="color:${ItemSystem.getRarityColor(invItem.rarity)}">${invItem.name}</div><div class="item-inv-stats">${ItemSystem.formatStats(invItem.stats)}</div>`;
        (function(it) {
          invSlot.onclick = function() {
            if (typeof ItemSystem !== 'undefined') {
              ItemSystem.equipItem(it);
              UISceneInstance._updateBottomPanel();
            }
          };
        })(invItem);
      } else {
        invSlot.className = 'item-inv-slot empty-inv';
        invSlot.style.borderColor = '';
        invSlot.innerHTML = '';
        invSlot.onclick = null;
      }
    }
  }

  _processAutoUpgrade() {
    if (!GameState.autoUpgrade) return;
    var types = ['atk', 'def', 'hp', 'spd', 'critChance', 'goldBonus'];
    for (var i = 0; i < types.length; i++) {
      var type = types[i];
      if (GameState.autoUpgrade[type] && UpgradeSystem.canAfford(type)) {
        UpgradeSystem.applyUpgrade(type);
      }
    }
  }

  // ===== 스테이지 맵 모달 =====
  _buildStageMapModal() {
    var overlay = document.getElementById('ui-overlay');
    var self = this;

    var modal = document.createElement('div');
    modal.id = 'stage-map-modal';
    modal.innerHTML = `
      <div id="stage-map-inner">
        <div id="stage-map-header">
          🗺️ 스테이지 맵
          <button id="stage-map-close">✕</button>
        </div>
        <div id="stage-map-grid"></div>
        <div id="stage-map-legend">
          <span class="legend-item current-l">● 현재</span>
          <span class="legend-item boss-l">👑 보스</span>
          <span class="legend-item cleared-l">✓ 클리어</span>
          <span class="legend-item future-l">○ 미해금</span>
        </div>
      </div>
    `;
    overlay.appendChild(modal);

    document.getElementById('stage-map-close').onclick = function() {
      modal.classList.remove('visible');
    };
    modal.onclick = function(e) {
      if (e.target === modal) modal.classList.remove('visible');
    };
  }

  _openStageMap() {
    this._refreshStageMap();
    document.getElementById('stage-map-modal').classList.add('visible');
  }

  _refreshStageMap() {
    var grid = document.getElementById('stage-map-grid');
    if (!grid) return;
    grid.innerHTML = '';

    var current = GameState.stage.current;
    var maxShow = Math.max(current + 14, 35);

    for (var s = 1; s <= maxShow; s++) {
      var cell = document.createElement('div');
      cell.className = 'stage-cell';
      var isBoss = (s % 5 === 0);

      if (s === current) {
        cell.classList.add('current');
      } else if (s < current) {
        if (isBoss) cell.classList.add('boss-cleared');
        else cell.classList.add('cleared');
      } else {
        if (isBoss) cell.classList.add('boss');
        else cell.classList.add('future');
      }

      cell.innerHTML = '<span class="stage-num">' + s + '</span>' + (isBoss ? '<span class="boss-crown">👑</span>' : '');
      grid.appendChild(cell);
    }
  }
}
