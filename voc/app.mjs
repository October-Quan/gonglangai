import {config} from '../assets/config.mjs';
const $=s=>document.querySelector(s);
const client=window.supabase.createClient(config.url,config.publicKey,{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true}});
function message(text,error=false){$('#message').textContent=text;$('#message').className='message '+(error?'error':'');}
function safeError(e){return /permission|row-level|42501/i.test(e?.message||'')?'当前账号无权操作此任务。':'操作未完成，请检查连接后刷新。';}
function cell(row,text){const c=document.createElement('td');c.textContent=text??'—';row.append(c);return c;}
let user,refreshTimer,busy=false,refreshing=false;
try{
 const result=await client.auth.getUser();if(result.error||!result.data.user){message('请先登录，再从工作台进入用户洞察。');const a=document.createElement('a');a.href='/';a.textContent='前往登录';$('#message').append(' ',a);}
 else{user=result.data.user;if(document.body.dataset.voc==='submit')await submission();else await report();}
}catch(e){message(safeError(e),true);}
async function submission(){
 $('#email').textContent=user.email;$('#workspace').hidden=false;message('');addAsin();
 $('#add-asin').onclick=()=>addAsin();$('#refresh').onclick=()=>refresh();
 $('#form').onsubmit=async e=>{e.preventDefault();if(busy)return;const asins=[...document.querySelectorAll('[data-asin]')].map(n=>n.value.trim().toUpperCase());
 if(asins.some(x=>! /^[A-Z0-9]{10}$/.test(x))||new Set(asins).size!==asins.length){$('#submit-state').textContent='请输入不重复的 10 位 ASIN。';return;}
 busy=true;$('#submit').disabled=true;$('#submit-state').textContent='正在提交…';
 try{const {error}=await client.from('voc_tasks').insert({id:crypto.randomUUID(),user_id:user.id,asins:asins.join('+'),country:$('#country').value,review_limit:Number($('[name=limit]:checked').value),review_scope:$('[name=scope]:checked').value,run_kind:'skeleton'});if(error)throw error;$('#submit-state').textContent='任务已提交，等待工人处理。';await refresh();}
 catch(e){$('#submit-state').textContent=safeError(e);}finally{busy=false;$('#submit').disabled=false;}};
 await refresh();refreshTimer=setInterval(()=>refresh(),5000);window.addEventListener('pagehide',()=>clearInterval(refreshTimer),{once:true});
}
function addAsin(){const count=document.querySelectorAll('[data-asin]').length;if(count>=10)return;const row=document.createElement('div');row.className='voc-row';const input=document.createElement('input');input.className='input';input.maxLength=10;input.dataset.asin='';input.placeholder='例如 B09V366BDY';input.setAttribute('aria-label','商品 ASIN '+(count+1));input.autocomplete='off';row.append(input);const remove=document.createElement('button');remove.type='button';remove.className='button quiet';remove.textContent='移除';remove.onclick=()=>{if(document.querySelectorAll('[data-asin]').length>1)row.remove();$('#add-asin').disabled=false;};row.append(remove);$('#asin-rows').append(row);$('#add-asin').disabled=count+1>=10;}
async function refresh(){if(refreshing)return;refreshing=true;try{const {data,error}=await client.from('voc_tasks').select('id,asins,country,review_scope,review_limit,status,annotation_progress,failure_reason,report_file_path,created_at,run_kind').eq('user_id',user.id).order('created_at',{ascending:false}).limit(100);if(error)throw error;$('#tasks').replaceChildren();$('#empty').hidden=data.length>0;
 for(const t of data){const tr=document.createElement('tr');cell(tr,new Date(t.created_at).toLocaleString('zh-CN'));cell(tr,t.asins.split('+').join('\n'));cell(tr,`${t.country} · ${t.review_scope==='family'?'含变体':'仅本ASIN'} · ${t.review_limit}条/ASIN`);cell(tr,t.status);cell(tr,t.run_kind==='skeleton'?'骨架测试 · 无标注':`${t.annotation_progress} 条`);cell(tr,t.failure_reason);const c=cell(tr,'—');if(t.status==='完成'&&t.report_file_path){const a=document.createElement('a');a.href=`report/?task=${encodeURIComponent(t.id)}`;a.textContent='打开报告';c.replaceChildren(a);}else if(t.status==='完成')c.textContent='骨架完成 · 无报告';$('#tasks').append(tr);}}
 catch(e){message(safeError(e),true);}finally{refreshing=false;}}
async function report(){const id=new URL(location.href).searchParams.get('task');if(!/^[a-f0-9-]{36}$/.test(id||''))throw Error('INVALID_TASK');const {data:t,error}=await client.from('voc_tasks').select('report_file_path,status,run_kind').eq('id',id).eq('user_id',user.id).maybeSingle();if(error)throw error;if(!t){message('任务不存在，或当前账号无权查看。',true);return;}if(!t.report_file_path){message(t.run_kind==='skeleton'?'这是骨架测试任务，未生成分析报告。':'报告尚未生成，请稍后返回任务列表查看。');return;}
 if(!/^voc\/[a-f0-9-]{36}-[a-f0-9]{32}\.html$/.test(t.report_file_path))throw Error('REPORT_PATH');const r=await fetch(`https://${config.reportHost}/${t.report_file_path}`,{credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('REPORT_FETCH');const html=await r.text();const {mountReport}=await import('./report-frame.mjs?v=stage7-groups');await mountReport($('#report'),html);message('');}
