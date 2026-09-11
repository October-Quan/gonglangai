import {readVisual,visualCell,benchmarkCell,ownVisualCards} from './report-visual.mjs?v=20260911-visual';
// Presentation only. All statements and figures come from the validated report DOM.
const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
const copy=e=>e.cloneNode(true);
const text=e=>e?.textContent.trim()||'';
const direct=(e,selector)=>[...e.children].filter(n=>n.matches(selector));
function lines(e){const c=copy(e);c.querySelectorAll('details').forEach(n=>n.remove());c.querySelectorAll('br').forEach(n=>n.replaceWith('\n'));return c.textContent.split('\n').map(x=>x.trim()).filter(Boolean);}
function fold(label,nodes){const d=make('details','ui-evidence');d.append(make('summary','',label),...nodes);return d;}
function scroll(table,label){const e=make('div','ui-table-scroll');e.tabIndex=0;e.setAttribute('role','region');e.setAttribute('aria-label',label+'，可左右滚动');e.append(table);return e;}
function table(headers,cls){const t=make('table','report-table '+cls),head=t.createTHead(),row=head.insertRow();headers.forEach(h=>row.append(make('th','',h)));t.createTBody();return t;}
function stateClass(s){return /待核验|未确认|证据不足/.test(s)?'pending':/画面直给/.test(s)?'direct':/文字|小字|图标/.test(s)?'text':/没答/.test(s)?'absent':'neutral';}
function status(s){return make('span','ui-status '+stateClass(s),s);}
function asin(e){return e?lines(e).join('\n').match(/\bB0[A-Z0-9]{8}\b/)?.[0]||null:null;}
function imageURL(img){try{const u=new URL(img?.getAttribute('src'));return u.protocol==='https:'&&u.hostname==='m.media-amazon.com'&&!u.username&&!u.password&&!u.port?u.href:null;}catch{return null;}}
export function photo(source,label,cls=''){
 const url=imageURL(source),box=make('div','ui-photo '+cls);
 if(!url){box.append(make('span','image-missing','图片待核验'));return box;}
 const img=make('img');img.src=url;img.alt=label;img.loading='lazy';img.referrerPolicy='no-referrer';box.append(img);
 const button=make('button','ui-photo-open','查看原图');button.type='button';button.setAttribute('aria-label','查看'+label+'原图');box.append(button);
 button.addEventListener('click',()=>{
  const dialog=make('dialog','ui-image-dialog'),heading=make('h2','',label),full=make('img'),close=make('button','button','关闭原图');
  full.src=url;full.alt=label;full.referrerPolicy='no-referrer';close.type='button';dialog.append(heading,full,close);document.body.append(dialog);
  close.addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{dialog.remove();button.focus();},{once:true});
  full.addEventListener('error',()=>full.replaceWith(make('p','','图片加载失败，原报告证据仍保留。')),{once:true});dialog.showModal();close.focus();
 });
 img.addEventListener('error',()=>{img.replaceWith(make('span','image-missing','图片加载失败 · 证据保留'));button.disabled=true;},{once:true});return box;
}
function chooser(label,options,onChange){const wrap=make('div','ui-switcher'),id='ui-select-'+(++chooser.counter),l=make('label','',label),s=make('select','input');l.htmlFor=id;s.id=id;for(const [value,title] of options){const o=make('option','',title);o.value=value;s.append(o);}s.addEventListener('change',()=>onChange(s.value));wrap.append(l,s);return wrap;}
chooser.counter=0;

