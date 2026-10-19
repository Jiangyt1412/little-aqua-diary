// # 影片由用户点击播放；支持切换、加载和失败反馈，保留原生播放器。
const published=document.querySelector('[data-version]').textContent.trim().replace(/^v/,'');
const metadataUrl=new URL('./version.js',import.meta.url);metadataUrl.searchParams.set('intro',published);let version=published;
const video=document.querySelector('[data-demo]'),frame=video.parentElement,play=document.querySelector('[data-play-film]'),status=document.querySelector('[data-video-status]'),description=document.querySelector('[data-film-description]'),download=document.querySelector('[data-video-download]');let selected='product';frame.dataset.playerReady='true';
const message=text=>{status.textContent=text;status.hidden=!text;};const showPlay=()=>{play.hidden=!video.paused;};
let playAttempt=0;
async function start(){const attempt=++playAttempt;let timer;message('正在准备影片…');try{if(video.error||video.networkState===3)video.load();await Promise.race([video.play(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('timeout')),10000);})]);if(attempt===playAttempt)message('');}catch{if(attempt===playAttempt){video.pause();message('影片暂时无法播放，请重试或下载 MP4。');play.hidden=false;}}finally{clearTimeout(timer);}}
video.querySelector('source').addEventListener('error',()=>{message('影片加载失败，可以重试播放或下载 MP4。');play.hidden=false;});
play.addEventListener('click',start);video.addEventListener('play',showPlay);video.addEventListener('pause',showPlay);video.addEventListener('ended',showPlay);video.addEventListener('playing',()=>message(''));video.addEventListener('waiting',()=>{if(!video.paused)message('正在缓冲…');});video.addEventListener('canplay',()=>message(''));video.addEventListener('error',()=>{message('影片加载失败，可以重试播放或下载 MP4。');play.hidden=false;});
for(const button of document.querySelectorAll('[data-film]'))button.addEventListener('click',()=>{const next=button.dataset.film;if(next===selected)return;playAttempt++;video.pause();selected=next;const product=next==='product';for(const b of document.querySelectorAll('[data-film]'))b.setAttribute('aria-pressed',String(b===button));video.querySelector('source').src=`./media/${product?'demo':'walkthrough'}-v${version}.mp4`;const track=video.querySelector('track');if(product)track.src=`./media/film-v${version}.vtt`;else track.removeAttribute('src');track.track.mode='disabled';video.poster=`./media/${product?'cover':'phone-home'}-v${version}.jpg`;video.setAttribute('aria-label',product?'小小水族日记产品短片':'小小水族日记实际操作演示');play.setAttribute('aria-label',product?'播放32秒产品短片':'播放实际操作演示');frame.classList.toggle('walkthrough',!product);description.textContent=product?'产品短片 · 真实界面剪辑 · 原创配乐。点击播放后有声音。':'完整操作录屏 · 演示资料 · 无配乐。展示真实点击、输入和拖动。';download.href=video.querySelector('source').src;message('');video.load();play.hidden=false;});
// # 先绑定播放与源错误事件，再异步装饰版本和图标；不丢失初次点击。
showPlay();
for(const button of document.querySelectorAll('[data-film]'))button.disabled=false;
if(video.networkState===3){message('影片加载失败，可以重试播放或下载 MP4。');play.hidden=false;}
async function decorate(){
try{const{APP_VERSION,RELEASE_DATE,RELEASE_NOTES}=await import(metadataUrl.href);version=APP_VERSION;for(const el of document.querySelectorAll('[data-version]'))el.textContent=`v${version}`;document.querySelector('[data-release-date]').textContent=RELEASE_DATE;const notes=document.querySelector('[data-release-notes]');notes.replaceChildren();for(const[title,description]of RELEASE_NOTES){const article=document.createElement('article'),h=document.createElement('h3'),p=document.createElement('p');h.textContent=title;p.textContent=description;article.append(h,p);notes.append(article);}}catch{/* # 网络失败时保留 HTML 内的完整版本说明。 */}
try{const{icon}=await import('./art.js');for(const el of document.querySelectorAll('[data-care]'))el.innerHTML=icon(({feed:'food',siphon:'clean',topup:'drop',water:'water'})[el.dataset.care],28);
}catch{/* # 图标失败不影响播放器。 */}
}
void decorate();
// # 默认显示全部内容；减少动态或不支持观察器时仍完整可读。
if('IntersectionObserver'in window&&!matchMedia('(prefers-reduced-motion:reduce)').matches){const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('seen');observer.unobserve(entry.target);}},{threshold:.06});for(const el of document.querySelectorAll('.reveal')){if(el.getBoundingClientRect().top>innerHeight)el.dataset.ready='';observer.observe(el);}}
