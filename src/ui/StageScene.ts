/**
 * ライブステージの SVG を組み立てる。
 * 各パーツに class を付け、出現アニメーションは CSS 側（style.css）で制御する。
 * viewBox は 1000x600。下端基準（xMidYMax slice）で画面に合わせる。
 */

function drumKit(): string {
  return `
  <g class="st-drums" transform="translate(500 395)">
    <!-- ライザー -->
    <rect x="-190" y="40" width="380" height="34" rx="4" fill="#1c1c22" stroke="#2c2c35"/>
    <rect x="-190" y="40" width="380" height="5" fill="#3a3a46"/>
    <!-- シンバルスタンド -->
    <line x1="-150" y1="40" x2="-120" y2="-120" stroke="#9aa0ad" stroke-width="3"/>
    <line x1="150" y1="40" x2="125" y2="-115" stroke="#9aa0ad" stroke-width="3"/>
    <line x1="-205" y1="40" x2="-200" y2="-60" stroke="#9aa0ad" stroke-width="3"/>
    <!-- フロアタム -->
    <g transform="translate(120 -10)">
      <rect x="-48" y="-30" width="96" height="70" rx="6" fill="#8b1e2d" stroke="#5a0f1a" stroke-width="2"/>
      <ellipse cx="0" cy="-30" rx="48" ry="12" fill="#f3eee4" stroke="#c9c0b0" stroke-width="2"/>
      <line x1="-36" y1="40" x2="-40" y2="70" stroke="#9aa0ad" stroke-width="3"/>
      <line x1="36" y1="40" x2="40" y2="70" stroke="#9aa0ad" stroke-width="3"/>
    </g>
    <!-- ラックタム -->
    <g transform="translate(-45 -62)">
      <rect x="-38" y="-22" width="76" height="50" rx="5" fill="#8b1e2d" stroke="#5a0f1a" stroke-width="2"/>
      <ellipse cx="0" cy="-22" rx="38" ry="10" fill="#f3eee4" stroke="#c9c0b0" stroke-width="2"/>
    </g>
    <g transform="translate(45 -66)">
      <rect x="-42" y="-24" width="84" height="54" rx="5" fill="#8b1e2d" stroke="#5a0f1a" stroke-width="2"/>
      <ellipse cx="0" cy="-24" rx="42" ry="11" fill="#f3eee4" stroke="#c9c0b0" stroke-width="2"/>
    </g>
    <!-- スネア -->
    <g transform="translate(-125 -5)">
      <rect x="-40" y="-18" width="80" height="34" rx="4" fill="#d9d2c4" stroke="#8d8577" stroke-width="2"/>
      <ellipse cx="0" cy="-18" rx="40" ry="10" fill="#f6f2ea" stroke="#c9c0b0" stroke-width="2"/>
      <line x1="-20" y1="16" x2="-25" y2="55" stroke="#9aa0ad" stroke-width="3"/>
      <line x1="20" y1="16" x2="25" y2="55" stroke="#9aa0ad" stroke-width="3"/>
    </g>
    <!-- バスドラム -->
    <g class="st-kick">
      <circle cx="0" cy="0" r="62" fill="#8b1e2d" stroke="#5a0f1a" stroke-width="3"/>
      <circle cx="0" cy="0" r="50" fill="#f3eee4" stroke="#c9c0b0" stroke-width="2"/>
      <circle cx="0" cy="0" r="50" fill="url(#st-kickShade)"/>
      <text x="0" y="8" text-anchor="middle" font-family="Impact, 'Arial Black', sans-serif" font-size="22" fill="#2a2a2a" letter-spacing="1">ENTER</text>
      <!-- ペダル -->
      <rect x="-10" y="55" width="20" height="8" fill="#555"/>
    </g>
    <!-- ハイハット -->
    <g class="st-hihat" transform="translate(-200 -60)">
      <ellipse cx="0" cy="0" rx="34" ry="6" fill="#e2c15c" stroke="#a88a2a" stroke-width="2"/>
      <ellipse cx="0" cy="6" rx="34" ry="6" fill="#d7b64e" stroke="#a88a2a" stroke-width="2"/>
    </g>
    <!-- クラッシュ（左） -->
    <g transform="translate(-120 -120)"><g class="st-crash st-crash-l">
      <ellipse cx="0" cy="0" rx="58" ry="10" fill="#e8c860" stroke="#a88a2a" stroke-width="2"/>
      <circle cx="0" cy="0" r="7" fill="#b8972f"/>
    </g></g>
    <!-- クラッシュ/ライド（右） -->
    <g transform="translate(125 -115)"><g class="st-crash st-crash-r">
      <ellipse cx="0" cy="0" rx="66" ry="11" fill="#e8c860" stroke="#a88a2a" stroke-width="2"/>
      <circle cx="0" cy="0" r="8" fill="#b8972f"/>
    </g></g>
  </g>`;
}

