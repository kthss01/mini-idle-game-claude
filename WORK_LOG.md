# 작업 내역 로그

## 작업 목표
게임 완성도 향상을 위한 단계적 개선 작업

---

## 완성도 분석 요약 (2026-03-16)

코드베이스 전체 분석을 통해 파악한 실제 상태:

### 실제 구현 완료된 항목 (분석 결과 수정)
- **자동 업그레이드 로직**: `_processAutoUpgrade()` 정상 구현 및 업데이트 루프에서 호출 중
- **expGained 버그**: 오분석. `var expGained = Math.floor(...)` 라인 118에서 정상 정의됨

### 우선순위 개선 항목
| 순위 | 항목 | 상태 |
|------|------|------|
| 1 | 반응형 레이아웃 | ✅ 완료 |
| 2 | 타이틀/슬롯 선택 화면 | ✅ 완료 |
| 3 | 콘텐츠 확장 (퀘스트/레시피/상점) | ✅ 완료 |
| 4 | 스킬별 고유 VFX | ✅ 완료 |
| 5 | 튜토리얼 | 대기 |
| 6 | 두 장비 시스템 통일 | 대기 |

---

## 작업 이력

### [1] 반응형 레이아웃 구현 (2026-03-16)

**문제**: 게임 컨테이너가 800×600px 고정이라 모바일/소형 화면에서 화면을 벗어남. `@media` 쿼리 0개.

**방식**: CSS `transform: scale()` + JS 동적 스케일 계산
- Phaser 재초기화 없이 CSS 변환만으로 반응형 적용
- 종횡비(4:3) 유지하며 viewport에 맞춰 자동 축소/확대
- 모바일 orientation 변경도 대응

**수정 파일**:
- `docs/css/style.css`: body 레이아웃 변경, `#game-container` 절대 위치 + transform-origin 설정
- `docs/index.html`: 반응형 스케일 조정 인라인 스크립트 추가

**수정 내용 요약**:
```
body: flex 레이아웃 → position: relative + width/height 100vw/vh
#game-container: position absolute + top/left 50% + translate(-50%,-50%)
JS: window.resize 이벤트에서 scale = min(vw/800, vh/600) 계산 후 transform 적용
```

---

### [4] 스킬별 고유 VFX (2026-03-16)

**이전 상태**: 번개(⚡)·연타(🌀)·맹독(☠) 외 흡혈/광전사/강철 피부 VFX 없음

**추가 VFX:**
- **흡혈(lifesteal)**: 공격 시 힐량만큼 분홍 "+숫자" 팝업 + 하트(♥) 파티클 2개
- **광전사(berserker)**: HP < 50% 공격 시 30% 확률로 주황 불꽃 링 2중 파동 (스팸 방지)
- **강철 피부(ironSkin)**: 피격 시 차단량 > 0이면 파란 방패 파동 플래시

**수정 파일:**
- `docs/js/vfx/VFXManager.js`: `showHealNumber`, `showShieldBlock`, `showBerserkerFlame` 3개 함수 추가
- `docs/js/systems/SkillSystem.js`: `applyLifesteal()` 힐량 반환하도록 수정
- `docs/js/systems/CombatSystem.js`: heroAttack 이벤트에 `lifestealHeal`, `berserkerActive` 포함 / monsterAttack 이벤트에 `ironSkinBlocked` 포함
- `docs/js/scenes/GameScene.js`: `_onHeroAttack`, `_onMonsterAttack`에서 새 VFX 호출

---

### [3] 콘텐츠 확장 (2026-03-16)

**QuestSystem:**
- QUEST_POOL에 `craft` 타입 추가 (제작 퀘스트, 목표 2/5/10/20)
- DAILY_DEFS에 3개 추가: 보스 사냥(killBoss×3, 영혼석2), 일일 제작(craft×3, 영혼석1), 일일 크리티컬(crit×50, 영혼석1)

**CraftingSystem:**
- 6개 레시피 추가: 대형 경험의 서 / 펫 먹이(소)×3 / 펫 먹이(중)×2 / HP포션×2 / 부활석 / 영혼석
- 제작 성공 시 `QuestSystem.updateProgress('craft', 1)` 호출
- 새 result 타입 처리: `petFood`, `shopItem`, `soulStone`, `expBook2`

**ShopSystem:**
- 소모품 3개 추가: 완전 회복 포션(HP 100%), 전투 부스터(ATK 1.5배 10분), 집중 부스터(크리티컬 1.5배 10분)
- GameState.shop 초기값에 새 필드 추가

**CombatSystem:**
- 전투 부스터(`atkBooster`) 적용: 영웅 effectiveAtk에 1.5배 곱셈
- 집중 부스터(`critBooster`) 적용: effectiveCrit에 1.5배 (최대 100% 캡)
- 연타 계산도 effectiveCrit 사용하도록 수정

**SaveSystem:**
- 새 shop.inventory/activeBuffs 필드 복원 코드 추가 (기존 세이브는 || 0 fallback)

---

### [2] 타이틀/슬롯 선택 화면 구현 (2026-03-16)

**문제**: 게임 시작 시 BootScene이 바로 세이브 로드 후 GameScene으로 전환. 슬롯 선택이 게임 진입 후 설정 패널에서만 가능했음.

**구현 내용**:
- 새 씬 `TitleScene` 추가 (TitleScene → BootScene → GameScene 순서)
- 게임 시작 시 슬롯 선택 화면 표시 (3개 슬롯 카드)
  - 저장 데이터: 레벨, 스테이지, 환생 횟수, 플레이 시간, 마지막 저장 시각
  - 빈 슬롯: 📂 아이콘 + "새 게임" 버튼
  - 저장 슬롯: 데이터 요약 + "이어하기" 버튼(금색)
- Phaser 캔버스 위에 별 파티클(깜박이는 별 60개) 배경 애니메이션
- 게임 로고(⚔️) 상하 부유 애니메이션
- 슬롯 선택 시 `SaveSlotManager.setActiveSlot(n)` → BootScene 진행

**수정/추가 파일**:
- `docs/js/scenes/TitleScene.js`: 신규 생성
- `docs/js/main.js`: scene 배열에 TitleScene 추가
- `docs/index.html`: TitleScene.js 스크립트 로드 추가
- `docs/css/style.css`: 타이틀 화면 전용 스타일 추가

---
