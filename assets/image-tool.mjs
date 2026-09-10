const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
const names={probe:'单图连通小样',own:'自己全组',competitor_1:'自己与竞品1',competitor_2:'自己与竞品2',competitor_3:'自己与竞品3'};
export function mountImageTool({api,page,humanError,refresh}){
 const card=node('section','cost-card');card.id='image-cost-card';card.hidden=true;document.getElementById('task-form').parentElement.append(card);
 let active=null,busy=false,failures=0,signature='';
 async function open(task,scroll=false){
  if(busy)return;if(active?.id!==task.id){failures=0;signature='';}active=task;
  const r=await api.imageRun(task.id);if(active?.id!==task.id||!r)return;
  const sig=JSON.stringify(r);if(sig===signature&&!card.hidden)return;signature=sig;card.hidden=false;
  card.replaceChildren(node('h3','',task.asin+' · 图片诊断 · '+names[r.stage]));
  card.append(node('p','help','使用已确认的6条购买标准和现有图片缓存；缺少差评与品类特征不阻塞。原竞对任务状态与账本保留。每步确认只运行本步，不会连续扣费。'));
  if(r.report_url){const link=node('a','button quiet','查看本步图片诊断报告 →'),url=new URL(page('report/'));url.searchParams.set('task',task.id);url.searchParams.set('view','images');link.href=url.href;link.target='_blank';link.rel='noopener';card.append(link);}
  async function act(fn){if(busy||failures>=2)return;busy=true;card.querySelectorAll('button').forEach(n=>n.disabled=true);try{await fn();failures=0;signature='';}catch(e){failures++;card.append(node('p','message error',humanError(e)+(failures>=2?' 已停止重复操作，请核验状态。':'')));}finally{busy=false;}if(!failures){await refresh();await open(task);}}
  function consent(text,buttonText,fn){const label=node('label','consent'),check=node('input');check.type='checkbox';label.append(check,node('span','',text));const button=node('button','button primary',buttonText);button.type='button';button.disabled=true;check.addEventListener('change',()=>button.disabled=!check.checked||busy||failures>=2);button.addEventListener('click',()=>{if(check.checked)act(fn);});card.append(label,button);}
  if(r.state==='quoted'&&r.quote){const q=r.quote;
   if(q.retry_attempt===1)card.append(node('p','message','第1次请求返回 HTTP 400，未生成本步结果；以下是独立的第1次排错重试报价。首次账本保留、实扣待核对。本次仍只运行1次，失败后停止。'));
   card.append(node('p','',`本步1次 DeepSeek 请求，${q.image_count} 次图片输入，最多预留 ¥${Number(q.deepseek_limit_yuan).toFixed(6)}。`),node('p','help','Sorftime与西柚新增调用0。按高峰输入3元/百万、输出9元/百万tokens保守预留，实际依用量计费。失败保留原始结果，不自动重试。'),node('p','help','报告以随机公开链接发布，OSS本次预计低于¥0.01，持续存储和访问另计；没有新上传原件可清理，旧文件保留。'),node('p','help','额度有效至 '+new Date(q.expires_at).toLocaleString('zh-CN')));
   if(q.confirmed_at)card.append(node('p','message','本账号已确认，等待后台执行本步。'));
   else consent('我确认本步图片范围与额度，并同意通过随机公开链接提供报告。','确认本步额度并开始',()=>{if(Date.parse(q.expires_at)<=Date.now())throw new Error('额度已过期，请刷新');return api.confirmImageQuote(task.id,q.quote_version,q.stage);});
  }else if(r.state==='awaiting_review'){
   const s=r.result_summary;card.append(node('p','',s?.groups?.map(g=>g.asin+'：读清 '+g.readable+'/'+g.total+' 张').join('；')||'本步结果已生成'));
   if(r.stage==='probe'&&!r.probe_ok)card.append(node('p','message error','单图未读清，后续请求已停止。请核验报告中的原因。'));
   else consent('我已打开并核对本步图片、标签和结论，确认继续。',r.stage==='competitor_3'?'完成本次审核':'已核验，查看下一步额度',()=>api.reviewImages(task.id,r.stage,r.result_sha256));
  }else card.append(node('p','message',r.state==='failed'?'本步暂停：'+r.failure_code+'。原始结果和账本已保留，无自动重试。':r.state==='complete'?'五步结果已核验完成。':r.state==='running'?'正在分析本步图片，完成后等待审核。':'正在核验缓存并准备本步额度。'));
  const close=node('button','button quiet','收起');close.type='button';close.addEventListener('click',()=>{card.hidden=true;active=null;signature='';});card.append(close);if(scroll)card.scrollIntoView({behavior:'smooth',block:'start'});
 }
 return {open,refresh:async()=>{if(active&&!busy&&!card.hidden)await open(active);}};
}
