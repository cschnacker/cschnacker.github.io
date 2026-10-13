/*
Copyright (c) 2026 SchnackerSoftwareSolutions, LLC.
All rights reserved.

This software is proprietary. No permission is granted
to copy, modify, redistribute, or commercially exploit
this code without prior written authorization.
*/
import {recordSnapshot} from './history.js';
export function normalizeQuote(symbol,data){
 if(!data||data.status==='error')throw Error(data?.message||'Quote unavailable');
 const price=Number(data.close??data.price);
 if(!Number.isFinite(price)||price<=0)throw Error('Provider returned an invalid price');
 if(data.currency!=='USD')throw Error('Only USD quotes are supported; enter a USD price manually');
 if(String(data.symbol).toUpperCase()!==symbol.toUpperCase())throw Error('Provider symbol does not match; verify the ticker');
 return {symbol,price,currency:'USD',name:String(data.name||symbol),exchange:String(data.exchange||''),marketTime:String(data.datetime||''),retrievedAt:new Date().toISOString(),source:'Twelve Data'};
}
export async function fetchPrices(symbols,{key,endpoint,mode='personal',fetcher=fetch,onProgress=()=>{}}={}){
 if(mode==='disabled')throw Error('Automatic price connections are disabled in the store edition. Enter prices or balances manually.');
 const unique=[...new Set(symbols.map(s=>s.trim().toUpperCase()).filter(Boolean))];
 if(mode==='proxy'){
  let r;try{r=await fetcher(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({symbols:unique}),signal:AbortSignal.timeout(60000)});}catch(e){throw Error(e.name==='TimeoutError'?'The price service took too long to respond. Try again. Your previous prices are unchanged.':'Cannot connect to the price service. For the local planner, run Start-Planner.cmd and keep its window open, then refresh this page. Your previous prices are unchanged.');}
  let data;try{data=await r.json();}catch{throw Error('The price service returned an unexpected response. Restart the planner with Start-Planner.cmd and refresh this page. Your previous prices are unchanged.');}if(!r.ok)throw Error(data.error||'Quote service unavailable');
  if(!Array.isArray(data.results))throw Error('Invalid quote service response');
  return unique.map(symbol=>{const item=data.results.find(q=>q.symbol===symbol);try{return {symbol,quote:normalizeQuote(symbol,item?.data)};}catch(e){return {symbol,error:item?.error||e.message};}});
 }
 if(!key)throw Error('A Twelve Data API key is required.');
 const results=[];
 for(const symbol of unique){onProgress(symbol,results.length,unique.length);try{const u=new URL('https://api.twelvedata.com/quote');u.searchParams.set('symbol',symbol);
  const response=await fetcher(u,{headers:{Authorization:'apikey '+key},signal:AbortSignal.timeout(15000)}),data=await response.json();
  if(!response.ok)throw Error(data.message||`Quote request failed (${response.status})`);
  results.push({symbol,quote:normalizeQuote(symbol,data)});
 }catch(e){results.push({symbol,error:e.name==='TimeoutError'?'The quote request timed out. Try again.':e instanceof TypeError?'Cannot reach Twelve Data. Check your internet connection and whether your browser or network blocks the quote service. Your previous price is unchanged.':e.message});}}
 return results;
}
export function applyQuotes(plan,results){const next=structuredClone(plan);for(const h of next.holdings){if(h.valuationMode==='dollars')continue;const q=results.find(q=>q.symbol===h.symbol.toUpperCase());if(q?.quote){h.quote=q.quote;recordSnapshot(h,{kind:'price',value:q.quote.price,source:'api',recordedAt:q.quote.retrievedAt,marketTime:q.quote.marketTime});}}return next;}
