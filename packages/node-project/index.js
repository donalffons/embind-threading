import init from "emscripten-project/dist/TestApplication.js";
import workerSrc from "worker-project";
import { Lock, Cond } from "lock";

const LockCode = `if(!Atomics)throw"Incompatible embedding: Atomics object not available";Atomics.wake&&!Atomics.notify&&(Atomics.notify=Atomics.wake);let _checkParameters=function(o,t,i,e){if(!(o instanceof SharedArrayBuffer&&(0|t)==t&&t>=0&&t%i.ALIGN==0&&t+i.NUMBYTES<=o.byteLength))throw new Error("Bad arguments to "+e+": "+o+" "+t)};function Lock(o,t){_checkParameters(o,t,Lock,"Lock constructor"),this._iab=new Int32Array(o),this._ibase=t>>>2}function Cond(o,t){_checkParameters(o instanceof Lock?o._iab.buffer:o,t,Cond,"Cond constructor"),this._iab=o._iab,this._ibase=t>>>2,this.lock=o}Lock.initialize=function(o,t){return _checkParameters(o,t,Lock,"Lock initializer"),Atomics.store(new Int32Array(o,t,1),0,0),t},Lock.NUMBYTES=4,Lock.ALIGN=4,Lock.prototype.lock=function(){const o=this._iab,t=this._ibase;let i;if(0!=(i=Atomics.compareExchange(o,t,0,1)))do{2!=i&&0==Atomics.compareExchange(o,t,1,2)||Atomics.wait(o,t,2)}while(0!=(i=Atomics.compareExchange(o,t,0,2)))},Lock.prototype.tryLock=function(){const o=this._iab,t=this._ibase;return 0==Atomics.compareExchange(o,t,0,1)},Lock.prototype.unlock=function(){const o=this._iab,t=this._ibase;1!=Atomics.sub(o,t,1)&&(Atomics.store(o,t,0),Atomics.notify(o,t,1))},Lock.prototype.toString=function(){return"{/*Lock*/ loc:"+4*this._ibase+"}"},Lock.prototype.serialize=function(){return{isLockObject:!0,sab:this._iab.buffer,loc:4*this._ibase}},Lock.deserialize=function(o){return"object"==typeof o&&null!=o&&o.isLockObject?new Lock(o.sab,o.loc):null},Cond.initialize=function(o,t){return _checkParameters(o,t,Cond,"Cond initializer"),Atomics.store(new Int32Array(o,t,1),0,0),t},Cond.NUMBYTES=4,Cond.ALIGN=4,Cond.prototype.wait=function(){const o=this._iab,t=this._ibase,i=Atomics.load(o,t),e=this.lock;e.unlock(),Atomics.wait(o,t,i),e.lock()},Cond.prototype.notifyOne=function(){const o=this._iab,t=this._ibase;Atomics.add(o,t,1),Atomics.notify(o,t,1)},Cond.prototype.notifyAll=function(){const o=this._iab,t=this._ibase;Atomics.add(o,t,1),Atomics.notify(o,t)},Cond.prototype.wakeOne=Cond.prototype.notifyOne,Cond.prototype.wakeAll=Cond.prototype.notifyAll,Cond.prototype.toString=function(){return"{/*Cond*/ loc:"+4*this._ibase+" lock:"+this.lock+"}"},Cond.prototype.serialize=function(){return{isCondObject:!0,lock:this.lock.serialize(),loc:4*this._ibase}},Cond.deserialize=function(o){if("object"!=typeof o||null==o||!o.isCondObject)return null;let t=Lock.deserialize(o.lock);return t?new Cond(t,o.loc):null},"object"==typeof exports&&"object"==typeof module?module.exports={Lock:Lock,Cond:Cond}:"function"==typeof define&&define.amd?define([],(function(){return{Lock:Lock,Cond:Cond}})):"object"==typeof exports&&(exports.Lock=Lock,exports.Cond=Cond);`;

const setupThread = (Module, workerSrc) => {
  const myThread = new Module.MyThread();
  Module.runInThread(`
    const exports = {};
    ${workerSrc};
    const myThread = Module.MyThread.fromMemAddress(${myThread.$$.ptr});
    (async () => {
      while (true) {
        const result = Atomics.wait(Module.HEAP32, myThread.getInvocationLockAddress(), 0);
        myThread.res = "";
        myThread.res = await exports.default(Module, myThread.arg) ?? "";
        myThread.arg = "";
        Atomics.notify(Module.HEAP32, myThread.getFinalizationLockAddress());
      }
    })();
  `);
  return myThread;
};

const callThread = (Module, myThread, arg) => new Promise(res => {
  myThread.arg = arg;
  Atomics.waitAsync(Module.HEAP32, myThread.getFinalizationLockAddress(), 0).value.then(r => {
    console.log("Done from main thread", myThread.res, Date.now());
    res();
  });
  console.log("Starting thread", Date.now());
  Atomics.notify(Module.HEAP32, myThread.getInvocationLockAddress());
});

init().then(async Module => {
  console.log(Date.now(), "Spawning thread");
  const myThread = new Module.MyThread();
  Atomics.waitAsync(Module.HEAP32, myThread.getLockAddress() / 4, 0).value.then(async state => {
    console.log(Date.now(), "After spawning thread");
    await new Promise(res => setTimeout(res, 1000));
    Atomics.waitAsync(Module.HEAP32, myThread.getLockAddress() / 4, 1).value.then(async state => {
      console.log(Date.now(), "finished call, back to main thread");
      await new Promise(res => setTimeout(res, 1000));
      console.log(Date.now(), "thread returned", myThread.ret);
      console.log(Date.now(), "exiting");
      Atomics.store(Module.HEAP32, myThread.getLockAddress() / 4, 3);
      Atomics.notify(Module.HEAP32, myThread.getLockAddress() / 4);
    });
    console.log(Date.now(), "calling");
    Atomics.store(Module.HEAP32, myThread.getLockAddress() / 4, 2);
    Atomics.notify(Module.HEAP32, myThread.getLockAddress() / 4);
  });
  myThread.load("thread.js");
  await new Promise(res => setTimeout(res, 5000));
});
