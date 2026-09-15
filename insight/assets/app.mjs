export const NAV = [
  { href: "index.html", label: "工作台", key: "home", root: true },
  { href: "new/index.html", label: "新建分析", key: "new" },
  { href: "library/index.html", label: "报告库", key: "library" },
  { href: "settings/sources.html", label: "数据源", key: "sources" },
];

/** 计算当前页面到站点根的相对前缀（子目录页面用 ../） */
function prefixFor(active) {
  return ["home"].includes(active) ? "" : "../";
}

export function renderTopbar(active) {
  const pre = prefixFor(active);
  const links = NAV.map((n) => {
    const href = n.root ? `${pre}index.html` : `${pre}${n.href}`;
    const cur = n.key === active ? ' aria-current="page"' : "";
    return `<a href="${href}"${cur}>${n.label}</a>`;
  }).join("");
  return `<header class="topbar no-print">
  <div class="inner">
    <a class="brand" href="${pre}index.html"><i class="dot"></i>用户洞察 V2 <small>APPAREL</small></a>
    <nav>${links}</nav>
  </div>
</header>`;
}

export function mountTopbar(active) {
  const host = document.getElementById("topbar");
  if (host) host.outerHTML = renderTopbar(active);
}


const {config}=await import('/assets/config.mjs');
await new Promise((resolve,reject)=>{if(window.supabase)return resolve();const script=document.createElement('script');script.src='/assets/vendor/supabase.js';script.onload=resolve;script.onerror=()=>reject(Error('登录组件加载失败'));document.head.append(script);});
const client=window.supabase.createClient(config.url,config.publicKey,{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true}});
let state={tasks:[],actions:{},quota:[]};
const identity=await client.auth.getUser();
if(identity.error||!identity.data.user){document.body.innerHTML='<div class="wrap"><div class="callout warn"><p>请先登录后使用用户洞察 V2。</p><a href="/">前往登录</a></div></div>';throw Error('LOGIN_REQUIRED');}
const user=identity.data.user;
client.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'||(session?.user&&session.user.id!==user.id))location.replace('/');});
function mapTask(t){return {...t,reviewCount:t.review_count,keywordCount:t.keyword_count,reviewDepth:t.review_depth,createdAt:t.created_at,durationMs:t.duration_ms,mainIssue:t.main_issue,reportId:t.report_ready?t.id:null,dataFile:t.report_ready?'database':null,failureReason:t.failure_reason};}
function errorMessage(e){if(/PILOT_NOT_AUTHORIZED/.test(e?.message||''))return '该商品尚未开放分析，请先完成试跑授权。';if(/TASK_STOPPED/.test(e?.message||''))return '任务已停止。';return '操作未完成，请刷新核对状态后再继续。';}
async function rpc(name,params){const {data,error}=await client.rpc('insight_v2_'+name,params);if(error)throw Error(errorMessage(error));return data;}
export async function refreshState(){
 const {data,error}=await client.from('insight_v2_tasks').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(100);if(error)throw Error('任务服务尚未就绪，请稍后刷新。');
 state.tasks=data.map(mapTask);return state;
}
try{await refreshState();}catch(e){document.body.innerHTML='<div class="wrap"><div class="callout warn"><p>'+esc(e.message)+'</p><a href="/">返回工作台</a></div></div>';throw e;}
export const getState=()=>state;
export const setState=()=>{};
export async function getTask(id){if(!/^[a-f0-9-]{36}$/.test(id||''))return null;const {data,error}=await client.from('insight_v2_tasks').select('*').eq('id',id).eq('user_id',user.id).maybeSingle();if(error)throw Error(errorMessage(error));return data?mapTask(data):null;}
export async function createTask({asin,marketplace,brandContext,focusColor}){
 const params={p_asin:asin,p_marketplace:marketplace,p_review_depth:'standard',p_focus_color:focusColor||'',p_brand_context:brandContext||''};
 const key='insight-v2-submit:'+user.id,signature=JSON.stringify(params);let prior;try{prior=JSON.parse(sessionStorage.getItem(key));}catch{}
 const id=prior?.signature===signature?prior.id:crypto.randomUUID();sessionStorage.setItem(key,JSON.stringify({id,signature}));
 const result=await rpc('submit',{...params,p_id:id});sessionStorage.removeItem(key);return mapTask(result);
}
export const cancelTask=id=>rpc('cancel',{p_id:id});
export async function loadReport(task){const {data,error}=await client.from('insight_v2_reports').select('report').eq('task_id',task.id).eq('user_id',user.id).maybeSingle();if(error||!data)throw Error('报告尚未就绪或无权访问');if(data.report.taskId!==task.id||data.report.meta.asin!==task.asin)throw Error('报告身份不一致');return data.report;}
export async function loadActions(id){const {data,error}=await client.from('insight_v2_actions').select('*').eq('task_id',id).eq('user_id',user.id);if(error)throw Error(errorMessage(error));return Object.fromEntries(data.map(a=>[a.action_id,{status:a.status,owner:a.owner,due:a.due,actual:a.actual}]));}
export const saveAction=(id,key,s)=>rpc('action',{p_id:id,p_action_id:key,p_status:s.status,p_owner:s.owner,p_due:s.due,p_actual:s.actual});
export const reportActionsKey=id=>id;
export const ASIN_RE = /^B0[A-Z0-9]{8}$/;

export function validAsin(v) {
  return ASIN_RE.test(String(v || "").trim().toUpperCase());
}

export function maskAsin(v) {
  return String(v || "").trim().toUpperCase();
}

export function fmtDuration(ms) {
  if (typeof ms !== "number") return "—";
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function toast(msg, tone) {
  const bar = document.createElement("div");
  bar.className = `callout ${tone || "info"}`;
  bar.style.cssText = "position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:200;margin:0;max-width:520px;box-shadow:0 6px 24px rgba(0,0,0,.10);";
  bar.innerHTML = `<p>${esc(msg)}</p>`;
  document.body.appendChild(bar);
  setTimeout(() => bar.remove(), 2600);
}

export function qs(name) {
  return new URLSearchParams(location.search).get(name);
}

