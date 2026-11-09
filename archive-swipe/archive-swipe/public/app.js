const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const themes = [
  ['archive','01','Archive black',' #c4a77d'],['mono','02','Monochrome','#d8d8d8'],['y2k','03','Y2K chrome','#d2b5ff'],
  ['paper','04','Japanese paper','#8b5f46'],['darkroom','05','Darkroom red','#d98b73'],['denim','06','Faded denim','#9bbad0'],
  ['brutal','07','Neo brutalist','#db5a3d'],['tokyo','08','Neo Tokyo','#ff7e74'],['magazine','09','Vintage mag','#8d3e33'],['wabi','10','Wabi-sabi','#7a806a'],['cyber','11','Cyber archive','#9be1d0']
];
// Ten visual themes plus the default archive theme. Rename or recolor freely in this list.
const demoPins = [
  {id:'d1',title:'The shape of silence',category:'JAPANESE INTERIOR / 001',description:'Raw textures, soft light, and a room with nothing to prove.',image:'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1500&q=88',url:'https://www.pinterest.com/search/pins/?q=japanese%20minimal%20interior',tag:'interior'},
  {id:'d2',title:'A study in layers',category:'ARCHIVE FASHION / 002',description:'Distressed fabric, oversized proportions, quiet contrast.',image:'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1500&q=88',url:'https://www.pinterest.com/search/pins/?q=japanese%20archive%20fashion',tag:'fashion'},
  {id:'d3',title:'Objects from another time',category:'OBJECT / 003',description:'A little patina makes everything feel more human.',image:'https://images.unsplash.com/photo-1490312278390-ab64016e0aa9?auto=format&fit=crop&w=1500&q=88',url:'https://www.pinterest.com/search/pins/?q=japanese%20vintage%20objects',tag:'objects'},
  {id:'d4',title:'Between concrete and sky',category:'ARCHITECTURE / 004',description:'Brutal geometry softened by the afternoon.',image:'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1500&q=88',url:'https://www.pinterest.com/search/pins/?q=japanese%20brutalist%20architecture',tag:'architecture'},
  {id:'d5',title:'The imperfect still life',category:'STILL LIFE / 005',description:'Muted tones, ordinary things, deliberate framing.',image:'https://images.unsplash.com/photo-1490312278390-ab64016e0aa9?auto=format&fit=crop&w=1500&q=88',url:'https://www.pinterest.com/search/pins/?q=wabi%20sabi%20still%20life',tag:'objects'},
  {id:'d6',title:'After the last train',category:'TOKYO NIGHT / 006',description:'Rain on glass. Sodium lights. A city that never quite sleeps.',image:'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1500&q=88',url:'https://www.pinterest.com/search/pins/?q=tokyo%20night%20street%20photography',tag:'city'},
  {id:'d7',title:'Soft focus, hard edges',category:'EDITORIAL / 007',description:'A quiet frame with a very particular point of view.',image:'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1500&q=88',url:'https://www.pinterest.com/search/pins/?q=japanese%20fashion%20editorial',tag:'fashion'},
  {id:'d8',title:'The archive of blue',category:'COLOR STUDY / 008',description:'Washed denim, cold light, and beautiful wear marks.',image:'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=1500&q=88',url:'https://www.pinterest.com/search/pins/?q=faded%20denim%20editorial',tag:'fashion'},
  {id:'d9',title:'A room for slow mornings',category:'SPACE / 009',description:'Wood grain, paper lamps, and a little breathing room.',image:'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1500&q=88',url:'https://www.pinterest.com/search/pins/?q=japanese%20wabi%20sabi%20interior',tag:'interior'},
  {id:'d10',title:'Fragments of the future',category:'GRAPHIC STUDY / 010',description:'Digital nostalgia with a slightly analog heartbeat.',image:'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1500&q=88',url:'https://www.pinterest.com/search/pins/?q=y2k%20graphic%20design%20archive',tag:'graphic'}
];

const state = {
  theme: localStorage.getItem('as-theme') || 'archive', source:'discover', pins:[...demoPins], index:0,
  boards:[], selectedBoard:'', connected:false, configured:false, kept:JSON.parse(localStorage.getItem('as-kept')||'[]'),
  skipped:JSON.parse(localStorage.getItem('as-skipped')||'[]'), playlist:JSON.parse(localStorage.getItem('as-playlist')||'[]'),
  sound:localStorage.getItem('as-sound') !== 'false', reduceMotion:localStorage.getItem('as-motion') === 'true', shuffle:localStorage.getItem('as-shuffle') !== 'false'
};
let toastTimer, dragStart=null, audioCtx;

