const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
export const competitorStates={awaiting_quote:'核验缓存中',quoted:'取数排队中',collecting:'正在获取竞对资料',awaiting_review:'待审核特征',review_submitted:'正在核算模型额度',model_quoted:'模型分析排队中',comparing:'正在对比',complete:'已完成',failed:'失败'};
export async function mountCompetitorTool({api,user,refresh,humanError}){
 if(!api.competitorAccess||!await api.competitorAccess())return null;
 const original=document.getElementById('task-form'),sources=await api.competitorSources(user.id);
 const modeLabel=node('label','label','分析来源'),mode=node('select','input');mode.id='analysis-source';modeLabel.htmlFor=mode.id;
 for(const [v,t] of [['upload','上传新报表 · 关键词分析'],['cached','使用已有报告 · 竞对对比']]){const o=node('option','',t);o.value=v;mode.append(o);}
 original.before(modeLabel,mode);
 const form=node('form','competitor-form');form.id='competitor-form';form.hidden=true;form.noValidate=true;
 const sourceLabel=node('label','label','已有报告'),source=node('select','input');source.id='competitor-source';sourceLabel.htmlFor=source.id;
 const empty=node('option','',sources.length?'请选择本人已完成的报告':'暂无可复用报告，请先完成关键词分析');empty.value='';source.append(empty);
 for(const s of sources){const o=node('option','',s.asin+' · '+new Date(s.created_at).toLocaleString('zh-CN'));o.value=s.id;source.append(o);}
 const ownLabel=node('label','label','自己的 ASIN'),own=node('input','input');own.id='competitor-own';own.readOnly=true;ownLabel.htmlFor=own.id;
 const help=node('p','help','复用已保存的美国站最多20词数据。服务端核验账号、ASIN和缓存；无法复用时停止，不自动重新查询西柚。无需重复上传原件。');
 const list=node('div','competitor-inputs'),add=node('button','button quiet','＋ 添加竞对');add.type='button';
 function addAsin(value=''){
  const row=node('div','competitor-input-row'),label=node('label','label','竞对 ASIN'),input=node('input','input'),remove=node('button','button quiet','移除');input.id='competitor-'+crypto.randomUUID();label.htmlFor=input.id;input.value=value;input.maxLength=10;input.placeholder='B0…';input.autocomplete='off';input.spellcheck=false;remove.type='button';remove.setAttribute('aria-label','移除此竞对');remove.addEventListener('click',()=>{if(list.children.length<=3)return;row.remove();sync();});row.append(label,input,remove);list.append(row);sync();
 }
 function sync(){add.disabled=list.children.length>=5;[...list.children].forEach(r=>r.querySelector('button').disabled=list.children.length<=3);}
 add.addEventListener('click',()=>{if(list.children.length<5)addAsin();});
 for(let i=0;i<3;i++)addAsin();
 const keyLabel=node('label','label','核心关键词（选填）'),key=node('input','input');key.id='competitor-keyword';key.maxLength=120;key.placeholder='留空使用源报告流量第一词';keyLabel.htmlFor=key.id;
 const submit=node('button','button primary','提交并开始对比'),msg=node('p','message');submit.type='submit';msg.setAttribute('role','status');
 form.append(sourceLabel,source,help,ownLabel,own,node('h3','','竞对名单 · 3～5家'),list,add,keyLabel,key,node('p','help','提交后自动获取商品与品类资料；审核特征清单后自动生成对比报告，无需再次确认额度。报告沿用随机公开链接。'),submit,msg);original.before(form);
 let draft=null,submitFailures=0;
 const draftKey='gonglangai-competitor-draft-v1';
 try{const stored=JSON.parse(sessionStorage.getItem(draftKey));if(stored?.user_id===user.id){draft=stored;submitFailures=stored.failures||0;msg.textContent='检测到未确认登记的竞对任务，重试沿用同一任务号。';submit.textContent='重试登记竞对任务';}}catch{}
 function lock(yes){form.querySelectorAll('input,select,button').forEach(n=>n.disabled=yes);if(!yes)sync();submit.disabled=submitFailures>=2;}
 if(draft)lock(true);
 source.addEventListener('change',()=>{const s=sources.find(x=>x.id===source.value);own.value=s?.asin||'';key.value=s?.asin==='B09V366BDY'?'led strip lights':'';list.replaceChildren();for(const a of s?.asin==='B09V366BDY'?['B0991Q94KP','B0DN1K2RLD','B0BGXMWGYW']:['','',''])addAsin(a);});
 mode.addEventListener('change',()=>{original.hidden=mode.value==='cached';form.hidden=mode.value!=='cached';document.getElementById('cost-card').hidden=true;});
 const card=node('section','cost-card competitor-card');card.hidden=true;card.id='competitor-card';original.parentElement.append(card);
 let active=null,activeRun=null,busy=false,failures=0,reviewHash=null;
 function error(e){const p=node('p','message error',humanError(e)+(failures>=2?' 已停止重复操作，请联系管理员核验。':''));p.setAttribute('role','alert');card.append(p);}
 async function guarded(action){if(busy||failures>=2)return;busy=true;card.querySelectorAll('button').forEach(b=>b.disabled=true);try{await action();failures=0;reviewHash=null;await refresh();await open(active);}catch(e){failures++;error(e);}finally{busy=false;}}
 async function open(task,scroll=false){
  if(!task||busy&&!active)return;
  const changed=active?.id!==task.id;active=task;if(changed){failures=0;reviewHash=null;}
  const r=await api.competitorRun(task.id);if(active?.id!==task.id)return;activeRun=r;card.hidden=false;
  if(r?.state==='awaiting_review'&&reviewHash===r.proposal?.raw_sha256&&!changed)return;
  card.replaceChildren(node('h3','',task.asin+' · 竞对分析'),node('p','',competitorStates[r?.state]||'准备中'));
  if(!r){card.append(node('p','help','任务已登记，正在准备取数核验。'));return;}
  const q=r.state==='model_quoted'?r.model_quote:r.collection_quote;
  if(['quoted','model_quoted'].includes(r.state)&&q){
   const first=r.state==='quoted';
   card.append(node('p','',first?`Sorftime 最多 ${q.sorftime_limit} 次额度：${q.product_calls} 份商品详情 + 1 次品类特征（5次额度）。`:`DeepSeek 最多 ¥${Number(q.deepseek_limit_yuan).toFixed(6)}：1次模型判断，${q.dimension_count} 个已确认维度。`));
   card.append(node('p','help',first?`自己与竞对：${(q.asins||[]).join('、')}。核心词：${q.core_keyword||'待核验'}。西柚新增调用0；本段模型费用0，后续自动核算模型费用。源报告生成时间：${q.source_generated_at||'待核验'}。`:'本段不增加 Sorftime 或西柚调用。按高峰输入3元/百万tokens、输出9元/百万tokens预留；实际按调用量计费。'));
   card.append(node('p','help','OSS本次生成预计低于¥0.01，后续存储与访问按实际用量计费。没有新上传原件可清理，源报告与缓存保留。'),node('p','help','本次额度有效至 '+new Date(q.expires_at).toLocaleString('zh-CN')));
   card.append(node('p','message','后台自动处理，无需再次确认额度。'));
  }else if(r.state==='awaiting_review'&&r.proposal){
   reviewHash=r.proposal.raw_sha256;card.append(node('p','',r.proposal.sample_stats),node('p','help',`共 ${r.proposal.items.length} 个特征，按销量占比降序。以下全部条目均需审核；缺少产品事实不应作为剔除理由。确认后清单冻结并自动开始模型分析。`));
   if(r.proposal.own_listing){const own=r.proposal.own_listing,details=node('details','report-details');details.open=true;details.append(node('summary','','自己的Listing依据'),node('p','',own.title||'标题待核验'),node('p','',own.bullets?.join('；')||'五点字段缺失，待核验'),node('p','',own.attributes?Object.entries(own.attributes).map(([k,v])=>k+'：'+v).join('；'):'属性待核验'));card.append(details);}
   const edits=[];
   for(const [i,f] of r.proposal.items.entries()){
    const group=node('div','feature-review-row'),title=node('h3','',`${i+1}. ${f.name}`),select=node('select','input'),reason=node('textarea','input');select.setAttribute('aria-label',f.name+'处理方式');reason.setAttribute('aria-label',f.name+'理由');reason.maxLength=1000;reason.rows=2;reason.value=f.reason;
    for(const [v,t] of [['keep','保留'],['gap','保留为缺口'],['remove','剔除']]){const o=node('option','',t);o.value=v;select.append(o);}select.value=f.decision;
    group.append(title,node('p','help',`销量占比 ${f.monthly_sales_share}% · 商品占比 ${f.product_count_share}%`),node('p','help',f.description||'无额外说明'),select,reason);card.append(group);edits.push({id:f.id,select,reason});
   }
   const consent=node('label','consent'),check=node('input');check.type='checkbox';consent.append(check,node('span','','我已核对全部保留、缺口和剔除项，并确认各项理由。'));
   const button=node('button','button primary','确认清单并继续分析');button.type='button';button.disabled=true;check.addEventListener('change',()=>button.disabled=!check.checked||busy||failures>=2);
   button.addEventListener('click',()=>{if(check.checked)guarded(()=>api.reviewCompetitors(task.id,r.proposal,edits.map(e=>({id:e.id,decision:e.select.value,reason:e.reason.value.trim()}))));});card.append(consent,button);
  }else card.append(node('p','help',r.state==='failed'?'处理暂停：'+(r.failure_code||'请联系管理员核验'):r.state==='complete'?'报告已生成，请从任务列表查看。':'后台正在处理，可稍后刷新查看。'));
  const close=node('button','button quiet','收起');close.type='button';close.addEventListener('click',()=>{card.hidden=true;active=null;reviewHash=null;});card.append(close);if(scroll)card.scrollIntoView({behavior:'smooth',block:'start'});
 }
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(submit.disabled||submitFailures>=2)return;
  if(!draft){const asins=[...list.querySelectorAll('input')].map(x=>x.value.trim().toUpperCase());if(!source.value||asins.some(a=>!/^B0[A-Z0-9]{8}$/.test(a)||a===own.value)||new Set(asins).size!==asins.length){msg.textContent='请选择源报告，并填入3～5个不同于自己的有效竞对ASIN。';return;}draft={id:crypto.randomUUID(),user_id:user.id,source_task_id:source.value,competitor_asins:asins,core_keyword:key.value.trim(),failures:0};}
  lock(true);submit.disabled=true;sessionStorage.setItem(draftKey,JSON.stringify(draft));msg.textContent='正在提交竞对任务…';
  try{const task=await api.createCompetitorTask(draft);draft=null;submitFailures=0;sessionStorage.removeItem(draftKey);msg.textContent='已提交，缓存核验通过后自动开始。';await refresh();await open(task,true);}
  catch(e){submitFailures++;draft.failures=submitFailures;sessionStorage.setItem(draftKey,JSON.stringify(draft));msg.textContent=humanError(e)+(submitFailures>=2?' 已停止重复登记，请核验任务号 '+draft.id:'；重试将沿用同一任务号。');submit.textContent='重试登记竞对任务';}
  finally{if(!draft)lock(false);submit.disabled=submitFailures>=2;}
 });
 return {open,refresh:async()=>{if(active&&!card.hidden&&!busy)await open(active);}};
}
