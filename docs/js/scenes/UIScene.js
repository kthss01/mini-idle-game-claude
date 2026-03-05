// ===== UI 씬 (HUD + 패널 오버레이) =====
class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
    this.lastUpdateTime = 0;
    this.UPDATE_INTERVAL = 100; // 100ms마다 DOM 업데이트
    this._skillPopupKey = null; // 현재 열린 스킬 팝업 키
  }

  create() {
    this._buildHUD();
    this._buildSkillBar();
    this._buildUpgradePanel();
    this._buildEquipmentPanel();
    this._buildInventoryPanel();
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
    this._updateSkillBar();
    this._updateEquipmentSlots();
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
          // 방어막 활성 표시
          if (key === 'shield' && GameState.shieldActive) {
            fillEl.style.background = '#3498db';
          } else {
            fillEl.style.background = '';
          }
        }
      }
    });

    // 열린 팝업 갱신
    if (this._skillPopupKey) {
      this._refreshSkillPopup(this._skillPopupKey);
    }
  }

  // 스킬 발동 시 슬롯 강조 효과 (GameScene에서 호출 가능)
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
          // 구매 성공 시 즉시 UI 업데이트
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
          nameEl.textContent = item.name;
          nameEl.style.color = gradeColors[item.grade];
        }
        // 강화 레벨 표시
        if (item.level > 0) {
          nameEl.textContent = '+' + item.level + ' ' + item.name;
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

    // 인벤토리 아이템
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
        // 선택 강조
        grid.querySelectorAll('.inv-cell').forEach(function(c) { c.classList.remove('selected'); });
        cell.classList.add('selected');
      };
      grid.appendChild(cell);
    });

    // 빈 칸
    var maxSlots = 20;
    for (var i = inv.length; i < maxSlots; i++) {
      var empty = document.createElement('div');
      empty.className = 'inv-cell empty';
      grid.appendChild(empty);
    }

    if (!self._selectedItemId) {
      detailContent.textContent = '아이템을 선택하세요';
      detailActions.innerHTML = '';
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

    // 장착 버튼
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

    // 강화 버튼
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
          // 같은 아이템 다시 선택
          var updated = GameState.equipment.inventory.find(function(i) { return i.id === item.id; });
          if (updated) self._showItemDetail(updated);
        }
      };
      detailActions.appendChild(enhanceBtn);
    }

    // 판매 버튼
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

  // 장비 드롭 토스트
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

    // 트리거 (CSS transition용)
    setTimeout(function() { toast.classList.add('visible'); }, 10);
    setTimeout(function() {
      toast.classList.remove('visible');
      setTimeout(function() { toast.remove(); }, 400);
    }, 3000);
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