function notify(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2200)}
function persist(){localStorage.setItem('as-kept',JSON.stringify(state.kept));localStorage.setItem('as-skipped',JSON.stringify(state.skipped));localStorage.setItem('as-playlist',JSON.stringify(state.playlist))}
function renderThemes(){
  $('#themeList').innerHTML=themes.map(([id,num,name,color])=>`<button class="theme-btn ${state.theme===id?'active':''}" data-theme="${id}"><span class="theme-chip" style="--chip:${color}"></span>${name}<span class="theme-num">${num}</span></button>`).join('');
  $$('.theme-btn').forEach(btn=>btn.addEventListener('click',()=>setTheme(btn.dataset.theme)));
}
function setTheme(theme){state.theme=theme;document.body.dataset.theme=theme;localStorage.setItem('as-theme',theme);renderThemes()}
function updateStats(){
  $('#keptCount').textContent=String(state.kept.length).padStart(2,'0');$('#skippedCount').textContent=String(state.skipped.length).padStart(2,'0');
  $('#remainingCount').textContent=String(Math.max(0,state.pins.length-state.index)).padStart(2,'0');$('#cardIndex').textContent=`${String(Math.min(state.index+1,state.pins.length)).padStart(2,'0')} — ${String(state.pins.length).padStart(2,'0')}`;
}
function imageFor(pin){return pin.image || pin.media?.images?.['1200x']?.url || pin.media?.images?.['600x']?.url || pin.media?.images?.['400x300']?.url || ''}
function titleFor(pin){return pin.title || pin.description || 'Untitled pin'}
function renderCard(){
  const pin=state.pins[state.index];const card=$('#pinCard');const empty=$('#emptyState');
  updateStats();
  if(!pin){card.hidden=true;empty.hidden=false;return}
  card.hidden=false;empty.hidden=true;
  $('#pinImage').src=imageFor(pin);$('#pinTitle').textContent=titleFor(pin);$('#pinDescription').textContent=pin.description || (pin.id?.startsWith('d')?'Curated reference from the sample deck.':'Your Pinterest archive.');
  $('#pinCategory').textContent=pin.category || (pin.board_id?'YOUR PIN / PINTEREST':'PIN / ARCHIVE');$('#pinIndex').textContent=`NO. ${String(state.index+1).padStart(3,'0')} / ${String(state.pins.length).padStart(3,'0')}`;
  $('#pinLink').href=pin.url || `https://www.pinterest.com/pin/${pin.id}/`;
  $('#likeStamp').style.opacity=0;$('#nopeStamp').style.opacity=0;
}
async function act(direction){
  const pin=state.pins[state.index];if(!pin)return;
  const card=$('#pinCard');const stamp=direction==='like'?$('#likeStamp'):$('#nopeStamp');
  if(direction==='like'){
    state.kept.push({id:pin.id,title:titleFor(pin),url:pin.url||`https://www.pinterest.com/pin/${pin.id}/`,at:Date.now()});persist();playTone('like');
    if(state.connected && pin.id && /^\d+$/.test(String(pin.id)) && state.selectedBoard){
      try{await api(`/api/save/${pin.id}`,{method:'POST',body:JSON.stringify({boardId:state.selectedBoard})});notify('Saved to your Pinterest board ✓')}
      catch(error){notify(`Local keep saved. Pinterest: ${error.message}`)}
    } else notify('Added to your local keep list ✓');
  }else{state.skipped.push(pin.id);persist();playTone('skip')}
  stamp.style.opacity=1;
  card.style.transform=direction==='like'?'translate(110%, -3%) rotate(14deg)':'translate(-110%, -3%) rotate(-14deg)';card.style.opacity='0';
  setTimeout(()=>{state.index++;card.style.transition='none';card.style.transform='';card.style.opacity='1';renderCard();requestAnimationFrame(()=>card.style.transition='transform .28s ease,opacity .28s ease')},state.reduceMotion?0:230);
}
function playTone(kind){if(!state.sound)return;try{
  audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();
  const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.connect(gain);gain.connect(audioCtx.destination);
  const now=audioCtx.currentTime;osc.type='sine';
  if(kind==='like'){osc.frequency.setValueAtTime(880,now);osc.frequency.exponentialRampToValueAtTime(1174,now+.085);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.045,now+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+.16);osc.start(now);osc.stop(now+.17)}
  else{osc.frequency.setValueAtTime(240,now);osc.frequency.exponentialRampToValueAtTime(170,now+.09);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.022,now+.01);gain.gain.exponentialRampToValueAtTime(.0001,now+.12);osc.start(now);osc.stop(now+.13)}
}catch{}}
function shuffleDeck(){state.index=0;if(state.source==='discover')state.pins=[...demoPins].sort(()=>Math.random()-.5);renderCard()}
function extractYouTubeId(raw){try{const u=new URL(raw);if(u.hostname.includes('youtu.be'))return u.pathname.slice(1).split('/')[0];if(u.hostname.includes('youtube.com'))return u.searchParams.get('v')||u.pathname.split('/').filter(Boolean).pop();}catch{}return null}
function renderPlaylist(){
  $('#playlist').innerHTML=state.playlist.map((track,i)=>`<div class="track"><span>♫</span><button data-play="${i}" title="${escapeHtml(track.title)}">${escapeHtml(track.title)}</button><button class="remove-track" data-remove="${i}" aria-label="Şarkıyı sil">×</button></div>`).join('');
  $$('#playlist [data-play]').forEach(button=>button.addEventListener('click',()=>playTrack(Number(button.dataset.play))));
  $$('#playlist [data-remove]').forEach(button=>button.addEventListener('click',()=>{state.playlist.splice(Number(button.dataset.remove),1);persist();renderPlaylist();$('#musicPlayer').innerHTML='<div class="music-placeholder">NO TRACK SELECTED</div>'}));
}
function playTrack(index){const track=state.playlist[index];if(!track)return;$('#musicPlayer').innerHTML=`<iframe title="${escapeHtml(track.title)}" src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(track.id)}?autoplay=1&loop=1&playlist=${encodeURIComponent(track.id)}" allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;notify(`Now playing: ${track.title}`)}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function api(url,options={}){const response=await fetch(url,{...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'İstek başarısız oldu.');return data}
async function checkStatus(){
  try{const status=await api('/api/status');state.connected=status.connected;state.configured=status.configured;renderConnection();
    if(state.connected){const [boards,pins,me]=await Promise.all([api('/api/boards'),api('/api/pins'),api('/api/me')]);state.boards=boards;$('#pinCount').textContent=pins.length;$('#connectionLabel').textContent=me.username?`@${me.username}`:'CONNECTED';
      $('#boardSelect').innerHTML=boards.length?boards.map(b=>`<option value="${escapeHtml(b.id)}">${escapeHtml(b.name)}</option>`).join(''):'<option value="">No boards found</option>';
      $('#boardSelect').disabled=!boards.length;state.selectedBoard=boards[0]?.id||'';
      if(state.source==='account'){state.pins=pins.map(p=>({...p,id:p.id,url:`https://www.pinterest.com/pin/${p.id}/`,image:imageFor(p)}));state.index=0;renderCard()}
    }
  }catch(error){console.warn(error)}
}
function renderConnection(){
  $('#connectionDot').style.background=state.connected?'#8dba8b':'#8d9f7b';$('#connectionLabel').textContent=state.connected?'PINTEREST CONNECTED':'DEMO MODE';
  $('#pinterestLogin').textContent=state.connected?'↗ DISCONNECT':'↗ CONNECT PINTEREST';
  $('#pinterestLogin').onclick=async()=>{if(state.connected){await api('/auth/logout',{method:'POST'});state.connected=false;state.source='discover';state.pins=[...demoPins];state.index=0;$$('.source-btn').forEach(b=>b.classList.toggle('active',b.dataset.source==='discover'));renderConnection();renderCard();notify('Pinterest disconnected')}else if(state.configured){location.href='/auth/pinterest'}else notify('Önce .env dosyasına Pinterest App ID ve Secret eklemelisin.')};
}

