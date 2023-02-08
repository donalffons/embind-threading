# Embind-threading

This is a proof-of-concept on how to integrate proper multi-threading from JavaScript with Emscripten's Embind.

Some notes:

- My first approach to this was to manually create worker-threads, postMessage Emscripten's WasmMemory to them and the initialize Emscripten in each thread while passing the wasmMemory in the Module parameter. That approach works for a trivial example, but quickly runs into issues, see [here](https://github.com/emscripten-core/emscripten/issues/17372). Instead, Emscripten recommends that all threads should be managed by Emscripten itself.
- Therefore, this repository relies on pthreads to spawn the worker threads
- Inter-thread communication is done via atomics and should therefore be very fast
- The state of global variables in a thread is preserved.
- Arbitrary functions can be executed on the thread consecutively. Functions can be async. The calling thread can await completion of the function call.
- This implementation requires Atomics.waitAsync, which is not supported on Firefox and Chrome. It should however be possible to polyfill this feature using periodic polling (keeping careful attention on not missing any state updates).

This is just a proof-of-concept. There is currently no error handling here... And there is probably a good amount of bugs in this repo.
