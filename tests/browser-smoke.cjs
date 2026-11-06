// Optional browser QA: install Playwright separately; the application itself has no dependencies.
const {chromium}=require('playwright');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const screenshotDir=path.join(root,'browser-results');
fs.mkdirSync(screenshotDir,{recursive:true});
const originals=JSON.parse(fs.readFileSync(path.join(root,'books.json'),'utf8'));
const deepLinkBook=originals.find(book=>book.id===169);
const otherBook=originals.find(book=>book.id!==169);

async function waitForBook(page,book){
 await page.waitForFunction(({id,title})=>document.querySelector('#dlg').open &&
  location.hash==='#book-'+id && document.querySelector('#dtitle')?.textContent===title,
  {id:book.id,title:book.title});
 assert.ok(await page.locator('dialog[open]').isVisible());
 if(book.isbn)assert.ok((await page.locator('#dbody').innerText()).includes(book.isbn));
}
async function waitForClosed(page,hash=''){
 await page.waitForFunction(hash=>!document.querySelector('#dlg').open && location.hash===hash,hash);
 assert.equal(await page.locator('dialog[open]').count(),0);
}
async function dismiss(page,action){
 // A removed open attribute precedes the native close event. Wait for both.
 const before=await page.evaluate(()=>window.catalogueCloseEvents);
 await action();
 await page.waitForFunction(before=>window.catalogueCloseEvents>before,before);
 await waitForClosed(page);
}
async function instrument(page){
 const errors=[],external=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});
 await page.addInitScript(()=>{
  window.catalogueCloseEvents=0;
  document.addEventListener('close',()=>window.catalogueCloseEvents++,true);
 });
 return {errors,external};
}
(async()=>{
 const server=http.createServer((req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname;
  if(name==='/favicon.ico'){res.writeHead(204);return res.end()}
  const file=name==='/'?'index.html':name==='/books.json'?'books.json':null;
  if(!file){res.writeHead(404);return res.end('Not found')}
  res.setHeader('Content-Type',file.endsWith('.json')?'application/json':'text/html; charset=utf-8');
  res.end(fs.readFileSync(path.join(root,file)));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin=`http://127.0.0.1:${server.address().port}`;
 let browser;const reports=[];
 try{
  const options={headless:true};
  if(process.env.CHROMIUM_EXECUTABLE)options.executablePath=process.env.CHROMIUM_EXECUTABLE;
  browser=await chromium.launch(options);
  for(const [label,viewport] of [['desktop',{width:1280,height:900}],['mobile',{width:390,height:844}]]){
   const page=await browser.newPage({viewport});
   const {errors,external}=await instrument(page);
   await page.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.origin!==origin){external.push(url.origin);return route.abort()}
    return route.continue();
   });
   let stage='initial catalogue';
   try{
    await page.goto(origin);
    await page.waitForFunction(()=>document.querySelector('#count').textContent==='1026 books');
    assert.equal(await page.locator('.card').count(),120);
    assert.equal(await page.locator('img').count(),0);
    await page.screenshot({path:path.join(screenshotDir,`${label}-catalogue.png`),fullPage:true});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);

    stage='pagination, search and filters';
    await page.getByRole('button',{name:'Show more books'}).click();
    assert.equal(await page.locator('.card').count(),240);
    await page.locator('#q').fill('dahl');
    assert.ok(parseInt(await page.locator('#count').innerText())>0);
    await page.locator('#q').fill('wimpy kid');
    assert.ok(parseInt(await page.locator('#count').innerText())>0);
    await page.locator('#q').fill('zzzz-no-such-book');
    assert.equal(await page.locator('#count').innerText(),'0 books');
    assert.ok(await page.locator('#empty').isVisible());
    await page.locator('#q').fill('');
    const chip=page.locator('#chips .chip').nth(1);
    await chip.click();assert.equal(await chip.getAttribute('aria-pressed'),'true');
    assert.ok(parseInt(await page.locator('#count').innerText())<1026);
    await page.locator('#chips .chip').first().click();
    assert.equal(await page.locator('#count').innerText(),'1026 books');

    stage='details and Escape';
    await page.locator('.card').first().click();
    await waitForBook(page,originals[0]);
    assert.ok((await page.locator('#dbody').innerText()).includes('Publisher'));
    await page.screenshot({path:path.join(screenshotDir,`${label}-details.png`)});
    await dismiss(page,()=>page.keyboard.press('Escape'));

    stage='keyboard activation and Close';
    await page.locator('.card').first().focus();
    await page.keyboard.press('Enter');await waitForBook(page,originals[0]);
    await dismiss(page,()=>page.getByRole('button',{name:'Close',exact:true}).click());

    stage='same-document deep link';
    await page.goto(origin+'/#book-169');await waitForBook(page,deepLinkBook);
    await dismiss(page,()=>page.getByRole('button',{name:'Close',exact:true}).click());

    stage='Back and Forward navigation';
    await page.goto(origin+'/#book-169');await waitForBook(page,deepLinkBook);
    await page.goBack();await waitForClosed(page);
    await page.goForward();await waitForBook(page,deepLinkBook);
    await page.goto(origin+'/#book-'+otherBook.id);await waitForBook(page,otherBook);
    await page.goto(origin+'/#book-999999');await waitForClosed(page,'#book-999999');
    await page.goto(origin+'/#book-169');await waitForBook(page,deepLinkBook);
    await page.goto(origin+'/#about');await waitForClosed(page,'#about');

    stage='rapid close followed by a newer fragment';
    for(let i=0;i<3;i++){
     await page.goto(origin+'/#book-169');await waitForBook(page,deepLinkBook);
     const before=await page.evaluate(()=>window.catalogueCloseEvents);
     // Deliberately navigate before the asynchronous native close event arrives.
     await page.evaluate(id=>{
      document.querySelector('#dclose').click();
      location.hash='#book-'+id;
     },otherBook.id);
     await page.waitForFunction(before=>window.catalogueCloseEvents>before,before);
     await waitForBook(page,otherBook);
    }

    stage='rapid close and reopen the same book';
    const before=await page.evaluate(()=>window.catalogueCloseEvents);
    await page.evaluate(id=>{
     document.querySelector('#dclose').click();
     document.querySelector(`.card[data-id="${id}"]`).click();
    },otherBook.id);
    await page.waitForFunction(before=>window.catalogueCloseEvents>before,before);
    await waitForBook(page,otherBook);

    stage='backdrop dismissal';
    await dismiss(page,()=>page.mouse.click(1,1));
    stage='initial-load deep link';
    // Force a new document, separately from the same-document navigation above.
    await page.goto('about:blank');
    await page.goto(origin+'/#book-169');await waitForBook(page,deepLinkBook);
    await dismiss(page,()=>page.keyboard.press('Escape'));
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
    reports.push({viewport:label,flows:['pagination','search','subject filters','details','Escape','keyboard activation','Close','same-document deep links','Back and Forward','invalid fragments','rapid newer navigation','rapid reopen','backdrop','initial deep link'],errors,external_requests:external.length});
   }catch(error){
    await page.screenshot({path:path.join(screenshotDir,`${label}-failure.png`)}).catch(()=>{});
    console.error(JSON.stringify({viewport:label,stage,url:page.url(),errors,external,
     state:await page.evaluate(()=>({hash:location.hash,open:document.querySelector('#dlg')?.open,title:document.querySelector('#dtitle')?.textContent,closeEvents:window.catalogueCloseEvents})).catch(()=>null)}));
    throw error;
   }finally{await page.close()}
  }
  const page=await browser.newPage();const {errors,external}=await instrument(page);
  await page.route('**/*',route=>{
   if(new URL(route.request().url()).origin!==origin){external.push(route.request().url());return route.abort()}
   return route.continue();
  });
  await page.route('**/books.json',route=>route.fulfill({contentType:'application/json',body:JSON.stringify([{...originals[0],title:'<img src=x onerror=alert(1)>',cover:'https://example.invalid/image.jpg',subjects:['__proto__']}])}));
  await page.goto(origin);
  await page.waitForFunction(()=>document.querySelector('#count').textContent==='1 book');
  assert.equal(await page.locator('img').count(),0);
  assert.ok((await page.locator('.card').innerText()).includes('<img'));
  assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
  reports.push({fixture:'escaped text, prototype-like subject, remote cover ignored',passed:true});
  await page.unroute('**/books.json');
  await page.route('**/books.json',route=>route.fulfill({contentType:'application/json',body:JSON.stringify([{...originals[0],id:'bad'}])}));
  await page.reload();
  await page.waitForFunction(()=>document.querySelector('#empty').textContent.includes('could not load'));
  assert.equal(await page.locator('.card').count(),0);
  assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
  reports.push({fixture:'invalid data fails closed',passed:true});
  console.log(JSON.stringify({passed:true,reports},null,2));
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
