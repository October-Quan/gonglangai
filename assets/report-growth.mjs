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
 if(!context.size)return;
 const original=[...block.childNodes],root=make('div','growth-benchmarks');
 const heading=make('h2','','关键词份额与自然位标杆');
 root.append(heading,note('先看每个词的 ABA 点击份额最高商品，再对照自然位与商品图片，确定优先研究的 Listing。'),note('点击份额代表该关键词下的点击分配，不等于转化份额、商品自身流量依赖度，也不能单独证明详情页最符合需求。'),make('div','apparel-context','服装需求核对：款式与版型 · 面料与透视程度 · 穿着场景与季节 · 颜色与尺码变体'));
 root.append(fold('服装 Listing 应重点对照什么',[note('把搜索词中的款式、面料、版型、场景、颜色与商品主图、标题、五点逐一对照；再看尺码表、透视/内搭说明及模特上身图是否回答购买顾虑。'),note('颜色或尺码可能属于同款变体。当前子 ASIN 图片、父体评价及整份广告报表需分别核对，不能用一个子款图片直接判整个款式无关。')]));
 const filter=make('input','input growth-filter');filter.type='search';filter.placeholder='搜索关键词';filter.setAttribute('aria-label','筛选份额标杆关键词');root.append(filter);
 const list=make('div','growth-share-list');root.append(list);
 for(const item of context.values()){
  const card=make('article','growth-share-row');card.dataset.growthKeyword=words(item.keyword);
  const left=make('div','growth-word');left.append(make('h3','',item.keyword),note('周搜索量 '+item.weekly),note('ABA 周期 '+(item.period||'待核验')));
  const self=make('div','growth-own-fact');self.append(make('span','','自己自然位'),make('strong','',item.ownRank),note('广告位 '+item.ownAd));
  left.append(self,fold('自己的排名采集时间',[note(item.ownTime||'本次未取得') ]));
  const right=make('div','growth-share-main'),caption=make('div','growth-leader');
  if(item.leaders.length){caption.append(make('span','growth-leader-label',item.leaders.length>1?'点击份额并列最高':'点击份额最高'));for(const p of item.leaders)caption.append(photo(p.image,p.asin+' 份额标杆主图','growth-leader-photo'),link(p.asin),make('strong','',share(p.share)),p.own?make('span','own-label','自己'):make('span','',''));}
  else caption.append(make('span','','最高份额待核验 · 前三数据不完整或比例异常'));
  right.append(caption);
  const bar=make('div','growth-share-bar');bar.setAttribute('role','img');bar.setAttribute('aria-label',item.top.map(p=>p.asin+' '+share(p.share)).join('；'));
  if(item.complete){for(const [i,p] of item.top.entries()){const seg=make('span','growth-segment '+(p.own?'self':'tone-'+i));seg.style.width=(p.share*100)+'%';seg.title=p.asin+' · '+share(p.share);bar.append(seg);}const rest=make('span','growth-segment remainder');rest.style.width=Math.max(0,100-item.top.reduce((s,p)=>s+p.share*100,0))+'%';rest.title='其他商品点击份额';bar.append(rest);right.append(bar,note('按全词 100% 绘制；灰色为前三之外的点击份额。'));}
  const cards=make('div','growth-top-three');for(const p of item.top)cards.append(product(p,{leader:item.leaders.includes(p)}));if(!item.top.length)cards.append(note('本词尚无可用 ABA 前三商品'));right.append(fold('查看 ABA 前三商品图片与自然位',[cards]));

  card.append(left,right);list.append(card);
 }
 const empty=note('没有匹配的关键词');empty.hidden=true;root.append(empty);
 filter.addEventListener('input',()=>{let count=0;for(const c of list.children){c.hidden=!c.dataset.growthKeyword.includes(words(filter.value));if(!c.hidden)count++;}empty.hidden=!!count;});
 root.append(fold('原自然位对照与来源（按位次选择的候选）',original));block.replaceChildren(root);block.classList.add('growth-organic');
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
