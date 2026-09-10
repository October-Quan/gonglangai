const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
const names={probe:'单图连通小样',own:'自己全组',competitor_1:'自己与竞品1',competitor_2:'自己与竞品2',competitor_3:'自己与竞品3'};
const isArk=r=>r.quote?.provider==='volcengine_ark'||r.result_summary?.provider==='volcengine_ark';
const needsReview=r=>r.result_summary?.review_required===true||(isArk(r)&&(r.result_summary?.review_required!==false||r.result_summary?.reviewed!==true||r.result_summary?.stage!==r.stage));
export function mountImageTool({api,page,humanError,refresh}){
 const card=node('section','cost-card');card.id='image-cost-card';card.hidden=true;document.getElementById('task-form').parentElement.append(card);
 let active=null,busy=false,failures=0,signature='';
 async function open(task,scroll=false){
  if(busy)return;if(active?.id!==task.id){failures=0;signature='';}active=task;
  const [r,pilot]=await Promise.all([api.imageRun(task.id),api.imagePilot?.(task.id)]);if(active?.id!==task.id||!r)return;
  const sig=JSON.stringify([r,pilot]);if(sig===signature&&!card.hidden)return;signature=sig;card.hidden=false;
  card.replaceChildren(node('h3','',task.asin+' · 图片诊断 · '+names[r.stage]));
  card.append(node('p','help','使用已确认的6条购买标准和现有图片缓存；缺少差评与品类特征不阻塞。原竞对任务状态与账本保留。每步确认只运行本步，不会连续扣费。'));
  if(r.report_url){const link=node('a','button quiet',r.state==='complete'||(r.state==='awaiting_review'&&!needsReview(r))?'查看本步图片诊断报告 →':'查看此前已发布报告 →'),url=new URL(page('report/'));url.searchParams.set('task',task.id);url.searchParams.set('view','images');link.href=url.href;link.target='_blank';link.rel='noopener';card.append(link);}
  async function act(fn){if(busy||failures>=2)return;busy=true;card.querySelectorAll('button').forEach(n=>n.disabled=true);try{await fn();failures=0;signature='';}catch(e){failures++;card.append(node('p','message error',humanError(e)+(failures>=2?' 已停止重复操作，请核验状态。':'')));}finally{busy=false;}if(!failures){await refresh();await open(task);}}
  function consent(text,buttonText,fn){const label=node('label','consent'),check=node('input');check.type='checkbox';label.append(check,node('span','',text));const button=node('button','button primary',buttonText);button.type='button';button.disabled=true;check.addEventListener('change',()=>button.disabled=!check.checked||busy||failures>=2);button.addEventListener('click',()=>{if(check.checked)act(fn);});card.append(label,button);}
  if(pilot){
   card.append(node('h3','','独立两图小样'),node('p','help','仅分析自己 B09V366BDY 与 Govee B0991Q94KP 各第1张主图。直接传原图，使用修正后的输出格式；结果单独复核，不计入正式报告进度。'));
   if(pilot.state==='quoted'){
    const q=pilot.quote;card.append(node('p','',`DeepSeek 1次调用、2张图，预算上限 ¥${Number(q.deepseek_limit_yuan).toFixed(2)}。失败不自动重试。`),node('p','help','不新增 Sorftime / 西柚调用，不发布公开报告；结果仅本账号可见。额度有效至 '+new Date(q.expires_at).toLocaleString('zh-CN')));
    if(q.confirmed_at)card.append(node('p','message','两图小样费用已确认，等待后台执行。'));
    else if(Date.parse(q.expires_at)<=Date.now())card.append(node('p','message error','两图小样额度已过期，尚未调用。'));
    else consent('我确认本次仅2张图、1次调用，费用不超过0.08元。','确认0.08元小样并开始',()=>{if(Date.parse(q.expires_at)<=Date.now())throw new Error('小样额度已过期');return api.confirmImagePilot(task.id,q.quote_version);});
   }else if(pilot.state==='awaiting_review'){
    card.append(node('p','message','两图小样已返回，结构校验通过；仍需逐图核验文字、数量与结论。正式报告进度未改变。'));
    for(const g of pilot.result_summary?.groups??[])for(const im of g.images??[])card.append(node('h4','',g.asin+' · '+im.label),node('p','',im.observation));
    const details=node('details'),summary=node('summary','','查看小样完整判断与引文'),pre=node('pre','');pre.style.whiteSpace='pre-wrap';pre.style.overflowWrap='anywhere';pre.textContent=JSON.stringify(pilot.result_summary,null,2);details.append(summary,pre);card.append(details);
   }else card.append(node('p','message',pilot.state==='failed'?'两图小样暂停：'+pilot.failure_code+'。原响应与账本保留，不自动重试。':'正在运行独立两图小样，完成后等待复核。'));
  }
  if(r.state==='quoted'&&r.quote){const q=r.quote;
   if(q.retry_attempt===1)card.append(node('p','message','第1次请求返回 HTTP 400，未生成本步结果；以下是独立的第1次排错重试报价。首次账本保留、实扣待核对。本次仍只运行1次，失败后停止。'));
   if(q.provider==='volcengine_ark'){
    card.append(node('p','',`本步1次豆包请求，${q.image_count}张图片输入；模型 ${q.model}。`),node('p','help',`模型现金支出上限 ¥0，仅使用免费额度；本步保守预留 ${Number(q.free_token_allowance).toLocaleString('zh-CN')} tokens，输出上限 ${q.max_output_tokens} tokens（含思考），实际用量以返回及额度对账为准。`),node('p','help','执行前核验剩余额度和免费保护；不足则停止。失败不自动重试。结果先逐张原图复核，再发布正式报告。Sorftime与西柚新增调用0。'),node('p','help','正式报告沿用随机公开链接；OSS存储和访问费用另计，不包含在模型现金上限内。'),node('p','help','额度有效至 '+new Date(q.expires_at).toLocaleString('zh-CN')));
    if(q.confirmed_at)card.append(node('p','message','本账号已确认本步免费额度范围，等待执行前核验。'));
    else if(!Number.isFinite(Date.parse(q.expires_at))||Date.parse(q.expires_at)<=Date.now())card.append(node('p','message error','本步额度已过期，尚未调用，请刷新。'));
    else consent('我确认本步图片范围与免费额度使用，并同意复核后的报告通过随机公开链接提供。','确认本步免费额度并开始',()=>{if(Date.parse(q.expires_at)<=Date.now())throw new Error('额度已过期，请刷新');return api.confirmImageQuote(task.id,q.quote_version,q.stage);});
   }else if(q.provider&&q.provider!=='deepseek')card.append(node('p','message error','本步模型服务商不受支持，请核验配置。'));
   else {
   const inline=q.transport==='inline-original-jpeg-v1';
   if(inline)card.append(node('p','help','本次直接传送已校验的原图数据，图片内容与编号不变。旧视觉模型名称由服务商当前 Flash 模型承接。'));
   const price=inline?'Sorftime与西柚新增调用0。按当前高峰输入2元/百万、输出8元/百万tokens及每图最多1024tokens保守预留，不计缓存优惠；实际依用量计费。失败保留原始结果，不自动重试。':'Sorftime与西柚新增调用0。此报价按原记录输入3元/百万、输出9元/百万tokens预留；实际价格以服务商账单为准。失败保留原始结果，不自动重试。';
   card.append(node('p','',`本步1次 DeepSeek 请求，${q.image_count} 次图片输入，最多预留 ¥${Number(q.deepseek_limit_yuan).toFixed(6)}。`),node('p','help',price),node('p','help','报告以随机公开链接发布，OSS本次预计低于¥0.01，持续存储和访问另计；没有新上传原件可清理，旧文件保留。'),node('p','help','额度有效至 '+new Date(q.expires_at).toLocaleString('zh-CN')));
   if(q.confirmed_at)card.append(node('p','message','本账号已确认，等待后台执行本步。'));
   else consent('我确认本步图片范围与额度，并同意通过随机公开链接提供报告。','确认本步额度并开始',()=>{if(Date.parse(q.expires_at)<=Date.now())throw new Error('额度已过期，请刷新');return api.confirmImageQuote(task.id,q.quote_version,q.stage);});
   }
  }else if(r.state==='awaiting_review'){
   const s=r.result_summary;card.append(node('p','',s?.groups?.map(g=>g.asin+'：读清 '+g.readable+'/'+g.total+' 张').join('；')||'本步结果已生成'));
   if(needsReview(r))card.append(node('p','message','本步已返回候选结果，正在逐张原图复核；复核完成并发布后才能确认继续。此前报告不代表本步已审核。'));
   else if(r.stage==='probe'&&!r.probe_ok)card.append(node('p','message error','单图未读清，后续请求已停止。请核验报告中的原因。'));
   else consent('我已打开并核对本步图片、标签和结论，确认继续。',r.stage==='competitor_3'?'完成本次审核':'已核验，查看下一步额度',()=>api.reviewImages(task.id,r.stage,r.result_sha256));
  }else card.append(node('p','message',r.state==='failed'?(pilot?'原完整图组对比已暂停：':'本步暂停：')+r.failure_code+'。原始结果和账本已保留，无自动重试。':r.state==='complete'?'五步结果已核验完成。':r.state==='running'?'正在分析本步图片，完成后等待审核。':'正在核验缓存并准备本步额度。'));
  const close=node('button','button quiet','收起');close.type='button';close.addEventListener('click',()=>{card.hidden=true;active=null;signature='';});card.append(close);if(scroll)card.scrollIntoView({behavior:'smooth',block:'start'});
 }
 return {open,refresh:async()=>{if(active&&!busy&&!card.hidden)await open(active);}};
}
