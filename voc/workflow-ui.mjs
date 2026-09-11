const $=s=>document.querySelector(s);
const errors={ACTIVE_JOB_EXISTS:'已有任务正在执行，请等待完成后再开始。',QUOTE_EXPIRED:'该待开始任务已过期，请在上方重新提交参数。',UNSUPPORTED_SCOPE:'目前支持美国站、含变体、1—2个ASIN，各100或200条。',ACCOUNT_NOT_ENABLED:'此账号尚未开通真实分析。',DUPLICATE_ASIN:'ASIN不能重复。'};
export function workflowUI(client,{refresh,safeError}){
 let busy=false;
 function status(text){$('#submit-state').textContent=text;}
 function error(e){return Object.entries(errors).find(([code])=>(e?.message||'').includes(code))?.[1]||safeError(e);}
 function lock(value){busy=value;$('#submit').disabled=value;$('#replay').disabled=value;document.querySelectorAll('[data-start-pending]').forEach(b=>b.disabled=value);}
 async function rpc(name,args){const {data,error:e}=await client.rpc(name,args);if(e)throw e;return data;}
 async function startPending(job){if(busy)return;lock(true);status('正在开始任务…');try{await rpc('voc_confirm_job',{p_task_id:job.task_id,p_quote_hash:job.quote_hash,p_allow_public:true});status('任务已开始，将依次完成抓取、标注、归集、旅程和报告。');await refresh();}catch(e){status(error(e));}finally{lock(false);}}
 $('#form').onsubmit=async e=>{e.preventDefault();if(busy)return;const asins=[...document.querySelectorAll('[data-asin]')].map(n=>n.value.trim().toUpperCase());if(asins.some(x=>!/^[A-Z0-9]{10}$/.test(x))||new Set(asins).size!==asins.length){status('请输入不重复的10位ASIN。');return;}lock(true);status('正在开始任务…');try{await rpc('voc_submit_job',{p_asins:asins.join('+'),p_country:$('#country').value,p_limit:Number($('[name=limit]:checked').value),p_scope:'family',p_allow_public:true});status('任务已开始，将依次完成抓取、标注、归集、旅程和报告。');await refresh();}catch(e){status(error(e));}finally{lock(false);}};
 $('#replay').onclick=async()=>{if(busy)return;lock(true);status('正在提交历史样本回放…');try{await rpc('voc_create_job',{p_asins:null,p_country:null,p_limit:null,p_scope:null,p_mode:'replay'});status('回放已排队：复用已验收38条样本，不调用Sorftime或豆包。');await refresh();}catch(e){status(error(e));}finally{lock(false);}};
 return {startPending};
}