$('#skipBtn').addEventListener('click',()=>act('skip'));$('#likeBtn').addEventListener('click',()=>act('like'));$('#restartDeck').addEventListener('click',shuffleDeck);
document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName))return;if(e.key==='ArrowLeft')act('skip');if(e.key==='ArrowRight')act('like')});
$('#pinCard').addEventListener('pointerdown',e=>{dragStart={x:e.clientX,y:e.clientY};$('#pinCard').setPointerCapture(e.pointerId)});
$('#pinCard').addEventListener('pointerup',e=>{if(!dragStart)return;const dx=e.clientX-dragStart.x;dragStart=null;if(Math.abs(dx)>85)act(dx>0?'like':'skip')});
$('#pinCard').addEventListener('pointercancel',()=>dragStart=null);
$$('.source-btn').forEach(button=>button.addEventListener('click',async()=>{
  const source=button.dataset.source;if(source==='account'&&!state.connected){notify('Önce Pinterest hesabını bağla.');return}
  state.source=source;$$('.source-btn').forEach(b=>b.classList.toggle('active',b===button));state.index=0;
  if(source==='discover'){state.pins=[...demoPins];$('#deckMode').textContent='DISCOVER / CURATED SAMPLE'}
  else{try{const pins=await api('/api/pins');state.pins=pins.map(p=>({...p,url:`https://www.pinterest.com/pin/${p.id}/`,image:imageFor(p)}));$('#deckMode').textContent='YOUR ACCOUNT / SAVED PINS'}catch(error){notify(error.message);return}}
  renderCard();
}));
$('#boardSelect').addEventListener('change',e=>state.selectedBoard=e.target.value);
$('#musicForm').addEventListener('submit',e=>{e.preventDefault();const url=$('#musicUrl').value.trim();const id=extractYouTubeId(url);if(!id){notify('Geçerli bir YouTube bağlantısı ekle.');return}if(state.playlist.some(t=>t.id===id)){notify('Bu parça zaten listede.');return}state.playlist.push({id,title:`YouTube track ${state.playlist.length+1}`,url});persist();renderPlaylist();$('#musicUrl').value='';playTrack(state.playlist.length-1)});
$('#pinUrlForm').addEventListener('submit',e=>{e.preventDefault();const url=$('#pinUrlInput').value.trim();let id=null;try{const u=new URL(url);const match=u.pathname.match(/\/pin\/(\d+)/);if(match)id=match[1]}catch{}if(!id){notify('Pin bağlantısı biçimi tanınmadı.');return}state.pins.push({id,title:'Pinterest link added',description:'A link you added to your review queue.',url,image:'https://images.unsplash.com/photo-1490312278390-ab64016e0aa9?auto=format&fit=crop&w=1200&q=80',category:'YOUR LINK / QUEUE'});$('#pinUrlInput').value='';if(state.index>=state.pins.length-1)renderCard();notify('Link kuyruğa eklendi. Görsel önizlemesi bu demoda örnek.')} );
$('#settingsToggle').addEventListener('click',()=>{$('#settingsDrawer').classList.add('open');$('#settingsDrawer').setAttribute('aria-hidden','false')});$('#closeSettings').addEventListener('click',()=>{$('#settingsDrawer').classList.remove('open');$('#settingsDrawer').setAttribute('aria-hidden','true')});
$('#soundToggle').checked=state.sound;$('#motionToggle').checked=state.reduceMotion;$('#shuffleToggle').checked=state.shuffle;
$('#soundToggle').addEventListener('change',e=>{state.sound=e.target.checked;localStorage.setItem('as-sound',String(state.sound))});$('#motionToggle').addEventListener('change',e=>{state.reduceMotion=e.target.checked;document.body.classList.toggle('reduce-motion',state.reduceMotion);localStorage.setItem('as-motion',String(state.reduceMotion))});$('#shuffleToggle').addEventListener('change',e=>{state.shuffle=e.target.checked;localStorage.setItem('as-shuffle',String(state.shuffle))});
$('#clearSession').addEventListener('click',()=>{if(!confirm('Local beğeni, geçiş ve müzik listesi sıfırlansın mı?'))return;state.kept=[];state.skipped=[];state.playlist=[];persist();renderPlaylist();updateStats();notify('Local session cleared.')});

if(location.search.includes('connected=1'))notify('Pinterest hesabın bağlandı!');if(location.search.includes('auth=error'))notify('Pinterest bağlantısı tamamlanamadı.');if(location.search.includes('auth=cancelled'))notify('Pinterest bağlantısı iptal edildi.');
setTheme(state.theme);renderThemes();renderPlaylist();document.body.classList.toggle('reduce-motion',state.reduceMotion);renderCard();checkStatus();