function ampStack(x: number, flip = false): string {
  const s = flip ? -1 : 1;
  return `
  <g class="st-amp" transform="translate(${x} 455) scale(${s} 1)">
    <!-- キャビネット -->
    <rect x="-70" y="-120" width="140" height="120" rx="4" fill="#15151a" stroke="#2e2e38" stroke-width="2"/>
    <rect x="-62" y="-112" width="124" height="104" rx="3" fill="#2a2a33"/>
    <g fill="none" stroke="#3b3b47" stroke-width="2">
      <circle cx="-30" cy="-84" r="22"/><circle cx="30" cy="-84" r="22"/>
      <circle cx="-30" cy="-36" r="22"/><circle cx="30" cy="-36" r="22"/>
    </g>
    <g fill="#1a1a20"><circle cx="-30" cy="-84" r="8"/><circle cx="30" cy="-84" r="8"/><circle cx="-30" cy="-36" r="8"/><circle cx="30" cy="-36" r="8"/></g>
    <!-- ヘッド -->
    <rect x="-66" y="-170" width="132" height="46" rx="3" fill="#15151a" stroke="#2e2e38" stroke-width="2"/>
    <rect x="-58" y="-162" width="116" height="20" rx="2" fill="#d4b465"/>
    <g fill="#222"><circle cx="-40" cy="-152" r="5"/><circle cx="-22" cy="-152" r="5"/><circle cx="-4" cy="-152" r="5"/><circle cx="14" cy="-152" r="5"/><circle cx="32" cy="-152" r="5"/></g>
    <circle class="st-amp-led" cx="48" cy="-152" r="3.5" fill="#ff3b3b"/>
    <text x="0" y="-131" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="11" fill="#e8dcb8">Finale</text>
  </g>`;
}

function guitarLeft(): string {
  // レスポール風
  return `
  <g class="st-guitar st-guitar-l" transform="translate(240 330) rotate(-28)">
    <path d="M-40,-10 C-70,-30 -70,30 -40,45 C-25,55 -5,55 10,45 C30,35 40,20 42,0 C44,-25 25,-45 0,-45 C-20,-45 -32,-30 -40,-10 Z" fill="#c9742a" stroke="#4a2a10" stroke-width="3"/>
    <path d="M-30,-8 C-50,-20 -50,25 -30,38 C-15,45 5,45 15,38 C30,30 36,15 36,0 C36,-20 20,-35 0,-35 C-15,-35 -25,-22 -30,-8 Z" fill="#e5a44a" opacity="0.55"/>
    <rect x="-150" y="-7" width="125" height="14" rx="3" fill="#3b2412" stroke="#1f1208" stroke-width="2"/>
    <g stroke="#b8b0a0" stroke-width="1.5"><line x1="-140" y1="-7" x2="-140" y2="7"/><line x1="-125" y1="-7" x2="-125" y2="7"/><line x1="-110" y1="-7" x2="-110" y2="7"/><line x1="-95" y1="-7" x2="-95" y2="7"/><line x1="-80" y1="-7" x2="-80" y2="7"/><line x1="-65" y1="-7" x2="-65" y2="7"/><line x1="-50" y1="-7" x2="-50" y2="7"/><line x1="-35" y1="-7" x2="-35" y2="7"/></g>
    <path d="M-150,-11 L-182,-16 L-186,16 L-150,11 Z" fill="#1f1208"/>
    <rect x="-12" y="-16" width="14" height="32" rx="2" fill="#2a2a2a"/>
    <rect x="12" y="-16" width="14" height="32" rx="2" fill="#2a2a2a"/>
    <g stroke="#ddd" stroke-width="0.8" opacity="0.8"><line x1="-150" y1="-4" x2="38" y2="-4"/><line x1="-150" y1="-1.5" x2="38" y2="-1.5"/><line x1="-150" y1="1" x2="38" y2="1"/><line x1="-150" y1="3.5" x2="38" y2="3.5"/></g>
  </g>`;
}

