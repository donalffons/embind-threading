import init from "emscripten-project/dist/TestApplication.js";

const loadThread = (Module, thread, url) => new Promise(res => {
  Atomics.waitAsync(Module.HEAP32, thread.getStateAddress() / 4, 0).value.then(res);
  thread.url = url;
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

  const threads = Array(10).fill(null).map(() => new Module.MyThread());
  await Promise.all(threads.map(thread => loadThread(Module, thread, "../worker-project/dist/index.js")));
  console.log(performance.now(), "done loading");
  await Promise.all(threads.map(thread => requestThread(Module, thread, 1, "myThreadFunction", "bla")));
  console.log(performance.now(), "done executing");
  await Promise.all(threads.map(thread => requestThread(Module, thread, 1, "myThreadFunction", "bla")));
  console.log(performance.now(), "done executing");
  await Promise.all(threads.map(thread => requestThread(Module, thread, -1)));
  console.log(performance.now(), "done killing");
  threads.map(thread => thread.join());
});
