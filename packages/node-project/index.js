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

  const thread = new Module.MyThread();
  await loadThread(Module, thread);
  console.log(performance.now(), "done loading");
  await requestThread(Module, thread, 1, "myThreadFunction", "bla");
  console.log(performance.now(), "done executing", thread.runRet);
  await requestThread(Module, thread, -1);
  console.log(performance.now(), "done killing");
  thread.join();
});
