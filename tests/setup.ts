// Test setup file
import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Mock crypto.randomUUID for Node < 19
if (!globalThis.crypto) {
  globalThis.crypto = {} as Crypto
}
if (!globalThis.crypto.randomUUID) {
  globalThis.crypto.randomUUID = (() => {
    return () =>
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0
        const v = c === 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
      }) as `${string}-${string}-${string}-${string}-${string}`
  })()
}

// Mock Next.js headers/cookies for API routes
vi.mock('next/headers', () => ({
  cookies: () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  }),
  headers: () => new Map(),
}))

console.log('🧪 Test setup complete')