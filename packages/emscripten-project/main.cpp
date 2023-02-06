#include <emscripten.h>
#include <emscripten/bind.h>
#include <iostream>
using namespace emscripten;
#include <atomic>
#include <chrono>
#include <emscripten/eventloop.h>
#include <emscripten/proxying.h>
#include <functional>
#include <pthread.h>
#include <string>
#include <thread>
#include <typeinfo>

pthread_t threadId;

class MyThread;

struct ThreadFuncArgs {
  std::string msg;
  MyThread *thread;
};

EM_JS(void, loadThread, (EM_VAL val_handle, long threadMemAddress), {
  const thread = Module.MyThread.fromMemAddress(threadMemAddress);
  globalThis.thread = thread;
  importScripts(Emval.toValue(val_handle));
  let state = 1;
  Atomics.store(Module.HEAP32, thread.getAliveAddress() / 4, 1);
  Atomics.notify(Module.HEAP32, thread.getAliveAddress() / 4);
  do {
    Atomics.wait(Module.HEAP32, thread.getAliveAddress() / 4, 1);
    state = Atomics.load(Module.HEAP32, thread.getAliveAddress() / 4);
    if (state == 2) {
      console.log(Date.now(), "run function", thread.runName);
      globalThis[thread.runName]();
      thread.runName = "";
      Atomics.store(Module.HEAP32, thread.getAliveAddress() / 4, 1);
      Atomics.notify(Module.HEAP32, thread.getAliveAddress() / 4);
    }
  } while (state != -1);
});

void *threadFunc(void *arg) {
  ThreadFuncArgs *tfArgs = static_cast<ThreadFuncArgs *>(arg);
  loadThread(emscripten::val(tfArgs->msg).as_handle(),
             reinterpret_cast<long>(tfArgs->thread));
  delete tfArgs;
  std::cout << "-- THREAD EXIT --" << std::endl;
  return nullptr;
}

void runInThread(std::string msg) {
  ThreadFuncArgs *args = new ThreadFuncArgs({msg});
  std::thread t(threadFunc, args);
  t.join();
}

void runOnMainThread(std::string msg) { emscripten_run_script(msg.c_str()); }

struct MyThread {
public:
  MyThread() : alive(0), runName("") {}
  void load(std::string url) {
    ThreadFuncArgs *args = new ThreadFuncArgs({url, this});
    std::thread t(threadFunc, args);
    t.detach();
  }
  void kill() {
    EM_ASM(
        {
          const thread = Module.MyThread.fromMemAddress($0);
          Atomics.store(Module.HEAP32, thread.getAliveAddress() / 4, -1);
          Atomics.notify(Module.HEAP32, thread.getAliveAddress() / 4);
        },
        this);
  }
  void run(std::string name) {
    runName = name;
    EM_ASM(
        {
          const thread = Module.MyThread.fromMemAddress($0);
          Atomics.store(Module.HEAP32, thread.getAliveAddress() / 4, 2);
          Atomics.notify(Module.HEAP32, thread.getAliveAddress() / 4);
        },
        this);
  }
  int alive;
  std::string runName;
  static MyThread *fromMemAddress(long address) {
    return static_cast<MyThread *>(reinterpret_cast<MyThread *>(address));
  }
};

EMSCRIPTEN_BINDINGS(OCJS) {
  function("runInThread", &runInThread);
  function("runOnMainThread", &runOnMainThread);
  class_<MyThread>("MyThread")
      .constructor<>()
      .function("load", &MyThread::load)
      .function("run", &MyThread::run)
      .function("kill", &MyThread::kill)
      .function("getAliveAddress",
                std::function<long(MyThread &)>([](MyThread &that) -> long {
                  return reinterpret_cast<long>(&that.alive);
                }))
      .property("alive", &MyThread::alive)
      .property("runName", &MyThread::runName)
      .class_function("fromMemAddress", &MyThread::fromMemAddress,
                      allow_raw_pointers());
}
