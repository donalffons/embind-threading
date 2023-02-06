import init from "emscripten-project/dist/TestApplication.js";

const loadThread = (Module, thread, url) => new Promise(res => {
  Atomics.waitAsync(Module.HEAP32, thread.getAliveAddress() / 4, 0).value.then(res);
  thread.load(url);
});

const runThreadFunction = (Module, thread, name) => new Promise(res => {
  Atomics.waitAsync(Module.HEAP32, thread.getAliveAddress() / 4, 1).value.then(res);
  thread.run(name);
});

const killThread = (Module, thread) => new Promise(res => {
  Atomics.waitAsync(Module.HEAP32, thread.getAliveAddress() / 4, 1).value.then(res);
  thread.kill();
});


init().then(async Module => {
  console.log(Date.now(), "Spawning thread");
  const myThread = new Module.MyThread();

  await loadThread(Module, myThread, "thread.js");
  console.log(Date.now(), "after load");

  await new Promise(res => setTimeout(res, 1000));

  await runThreadFunction(Module, myThread, "myThreadFunction");
  console.log(Date.now(), "after run");

  await new Promise(res => setTimeout(res, 1000));

  await killThread(Module, myThread);
  console.log(Date.now(), "after kill. bye.");
});
