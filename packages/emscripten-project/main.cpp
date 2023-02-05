#include <emscripten.h>
#include <emscripten/bind.h>
#include <iostream>
using namespace emscripten;
#include <atomic>
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

EM_ASYNC_JS(void, jsThreadFunc, (EM_VAL val_handle, long threadMemAddress), {
  globalThis.thread = Module.MyThread.fromMemAddress(threadMemAddress);
  importScripts(Emval.toValue(val_handle));
  await runThread();
});

void *threadFunc(void *arg) {
  ThreadFuncArgs *tfArgs = static_cast<ThreadFuncArgs *>(arg);
  jsThreadFunc(emscripten::val(tfArgs->msg).as_handle(),
               reinterpret_cast<long>(tfArgs->thread));
  delete tfArgs;
  std::cout << "-- THREAD EXIT --" << std::endl;
  return nullptr;
}

void runInThread(std::string msg) {
  ThreadFuncArgs *args = new ThreadFuncArgs({msg});
  std::thread t(threadFunc, args);
  t.detach();
}

void runOnMainThread(std::string msg) { emscripten_run_script(msg.c_str()); }

struct MyThread {
public:
  MyThread() : lock(0) {}
  void load(std::string url) {
    ThreadFuncArgs *args = new ThreadFuncArgs({url, this});
    std::thread t(threadFunc, args);
    t.detach();
  }
  int lock;
  std::string arg;
  std::string ret;
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
      .function("getLockAddress",
                std::function<long(MyThread &)>([](MyThread &that) -> long {
                  return reinterpret_cast<long>(&that.lock);
                }))
      .property("lock", &MyThread::lock)
      .property("arg", &MyThread::arg)
      .property("ret", &MyThread::ret)
      .class_function("fromMemAddress", &MyThread::fromMemAddress,
                      allow_raw_pointers());
}
