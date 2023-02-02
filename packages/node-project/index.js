import init from "emscripten-project/dist/TestApplication.js";
import workerSrc from "worker-project";

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
  const myThread = setupThread(Module, workerSrc.default);
  setInterval(async () => {
    await callThread(Module, myThread, "asd");
    console.log("done");
  }, 1000);
});
