// ===== 튜토리얼 시스템 =====
// 첫 플레이어에게만 표시하는 단계별 UI 안내

var TutorialSystem = {

  STORAGE_KEY: 'idleRPG_tutorial_done',

  // 튜토리얼 단계 정의
  // ring: 게임 컨테이너(800×600) 기준 좌표
  // tipSide: 'top' | 'bottom' | 'right' — 툴팁 위치
  STEPS: [
    {
      title: '⚔️ 자동 전투',
      text: '전투는 자동으로 진행됩니다. 몬스터를 쓰러뜨려\n골드와 경험치를 획득하고 영웅을 성장시키세요!',
      ring: { x: 540, y: 280 },
      tip: { left: '200px', top: '120px' }
    },
    {
      title: '💰 능력치 업그레이드',
      text: '화면 아래 [⚔️ 업그레이드] 탭에서\n골드를 사용해 ATK·DEF·HP 등을 강화하세요.',
      ring: { x: 133, y: 467 },
      tip: { left: '160px', top: '280px' }
    },
    {
      title: '✨ 패시브 스킬',
      text: '[✨ 스킬] 탭에서 스킬 포인트를 사용해\n흡혈·광전사·맹독 등 패시브 스킬을 배울 수 있습니다.\n스킬 포인트는 레벨업 시 획득합니다.',
      ring: { x: 400, y: 467 },
      tip: { left: '300px', top: '280px' }
    },
    {
      title: '🎒 장비 아이템',
      text: '[🎒 장비] 탭에서 몬스터 처치 시 드롭된\n무기·방어구·악세서리를 장착해 전투력을 높이세요.',
      ring: { x: 667, y: 467 },
      tip: { left: '400px', top: '280px' }
    },
    {
      title: '📋 퀘스트 & 일일 미션',
      text: '화면 오른쪽 퀘스트 사이드바에서\n일반 퀘스트와 일일 미션을 확인하세요.\n완료 시 골드, 경험치, 영혼석을 획득합니다.',
      ring: { x: 760, y: 320 },
      tip: { left: '380px', top: '200px' }
    },
    {
      title: '⚙️ 그 외 기능',
      text: '상점(소모품·부스터), 제작소(재료 제작),\n펫 시스템, 프레스티지(환생)도 활용해보세요!\n\n설정 버튼에서 세이브 슬롯을 관리할 수 있습니다.',
      ring: null,
      tip: { left: '200px', top: '180px' }
    }
  ],

  _step: 0,
  _overlay: null,
  _ring: null,

  isDone: function() {
    return !!localStorage.getItem(this.STORAGE_KEY);
  },

  start: function() {
    if (this.isDone()) return;
    this._step = 0;
    this._buildOverlay();
    this._showStep(0);
  },

  // 강제 재시작 (설정에서 "튜토리얼 다시 보기" 용)
  restart: function() {
    localStorage.removeItem(this.STORAGE_KEY);
    this._step = 0;
    if (this._overlay) this._overlay.remove();
    if (this._ring) this._ring.remove();
    this._buildOverlay();
    this._showStep(0);
  },

  _buildOverlay: function() {
    var self = this;
    var container = document.getElementById('game-container');
    if (!container) return;

    // 어두운 배경 오버레이 (클릭 차단 없이 시각적으로만)
    this._overlay = document.createElement('div');
    this._overlay.id = 'tutorial-overlay';

    // 툴팁 박스
    var box = document.createElement('div');
    box.id = 'tutorial-box';

    var title = document.createElement('div');
    title.id = 'tutorial-title';
    box.appendChild(title);

    var text = document.createElement('div');
    text.id = 'tutorial-text';
    box.appendChild(text);

    // 스텝 표시 (1/6 형식)
    var stepInfo = document.createElement('div');
    stepInfo.id = 'tutorial-step-info';
    box.appendChild(stepInfo);

    // 버튼 영역
    var btnRow = document.createElement('div');
    btnRow.id = 'tutorial-btn-row';

    var skipBtn = document.createElement('button');
    skipBtn.id = 'tutorial-skip-btn';
    skipBtn.textContent = '건너뛰기';
    skipBtn.onclick = function() { self._complete(); };

    var nextBtn = document.createElement('button');
    nextBtn.id = 'tutorial-next-btn';
    nextBtn.textContent = '다음 →';
    nextBtn.onclick = function() { self._next(); };

    btnRow.appendChild(skipBtn);
    btnRow.appendChild(nextBtn);
    box.appendChild(btnRow);

    this._overlay.appendChild(box);

    // 링 표시용 div
    this._ring = document.createElement('div');
    this._ring.id = 'tutorial-ring';
    this._overlay.appendChild(this._ring);

    container.appendChild(this._overlay);
  },

  _showStep: function(idx) {
    var step = this.STEPS[idx];
    var total = this.STEPS.length;
    var isLast = (idx === total - 1);

    var title = document.getElementById('tutorial-title');
    var text = document.getElementById('tutorial-text');
    var stepInfo = document.getElementById('tutorial-step-info');
    var nextBtn = document.getElementById('tutorial-next-btn');
    var box = document.getElementById('tutorial-box');

    if (!title || !text || !box) return;

    title.textContent = step.title;
    text.textContent = step.text;
    stepInfo.textContent = (idx + 1) + ' / ' + total;
    nextBtn.textContent = isLast ? '시작하기! ✓' : '다음 →';

    // 툴팁 위치
    box.style.left = step.tip.left;
    box.style.top  = step.tip.top;

    // 링 위치
    if (this._ring) {
      if (step.ring) {
        this._ring.style.display = 'block';
        this._ring.style.left = (step.ring.x - 24) + 'px';
        this._ring.style.top  = (step.ring.y - 24) + 'px';
      } else {
        this._ring.style.display = 'none';
      }
    }
  },

  _next: function() {
    this._step++;
    if (this._step >= this.STEPS.length) {
      this._complete();
    } else {
      this._showStep(this._step);
    }
  },

  _complete: function() {
    localStorage.setItem(this.STORAGE_KEY, '1');
    if (this._overlay) {
      this._overlay.remove();
      this._overlay = null;
      this._ring = null;
    }
  }
};
