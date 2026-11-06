const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const books=JSON.parse(fs.readFileSync(path.join(root,'books.json'),'utf8'));
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const keys=['id','title','authors','publisher','year','isbn','subjects','call_number','copies','cover'].sort();
function element(id,pendingEvents){return {id,hidden:false,textContent:'',value:'',open:false,children:[],handlers:{},_html:'',addEventListener(type,fn){this.handlers[type]=fn},set innerHTML(v){this._html=v;this.children=[...v.matchAll(/<button[^>]*data-s="([^"]*)"[^>]*>/g)].map(m=>({s:m[1],getAttribute(){return this.s},setAttribute(){}}))},get innerHTML(){return this._html},insertAdjacentHTML(where,v){this.innerHTML+=v},showModal(){this.open=true},close(){this.open=false;pendingEvents.push(()=>this.handlers.close?.({}))}}}
async function app(data=books,ok=true,initialHash=''){
 const pendingEvents=[];
 const ids=['grid','chips','dlg','empty','more','count','dbody','dclose','q'];const els=Object.fromEntries(ids.map(k=>[k,element(k,pendingEvents)]));
 const location={hash:initialHash,pathname:'/',search:''};const calls=[],windowEvents={};
 const context={document:{getElementById:id=>els[id]},location,history:{replaceState(a,b,url){location.hash=url.startsWith('#')?url:''}},window:{scrollTo(){},addEventListener(type,fn){windowEvents[type]=fn}},fetch:async url=>{calls.push(url);return {ok,json:async()=>JSON.parse(JSON.stringify(data))}},console};
 vm.runInNewContext(script,context,{timeout:1000});await new Promise(r=>setImmediate(r));
 return {els,location,calls,flushDialogEvents(){while(pendingEvents.length)pendingEvents.shift()()},syncFragment(){windowEvents.hashchange?.()},escape(){let prevented=false;els.dlg.handlers.cancel?.({preventDefault(){prevented=true}});if(!prevented)els.dlg.close()},navigate(hash){location.hash=hash;windowEvents.hashchange?.()},search(q){els.q.handlers.input({target:{value:q}})},clickBook(id){els.grid.handlers.click({target:{closest(){return {getAttribute(){return String(id)}}}}})},subject(s){els.chips.handlers.click({target:{closest(){return {getAttribute(){return s}}}}})}};
}
test('all 1026 factual records have the exact public schema',()=>{assert.equal(books.length,1026);const seen=new Set();for(const b of books){assert.deepEqual(Object.keys(b).sort(),keys);assert.ok(Number.isSafeInteger(b.id)&&b.id>0&&!seen.has(b.id));seen.add(b.id);assert.ok(Number.isSafeInteger(b.copies)&&b.copies>=0);for(const k of ['title','publisher','year','isbn','call_number'])assert.equal(typeof b[k],'string');for(const k of ['authors','subjects']){assert.ok(Array.isArray(b[k]));for(const s of b[k])assert.equal(typeof s,'string')}assert.equal(b.cover,'')}});
test('only factual inventory fields, no descriptions or cover material',()=>{assert.equal(books.reduce((n,b)=>n+b.copies,0),1095);assert.equal(new Set(books.flatMap(b=>b.subjects)).size,194);assert.equal(books.find(b=>b.id===967).year,'2205');assert.ok(!fs.existsSync(path.join(root,'covers')));assert.ok(!fs.existsSync(path.join(root,'tools')))});
test('inline script syntax and restrictive CSP match',()=>{new vm.Script(script);const hash=crypto.createHash('sha256').update(script).digest('base64');assert.ok(html.includes(`'sha256-${hash}'`));for(const s of ["connect-src 'self'","img-src 'none'","form-action 'none'","base-uri 'none'"])assert.ok(html.includes(s));assert.ok(!/localStorage|sessionStorage|XMLHttpRequest|WebSocket|sendBeacon/.test(script))});
test('initial catalogue load and pagination use only local JSON',async()=>{const a=await app();assert.equal(a.els.count.textContent,'1026 books');assert.equal((a.els.grid.innerHTML.match(/class="card"/g)||[]).length,120);a.els.more.handlers.click();assert.equal((a.els.grid.innerHTML.match(/class="card"/g)||[]).length,240);assert.deepEqual(a.calls,['books.json']);assert.ok(!a.els.grid.innerHTML.includes('<img'))});
test('search combines terms and finds authors',async()=>{const a=await app();a.search('wimpy kid');assert.ok(parseInt(a.els.count.textContent)>0);assert.ok(a.els.grid.innerHTML.toLowerCase().includes('wimpy'));a.search('dahl');assert.ok(parseInt(a.els.count.textContent)>0);a.search('zzzz-no-such-book');assert.equal(a.els.count.textContent,'0 books');assert.equal(a.els.empty.hidden,false)});
test('subject filters match factual counts and All resets',async()=>{const a=await app();const s=books[0].subjects[0];a.subject(s);assert.equal(parseInt(a.els.count.textContent),books.filter(b=>b.subjects.includes(s)).length);a.subject('');assert.equal(a.els.count.textContent,'1026 books')});
test('details show inventory fields and close clears book fragment',async()=>{const a=await app();a.clickBook(169);assert.ok(a.els.dlg.open);assert.equal(a.location.hash,'#book-169');assert.ok(a.els.dbody.innerHTML.includes('978-1-84236-878-7'));assert.ok(a.els.dbody.innerHTML.includes('Call number'));a.els.dclose.handlers.click();assert.equal(a.els.dlg.open,false);assert.equal(a.location.hash,'')});
test('HTML in future text is escaped, remote covers ignored, unknown fields discarded',async()=>{const fixture={...books[0],title:'<img src=x onerror=alert(1)>',cover:'https://example.invalid/private.jpg',private_note:'DO NOT PUBLISH',subjects:['__proto__']};const a=await app([fixture]);assert.ok(a.els.grid.innerHTML.includes('&lt;img'));assert.ok(!a.els.grid.innerHTML.includes('<img'));assert.ok(!a.els.grid.innerHTML.includes('private_note'));assert.equal(a.els.count.textContent,'1 book')});
test('normalization supports accent-insensitive searches',async()=>{const a=await app([{...books[0],title:'Café 이야기'}]);a.search('cafe');assert.equal(a.els.count.textContent,'1 book')});
test('malformed IDs, duplicate IDs and invalid lists fail closed',async()=>{for(const data of [[{...books[0],id:'1" onclick="bad()'}],[books[0],books[0]],[{...books[0],authors:'wrong'}],[{...books[0],copies:-1}]]){const a=await app(data);assert.ok(a.els.empty.textContent.includes('could not load'));assert.equal(a.els.grid.innerHTML,'')}});
test('HTTP failures and non-array data show a load error',async()=>{for(const [data,ok] of [[books,false],[{},true]]){const a=await app(data,ok);assert.ok(a.els.empty.textContent.includes('could not load'));assert.equal(a.els.grid.innerHTML,'')}});

test('same-document book links and back navigation update the dialog',async()=>{const a=await app();a.navigate('#book-169');assert.ok(a.els.dlg.open);assert.ok(a.els.dbody.innerHTML.includes('978-1-84236-878-7'));a.navigate('');assert.equal(a.els.dlg.open,false);a.navigate('#book-169');assert.ok(a.els.dlg.open);a.navigate('#book-999999');assert.equal(a.els.dlg.open,false)});
test('a queued close event cannot erase a newer fragment before hashchange',async()=>{
 const a=await app();a.clickBook(169);a.els.dclose.handlers.click();
 a.location.hash='#book-'+books[1].id;
 a.flushDialogEvents();
 assert.equal(a.location.hash,'#book-'+books[1].id);
 a.syncFragment();assert.ok(a.els.dlg.open);assert.ok(a.els.dbody.innerHTML.includes(books[1].isbn));
});
test('closing and reopening the same book does not lose its fragment',async()=>{
 const a=await app();a.clickBook(169);a.els.dclose.handlers.click();a.clickBook(169);
 a.flushDialogEvents();assert.equal(a.location.hash,'#book-169');assert.ok(a.els.dlg.open);
});
test('Escape clears the fragment before the queued native close event',async()=>{
 const a=await app();a.clickBook(169);a.escape();assert.equal(a.location.hash,'');assert.equal(a.els.dlg.open,false);
 a.location.hash='#book-169';a.flushDialogEvents();a.syncFragment();assert.ok(a.els.dlg.open);assert.equal(a.location.hash,'#book-169');
});
test('navigation to unknown or unrelated fragments closes without rewriting the URL',async()=>{
 const a=await app();for(const hash of ['#book-999999','#about','']){a.clickBook(169);a.navigate(hash);a.flushDialogEvents();assert.equal(a.els.dlg.open,false);assert.equal(a.location.hash,hash)}
});
test('a valid initial deep link opens after the catalogue loads',async()=>{
 const a=await app(books,true,'#book-169');assert.ok(a.els.dlg.open);assert.equal(a.location.hash,'#book-169');assert.ok(a.els.dbody.innerHTML.includes('978-1-84236-878-7'));
});

