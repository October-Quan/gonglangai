import {workflowUI} from './workflow-ui.mjs?v=direct-v1';
import {config} from '../assets/config.mjs';
const $=s=>document.querySelector(s);
const client=window.supabase.createClient(config.url,config.publicKey,{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true}});
function message(text,error=false){$('#message').textContent=text;$('#message').className='message '+(error?'error':'');}
function safeError(e){return /permission|row-level|42501/i.test(e?.message||'')?'当前账号无权操作此任务。':'操作未完成，请检查连接后刷新。';}
function cell(row,text){const c=document.createElement('td');c.textContent=text??'—';row.append(c);return c;}
let user,refreshTimer,workflow,refreshing=false;
try{
 const result=await client.auth.getUser();if(result.error||!result.data.user){message('请先登录，再从工作台进入用户洞察。');const a=document.createElement('a');a.href='/';a.textContent='前往登录';$('#message').append(' ',a);}
 else{user=result.data.user;if(document.body.dataset.voc==='submit')await submission();else await report();}
}catch(e){message(safeError(e),true);}
async function submission(){
 $('#email').textContent=user.email;$('#workspace').hidden=false;message('');addAsin();
 $('#add-asin').onclick=()=>addAsin();$('#refresh').onclick=()=>refresh();
 workflow=workflowUI(client,{refresh,safeError});
 await refresh();refreshTimer=setInterval(()=>refresh(),5000);window.addEventListener('pagehide',()=>clearInterval(refreshTimer),{once:true});
}
function addAsin(){const count=document.querySelectorAll('[data-asin]').length;if(count>=2)return;const row=document.createElement('div');row.className='voc-row';const input=document.createElement('input');input.className='input';input.maxLength=10;input.dataset.asin='';input.placeholder='例如 B09V366BDY';input.setAttribute('aria-label','商品 ASIN '+(count+1));input.autocomplete='off';row.append(input);const remove=document.createElement('button');remove.type='button';remove.className='button quiet';remove.textContent='移除';remove.onclick=()=>{if(document.querySelectorAll('[data-asin]').length>1)row.remove();$('#add-asin').disabled=false;};row.append(remove);$('#asin-rows').append(row);$('#add-asin').disabled=count+1>=2;}
async function refresh(){if(refreshing)return;refreshing=true;try{const {data,error}=await client.from('voc_tasks').select('id,asins,country,review_scope,review_limit,status,annotation_progress,failure_reason,report_file_path,created_at,run_kind').eq('user_id',user.id).order('created_at',{ascending:false}).limit(100);if(error)throw error;const {data:jobs,error:jobError}=await client.from('voc_jobs').select('task_id,state,stage,reason,mode,quote,quote_hash').eq('user_id',user.id).order('created_at',{ascending:false}).limit(100);if(jobError)throw jobError;const byId=new Map(jobs.map(j=>[j.task_id,j]));$('#tasks').replaceChildren();$('#empty').hidden=data.length>0;
 for(const t of data){const job=byId.get(t.id);const tr=document.createElement('tr');cell(tr,new Date(t.created_at).toLocaleString('zh-CN'));cell(tr,t.asins.split('+').join('\n'));cell(tr,`${t.country} · ${t.review_scope==='family'?'含变体':'仅本ASIN'} · ${t.review_limit}条/ASIN`);cell(tr,job?.state==='needs_review'?'待核验':(job?.state==='awaiting_consent'?'待开始':job?.stage)||t.status);cell(tr,t.run_kind==='skeleton'?'骨架测试 · 无标注':`${t.annotation_progress} 条`);cell(tr,job?.reason||t.failure_reason);const c=cell(tr,'—');if(t.status==='完成'&&t.report_file_path){const a=document.createElement('a');a.href=`report/?task=${encodeURIComponent(t.id)}`;a.textContent='打开报告';c.replaceChildren(a);}else if(job?.state==='awaiting_consent'){const b=document.createElement('button');b.className='button quiet';b.textContent='确认并开始';b.dataset.startPending='';b.onclick=()=>workflow.startPending(job);c.replaceChildren(b);}else if(t.status==='完成')c.textContent='骨架完成 · 无报告';$('#tasks').append(tr);}}
 catch(e){message(safeError(e),true);}finally{refreshing=false;}}
async function report(){const id=new URL(location.href).searchParams.get('task');if(!/^[a-f0-9-]{36}$/.test(id||''))throw Error('INVALID_TASK');const {data:t,error}=await client.from('voc_tasks').select('report_file_path,status,run_kind').eq('id',id).eq('user_id',user.id).maybeSingle();if(error)throw error;if(!t){message('任务不存在，或当前账号无权查看。',true);return;}if(!t.report_file_path){message(t.run_kind==='skeleton'?'这是骨架测试任务，未生成分析报告。':'报告尚未生成，请稍后返回任务列表查看。');return;}
 if(!/^voc\/[a-f0-9-]{36}-[a-f0-9]{32}\.html$/.test(t.report_file_path))throw Error('REPORT_PATH');const r=await fetch(`https://${config.reportHost}/${t.report_file_path}`,{credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('REPORT_FETCH');const html=await r.text();const {mountReport}=await import('./report-frame.mjs?v=stage10-tags-en');await mountReport($('#report'),html);message('');}