export function enhanceOrganic(block,competitors=null){
 block.classList.add('ui-organic');
 const t=block.querySelector('table');if(!t)return;
 for(const r of t.tBodies[0].rows){
  r.cells[0].classList.add('ui-keyword');
  for(const i of [1,4,5]){const node=r.cells[i].firstChild;if(node?.nodeType===3){const strong=make('strong',i===1?'ui-own-rank':'ui-rank',node.textContent);node.replaceWith(strong);}}
 }
 const ownPhoto=competitors?.querySelector('tbody tr img');
 if(ownPhoto)block.querySelectorAll('[data-organic-product=own]').forEach(p=>p.prepend(photo(ownPhoto,'自己商品主图')));
 block.querySelectorAll('[data-organic-candidates]').forEach(d=>{d.classList.add('ui-candidates');d.querySelectorAll('[data-organic-product]').forEach(p=>{p.classList.add('ui-rank-product');const img=p.querySelector('img');if(img&&!img.closest('.ui-photo'))img.replaceWith(photo(img,text(p.querySelector('p'))||img.alt));});});
 for(const d of block.querySelectorAll('[data-organic-candidates]')){
  const keyword=d.parentElement.firstChild.textContent.trim(),button=make('button','ui-candidate-button','查看候选对比');button.type='button';button.setAttribute('aria-haspopup','dialog');d.hidden=true;d.before(button);
  button.addEventListener('click',()=>{
   const dialog=make('dialog','ui-rank-dialog'),head=make('div','ui-dialog-head'),close=make('button','button','关闭对比'),grid=make('div','ui-rank-grid');close.type='button';head.append(make('h2','',keyword),close);
   for(const product of d.querySelectorAll('[data-organic-product]')){const card=make('article','ui-rank-product '+(product.getAttribute('data-organic-product')==='own'?'own':''));card.append(photo(product.querySelector('img'),text(product.querySelector('p'))),...direct(product,'p').map(copy));grid.append(card);}
   dialog.append(head,make('p','ui-note','自己与本词已抓取的点击前三候选；自然位及观测时间沿用原记录。'),grid);document.body.append(dialog);close.addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{dialog.remove();button.focus();},{once:true});dialog.showModal();close.focus();
  });
 }
}

