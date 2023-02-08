import init from "emscripten-project/dist/TestApplication.js";

const loadThread = (Module, thread) => new Promise(res => {
  Atomics.waitAsync(Module.HEAP32, thread.getStateAddress() / 4, 0).value.then(res);
  thread.load();
});

const requestThread = (Module, thread, request, runName, runArg) => new Promise(res => {
  Atomics.waitAsync(Module.HEAP32, thread.getStateAddress() / 4, 1).value.then(res);
  thread.request = request;
  if (runName) {
    thread.runName = runName;
  }
  if (runArg) {
    thread.runArg = runArg ?? "";
  }
  Atomics.notify(Module.HEAP32, thread.getRequestAddress() / 4);
});

init().then(async Module => {
  console.log(performance.now(), "Spawning thread");

  const threads = Array(5).fill(null).map(() => new Module.MyThread());
  await Promise.all(threads.map(thread => loadThread(Module, thread)));
  console.log(performance.now(), "done loading");
  await Promise.all(threads.map(thread => requestThread(Module, thread, 1, "myThreadFunction", "bla")));
  console.log(performance.now(), "done executing", threads[0].runRet, threads[1].runRet);
  await Promise.all(threads.map(thread => requestThread(Module, thread, -1)));
  console.log(performance.now(), "done killing");
  threads.map(thread => thread.join());
});
