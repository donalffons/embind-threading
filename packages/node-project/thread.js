async function myThreadFunction(arg) {
  console.log(performance.now(), "Hello from thread, waiting", arg);
  await new Promise(res => setTimeout(res, 1000));
  console.log(performance.now(), "Let's go");
  for (let i = 0; i < 10000000;
    i++) { // reducing the loop count makes the error go away
    // (presumably, because it avoids memory growth?!)
    Module.performWork();
  }
  return "42";
}
