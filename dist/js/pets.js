// # 原生像素形象延续审核稿 03；新增形象为外观示意，用户可自行选择。
export const PET_TEMPLATES = [
  {
    "id": "parrot",
    "name": "粉色鹦鹉鱼",
    "species": "鹦鹉鱼",
    "icon": "fish"
  },
  {
    "id": "goby",
    "name": "虾虎鱼",
    "species": "虾虎鱼",
    "icon": "fish"
  },
  {
    "id": "turtle",
    "name": "小青龟",
    "species": "小青龟",
    "icon": "turtle"
  },
  {
    "id": "angel",
    "name": "银黑天使鱼",
    "species": "天使鱼",
    "icon": "fish"
  },
  {
    "id": "tetra-red",
    "name": "彩色鱼 · 红",
    "species": "彩色鱼 · 红",
    "icon": "fish"
  },
  {
    "id": "tetra-purple",
    "name": "彩色鱼 · 紫",
    "species": "彩色鱼 · 紫",
    "icon": "fish"
  },
  {
    "id": "tetra-yellow",
    "name": "彩色鱼 · 黄",
    "species": "彩色鱼 · 黄",
    "icon": "fish"
  },
  {
    "id": "tetra-green",
    "name": "彩色鱼 · 绿",
    "species": "彩色鱼 · 绿",
    "icon": "fish"
  },
  {
    "id": "tetra-blue",
    "name": "彩色鱼 · 蓝",
    "species": "彩色鱼 · 蓝",
    "icon": "fish"
  },
  {
    "id": "crucian",
    "name": "鲫鱼",
    "species": "鲫鱼",
    "icon": "fish"
  },
  {
    "id": "shrimp",
    "name": "黑壳虾",
    "species": "黑壳虾",
    "icon": "shrimp"
  },
  {
    "id": "guppy-gold",
    "name": "黄金玻璃猫孔雀鱼",
    "species": "孔雀鱼 · 黄金玻璃猫",
    "icon": "fish"
  }
];

