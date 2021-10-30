declare global {
  /**
   * @ets_derive implicitly
   */
  function implicitly<T>(): T
}

export * from "./codec/index.js"
export * from "./guard/index.js"
export * from "./equal/index.js"
export * from "./refined.js"