export function enhanceCompetitors(block){
 const original=[...block.childNodes],tables=[...block.querySelectorAll('table')],base=tables[0],features=tables[1];
 if(!base?.tBodies[0]||base.rows[0].cells.length!==10)return;
 const rows=[...base.tBodies[0].rows],ids=rows.map(r=>asin(r.cells[0]));
 if(ids.some(x=>!x)||new Set(ids).size!==ids.length)return;
 const featureHeaders=features?[...features.rows[0].cells].slice(1,-1):[];
 if(features&&(featureHeaders.length!==ids.length||featureHeaders.some((e,i)=>asin(e)!==ids[i])))return;
 const labels=ids.map((id,i)=>{const raw=featureHeaders[i]?lines(featureHeaders[i]).join(' ').replaceAll(id,'').replace(/自己|[·\s]/g,''):'';return raw||(i===0?'自己商品':'竞品 '+i);});
 const heading=copy(block.querySelector('h2')),summary=make('p','ui-subtitle',`自己与 ${rows.length-1} 家竞对 · 纵向指标与服装需求对照`),view=make('div','ui-competitor-view');
 const controls=chooser('查看竞对',ids.slice(1).map((id,i)=>[id,labels[i+1]+' · '+id]).concat([['all','全部商品总览']]),render);
 const archive=fold('完整数据、来源与口径',original.filter(n=>n!==block.querySelector('h2')));
 block.replaceChildren(heading,summary,controls,make('p','ui-note','关注款式、版型、面料、透视程度、穿着场景与尺码/颜色变体。月销为供应商估算；父体/子体口径未确认时，不直接比较单一颜色的销量或评分。'),view,archive);block.classList.add('ui-competitors');
 function product(index){
  const row=rows[index],card=make('article','ui-product-card '+(index===0?'own':'rival'));
  card.append(make('span','ui-role',index===0?'自己':'当前竞对'),photo(row.cells[0].querySelector('img'),labels[index]+' '+ids[index]),make('h3','',labels[index]),make('p','ui-asin',ids[index]));
  const title=row.cells[0].querySelector('details p');if(title)card.append(make('p','ui-product-title',text(title)));
  const metrics=make('div','ui-product-metrics');for(const i of [1,2,3]){const e=make('div');e.append(make('span','',text(base.rows[0].cells[i])),make('strong','',lines(row.cells[i]).join(' ')||'待核验'));metrics.append(e);}card.append(metrics);return card;
 }
 function metricDifference(index,own,rival){
  const a=lines(own).join(' '),b=lines(rival).join(' ');
  if(/未提供|待核验|未知|^—$/.test(a+' '+b))return '资料不足，待核验';
  const numeric=v=>{const clean=v.replace(/[$,]/g,'').trim();return /^\d+(\.\d+)?$/.test(clean)?Number(clean):null;};
  const x=numeric(a),y=numeric(b);
  if([1,2,3,4,7,9].includes(index)&&x!==null&&y!==null){
   const d=x-y,unit={1:'美元',2:'分',3:'条评分',4:'件/月（估算）',7:'个变体',9:'张图'}[index];
   if(d===0)return '两者相同'+(index===4?'（供应商估算）':'');
   const extra=index===1&&y>0?'（相对竞品 '+(Math.abs(d)/y*100).toFixed(1)+'%）':'';
   return '自己'+(d>0?'高':'低')+' '+Math.abs(d).toLocaleString('en-US',{maximumFractionDigits:2})+' '+unit+extra+(index===3||index===4?'；需核对父/子体口径':'');
  }
  if(index===6)return '需确认相同排名类目后比较';
  return a===b?'记录一致':'按两侧原记录对照';
 }

 function render(value){
  view.replaceChildren();
  if(value==='all'){
   const cards=make('div','ui-product-overview');rows.forEach((_,i)=>cards.append(product(i)));view.append(cards);
   const all=table(['维度',...ids.map((id,i)=>(i===0?'自己 · ':'竞品 · ')+id)],'ui-all-facts');
   for(let i=1;i<10;i++){const r=all.tBodies[0].insertRow();r.append(make('th','',text(base.rows[0].cells[i])),...rows.map(row=>copy(row.cells[i])));}
   view.append(make('h3','ui-section-title','全部商品 · 纵向指标'),scroll(all,'全部商品纵向指标'));
   if(features)view.append(make('h3','ui-section-title','全部商品 · 特征与原有结论'),scroll(copy(features),'全部商品特征对比'));return;
  }
  const index=ids.indexOf(value);if(index<1)return;
  const cards=make('div','ui-product-pair');cards.append(product(0),product(index));view.append(cards);
  const bt=table(['维度','自己 · '+ids[0],'竞对 · '+ids[index],'指标差异'],'ui-facts-table');
  for(let i=1;i<10;i++){const row=bt.tBodies[0].insertRow();row.append(make('th','',text(base.rows[0].cells[i])),copy(rows[0].cells[i]),copy(rows[index].cells[i]),make('td','ui-metric-difference',metricDifference(i,rows[0].cells[i],rows[index].cells[i])));}
  view.append(make('h3','ui-section-title','基础指标'),scroll(bt,'双方基础指标'));
  if(features){
   const ft=table(['维度','自己','当前竞对','原有多方结论'],'ui-pair-features');
   for(const source of features.tBodies[0].rows){const r=ft.tBodies[0].insertRow();r.append(copy(source.cells[0]),copy(source.cells[1]),copy(source.cells[index+1]),copy(source.cells[source.cells.length-1]));}
   view.append(make('h3','ui-section-title',`特征与需求对照 · ${features.tBodies[0].rows.length} 项`),make('p','ui-note','右列保留原有多方结论，切换竞对不重新判档。销量占比缺失仍待核验。'),scroll(ft,'双方卖点与原有结论'));
  }
 }
 render(ids[1]);
}

