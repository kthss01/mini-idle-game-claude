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
  }

  create() {
    this._buildHUD();
    this._buildSkillBar();
    this._buildUpgradePanel();
    this._buildEquipmentPanel();
    this._buildInventoryPanel();
    this._buildSettingsPanel();
    this._buildPrestigeUI();
    this._buildQuestSidebar();

    UISceneInstance = this;
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
    this._updateSkillBar();
    this._updateEquipmentSlots();
    this._updateSoulBadge();
    this._updateQuestSidebar();
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
      <div class="hud-badge hud-souls-badge" id="hud-souls" style="display:none;cursor:pointer;">💎 <span>0</span></div>
    `;
    overlay.appendChild(hudTop);

    // 영혼석 배지 클릭 → 영혼석 상점
    var soulsEl = document.getElementById('hud-souls');
    if (soulsEl) {
      soulsEl.onclick = function() {
        var shop = document.getElementById('soul-shop-panel');
        if (shop) {
          self._refreshSoulShop();
          shop.classList.add('visible');
        }
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

  // ===== 스킬 바 빌드 =====
  _buildSkillBar() {
    var overlay = document.getElementById('ui-overlay');
    var self = this;

    var skillDefs = [
      { key: 'powerStrike' },
      { key: 'shield' },
      { key: 'drain' }
    ];

    var bar = document.createElement('div');
    bar.id = 'skill-bar';

    skillDefs.forEach(function(def) {
      var key = def.key;
      var skill = SkillSystem.SKILLS[key];

      var slot = document.createElement('div');
      slot.className = 'skill-slot locked';
      slot.id = 'skill-' + key;
      slot.innerHTML = `
        <div class="skill-icon">${skill.icon}</div>
        <div class="skill-name">${skill.name}</div>
        <div class="skill-cd-bar"><div class="skill-cd-fill" id="skill-cd-${key}"></div></div>
        <div class="skill-level" id="skill-lv-${key}">Lv.${skill.unlockLevel} 해금</div>
      `;

      slot.onclick = function() {
        self._openSkillPopup(key);
      };

      bar.appendChild(slot);
    });

    // 스킬 업그레이드 팝업
    var popup = document.createElement('div');
    popup.id = 'skill-popup';
    popup.innerHTML = `
      <button id="skill-popup-close">✕</button>
      <div id="skill-popup-icon"></div>
      <h3 id="skill-popup-name"></h3>
      <div class="skill-popup-row"><span>현재 레벨</span><span id="skill-popup-lv"></span></div>
      <div class="skill-popup-row"><span>현재 효과</span><span id="skill-popup-cur"></span></div>
      <div class="skill-popup-row"><span>다음 레벨</span><span id="skill-popup-next"></span></div>
      <div class="skill-popup-cost" id="skill-popup-cost"></div>
      <button id="skill-popup-upgrade">업그레이드</button>
    `;
    overlay.appendChild(popup);

    document.getElementById('skill-popup-close').onclick = function() {
      popup.classList.remove('visible');
      self._skillPopupKey = null;
    };
    document.getElementById('skill-popup-upgrade').onclick = function() {
      if (self._skillPopupKey) {
        if (SkillSystem.upgradeSkill(self._skillPopupKey)) {
          self._refreshSkillPopup(self._skillPopupKey);
          self._updateSkillBar();
        }
      }
    };

    overlay.appendChild(bar);
  }

  _openSkillPopup(key) {
    this._skillPopupKey = key;
    this._refreshSkillPopup(key);
    document.getElementById('skill-popup').classList.add('visible');
  }

  _refreshSkillPopup(key) {
    var skill = SkillSystem.SKILLS[key];
    var skillState = GameState.skills[key];
    var popup = document.getElementById('skill-popup');
    if (!popup) return;

    document.getElementById('skill-popup-icon').textContent = skill.icon;
    document.getElementById('skill-popup-name').textContent = skill.name;
    document.getElementById('skill-popup-lv').textContent =
      skillState.level + ' / ' + skill.maxLevel;
    document.getElementById('skill-popup-cur').textContent =
      skillState.level > 0 ? SkillSystem.getCurrentDesc(key) : '(미강화)';

    var isMaxLevel = skillState.level >= skill.maxLevel;
    document.getElementById('skill-popup-next').textContent =
      isMaxLevel ? '최대 레벨' : SkillSystem.getNextLevelDesc(key);

    var costEl = document.getElementById('skill-popup-cost');
    var upgradeBtn = document.getElementById('skill-popup-upgrade');

    if (isMaxLevel) {
      costEl.textContent = '최대 레벨 달성!';
      upgradeBtn.disabled = true;
    } else if (!skillState.unlocked) {
      costEl.textContent = 'Lv.' + skill.unlockLevel + ' 해금';
      upgradeBtn.disabled = true;
    } else {
      var cost = SkillSystem.getSkillCost(key);
      costEl.textContent = '💰 ' + formatNumber(cost);
      upgradeBtn.disabled = GameState.hero.gold < cost;
    }
  }

  _updateSkillBar() {
    if (typeof SkillSystem === 'undefined') return;
    var keys = ['powerStrike', 'shield', 'drain'];

    keys.forEach(function(key) {
      var slot = document.getElementById('skill-' + key);
      if (!slot) return;

      var skillState = GameState.skills[key];
      var skill = SkillSystem.SKILLS[key];
      var lvEl = document.getElementById('skill-lv-' + key);
      var fillEl = document.getElementById('skill-cd-' + key);

      if (!skillState.unlocked) {
        slot.className = 'skill-slot locked';
        if (lvEl) lvEl.textContent = 'Lv.' + skill.unlockLevel + ' 해금';
        if (fillEl) fillEl.style.width = '0%';
      } else {
        slot.className = 'skill-slot';
        if (lvEl) lvEl.textContent = 'Lv.' + skillState.level;
        if (fillEl) {
          var cooldown = SkillSystem.getCooldown(key);
          var pct = Math.min(100, skillState.timer / cooldown * 100);
          fillEl.style.width = pct + '%';
          if (key === 'shield' && GameState.shieldActive) {
            fillEl.style.background = '#3498db';
          } else {
            fillEl.style.background = '';
          }
        }
      }
    });

    if (this._skillPopupKey) {
      this._refreshSkillPopup(this._skillPopupKey);
    }
  }

  highlightSkillSlot(key) {
    var slot = document.getElementById('skill-' + key);
    if (!slot) return;
    slot.classList.add('activating');
    setTimeout(function() { slot.classList.remove('activating'); }, 400);
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
          this._updateUpgradeButtons();
          this._updateStatBar();
          this._updateHPBars();
          this._updateEquipmentSlots();
        }
      }.bind(this);

      panel.appendChild(btn);
    }.bind(this));

    overlay.appendChild(panel);
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

  // ===== 세팅 패널 빌드 (탭: 설정 / 업적) =====
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
      </div>
      <div id="stab-pane-config">
        <div class="settings-row">
          <button class="settings-btn" id="btn-manual-save">💾 지금 저장</button>
          <button class="settings-btn danger" id="btn-reset">🗑️ 데이터 초기화</button>
        </div>
        <div id="settings-info">
          총 플레이: <span id="info-playtime">0분</span><br>
          총 킬: <span id="info-kills">0</span><br>
          총 골드: <span id="info-gold">0</span><br>
          환생 횟수: <span id="info-prestige">0</span>회<br>
          영혼석: <span id="info-souls">0</span>개
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
    `;
    overlay.appendChild(panel);

    // 닫기 버튼
    document.getElementById('settings-close').onclick = function() {
      panel.classList.remove('visible');
    };

    // 탭 전환
    document.getElementById('stab-config').onclick = function() {
      document.getElementById('stab-config').classList.add('active');
      document.getElementById('stab-achieve').classList.remove('active');
      document.getElementById('stab-pane-config').style.display = '';
      document.getElementById('stab-pane-achieve').style.display = 'none';
    };
    document.getElementById('stab-achieve').onclick = function() {
      document.getElementById('stab-achieve').classList.add('active');
      document.getElementById('stab-config').classList.remove('active');
      document.getElementById('stab-pane-config').style.display = 'none';
      document.getElementById('stab-pane-achieve').style.display = '';
      self._refreshAchievements(self._achieveFilter);
    };

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
      if (confirm('모든 데이터가 삭제됩니다. 정말 초기화하시겠습니까?')) {
        SaveSystem.resetSave();
      }
    };
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

    // 영혼석 상점 패널
    var shopPanel = document.createElement('div');
    shopPanel.id = 'soul-shop-panel';
    shopPanel.innerHTML = `
      <button id="soul-shop-close">✕</button>
      <h2>💎 영혼석 상점</h2>
      <div id="soul-shop-header">
        <span id="shop-soul-count">💎 0개</span>
        <span id="shop-prestige-count">환생 0회</span>
      </div>
      <div id="soul-buff-grid"></div>
    `;
    overlay.appendChild(shopPanel);

    document.getElementById('soul-shop-close').onclick = function() {
      shopPanel.classList.remove('visible');
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
    var grid = document.getElementById('soul-buff-grid');
    var countEl = document.getElementById('shop-soul-count');
    var prestigeEl = document.getElementById('shop-prestige-count');
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
}
