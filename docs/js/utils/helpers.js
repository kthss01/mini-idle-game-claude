// ===== 숫자 포맷 =====
function formatNumber(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return Math.floor(n).toString();
}

function formatTime(seconds) {
  if (seconds < 60) return seconds + '초';
  if (seconds < 3600) return Math.floor(seconds / 60) + '분 ' + (seconds % 60) + '초';
  return Math.floor(seconds / 3600) + '시간 ' + Math.floor((seconds % 3600) / 60) + '분';
}

// ===== 랜덤 유틸 =====
function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
  return Math.floor(randomBetween(min, max + 1));
}

// ===== 색상 유틸 =====
function lerpColor(a, b, t) {
  const ah = parseInt(a.slice(1), 16);
  const bh = parseInt(b.slice(1), 16);
  const ar = ah >> 16, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
  const br = bh >> 16, bg = (bh >> 8) & 0xff, bb = bh & 0xff;
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return '#' + ((rr << 16) | (rg << 8) | rb).toString(16).padStart(6, '0');
}

// ===== 퍼센트 클램프 =====
function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

// ===== 쿨다운 계산 =====
function spdToCooldown(spd) {
  // spd가 높을수록 공격 간격이 짧아짐 (최소 200ms)
  return Math.max(200, 2000 - (spd - 1) * 80);
}