function imageStages(block){
 const stages=[];let current=null;
 for(const n of block.children){
  if(n.tagName==='H3'){current={heading:text(n),nodes:[]};stages.push(current);}
  else if(current)current.nodes.push(n);
 }
 for(const s of stages){s.matrix=s.nodes.find(n=>n.matches('table[data-image-table="matrix"]'));s.cards=s.nodes.filter(n=>n.matches('[data-image-card]'));s.suggestions=s.nodes.filter(n=>n.tagName==='P'&&text(n).startsWith('辅图建议 · '));}
 return stages;
}
function cardLabel(card){return card.getAttribute('data-image-card');}
function suggestionData(p,cards){
 const raw=text(p),prefix='辅图建议 · ',arrow=raw.indexOf(' → ',prefix.length),colon=raw.indexOf('：',arrow+3),evidence=raw.indexOf('；依据：',colon+1);
 if(!raw.startsWith(prefix)||arrow<0||colon<0||evidence<0)return null;
 const from=raw.slice(prefix.length,arrow),to=raw.slice(arrow+3,colon);
 if(!cards.some(c=>cardLabel(c)===from)||!cards.some(c=>cardLabel(c)===to))return null;
 return {from,to,change:raw.slice(colon+1,evidence),evidence:raw.slice(evidence+4),raw};
}
function evidenceCell(source,stage){
 const cell=make('td','ui-visual-cell'),parts=lines(source),label=parts[0]||'待核验';
 const citations=parts.slice(2).map(line=>({label:line.split('：')[0],line}));
 const matches=citations.map(c=>stage.cards.find(card=>cardLabel(card)===c.label)).filter(Boolean);
 const unique=[...new Map(matches.map(c=>[cardLabel(c),c])).values()];
 if(unique.length){
  const picture=make('div'),caption=make('p','ui-image-label');
  const show=i=>{const card=unique[i];picture.replaceChildren(photo(card.querySelector('img'),text(card.querySelector('h3'))));caption.textContent=text(card.querySelector('h3'));};show(0);cell.append(picture,caption);
  if(unique.length>1)cell.append(chooser('证据图片',unique.map((c,i)=>[String(i),text(c.querySelector('h3'))]),i=>show(Number(i))));
 }else cell.append(make('div','ui-no-photo','无已确认引用图'));
 const complete=make('div');complete.append(...[...source.childNodes].map(copy));
 cell.append(status(label),make('p','ui-reason',parts[1]||'原记录未提供理由'),fold('查看完整证据',[complete]));
 return cell;
}

