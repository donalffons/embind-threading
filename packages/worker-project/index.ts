let i: any;

export default async function (Module: any, arg: string) {
  if (i === undefined) {
    i = new Module.MyThread();
  }
  console.log("-- running code in thread: ", arg, i.$$.ptr);
  await new Promise(res => setTimeout(res, 500));
  console.log("-- done in thread ", Date.now());
  return Math.random().toString();
}
