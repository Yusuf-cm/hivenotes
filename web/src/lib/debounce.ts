export interface DebouncedFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): void
  cancel: () => void
  flush: () => void
}

export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number
): DebouncedFunction<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let lastArgs: Parameters<T> | null = null

  const debounced = (...args: Parameters<T>) => {
    lastArgs = args

    if (timeoutId) clearTimeout(timeoutId)

    timeoutId = setTimeout(() => {
      if (lastArgs) {
        fn(...lastArgs)
      }
      timeoutId = null
      lastArgs = null
    }, delayMs)
  }

  debounced.cancel = () => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = null
    lastArgs = null
  }

  debounced.flush = () => {
    if (timeoutId && lastArgs) {
      clearTimeout(timeoutId)
      fn(...lastArgs)
      timeoutId = null
      lastArgs = null
    }
  }

  return debounced
}

export interface ThrottledFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): void
  cancel: () => void
}

export const throttle = <T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number
): ThrottledFunction<T> => {
  let lastCallTime = 0
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let lastArgs: Parameters<T> | null = null

  const throttled = (...args: Parameters<T>) => {
    lastArgs = args
    const now = Date.now()
    const timeSinceLastCall = now - lastCallTime

    if (timeSinceLastCall >= delayMs) {
      lastCallTime = now
      fn(...args)

      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = null
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastCallTime = Date.now()
        if (lastArgs) fn(...lastArgs)
        timeoutId = null
      }, delayMs - timeSinceLastCall)
    }
  }

  throttled.cancel = () => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = null
    lastArgs = null
  }

  return throttled
}
