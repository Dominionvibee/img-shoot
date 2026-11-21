const paths=new Map([
  ['/api/recaptcha/config','GET'],
  ['/api/privacy-requests/verify','POST'],
]);

function json(res,status,body){
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(JSON.stringify(body));
}

// Only these two security endpoints are proxied. Snapshot/gallery routes retain
// their existing handlers. The target comes from server configuration, never a
// client URL, and secrets are never read or returned by the frontend server.
export async function handleVerificationApi(req,res,{target=process.env.API_PROXY_TARGET||process.env.VITE_API_PROXY_TARGET||'http://localhost:4000',fetchImpl=fetch}={}){
  const path=new URL(req.url,'http://localhost').pathname;
  if(!paths.has(path))return false;
  if(req.method!==paths.get(path)){
    res.setHeader('Allow',paths.get(path));json(res,405,{code:'METHOD_NOT_ALLOWED',message:'Method not allowed.'});return true;
  }
  let base;
  try{
    base=new URL(target);
    if(!['http:','https:'].includes(base.protocol)||base.username||base.password||base.pathname!=='/'||base.search||base.hash)throw Error('Invalid API target');
  }catch{json(res,503,{code:'VERIFICATION_UNAVAILABLE',message:'Verification is unavailable. Please use the phone alternative or try again later.'});return true;}
  try{
    let body;
    if(req.method==='POST'){
      if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||'')){
        json(res,415,{code:'JSON_REQUIRED',message:'Send an application/json request.'});return true;
      }
      const chunks=[];let size=0;
      for await(const chunk of req){
        size+=chunk.length;
        if(size>16384){json(res,413,{code:'REQUEST_TOO_LARGE',message:'Verification request is too large.'});return true;}
        chunks.push(chunk);
      }
      body=Buffer.concat(chunks);
    }
    const headers={Accept:'application/json'};
    if(body)headers['Content-Type']='application/json';
    // Preserve the browser Origin for the backend's explicit allowlist. Do not
    // forward cookies, auth headers, or untrusted client X-Forwarded-For values.
    if(req.headers.origin)headers.Origin=req.headers.origin;
    const response=await fetchImpl(new URL(path,base),{method:req.method,headers,body,redirect:'error',signal:AbortSignal.timeout(12000)});
    const value=await response.json();
    if(response.headers.get('retry-after'))res.setHeader('Retry-After',response.headers.get('retry-after'));
    if(path==='/api/recaptcha/config'){
      // Return only the public configuration contract, even if the upstream
      // backend accidentally sends other fields. VITE_ values are public.
      const siteKey=typeof value.siteKey==='string'?value.siteKey:'';
      const requestedKey=process.env.VITE_RECAPTCHA_SITE_KEY?.trim();
      if(requestedKey&&siteKey&&requestedKey!==siteKey){
        json(res,503,{siteKey:'',configured:false,code:'RECAPTCHA_CONFIG_MISMATCH',message:'Verification configuration does not match. Please contact the site administrator.'});return true;
      }
      json(res,response.status,{siteKey:value.configured===true?siteKey:'',configured:value.configured===true});
    }else{
      // No verification credential or Google response is relayed to a client.
      json(res,response.status,response.ok&&value.verified===true?{verified:true}:{code:typeof value.code==='string'?value.code:'VERIFICATION_FAILED',message:typeof value.message==='string'?value.message:'Verification could not be completed. Please try again.'});
    }
  }catch{json(res,503,{code:'VERIFICATION_UNAVAILABLE',message:'Verification is unavailable. Please use the phone alternative or try again later.'});}
  return true;
}
