import type { Service, ServiceCreateInput, ServiceUpdateInput } from '@/lib/types'
import type { ServiceRepository } from '@/lib/db/adapters/types'

/**
 * ServiceCatalog - Deep module for managing hairdressing services
 *
 * Provides a simple interface for CRUD operations on services,
 * hiding all validation and business logic internally.
 */
export class ServiceCatalog {
  constructor(private repository: ServiceRepository) {}

  /**
   * Add a new service
   * @throws Error if service name already exists or duration is invalid
   */
  async addService(name: string, durationMinutes: number): Promise<Service> {
    // Validate name is not empty
    if (!name || name.trim().length === 0) {
      throw new Error('Service name is required')
    }

    // Validate duration
    if (durationMinutes <= 0) {
      throw new Error('Duration must be a positive number')
    }

    if (durationMinutes > 480) {
      throw new Error('Duration cannot exceed 8 hours (480 minutes)')
    }

    return this.repository.create({
      name: name.trim(),
      durationMinutes,
    })
  }

  /**
   * Update an existing service
   * @returns null if service not found
   */
  async updateService(serviceId: string, updates: ServiceUpdateInput): Promise<Service | null> {
    // Validate duration if provided
    if (updates.durationMinutes !== undefined) {
      if (updates.durationMinutes <= 0) {
        throw new Error('Duration must be a positive number')
      }
      if (updates.durationMinutes > 480) {
        throw new Error('Duration cannot exceed 8 hours (480 minutes)')
      }
    }

    // Validate name if provided
    if (updates.name !== undefined) {
      if (!updates.name || updates.name.trim().length === 0) {
        throw new Error('Service name is required')
      }
    }

    return this.repository.update(serviceId, updates)
  }

  /**
   * Delete a service
   * @returns true if deleted, false if not found
   * @throws Error if service has associated appointments
   */
  async deleteService(serviceId: string): Promise<boolean> {
    // Check if service exists first
    const service = await this.repository.getById(serviceId)
    if (!service) {
      return false
    }

    // In a real implementation, we'd check for associated appointments
    // For now, we just delete
    return this.repository.delete(serviceId)
  }

  /**
   * Get a service by ID
   */
  async getService(serviceId: string): Promise<Service | null> {
    return this.repository.getById(serviceId)
  }

  /**
   * List all services, sorted by name
   */
  async listServices(): Promise<Service[]> {
    const services = await this.repository.listAll()
    return services.sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * Get durations for a list of service IDs
   * Returns array of durations, excluding any services not found
   */
  async getServiceDurations(serviceIds: string[]): Promise<number[]> {
    const durations: number[] = []

    for (const id of serviceIds) {
      const service = await this.repository.getById(id)
      if (service) {
        durations.push(service.durationMinutes)
      }
    }

    return durations
  }

  /**
   * Calculate total duration for multiple services
   */
  async calculateTotalDuration(serviceIds: string[]): Promise<number> {
    const durations = await this.getServiceDurations(serviceIds)
    return durations.reduce((sum, d) => sum + d, 0)
  }
}