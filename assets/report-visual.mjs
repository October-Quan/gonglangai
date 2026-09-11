const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls||'';if(text)n.textContent=text;return n;};
const str=x=>typeof x==='string'?x:'';
const states=['一眼明确','细看才懂','未表达','容易误解'];
export function readVisual(source){
 const node=source.querySelector('[data-image-visual="visual-expression-v1"]');
 if(!node)return null;
 try{const payload=node.getAttribute('data-image-visual-content')||node.textContent;if(payload.length>500000)return null;const value=JSON.parse(payload);if(value.version!=='visual-expression-v1'||!Array.isArray(value.products)||!value.products.every(p=>p&&typeof p.asin==='string'&&Array.isArray(p.features)&&p.features.every(f=>f&&typeof f==='object')&&Array.isArray(p.images)&&p.images.every(i=>i&&Array.isArray(i.feature_ids))&&p.set_review&&Array.isArray(p.set_review.duplicates)&&Array.isArray(p.set_review.missing_slots))||!Array.isArray(value.benchmarks)||!value.benchmarks.every(b=>b&&Array.isArray(b.leaders)&&b.leaders.every(l=>l&&Array.isArray(l.image_ids))))return null;return value;}catch{return null;}finally{node.remove();}
}
function line(parent,label,value){if(!str(value))return;const p=el('p');p.append(el('strong','',label+'：'),document.createTextNode(value));parent.append(p);}
export function visualCell(cell,data,asin,id){
 const f=data?.products.find(x=>x.asin===asin)?.features?.find(x=>x.id===id);
 const status=states.includes(f?.status)?f.status:'未评估';
 cell.append(el('span','visual-state state-'+(states.indexOf(status)+1),status));
 if(status==='未评估'){cell.append(el('p','ui-note','本次未提供第一眼视觉判断，保留原观察。'));return;}
 line(cell,'第一眼',f.first_glance);line(cell,'细看确认',f.detail_reading);line(cell,'视觉原因',f.visual_reason);line(cell,'误读风险',f.misreading);
}
export function benchmarkCell(cell,data,id,stages,photo){
 const b=data?.benchmarks?.find(x=>x.feature_id===id);
 const leaders=(b?.leaders??[]).filter(x=>stages.some(s=>s.id===x.asin&&Array.isArray(x.image_ids)&&x.image_ids.length&&x.image_ids.every(id=>s.pictures.has(id))));
 if(!leaders.length){cell.append(el('p','ui-note','可比视觉证据不足，暂不选标杆'));return;}
 for(const l of leaders){const s=stages.find(s=>s.id===l.asin);cell.append(el('strong','', (leaders.length>1?'并列标杆 · ':'标杆 · ')+l.asin));cell.append(photo(s.pictures.get(l.image_ids[0]),l.image_ids[0]));if(l.image_ids.length>1){const d=el('details'),summary=el('summary','','其他 '+(l.image_ids.length-1)+' 张标杆依据');d.append(summary);for(const id of l.image_ids.slice(1))d.append(photo(s.pictures.get(id),id));cell.append(d);}}
 line(cell,'表达优势',b.reason);line(cell,'自己的改法',b.own_action);
}
export function ownVisualCards(data,own,names,photo){
 const section=el('div','visual-own');section.append(el('h3','ui-section-title','自己商品 · 逐图诊断'));
 const product=data?.products.find(x=>x.asin===own.id);
 for(const [id,img] of own.pictures){
  const x=product?.images?.find(x=>x.image_id===id),card=el('article','visual-card'),figure=el('figure'),body=el('div','visual-card-body');
  figure.append(photo(img,id),el('figcaption','',id));body.append(el('h3','',x?.role||'本图任务未评估'),el('span','visual-priority','修改优先级：'+(x?.priority||'未评估')));
  line(body,'第一眼印象',x?.first_glance||'本次尚未生成逐图视觉诊断');
  for(const [key,label] of [['retained','已有 · 保留'],['gaps','缺口 · 加强'],['changes','具体修改']]){
   const box=el('div','visual-'+key);box.append(el('h4','',label));const items=Array.isArray(x?.[key])?x[key].filter(v=>str(v)):[];
   if(items.length){const ul=el('ul');for(const t of items)ul.append(el('li','',t));box.append(ul);}else box.append(el('p','ui-note','本次未提供，待评估'));body.append(box);
  }
  const ids=(x?.feature_ids??[]).filter(n=>Number.isInteger(n)&&names[n-1]);line(body,'对应购买要素',ids.map(n=>names[n-1]).join('、'));
  for(const b of (data?.benchmarks??[]).filter(b=>ids.includes(b.feature_id)&&b.leaders?.length))line(body,'结合竞品 · '+names[b.feature_id-1],b.own_action);
  const links=(data?.benchmarks??[]).filter(b=>ids.includes(b.feature_id)).flatMap(b=>(b.leaders??[]).map(l=>l.asin+' · '+(l.image_ids??[]).join('、')));line(body,'可参考图', [...new Set(links)].join('；'));
  card.append(figure,body);section.append(card);
 }
 const review=el('div','visual-set');review.append(el('h3','','整组图片检查'));
 line(review,'重复内容',product?.set_review?.duplicates?.join('；')||'本次未提供整组重复判断');line(review,'建议补充图位',product?.set_review?.missing_slots?.join('；')||'本次未提供缺失图位判断');section.append(review);return section;
}