function guitarRight(): string {
  // フライングV風
  return `
  <g class="st-guitar st-guitar-r" transform="translate(760 330) rotate(28) scale(-1 1)">
    <path d="M-20,-30 L50,-60 L30,0 L50,60 L-20,30 Z" fill="#f2f2f2" stroke="#333" stroke-width="3" stroke-linejoin="round"/>
    <rect x="-150" y="-7" width="135" height="14" rx="3" fill="#3b2412" stroke="#1f1208" stroke-width="2"/>
    <g stroke="#b8b0a0" stroke-width="1.5"><line x1="-140" y1="-7" x2="-140" y2="7"/><line x1="-125" y1="-7" x2="-125" y2="7"/><line x1="-110" y1="-7" x2="-110" y2="7"/><line x1="-95" y1="-7" x2="-95" y2="7"/><line x1="-80" y1="-7" x2="-80" y2="7"/><line x1="-65" y1="-7" x2="-65" y2="7"/><line x1="-50" y1="-7" x2="-50" y2="7"/></g>
    <path d="M-150,-11 L-184,-20 L-184,20 L-150,11 Z" fill="#1f1208"/>
    <rect x="-8" y="-16" width="14" height="32" rx="2" fill="#2a2a2a"/>
    <rect x="16" y="-16" width="14" height="32" rx="2" fill="#2a2a2a"/>
    <g stroke="#999" stroke-width="0.8" opacity="0.8"><line x1="-150" y1="-4" x2="30" y2="-4"/><line x1="-150" y1="-1.5" x2="30" y2="-1.5"/><line x1="-150" y1="1" x2="30" y2="1"/><line x1="-150" y1="3.5" x2="30" y2="3.5"/></g>
  </g>`;
}

function lights(): string {
  const beams: string[] = [];
  const spots = [
    { x: 120, color: '#ff4d6d', rot: 25 },
    { x: 330, color: '#ffd166', rot: 12 },
    { x: 500, color: '#ffffff', rot: 0 },
    { x: 670, color: '#4cc9f0', rot: -12 },
    { x: 880, color: '#b5179e', rot: -25 },
  ];
  spots.forEach((s, i) => {
    beams.push(`
    <g transform="translate(${s.x} 30)"><g class="st-beam st-beam-${i}" style="--rot:${s.rot}deg">
      <polygon points="0,0 -140,620 140,620" fill="url(#st-beamGrad)" style="color:${s.color}"/>
    </g></g>`);
  });
  const cans = spots
    .map(
      (s) => `
    <g transform="translate(${s.x} 30)">
      <rect x="-16" y="-14" width="32" height="26" rx="3" fill="#2a2a33" stroke="#444" />
      <circle class="st-can" cx="0" cy="12" r="9" fill="${s.color}"/>
    </g>`,
    )
    .join('');
  return `
  <g class="st-lights">
    ${beams.join('')}
    <!-- トラス -->
    <rect x="0" y="10" width="1000" height="10" fill="#2b2b33"/>
    <rect x="0" y="34" width="1000" height="6" fill="#23232b"/>
    <g stroke="#3a3a45" stroke-width="3">
      ${Array.from({ length: 25 }, (_, i) => `<line x1="${i * 40}" y1="20" x2="${i * 40 + 40}" y2="34"/>`).join('')}
    </g>
    ${cans}
  </g>`;
}

