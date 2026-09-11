import {enhanceShareBenchmarks,enhanceNegativeProducts} from './report-growth.mjs?v=20260911-apparel';
import {enhanceOrganic,enhanceCompetitors,enhanceImages,enhanceFullImages} from './report-ui.mjs?v=20260911-visual';
import {condenseRules,foldLongTables,condenseModuleDates} from './report-reading.mjs?v=20260911-reading';
const modules=[['01','关键词增长总表'],['02','自然位标杆'],['03','否定词清单'],['04','竞对对比'],['05','图片与卖点诊断'],['06','广告诊断与优化']];
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
export function moduleSource(fragment){
 const markers=fragment.querySelectorAll('[data-report-format]');
 if(!markers.length)return null;
 if(markers.length!==1||markers[0].getAttribute('data-report-format')!=='modules-v1')throw new Error('报告模块版本无法识别，请联系管理员核验。');
 const panels=[...markers[0].querySelectorAll('[data-module-panel]')];
 if(panels.length!==6||modules.some(([id],i)=>panels[i].getAttribute('data-module-panel')!==id||!(id==='01'?['ready']:['ready','pending']).includes(panels[i].getAttribute('data-module-state'))))throw new Error('报告模块结构不完整，请联系管理员核验。');
 return panels[0];
}
export function mountModules(meta,panel,organic=null,thumbnail,negatives=null,competitors=null,images=null,adPlan=null,keywordData=new Map()){
 if(adPlan){
  checkMappingPresentation(adPlan);
  const tables=[...adPlan.querySelectorAll('table')];
  if(tables.length!==2||tables.some(t=>t.querySelectorAll('thead th').length!==4||!t.tBodies[0]||[...t.tBodies[0].rows].some(r=>r.cells.length!==4))||tables[0].tBodies[0].rows.length+tables[1].tBodies[0].rows.length>20)throw new Error('广告诊断结构不完整，请联系管理员核验。');
  for(const [i,t] of tables.entries())for(const r of t.tBodies[0].rows){const action=r.cells[1].textContent.trim();if(!(i===1?(adPlan.querySelector('[data-full-analysis]')?['待补资料']:['待我判']):['该停','该降','该观察','该守','该加']).includes(action)||(action==='该观察'&&['','—'].includes(r.cells[3].textContent.trim())))throw new Error('广告诊断动作或退出条件不完整。');}
 }
 if(competitors){
  const tables=[...competitors.querySelectorAll('table')];
  const partial=competitors.querySelector('[data-competitor-partial="true"]');
  const qualitative=[...competitors.querySelectorAll('[data-competitor-qualitative="true"]')];
  if(qualitative.length>1||(qualitative.length&&(!partial||qualitative[0].querySelectorAll('table').length!==1||qualitative[0].querySelector('table')!==tables[1])))throw new Error('定性补充表结构不完整，请联系管理员核验。');
  if(tables.length!==(partial&&!qualitative.length?1:2)||tables[0].querySelectorAll('thead th').length!==10||!tables[0].tBodies[0]||tables[0].tBodies[0].rows.length<4||tables[0].tBodies[0].rows.length>6||tables.some((t,i)=>!t.tBodies[0]||[...t.tBodies[0].rows].some(r=>r.cells.length!==(i===0?10:tables[0].tBodies[0].rows.length+2)))||((!partial||qualitative.length)&&tables[1].querySelectorAll('thead th').length!==tables[0].tBodies[0].rows.length+2))throw new Error('竞对对比表结构不完整，请联系管理员核验。');
 }
 if(negatives){
  const boxes=[...negatives.querySelectorAll('textarea[data-negative-copy]')];
  if(boxes.length!==2||boxes[0].getAttribute('data-negative-copy')!=='exact'||boxes[1].getAttribute('data-negative-copy')!=='phrase'||[...negatives.querySelectorAll('table')].some(t=>t.querySelectorAll('thead th').length!==7||!t.tBodies.length||[...t.tBodies[0].rows].some(r=>r.cells.length!==7)))throw new Error('否定词清单结构不完整，请联系管理员核验。');
 }
 if(organic){const table=organic.querySelector('table');if(!table||table.querySelectorAll('thead th').length!==6||!table.tBodies.length||[...table.tBodies[0].rows].some(r=>r.cells.length!==6))throw new Error('自然位标杆结构不完整，请联系管理员核验。');}
 if(images){
  const expectedRows=images.textContent.includes('image-checklist-apparel-scene-v1')?5:6;
  for(const t of images.querySelectorAll('table'))if(t.getAttribute('data-image-table')!=='matrix'||![3,4].includes(t.querySelectorAll('thead th').length)||t.tBodies[0]?.rows.length!==expectedRows||[...t.tBodies[0].rows].some(r=>r.cells.length!==t.querySelectorAll('thead th').length))throw new Error('图片证据矩阵结构不完整');
 }
 const old=panel.closest('.diagnosis-layout');
 if(old)return;
 const layout=el('div','diagnosis-layout'),nav=el('nav','diagnosis-menu'),content=el('div','diagnosis-content');
 nav.setAttribute('aria-label','报告模块');layout.append(nav,content);
 meta.before(layout);
 const buttons=[],sections=[];
 for(const [id,title] of modules){
  const ready=id==='01'||(id==='02'&&organic)||(id==='03'&&negatives)||(id==='04'&&competitors)||(id==='05'&&images)||(id==='06'&&adPlan);
  const button=el('button','module-button'+(ready?'':' pending'));
  button.type='button';button.setAttribute('aria-controls','diagnosis-'+id);button.setAttribute('aria-pressed',String(id==='01'));
  button.append(el('span','module-number',id),el('span','module-title',title));
  if(!ready)button.append(el('small','module-status','即将上线'));
  nav.append(button);buttons.push(button);
  const section=el('div','diagnosis-section');section.id='diagnosis-'+id;section.style.display=id==='01'?'block':'none';sections.push(section);content.append(section);
  if(id==='01')section.append(meta,panel);
  else if(id==='02'&&organic){
   const block=el('section','panel organic-panel');block.append(...[...organic.childNodes].map(n=>n.cloneNode(true)));
   enhanceOrganic(block,competitors);
   const table=block.querySelector('table');table.className='report-table organic-table';
   const scroll=el('div','organic-scroll');scroll.setAttribute('role','region');scroll.setAttribute('aria-label','自然位标杆表，可左右滚动');scroll.tabIndex=0;table.before(scroll);scroll.append(table);
   block.querySelectorAll('img').forEach(img=>{if(!img.closest('.ui-photo'))img.replaceWith(thumbnail(img));});
   block.querySelectorAll('details').forEach(d=>d.classList.add('report-details'));enhanceShareBenchmarks(block,keywordData);section.append(block);
  }
  else if(id==='03'&&negatives){
   const block=el('section','panel negatives-panel');block.append(...[...negatives.childNodes].map(n=>n.cloneNode(true)));
   block.querySelectorAll('table').forEach(table=>{table.className='report-table negatives-table';const scroll=el('div','organic-scroll');scroll.setAttribute('role','region');scroll.setAttribute('aria-label','否定词清单表，可左右滚动');scroll.tabIndex=0;table.before(scroll);scroll.append(table);});
   block.querySelectorAll('details').forEach(d=>d.classList.add('report-details'));
   block.querySelectorAll('textarea[data-negative-copy]').forEach(box=>{
    box.readOnly=true;box.rows=4;
    const button=el('button','button secondary-button','复制'+(box.getAttribute('data-negative-copy')==='exact'?'精准否定':'词组否定'));
    button.type='button';button.disabled=!box.value.trim();box.after(button);
    const status=el('p','secondary');status.setAttribute('role','status');button.after(status);
    button.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(box.value);status.textContent='已复制';}catch{box.focus();box.select();status.textContent='自动复制不可用，已选中文本，请手动复制。';}});
   });condenseModuleDates(block);condenseRules(block);enhanceNegativeProducts(block,keywordData);foldLongTables(block);section.append(block);
  }
  else if(id==='04'&&competitors){
   const block=el('section','panel competitors-panel');block.append(...[...competitors.childNodes].map(n=>n.cloneNode(true)));
   enhanceCompetitors(block);
   block.querySelectorAll('table').forEach(table=>{table.classList.add('report-table','competitors-table');if(table.closest('.ui-table-scroll'))return;const scroll=el('div','organic-scroll');scroll.setAttribute('role','region');scroll.setAttribute('aria-label','竞对对比表，可左右滚动');scroll.tabIndex=0;table.before(scroll);scroll.append(table);});
   block.querySelectorAll('img').forEach(img=>{if(!img.closest('.ui-photo'))img.replaceWith(thumbnail(img));});
   block.querySelectorAll('details').forEach(d=>d.classList.add('report-details'));section.append(block);
  }
  else if(id==='05'&&images){
   const block=el('section','panel images-panel');block.append(...[...images.childNodes].map(n=>n.cloneNode(true)));
   if(block.querySelector('[data-full-analysis]'))enhanceFullImages(block,competitors);else enhanceImages(block);
   block.querySelectorAll('table').forEach(table=>{table.classList.add('report-table','image-matrix');if(table.closest('.ui-table-scroll'))return;const scroll=el('div','organic-scroll');scroll.setAttribute('role','region');scroll.setAttribute('aria-label','图片证据矩阵，可左右滚动');scroll.tabIndex=0;table.before(scroll);scroll.append(table);});
   block.querySelectorAll('[data-image-card]').forEach(card=>card.className='image-evidence-card');
   block.querySelectorAll('img').forEach(img=>{
    if(img.closest('.ui-photo'))return;
    let u;try{u=new URL(img.getAttribute('src'));if(u.protocol!=='https:'||u.hostname!=='m.media-amazon.com'||u.username||u.password||u.port)throw new Error();}catch{img.replaceWith(el('p','secondary','图片地址待核验'));return;}
    img.loading='lazy';img.referrerPolicy='no-referrer';img.className='evidence-photo';
    img.addEventListener('error',()=>img.replaceWith(el('p','secondary','图片加载失败，模型证据保留，当前画面待核验')),{once:true});
   });block.querySelectorAll('details').forEach(d=>d.classList.add('report-details'));section.append(block);
  }
  else if(id==='06'&&adPlan){
   const block=el('section','panel ad-plan-panel');block.append(...[...adPlan.childNodes].map(n=>n.cloneNode(true)));
   if(!block.querySelector('[data-ad-mapping-status]')){const notice=el('p','secondary','待补投放映射；这是历史词诊断，尚未定位实际操作对象。');notice.setAttribute('data-ad-mapping-status','missing');block.querySelector('h2')?.after(notice);}
   block.querySelectorAll('table').forEach(table=>{table.className='report-table ad-plan-table';const scroll=el('div','organic-scroll');scroll.setAttribute('role','region');scroll.setAttribute('aria-label','广告诊断动作表，可左右滚动');scroll.tabIndex=0;table.before(scroll);scroll.append(table);});
   condenseRules(block);
   block.querySelectorAll('details').forEach(d=>d.classList.add('report-details'));section.append(block);
  }
  else{const placeholder=el('section','module-placeholder panel');placeholder.append(el('span','module-placeholder-number',id),el('h2','',title),el('p','secondary','即将上线'));section.append(placeholder);}
  button.addEventListener('click',()=>{
   sections.forEach((s,i)=>{s.style.display=buttons[i]===button?'block':'none';buttons[i].setAttribute('aria-pressed',String(buttons[i]===button));});
  });
 }
 const heading=document.querySelector('.report-heading h1');if(heading)heading.textContent='Listing 增长诊断报告';
}
// Optional mapping presentation must not make an otherwise valid report unreadable.
export function checkMappingPresentation(panel){
 const banners=[...panel.querySelectorAll('[data-ad-mapping-status]')],rows=[...panel.querySelectorAll('[data-ad-mapping-row]')],details=[...panel.querySelectorAll('[data-ad-mapping-details]')];
 if(!banners.length&&!rows.length&&!details.length)return;
 const safeTags=new Set(['DIV','P','DETAILS','SUMMARY']);
 let valid=banners.length===1&&['valid','missing','invalid'].includes(banners[0].getAttribute('data-ad-mapping-status'))&&!banners[0].closest('table');
 const seen=new Set();
 for(const node of [...banners,...rows])if([...node.querySelectorAll('*')].some(n=>!safeTags.has(n.tagName)))valid=false;
 for(const node of rows){const cell=node.parentElement,row=cell?.parentElement,word=node.getAttribute('data-ad-mapping-row');if(cell?.tagName!=='TD'||row?.tagName!=='TR'||row.cells[2]!==cell||row.cells[0].textContent.trim()!==word||seen.has(word))valid=false;seen.add(word);}
 for(const d of details)if(d.tagName!=='DETAILS'||d.getAttribute('data-ad-mapping-details')!=='true'||!d.closest('[data-ad-mapping-row]')||d.querySelectorAll('summary').length!==1)valid=false;
 const dataRows=[...panel.querySelectorAll('tbody tr')].filter(r=>!r.closest('[data-ad-mapping-row]'));
 if(rows.length!==dataRows.length)valid=false;
 if(!valid){for(const n of [...banners,...rows,...details])n.remove();const notice=el('div');notice.setAttribute('data-ad-mapping-status','invalid');notice.append(el('p','','投放映射结构不完整，已拒绝附件；原诊断保留。'));panel.querySelector('h2')?.after(notice);}
}
