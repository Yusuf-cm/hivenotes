interface CacheEntry<T> {
  value: T
  expiresAt: number
}

class Cache {
  private store = new Map<string, CacheEntry<any>>()
  private ttlMs = 5 * 60 * 1000 // 5 minutes default

  set<T>(key: string, value: T, ttlMs?: number): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.ttlMs),
    })
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key)
    if (!entry) return null

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }

    return entry.value as T
  }

  invalidate(pattern: string): void {
    for (const key of this.store.keys()) {
      if (key.includes(pattern)) {
        this.store.delete(key)
      }
    }
  }

  clear(): void {
    this.store.clear()
  }
}

export const cache = new Cache()
