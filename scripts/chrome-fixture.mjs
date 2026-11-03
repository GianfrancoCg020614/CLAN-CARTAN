import {spawn} from 'node:child_process';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));

// Wait for the actual asynchronous result. Virtual time can finish while Blob I/O is pending.
export async function runChromeFixture(chrome,file,marker,{timeout=25000}={}){
 const browser=spawn(chrome,['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
  '--no-first-run','--remote-debugging-port=0','--window-size=390,844',
  '--user-data-dir='+path.join(path.dirname(file),'chrome-profile'),'about:blank'],
  {stdio:['ignore','ignore','pipe']});
 let socket;
 const deadline=Date.now()+timeout;
 try{
  let log='';
  const endpoint=await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('Chrome did not open DevTools: '+log.slice(-600))),5000);
   browser.once('error',error=>{clearTimeout(timer);reject(error);});
   browser.once('exit',code=>{clearTimeout(timer);reject(Error('Chrome exited: '+code+' '+log.slice(-600)));});
   browser.stderr.on('data',chunk=>{
    log=(log+chunk.toString()).slice(-12000);
    const found=log.match(/DevTools listening on (ws:\/\/[^\s]+)/);
    if(found){clearTimeout(timer);resolve(found[1]);}
   });
  });
  const debug=new URL(endpoint);
  const targetResponse=await fetch('http://'+debug.host+'/json/new?'+pathToFileURL(file).href,
   {method:'PUT',signal:AbortSignal.timeout(5000)});
  if(!targetResponse.ok)throw Error('Cannot open Chrome fixture: '+targetResponse.status);
  const target=await targetResponse.json();
  socket=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('DevTools WebSocket timed out')),5000);
   socket.addEventListener('open',()=>{clearTimeout(timer);resolve();},{once:true});
   socket.addEventListener('error',()=>{clearTimeout(timer);reject(Error('DevTools connection failed'));},{once:true});
  });
  let serial=0;
  const pending=new Map();
  socket.addEventListener('message',event=>{
   const message=JSON.parse(event.data);
   const callback=pending.get(message.id);
   if(callback){pending.delete(message.id);callback(message);}
  });
  async function evaluate(expression){
   const id=++serial;
   const reply=await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{pending.delete(id);reject(Error('Chrome evaluation timed out'));},3000);
    pending.set(id,message=>{clearTimeout(timer);resolve(message);});
    socket.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression,returnByValue:true}}));
   });
   if(reply.error||reply.result?.exceptionDetails)throw Error('Chrome evaluation failed: '+JSON.stringify(reply));
   return reply.result?.result?.value;
  }
  while(Date.now()<deadline){
   const output=await evaluate('document.getElementById('+JSON.stringify(marker)+')?.outerHTML || ""');
   if(output)return output;
   await pause(50);
  }
  throw Error('Fixture did not finish: '+await evaluate('document.body?.innerHTML.slice(-2000)'));
 }finally{
  socket?.close();
  if(browser.exitCode===null){
   browser.kill('SIGTERM');
   for(let i=0;i<20&&browser.exitCode===null;i++)await pause(50);
   if(browser.exitCode===null)browser.kill('SIGKILL');
  }
 }
}
