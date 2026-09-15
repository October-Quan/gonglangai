import {mountTopbar,getTask,cancelTask,qs,esc,toast} from './app.mjs';
mountTopbar('task');const id=qs('id');
const stages=[['FETCHING_DETAIL','读取商品信息'],['FETCHING_REVIEWS','抓取评论'],['FETCHING_KEYWORDS','读取搜索词'],['ANALYZING','生成洞察与视觉草案'],['VALIDATING','来源与引用核验'],['RENDERING','生成报告']];
let stopped=false,timer;
async function refresh(){
 try{
  const t=await getTask(id);if(!t)throw Error('任务不存在或无权访问');
  document.getElementById('task-title').firstChild.textContent=t.asin+' · '+t.status;
  document.getElementById('task-sub').textContent='站点 '+t.marketplace+' · '+t.createdAt;
  document.getElementById('mode-tag').textContent='服务器任务';
  document.getElementById('task-meta').innerHTML=`<span class="chip">任务 <b>${esc(t.id)}</b></span>`;
  const idx=stages.findIndex(s=>s[0]===t.status),done=t.status==='DONE';
  document.getElementById('stages').innerHTML=stages.map(([code,name],i)=>`<li class="${done||i<idx?'done':i===idx?'active':''}"><span class="mk">${done||i<idx?'✓':i===idx?'…':'·'}</span><span>${esc(name)}</span></li>`).join('');
  const completed=done?6:Math.max(0,idx);document.querySelector('#bar i').style.width=(completed/6*100)+'%';document.getElementById('pct').textContent=`已完成 ${completed} / 6 阶段`;
  document.getElementById('log').textContent=(t.events||[]).map(e=>`${e.at} · ${e.stage}${e.detail?.page?' · 第 '+e.detail.page+' 页，已读取 '+e.detail.fetched+' / '+e.detail.total:''}`).join('\n');
  stopped=['DONE','FAILED','CANCELLED'].includes(t.status);document.getElementById('cancel').disabled=stopped;
  document.getElementById('result').innerHTML=done?`<div class="callout good"><p>分析完成</p><a class="btn" href="../report/index.html?id=${encodeURIComponent(id)}">打开报告</a></div>`:stopped?`<div class="callout warn"><p>${esc(t.failureReason||t.status)}</p></div>`:'';
 }catch(e){document.getElementById('result').textContent=e.message;}
 if(!stopped)timer=setTimeout(refresh,5000);
}
document.getElementById('cancel').onclick=async()=>{try{await cancelTask(id);await refresh();}catch(e){toast(e.message,'warn');}};
window.addEventListener('pagehide',()=>{stopped=true;clearTimeout(timer);});await refresh();