export function enhanceImages(block){
 const stages=imageStages(block),own=stages.find(s=>s.matrix?.rows[0].cells.length===3),pairs=stages.filter(s=>s.matrix?.rows[0].cells.length===4),checklist=direct(block,'details')[0];
 if(!own||!checklist||!pairs.every(s=>s.matrix.tBodies[0].rows.length===own.matrix.tBodies[0].rows.length))return;
 const featureNames=[...own.matrix.tBodies[0].rows].map(r=>text(r.cells[0]));
 if(pairs.some(s=>[...s.matrix.tBodies[0].rows].some((r,i)=>text(r.cells[0])!==featureNames[i])))return;
 const original=[...block.childNodes],heading=copy(block.querySelector('h2')),topNotes=[];
 for(const n of block.children){if(n.tagName==='H3')break;if(n.tagName==='P'&&!text(n).startsWith('清单版本：'))topNotes.push(copy(n));}
 const ownId=asin(own.matrix.rows[0].cells[1]);if(!ownId)return;
 const pairIds=pairs.map(s=>asin(s.matrix.rows[0].cells[2]));if(pairIds.some(x=>!x)||pairs.some(s=>asin(s.matrix.rows[0].cells[1])!==ownId))return;
 const intro=make('p','ui-subtitle',`${featureNames.length} 项购买确认要素 · 自己与 ${pairs.length} 家竞对 · 引用原报告判定`),check=make('ol','ui-checklist');
 const items=direct(checklist,'p');
 for(const item of items){const raw=text(item),cut=raw.indexOf('：'),source=raw.lastIndexOf('；来源：'),li=make('li'),head=make('div','ui-check-head');head.append(make('strong','',cut>=0?raw.slice(0,cut):raw));li.append(head);
  if(source>=0){li.append(make('p','',raw.slice(cut+1,source)),make('p','ui-source','来源：'+raw.slice(source+4)));}else li.append(make('p','',cut>=0?raw.slice(cut+1):raw));check.append(li);}
 const matrixView=make('div','ui-matrix-view'),selector=chooser('图片表达对比',[['all','多方总览'],['own','自己全组诊断'],...pairIds.map((id,i)=>[String(i),'自己 × '+id])],renderMatrix);
 const notes=make('div','ui-critical-notes');notes.append(...topNotes);
 const gallery=make('div','ui-own-gallery');
 const suggestions=pairs.flatMap(s=>s.suggestions.map(p=>suggestionData(p,s.cards)).filter(Boolean));
 for(const source of own.cards){
  const label=cardLabel(source),card=make('article','ui-edit-card'),picture=photo(source.querySelector('img'),text(source.querySelector('h3'))),content=make('div','ui-edit-copy');
  const paragraphs=direct(source,'p');content.append(make('h3','',text(source.querySelector('h3'))),make('h4','ui-observed-title','已观察到的内容'),...paragraphs.map(copy));
  const relevant=suggestions.filter(s=>s.to===label),section=make('div','ui-suggestions');section.append(make('h4','','已有改图建议'));
  if(!relevant.length)section.append(make('p','ui-note','当前记录未提供该图建议。'));
  for(const s of relevant){const entry=make('div','ui-suggestion');entry.append(make('span','ui-reference','参考 '+s.from),make('p','',s.change),fold('查看参考依据',[make('p','',s.evidence)]));const ref=pairs.flatMap(p=>p.cards).find(c=>cardLabel(c)===s.from);if(ref)entry.append(fold('查看'+s.from,[photo(ref.querySelector('img'),text(ref.querySelector('h3')))]));section.append(entry);}
  content.append(section);card.append(picture,content);gallery.append(card);
 }
 const archive=fold('完整依据与历史判图记录',original.filter(n=>n!==block.querySelector('h2')));
 block.replaceChildren(heading,intro,make('h3','ui-section-title','下单前需要确认的购买要素'),check,notes,make('h3','ui-section-title','图片如何回答这些问题'),selector,matrixView,make('h3','ui-section-title',`自己逐图优化 · ${own.cards.length} 张`),gallery,archive);block.classList.add('ui-images');
 function renderMatrix(value){
  matrixView.replaceChildren();let t;
  if(value==='all'){
   t=table(['购买要素','自己 · 全组诊断',...pairIds.map(id=>id+' · 同框记录')],'ui-image-overview');
   featureNames.forEach((name,i)=>{const r=t.tBodies[0].insertRow();r.append(make('th','',name),evidenceCell(own.matrix.tBodies[0].rows[i].cells[1],own));pairs.forEach(s=>r.append(evidenceCell(s.matrix.tBodies[0].rows[i].cells[2],s)));});
   matrixView.append(make('p','ui-note','各列来自对应原始诊断；未合成全局排名。选择某家竞对可查看同次对比中的双方证据与结论。'));
  }else{
   const stage=value==='own'?own:pairs[Number(value)];if(!stage)return;
   const headers=[...stage.matrix.rows[0].cells].map(text);t=table(headers,'ui-image-pair');
   [...stage.matrix.tBodies[0].rows].forEach(source=>{const r=t.tBodies[0].insertRow();r.append(copy(source.cells[0]));for(let i=1;i<source.cells.length-1;i++)r.append(evidenceCell(source.cells[i],stage));const last=make('td','ui-verdict',text(source.cells[source.cells.length-1]));r.append(last);});
   matrixView.append(make('p','ui-note',value==='own'?'自己全组诊断原记录。':'本次同框比较原记录；与“自己全组诊断”的判定如有差异，分别保留。'));
  }
  matrixView.append(scroll(t,'图片证据对比'));
 }
 renderMatrix('all');
}

