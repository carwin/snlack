/**
 * A really basic state mgr.
 *
 * @remarks
 * This hasn't really been thought through but I wanted to mess with Proxy.
 *
 **/
export const userState = {
  slackUid: null,
  // @ts-ignore
  changeUser: (payload) => {
    // @ts-ignore
    userState.slackUid = payload;
  }

};

/**
 * The handler given to Proxy() for the userState object.
 *
 * Allows us to watch/subscribe to actions taken on `userState`.
 *
 * @remarks
 * `target` will point back to `userState` object.
 * `receiver` will also point back to `userState` object.
 *
 * @example
 * ```ts
 * export const state = new Proxy(userState, stateHandler);
 * ```
 */
export const stateHandler = {
  // @ts-ignore
  get: (target, prop, receiver) => {
    const value = target[prop];
    // example of binding functions:
    // if (typeof value === 'function') {
    //   return () => {
    //     value.apply(receiver, [
    //       // @ts-ignore
    //       receiver, ...arguments
    //     ]);
    //   }
    // }
    return value;
  },
  // @ts-ignore
  set: (obj, prop, value) => {
    obj[prop] = value;
    return true;
  }
}
