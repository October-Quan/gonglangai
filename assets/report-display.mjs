// Presentation only: never feed these labels back into opportunity decisions.
function quantity(value){
 const raw=String(value??'').trim();
 if(!/^\d+(?:\.\d+)?$/.test(raw))return null;
 const n=Number(raw);return Number.isFinite(n)?n:null;
}
export function acosDisplay(fields){
 const spend=quantity(fields['花费']),sales=quantity(fields['销售额']);
 const missing=[...(spend===null?['花费']:[]),...(sales===null?['销售额']:[])];
 if(missing.length)return {display:'待核验',reason:missing.join('、')+'缺失或异常',detail:'ACOS展示：待核验；'+missing.join('、')+'缺失或异常。'};
 if(sales===0){
  const warning=quantity(fields['订单'])>0?'订单大于0但销售额为0，请核对订单与销售额。':'';
  return {display:'—',reason:'销售额为0，无法计算',detail:`ACOS展示：—；花费${fields['花费']} USD ÷ 销售额0 USD，分母为0，无法计算。${warning}`};
 }
 const raw=String(fields.ACOS??'').trim();
 if(!/^\d+(?:\.\d+)?%$/.test(raw)||!Number.isFinite(Number(raw.slice(0,-1))))return {display:'待核验',reason:'源报告ACOS缺失或异常',detail:'ACOS展示：待核验；源报告ACOS缺失或异常。'};
 return {display:raw,reason:'',detail:''};
}
function validDate(value){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||value.startsWith('0000'))return false;
 const date=new Date(value+'T00:00:00Z');
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
}
export function sourceDateRange(text){
 const raw=String(text??'');
 const match=raw.match(/^广告源文件周期：(.*?) ～ (.*?)，币种 ([^。]+)。(.*)$/s);
 if(!match)return {valid:false,raw};
 const sourceDate=value=>{
  const m=value.trim().match(/^(\d{4}-\d{2}-\d{2})(?:T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?)?$/);
  return m?.[1]??'';
 };
 const starts=match[1].split('、').map(sourceDate),ends=match[2].split('、').map(sourceDate);
 if(!starts.every(validDate)||!ends.every(validDate))return {valid:false,raw};
 const first=[...starts].sort()[0],last=[...ends].sort().at(-1);
 // These independent source lists cannot prove per-row pairing or daily coverage.
 if(first>last||[...starts].sort().at(-1)>last||first>[...ends].sort()[0])return {valid:false,raw};
 return {valid:true,raw,starts:match[1],ends:match[2],summary:`广告源文件日期范围：${first===last?first:first+' ～ '+last}，币种 ${match[3]}。`,note:match[4]};
}
