// Optional browser QA: install Playwright separately; the application itself has no dependencies.
const {chromium}=require('playwright');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const originals=JSON.parse(fs.readFileSync(path.join(root,'books.json'),'utf8'));
(async()=>{
 const server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname;if(name==='/favicon.ico'){res.writeHead(204);return res.end()}const file=name==='/'?'index.html':name==='/books.json'?'books.json':null;if(!file){res.writeHead(404);return res.end('Not found')}res.setHeader('Content-Type',file.endsWith('.json')?'application/json':'text/html; charset=utf-8');res.end(fs.readFileSync(path.join(root,file)))});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
 let browser;const reports=[];
 try{
  const options={headless:true};if(process.env.CHROMIUM_EXECUTABLE)options.executablePath=process.env.CHROMIUM_EXECUTABLE;
  browser=await chromium.launch(options);
  for(const [label,viewport] of [['desktop',{width:1280,height:900}],['mobile',{width:390,height:844}]]){
   const page=await browser.newPage({viewport});const errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text)});
   await page.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin!==origin){external.push(url.origin);return route.abort()}return route.continue()});
   await page.goto(origin);await page.waitForFunction(()=>document.querySelector('#count').textContent==='1026 books');assert.equal(await page.locator('.card').count(),120);assert.equal(await page.locator('img').count(),0);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.getByRole('button',{name:'Show more books'}).click();assert.equal(await page.locator('.card').count(),240);
   await page.locator('#q').fill('dahl');assert.ok(parseInt(await page.locator('#count').innerText())>0);
   await page.locator('#q').fill('wimpy kid');assert.ok(parseInt(await page.locator('#count').innerText())>0);
   await page.locator('#q').fill('zzzz-no-such-book');assert.equal(await page.locator('#count').innerText(),'0 books');assert.ok(await page.locator('#empty').isVisible());
   await page.locator('#q').fill('');const chip=page.locator('#chips .chip').nth(1);await chip.click();assert.equal(await chip.getAttribute('aria-pressed'),'true');assert.ok(parseInt(await page.locator('#count').innerText())<1026);
   await page.locator('#chips .chip').first().click();assert.equal(await page.locator('#count').innerText(),'1026 books');
   await page.locator('.card').first().click();assert.ok(await page.locator('dialog[open]').isVisible());assert.ok((await page.locator('#dbody').innerText()).includes('Publisher'));await page.keyboard.press('Escape');assert.equal(await page.locator('dialog[open]').count(),0);assert.equal(new URL(page.url()).hash,'');
   await page.locator('.card').first().focus();await page.keyboard.press('Enter');assert.ok(await page.locator('dialog[open]').isVisible());await page.getByRole('button',{name:'Close',exact:true}).click();assert.equal(await page.locator('dialog[open]').count(),0);
   await page.goto(origin+'/#book-169');await page.waitForSelector('dialog[open]');assert.ok((await page.locator('#dbody').innerText()).includes('978-1-84236-878-7'));await page.getByRole('button',{name:'Close',exact:true}).click();
   assert.deepEqual(errors,[]);assert.deepEqual(external,[]);reports.push({viewport:label,checks:14,errors,external_requests:external.length});await page.close();
  }
  const page=await browser.newPage();let external=0;await page.route('**/*',route=>{if(new URL(route.request().url()).origin!==origin){external++;return route.abort()}return route.continue()});
  await page.route('**/books.json',route=>route.fulfill({contentType:'application/json',body:JSON.stringify([{...originals[0],title:'<img src=x onerror=alert(1)>',cover:'https://example.invalid/image.jpg',subjects:['__proto__']}])}));
  await page.goto(origin);await page.waitForFunction(()=>document.querySelector('#count').textContent==='1 book');assert.equal(await page.locator('img').count(),0);assert.ok((await page.locator('.card').innerText()).includes('<img'));assert.equal(external,0);reports.push({fixture:'escaped text, prototype-like subject, remote cover ignored',passed:true});
  await page.unroute('**/books.json');await page.route('**/books.json',route=>route.fulfill({contentType:'application/json',body:JSON.stringify([{...originals[0],id:'bad'}])}));await page.reload();await page.waitForFunction(()=>document.querySelector('#empty').textContent.includes('could not load'));assert.equal(await page.locator('.card').count(),0);reports.push({fixture:'invalid data fails closed',passed:true});
  console.log(JSON.stringify({passed:true,reports},null,2));
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