function crowd(): string {
  // 3 列のシルエット。前列ほど大きい
  const rows = [
    { y: 600, scale: 1.25, count: 11, cls: 'st-row-front', offset: 0 },
    { y: 570, scale: 1.05, count: 13, cls: 'st-row-mid', offset: 38 },
    { y: 548, scale: 0.9, count: 15, cls: 'st-row-back', offset: 10 },
  ];
  let seed = 7;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const out: string[] = [];
  for (const row of rows) {
    const gap = 1000 / row.count;
    const people: string[] = [];
    for (let i = 0; i < row.count; i++) {
      const x = i * gap + gap / 2 + row.offset + (rnd() - 0.5) * 20;
      const delay = (rnd() * 0.6).toFixed(2);
      const bounce = (0.42 + rnd() * 0.25).toFixed(2);
      const armsUp = rnd() > 0.35;
      const arms = armsUp
        ? `<path class="st-arm st-arm-l" d="M-14,-48 C-22,-62 -28,-76 -30,-92" stroke="#06060a" stroke-width="7" fill="none" stroke-linecap="round"/>
           <path class="st-arm st-arm-r" d="M14,-48 C22,-62 28,-76 30,-92" stroke="#06060a" stroke-width="7" fill="none" stroke-linecap="round"/>`
        : `<path class="st-arm st-arm-clap" d="M-14,-46 C-10,-60 -2,-66 6,-62" stroke="#06060a" stroke-width="7" fill="none" stroke-linecap="round"/>
           <path class="st-arm st-arm-clap2" d="M14,-46 C10,-60 2,-66 -6,-62" stroke="#06060a" stroke-width="7" fill="none" stroke-linecap="round"/>`;
      people.push(`
      <g transform="translate(${x.toFixed(1)} 0) scale(${row.scale})"><g class="st-person" style="--d:${delay}s; --b:${bounce}s">
        <ellipse cx="0" cy="-20" rx="22" ry="34" fill="#06060a"/>
        <circle cx="0" cy="-62" r="15" fill="#06060a"/>
        ${arms}
      </g></g>`);
    }
    out.push(`<g class="st-row ${row.cls}" transform="translate(0 ${row.y})">${people.join('')}</g>`);
  }
  return `<g class="st-crowd">${out.join('')}</g>`;
}

export function buildStageSVG(): string {
  return `
<svg class="stage-svg" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="st-bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#070711"/>
      <stop offset="0.6" stop-color="#140c22"/>
      <stop offset="1" stop-color="#2a0f1c"/>
    </linearGradient>
    <linearGradient id="st-beamGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="currentColor" stop-opacity="0.85"/>
      <stop offset="1" stop-color="currentColor" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="st-kickShade" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0.7" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.25"/>
    </radialGradient>
    <radialGradient id="st-glow" cx="0.5" cy="0.9" r="0.7">
      <stop offset="0" stop-color="#ff7a59" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#ff7a59" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="st-floor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2a2a33"/>
      <stop offset="1" stop-color="#0d0d12"/>
    </linearGradient>
  </defs>
  <rect class="st-bgrect" width="1000" height="600" fill="url(#st-bg)"/>
  <rect class="st-glowrect" width="1000" height="600" fill="url(#st-glow)"/>
  <!-- 床 -->
  <rect class="st-floorrect" x="0" y="470" width="1000" height="130" fill="url(#st-floor)"/>
  <!-- スモーク -->
  <g class="st-smoke" opacity="0.5">
    <ellipse cx="300" cy="480" rx="260" ry="36" fill="#8a7bb0" opacity="0.18"/>
    <ellipse cx="700" cy="488" rx="300" ry="40" fill="#8a7bb0" opacity="0.16"/>
  </g>
  <g class="anim anim-lights">${lights()}</g>
  <g class="anim anim-amp anim-amp-l">${ampStack(120)}</g>
  <g class="anim anim-amp anim-amp-r">${ampStack(880, true)}</g>
  <g class="anim anim-drums">${drumKit()}</g>
  <g class="anim anim-guitar anim-guitar-l">${guitarLeft()}</g>
  <g class="anim anim-guitar anim-guitar-r">${guitarRight()}</g>
  <!-- 火花 -->
  <g class="st-sparks anim anim-sparks">
    ${Array.from({ length: 18 }, (_, i) => {
      const x = 80 + ((i * 53) % 840);
      const d = ((i * 37) % 100) / 100;
      return `<circle class="st-spark" style="--d:${d.toFixed(2)}s" cx="${x}" cy="${120 + ((i * 71) % 300)}" r="${2 + (i % 3)}" fill="#ffe08a"/>`;
    }).join('')}
  </g>
  <g class="anim anim-crowd">${crowd()}</g>
</svg>`;
}
