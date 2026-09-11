const $=s=>document.querySelector(s);
const errors={ACTIVE_JOB_EXISTS:'已有任务正在执行，请等待完成后再开始。',QUOTE_EXPIRED:'报价已过期，请重新生成。',CONSENT_MISMATCH:'报价或公开范围不一致，请重新查看额度。',UNSUPPORTED_SCOPE:'目前支持美国站、含变体、1—2个ASIN，各100或200条。',ACCOUNT_NOT_ENABLED:'此账号尚未开通真实分析。',DUPLICATE_ASIN:'ASIN不能重复。'};
export function workflowUI(client,{refresh,safeError}){
 let busy=false,current=null;
 function status(text){$('#submit-state').textContent=text;}
 function error(e){return Object.entries(errors).find(([code])=>(e?.message||'').includes(code))?.[1]||safeError(e);}
 function lock(value){busy=value;$('#submit').disabled=value;$('#replay').disabled=value;$('#confirm-job').disabled=value||!$('#allow-public').checked;}
 async function rpc(name,args){const {data,error:e}=await client.rpc(name,args);if(e)throw e;return data;}
 function showQuote(job){current=job;const q=job.quote;$('#quote-card').hidden=false;$('#quote-summary').textContent=q.asins+' · 美国站 · 含变体 · 最多'+q.review_limit+'条/ASIN';$('#quote-cost').textContent='Sorftime 最多 '+q.max_requests+' Request；豆包最多 '+q.max_model_calls+' 次调用，按牌价上限 ¥'+Number(q.model_cap_yuan).toFixed(2)+'；本次报告存储与访问预计 ¥'+Number(q.oss_estimate_yuan).toFixed(2)+'。';$('#quote-id').textContent='任务 '+job.task_id+' · 有效至 '+new Date(q.expires_at).toLocaleString('zh-CN');$('#allow-public').checked=false;$('#confirm-job').disabled=true;$('#quote-state').textContent='仅生成报价，尚未扣取数或模型额度。实际账单以服务商为准；异常保留数据，不自动付费重试。';$('#quote-card').scrollIntoView({behavior:'smooth',block:'nearest'});}
 $('#allow-public').onchange=()=>{$('#confirm-job').disabled=busy||!$('#allow-public').checked;};
 $('#confirm-job').onclick=async()=>{if(busy||!current||!$('#allow-public').checked)return;lock(true);const submitted=current;try{await rpc('voc_confirm_job',{p_task_id:submitted.task_id,p_quote_hash:submitted.quote_hash,p_allow_public:true});$('#quote-card').hidden=true;current=null;status('已确认，任务将依次完成抓取、标注、归集、旅程和报告。');await refresh();}catch(e){$('#quote-state').textContent=error(e);}finally{lock(false);}};
 $('#form').onsubmit=async e=>{e.preventDefault();if(busy)return;const asins=[...document.querySelectorAll('[data-asin]')].map(n=>n.value.trim().toUpperCase());if(asins.some(x=>!/^[A-Z0-9]{10}$/.test(x))||new Set(asins).size!==asins.length){status('请输入不重复的10位ASIN。');return;}lock(true);status('正在生成任务报价…');try{const job=await rpc('voc_create_job',{p_asins:asins.join('+'),p_country:$('#country').value,p_limit:Number($('[name=limit]:checked').value),p_scope:'family',p_mode:'live'});showQuote(job);status('报价已生成，请在下方确认。');await refresh();}catch(e){status(error(e));}finally{lock(false);}};
 $('#replay').onclick=async()=>{if(busy)return;lock(true);status('正在提交历史样本回放…');try{await rpc('voc_create_job',{p_asins:null,p_country:null,p_limit:null,p_scope:null,p_mode:'replay'});status('回放已排队：复用已验收38条样本，不调用Sorftime或豆包；新报告沿用已授权的随机链接公开范围。');await refresh();}catch(e){status(error(e));}finally{lock(false);}};
 return {showQuote};
}
