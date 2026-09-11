const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
export const competitorStates={awaiting_quote:'历史任务待处理',quoted:'历史任务待处理',collecting:'正在获取竞对资料',awaiting_review:'历史任务待处理',review_submitted:'历史任务待处理',model_quoted:'历史任务待处理',comparing:'正在对比',complete:'已完成',failed:'失败'};
// Historical records stay readable; all new analyses use the single upload form.
export async function mountCompetitorTool({api}){
 if(!api.competitorAccess||!await api.competitorAccess())return null;
 const card=node('section','cost-card competitor-card');card.hidden=true;document.getElementById('task-form').parentElement.append(card);let active=null;
 async function open(task,scroll=false){
  active=task;const run=await api.competitorRun(task.id);if(active?.id!==task.id)return;
  card.hidden=false;card.replaceChildren(node('h3','',task.asin+' · 历史竞对任务'),node('p','',competitorStates[run?.state]||task.status));
  card.append(node('p','help',run?.state==='failed'?'原任务中断原因：'+(run.failure_code||'资料处理未完成'):'此记录保留原处理状态。'));
  card.append(node('p','help','新分析只需在上方上传一次报表，竞对、特征、图片与广告建议由模型自动完成，统一生成六个模块。'));
  const close=node('button','button quiet','收起');close.type='button';close.addEventListener('click',()=>{card.hidden=true;active=null;});card.append(close);if(scroll)card.scrollIntoView({behavior:'smooth',block:'start'});
 }
 return {open,refresh:async()=>{if(active&&!card.hidden)await open(active);}};
}
