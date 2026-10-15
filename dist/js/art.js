// # 原创 SVG 像素素材；不使用游戏素材或远程图片。
const paths = {
  pause: '<path d="M5 4h5v16H5zm9 0h5v16h-5z"/>',
  play: '<path d="M5 3h3v3h4v3h4v3h4v3h-4v3h-4v3H8v2H5z"/>',
  phone: '<path d="M6 2h12v20H6zm3 3v12h6V5zm2 14v1h2v-1z" fill-rule="evenodd"/>',
  filter: '<path d="M2 3h20v4h-3v3h-3v3h-2v7l-4 2v-9H8v-3H5V7H2z"/>',
  camera: '<path d="M7 3h10v3h5v15H2V6h5zm2 6v2H7v5h2v2h6v-2h2v-5h-2V9zm2 3h2v3h-2z" fill-rule="evenodd"/>',
  calendar: '<path d="M5 2h3v3h8V2h3v3h3v17H2V5h3zm0 9v8h14v-8zm3 2h3v3H8zm6 0h3v3h-3z" fill-rule="evenodd"/>',
  back: '<path d="M11 3h-3v3H5v3H2v6h3v3h3v3h3v-4H8v-3h14v-4H8V7h3z"/>',
  home: '<path d="M3 11h3V8h3V5h6v3h3v3h3v10h-7v-6h-4v6H3z"/>',
  book: '<path d="M4 3h15v2h2v16H6v-2H3V5h1zm3 3v12h11V6zm2 3h7v2H9zm0 4h7v2H9z" fill-rule="evenodd"/>',
  fish: '<path d="M7 7h8v2h4v2h2v5h-2v2h-4v2H7v-4H3V9h4zm10 4h-2v2h2z" fill-rule="evenodd"/>',
  chart: '<path d="M3 3h2v16h16v2H3zm5 9h3v5H8zm5-5h3v10h-3zm5-3h3v13h-3z"/>',
  gear: '<path d="M9 2h6v4h3V4h3v5h-3v6h3v5h-3v-2h-3v4H9v-4H6v2H3v-5h3V9H3V4h3v2h3zm0 7v6h6V9z" fill-rule="evenodd"/>',
  food: '<path d="M6 4h2v5H6zm5-2h2v5h-2zm5 2h2v5h-2zM3 12h18v5h-3v3H6v-3H3z"/>',
  clean: '<g><path d="M16 1h5v2h2v6h-2v2h-3v2h-3v-3h-2V7h1V3h2z" fill="#367fba"/><path d="M17 3h3v2h-3v3h-2V5h2z" fill="#80b5d8"/><path d="M14 10h3v3h-2v2h-2v2h-2v2H9v2H7v2H3v-4h2v-2h2v-2h2v-2h2v-2h3z" fill="#7d9fa8"/><path d="M14 12h1v1h-2v2h-2v2H9v2H7v2H5v-2h2v-2h2v-2h2v-2h3z" fill="#deeff1" fill-opacity=".9"/><path d="M12 14h1v1h-2v2H9v2H7v2H5v-1h1v-2h2v-2h2v-2z" fill="#fbffff"/></g>',
  water: '<path d="M10 2h4v3h2v3h2v3h2v6h-2v3h-3v2H9v-2H6v-3H4v-6h2V8h2V5h2zm-2 12v3h3v-2H9v-1z"/>',
  drop: '<path d="M8 3h4v3h2v3h2v5h-2v3H7v-3H4V9h2V6h2zM18 14h2v3h3v2h-3v3h-2v-3h-3v-2h3z"/>',
  test: '<path d="M7 2h10v3h-2v8h3v3h2v5H4v-5h2v-3h3V5H7zm4 3v9H8v3h8v-3h-3V5z" fill-rule="evenodd"/>',
  leaf: '<path d="M8 4h12v10h-3v3h-4v3H7v-3H4v-6h2V7h2zm7 3v2h-3v3H9v3H7v4h2v-3h3v-3h3v-3h3V7z" fill-rule="evenodd"/>',
  medicine: '<path d="M7 2h10v5h3v14H4V7h3zm3 8v3H7v3h3v3h4v-3h3v-3h-3v-3z" fill-rule="evenodd"/>',
  salt: '<path d="M8 2h8v3H8zM6 7h12v4h2v10H4V11h2zm3 5h2v2H9zm5 3h2v2h-2zm-5 3h2v2H9z" fill-rule="evenodd"/>',
  eye: '<path d="M8 5h8v3h4v3h3v3h-3v3h-4v3H8v-3H4v-3H1v-3h3V8h4zm1 4v7h7V9zm2 2h3v3h-3z" fill-rule="evenodd"/>',
  pen: '<path d="M17 2h3v3h2v3h-3v3h-3v3h-3v3h-3v3H3v-7h3v-3h3V7h3V4h5zM5 15v3h3v-3z" fill-rule="evenodd"/>',
  plus: '<path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z"/>',
  close: '<path d="M4 2h3v3h3v3h4V5h3V2h3v5h-3v3h-3v4h3v3h3v5h-3v-3h-3v-3h-4v3H7v3H4v-5h3v-3h3v-4H7V7H4z"/>',
  chevron: '<path d="M8 3h3v3h3v3h3v6h-3v3h-3v3H8v-4h3v-3h3v-4h-3V7H8z"/>',
  down: '<path d="M3 7h4v3h3v3h4v-3h3V7h4v5h-4v3h-3v3h-4v-3H7v-3H3z"/>',
  search: '<path d="M6 2h9v3h3v10h-3v3h-3v-3H6v-3H3V5h3zm2 3v2H6v5h2v2h5v-2h2V7h-2V5zM15 15h3v3h3v4h-4v-3h-2z" fill-rule="evenodd"/>',
  export: '<path d="M10 2h4v9h3V8h3v5h-3v3h-3v3h-4v-3H7v-3H4V8h3v3h3zM2 18h3v3h14v-3h3v6H2z"/>',
  upload: '<path d="M10 2h4v3h3v3h3v5h-3v-3h-3v9h-4v-9H7v3H4V8h3V5h3zM2 18h3v3h14v-3h3v6H2z"/>',
  trash: '<path d="M8 2h8v3h6v3H2V5h6zm-4 8h16v12H4zm4 2v7h2v-7zm6 0v7h2v-7z" fill-rule="evenodd"/>',
  check: '<path d="M19 4h4v4h-3v3h-3v3h-3v3h-3v3H7v-3H4v-3H1v-4h4v3h3v3h2v-3h3v-3h3V7h3z"/>',
  clock: '<path d="M6 2h12v3h3v14h-3v3H6v-3H3V5h3zm1 3v2H5v10h2v2h10v-2h2V7h-2V5zm3 3h3v5h4v3h-7z" fill-rule="evenodd"/>',
  more: '<path d="M2 10h4v4H2zm8 0h4v4h-4zm8 0h4v4h-4z"/>',
  bucket: '<path d="M5 3h14v2h3v6h-3V7H5v4H2V5h3zm-1 9h16v7h-3v3H7v-3H4z"/>',
  tank: '<path d="M2 4h20v17H2zm3 3v11h14V7zM7 9h7v2h3v4h-3v2H7v-3H5v-3h2z" fill-rule="evenodd"/>',
  bell: '<path d="M9 2h6v3h3v10h3v4H3v-4h3V5h3zm0 18h6v3H9z"/>',
  sun: '<path d="M10 1h4v3h-4zm0 19h4v3h-4zM1 10h3v4H1zm19 0h3v4h-3zM6 6h12v12H6zM3 3h3v3H3zm15 0h3v3h-3zM3 18h3v3H3zm15 0h3v3h-3z"/>',
  heart: '<path d="M3 4h6v3h6V4h6v3h3v7h-3v3h-3v3h-3v3H9v-3H6v-3H3v-3H0V7h3z"/>',
  arrow: '<path d="M13 3h4v3h3v3h3v6h-3v3h-3v3h-4v-4h3v-3H1v-4h15V7h-3z"/>'
};
export const icon = (name, size = 20) => `<svg class="pixel-icon" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" shape-rendering="crispEdges">${Object.hasOwn(paths, name) ? paths[name] : paths.fish}</svg>`;
const fish = (x, y, color = '#e4ac67', flip = false, scale = 1) => `<g transform="translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})"><path d="M0 4h4V2h12v2h4v4h-4v2H4V8H0z" fill="${color}"/><path d="M7 0h5v2H7zm0 10h5v2H7z" fill="${color}"/><rect x="7" y="2" width="3" height="8" fill="#fff1cf" opacity=".65"/><rect x="16" y="4" width="2" height="2" fill="#335b56"/></g>`;
const turtle = (x, y, scale = 1) => `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M4 2h12v2h4v10H2V4h2z" fill="#6c986b"/><path d="M6 4h8v2h3v5H5V6h1z" fill="#a9be7b"/><rect x="9" y="5" width="3" height="5" fill="#7ea05f"/><path d="M20 6h6v6h-6zM5 14h4v3H5zm10 0h4v3h-4z" fill="#90ae77"/><rect x="24" y="7" width="2" height="2" fill="#345952"/></g>`;
const shrimp = (x, y, scale = 1, color = '#638b81') => `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M2 3h4v3h10V3h6v5h-3v4h-9V9H4V6H2z" fill="${color}"/><path d="M11 12h2v3h-2zm5 0h2v3h-2zM22 3h4V1h5v2h-4v2h-5z" fill="${color}"/><rect x="20" y="4" width="1.5" height="1.5" fill="#283f37"/></g>`;
const bubbles = (x, y) => `<g class="bubbles" fill="none" stroke="#f4ffff" stroke-width="2" opacity=".7"><rect x="${x}" y="${y}" width="4" height="4"/><rect x="${x + 5}" y="${y - 15}" width="3" height="3"/><rect x="${x - 2}" y="${y - 28}" width="5" height="5"/></g>`;
export function animalIcon(type, size = 24) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 36 24" class="animal-icon" shape-rendering="crispEdges" aria-hidden="true">${type === 'turtle' ? turtle(4, 3) : type === 'shrimp' ? shrimp(2, 4) : fish(4, 4, '#dfac78', false, 1.25)}</svg>`;
}
// # 更细的原创像素造景；照片提供前使用插画占位，不声称还原实际个体。
const detailedFish = (x, y, color, scale = 1, flip = false) => `<g transform="translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})"><path d="M0 9h7V6h4V3h18v3h6v4h3v10h-3v4h-6v3H11v-3H7v-4H0z" fill="#557c79"/><path d="M7 10h7V6h15v3h6v11h-6v4H14v-4H7z" fill="${color}"/><path d="M14 8h15v3H14zm0 4h7v2h-7z" fill="#fff0cb" opacity=".65"/><path d="M17 3V0h9v3zm0 24v3h9v-3zM0 9h4v11H0z" fill="${color}"/><rect x="30" y="10" width="3" height="3" fill="#2f5654"/><rect x="30" y="10" width="1" height="1" fill="#f5f2db"/><path d="M24 14h3v6h-3v-2h-3v-2h3z" fill="#ce9478" opacity=".65"/></g>`;
const detailedAngel = (x, y, flip = false) => `<g transform="translate(${x} ${y}) scale(${flip ? -1 : 1} 1)"><path d="M4 17h7v-6h5V5h5V0h5v10h6v5h4v8h-4v6h-6v9h-4v-5h-5v-6h-6v-4H4z" fill="#6e9391"/><path d="M12 17h6v-6h8v4h6v9h-7v6h-6v-6h-7z" fill="#f0d7a3"/><path d="M20 13h3v13h-3zM26 16h2v8h-2z" fill="#bd9977"/><path d="M19 12h8v2h-8z" fill="#fff1c8"/><rect x="30" y="17" width="2" height="2" fill="#304f4a"/><path d="M18 29h2v11h-2z" fill="#9db5aa"/></g>`;
const detailedTurtle = (x, y) => `<g transform="translate(${x} ${y})"><path d="M5 5h7V2h21v3h7v5h3v14h-5v5H9v-5H3V10h2z" fill="#527467"/><path d="M12 5h21v3h6v15H9V9h3z" fill="#8caa73"/><path d="M14 8h8v5h-8zm11 0h7v5h-7zM12 16h9v6h-9zm12 0h11v6H24z" fill="#aac384"/><path d="M40 12h8v3h4v8H40zM10 29h7v4h-7zm20 0h7v4h-7z" fill="#92af7c"/><rect x="48" y="16" width="2" height="2" fill="#2f5148"/><rect x="12" y="6" width="16" height="2" fill="#d3dbad"/></g>`;
const reeds = (x, y, h, color) => `<g transform="translate(${x} ${y})" fill="${color}"><path d="M0 0v-${h}h3v${h}zM0 -10h-7v-6h-4v-9h4v6h7zm3-20h7v-6h4v-11h-4v8H3zM0 -33h-6v-9h-4v-9h4v7h6z"/><rect x="-4" y="-3" width="12" height="3"/></g>`;
export function aquariumArt(kind, unique = '') {
  const palette = kind === 'shrimp' ? ['#d7e7df', '#bfd9cc'] : kind === 'parrot' ? ['#dbecef', '#c0dce0'] : ['#dfedf0', '#c2dce0'];
  const specks = Array.from({ length: 30 }, (_, i) => `<rect x="${13 + (i * 67) % 455}" y="${25 + (i * 31) % 78}" width="${i % 3 ? 2 : 3}" height="2" fill="#f0f6ef" opacity="${i % 2 ? '.28' : '.48'}"/>`).join('');
  const floor = Array.from({ length: 32 }, (_, i) => `<rect x="${8 + (i * 53) % 461}" y="${121 + (i * 7) % 16}" width="${i % 3 + 2}" height="2" fill="${i % 3 ? '#cbbd9d' : '#f3e7c8'}"/>`).join('');
  const creatures = kind === 'turtle' ? `${detailedAngel(200, 36)}${detailedAngel(331, 68, true)}${detailedTurtle(111, 87)}${shrimp(361, 111, .85)}` : kind === 'parrot' ? `${detailedFish(190, 42, '#edac88', 1.12)}${detailedFish(340, 76, '#edc094', .9, true)}${shrimp(131, 116, .7)}` : kind === 'shrimp' ? `${shrimp(118, 110, .95, '#56796a')}${shrimp(247, 94, 1.2, '#50766c')}${shrimp(333, 118, .8, '#648b76')}${shrimp(185, 70, .7, '#789e85')}` : `${detailedFish(181, 37, '#bac3ae', 1)}${detailedFish(347, 67, '#c9cbb5', .9, true)}${detailedFish(248, 103, '#9dad96', .62)}`;
  return `<svg class="aquarium-art" viewBox="0 0 480 144" preserveAspectRatio="xMidYMid slice" shape-rendering="crispEdges" aria-hidden="true"><rect width="480" height="144" fill="${palette[0]}"/><path d="M0 42h480v102H0z" fill="${palette[1]}" opacity=".45"/><path d="M45 14h36v95H45zM257 15h47v92h-47z" fill="#edf5ec" opacity=".17"/><path d="M0 15h83v2h47v-2h93v2h109v-2h87v2h61v2H0z" fill="#aacbd0" opacity=".7"/>${specks}<path d="M0 121h89v-4h82v3h114v-3h96v3h99v24H0z" fill="#e9ddc0"/><path d="M0 136h480v8H0z" fill="#ddcfb0"/>${floor}${reeds(25, 123, 82, '#84ac94')}${reeds(45, 123, 61, '#6c9886')}${reeds(63, 123, 41, '#9bb89a')}${reeds(427, 123, 89, '#689888')}${reeds(445, 123, 69, '#83a897')}${reeds(460, 123, 47, '#a1ba9e')}<path d="M81 110h11v-11h23v7h15v19H72v-10h9z" fill="#8b9e95"/><path d="M92 102h23v5h-9v4H81v6h-6v7h-3v-9h9v-5h11z" fill="#aebbb0"/><path d="M314 109h8v-8h16v6h11v17h-43v-8h8z" fill="#93a69c"/><path d="M322 103h16v4h-13v7h-10v5h-7v-4h6v-6h8z" fill="#b6c1b3"/>${reeds(292, 125, 38, '#9dae89')}${reeds(278, 125, 24, '#b2bea0')}${bubbles(97, 60)}${bubbles(392, 52)}${creatures}<path d="M0 0h480v5H0zm0 6h480v2H0z" fill="#f3f5e8" opacity=".75"/><path d="M0 0h3v144H0zm477 0h3v144h-3z" fill="#87a7a0" opacity=".25"/></svg>`;
}
