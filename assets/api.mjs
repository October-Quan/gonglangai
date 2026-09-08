import {config} from './config.mjs';
import {completeEmailLogin} from './auth-return.mjs';
export const preview = ['localhost','127.0.0.1'].includes(location.hostname) && new URLSearchParams(location.search).get('preview') === '1';
const root = new URL('../',import.meta.url);
export function page(path=''){const url=new URL(path,root);if(preview)url.searchParams.set('preview','1');return url.href;}
let client;
async function realApi(){
 if(!window.supabase)throw new Error('页面组件加载失败，请刷新页面。');
 client=window.supabase.createClient(config.url,config.publicKey,{auth:{flowType:'pkce',detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}});
 const unwrap=({data,error})=>{if(error)throw error;return data;};
 return {
  async user(){return unwrap(await client.auth.getUser()).user;},
  async loginUser(){return completeEmailLogin(client);},
  async loginLink(email,register){return unwrap(await client.auth.signInWithOtp({email,options:{shouldCreateUser:register,emailRedirectTo:page('')}}));},
  async logout(){unwrap(await client.auth.signOut({scope:'local'}));},
  async tasks(userId,offset=0){const r=await client.from('gonglangai_tasks').select('id,asin,status,created_at,failure_reason,report_url',{count:'exact'}).eq('user_id',userId).order('created_at',{ascending:false}).range(offset,offset+7);if(r.error)throw r.error;return {rows:r.data,total:r.count};},
  async task(id,userId){return unwrap(await client.from('gonglangai_tasks').select('*').eq('id',id).eq('user_id',userId).maybeSingle());},
  async upload(path,file){return unwrap(await client.storage.from('gonglangai-inbox').upload(path,file,{upsert:false,contentType:file.name.toLowerCase().endsWith('.csv')?'text/csv':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));},
  async insert(row){return unwrap(await client.from('gonglangai_tasks').insert(row).select('id').single());},
  async report(url){const u=new URL(url);if(u.protocol!=='https:'||u.hostname!==config.reportHost||!/^\/gonglangai\/reports\/[a-f0-9]{64}\.html$/.test(u.pathname)||u.search||u.hash||u.port||u.username||u.password)throw new Error('报告地址不符合本项目规则，请联系管理员核验。');const r=await fetch(u.href,{credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(30000)});if(!r.ok)throw new Error('报告暂时无法读取，请稍后重试。');return r.text();},
  onLogout(callback){client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')callback();});}
 };
}
export const api=preview ? (await import('/__preview__/adapter.mjs')).api : await realApi();
export function humanError(error){
 const code=error?.code||'',msg=String(error?.message||'');
 if(/pkce_code_verifier_not_found|code verifier|flow_state_not_found|bad_code_verifier/i.test(code+' '+msg))return '此浏览器未能匹配这次登录请求。请在同一个浏览器发送并打开最新链接：若在Codex内置网页发送，请回到那里打开链接；也可全程使用Chrome重新登录。';
 if(/Auth session missing|refresh_token|session_not_found|JWT expired/i.test(code+' '+msg)||error?.status===401)return '登录已失效，请重新登录。';
 if(code==='over_email_send_rate_limit'||/email rate limit exceeded/i.test(msg))return '邮件发送额度已用尽，请等待邮件服务额度恢复后再试；不是等待一分钟即可恢复。若持续出现，请联系管理员配置专用邮件服务。';
 if(/rate_limit|over_request_rate_limit/i.test(code)||error?.status===429)return '请求受到服务限流，恢复时间由服务端决定，请稍后再试，避免连续点击。';
 if(/otp_expired|access_denied|expired/i.test(code+' '+msg))return '登录链接已失效，请重新发送并使用最新邮件中的链接。';
 if(/signup_disabled|Signups not allowed/i.test(code+' '+msg))return '当前账号尚未注册，请切换到注册后再试。';
 if(/email_address_invalid|validation_failed/i.test(code))return '邮箱格式不正确，请检查后再试。';
 if(/42501|row-level security|permission denied/i.test(code+' '+msg))return '当前账号没有此操作权限，请重新登录；仍失败请联系管理员。';
 if(/fetch|network|timeout|timed out|abort/i.test(msg))return '网络连接超时或不可用，请检查网络后重试。';
 if(/Payload too large|exceeded.*size/i.test(msg))return '文件超过20 MiB，请选择较小的报表。';
 if(/^[\u4e00-\u9fff]/.test(msg))return msg;
 return '操作未完成，请稍后再试；若持续失败，请联系管理员。';
}
