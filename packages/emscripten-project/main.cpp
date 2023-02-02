#include <emscripten.h>
#include <emscripten/bind.h>
#include <iostream>
using namespace emscripten;
#include <functional>
#include <pthread.h>
#include <thread>
#include <typeinfo>

pthread_t threadId;

struct RunInThreadResult {
  int *lock;
  std::string result;
};

struct ThreadFuncArgs {
  RunInThreadResult res;
  std::string msg;
};

void *threadFunc(void *arg) {
  ThreadFuncArgs *tfArgs = static_cast<ThreadFuncArgs *>(arg);
  emscripten_run_script(tfArgs->msg.c_str());
  emscripten_run_script(
      (std::string(";console.log(\"finished\"); Atomics.notify(HEAP32, ") +
       std::to_string(reinterpret_cast<long>(tfArgs->res.lock) / 4) + ");")
          .c_str());
  delete tfArgs->res.lock;
  delete tfArgs;
  return NULL;
}

RunInThreadResult runInThread(std::string msg) {
  RunInThreadResult res({new int(0), ""});
  int err = pthread_create(&threadId, NULL, &threadFunc,
                           new ThreadFuncArgs({res, msg}));
  err = pthread_detach(threadId);
  return res;
}

void runOnMainThread(std::string msg) { emscripten_run_script(msg.c_str()); }

class Blubb {
public:
  Blubb() {}
};

struct MyThread {
public:
  MyThread() : invocationLock(0), finalizationLock(0) {}
  int invocationLock;
  int finalizationLock;
  std::string arg;
  std::string res;
  static MyThread *fromMemAddress(long address) {
    return static_cast<MyThread *>(reinterpret_cast<MyThread *>(address));
  }
};

EMSCRIPTEN_BINDINGS(OCJS) {
  function("runInThread", &runInThread);
  function("runOnMainThread", &runOnMainThread);
  class_<RunInThreadResult>("RunInThreadResult")
      .smart_ptr_constructor(
          "std::shared<RunInThreadResult>", optional_override([]() {
            return std::shared_ptr<RunInThreadResult>(new RunInThreadResult());
          }))
      .function("getLock", std::function<long(RunInThreadResult &)>(
                               [](RunInThreadResult &that) -> long {
                                 return reinterpret_cast<long>(that.lock);
                               }))
      .property("result", &RunInThreadResult::result);
  class_<Blubb>("Blubb").constructor();
  class_<MyThread>("MyThread")
      .constructor()
      .function("getInvocationLockAddress",
                std::function<long(MyThread &)>([](MyThread &that) -> long {
                  return reinterpret_cast<long>(&that.invocationLock) / 4;
                }))
      .function("getFinalizationLockAddress",
                std::function<long(MyThread &)>([](MyThread &that) -> long {
                  return reinterpret_cast<long>(&that.finalizationLock) / 4;
                }))
      .property("arg", &MyThread::arg)
      .property("res", &MyThread::res)
      .class_function("fromMemAddress", &MyThread::fromMemAddress,
                      allow_raw_pointers());
}