const bodies = {
  'parrot': `<g transform="translate(6 6)"><path d="M0 12h5v3h5v8H5v3H0z" fill="#b69fa6"/><path d="M1 14h4v3h5v4H5v3H1z" fill="#dcc4c3"/><path d="M13 10V7h3V3h3v3h3v3h5v4z" fill="#b6a2ac"/><path d="M15 25h13v3h-5v3h-5v-3h-3z" fill="#c1a7b0"/><path d="M9 14h4v-4h15v3h6v3h5v8h-5v3h-6v2H16v-3h-4v-3H9z" fill="#9a9298"/><path d="M12 15h4v-3h12v3h5v3h4v5h-5v3H17v-3h-5z" fill="#e4c4c6"/><path d="M17 15h13v3H17zm3 4h7v3h-7z" fill="#f2decc"/><path d="M15 23h13v3H18v-2h-3z" fill="#c5a7b8"/><path d="M25 20h3v5h-3v-2h-3v-2h3z" fill="#bba4b0"/><rect x="33" y="17" width="4" height="4" fill="#b99c79"/><rect x="34" y="18" width="2" height="2" fill="#3b5951"/><rect x="34" y="18" width="1" height="1" fill="#f4edd4"/><rect x="37" y="23" width="3" height="1" fill="#9d888e"/></g>`,
  'goby': `<g transform="translate(1 8)"><path d="M0 9h6v3h6v8H6v3H0z" fill="#738576"/><path d="M1 11h4v3h5v4H5v3H1z" fill="#b9b8a0"/><path d="M0 14h5v2H0zm3-4h2v3H3zm0 8h5v2H0z" fill="#8e9c84"/><path d="M14 11V7h3V4h5v4h4v4zM29 11V7h7v4h4v3z" fill="#899a7e"/><path d="M9 12h8V9h17v2h9v3h6v8h-4v2H26v-2H14v-2H9z" fill="#65776b"/><path d="M13 13h9v-2h12v2h8v3h5v4h-9v2H27v-2H15v-3h-2z" fill="#a8ae92"/><path d="M25 13h9v2h-9zm-9 2h5v2h-5zm12 3h6v2h-6zm9-4h4v2h-4z" fill="#7e917c"/><path d="M14 18h5v3h-5zm8-4h3v2h-3zm14 5h4v2h-4z" fill="#84917c"/><path d="M34 21h5v3h-2v2h-5v-4h2z" fill="#849a87"/><rect x="41" y="14" width="3" height="3" fill="#d9d0a8"/><rect x="42" y="15" width="2" height="2" fill="#385649"/><path d="M46 20h4v1h-4z" fill="#536f61"/></g>`,
  'turtle': `<g transform="translate(9 0)"><path d="M10 2h4V0h7v3h3v7h-4v3h-9V9H8V4h2z" fill="#688773"/><path d="M13 2h7v3h2v5H12V7h-2V4h3z" fill="#b6bf8d"/><path d="M14 8h8v3h-8z" fill="#dacf96"/><rect x="18" y="4" width="3" height="3" fill="#436458"/><rect x="18" y="4" width="1" height="1" fill="#f0e6b8"/><path d="M5 13H1v3H0v4h4v-2h5zm20 4h4v3h3v4h-4v-2h-5zM7 29H3v4H1v3h5v-3h5zm15 2h5v3h3v3h-5v-3h-6z" fill="#7b967d"/><path d="M9 11h14v3h3v17h-3v3H9v-3H6V15h3z" fill="#6e8a6c"/><path d="M10 13h12v3h3v14h-4v3H10v-3H8V16h2z" fill="#d8cd92"/><path d="M10 16h5v6h-5zm7 0h5v6h-5zM9 24h5v5H9zm8 0h6v5h-6zM12 30h3v2h-3zm5 0h3v2h-3z" fill="#60776a"/><path d="M14 34h3v5h-1v4h-2z" fill="#8ba186"/><path d="M0 19h1v3H0zm3 0h1v3H3zm26 4h1v3h-1zm3-1h1v3h-1z" fill="#b5c39a"/></g>`,
  'angel': `<g transform="translate(6 0)"><path d="M0 17h4v3h8v12H4v3H0z" fill="#8faeaa"/><path d="M1 20h4v3h5v6H5v3H1z" fill="#c3d4c7"/><path d="M14 14V8h3V3h3v5h3v5h4v5z" fill="#7d9f9c"/><path d="M17 12V7h2v5h3v4h3v3h-8z" fill="#bad0bf"/><path d="M12 16h5v-3h11v3h5v5h6v8h-5v4h-7v3H16v-3h-5V20h1z" fill="#648a84"/><path d="M15 18h5v-3h7v4h6v4h4v5h-7v4H18v-3h-5v-8h2z" fill="#b7d0c3"/><path d="M18 17h3v14h-3zm7-1h3v17h-3zm6 5h2v8h-2z" fill="#5e837c"/><path d="M21 19h4v3h-4zm-7 4h3v3h-3z" fill="#dde4cf"/><path d="M16 33h10v3h-5v3h-3v3h-3V33z" fill="#95b6ab"/><path d="M26 33h2v7h-2z" fill="#bdcfbf"/><rect x="33" y="22" width="4" height="4" fill="#b29e7c"/><rect x="34" y="23" width="2" height="2" fill="#2f5751"/><rect x="34" y="23" width="1" height="1" fill="#ebead4"/></g>`,
  'tetra-red': `<g transform="translate(6 6)"><path d="M0 11h4v3h7v9H4v3H0z" fill="#c9a79e"/><path d="M13 9V4h3V0h3v3h3v4h5v4zM13 26h16v3h-5v3h-8v-3h-3z" fill="#c9a79e"/><path d="M9 13h5V9h15v3h6v4h5v8h-5v4h-6v2H15v-3h-5v-4H8v-7h1z" fill="#74908a"/><path d="M12 14h5v-3h12v3h6v4h3v5h-5v3H17v-3h-5z" fill="#dc8f86"/><path d="M16 14h14v3H16zm-2 5h8v3h-8z" fill="#edc1ac"/><path d="M20 23h12v3H20zm4-5h3v5h-3z" fill="#bd7774"/><rect x="33" y="17" width="5" height="5" fill="#edc1ac"/><rect x="34" y="18" width="3" height="3" fill="#345952"/><rect x="34" y="18" width="1" height="1" fill="#f4f2d8"/></g>`,
  'tetra-purple': `<g transform="translate(6 6)"><path d="M0 11h4v3h7v9H4v3H0z" fill="#b4acbf"/><path d="M13 9V4h3V0h3v3h3v4h5v4zM13 26h16v3h-5v3h-8v-3h-3z" fill="#b4acbf"/><path d="M9 13h5V9h15v3h6v4h5v8h-5v4h-6v2H15v-3h-5v-4H8v-7h1z" fill="#74908a"/><path d="M12 14h5v-3h12v3h6v4h3v5h-5v3H17v-3h-5z" fill="#b3a1ca"/><path d="M16 14h14v3H16zm-2 5h8v3h-8z" fill="#d7cbdc"/><path d="M20 23h12v3H20zm4-5h3v5h-3z" fill="#8e86ad"/><rect x="33" y="17" width="5" height="5" fill="#d7cbdc"/><rect x="34" y="18" width="3" height="3" fill="#345952"/><rect x="34" y="18" width="1" height="1" fill="#f4f2d8"/></g>`,
  'tetra-yellow': `<g transform="translate(6 6)"><path d="M0 11h4v3h7v9H4v3H0z" fill="#cec58f"/><path d="M13 9V4h3V0h3v3h3v4h5v4zM13 26h16v3h-5v3h-8v-3h-3z" fill="#cec58f"/><path d="M9 13h5V9h15v3h6v4h5v8h-5v4h-6v2H15v-3h-5v-4H8v-7h1z" fill="#74908a"/><path d="M12 14h5v-3h12v3h6v4h3v5h-5v3H17v-3h-5z" fill="#dfcb7d"/><path d="M16 14h14v3H16zm-2 5h8v3h-8z" fill="#f0df9f"/><path d="M20 23h12v3H20zm4-5h3v5h-3z" fill="#b5ab6b"/><rect x="33" y="17" width="5" height="5" fill="#f0df9f"/><rect x="34" y="18" width="3" height="3" fill="#345952"/><rect x="34" y="18" width="1" height="1" fill="#f4f2d8"/></g>`,
  'tetra-green': `<g transform="translate(6 6)"><path d="M0 11h4v3h7v9H4v3H0z" fill="#b1c69d"/><path d="M13 9V4h3V0h3v3h3v4h5v4zM13 26h16v3h-5v3h-8v-3h-3z" fill="#b1c69d"/><path d="M9 13h5V9h15v3h6v4h5v8h-5v4h-6v2H15v-3h-5v-4H8v-7h1z" fill="#74908a"/><path d="M12 14h5v-3h12v3h6v4h3v5h-5v3H17v-3h-5z" fill="#aac37f"/><path d="M16 14h14v3H16zm-2 5h8v3h-8z" fill="#d0dfac"/><path d="M20 23h12v3H20zm4-5h3v5h-3z" fill="#8fa66f"/><rect x="33" y="17" width="5" height="5" fill="#d0dfac"/><rect x="34" y="18" width="3" height="3" fill="#345952"/><rect x="34" y="18" width="1" height="1" fill="#f4f2d8"/></g>`,
  'tetra-blue': `<g transform="translate(6 6)"><path d="M0 11h4v3h7v9H4v3H0z" fill="#a3c1c4"/><path d="M13 9V4h3V0h3v3h3v4h5v4zM13 26h16v3h-5v3h-8v-3h-3z" fill="#a3c1c4"/><path d="M9 13h5V9h15v3h6v4h5v8h-5v4h-6v2H15v-3h-5v-4H8v-7h1z" fill="#74908a"/><path d="M12 14h5v-3h12v3h6v4h3v5h-5v3H17v-3h-5z" fill="#98c5ca"/><path d="M16 14h14v3H16zm-2 5h8v3h-8z" fill="#c7dfdf"/><path d="M20 23h12v3H20zm4-5h3v5h-3z" fill="#76a8b2"/><rect x="33" y="17" width="5" height="5" fill="#c7dfdf"/><rect x="34" y="18" width="3" height="3" fill="#345952"/><rect x="34" y="18" width="1" height="1" fill="#f4f2d8"/></g>`,
  'crucian': `<g transform="translate(2 5)"><path d="M0 9h4v3h8v10H4v3H0z" fill="#9daea5"/><path d="M1 12h4v3h6v4H5v3H1z" fill="#cfdbc7"/><path d="M14 11V7h4V3h7v3h4v5zM17 25h12v3h-5v3h-5v-3h-2z" fill="#a2b49f"/><path d="M9 13h5v-3h16v2h8v4h6v8h-6v3H17v-3h-7v-3H8v-6h1z" fill="#789387"/><path d="M12 14h6v-2h12v2h8v4h4v5h-7v2H18v-3h-6z" fill="#bac9b5"/><path d="M18 14h15v3H18zm-3 5h10v2H15z" fill="#e0e4cb"/><path d="M19 23h15v2H19zm7-6h3v6h-3v-2h-3v-2h3z" fill="#9cad98"/><rect x="37" y="17" width="4" height="4" fill="#d0c99f"/><rect x="38" y="18" width="2" height="2" fill="#38594e"/><rect x="38" y="18" width="1" height="1" fill="#f6eed5"/><path d="M42 22h4v1h-4z" fill="#809184"/></g>`,
  'shrimp': `<g transform="translate(3 9)"><path d="M0 12h5v4h5v6H5v-3H0z" fill="#849885"/><path d="M2 13h3v3h5v3H5v-2H2z" fill="#b9c3a2"/><path d="M8 15h5v-4h7V8h10v2h7v4h3v7h-7v3H19v-3H8z" fill="#5d7769"/><path d="M12 15h7v-4h10v2h7v3h2v3h-8v3H20v-3h-8z" fill="#91a58a"/><path d="M17 14h3v5h-3zm7-3h3v10h-3zm7 2h3v7h-3z" fill="#718d76"/><path d="M20 12h8v2h-8zM12 20h7v2h-7z" fill="#c1caa7"/><path d="M18 24h2v4h-2zm7-1h2v5h-2zm7-2h2v5h-2z" fill="#829a82"/><path d="M38 11h3V7h5V5h3v2h-3v2h-4v4h-4zM39 15h5v-2h5v2h-5v2h-5z" fill="#849e87"/><rect x="35" y="13" width="3" height="3" fill="#d6d0a7"/><rect x="36" y="14" width="2" height="2" fill="#34554b"/></g>`,
  'guppy-gold': `<g transform="translate(1 4)"><path d="M0 4h4v3h5v3h6v3h5v12h-5v3H9v3H4v3H0z" fill="#c8bd86"/><path d="M2 7h3v3h5v3h6v2h3v8h-5v3H8v3H3V9H2z" fill="#edd17f" fill-opacity=".94"/><path d="M3 11h3v3h8v2h4v3h-9v-2H4zM3 25h7v-3h5v2h-5v3H3z" fill="#fae9b4"/><path d="M5 8h2v4H5zm0 12h2v6H5zm5-7h2v10h-2z" fill="#d5c480"/><path d="M23 14V9h4V5h4v5h4v6zM26 25h10v3h-6v3h-4z" fill="#c7b5b6" fill-opacity=".78"/><path d="M17 15h6v-3h13v2h7v3h5v7h-7v3H26v-2h-7v-3h-2z" fill="#b6a0a8" fill-opacity=".82"/><path d="M21 16h5v-2h10v2h7v3h3v3h-8v3H26v-2h-5z" fill="#e7c9ce" fill-opacity=".82"/><path d="M26 16h10v2H26zm-3 4h10v2H23z" fill="#fae9e3" fill-opacity=".8"/><path d="M29 23h9v2h-9zm6-5h2v4h-2z" fill="#c6adb7" fill-opacity=".76"/><rect x="42" y="18" width="4" height="4" fill="#e7c9ce"/><rect x="43" y="19" width="2" height="2" fill="#253c34"/><rect x="43" y="19" width="1" height="1" fill="#f8f2d8"/></g>`
};

