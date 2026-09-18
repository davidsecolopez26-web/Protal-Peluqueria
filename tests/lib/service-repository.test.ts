import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryServiceRepository } from '@/lib/db/adapters/in-memory'
import type { ServiceCreateInput } from '@/lib/types'

describe('InMemoryServiceRepository', () => {
  let repo: InMemoryServiceRepository

  beforeEach(() => {
    repo = new InMemoryServiceRepository()
  })

  it('should create a service', async () => {
    const input: ServiceCreateInput = {
      name: 'Corte de pelo',
      durationMinutes: 30,
    }

    const service = await repo.create(input)

    expect(service.id).toBeDefined()
    expect(service.name).toBe('Corte de pelo')
    expect(service.durationMinutes).toBe(30)
    expect(service.createdAt).toBeInstanceOf(Date)
  })

  it('should list all services', async () => {
    await repo.create({ name: 'Corte', durationMinutes: 30 })
    await repo.create({ name: 'Color', durationMinutes: 90 })

    const services = await repo.listAll()

    expect(services).toHaveLength(2)
  })

  it('should reject duplicate names', async () => {
    await repo.create({ name: 'Corte', durationMinutes: 30 })

    await expect(
      repo.create({ name: 'Corte', durationMinutes: 45 })
    ).rejects.toThrow('already exists')
  })

  it('should reject negative duration', async () => {
    await expect(
      repo.create({ name: 'Corte', durationMinutes: -5 })
    ).rejects.toThrow('positive')
  })

  it('should get service by id', async () => {
    const created = await repo.create({ name: 'Corte', durationMinutes: 30 })

    const found = await repo.getById(created.id)

    expect(found).not.toBeNull()
    expect(found?.name).toBe('Corte')
  })

  it('should update a service', async () => {
    const created = await repo.create({ name: 'Corte', durationMinutes: 30 })

    const updated = await repo.update(created.id, { durationMinutes: 45 })

    expect(updated?.durationMinutes).toBe(45)
    expect(updated?.name).toBe('Corte')
  })

  it('should delete a service', async () => {
    const created = await repo.create({ name: 'Corte', durationMinutes: 30 })

    const result = await repo.delete(created.id)
    expect(result).toBe(true)

    const found = await repo.getById(created.id)
    expect(found).toBeNull()
  })
})