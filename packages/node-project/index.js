import init from "emscripten-project/dist/TestApplication.js";

init().then(async Module => {
  console.log(Date.now(), "Spawning thread");
  const myThread = new Module.MyThread();
  Atomics.waitAsync(Module.HEAP32, myThread.getAliveAddress() / 4, 0).value.then(async () => {
    console.log(Date.now(), "after load");
    await new Promise(res => setTimeout(res, 1000));

    Atomics.waitAsync(Module.HEAP32, myThread.getAliveAddress() / 4, 1).value.then(async () => {
      console.log(Date.now(), "after run");
      await new Promise(res => setTimeout(res, 1000));

      Atomics.waitAsync(Module.HEAP32, myThread.getAliveAddress() / 4, 1).value.then(async () => {
        console.log(Date.now(), "after kill. bye.");
      });
      myThread.kill();
      await new Promise(res => setTimeout(res, 5000));
    });
    myThread.run("myThreadFunction");
  });
  myThread.load("thread.js");
});
