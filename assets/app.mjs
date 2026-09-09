import {renderReport} from './report.mjs?v=20260909-organic';
const $=id=>document.getElementById(id);
let api,page,preview,humanError,currentUser,taskOffset=0,taskTotal=0,refreshFailures=0,refreshing=false,poll,submitting=false,draft=null;
const draftKey='gonglangai-pending-submission-v1';
let quoteAccess=false,quoteTask=null,currentQuote=null,confirming=false,confirmFailures=0;
async function showQuote(task,scroll=false){
 if(!task||confirming&&quoteTask?.id!==task.id)return;
 const changed=quoteTask?.id!==task.id;quoteTask=task;$('confirm-cost').disabled=true;$('cost-card').hidden=false;
 if(changed){currentQuote=null;confirmFailures=0;$('cost-consent').checked=false;$('delete-upload').checked=false;}
 $('cost-title').textContent=task.asin+' · 确认本次分析';
 try{
  const q=await api.quote(task.id);if(quoteTask?.id!==task.id)return;
  if(currentQuote?.quote_version!==q?.quote_version){$('cost-consent').checked=false;confirmFailures=0;}
  currentQuote=q;$('close-cost').textContent=q?.confirmed_at?'收起':'稍后再说';
  const ready=!!q&&!q.confirmed_at&&Date.parse(q.expires_at)>Date.now()&&task.status==='待处理';
  $('cost-details').hidden=!q;$('cost-options').hidden=!ready;$('confirm-cost').hidden=!ready;
  $('confirm-cost').disabled=!ready||confirming||!$('cost-consent').checked||confirmFailures>=2;
  message('cost-message',task.status==='失败'?(task.failure_reason||'报表核验失败，请检查报表。'):q?.confirmed_at?'额度已确认，后台将自动处理。可在下方查看进度。':!q?'正在核验报表，通常约30秒。核验不调用付费分析服务，请稍后刷新。':!ready?'本次额度提示已过期，后台将重新核验，请稍后刷新。':'报表核验通过。点击确认后才开始消耗额度。',task.status==='失败');
  if(q){
   const s=q.input_summary||{};$('cost-source').textContent=`报表 ${s.row_count??'—'} 行 · ${s.start_date||'日期未提供'} 至 ${s.end_date||'日期未提供'} · ${s.currency||'币种列未提供，请确认原表为USD'}`;
   $('cost-credits').textContent=q.credit_limit+' Credit';$('cost-yuan').textContent='¥'+Number(q.deepseek_limit_yuan).toFixed(2);
   $('cost-expiry').textContent='本次额度提示有效至 '+date(q.expires_at)+'；实际按调用量扣减，不是固定收费。';
  }
 }catch(e){$('confirm-cost').disabled=true;throw e;}
 if(scroll)$('cost-card').scrollIntoView({behavior:'smooth',block:'center'});
}
async function confirmCost(){
 if(confirming||confirmFailures>=2||!currentQuote||!$('cost-consent').checked)return;
 confirming=true;$('confirm-cost').disabled=true;$('close-cost').disabled=true;
 try{await api.confirmTask(currentQuote,$('delete-upload').checked);confirmFailures=0;await refreshTasks(true);await showQuote(quoteTask);}
 catch(e){confirmFailures++;message('cost-message',humanError(e)+(confirmFailures>=2?' 已停止重复确认，请联系管理员核验。':' 可刷新核对是否已确认；重试不会创建新任务。'),true);}
 finally{confirming=false;$('close-cost').disabled=false;$('confirm-cost').disabled=confirmFailures>=2||!!currentQuote?.confirmed_at||!$('cost-consent').checked;}
}
function message(id,text,error=false){const el=$(id);if(!el)return;el.textContent=text;el.classList.toggle('error',error);el.setAttribute('role',error?'alert':'status');}
function saveDraft(){sessionStorage.setItem(draftKey,JSON.stringify(draft));}
function finishDraft(){sessionStorage.removeItem(draftKey);draft=null;lockForm(false);$('task-form').reset();$('submit').textContent='上传并查看额度';}
function lockForm(locked){$('asin').disabled=locked;$('file').disabled=locked;}
function date(value){const d=new Date(value);return Number.isNaN(d.valueOf())?'时间待核验':new Intl.DateTimeFormat('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(d);}
function statusBadge(status){const span=document.createElement('span');span.className='badge '+({'待处理':'amber','进行中':'blue','已完成':'green','失败':'red'}[status]||'');const dot=document.createElement('i');dot.className='dot';span.append(dot,document.createTextNode(status));return span;}
function goLogin(){clearInterval(poll);location.replace(page(''));}
function validateAsin(){const input=$('asin');input.value=input.value.trim().toUpperCase();const valid=/^B0[A-Z0-9]{8}$/.test(input.value);input.setAttribute('aria-invalid',String(!valid));message('asin-error',valid?'':'请输入10位ASIN，以B0开头，后面为字母或数字。',!valid);return valid;}
function validateFile(){const file=$('file').files[0];let error='';if(!file)error='请选择广告报表。';else if(!/\.(xlsx|csv)$/i.test(file.name))error='仅支持 .xlsx 或 .csv 文件。';else if(file.size===0)error='文件为空，请重新选择。';else if(file.size>20*1024*1024)error='文件超过20 MiB，请选择较小的报表。';$('file').setAttribute('aria-invalid',String(Boolean(error)));message('file-error',error,!!error);return !error;}
async function refreshTasks(manual=false){
 if(refreshing)return;if(refreshFailures>=2&&!manual)return;refreshing=true;$('refresh').disabled=true;
 try{const {rows,total}=await api.tasks(currentUser.id,taskOffset);const quotes=new Map((await api.quotes(rows.filter(x=>x.status==='待处理').map(x=>x.id))).map(q=>[q.task_id,q]));taskTotal=total||0;$('tasks').replaceChildren();
  for(const item of rows){const row=document.createElement('tr');for(const [i,value] of [date(item.created_at),item.asin,item.status,item.failure_reason||''].entries()){const td=document.createElement('td');if(i===2)td.append(statusBadge(value));else{td.textContent=value||'—';if(i===1)td.className='asin';if(i===3)td.className='reason';}row.append(td);}const action=document.createElement('td');
   if(item.status==='已完成'&&item.report_url){const link=document.createElement('a');const url=new URL(page('report/'));url.searchParams.set('task',item.id);link.href=url.href;link.textContent='查看报告 →';action.append(link);}
   else if(item.status==='待处理'&&quoteAccess){const q=quotes.get(item.id);row.children[2].replaceChildren(statusBadge(q?.confirmed_at?'已确认 · 排队中':q?'待确认额度':'核验报表中'));const btn=document.createElement('button');btn.type='button';btn.className='button quiet';btn.textContent=q?.confirmed_at?'查看额度':'确认额度 →';btn.addEventListener('click',()=>showQuote(item,true).catch(e=>message('cost-message',humanError(e),true)));action.append(btn);}
   else action.textContent=item.status==='进行中'?'处理中':item.status==='待处理'?'尚未开通自动处理':'—';row.append(action);$('tasks').append(row);
  }
  $('empty').hidden=rows.length>0;$('task-count').textContent=`共 ${taskTotal} 个任务`;$('page-number').textContent=`第 ${Math.floor(taskOffset/8)+1} 页`;$('previous').disabled=taskOffset===0;$('next').disabled=taskOffset+8>=taskTotal;
  $('updated').textContent='更新于 '+new Intl.DateTimeFormat('zh-CN',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date());message('list-message','');refreshFailures=0;
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
  const submitted={...draft.row,status:'待处理'};finishDraft();message('submit-message',preview?'预览提交成功：未上传文件，也未创建真实任务。':'上传成功，请在下方查看额度并确认开始。');taskOffset=0;await refreshTasks();if(quoteAccess)await showQuote(submitted,true).catch(e=>message('cost-message',humanError(e),true));
 }catch(error){
  message('submit-message',humanError(error)+(draft?' 报表已上传，任务登记尚未确认；重试会核对并沿用同一任务号。':' 报表上传未确认，未登记任务。'),true);
  if(draft)$('submit').textContent='重试登记任务';
 }finally{submitting=false;if(!draft)lockForm(false);$('submit').disabled=!!draft&&draft.attempts>=2;}
}
async function tool(){
 quoteAccess=await api.quoteAccess();
 $('confirm-cost').addEventListener('click',confirmCost);
 $('cost-consent').addEventListener('change',()=>{$('confirm-cost').disabled=confirming||confirmFailures>=2||!$('cost-consent').checked||!currentQuote||!!currentQuote.confirmed_at||Date.parse(currentQuote.expires_at)<=Date.now();});
 $('close-cost').addEventListener('click',()=>{$('cost-card').hidden=true;quoteTask=null;currentQuote=null;});
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
 if(task.status!=='已完成'||!task.report_url){message('report-message',task.status==='失败'?'任务失败：'+(task.failure_reason||'请返回任务列表查看原因。'):'任务尚未完成，请返回工具页查看处理状态。',task.status==='失败');$('report-loading').hidden=true;return;}
 const html=await api.report(task.report_url);const count=renderReport(html,$('report-content'),$('report-meta'),$('report-note'),task.asin);$('word-count').textContent=`${count} 个关键词`;$('report-loading').hidden=true;$('report-panel').hidden=false;
}
try{
 ({api,page,preview,humanError}=await import('./api.mjs'));
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
