// # 原生像素缸景：空白模板不含居民，按当前生物数据加入装饰形象。
import { PET_TEMPLATES, petBody, inferPetTemplate } from './pets.js';

export const HABITATS = [
  { id: 'meadow', name: '水草庭院' },
  { id: 'stream', name: '溪流石岸' },
  { id: 'lake', name: '湖畔微光' },
  { id: 'shrimp', name: '苔藓浅滩' }
];

const palettes = {
  meadow: { water: '#e0eeea', deep: '#c4ddd1', light: '#f5f4df', sand: '#e8dcc0', floor: '#d6c8a6', plant: '#81ab91', dark: '#608e7c', pale: '#adc09a', rock: '#9caf9e', rockLight: '#bcc9b5' },
  stream: { water: '#deebee', deep: '#bdd6dc', light: '#f1f2dc', sand: '#e5deca', floor: '#cbd0bd', plant: '#88aa9c', dark: '#6c958a', pale: '#b3c6ae', rock: '#94a6a5', rockLight: '#bfcdc5' },
  lake: { water: '#e5e9ed', deep: '#c8d6db', light: '#f4efdc', sand: '#e7ddce', floor: '#d4c8b7', plant: '#9bb3a5', dark: '#7f9f96', pale: '#c0cbaa', rock: '#a2aea8', rockLight: '#c4ccbc' },
  shrimp: { water: '#e4ecdc', deep: '#c8dbc1', light: '#f6f1d8', sand: '#e6d9b8', floor: '#d5c5a0', plant: '#94ad7f', dark: '#6d9277', pale: '#b9c696', rock: '#a2ae89', rockLight: '#c6cc9e' }
};
const legacyHabitats = { goby: 'stream', turtle: 'meadow', parrot: 'lake' };
const validPets = new Set(PET_TEMPLATES.map(pet => pet.id));

const plant = (x, y, height, color, width = 3) => `<g transform="translate(${x} ${y})" fill="${color}"><path d="M0 0v-${height}h${width}v${height}zM0-12h-6v-5h-4v-8h4v5h6zm${width}-18h6v-5h4v-9h-4v6H${width}zM0-34h-6v-7h-3v-9h3v7h6z"/><rect x="-3" y="-2" width="${width + 7}" height="3"/></g>`;
const shortPlant = (x, y, color) => `<g transform="translate(${x} ${y})" fill="${color}"><path d="M0 0v-17h3v17zM0-6h-5v-5h-3v-5h3v3h5zM3-10h5v-5h4v-6H8v4H3z"/></g>`;
const rock = (x, y, scale, p) => `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M0 13h8V5h9V0h17v5h8v8h7v14H0z" fill="${p.rock}"/><path d="M17 3h16v4H20v5H10v7H4v6H0V13h8V5h9z" fill="${p.rockLight}"/><path d="M30 18h10v3H30zM18 22h6v3h-6z" fill="${p.dark}" opacity=".22"/></g>`;
const bubbles = (x, y) => `<g fill="none" stroke="#f8fcf0" stroke-width="2" opacity=".72"><rect x="${x}" y="${y}" width="4" height="4"/><rect x="${x + 5}" y="${y - 16}" width="3" height="3"/><rect x="${x - 2}" y="${y - 29}" width="5" height="5"/></g>`;

function scenery(id, p) {
  if (id === 'stream') return `${plant(19, 125, 67, p.plant)}${plant(41, 125, 43, p.dark)}${shortPlant(65, 127, p.pale)}${rock(78, 101, .9, p)}${rock(329, 96, 1.12, p)}${rock(289, 109, .62, p)}${plant(433, 124, 76, p.dark)}${plant(455, 126, 52, p.plant)}<path d="M133 122h64v-3h85v4h-63v5h-86z" fill="#f3ecd9" opacity=".8"/>${shortPlant(375, 129, p.pale)}${bubbles(105, 67)}`;
  if (id === 'lake') return `<path d="M74 24h22v82H74zM302 19h40v95h-40z" fill="${p.light}" opacity=".2"/><path d="M13 25h17v3h8v4H12v-4h1zM429 28h23v3h8v4h-31z" fill="${p.pale}" opacity=".65"/>${plant(35, 125, 79, p.plant)}${plant(54, 127, 58, p.dark)}${shortPlant(73, 128, p.pale)}${rock(99, 106, .72, p)}${rock(342, 109, .64, p)}${plant(435, 125, 62, p.dark)}${plant(453, 126, 41, p.plant)}${bubbles(385, 64)}`;
  if (id === 'shrimp') return `<path d="M105 118h16V91h7v-9h9v10h-7v13h21v-7h13v7h-8v9h20v8H98v-4z" fill="#a9a78a"/><path d="M107 115h14v-5h8v8h24v4h-46z" fill="${p.pale}"/><path d="M320 122h13v-10h7v-8h10v-9h8v8h-5v10h17v10H320z" fill="#b3ad8c"/><path d="M329 116h21v-5h11v4h9v8h-41z" fill="${p.plant}"/>${plant(23, 125, 75, p.dark)}${plant(45, 125, 47, p.plant)}${shortPlant(66, 128, p.pale)}${rock(235, 110, .52, p)}${plant(438, 126, 68, p.plant)}${plant(458, 126, 44, p.dark)}${shortPlant(181, 126, p.pale)}${bubbles(395, 62)}`;
  return `${plant(24, 124, 86, p.plant)}${plant(43, 124, 64, p.dark)}${plant(65, 126, 43, p.pale)}${rock(83, 106, .76, p)}${shortPlant(276, 127, p.pale)}${shortPlant(291, 126, p.plant)}${rock(334, 108, .66, p)}${plant(426, 124, 83, p.dark)}${plant(445, 125, 63, p.plant)}${plant(463, 125, 46, p.pale)}${bubbles(100, 62)}${bubbles(389, 57)}`;
}

