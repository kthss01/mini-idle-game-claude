# 미니 방치형 RPG 🗡️

Phaser 3 기반의 브라우저 방치형 RPG 게임입니다.

## 🎮 플레이

**GitHub Pages**: [게임 플레이하기](https://kthss.github.io/mini-idle-game-claude/)

---

## 📖 게임 방법

- 영웅이 자동으로 몬스터를 처치합니다
- 골드를 모아 업그레이드 패널에서 스탯을 강화하세요
- 10마리 처치 시 다음 스테이지로 진행됩니다
- 5 배수 스테이지에는 강력한 보스가 등장합니다
- 오프라인 상태에서도 골드가 자동으로 적립됩니다 (최대 8시간)

---

## ✨ 주요 기능

### ⚔️ 업그레이드 시스템
| 아이콘 | 이름 | 효과 |
|--------|------|------|
| ⚔️ | ATK | 공격력 +5 |
| 🛡️ | DEF | 방어력 +3 |
| ❤️ | HP | 최대 HP +30 |
| ⚡ | SPD | 공격 속도 +1 |
| 💫 | CRIT | 치명타 확률 +2% |
| 💰 | GOLD | 골드 획득 +10% |

자동 업그레이드 토글로 골드가 쌓이는 즉시 자동 강화도 지원합니다.

### 🧠 패시브 스킬 시스템
레벨업 시 획득한 스킬 포인트로 패시브 스킬을 강화합니다. 각 스킬 최대 5레벨.

| 스킬 | 해금 레벨 | 효과 |
|------|-----------|------|
| 🩸 흡혈 | Lv.5 | 공격 피해의 일부를 HP로 회복 |
| 🔥 광전사 | Lv.10 | HP 50% 이하 시 ATK 대폭 증가 |
| 🪨 강철 피부 | Lv.15 | 받는 피해 고정 감소 |
| 🌀 연타 | Lv.20 | 확률로 2회 공격 |
| ☠️ 맹독 | Lv.25 | 초당 독 피해 적용 |
| ⚡ 번개 | Lv.30 | 크리티컬 시 추가 피해 |

### 🎒 아이템 드롭 시스템
몬스터 처치 시 확률로 장비가 드롭됩니다.
- **희귀도**: 일반 / 희귀 / 영웅 / 전설 (보스는 드롭률 60%)
- **슬롯**: 무기(ATK) / 방어구(DEF+HP) / 장신구(CRIT+SPD)
- 인벤토리 6칸, 장착 슬롯 3개

### 🗺️ 스테이지 맵
맵 버튼으로 현재까지의 진행 상황을 한눈에 확인합니다.

### 🏆 업적 & 퀘스트
- 다양한 달성 조건의 업적 시스템
- 일일 퀘스트 및 일반 퀘스트 보상

### 💀 환생 시스템 (프레스티지)
스테이지 20 달성 후 환생으로 영혼석을 획득하여 영구 버프를 구매합니다.

### 🐾 펫 시스템
펫을 동반하여 전투 보조 효과를 얻습니다. (드래곤 / 거북이 / 여우)

### 🔨 제작 시스템
몬스터 드롭 재료를 수집하여 강화 아이템을 제작합니다.

### 💾 세이브 슬롯
3개의 독립 세이브 슬롯 지원. 슬롯 복사 / export / import 기능 포함.

---

## 🛠️ 기술 스택

- **Phaser 3.87.0** (CDN, 빌드 과정 없음)
- 순수 HTML/CSS/JavaScript (ES6 Class + 전역 변수 패턴)
- GitHub Pages 배포 (`/docs` 폴더, `main` 브랜치)
- localStorage 세이브 (SaveSlotManager, 3슬롯)

---

## 🚀 로컬 실행

```bash
cd docs
python -m http.server 8080
# 브라우저에서 http://localhost:8080 접속
```

또는 VS Code Live Server 확장 프로그램 사용.

> ⚠️ `file://` 프로토콜로는 일부 기능이 제한될 수 있습니다.

---

## 📁 구조

```
docs/
├── index.html
├── css/style.css
└── js/
    ├── config.js              # 게임 상수 (SAVE_VERSION: 7)
    ├── state.js               # 전역 상태 (hero/upgrades/skills/items/autoUpgrade...)
    ├── main.js                # Phaser.Game 초기화
    ├── utils/helpers.js
    ├── scenes/
    │   ├── BootScene.js       # 세이브 로드 & 오프라인 보상 팝업
    │   ├── GameScene.js       # 전투 루프 & VFX 이벤트 처리
    │   └── UIScene.js         # HUD, 탭 패널, 모달 전체
    ├── systems/
    │   ├── UpgradeSystem.js   # 업그레이드 & 스탯 재계산
    │   ├── SkillSystem.js     # 패시브 스킬 (lifesteal/berserker/ironSkin/doubleStrike/poison/thunder)
    │   ├── ItemSystem.js      # 아이템 드롭 & 장착 (weapon/armor/accessory)
    │   ├── EquipmentSystem.js # 기존 장비 강화 시스템 (weapon/armor/ring)
    │   ├── CombatSystem.js    # 전투 틱 처리 + 패시브 스킬 효과
    │   ├── MonsterSystem.js   # 몬스터 스폰 & 처치 보상
    │   ├── SaveSystem.js      # 세이브/로드 (SaveSlotManager 위임)
    │   ├── SaveSlotManager.js # 3슬롯 세이브 CRUD
    │   ├── PrestigeSystem.js  # 환생 & 영혼석
    │   ├── AchievementSystem.js
    │   ├── QuestSystem.js
    │   ├── ShopSystem.js
    │   ├── PetSystem.js
    │   ├── CraftingSystem.js
    │   └── StatsTracker.js    # 통계 추적 & DPS 위젯
    ├── vfx/VFXManager.js      # 데미지 숫자, 스킬 이펙트, 아이템 드롭 알림
    └── utils/helpers.js
```

---

## 📋 개발 히스토리

| Phase | 내용 |
|-------|------|
| Phase 1 | 기본 전투 루프, 업그레이드 시스템, 세이브/로드 |
| Phase 2 | 스킬(Active 3종), 장비 시스템, 프레스티지, 업적, 퀘스트 |
| Phase 3 | 상점, 펫, 제작 시스템 |
| Phase 4 | 세이브 슬롯(3개), 통계 대시보드, StatsTracker |
| 최신 | 패시브 스킬 6종, ItemSystem, 자동 업그레이드, 스테이지 맵 모달, 탭 UI 개편 |
