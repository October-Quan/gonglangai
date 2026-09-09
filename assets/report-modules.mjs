const modules=[['01','关键词作战总表'],['02','自然位标杆'],['03','否定词清单'],['04','竞对对比'],['05','图片与卖点诊断'],['06','广告诊断与优化']];
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
export function moduleSource(fragment){
 const markers=fragment.querySelectorAll('[data-report-format]');
 if(!markers.length)return null;
 if(markers.length!==1||markers[0].getAttribute('data-report-format')!=='modules-v1')throw new Error('报告模块版本无法识别，请联系管理员核验。');
 const panels=[...markers[0].querySelectorAll('[data-module-panel]')];
 if(panels.length!==6||modules.some(([id],i)=>panels[i].getAttribute('data-module-panel')!==id||!(id==='01'?['ready']:id==='02'?['ready','pending']:['pending']).includes(panels[i].getAttribute('data-module-state'))))throw new Error('报告模块结构不完整，请联系管理员核验。');
 return panels[0];
}
export function mountModules(meta,panel,organic=null,thumbnail){
 if(organic){const table=organic.querySelector('table');if(!table||table.querySelectorAll('thead th').length!==6||!table.tBodies.length||[...table.tBodies[0].rows].some(r=>r.cells.length!==6))throw new Error('自然位标杆结构不完整，请联系管理员核验。');}
 const old=panel.closest('.diagnosis-layout');
 if(old)return;
 const layout=el('div','diagnosis-layout'),nav=el('nav','diagnosis-menu'),content=el('div','diagnosis-content');
 nav.setAttribute('aria-label','报告模块');layout.append(nav,content);
 meta.before(layout);
 const buttons=[],sections=[];
 for(const [id,title] of modules){
  const ready=id==='01'||(id==='02'&&organic);
  const button=el('button','module-button'+(ready?'':' pending'));
  button.type='button';button.setAttribute('aria-controls','diagnosis-'+id);button.setAttribute('aria-pressed',String(id==='01'));
  button.append(el('span','module-number',id),el('span','module-title',title));
  if(!ready)button.append(el('small','module-status','即将上线'));
  nav.append(button);buttons.push(button);
  const section=el('div','diagnosis-section');section.id='diagnosis-'+id;section.style.display=id==='01'?'block':'none';sections.push(section);content.append(section);
  if(id==='01')section.append(meta,panel);
  else if(id==='02'&&organic){
   const block=el('section','panel organic-panel');block.append(...[...organic.childNodes].map(n=>n.cloneNode(true)));
   const table=block.querySelector('table');table.className='report-table organic-table';
   const scroll=el('div','organic-scroll');scroll.setAttribute('role','region');scroll.setAttribute('aria-label','自然位标杆表，可左右滚动');scroll.tabIndex=0;table.before(scroll);scroll.append(table);
   block.querySelectorAll('img').forEach(img=>img.replaceWith(thumbnail(img)));
   block.querySelectorAll('details').forEach(d=>d.className='report-details');section.append(block);
  }
  else{const placeholder=el('section','module-placeholder panel');placeholder.append(el('span','module-placeholder-number',id),el('h2','',title),el('p','secondary','即将上线'));section.append(placeholder);}
  button.addEventListener('click',()=>{
   sections.forEach((s,i)=>{s.style.display=buttons[i]===button?'block':'none';buttons[i].setAttribute('aria-pressed',String(buttons[i]===button));});
  });
 }
 const heading=document.querySelector('.report-heading h1');if(heading)heading.textContent='Listing 增长诊断报告';
}
