/** Read exactly one selected plan; configuration presence is not authorization. */
import {ContextQAClient,ContextQAError} from './contextqa.js';

const parsePlanId=value=>{
  if((typeof value!=='string'&&typeof value!=='number')||!/^\d+$/.test(String(value)))return null;
  const id=Number(value);return Number.isSafeInteger(id)&&id>0?id:null;
};

export async function checkContextQAConnection({planId,env=process.env,fetchImpl=globalThis.fetch}={}) {
  const id=parsePlanId(planId),token=env?.CONTEXTQA_API_TOKEN;
  const base={schema:1,provider:'contextqa',operation:'getTestPlan',requiredPermission:'TEST_PLANS_READ',planId:id,
    configured:typeof token==='string'&&token.trim().length>0,readAccessVerified:false,requestCount:0,
    executionAuthorization:'not_checked',liveResultVerification:'not_checked',paidExecutionStarted:false,
    httpStatus:null,retryAfterSeconds:null};
  const result=(status,label,message,extra={})=>({...base,status,label,message,...extra});
  if(!base.configured)return result('not_configured','Credential not configured','Set CONTEXTQA_API_TOKEN in the CLI process environment or a private .env loaded with --env-file. No request was sent.');
  if(id===null)return result('configuration_invalid','Choose an authorized plan','Supply one positive safe integer plan ID. No plan enumeration or request was performed.');
  let client,responseStatus=null;
  try{
    if(typeof fetchImpl!=='function')throw new Error('Invalid transport');
    client=new ContextQAClient({token,timeoutMs:10000,fetchImpl:async(...args)=>{
      const response=await fetchImpl(...args);responseStatus=Number.isInteger(response?.status)?response.status:null;return response;
    }});
  }
  catch{return result('configuration_invalid','Credential configuration invalid','Check the local credential value and process configuration privately. No request was sent.');}
  try{
    const plan=await client.request('getTestPlan',{id});
    if(!plan||typeof plan!=='object'||Array.isArray(plan)||!Number.isSafeInteger(plan.id)||plan.id!==id)
      return result('unexpected_response','Selected plan not confirmed','The response did not confirm the requested plan ID. Read access was not verified.',{requestCount:client.metrics.requests,httpStatus:responseStatus});
    return result('read_access_verified','Read access verified','ContextQA returned the selected plan. This verifies only this plan read; execution, authoring, result access and entitlement were not checked.',{readAccessVerified:true,requestCount:client.metrics.requests,httpStatus:responseStatus});
  }catch(error){
    const status=error instanceof ContextQAError?error.status:null;
    const details={requestCount:client.metrics.requests,httpStatus:status};
    if(status===401)return result('credential_rejected','Credential rejected','ContextQA rejected authentication. The token may be invalid, expired or inactive; ask the authorized administrator to check it.',details);
    if(status===403)return result('permission_missing','Read access blocked','Check TEST_PLANS_READ and the token role/tenant/IP restrictions. HTTP 403 alone does not identify which access condition failed.',details);
    if(status===404)return result('plan_unavailable','Plan unavailable','Check the selected plan ID, tenant and object access. This response does not prove whether the plan exists elsewhere.',details);
    if(status===429)return result('rate_limited','Rate limit reached','No retry was attempted. Respect Retry-After before a later safe read and coordinate other processes using this token.',{...details,retryAfterSeconds:error.retryAfter});
    return result('connection_error','Read check failed','The read failed or returned an unsupported response. No token, upstream body, redirect destination or exception detail is returned; no retry was attempted.',details);
  }
}
