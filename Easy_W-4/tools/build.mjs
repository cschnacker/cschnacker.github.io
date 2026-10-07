import fs from 'node:fs/promises';
await fs.mkdir('dist',{recursive:true});
await fs.cp('app','dist',{recursive:true});
console.log('Static site ready in dist/index.html');