// # 统一 52×44 的局部坐标；标签、头像和缸内形象共用同一主体。
export function petBody(id) {
  return Object.hasOwn(bodies, id) ? bodies[id] : bodies.crucian;
}

export function petIcon(id, size = 32) {
  const pixels = Number.isFinite(Number(size)) ? Math.max(12, Math.min(512, Number(size))) : 32;
  return `<svg class="pet-icon" width="${pixels}" height="${pixels}" viewBox="0 0 52 44" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${petBody(id)}</svg>`;
}

// # 仅用于旧数据或未选择形象时的展示默认值，不改动物种标签。
export function inferPetTemplate(species, icon = 'fish') {
  const text = String(species || '').replace(/\s/g, '');
  const exact = PET_TEMPLATES.find(pet => pet.species.replace(/\s/g, '') === text || pet.name.replace(/\s/g, '') === text);
  if (exact) return exact.id;
  if (/孔雀|黄金玻璃猫/.test(text)) return 'guppy-gold';
  if (/虾虎|沙塘鳢/.test(text)) return 'goby';
  if (/鹦鹉/.test(text)) return 'parrot';
  if (/天使|神仙/.test(text)) return 'angel';
  if (/龟/.test(text) || icon === 'turtle') return 'turtle';
  if (/虾/.test(text) || icon === 'shrimp') return 'shrimp';
  if (/彩裙|彩色|荧光|黑裙/.test(text)) {
    for (const [color, id] of [['紫', 'tetra-purple'], ['黄', 'tetra-yellow'], ['绿', 'tetra-green'], ['蓝', 'tetra-blue']]) {
      if (text.includes(color)) return id;
    }
    return 'tetra-red';
  }
  return 'crucian';
}
