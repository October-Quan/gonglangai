// Presentation from the current report only: no cross-task joins or paid lookups.
import {photo} from './report-ui.mjs?v=20260911-apparel';
const make=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n;};
const words=v=>String(v??'').trim().toLowerCase().replace(/\s+/g,' ');
const lines=cell=>{const c=cell.cloneNode(true);c.querySelectorAll('details').forEach(n=>n.remove());c.querySelectorAll('br').forEach(n=>n.replaceWith('\n'));return c.textContent.split('\n').map(s=>s.trim()).filter(Boolean);};
const validASIN=s=>/^B0[A-Z0-9]{8}$/.test(s);
const share=v=>v===null?'份额待核验':(v*100).toLocaleString('en-US',{maximumFractionDigits:8})+'%';
const link=id=>{const a=make('a','growth-asin',id);a.href='https://www.amazon.com/dp/'+id;a.target='_blank';a.rel='noopener noreferrer';return a;};
const note=s=>make('p','growth-note',s);
function fold(title,nodes){const d=make('details','report-details growth-original');d.append(make('summary','',title),...nodes);return d;}
export function keywordContext(master,ownAsin,organic){
 const ranks=new Map();
 for(const row of organic?.querySelector('tbody')?.rows??[]){
  const key=words(lines(row.cells[0])[0]),byASIN=new Map();
  for(const p of row.querySelectorAll('[data-organic-product]')){
   const ps=[...p.querySelectorAll('p')].map(n=>n.textContent.trim()),id=ps[0]?.match(/B0[A-Z0-9]{8}/)?.[0];
   if(id)byASIN.set(id,{rank:ps.find(s=>s.startsWith('自然位 '))?.slice(4)||'—',time:ps.find(s=>s.startsWith('观测：'))?.slice(3)||'待核验'});
  }
  ranks.set(key,{byASIN,own:lines(row.cells[1])[0]||'—',ad:lines(row.cells[2])[0]||'—'});
 }
 const result=new Map();
 for(const row of master?.tBodies[0]?.rows??[]){
  const c=row.cells,key=words(c[1].textContent),top=[];
  for(const html of c[7].innerHTML.split(/<hr\s*\/?\s*>/i)){
   const part=make('div');part.innerHTML=html;const ls=lines(part),id=ls[0];if(!validASIN(id)||top.some(p=>p.asin===id))continue;
   const raw=ls.find(s=>s.startsWith('点击份额原值'))?.replace('点击份额原值','').trim();
   const val=raw&&/^\d+(\.\d+)?$/.test(raw)&&Number(raw)<=1?Number(raw):null;
   top.push({asin:id,share:val,image:part.querySelector('img')?.cloneNode(true)??null,rank:ranks.get(key)?.byASIN.get(id)??null,own:id===ownAsin,sourceOrder:top.length+1});
  }
  const sorted=[...top].sort((a,b)=>(b.share??-1)-(a.share??-1));
  const complete=top.length===3&&top.every(p=>p.share!==null)&&top.reduce((s,p)=>s+p.share,0)<=1.0000001;
  const leaders=complete?sorted.filter(p=>p.share===sorted[0]?.share):[];
  result.set(key,{keyword:c[1].textContent.trim(),top:sorted,leaders,complete,weekly:lines(c[3])[0],period:lines(c[3]).slice(1).join(' '),ownRank:ranks.get(key)?.own??lines(c[8])[0]??'—',ownTime:ranks.get(key)?.byASIN.get(ownAsin)?.time??lines(c[8])[1],ownAd:ranks.get(key)?.ad??'—'});
 }
 return result;
}
function product(p,{compact=false,leader=false}={}){
 const item=make('article','growth-product'+(p.own?' own':'')+(leader?' leader':'')+(compact?' compact':''));
 item.append(make('span','growth-product-label',`${p.own?'自己 · ':''}ABA 第${p.sourceOrder}名${leader?' · 点击份额最高':''}`),photo(p.image,p.asin+' 商品主图'),link(p.asin),make('strong','growth-share',share(p.share)));
 if(!compact){item.append(note('自然位 '+(p.rank?.rank??'—')));if(p.rank?.time)item.append(note('观测 '+p.rank.time));}
 return item;
}
export function enhanceShareBenchmarks(block,context){
 const table=block.querySelector('table');if(!table?.tBodies[0])return;
 const style=make('link');style.rel='stylesheet';style.href=new URL('./report-organic.css?v=20260911-rank',import.meta.url).href;block.prepend(style);
 block.querySelector('h2').textContent='自然位标杆';
 const heading=make('h3','','逐词自然位对照'),list=make('div','rank-reference-list');
 const rows=[...table.tBodies[0].rows];
 for(const r of rows){
  const c=r.cells,key=c[0].firstChild.textContent.trim(),own=lines(c[1])[0],ad=lines(c[2])[0],benchmark=c[3].textContent.match(/B0[A-Z0-9]{8}/)?.[0],best=lines(c[4])[0],gap=lines(c[5])[0];
  const card=make('article','rank-reference-row');card.dataset.rankKeyword=words(key);
  const label=make('div','rank-reference-word');label.append(make('strong','',key),note('差距 '+gap));
  const facts=make('div','rank-reference-facts'),self=make('div','rank-reference-own'),rival=make('div','rank-reference-rival');
  self.append(make('span','','我的自然位'),make('strong','',own),note('我的广告位 '+ad));
  rival.append(photo(c[3].querySelector('img'),(benchmark||'标杆')+' 主图','rank-reference-photo'));
  const info=make('div');info.append(make('span','','已抓竞对中的自然位标杆'),benchmark?link(benchmark):make('span','','—'),make('strong','','自然位 '+best));rival.append(info);facts.append(self,rival);card.append(label,facts);list.append(card);
  c[1].classList.add('rank-own-cell');c[4].classList.add('rank-benchmark-cell');
 }
 const filter=make('input','input growth-filter');filter.type='search';filter.placeholder='搜索关键词';filter.setAttribute('aria-label','筛选自然位标杆关键词');
 const empty=note('没有匹配的关键词');empty.hidden=true;
 filter.addEventListener('input',()=>{let count=0;rows.forEach((r,i)=>{const match=list.children[i].dataset.rankKeyword.includes(words(filter.value));r.hidden=!match;list.children[i].hidden=!match;if(match)count++;});empty.hidden=!!count;});
 const anchor=table.closest('.organic-scroll')||table;anchor.before(filter,heading,list,empty,make('h3','','自然位与差距明细'));
 block.classList.add('rank-reference');
}
export function enhanceNegativeProducts(block,context){
 const seen=new Set(),covered=new Set();
 for(const table of block.querySelectorAll('table')){
  table.classList.add('growth-negatives');
  for(const row of table.tBodies[0]?.rows??[]){
   const cell=row.cells[0],key=words(cell.textContent),box=make('div','growth-negative-evidence');box.dataset.abaKeyword=key;
   if(/^b0[a-z0-9]{8}$/.test(key)){box.append(make('span','growth-missing','ASIN 商品投放 · 不适用关键词 ABA'));}
   else{
    seen.add(key);const item=context.get(key);
    if(item?.top.length){covered.add(key);const cards=make('div','growth-negative-products');for(const p of item.top)cards.append(product(p,{compact:true,leader:item.leaders.includes(p)}));box.append(make('strong','growth-evidence-title','ABA 点击前三'),note(item.period||'周期待核验'),cards);}
    else box.append(make('span','growth-missing','未进ABA排名'),note('本报告暂无 ABA 记录，尚未查询或未返回'));
   }
   cell.append(box);
  }
 }
 const info=make('div','apparel-context');info.append(make('strong','',`ABA 图片参考：${covered.size} / ${seen.size} 个文本候选词已有数据`),note('图片帮助核对款式、版型、面料与场景；不因颜色、尺码不同或点击无单就直接否定。“未进ABA排名”表示本报告暂无记录，不代表已确认全站未上榜；原建议继续展示。'));
 block.querySelector('h2')?.after(info);
 return {textKeywords:seen.size,covered:covered.size,missing:seen.size-covered.size};
}
