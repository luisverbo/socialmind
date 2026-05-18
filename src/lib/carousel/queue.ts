const MAX_CONCURRENT = 3

let running = 0
const waitQueue: Array<() => void> = []

export async function acquireSemaphore(): Promise<void> {
  if (running < MAX_CONCURRENT) {
    running++
    return
  }
  return new Promise(resolve => {
    waitQueue.push(resolve)
  })
}

export function releaseSemaphore(): void {
  const next = waitQueue.shift()
  if (next) {
    next()
  } else {
    running--
  }
}

export async function withSemaphore<T>(fn: () => Promise<T>): Promise<T> {
  await acquireSemaphore()
  try {
    return await fn()
  } finally {
    releaseSemaphore()
  }
}