// The automatic pipeline stores image IDs in matrix cells and the matching
// photographs inside each product's original-image details. Keep that binding.
export function enhanceFullImages(block,competitors){
 const source=block.querySelector('[data-full-analysis]');if(!source)return;
 const stages=imageStages(source).filter(s=>s.matrix),featureTable=competitors?.querySelectorAll('table')[1];
 if(!stages.length)return;
 for(const s of stages){
  s.id=s.heading.match(/\bB0[A-Z0-9]{8}\b/)?.[0];
  s.cards=s.nodes.flatMap(n=>[...(n.matches('[data-image-card]')?[n]:[]),...n.querySelectorAll('[data-image-card]')]);
  s.pictures=new Map(s.cards.map(c=>[text(c.querySelector('p')),c.querySelector('img')]));
 }
 const names=[...stages[0].matrix.tBodies[0].rows].map(r=>text(r.cells[0]));
 if(stages.some(s=>!s.id||s.matrix.rows[0].cells.length!==3||s.matrix.tBodies[0].rows.length!==names.length||[...s.matrix.tBodies[0].rows].some((r,i)=>text(r.cells[0])!==names[i])))return;
 const visual=readVisual(source);
 const original=[...source.childNodes],checklist=make('ol','ui-checklist'),heading=copy(source.querySelector('h2'));
 const featureRows=[...(featureTable?.tBodies[0]?.rows??[])];
 for(const name of names){
  const feature=featureRows.find(r=>lines(r.cells[0])[0]===name),li=make('li'),head=make('div','ui-check-head');
  const item=Array.isArray(visual?.checklist)?visual.checklist.find(f=>f?.id===names.indexOf(name)+1):null;
  head.append(make('strong','',name));const sources=Array.isArray(item?.source_types)?item.source_types.filter(s=>['核心词意图','品类统计','商品事实归纳'].includes(s)):[];for(const label of sources.length?sources:['模型选择 · 来源见下文'])head.append(make('span','ui-source-chip',label));li.append(head);if(typeof item?.question==='string'&&item.question)li.append(make('p','',item.question));
  const reason=feature?.cells[0].querySelector('details p');if(typeof item?.reason==='string'&&item.reason)li.append(make('p','',item.reason));else if(reason)li.append(make('p','',text(reason)));
  checklist.append(li);
 }
 const matrix=table(['购买要素',...stages.map((s,i)=>(i===0?'自己':'竞对 '+i)+' · '+s.id),'视觉标杆 / 自己的改法'],'ui-full-image-matrix');
 [...matrix.rows[0].cells].forEach((cell,i)=>{cell.scope='col';if(i===1)cell.classList.add('ui-own-column');});
 const photosRow=matrix.tBodies[0].insertRow();photosRow.append(make('th','','原图总览'));
 function imageEvidence(stage,ids,compact=false){
  const gallery=make('div','ui-evidence-photos'+(compact?' compact':''));
  for(const id of [...new Set(ids)]){
   const item=make('figure','ui-evidence-figure');item.dataset.evidenceId=id;
   const img=stage.pictures.get(id);
   item.append(img?photo(img,id):make('div','ui-no-photo','该图未提供'),make('figcaption','',id));gallery.append(item);
  }
  if(!ids.length)gallery.append(make('p','ui-note','本项没有引用图片'));
  return gallery;
 }
 stages.forEach((s,i)=>{const cell=make('td',i===0?'ui-own-column':'');cell.append(imageEvidence(s,[...s.pictures.keys()],true),make('p','ui-image-count',s.pictures.size+' 张已分析原图'));photosRow.append(cell);});
 photosRow.append(make('td','ui-note','按每项购买要素比较表达；允许并列，不按销量排视觉名次。'));
 names.forEach((name,index)=>{
  const row=matrix.tBodies[0].insertRow(),label=make('th','ui-feature-name');label.scope='row';label.append(make('span','ui-feature-number',String(index+1)),make('strong','',name));row.append(label);
  stages.forEach((s,i)=>{const originalRow=s.matrix.tBodies[0].rows[index],ids=lines(originalRow.cells[2]),cell=make('td','ui-full-evidence'+(i===0?' ui-own-column':''));
   cell.append(imageEvidence(s,ids));visualCell(cell,visual,s.id,index+1);cell.append(fold('原观察与建议',[make('p','ui-full-observation',text(originalRow.cells[1]))]));row.append(cell);
  });
  const benchmark=make('td','visual-benchmark');benchmarkCell(benchmark,visual,index+1,stages,photo);row.append(benchmark);
 });
 const summaries=make('div','ui-full-summaries');
 for(const s of stages){const summary=s.nodes.find(n=>n.tagName==='P');if(summary)summaries.append(fold(s.heading+' · 整体诊断',[copy(summary)]));}
 block.replaceChildren(heading,make('p','ui-subtitle',`${names.length} 项购买要素 · 自己与 ${stages.length-1} 家竞对 · ${stages.reduce((n,s)=>n+s.pictures.size,0)} 张真实图片`),make('h3','ui-section-title','买家下单前需要确认的 '+names.length+' 件事'),checklist,make('h3','ui-section-title','卖点 × 多方视觉表达对比'),make('p','ui-note','AI 模拟浏览判断：先看画面，再细看文字；不是实际人眼计时或转化测试。图片可放大。旧回执缺少新字段时明确显示未评估。'),scroll(matrix,'自己与竞对图片证据对比'),ownVisualCards(visual,stages[0],names,photo),summaries,fold('完整分析与原始图片记录',original));
 block.classList.add('ui-images','ui-full-images');
}
