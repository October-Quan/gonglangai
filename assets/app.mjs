import {renderReport} from './report.mjs?v=20260911-image-evidence';
import {mountCompetitorTool,competitorStates} from './competitor-tool.mjs?v=20260911-full2';
import {mountImageTool} from './image-tool.mjs?v=20260911-full2';
let competitorUI=null,imageUI=null;
const $=id=>document.getElementById(id);
let api,page,preview,humanError,currentUser,taskOffset=0,taskTotal=0,refreshFailures=0,refreshing=false,poll,submitting=false,draft=null;
const draftKey='gonglangai-pending-submission-v1';
let quoteAccess=false,quoteTask=null;
async function showQuote(task,scroll=false){
 if(!task)return;quoteTask=task;$('cost-card').hidden=false;
 $('cost-title').textContent=task.asin+' · 分析详情';
 const q=await api.quote(task.id);if(quoteTask?.id!==task.id)return;
 $('cost-details').hidden=!q;
 message('cost-message',task.status==='失败'?(task.failure_reason||'报表核验失败，请检查报表。'):task.status==='已完成'?'分析已完成。':task.status==='进行中'?'正在分析，可在任务列表查看进度。':q?'报表核验通过，后台自动排队处理，无需再次确认。':'正在核验报表，核验通过后自动开始，无需再次确认。',task.status==='失败');
 if(q){const s=q.input_summary||{};$('cost-source').textContent=`报表 ${s.row_count??'—'} 行 · ${s.start_date||'日期未提供'} 至 ${s.end_date||'日期未提供'} · ${s.currency||'币种列未提供'}`;
 $('cost-credits').textContent=q.credit_limit+' Credit';$('cost-yuan').textContent='模型合计最高 ¥6.00';
 $('cost-expiry').textContent='后台按实际调用量计费，并保留单次上限保护。';}
 if(scroll)$('cost-card').scrollIntoView({behavior:'smooth',block:'center'});
}
function message(id,text,error=false){const el=$(id);if(!el)return;el.textContent=text;el.classList.toggle('error',error);el.setAttribute('role',error?'alert':'status');}
function saveDraft(){sessionStorage.setItem(draftKey,JSON.stringify(draft));}
function finishDraft(){sessionStorage.removeItem(draftKey);draft=null;lockForm(false);$('task-form').reset();$('submit').textContent='提交并开始分析';}
function lockForm(locked){$('asin').disabled=locked;$('file').disabled=locked;}
function date(value){const d=new Date(value);return Number.isNaN(d.valueOf())?'时间待核验':new Intl.DateTimeFormat('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(d);}
function statusBadge(status){const span=document.createElement('span');span.className='badge '+({'待处理':'amber','进行中':'blue','已完成':'green','失败':'red'}[status]||'');const dot=document.createElement('i');dot.className='dot';span.append(dot,document.createTextNode(status));return span;}
function goLogin(){clearInterval(poll);location.replace(page(''));}
function validateAsin(){const input=$('asin');input.value=input.value.trim().toUpperCase();const valid=/^B0[A-Z0-9]{8}$/.test(input.value);input.setAttribute('aria-invalid',String(!valid));message('asin-error',valid?'':'请输入10位ASIN，以B0开头，后面为字母或数字。',!valid);return valid;}
function validateFile(){const file=$('file').files[0];let error='';if(!file)error='请选择广告报表。';else if(!/\.(xlsx|csv)$/i.test(file.name))error='仅支持 .xlsx 或 .csv 文件。';else if(file.size===0)error='文件为空，请重新选择。';else if(file.size>20*1024*1024)error='文件超过20 MiB，请选择较小的报表。';$('file').setAttribute('aria-invalid',String(Boolean(error)));message('file-error',error,!!error);return !error;}
async function refreshTasks(manual=false){
 if(refreshing)return;if(refreshFailures>=2&&!manual)return;refreshing=true;$('refresh').disabled=true;
 try{const {rows,total}=await api.tasks(currentUser.id,taskOffset);const quotes=new Map((await api.quotes(rows.filter(x=>x.status==='待处理'&&x.analysis_kind!=='competitors').map(x=>x.id))).map(q=>[q.task_id,q]));const competitorRuns=new Map((competitorUI?await api.competitorRuns(rows.filter(x=>x.analysis_kind==='competitors').map(x=>x.id)):[]).map(r=>[r.task_id,r]));const imageRuns=new Map((api.imageRuns?await api.imageRuns(rows.filter(x=>x.analysis_kind==='competitors').map(x=>x.id)):[]).map(r=>[r.task_id,r]));taskTotal=total||0;$('tasks').replaceChildren();
  for(const item of rows){const row=document.createElement('tr');for(const [i,value] of [date(item.created_at),item.asin,item.status,item.failure_reason||''].entries()){const td=document.createElement('td');if(i===2)td.append(statusBadge(value));else{td.textContent=value||'—';if(i===1)td.className='asin';if(i===3)td.className='reason';}row.append(td);}const action=document.createElement('td');
   if(item.status==='已完成'&&item.report_url){const link=document.createElement('a');const url=new URL(page('report/'));url.searchParams.set('task',item.id);link.href=url.href;link.textContent='查看报告 →';action.append(link);}
   else if(item.analysis_kind==='competitors'&&competitorUI){const run=competitorRuns.get(item.id);row.children[2].replaceChildren(statusBadge(competitorStates[run?.state]||item.status));const btn=document.createElement('button');btn.type='button';btn.className='button quiet';btn.textContent='查看竞对分析 →';btn.addEventListener('click',()=>competitorUI.open(item,true).catch(e=>message('list-message',humanError(e),true)));action.append(btn);}
   else if(item.status==='待处理'&&quoteAccess){const q=quotes.get(item.id);row.children[2].replaceChildren(statusBadge(q?'排队中':'核验报表中'));const btn=document.createElement('button');btn.type='button';btn.className='button quiet';btn.textContent='查看进度 →';btn.addEventListener('click',()=>showQuote(item,true).catch(e=>message('cost-message',humanError(e),true)));action.append(btn);}
   else action.textContent=item.status==='进行中'?'处理中':item.status==='待处理'?'尚未开通自动处理':'—';if(imageUI&&imageRuns.has(item.id)){const btn=document.createElement('button');btn.type='button';btn.className='button quiet';btn.textContent='图片诊断 →';btn.addEventListener('click',()=>imageUI.open(item,true).catch(e=>message('list-message',humanError(e),true)));action.append(btn);}row.append(action);$('tasks').append(row);
  }
  $('empty').hidden=rows.length>0;$('task-count').textContent=`共 ${taskTotal} 个任务`;$('page-number').textContent=`第 ${Math.floor(taskOffset/8)+1} 页`;$('previous').disabled=taskOffset===0;$('next').disabled=taskOffset+8>=taskTotal;
  $('updated').textContent='更新于 '+new Intl.DateTimeFormat('zh-CN',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date());message('list-message','');refreshFailures=0;
  if(competitorUI)await competitorUI.refresh();
  if(imageUI)await imageUI.refresh();
  if(quoteTask&&!$('cost-card').hidden){const active=rows.find(x=>x.id===quoteTask.id)||await api.task(quoteTask.id,currentUser.id);if(active)await showQuote(active);}
 }catch(error){refreshFailures++;message('list-message',humanError(error)+(refreshFailures>=2?' 已暂停自动刷新，请检查网络后手动刷新。':''),true);}finally{refreshing=false;$('refresh').disabled=false;}
}
async function submitTask(event){
 event.preventDefault();if(submitting)return;
 if(!draft){const a=validateAsin(),f=validateFile();if(!a||!f)return;}
 if(draft?.attempts>=2){message('submit-message','任务登记连续两次未确认，请联系管理员核验任务号：'+draft.row.id,true);return;}
 submitting=true;$('submit').disabled=true;lockForm(true);
 try{
  // The same ID is reused after any ambiguous INSERT response. Never enqueue a second task.
  if(!draft){
   const file=$('file').files[0],id=crypto.randomUUID(),ext=file.name.toLowerCase().endsWith('.csv')?'csv':'xlsx';
   const row={id,user_id:currentUser.id,asin:$('asin').value,report_file_path:`${currentUser.id}/${id}.${ext}`};
   message('submit-message','正在上传报表，请保持页面打开…');
   await api.upload(row.report_file_path,file);
   draft={row,attempts:0};saveDraft();lockForm(true);
  }
  message('submit-message','报表已上传，正在登记任务…');draft.attempts++;saveDraft();
  const existing=await api.task(draft.row.id,currentUser.id);
  if(!existing)await api.insert(draft.row);
  const submitted={...draft.row,status:'待处理'};finishDraft();message('submit-message',preview?'预览提交成功：未上传文件，也未创建真实任务。':'提交成功，后台自动生成六个模块：关键词、自然位、否定词、竞对、图片和广告诊断。可关闭页面，稍后查看报告。');taskOffset=0;await refreshTasks();
 }catch(error){
  message('submit-message',humanError(error)+(draft?' 报表已上传，任务登记尚未确认；重试会核对并沿用同一任务号。':' 报表上传未确认，未登记任务。'),true);
  if(draft)$('submit').textContent='重试登记任务';
 }finally{submitting=false;if(!draft)lockForm(false);$('submit').disabled=!!draft&&draft.attempts>=2;}
}
async function tool(){
 if(api.imageRun)imageUI=mountImageTool({api,page,humanError,refresh:()=>refreshTasks(true)});
 quoteAccess=await api.quoteAccess();
 competitorUI=await mountCompetitorTool({api,user:currentUser,refresh:()=>refreshTasks(true),humanError});
 $('close-cost').addEventListener('click',()=>{$('cost-card').hidden=true;quoteTask=null;});
 $('asin').addEventListener('blur',validateAsin);$('file').addEventListener('change',validateFile);$('task-form').addEventListener('submit',submitTask);
 $('refresh').addEventListener('click',()=>refreshTasks(true));$('previous').addEventListener('click',()=>{taskOffset=Math.max(0,taskOffset-8);refreshTasks(true);});$('next').addEventListener('click',()=>{if(taskOffset+8<taskTotal){taskOffset+=8;refreshTasks(true);}});
 try{const saved=JSON.parse(sessionStorage.getItem(draftKey));if(saved?.row?.user_id===currentUser.id){draft=saved;lockForm(true);$('asin').value=draft.row.asin;$('submit').textContent='重试登记任务';$('submit').disabled=draft.attempts>=2;message('submit-message','检测到上次尚未确认登记的任务，重试将核对同一任务号，避免重复提交。');}}catch{}
 await refreshTasks();poll=setInterval(()=>{if(!document.hidden)refreshTasks();},30000);
}
async function login(){
 let register=false,failures=0,cooldown=false;
 const select=mode=>{register=mode;for(const [id,active] of [['login-tab',!mode],['register-tab',mode]])$(id).setAttribute('aria-selected',String(active));$('login-submit').textContent=mode?'发送注册链接':'发送登录链接';$('auth-help').textContent=mode?'使用邮箱创建账号，无需设置密码。请在同一浏览器发送并打开链接。':'无需密码。请在同一浏览器发送并打开邮件链接；Codex内置网页与Chrome不互通。';message('auth-message','');};
 $('login-tab').addEventListener('click',()=>select(false));$('register-tab').addEventListener('click',()=>select(true));
 $('auth-form').addEventListener('submit',async e=>{e.preventDefault();if(cooldown||failures>=2)return;const email=$('email').value.trim();if(!$('email').checkValidity()){message('auth-message','请输入有效的邮箱地址。',true);return;}$('login-submit').disabled=true;cooldown=true;
  try{await api.loginLink(email,register);failures=0;message('auth-message',preview?'预览模式：不会发送邮件。可从顶部进入工具页预览。':'请求已提交。请在发送链接的同一浏览器打开最新邮件链接；如果邮件自动打开另一浏览器，请复制链接回到当前浏览器。若未收到，请检查垃圾邮件。');setTimeout(()=>{cooldown=false;$('login-submit').disabled=false;},60000);}
  catch(error){failures++;cooldown=false;message('auth-message',humanError(error)+(failures>=2?' 已停止重复请求，请联系管理员核验。':''),true);$('login-submit').disabled=failures>=2;}
 });
 const params=new URLSearchParams(location.hash.slice(1));if(params.has('error')){message('auth-message','登录链接无效或已过期，请重新发送并打开最新链接。',true);history.replaceState({},'',location.pathname+location.search);}
}
async function report(){
 const id=new URLSearchParams(location.search).get('task');
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id||'')){message('report-message','报告地址缺少有效的任务号，请返回工具页选择报告。',true);$('report-loading').hidden=true;return;}
 const task=await api.task(id,currentUser.id);if(!task){message('report-message','任务不存在，或当前账号没有查看权限。',true);$('report-loading').hidden=true;return;}
 $('report-asin').textContent=task.asin;
 const imageView=new URLSearchParams(location.search).get('view')==='images',ir=imageView?await api.imageRun(task.id):null;
 const reportURL=imageView?ir?.report_url:task.report_url;
 if((!imageView&&task.status!=='已完成')||!reportURL){message('report-message',task.status==='失败'?'任务失败：'+(task.failure_reason||'请返回任务列表查看原因。'):'任务尚未完成，请返回工具页查看处理状态。',task.status==='失败');$('report-loading').hidden=true;return;}
 const html=await api.report(reportURL);const count=renderReport(html,$('report-content'),$('report-meta'),$('report-note'),task.asin);$('word-count').textContent=`${count} 个关键词`;$('report-loading').hidden=true;$('report-panel').hidden=false;const requestedModule=new URLSearchParams(location.search).get('module');const section=/^0[1-6]$/.test(requestedModule??'')?requestedModule:(imageView?'05':null);if(section)document.querySelector('[aria-controls="diagnosis-'+section+'"]')?.click();
}
try{
 ({api,page,preview,humanError}=await import('./api.mjs?v=20260910-images'));
 const kind=document.body.dataset.page;
 if(preview){$('preview-banner').hidden=false;for(const anchor of document.querySelectorAll('[data-preview-page]'))anchor.href=page(anchor.dataset.previewPage);}
 for(const anchor of document.querySelectorAll('[data-page-link]'))anchor.href=page(anchor.dataset.pageLink);
 if(kind==='login'){
  await login();
  if(!preview){$('login-submit').disabled=true;try{const user=await api.loginUser();if(user)location.replace(page('tool/'));}catch(error){message('auth-message',humanError(error),true);}finally{$('login-submit').disabled=false;}}
 }else{
  try{currentUser=await api.user();}catch(error){if(/Auth session missing|session_not_found|refresh_token|JWT expired/i.test(String(error?.message)+' '+String(error?.code))||error?.status===401){goLogin();}else throw error;}
  if(currentUser){$('account-email').textContent=currentUser.email;$('workspace').hidden=false;$('initial-loading').hidden=true;api.onLogout(goLogin);
   $('logout').addEventListener('click',async()=>{$('logout').disabled=true;try{await api.logout();goLogin();}catch(error){message('global-message',humanError(error),true);$('logout').disabled=false;}});
   if(kind==='tool')await tool();else await report();
  }else goLogin();
 }
}catch(error){message(document.body.dataset.page==='login'?'auth-message':'global-message',humanError?humanError(error):'页面组件无法加载，请刷新页面。',true);if($('initial-loading'))$('initial-loading').hidden=true;if($('report-loading'))$('report-loading').hidden=true;}
