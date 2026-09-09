// Recalculate from the report's aggregated quantities, never its ratio columns.
const quantity=value=>{
 const raw=String(value??'').trim();
 if(!/^\d+(?:\.\d+)?$/.test(raw))return null;
 const n=Number(raw);return Number.isFinite(n)?n:null;
};
const count=n=>n.toLocaleString('en-US',{maximumFractionDigits:8});
function rate(label,fields,numerator,denominator){
 const n=quantity(fields[numerator]),d=quantity(fields[denominator]);
 const missing=[...(n===null?[numerator]:[]),...(d===null?[denominator]:[])];
 if(missing.length)return {label,status:'missing',display:'待核验',detail:`${label}：${missing.join('、')}缺失或异常，待核验。`};
 if(d===0)return {label,status:'zero_denominator',display:'—',detail:`${label}：${count(n)}${numerator} ÷ 0${denominator}；${denominator}为0，无法计算。`};
 const percent=n/d*100;
 if(!Number.isFinite(percent))return {label,status:'invalid',display:'待核验',detail:`${label}：计算结果异常，请核对原始量。`};
 const display=n>0&&percent<0.005?'<0.01%':percent.toLocaleString('en-US',{useGrouping:false,minimumFractionDigits:2,maximumFractionDigits:2});
 const formatted=display.endsWith('%')?display:display+'%';
 return {label,status:'known',display:formatted,detail:`${label}：${count(n)}${numerator} ÷ ${count(d)}${denominator} ×100；显示 ${formatted}。`+(percent>100?'超过100%，请核对原始量及归因口径。':'')};
}
export function adRates(fields,hasAds=true){
 return hasAds?[rate('CTR',fields,'点击','展示'),rate('CVR',fields,'订单','点击')]:[];
}
