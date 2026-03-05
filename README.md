# 미니 방치형 RPG 🗡️

Phaser 3 기반의 브라우저 방치형 RPG 게임입니다.

## 🎮 플레이

**GitHub Pages**: [게임 플레이하기](https://kthss.github.io/mini-idle-game-claude/)

## 📖 게임 방법

- 영웅이 자동으로 몬스터를 처치합니다
- 골드를 모아 업그레이드 패널에서 스탯을 강화하세요
- 10마리 처치 시 다음 스테이지로 진행됩니다
- 5 배수 스테이지에는 강력한 보스가 등장합니다
- 오프라인 상태에서도 골드가 자동으로 적립됩니다 (최대 8시간)

## 🔧 업그레이드

| 아이콘 | 이름 | 효과 |
|--------|------|------|
| ⚔️ | ATK | 공격력 +5 |
| 🛡️ | DEF | 방어력 +3 |
| ❤️ | HP | 최대 HP +30 |
| ⚡ | SPD | 공격 속도 +1 |
| 💫 | CRIT | 치명타 확률 +2% |
| 💰 | GOLD | 골드 획득 +10% |

## 🛠️ 기술 스택

- **Phaser 3.87.0** (CDN, 빌드 과정 없음)
- 순수 HTML/CSS/JavaScript (ES6 Class)
- GitHub Pages 배포 (`/docs` 폴더)
- localStorage 세이브 시스템

## 🚀 로컬 실행

```bash
cd docs
python -m http.server 8080
# 브라우저에서 http://localhost:8080 접속
```

또는 VS Code Live Server 확장 프로그램 사용.

> ⚠️ `file://` 프로토콜로는 일부 기능이 제한될 수 있습니다.

## 📁 구조

```
docs/
├── index.html
├── css/style.css
└── js/
    ├── config.js          # 게임 상수
    ├── state.js           # 전역 상태
    ├── main.js            # Phaser 초기화
    ├── scenes/
    │   ├── BootScene.js   # 시작 & 오프라인 보상
    │   ├── GameScene.js   # 전투 렌더링
    │   └── UIScene.js     # HUD & 패널
    ├── systems/
    │   ├── CombatSystem.js
    │   ├── MonsterSystem.js
    │   ├── UpgradeSystem.js
    │   └── SaveSystem.js
    ├── vfx/VFXManager.js
    └── utils/helpers.js
```
