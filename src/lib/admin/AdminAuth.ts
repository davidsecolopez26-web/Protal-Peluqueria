import type { AdminSession, AdminSessionCreateInput } from '@/lib/types'
import type { AdminSessionRepository } from '@/lib/db/adapters/types'

export interface AdminAuthService {
  login(secretToken: string, password: string): Promise<AdminSession | null>
  validateSession(token: string): Promise<AdminSession | null>
  logout(token: string): Promise<boolean>
  cleanupExpired(): Promise<number>
}

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin-secret'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000 // 24 hours

export function createAdminAuthService(sessionRepo: AdminSessionRepository): AdminAuthService {
  return {
    async login(secretToken: string, password: string): Promise<AdminSession | null> {
      if (secretToken !== ADMIN_SECRET || password !== ADMIN_PASSWORD) {
        return null
      }

      const token = crypto.randomUUID()
      const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)

      return sessionRepo.create({
        token,
        expiresAt,
      })
    },

    async validateSession(token: string): Promise<AdminSession | null> {
      if (!token) return null
      return sessionRepo.getByToken(token)
    },

    async logout(token: string): Promise<boolean> {
      return sessionRepo.delete(token)
    },

    async cleanupExpired(): Promise<number> {
      return sessionRepo.cleanupExpired()
    },
  }
}
