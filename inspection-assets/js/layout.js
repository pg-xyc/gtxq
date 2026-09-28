// Keep existing element IDs and event handlers while grouping tasks into short screens.
const main=document.querySelector('main');
const workspace=document.querySelector('.workspace');
const scene=document.querySelector('.scene-panel');
const evidence=document.querySelector('.evidence-panel');
const live=document.querySelector('.live-monitor');
const pages={};
for(const [id,title] of [['patrol','巡检'],['detect','识别'],['records','记录']]){
 const page=document.createElement('section');page.id='page-'+id;page.className='app-page';page.setAttribute('aria-label',title);page.hidden=id!=='patrol';main.insertBefore(page,workspace);pages[id]=page;
}
pages.patrol.append(document.querySelector('.page-heading'),document.querySelector('.metrics'),scene);
pages.detect.append(live);const demo=document.createElement('details');demo.className='app-disclosure';demo.innerHTML='<summary>三维仿真抓拍 · 演示数据</summary>';demo.hidden=true;demo.append(evidence);pages.records.append(demo,document.querySelector('footer'));workspace.remove();
for(const [selector,title] of [['.flight-settings','飞行参数'],['.route-panel','巡检航线']]){
 const node=document.querySelector(selector),details=document.createElement('details'),summary=document.createElement('summary');
 details.className='app-disclosure';summary.textContent=title;node.before(details);details.append(summary,node);
}
const nav=document.createElement('nav');nav.className='app-nav';nav.setAttribute('aria-label','主导航');
const icons={patrol:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z"/><path d="M9 3v15M15 6v15"/>',detect:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/><circle cx="12" cy="12" r="4"/>',records:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>'};
for(const [id,label] of [['patrol','巡检'],['detect','识别'],['records','记录']]){const b=document.createElement('button');b.type='button';b.dataset.page=id;b.setAttribute('aria-controls','page-'+id);b.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">${icons[id]}</svg><span>${label}</span>`;b.onclick=()=>show(id);nav.append(b);}
document.body.append(nav);
let active='patrol';const positions={};
function show(id){if(active!==id){positions[active]=window.scrollY;if(active==='detect')window.helmetLiveMonitor?.stop();}active=id;for(const [key,page] of Object.entries(pages))page.hidden=key!==id;for(const b of nav.children){b.classList.toggle('active',b.dataset.page===id);if(b.dataset.page===id)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}window.scrollTo(0,positions[id]||0);window.dispatchEvent(new Event('resize'));}
document.getElementById('locate').addEventListener('click',()=>show('patrol'),true);
show('patrol');
