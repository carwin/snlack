// Make some pretty logging functions.
// ------------------------------------------------------------------------------
export const fnNotice = (msg: string, color: string) => {
  const reset = '\x1b[0m';
  const blink = '\x1b[1m';
  const bright = '\x1b[5m';
  const dim = '\x1b[2m';
  const white = '\x1b[37m';
  console.log(`${dim} ${white} ~~~ ${reset}`);
  console.log(`${bright} ${color}${msg} ${reset}`);
  console.log(`${dim} ${white} ~~~ ${reset}`);
}

export const fnEnter = (msg?: string) => {
  // fnNotice(msg || `Entering ${fnGreeter.caller}...`, '\x1b[34m');
  fnNotice(msg || `Entering ${fnEnter.caller}...`, '\x1b[33m');
}
export const fnExit = (msg?: string) => {
  fnNotice(msg || `Exiting ${fnExit.caller}...`, '\x1b[35m');
}
export const fnError = (msg: string) => {
  fnNotice(msg, '\x1b[31m');
}