// # 场景数量仅为装饰。未知或范围数量显示一个代表形象，不推算存活数量。
function residents(animals) {
  if (!Array.isArray(animals)) return '';
  const slots = [[131, 35, .88, false], [310, 52, .8, true], [220, 37, .75, true], [366, 31, .72, false], [187, 80, .67, false], [91, 77, .66, true], [278, 78, .71, true], [352, 84, .68, false], [238, 64, .61, false]];
  const sprites = [];
  let bottomIndex = 0;
  for (const animal of animals) {
    if (!animal || typeof animal !== 'object') continue;
    const template = validPets.has(animal.templateId) ? animal.templateId : inferPetTemplate(animal.species, animal.icon);
    const exact = Number(animal.countValue);
    const count = animal.countType === 'exact' && Number.isSafeInteger(exact) && exact >= 0 ? Math.min(exact, 4) : 1;
    for (let n = 0; n < count && sprites.length < 9; n += 1) {
      let [x, y, scale, flip] = slots[sprites.length];
      if (['goby', 'turtle', 'shrimp'].includes(template)) {
        x = 126 + ((bottomIndex * 87) % 259);
        y = template === 'turtle' ? 86 : template === 'goby' ? 87 : 92;
        scale = template === 'shrimp' ? .67 : .77;
        flip = bottomIndex % 2 === 1;
        bottomIndex += 1;
      }
      const dx = flip ? x + 52 * scale : x;
      sprites.push(`<g class="habitat-resident" transform="translate(${dx} ${y}) scale(${flip ? -scale : scale} ${scale})">${petBody(template)}</g>`);
    }
    if (sprites.length >= 9) break;
  }
  return sprites.join('');
}

export function habitatArt(id, unique = '', animals = []) {
  const mapped = Object.hasOwn(legacyHabitats, id) ? legacyHabitats[id] : id;
  const selected = Object.hasOwn(palettes, mapped) ? mapped : 'meadow';
  const p = palettes[selected];
  const offset = Array.from(String(unique)).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 19;
  const dust = Array.from({ length: 22 }, (_, i) => `<rect x="${12 + (i * 67 + offset) % 452}" y="${25 + (i * 29) % 77}" width="${i % 3 ? 2 : 3}" height="2" fill="${p.light}" opacity="${i % 2 ? '.3' : '.56'}"/>`).join('');
  const pebbles = Array.from({ length: 30 }, (_, i) => `<rect x="${8 + (i * 53) % 463}" y="${126 + (i * 7) % 13}" width="${i % 3 + 2}" height="2" fill="${i % 3 ? p.floor : p.light}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" class="aquarium-art habitat-art" viewBox="0 0 480 144" preserveAspectRatio="xMidYMid slice" shape-rendering="crispEdges" aria-hidden="true" focusable="false"><rect width="480" height="144" fill="${p.water}"/><path d="M0 43h480v101H0z" fill="${p.deep}" opacity=".49"/><path d="M42 13h29v97H42zM262 18h36v88h-36z" fill="${p.light}" opacity=".13"/><path d="M0 15h82v2h47v-2h97v2h106v-2h88v2h60v2H0z" fill="${p.dark}" opacity=".2"/>${dust}<path d="M0 123h93v-4h81v3h116v-3h94v3h96v22H0z" fill="${p.sand}"/><path d="M0 137h480v7H0z" fill="${p.floor}"/>${pebbles}${scenery(selected, p)}${residents(animals)}<path d="M0 0h480v5H0zm0 7h480v2H0z" fill="${p.light}" opacity=".8"/><path d="M0 0h3v144H0zm477 0h3v144h-3z" fill="${p.dark}" opacity=".18"/></svg>`;
}
