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

long performWork() {
  int *i = new int;
  return reinterpret_cast<long>(i);
}

EM_JS(void, loadThread, (long threadMemAddress), {
  const thread = Module.MyThread.fromMemAddress(threadMemAddress);
  globalThis.thread = thread;
  importScripts("thread.js");
  console.log(performance.now(), "Hello from thread");
  globalThis.waitForRequest = function() {
    return new Promise(function(res) {
      Atomics.waitAsync(Module.HEAP32, thread.getRequestAddress() / 4, 0)
          .value.then(function(){res(thread.request)});
      thread.state = 1;
      Atomics.notify(Module.HEAP32, thread.getStateAddress() / 4);
    });
  };
  globalThis.requestHandler = async function() {
    console.log(performance.now(), "Thread waiting for request");
    await waitForRequest();
    console.log(performance.now(), "thread received request", thread.request);
    if (thread.request == -1) {
      console.log(performance.now(), "exiting thread");
      thread.state = -1;
      Atomics.notify(Module.HEAP32, thread.getStateAddress() / 4);
    } else {
      console.log(performance.now(), "executing function");
      globalThis[thread.runName](thread.runArg).then(function(res) {
        thread.runName = "";
        thread.runArg = "";
        thread.runRet = res;
        setTimeout(
            function() { requestHandler(); }, 0);
      });
    }
    thread.request = 0;
  };
  requestHandler();
});

void *threadFunc(void *arg) {
  loadThread(reinterpret_cast<long>(arg));
  return nullptr;
}

struct MyThread {
public:
  std::thread thread;
  MyThread() : request(0), state(0), runName("") {}
  void load() { thread = std::thread(threadFunc, this); }
  // request
  // -1 - kill
  //  1 - run function
  int request;
  // state
  //  0 - before load
  //  1 - loaded and ready to handle request / handling request
  // -1 - killed
  int state;
  std::string runName;
  std::string runArg;
  std::string runRet;
  static MyThread *fromMemAddress(long address) {
    return static_cast<MyThread *>(reinterpret_cast<MyThread *>(address));
  }
  void detach() { thread.detach(); }
  void join() { thread.join(); }
};

EMSCRIPTEN_BINDINGS(OCJS) {
  function("performWork", &performWork);
  class_<MyThread>("MyThread")
      .constructor<>()
      .function("detach", &MyThread::detach)
      .function("join", &MyThread::join)
      .function("load", &MyThread::load)
      .function("getRequestAddress",
                std::function<long(MyThread &)>([](MyThread &that) -> long {
                  return reinterpret_cast<long>(&that.request);
                }))
      .function("getStateAddress",
                std::function<long(MyThread &)>([](MyThread &that) -> long {
                  return reinterpret_cast<long>(&that.state);
                }))
      .property("request", &MyThread::request)
      .property("state", &MyThread::state)
      .property("runName", &MyThread::runName)
      .property("runArg", &MyThread::runArg)
      .property("runRet", &MyThread::runRet)
      .class_function("fromMemAddress", &MyThread::fromMemAddress,
                      allow_raw_pointers());
}
