// Preserve the source report's values and order while grouping 12 data fields into 7 display columns.
import {adFacts,parseMetric,assessOpportunity} from './opportunity.mjs';
import {adRates} from './ad-rates.mjs?v=20260909-rates';
import {acosDisplay,sourceDateRange} from './report-display.mjs?v=20260909-display';
import {moduleSource,mountModules} from './report-modules.mjs?v=20260909-negatives';
const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
function lines(cell){const clone=cell.cloneNode(true);clone.querySelectorAll('br').forEach(br=>br.replaceWith('\n'));return clone.textContent.split('\n').map(s=>s.trim()).filter(Boolean);}
const number=value=>/^\d+(\.\d+)?$/.test(value||'')?Number(value).toLocaleString('en-US',{maximumFractionDigits:8}):value||'待核验';
export function formatClickShare(value){
 const raw=typeof value==='string'?value.trim():'';
 if(!/^\d+(\.\d+)?$/.test(raw)||!Number.isFinite(Number(raw))||Number(raw)>1)return '份额待核验';
 return (Number(raw)*100).toLocaleString('en-US',{useGrouping:false,maximumFractionDigits:8})+'%';
}
function details(title,values,cls='report-details'){const d=el('details',cls);d.append(el('summary','',title));values.forEach(value=>d.append(el('div','',value)));return d;}
function badge(value){return el('span','badge '+({'优先守位':'green','先看广告效率':'blue','待核验':'amber'}[value]||''),value);}
function trend(values){
 const wrap=el('div','search-trend'),numbers=values.map(s=>{const m=s.match(/：([\d,.]+)$/);return m?Number(m[1].replaceAll(',','')):null;});
 if(numbers.length>1&&numbers.every(n=>Number.isFinite(n)&&n>=0)){
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 150 40');svg.classList.add('trend-chart');svg.setAttribute('role','img');svg.setAttribute('aria-label','近13周搜索量趋势，具体数值可展开查看');
  const poly=document.createElementNS(ns,'polyline'),max=Math.max(...numbers),min=Math.min(...numbers);
  poly.setAttribute('points',numbers.map((n,i)=>`${3+i*144/(numbers.length-1)},${36-(n-min)*30/(max-min||1)}`).join(' '));poly.setAttribute('fill','none');poly.setAttribute('stroke','#426de1');poly.setAttribute('stroke-width','2');svg.append(poly);wrap.append(svg);
 }
 wrap.append(details('展开逐周数据',values,'trend-details'));return wrap;
}
function thumbnail(source){
 const wrap=el('span','thumbnail');
 const missing=()=>{wrap.replaceChildren(el('span','image-missing','主图待核验'));};
 if(!source){missing();return wrap;}
 let url;try{url=new URL(source.getAttribute('src'));if(url.protocol!=='https:')throw new Error();}catch{missing();return wrap;}
 const pending=el('span','thumbnail-loading','加载中'),img=el('img');img.width=44;img.height=44;img.alt='竞品商品主图';img.loading='lazy';img.referrerPolicy='no-referrer';
 img.addEventListener('load',()=>{pending.remove();img.classList.add('loaded');},{once:true});img.addEventListener('error',missing,{once:true});wrap.append(pending,img);img.src=url.href;return wrap;
}
export function renderReport(html,host,meta,note,ownAsin=''){
 const fragment=window.DOMPurify.sanitize(html,{RETURN_DOM_FRAGMENT:true,ALLOWED_TAGS:['h1','h2','h3','textarea','details','summary','p','div','table','thead','tbody','tr','th','td','br','hr','img'],ALLOWED_ATTR:['src','alt','width','height','scope','data-report-format','data-module-panel','data-module-state','data-negative-copy','readonly','aria-label'],ALLOW_DATA_ATTR:false,FORBID_TAGS:['style','script','iframe','form','input','svg','math']});
 const master=moduleSource(fragment),sourceRoot=master??fragment;
 const source=sourceRoot.querySelector('table');
 if(!source||source.querySelectorAll('thead th').length!==12||!source.tBodies.length||[...source.tBodies[0].rows].some(r=>r.cells.length!==12))throw new Error('报告结构无法识别，请联系管理员核验。');
 const paragraphs=[...sourceRoot.querySelectorAll('p')];
 const versionedReport=paragraphs[0]?.textContent.startsWith('规则版本：targets-v1；');
 for(const paragraph of paragraphs.slice(2)){
  paragraph.textContent=paragraph.textContent.replace('点击份额暂展示接口原值，单位核验前不作百分比转换。','点击份额按接口原值换算为百分比；精度以原值为准，可能与后台更细精度的显示略有差异。');
 }
 const metadata=paragraphs.slice(0,2),period=metadata[1];
 if(period){
  const range=sourceDateRange(period.textContent);
  if(range.valid){
   period.textContent=range.summary;
   metadata.push(details('查看源日期明细',['原开始日期：'+range.starts,'原结束日期：'+range.ends,'原周期说明：'+range.raw,'范围仅为源日期的最早至最晚边界，不代表每天均有完整数据。'],'report-details source-dates'));
   if(range.note)metadata.push(el('p','secondary',range.note));
  }else metadata.push(el('p','secondary','日期范围待核验；保留原周期文本。'));
 }
 meta.replaceChildren(...metadata);note.replaceChildren(...paragraphs.slice(2));
 const table=el('table','report-table opportunity-table');const group=el('colgroup');
 for(const width of [190,180,230,200,170,245,345]){const col=el('col');col.style.width=width+'px';group.append(col);}table.append(group);
 const head=el('thead'),header=el('tr');for(const text of ['关键词／标签','自己的广告实绩','自己 vs 竞对自然位','搜索热度与趋势','竞争与竞价','点击前三／份额','打法判断＋建议'])header.append(el('th','',text));head.append(header);table.append(head);const body=el('tbody');table.append(body);
 for(const row of source.tBodies[0].rows){
  const c=[...row.cells],data=c.map(lines),category=c[0].textContent.trim(),keyword=c[1].textContent.trim(),tr=el('tr');tr.dataset.keyword=keyword;
  const word=el('th','keyword-cell');word.scope='row';word.append(el('div','keyword-name',keyword),badge(category));
  const compParts=c[7].innerHTML.split(/<hr\s*\/?\s*>/i).map(part=>{const div=el('div');div.innerHTML=part;return div;});
  const topOwn=ownAsin&&compParts.some(part=>lines(part)[0]===ownAsin);
  const fields=Object.fromEntries(data[10].filter(line=>line.includes('：')).map(line=>{const index=line.indexOf('：');return [line.slice(0,index),line.slice(index+1)];}));
  const assessment=assessOpportunity({...adFacts(fields,!c[10].textContent.includes('无投放')),rank:parseMetric(data[8][0]),ownTop3:!!topOwn});
  tr.dataset.candidate=String(assessment.candidate);
  const targetBadge=el('span','badge '+assessment.tone,assessment.label);word.children[1].replaceWith(targetBadge);
  if(category==='待核验'&&!assessment.label.includes('核验'))word.append(badge('待核验'));
  if(assessment.candidate)tr.classList.add('push-candidate');
  if(topOwn)word.append(el('span','fact-tag','✓ 自己在点击前三'));
  const ads=el('td','ads-cell');
  if(c[10].textContent.includes('无投放'))ads.append(el('strong','metric-empty','无投放'),el('div','secondary','仅本报表周期'));
  else{
   const primary=el('div','ad-primary');primary.append(el('strong','metric-value',number(fields['订单'])),el('span','','单'));ads.append(primary);
   const displayedAcos=acosDisplay(fields);
   const acos=el('div','acos-line');acos.append(el('span','','ACOS '),el('strong','',displayedAcos.display));ads.append(acos);
   if(displayedAcos.reason)ads.append(el('div','secondary acos-reason',displayedAcos.reason));
   ads.append(el('div','secondary','花费 '+number(fields['花费'])+' USD'));
   const rates=adRates(fields);
   for(const rate of rates)ads.append(el('div','secondary ad-rate '+rate.label.toLowerCase(),`${rate.label} ${rate.display}`));
   ads.append(details('广告明细',[...data[10].map(value=>value.startsWith('ACOS：')?'源报告'+value:value),...(displayedAcos.detail?[displayedAcos.detail]:[]),...rates.map(rate=>rate.detail),'CVR订单采用源报表7天归因订单，不代表最近7个自然日销售。','广告指标为整份报表按搜索词汇总，不能据此认定只属于页头子ASIN。']));
  }
  if(assessment.acosWithin!==null)ads.append(el('span','fact-tag '+(assessment.acosWithin?'target-pass':'target-over'),assessment.acosWithin?'ACOS ≤50% · 达标':'ACOS >50% · 超目标'));
  const ranks=el('td','rank-cell'),comparison=el('div','rank-comparison');
  const self=el('div');self.append(el('span','secondary','自己'),el('strong','rank-own',/^\d+$/.test(data[8][0])?'#'+data[8][0]:data[8][0]));
  const rival=el('div');rival.append(el('span','secondary','最强竞对'),el('strong','rank-rival',/^\d+$/.test(data[9][1])?'#'+data[9][1]:data[9][1]||'待核验'));
  comparison.append(self,el('span','rank-vs','vs'),rival);ranks.append(comparison,el('div','secondary rival-asin',data[9][0]));
  if(data[8][0]==='1')ranks.append(el('span','fact-tag','自己自然位已第1'));
  if(assessment.rankReached)ranks.append(el('span','fact-tag','自然位前30名 · 已达标'));
  ranks.append(details('排名采集时间',['自己：'+(data[8][1]||'待核验'),'竞对：'+(data[9][2]||'待核验')]));
  const heat=el('td','heat-cell');heat.append(el('div','metric-label','周搜索量'),el('strong','search-value',number(data[3][0])),el('div','secondary',data[3].slice(1).join(' ')),el('div','secondary','流量 '+number(data[2][0])),trend(data[6]));
  const competition=el('td','competition-cell');competition.append(el('div','metric-label','竞争难度'),el('strong','difficulty-value',number(data[4][0])));
  const bid=el('div','bid-values');data[5].forEach(value=>bid.append(el('div','',value)));competition.append(bid,el('div','secondary','币种 USD'));
  const top=el('td','top-cell'),grid=el('div','competitors');
  for(const part of compParts){
   const bits=lines(part),item=el('div','competitor'),isOwn=ownAsin&&bits[0]===ownAsin;
   const raw=bits.find(t=>t.startsWith('点击份额原值'))?.replace('点击份额原值','').trim();
   item.append(thumbnail(part.querySelector('img')),el('div','competitor-asin',bits[0]||'待核验'));
   if(isOwn)item.append(el('span','own-label','自己'));
   item.append(el('div','share-value',formatClickShare(raw)),el('div','secondary share-raw','原值 '+(raw||'待核验')));grid.append(item);
  }
  top.append(grid,el('div','secondary share-note','点击份额 · 精度以接口原值为准'));
  const advice=el('td','advice-cell');const title=el('div','advice-title');title.append(el('span','badge '+assessment.tone,assessment.label),el('span','secondary','按当前目标判断'));advice.append(title,el('p','advice-copy',assessment.action));
  advice.append(details(versionedReport?'生成时判断与补充（targets-v1）':'生成时建议（历史规则）',[(versionedReport?'分组依据：':'原分类：')+category,c[11].textContent]));
  tr.append(word,ads,ranks,heat,competition,top,advice);body.append(tr);
 }
 const count=[...body.rows].filter(row=>row.dataset.candidate==='true').length;
 const overview=el('div','target-overview'),summary=el('div');summary.append(el('strong','','目标：ACOS ≤50% · 自然位前30名'),el('p','secondary',`推位候选 ${count} 个 / 共 ${body.rows.length} 词。依据本报告周期；候选不代表可盈利或必然提升排名。`));
 const label=el('label','target-filter'),checkbox=el('input');checkbox.type='checkbox';label.append(checkbox,document.createTextNode(`仅看推位候选（${count}）`));overview.append(summary,label);meta.append(overview);
 const empty=el('p','target-empty','当前报告没有符合目标的推位候选。');empty.hidden=true;empty.setAttribute('role','status');
 checkbox.addEventListener('change',()=>{for(const row of body.rows)row.hidden=checkbox.checked&&row.dataset.candidate!=='true';empty.hidden=!(checkbox.checked&&count===0);const title=host.closest('section')?.querySelector('#word-count');if(title)title.textContent=checkbox.checked?`${count} 个推位候选 / 共 ${body.rows.length} 词`:`${body.rows.length} 个关键词`;});
 host.replaceChildren(table,empty);
 if(master)mountModules(meta,host.closest('#report-panel'),fragment.querySelector('[data-module-panel="02"][data-module-state="ready"]'),thumbnail,fragment.querySelector('[data-module-panel="03"][data-module-state="ready"]'));
 return body.rows.length;
}
