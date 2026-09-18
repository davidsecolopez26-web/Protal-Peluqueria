import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryServiceRepository } from '@/lib/db/adapters/in-memory'
import { ServiceCatalog } from '@/lib/services'

describe('ServiceCatalog', () => {
  let catalog: ServiceCatalog
  let repository: InMemoryServiceRepository

  beforeEach(() => {
    repository = new InMemoryServiceRepository()
    catalog = new ServiceCatalog(repository)
  })

  describe('addService', () => {
    it('should add a service with valid data', async () => {
      const service = await catalog.addService('Corte', 30)

      expect(service.id).toBeDefined()
      expect(service.name).toBe('Corte')
      expect(service.durationMinutes).toBe(30)
    })

    it('should trim whitespace from name', async () => {
      const service = await catalog.addService('  Corte de pelo  ', 30)

      expect(service.name).toBe('Corte de pelo')
    })

    it('should reject empty name', async () => {
      await expect(
        catalog.addService('', 30)
      ).rejects.toThrow('name is required')
    })

    it('should reject zero duration', async () => {
      await expect(
        catalog.addService('Corte', 0)
      ).rejects.toThrow('positive number')
    })

    it('should reject negative duration', async () => {
      await expect(
        catalog.addService('Corte', -10)
      ).rejects.toThrow('positive number')
    })

    it('should reject duration over 8 hours', async () => {
      await expect(
        catalog.addService('Corte', 481)
      ).rejects.toThrow('cannot exceed 8 hours')
    })

    it('should reject duplicate name', async () => {
      await catalog.addService('Corte', 30)

      await expect(
        catalog.addService('Corte', 45)
      ).rejects.toThrow('already exists')
    })
  })

  describe('updateService', () => {
    it('should update service name', async () => {
      const created = await catalog.addService('Corte', 30)

      const updated = await catalog.updateService(created.id, { name: 'Corte masculino' })

      expect(updated?.name).toBe('Corte masculino')
      expect(updated?.durationMinutes).toBe(30)
    })

    it('should update service duration', async () => {
      const created = await catalog.addService('Corte', 30)

      const updated = await catalog.updateService(created.id, { durationMinutes: 45 })

      expect(updated?.durationMinutes).toBe(45)
    })

    it('should return null for non-existent service', async () => {
      const updated = await catalog.updateService('non-existent-id', { name: 'Test' })

      expect(updated).toBeNull()
    })
  })

  describe('deleteService', () => {
    it('should delete a service', async () => {
      const created = await catalog.addService('Corte', 30)

      const deleted = await catalog.deleteService(created.id)

      expect(deleted).toBe(true)
    })

    it('should return false for non-existent service', async () => {
      const deleted = await catalog.deleteService('non-existent-id')

      expect(deleted).toBe(false)
    })
  })

  describe('listServices', () => {
    it('should list services sorted alphabetically', async () => {
      await catalog.addService('Zapato', 30)
      await catalog.addService('Corte', 30)
      await catalog.addService('Barba', 30)

      const services = await catalog.listServices()

      expect(services).toHaveLength(3)
      expect(services[0].name).toBe('Barba')
      expect(services[1].name).toBe('Corte')
      expect(services[2].name).toBe('Zapato')
    })
  })

  describe('getServiceDurations', () => {
    it('should return durations for valid service IDs', async () => {
      const s1 = await catalog.addService('Corte', 30)
      const s2 = await catalog.addService('Color', 90)

      const durations = await catalog.getServiceDurations([s1.id, s2.id])

      expect(durations).toContain(30)
      expect(durations).toContain(90)
    })

    it('should exclude non-existent service IDs', async () => {
      const s1 = await catalog.addService('Corte', 30)

      const durations = await catalog.getServiceDurations([s1.id, 'non-existent'])

      expect(durations).toEqual([30])
    })
  })

  describe('calculateTotalDuration', () => {
    it('should calculate total duration correctly', async () => {
      const s1 = await catalog.addService('Corte', 30)
      const s2 = await catalog.addService('Color', 90)

      const total = await catalog.calculateTotalDuration([s1.id, s2.id])

      expect(total).toBe(120)
    })

    it('should return 0 for empty array', async () => {
      const total = await catalog.calculateTotalDuration([])

      expect(total).toBe(0)
    })
  })
})