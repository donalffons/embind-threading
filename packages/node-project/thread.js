// states:
//    - 0 not ready
//    - 1 waiting
//    - 2 executing
//    - 3 tearing down

async function runThread() {
  console.log(Date.now(), "Hello from thread");
  while (true) {
    Atomics.store(Module.HEAP32, thread.getLockAddress() / 4, 1);
    Atomics.notify(Module.HEAP32, thread.getLockAddress() / 4);
    console.log(Date.now(), "Thread waiting for signal");
    const res = Atomics.wait(Module.HEAP32, thread.getLockAddress() / 4, 1);
    if (res !== "ok") {
      throw new Error(`Got "${res}" while waiting for thread lock`);
    }
    const state = Atomics.load(Module.HEAP32, thread.getLockAddress() / 4);
    if (state === 2) { // execute
      console.log(Date.now(), "thread running with arg", thread.arg);
      thread.ret = `${Math.random()}`;
    } else if (state === 3) { // quit
      console.log(Date.now(), "received signal to quit thread");
      return;
    } else {
      throw new Error(`Got "${state}" as thread state signal`);
    }
  }
}
