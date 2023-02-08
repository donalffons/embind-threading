let i = 0;

declare const Module: any;

async function myThreadFunction(arg: string) {
  console.log(performance.now(), "Hello from thread, waiting", arg, i++);
  await new Promise(res => setTimeout(res, 1000));
  console.log(performance.now(), "Let's go");
  for (let i = 0; i < 1000000;
    i++) { // reducing the loop count makes the error go away
    // (presumably, because it avoids memory growth?!)
    Module.performWork();
  }
  return "42";
}
