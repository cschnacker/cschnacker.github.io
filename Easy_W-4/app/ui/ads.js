// Ad setup never receives calculator inputs, results, or saved scenarios.
export function canServeAds(config,environment){
 return config?.enabled===true
  && /^ca-pub-\d{16}$/.test(config.publisherId)
  && /^\d+$/.test(config.slotId)
  && config.consentManagementReady===true
  && environment.protocol==='https:'
  && Array.isArray(config.approvedHostnames)
  && config.approvedHostnames.includes(environment.hostname)
  && !environment.unsupportedWebView
  && !environment.disabled;
}

export async function initializeAds({document,window,fetchConfig}){
 const container=document.getElementById('advertisement');
 if(!container||container.dataset.initialized)return;
 let config;
 try{config=await fetchConfig();}catch{return;}
 const environment={
  protocol:window.location.protocol,
  hostname:window.location.hostname,
  // Windows WebView2 and unregistered Android WebViews aren't supported by this web integration.
  unsupportedWebView:Boolean(window.chrome?.webview)||/;\s*wv\)/i.test(window.navigator.userAgent),
  disabled:new URLSearchParams(window.location.search).get('ads')==='off'
 };
 if(!canServeAds(config,environment))return;
 container.dataset.initialized='true';
 const unit=document.createElement('ins');
 unit.className='adsbygoogle';
 unit.style.display='block';
 unit.setAttribute('data-ad-client',config.publisherId);
 unit.setAttribute('data-ad-slot',config.slotId);
 unit.setAttribute('data-ad-format','auto');
 unit.setAttribute('data-full-width-responsive','true');
 container.append(unit);
 container.hidden=false;
 const script=document.createElement('script');
 script.async=true;
 script.crossOrigin='anonymous';
 script.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+config.publisherId;
 script.onerror=()=>{container.hidden=true;};
 script.onload=()=>{
  try{(window.adsbygoogle=window.adsbygoogle||[]).push({});}
  catch{container.hidden=true;}
 };
 document.head.append(script);
}
