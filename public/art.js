"use strict";
/**
 * Иллюстрации: встроенные SVG без внешних файлов и шрифтов.
 *
 * Общие правила рисунка слова:
 *   viewBox 0 0 240 170, предмет занимает примерно x 40..200, y 30..150,
 *   снизу общая тень SHADOW, цвета — из PALETTE.
 *   Без градиентов и фильтров: плоские заливки читаются на маленьком экране.
 *
 * Как добавить слово: положите рисунок в WORD_ART под тем же ключом,
 * который указан в поле art в public/curriculum.js.
 * Посмотреть все рисунки разом: npm run dev, затем /art-sheet.html.
 */
const ART = (() => {
  // Палитра повторяет цвета интерфейса: рисунки не должны спорить со страницей.
  const PALETTE = {
    leaf: "#91ab76",
    leafDark: "#587e54",
    sage: "#9aa978",
    mint: "#b3c7af",
    paleMint: "#dee5d3",
    teal: "#60838a",
    water: "#7fa3a8",
    clay: "#d4614e",
    coral: "#d88668",
    gold: "#eabf70",
    yellow: "#f3cf74",
    amber: "#cb9651",
    cream: "#fffdf5",
    bone: "#faf9ed",
    wood: "#9c673f",
    bark: "#b58a5e",
    ink: "#425748",
  };

  const svg = (body, viewBox = "0 0 240 170", className = "") =>
    `<svg class="${className}" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;

  const flower = (x, y, color = "#d88668", scale = 1) =>
    `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M0 0V86" stroke="#587e54" stroke-width="6" stroke-linecap="round"/><path d="M-2 64C-35 62-38 39-31 36C-6 35 0 53-2 64M2 45C32 44 33 24 29 21C8 22 0 36 2 45" fill="#91ab76"/><g fill="${color}">${[0, 60, 120, 180, 240, 300].map((a) => `<ellipse cx="0" cy="-20" rx="14" ry="21" transform="rotate(${a})"/>`).join("")}</g><circle r="18" fill="#f4d47d"/><circle cx="-6" cy="-2" r="2" fill="#4b563a"/><circle cx="6" cy="-2" r="2" fill="#4b563a"/><path d="M-5 6Q0 10 5 6" fill="none" stroke="#4b563a" stroke-width="2" stroke-linecap="round"/></g>`;

  const SHADOW = '<ellipse cx="120" cy="150" rx="86" ry="9" fill="#e9eadd"/>';

  // Облачко для радуги — один и тот же контур, сдвигаемый и уменьшаемый.
  const CLOUD =
    '<path d="M78 24c-8-26-44-22-48 0-16-10-31 0-31 11h107c0-12-17-23-28-11"/>';

  /** Рисунки слов. Ключ совпадает с полем art в curriculum.js. */
  const WORD_ART = {
    // --- С (были в первой версии) ---
    sled: '<path d="M62 101v33m106-33v33M46 129h132q24 0 27-26M41 145h139q26 0 31-24" stroke="#60838a" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M168 84c-2-41 13-47 26-43" stroke="#60838a" stroke-width="7" fill="none" stroke-linecap="round"/><rect x="44" y="86" width="142" height="15" rx="6" fill="#ce7555"/><path d="M54 74h125" stroke="#eabf70" stroke-width="14" stroke-linecap="round"/><path d="M188 88q26 1 32-39" stroke="#b2916b" stroke-width="3" fill="none"/><path d="M30 51h10m-5-5v10M73 32h10m-5-5v10M213 80h10m-5-5v10" stroke="#b8c7c5" stroke-width="3" stroke-linecap="round"/>',
    sugar:
      '<path d="M53 92q0 57 67 57t67-57" fill="#b3c7af"/><ellipse cx="120" cy="91" rx="67" ry="18" fill="#dee5d3"/><g fill="#fffdf5" stroke="#dad9c9" stroke-width="2"><path d="m70 73 26-9 28 10-1 29-27 10-26-11Z"/><path d="m116 70 26-9 29 10v30l-28 10-27-11Z"/><path d="m94 42 26-9 27 10v30l-27 10-26-11Z"/></g><g fill="none" stroke="#e2decd" stroke-width="2"><path d="m94 42 26 12 27-11m-27 11v29M70 73l27 11 27-10M97 84v28m19-42 27 11 28-10m-28 10v29"/></g>',
    bag: '<path d="M84 67V46a36 36 0 0 1 72 0v21" fill="none" stroke="#9c673f" stroke-width="10"/><path d="M64 55h112l16 84q-72 21-144 0Z" fill="#dfa776"/><path d="M65 57h111l6 28H59Z" fill="#eabb86"/><rect x="92" y="90" width="56" height="41" rx="9" fill="#f4d8a3"/><path d="M109 104q12-20 22 0-1 12-11 18-11-7-11-18" fill="#cb8059"/><path d="M62 134h116" stroke="#c48b5e" stroke-width="3" stroke-dasharray="4 5"/>',
    bagels:
      '<ellipse cx="120" cy="119" rx="87" ry="26" fill="#d5e1d2"/><ellipse cx="120" cy="117" rx="71" ry="17" fill="#e8ede0"/><g fill="none" stroke="#cb9651" stroke-width="20"><ellipse cx="77" cy="109" rx="26" ry="18" transform="rotate(-18 77 109)"/><ellipse cx="151" cy="110" rx="27" ry="18" transform="rotate(15 151 110)"/><ellipse cx="115" cy="80" rx="30" ry="20" transform="rotate(-12 115 80)"/></g><g fill="none" stroke="#efd190" stroke-width="4" stroke-linecap="round"><path d="M51 104q6-14 23-14M129 101q18-10 34 1M88 75q13-15 34-13"/></g>',
    owls: '<path d="M24 143h192" stroke="#a3825c" stroke-width="7" stroke-linecap="round"/><g transform="translate(33 30)"><path d="M7 40 6 6 28 25Q43 20 57 25L77 5v39q14 77-34 77T7 40" fill="#b4bda0"/><path d="M9 59Q-7 102 25 104" fill="#8f9f7c"/><ellipse cx="42" cy="80" rx="27" ry="36" fill="#e3e1c7"/><circle cx="26" cy="48" r="19" fill="#fffbed"/><circle cx="58" cy="48" r="19" fill="#fffbed"/><circle cx="29" cy="49" r="7" fill="#425748"/><circle cx="55" cy="49" r="7" fill="#425748"/><path d="m35 61 7 11 8-11Z" fill="#d4a15f"/></g><g transform="translate(129 44) scale(.87)"><path d="M7 40 6 6 28 25Q43 20 57 25L77 5v39q14 77-34 77T7 40" fill="#c9a58a"/><path d="M75 59q15 43-16 45" fill="#af8a71"/><ellipse cx="42" cy="80" rx="27" ry="36" fill="#f0dcc1"/><circle cx="26" cy="48" r="19" fill="#fffbed"/><circle cx="58" cy="48" r="19" fill="#fffbed"/><circle cx="29" cy="49" r="7" fill="#425748"/><circle cx="55" cy="49" r="7" fill="#425748"/><path d="m35 61 7 11 8-11Z" fill="#d4a15f"/></g>',
    honey:
      '<g fill="#f2cf79" stroke="#c89943" stroke-width="5" stroke-linejoin="round">' +
      [
        [82, 59],
        [127, 59],
        [60, 99],
        [105, 99],
        [150, 99],
        [127, 139],
      ]
        .map(([x, y]) => `<path d="M${x} ${y - 24}l22 12v24l-22 12-22-12v-24Z"/>`)
        .join("") +
      '</g><g transform="translate(183 40) rotate(18)"><ellipse cx="-9" cy="-9" rx="10" ry="14" fill="#e3e8d6"/><ellipse cx="9" cy="-9" rx="10" ry="14" fill="#e3e8d6"/><ellipse cy="6" rx="17" ry="12" fill="#e8bb57"/><path d="M-5-4v20m11-20v20" stroke="#647058" stroke-width="5"/><circle cx="16" cy="4" r="3" fill="#405542"/></g>',

    // --- С: новые ---
    cheese:
      '<path d="M54 130V74q0-7 8-6 82 9 106 62 3 6-4 6Z" fill="#f0c766"/><path d="M54 74q0-7 8-6 82 9 106 62" fill="none" stroke="#d9a63e" stroke-width="4" stroke-linejoin="round"/><g fill="#dba93f"><ellipse cx="78" cy="112" rx="10" ry="8"/><ellipse cx="110" cy="122" rx="8" ry="6.5"/><ellipse cx="72" cy="90" rx="6" ry="5"/><ellipse cx="104" cy="100" rx="5.5" ry="4.5"/><ellipse cx="136" cy="126" rx="6" ry="5"/></g><path d="M54 124h114" stroke="#e0b455" stroke-width="3"/>',
    beads:
      '<path d="M70 48Q120 150 170 48" fill="none" stroke="#c6cfba" stroke-width="3"/><path d="M70 48q50-22 100 0" fill="none" stroke="#c6cfba" stroke-width="3" stroke-dasharray="5 5"/><g><circle cx="80" cy="66" r="10" fill="#d88668"/><circle cx="90" cy="81" r="10" fill="#7fa3a8"/><circle cx="100" cy="91" r="10" fill="#f3cf74"/><circle cx="110" cy="97" r="10" fill="#d88668"/><circle cx="120" cy="99" r="11" fill="#8fb87e"/><circle cx="130" cy="97" r="10" fill="#d88668"/><circle cx="140" cy="91" r="10" fill="#f3cf74"/><circle cx="150" cy="81" r="10" fill="#7fa3a8"/><circle cx="160" cy="66" r="10" fill="#d88668"/></g><g fill="#fffdf5" opacity=".55"><circle cx="77" cy="62" r="3"/><circle cx="117" cy="95" r="3.5"/><circle cx="157" cy="62" r="3"/></g><circle cx="70" cy="48" r="6" fill="#c6cfba"/><circle cx="170" cy="48" r="6" fill="#c6cfba"/>',

    // --- М ---
    poppy:
      '<path d="M120 152V70" stroke="#587e54" stroke-width="7" stroke-linecap="round"/><path d="M119 130q-36-4-38-28 28-7 38 28" fill="#91ab76"/><path d="M121 112q30-8 30-28-24-5-30 28" fill="#9dad7f"/><g fill="#d4614e" transform="translate(120 64)"><ellipse cy="-18" rx="27" ry="23"/><ellipse cx="-26" cy="5" rx="25" ry="21"/><ellipse cx="26" cy="5" rx="25" ry="21"/><ellipse cy="23" rx="23" ry="18"/></g><circle cx="120" cy="64" r="15" fill="#4b4436"/><g fill="#7a705a"><circle cx="141" cy="64" r="2.6"/><circle cx="135" cy="49" r="2.6"/><circle cx="120" cy="43" r="2.6"/><circle cx="105" cy="49" r="2.6"/><circle cx="99" cy="64" r="2.6"/><circle cx="105" cy="79" r="2.6"/><circle cx="120" cy="85" r="2.6"/><circle cx="135" cy="79" r="2.6"/></g>',
    car: '<path d="M44 124v-16q0-9 9-11l23-5 16-19q5-6 13-6h32q8 0 13 6l16 19 23 5q9 2 9 11v16Z" fill="#d9744f"/><path d="M94 75h20v18H79l12-16q1-2 3-2Z" fill="#cfe0e2"/><path d="M120 75h22q2 0 4 2l12 16h-38Z" fill="#cfe0e2"/><path d="M46 104h148" stroke="#c0603e" stroke-width="3"/><rect x="186" y="98" width="14" height="10" rx="5" fill="#f3cf74"/><rect x="40" y="98" width="13" height="10" rx="5" fill="#f5efdc"/><circle cx="80" cy="124" r="19" fill="#4f5a4c"/><circle cx="80" cy="124" r="8.5" fill="#e6e8dc"/><circle cx="162" cy="124" r="19" fill="#4f5a4c"/><circle cx="162" cy="124" r="8.5" fill="#e6e8dc"/>',
    fly: '<g transform="translate(120 86)"><ellipse cx="-32" cy="-28" rx="34" ry="18" transform="rotate(-30 -32 -28)" fill="#dde6e4"/><ellipse cx="32" cy="-28" rx="34" ry="18" transform="rotate(30 32 -28)" fill="#dde6e4"/><g stroke="#5b6353" stroke-width="4" stroke-linecap="round" fill="none"><path d="M-22 28-42 46M0 34-4 54M22 28 42 46M-26 4-48 8M26 4 48 8"/></g><ellipse cy="14" rx="33" ry="27" fill="#6d7766"/><ellipse cy="-12" rx="25" ry="21" fill="#7f8a76"/><circle cy="-36" r="19" fill="#5f6857"/><circle cx="-10" cy="-40" r="9" fill="#d98a5f"/><circle cx="10" cy="-40" r="9" fill="#d98a5f"/><circle cx="-12" cy="-43" r="3" fill="#fffdf4"/><circle cx="8" cy="-43" r="3" fill="#fffdf4"/><path d="M-13 24h26M-17 12h34" stroke="#59624f" stroke-width="3" stroke-linecap="round"/><path d="M-8-52-16-64M8-52 16-64" stroke="#5f6857" stroke-width="3" stroke-linecap="round"/></g>',
    ant: '<g transform="translate(118 96)"><g stroke="#7a5642" stroke-width="4" stroke-linecap="round" fill="none"><path d="M-6-6-26-26-40-18M-2 2-14 28-32 34M2 0 8 28-6 40M4-8 26-24 42-16M6 2 26 22 44 20"/></g><ellipse cx="40" cy="-2" rx="28" ry="22" fill="#a75b40"/><ellipse cx="2" cy="-4" rx="17" ry="15" fill="#bb6a4c"/><circle cx="-32" cy="-14" r="18" fill="#a75b40"/><path d="M-40-30-52-46M-26-30-20-50" stroke="#a75b40" stroke-width="4" stroke-linecap="round" fill="none"/><circle cx="-52" cy="-46" r="3.5" fill="#a75b40"/><circle cx="-20" cy="-50" r="3.5" fill="#a75b40"/><circle cx="-38" cy="-18" r="4" fill="#3f3a33"/><path d="M28-12q14 3 22 11" stroke="#c98a6b" stroke-width="3" fill="none" stroke-linecap="round"/></g>',
    sea: '<circle cx="186" cy="46" r="19" fill="#f3cf74"/><path d="M34 102q22-14 44 0t44 0 44 0 44 0v50H34Z" fill="#8fb4bb"/><path d="M34 118q22-13 44 0t44 0 44 0 44 0v34H34Z" fill="#6f9ba4"/><path d="M34 132q22-11 44 0t44 0 44 0 44 0v20H34Z" fill="#5a8a94"/><g fill="none" stroke="#fffdf5" stroke-width="3" stroke-linecap="round"><path d="M60 113q8-6 16 0M136 111q8-6 16 0M96 129q8-6 16 0M156 141q8-6 16 0"/></g><g fill="none" stroke="#8d9a86" stroke-width="3" stroke-linecap="round"><path d="M48 52q7-7 14 0M62 52q7-7 14 0M98 34q6-6 12 0M110 34q6-6 12 0"/></g>',
    bridge:
      '<path d="M30 138h180" stroke="#9fc0c4" stroke-width="12" stroke-linecap="round"/><g fill="none" stroke="#fffdf5" stroke-width="3" stroke-linecap="round"><path d="M52 139q7-6 14 0M96 141q7-6 14 0M158 139q7-6 14 0"/></g><path d="M66 132a54 54 0 0 1 108 0" fill="none" stroke="#c9a47a" stroke-width="15"/><rect x="40" y="94" width="18" height="40" fill="#c9a47a"/><rect x="182" y="94" width="18" height="40" fill="#c9a47a"/><rect x="30" y="80" width="180" height="16" rx="6" fill="#dcbd92"/><g stroke="#c9a47a" stroke-width="5" stroke-linecap="round"><path d="M44 80V66M82 80V66M120 80V66M158 80V66M196 80V66"/></g><rect x="30" y="58" width="180" height="9" rx="4" fill="#dcbd92"/>',
    mouse:
      '<path d="M158 118q26 4 26-18t-22-14" fill="none" stroke="#c0b9ab" stroke-width="5" stroke-linecap="round"/><ellipse cx="112" cy="112" rx="52" ry="34" fill="#b9b5a6"/><circle cx="74" cy="84" r="17" fill="#cdc6b6"/><circle cx="110" cy="78" r="18" fill="#cdc6b6"/><circle cx="74" cy="84" r="9" fill="#e3c9c3"/><circle cx="110" cy="78" r="10" fill="#e3c9c3"/><ellipse cx="72" cy="112" rx="34" ry="28" fill="#c6c1b2"/><circle cx="58" cy="106" r="4" fill="#3f3a33"/><ellipse cx="40" cy="116" rx="7" ry="5.5" fill="#d98a8a"/><g stroke="#a9a293" stroke-width="2" stroke-linecap="round"><path d="M42 110 20 100M42 118 18 118M44 124 22 134"/></g>',
    soap: '<g fill="#cfe0e6"><circle cx="66" cy="50" r="14"/><circle cx="96" cy="32" r="10"/><circle cx="126" cy="46" r="7"/></g><g fill="#eaf3f5"><circle cx="62" cy="46" r="5"/><circle cx="93" cy="29" r="3.5"/></g><path d="M52 100l68-22 68 22-68 24Z" fill="#f6d6b6"/><path d="M52 100v20l68 24v-20Z" fill="#e3b78f"/><path d="M188 100v20l-68 24v-20Z" fill="#d8a97f"/><ellipse cx="120" cy="100" rx="30" ry="10" fill="#f2c79f"/><path d="M106 99q14-12 28 0" fill="none" stroke="#dcaf85" stroke-width="3" stroke-linecap="round"/>',

    // --- Х ---
    robe: '<path d="M120 30v10" stroke="#b2916b" stroke-width="4" stroke-linecap="round"/><path d="M120 30a9 9 0 0 1 9 9" fill="none" stroke="#b2916b" stroke-width="4"/><path d="M84 52 120 40l36 12" fill="none" stroke="#b2916b" stroke-width="4" stroke-linejoin="round"/><path d="M98 54q22-8 44 0l32 17-11 23-16-9v62q-40 9-80 0V85l-16 9-11-23Z" fill="#fbfaf2" stroke="#dde1d3" stroke-width="2"/><path d="M98 54 120 80l22-26" fill="#eaefe2"/><path d="M120 80v65" stroke="#dde1d3" stroke-width="2"/><rect x="128" y="104" width="24" height="18" rx="3" fill="#eaefe2"/><g fill="#c7cfbb"><circle cx="120" cy="94" r="3.5"/><circle cx="120" cy="112" r="3.5"/><circle cx="120" cy="130" r="3.5"/></g>',
    painter:
      '<path d="M74 148 98 62M166 148 142 62M80 122h80" stroke="#b58a5e" stroke-width="6" stroke-linecap="round"/><rect x="62" y="44" width="116" height="80" rx="5" fill="#fffdf4" stroke="#ddd8c4" stroke-width="3"/><path d="M65 116q28-32 52-10t60-8v18H65Z" fill="#a9c08f"/><circle cx="150" cy="66" r="12" fill="#f3cf74"/><path d="M65 116q28-32 52-10" fill="none" stroke="#8fa878" stroke-width="3"/><g transform="translate(50 134) rotate(-14)"><ellipse rx="26" ry="18" fill="#dcbd92"/><ellipse cx="9" cy="5" rx="7" ry="5" fill="#fffdf4"/><circle cx="-14" cy="-6" r="4.5" fill="#d4614e"/><circle cx="-2" cy="-9" r="4.5" fill="#60838a"/><circle cx="10" cy="-7" r="4.5" fill="#f3cf74"/></g><g transform="translate(192 126) rotate(24)"><rect x="-3" y="-32" width="6" height="42" rx="3" fill="#b58a5e"/><path d="M-4 10h8l-2 12h-4Z" fill="#8f9c88"/><path d="M-3 22h6l-3 8Z" fill="#d4614e"/></g>',
    persimmon:
      '<ellipse cx="176" cy="124" rx="26" ry="23" fill="#dd7f3c"/><g fill="#82a06d" transform="translate(176 100)"><ellipse rx="15" ry="6"/><ellipse rx="6" ry="13"/></g><ellipse cx="104" cy="104" rx="46" ry="42" fill="#e8873f"/><path d="M80 88q-9 16-3 30" fill="none" stroke="#f0a468" stroke-width="8" stroke-linecap="round"/><g fill="#82a06d" transform="translate(104 66)"><ellipse rx="23" ry="9"/><ellipse rx="9" ry="21"/><ellipse rx="19" ry="8" transform="rotate(45)"/><ellipse rx="19" ry="8" transform="rotate(-45)"/></g><circle cx="104" cy="66" r="6" fill="#6b8a58"/><path d="M104 60V42" stroke="#7a6a4e" stroke-width="5" stroke-linecap="round"/>',
    trunk:
      '<ellipse cx="164" cy="80" rx="42" ry="50" fill="#93a0a2"/><ellipse cx="136" cy="84" rx="40" ry="46" fill="#a7b2b3"/><path d="M124 116q-16 14-34 20" fill="none" stroke="#a7b2b3" stroke-width="30" stroke-linecap="round"/><path d="M92 138q-16 6-26-2" fill="none" stroke="#a7b2b3" stroke-width="22" stroke-linecap="round"/><path d="M66 136q-10-6-4-14" fill="none" stroke="#a7b2b3" stroke-width="14" stroke-linecap="round"/><g stroke="#8d9a9c" stroke-width="2.5" fill="none" stroke-linecap="round"><path d="M118 104 110 120M106 114 100 130M92 126 88 142M78 132 76 146"/></g><path d="M126 112q-10 20 6 28" fill="none" stroke="#fffdf5" stroke-width="9" stroke-linecap="round"/><circle cx="144" cy="66" r="6.5" fill="#4b5350"/><circle cx="146.5" cy="63.5" r="2.2" fill="#fffdf5"/>',
    hamster:
      '<ellipse cx="120" cy="104" rx="56" ry="44" fill="#dcc09a"/><circle cx="84" cy="64" r="15" fill="#dcc09a"/><circle cx="156" cy="64" r="15" fill="#dcc09a"/><circle cx="84" cy="64" r="8" fill="#e0b6a8"/><circle cx="156" cy="64" r="8" fill="#e0b6a8"/><ellipse cx="120" cy="116" rx="38" ry="30" fill="#f2e4cb"/><ellipse cx="76" cy="104" rx="20" ry="17" fill="#e6d0ae"/><ellipse cx="164" cy="104" rx="20" ry="17" fill="#e6d0ae"/><circle cx="102" cy="90" r="6" fill="#3f3a33"/><circle cx="138" cy="90" r="6" fill="#3f3a33"/><circle cx="104" cy="88" r="2" fill="#fffdf5"/><circle cx="140" cy="88" r="2" fill="#fffdf5"/><ellipse cx="120" cy="104" rx="7" ry="5" fill="#c98878"/><path d="M120 109v6M120 115q-7 6-13 1M120 115q7 6 13 1" fill="none" stroke="#a98a6a" stroke-width="2.5" stroke-linecap="round"/><g stroke="#c4ad8c" stroke-width="2" stroke-linecap="round"><path d="M100 104 74 98M100 110 74 114M140 104 166 98M140 110 166 114"/></g><ellipse cx="106" cy="140" rx="11" ry="8" fill="#e6d0ae"/><ellipse cx="134" cy="140" rx="11" ry="8" fill="#e6d0ae"/>',

    // --- Р ---
    rainbow:
      '<g fill="none" stroke-width="15"><path d="M32 140a88 88 0 0 1 176 0" stroke="#d4614e"/><path d="M47 140a73 73 0 0 1 146 0" stroke="#e8a15c"/><path d="M62 140a58 58 0 0 1 116 0" stroke="#f3cf74"/><path d="M77 140a43 43 0 0 1 86 0" stroke="#8fb87e"/><path d="M92 140a28 28 0 0 1 56 0" stroke="#7fa3a8"/></g><g fill="#fbfaf2"><g transform="translate(4 120) scale(.8)">' +
      CLOUD +
      '</g><g transform="translate(150 120) scale(.8)">' +
      CLOUD +
      "</g></g>",
    rocket:
      '<g stroke="#e0d9c2" stroke-width="3" stroke-linecap="round"><path d="M44 52h10m-5-5v10M196 44h10m-5-5v10M54 108h8m-4-4v8M186 104h8m-4-4v8"/></g><path d="M94 90 66 128h28Z" fill="#d4614e"/><path d="M146 90 174 128h-28Z" fill="#d4614e"/><path d="M120 24q28 28 28 66v38H92V90q0-38 28-66Z" fill="#fbfaf2" stroke="#dde1d3" stroke-width="2"/><path d="M120 24q16 16 22 38H98q6-22 22-38Z" fill="#d4614e"/><circle cx="120" cy="86" r="16" fill="#7fa3a8"/><circle cx="120" cy="86" r="10" fill="#cfe0e2"/><rect x="92" y="122" width="56" height="10" rx="4" fill="#c9cfbf"/><path d="M104 132q4 26 16 26t16-26Z" fill="#eea45c"/><path d="M111 132q3 16 9 16t9-16Z" fill="#f3cf74"/>',
    hand: '<g fill="#eec9a4" stroke="#d9ab80" stroke-width="2.5" stroke-linejoin="round"><rect x="84" y="50" width="16" height="52" rx="8"/><rect x="102" y="40" width="16" height="62" rx="8"/><rect x="120" y="44" width="16" height="58" rx="8"/><rect x="138" y="56" width="16" height="46" rx="8"/><path d="M84 96q-18-12-28-4t4 22l24 10Z"/><path d="M82 82h74v26q0 32-30 32h-14q-30 0-30-32Z"/></g><path d="M92 132h54v12q0 5-5 5h-44q-5 0-5-5Z" fill="#9db38c"/><g stroke="#d9ab80" stroke-width="2.5" fill="none" stroke-linecap="round"><path d="M96 102q22 8 46 0"/></g>',
    pear: '<path d="M114 58q-6 16-16 28-14 18-14 38 0 28 36 28t36-28q0-20-14-38-10-12-16-28Z" fill="#d3d87d"/><path d="M100 98q-7 18 1 30" fill="none" stroke="#e4e8a4" stroke-width="8" stroke-linecap="round"/><ellipse cx="140" cy="112" rx="13" ry="19" fill="#c9cc6c"/><path d="M120 60V40q0-6 6-8" fill="none" stroke="#8a6a44" stroke-width="5" stroke-linecap="round"/><path d="M126 44q22-14 36-4-8 16-32 12" fill="#8fa878"/><path d="M128 48q14-4 24 0" fill="none" stroke="#7a9463" stroke-width="2"/>',
    rose: '<path d="M120 150V88" stroke="#587e54" stroke-width="7" stroke-linecap="round"/><path d="M118 130q-32-2-34-24 26-6 34 24" fill="#91ab76"/><path d="M122 114q28-6 28-26-22-4-28 26" fill="#9dad7f"/><g transform="translate(120 64)"><g fill="#dd7059">' +
      [0, 72, 144, 216, 288]
        .map(
          (a) =>
            `<ellipse cx="0" cy="-32" rx="17" ry="14" transform="rotate(${a})"/>`,
        )
        .join("") +
      '</g><circle r="34" fill="#d4614e"/><g fill="none" stroke="#bd5342" stroke-width="4" stroke-linecap="round"><path d="M-27-12a30 30 0 0 1 52 5"/><path d="M-20 12a22 22 0 0 1 40-4"/><path d="M-9 22a13 13 0 0 0 24-8"/><path d="M-34 4a35 35 0 0 0 26 29"/></g></g>',
    magpie:
      '<path d="M24 132h190" stroke="#a3825c" stroke-width="7" stroke-linecap="round"/><path d="M132 98q42 4 70 28" fill="none" stroke="#4d5f5a" stroke-width="17" stroke-linecap="round"/><path d="M140 104q34 6 56 24" fill="none" stroke="#6f8a8e" stroke-width="5" stroke-linecap="round"/><ellipse cx="108" cy="92" rx="31" ry="27" fill="#3f4a45"/><ellipse cx="100" cy="99" rx="17" ry="16" fill="#fffdf5"/><ellipse cx="120" cy="86" rx="20" ry="13" transform="rotate(22 120 86)" fill="#fffdf5"/><circle cx="78" cy="68" r="20" fill="#3f4a45"/><path d="M60 66 38 74l22 9Z" fill="#c4a05c"/><circle cx="74" cy="63" r="3.6" fill="#fffdf5"/><g stroke="#c4a05c" stroke-width="3.5" stroke-linecap="round"><path d="M100 117v14M114 117v14"/></g>',
    fish: '<g fill="#cfe0e6"><circle cx="64" cy="48" r="8"/><circle cx="50" cy="68" r="5"/><circle cx="76" cy="32" r="4"/></g><path d="M170 98 208 70v56Z" fill="#d4614e"/><path d="M104 68q20-22 42-6-22 4-42 6Z" fill="#d4614e"/><path d="M106 130q16 18 36 4-20-2-36-4Z" fill="#d4614e"/><ellipse cx="118" cy="98" rx="52" ry="34" fill="#e8873f"/><g fill="none" stroke="#f3b57e" stroke-width="3"><path d="M124 70q10 26 0 52M146 76q9 22 0 42"/></g><circle cx="88" cy="88" r="8" fill="#fffdf5"/><circle cx="86" cy="88" r="4" fill="#3f3a33"/><path d="M68 104q8 5 15 0" fill="none" stroke="#c9642f" stroke-width="3" stroke-linecap="round"/>',
    balloons:
      '<g fill="none" stroke="#c6cfba" stroke-width="2.5" stroke-linecap="round"><path d="M76 92q10 28 44 54M120 82q-5 30 0 64M164 92q-10 28-44 54"/></g><g><ellipse cx="76" cy="60" rx="26" ry="31" fill="#d4614e"/><path d="M70 88h12l-6 8Z" fill="#c2503f"/><ellipse cx="67" cy="48" rx="6" ry="9" transform="rotate(-20 67 48)" fill="#e2887a"/></g><g><ellipse cx="120" cy="50" rx="26" ry="31" fill="#7fa3a8"/><path d="M114 78h12l-6 8Z" fill="#6c9095"/><ellipse cx="111" cy="38" rx="6" ry="9" transform="rotate(-20 111 38)" fill="#a7c3c6"/></g><g><ellipse cx="164" cy="60" rx="26" ry="31" fill="#f3cf74"/><path d="M158 88h12l-6 8Z" fill="#dfb95d"/><ellipse cx="155" cy="48" rx="6" ry="9" transform="rotate(-20 155 48)" fill="#f8e2a8"/></g><circle cx="120" cy="146" r="4.5" fill="#c6cfba"/>',

    // --- Ш ---
    hat: '<circle cx="120" cy="38" r="17" fill="#e2e8d6"/><g fill="#eef2e6"><circle cx="108" cy="32" r="7"/><circle cx="132" cy="34" r="6"/><circle cx="120" cy="26" r="6"/></g><path d="M64 112V92q0-46 56-46t56 46v20Z" fill="#7fa3a8"/><g stroke="#6c9095" stroke-width="3" fill="none" stroke-linecap="round"><path d="M86 112V74M104 112V64M120 112V60M136 112V64M154 112V74"/></g><rect x="56" y="106" width="128" height="32" rx="15" fill="#a3c0c4"/><g stroke="#8fb0b4" stroke-width="3" stroke-linecap="round"><path d="M72 114v16M88 112v20M104 112v20M120 112v20M136 112v20M152 112v20M168 114v16"/></g>',
    coat: '<path d="M96 56q24-9 48 0l34 18-12 25-16-9v66q-44 10-88 0V90l-16 9-12-25Z" fill="#b9a68c"/><path d="M96 56q24 18 48 0-4 20-24 24t-24-24Z" fill="#e6dcc6"/><path d="M64 140q56 11 112 0v16q-56 11-112 0Z" fill="#e6dcc6"/><path d="M52 92q10 12 22 10l-4 14q-14 0-24-12Z" fill="#e6dcc6"/><path d="M188 92q-10 12-22 10l4 14q14 0 24-12Z" fill="#e6dcc6"/><g stroke="#a08d74" stroke-width="2.5" fill="none" stroke-linecap="round"><path d="M92 96q6 8 0 16M108 104q6 8 0 16M132 100q6 8 0 16M150 110q6 8 0 16M100 124q6 8 0 16M140 128q6 8 0 16"/></g><g fill="#8a7a62"><circle cx="120" cy="96" r="4"/><circle cx="120" cy="116" r="4"/><circle cx="120" cy="136" r="4"/></g>',
    screw:
      '<path d="M106 40h28v18h-28Z" fill="#9aa6a8"/><ellipse cx="120" cy="40" rx="30" ry="11" fill="#b4c0c2"/><rect x="104" y="36" width="32" height="7" rx="3" fill="#7d8a8c"/><path d="M96 56h48l-4 46-20 44-20-44Z" fill="#a7b2b3"/><g fill="#8d9a9c"><path d="M96 66h48l-1 10H97Z"/><path d="M98 86h44l-1 10H99Z"/><path d="M101 106h38l-2 10h-34Z"/><path d="M106 126h28l-3 10h-22Z"/></g><path d="M120 146 108 118h24Z" fill="#a7b2b3"/><path d="M96 58h48" stroke="#7d8a8c" stroke-width="3"/>',
    shorts:
      '<path d="M70 56h100l-6 50-4 40h-32l-8-42-8 42H80l-4-40Z" fill="#6f9ba4"/><rect x="66" y="48" width="108" height="16" rx="7" fill="#5a8a94"/><path d="M110 66q10 12 20 0" fill="none" stroke="#e8eee2" stroke-width="3" stroke-linecap="round"/><path d="M114 70v12M126 70v12" stroke="#e8eee2" stroke-width="3" stroke-linecap="round"/><path d="M84 92h22v16H86Z" fill="#5a8a94"/><path d="M156 92h-22v16h20Z" fill="#5a8a94"/><path d="M78 140h30M132 140h30" stroke="#5a8a94" stroke-width="4" stroke-linecap="round"/>',
    sack: '<path d="M84 74q-16 30-16 48 0 32 52 32t52-32q0-18-16-48Z" fill="#cbb189"/><path d="M92 82q-10 22-10 38 0 20 14 28-22-8-22-30 0-18 18-36Z" fill="#d9c5a4"/><path d="M84 74q36 13 72 0l-8-16q-28 9-56 0Z" fill="#b89d75"/><path d="M86 58q34 11 68 0" fill="none" stroke="#8f7a52" stroke-width="6" stroke-linecap="round"/><path d="M154 60q16 2 18 14" fill="none" stroke="#8f7a52" stroke-width="5" stroke-linecap="round"/><path d="M92 50q5-16 10-2 5-16 10-2 5-16 10-2 5-16 10-2 5-16 10 2l2 12q-30 9-58 0Z" fill="#dcc6a2"/><g stroke="#b89d75" stroke-width="2.5" fill="none" stroke-linecap="round"><path d="M96 104h48M92 122h56"/></g>',
  };

  /**
   * Сад на главной: три карточки со слогами.
   * Слоги передаются снаружи — набор зависит от настроек занятия.
   */
  const garden = (syllables) => {
    const [a = "СА", b = "СУ", c = "СО"] = syllables;
    return svg(
      `<path d="M9 320Q80 280 166 316T452 312V370H9Z" fill="#dde3cb"/><g stroke="#e0bd61" stroke-width="4" stroke-linecap="round"><path d="M115 51V40M115 104v11M83 78H73M149 78h11M92 55l-8-8M140 55l8-8"/></g><circle cx="115" cy="78" r="24" fill="#f2d074"/><path d="M107 79v3M123 79v3M110 90q5 4 10 0" stroke="#7d7146" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M347 103c-8-26-44-22-48 0-16-10-31 0-31 11h107c0-12-17-23-28-11" fill="#faf9ed"/>${flower(348, 222, "#d78b6e", 1.1)}${flower(288, 279, "#a9b979", 0.6)}<path d="M352 328q22-36 49-11M56 337q-2-22 10-36M58 336q18-24 25-21" fill="none" stroke="#9dad7f" stroke-width="4" stroke-linecap="round"/><g transform="translate(84 205) rotate(-10)"><rect x="0" y="9" width="102" height="103" rx="18" fill="#d6ddc1"/><rect width="102" height="103" rx="18" fill="#fffdf4"/><text x="51" y="69" text-anchor="middle" font-family="Arial,sans-serif" font-size="48" font-weight="700" fill="#426954">${a}</text></g><g transform="translate(189 205) rotate(9)"><rect x="0" y="8" width="101" height="103" rx="18" fill="#c7d5b4"/><rect width="101" height="103" rx="18" fill="#e0e9d3"/><text x="50" y="69" text-anchor="middle" font-family="Arial,sans-serif" font-size="48" font-weight="700" fill="#426954">${b}</text></g><g transform="translate(150 120) rotate(-2)"><rect x="0" y="7" width="103" height="105" rx="18" fill="#d6b47a"/><rect width="103" height="105" rx="18" fill="#f4d48d"/><text x="52" y="70" text-anchor="middle" font-family="Arial,sans-serif" font-size="48" font-weight="700" fill="#795c35">${c}</text></g><g fill="#9aa978"><ellipse cx="386" cy="169" rx="7" ry="12" transform="rotate(-30 386 169)"/><ellipse cx="399" cy="167" rx="7" ry="12" transform="rotate(30 399 167)"/></g><path d="M392 172q-1 18-15 20" stroke="#9aa978" stroke-width="2" fill="none" stroke-dasharray="3 4"/>`,
      "0 0 460 380",
    );
  };

  /** Итог занятия: цветов тем больше, чем больше заданий пройдено. */
  const summary = (completed) =>
    svg(
      `<ellipse cx="120" cy="153" rx="85" ry="9" fill="#e5e8d7"/>${flower(120, 57, "#d88668", 1)}${completed >= 3 ? flower(55, 105, "#abb980", 0.5) : ""}${completed >= 6 ? flower(185, 98, "#aabbaa", 0.55) : ""}`,
    );

  return {
    svg,
    flower,
    palette: PALETTE,
    word: (type) => svg(SHADOW + (WORD_ART[type] || "")),
    has: (type) => Object.prototype.hasOwnProperty.call(WORD_ART, type),
    keys: () => Object.keys(WORD_ART),
    garden,
    summary,
  };
})();
