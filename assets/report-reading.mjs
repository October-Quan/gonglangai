// Presentation only: keep the original cell nodes and exact text available.
import {sourceDateRange} from './report-display.mjs?v=20260911-reading';
const make=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;if(text)n.textContent=text;return n;};
export function condenseModuleDates(block){
 for(const p of block.querySelectorAll('p')){
  if(p.closest('table,details'))continue;
  const raw=p.textContent,match=raw.match(/^(\d{4}-\d{2}-\d{2}.*?)\s*～\s*(.*?) · (\d+个搜索词 · ([A-Z]{3})。.*)$/s);
  if(!match)continue;
  const range=sourceDateRange(`广告源文件周期：${match[1]} ～ ${match[2]}，币种 ${match[4]}。`);
  if(!range.valid)continue;
  p.textContent=range.summary+' '+match[3];
  const detail=make('details','report-details source-dates');
  detail.append(make('summary','','查看源日期明细'),make('p','',raw),make('p','','范围仅为源日期的最早至最晚边界，不代表每天均有完整数据。'));p.after(detail);
 }
}
export function condenseRules(block){
 for(const table of block.querySelectorAll('table')){
  const headers=[...table.querySelectorAll('thead th')].map(n=>n.textContent.trim());
  const shared=make('aside','shared-rules');let count=0;
  headers.forEach((header,index)=>{
   if(!/理由|退出条件/.test(header))return;
   const groups=new Map();
   for(const row of table.tBodies[0]?.rows??[]){
    const cell=row.cells[index],raw=cell.textContent;
    // Rich evidence/mapping blocks and row-specific numbers stay in the row.
    if(raw.trim().length<20||cell.querySelector(':not(br)')||(/理由/.test(header)&&/\d/.test(raw)))continue;
    if(!groups.has(raw))groups.set(raw,[]);groups.get(raw).push(cell);
   }
   for(const [raw,cells] of groups){
    if(cells.length<3)continue;
    const label=`公共说明 ${++count} · ${header}`,entry=make('div','shared-rule');
    entry.append(make('strong','',`${label}（${cells.length} 词适用）`),make('p','',raw));shared.append(entry);
    for(const cell of cells){
     const detail=make('details','report-details shared-rule-reference'),body=make('div','');
     body.append(...cell.childNodes);detail.append(make('summary','',`查看公共说明 ${count}`),body);cell.append(detail);
    }
   }
  });
  if(count)table.parentElement.classList.contains('organic-scroll')?table.parentElement.before(shared):table.before(shared);
 }
}
export function foldLongTables(block){
 const groups=[];
 for(const table of block.querySelectorAll('table')){
  const count=table.tBodies[0]?.rows.length??0;if(count<=20)continue;
  const scroll=table.closest('.organic-scroll');if(!scroll)continue;
  let heading=scroll.previousElementSibling;
  while(heading&&!/^H[23]$/.test(heading.tagName))heading=heading.previousElementSibling;
  const label=heading?.textContent.trim().replace(/[（(]\d+[）)]\s*$/,'')||'词条清单';
  const details=make('details','long-table-group');details.append(make('summary','',`${label}（${count} 条）· 展开查看`));
  scroll.before(details);details.append(scroll);groups.push(details);
 }
 if(!groups.length)return;
 const controls=make('div','long-table-controls');
 for(const [label,open] of [['展开全部长表',true],['收起长表',false]]){
  const button=make('button','button secondary-button',label);button.type='button';
  button.addEventListener('click',()=>groups.forEach(d=>{d.open=open;}));controls.append(button);
 }
 const heading=block.querySelector('h2');heading?heading.after(controls):block.prepend(controls);
}
export function actionTone(action,fallback){
 return ({'该停':'red','该降':'amber','该观察':'amber','该守':'green','该加':'blue','待补资料':'neutral'})[action]??fallback;
}
