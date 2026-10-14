/*
Copyright (c) 2026 SchnackerSoftwareSolutions, LLC.
All rights reserved.

This software is proprietary. No permission is granted
to copy, modify, redistribute, or commercially exploit
this code without prior written authorization.
*/
const clean=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function searchSymbols(directory,query,limit=8){const q=String(query||'').trim().toLowerCase(),key=clean(q);if(!key)return [];return directory.map(s=>{const ticker=s[0].toLowerCase(),name=s[1].toLowerCase();let score=ticker===q||clean(ticker)===key?0:ticker.startsWith(q)?1:name.startsWith(q)?2:name.includes(q)?3:ticker.includes(q)?4:99;return {s,score};}).filter(x=>x.score<99).sort((a,b)=>a.score-b.score||a.s[0].localeCompare(b.s[0])).slice(0,limit).map(x=>x.s);}
