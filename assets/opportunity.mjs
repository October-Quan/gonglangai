export const TARGETS=Object.freeze({acos:0.5,rank:30});
const numeric=value=>typeof value==='number'&&Number.isFinite(value);
export function parseMetric(value){
 const text=String(value??'').trim();
 return /^\d+(?:\.\d+)?$/.test(text)?Number(text):null;
}
export function adFacts(fields,hasAds){
 const spend=parseMetric(fields['花费']),sales=parseMetric(fields['销售额']);
 const displayed=String(fields.ACOS??'').match(/^(\d+(?:\.\d+)?)%$/);
 // Prefer unrounded source totals, so e.g. 50.004% does not pass a displayed 50.00% boundary.
 const acos=numeric(spend)&&numeric(sales)?(sales>0?spend/sales:null):(displayed?Number(displayed[1])/100:null);
 return {hasAds,orders:parseMetric(fields['订单']),acos};
}
export function assessOpportunity({hasAds,orders,acos,rank,ownTop3=false}){
 const rankKnown=Number.isInteger(rank)&&rank>0,rankReached=rankKnown&&rank<=TARGETS.rank;
 const acosKnown=numeric(acos)&&acos>=0;
 const base={candidate:false,rankReached,acosWithin:hasAds&&acosKnown?acos<=TARGETS.acos:null};
 const result=(label,tone,action)=>({...base,label,tone,action});
 if(!hasAds)return result('无投放，先核验','amber','本报表周期无匹配广告，不据此判断加投空间。');
 if(!numeric(orders)||orders<0)return result('广告数据待核验','amber','订单数据缺失，补齐后再判断是否适合推位。');
 if(orders===0)return result('无单，先排查','amber','先检查相关性、价格和页面，不直接建议增加预算。');
 if(!acosKnown)return result('ACOS待核验','amber','ACOS无法确认，补齐广告数据后再判断。');
 if(acos>TARGETS.acos)return result('先降ACOS','amber','ACOS超过50%目标，先核对广告效率、相关性与页面；暂不列为推位候选。');
 if(!rankKnown)return result('自然位待核验','amber','ACOS在目标内，但自然位缺失，暂不判断推位空间。');
 if(ownTop3)return result('优先守位','blue',rankReached?'自然位已进入前30名，且自己在点击前三；按既定规则优先守位。':'自己在点击前三，按既定规则优先守位；自然位尚未进入前30名。');
 if(rankReached)return result('已达目标','blue','ACOS在50%目标内，自然位已进入前30名；当前目标已达成。');
 return {...result('推位候选','green','已有广告订单，ACOS≤50%，自然位尚在30名以后；可考虑小步测试推位。先复核词的相关性、点击集中程度及不同数据周期，不自动增加预算。'),candidate:true};
}
