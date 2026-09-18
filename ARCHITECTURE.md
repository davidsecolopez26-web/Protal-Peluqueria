# Arquitectura de Módulos - Portal Peluquería

## Principios

- **Deep modules**: interfaces pequeñas, lógica compleja escondida
- **Seams claros**: fácil de testear y cambiar implementaciones
- **Locality**: cambios concentrados en un lugar
- **Leverage**: callers reutilizan lógica compleja

---

## Módulos principales

### 1. **AvailabilityScheduler** (Deep)

**Responsabilidad**: Gestionar la plantilla anual de disponibilidad y calcular franjas libres.

**Interface** (lo que usan otros módulos):
```typescript
interface AvailabilityScheduler {
  // Plantilla anual
  setAnnualTemplate(config: WeeklyPattern): Promise<void>
  addDayException(date: Date, timeSlots: TimeSlot[]): Promise<void>
  removeDayException(date: Date): Promise<void>

  // Cálculo de franjas
  getAvailableSlots(date: Date, serviceDurations: number[]): TimeSlot[]
  isSlotAvailable(slot: TimeSlot, serviceDurations: number[]): boolean
}
```

**Implementación** (lo que está adentro):
- Lógica de solapamiento de franjas
- Cálculo de duración total de servicios múltiples
- Manejo de excepciones del día
- Cache de disponibilidad calculada

**Por qué es deep**: El caller solo dice "dame franjas para estas duraciones" y recibe la lista correcta. Toda la complejidad (solapamiento, excepciones, cache) está escondida.

---

### 2. **AppointmentService** (Deep)

**Responsabilidad**: Orquestar reserva, confirmación y modificación de citas.

**Interface**:
```typescript
interface AppointmentService {
  // Reserva
  createAppointment(request: {
    clientName: string
    clientPhone: string
    serviceIds: string[]
    startTime: Date
  }): Promise<AppointmentWithToken>

  // Gestión (admin)
  confirmAppointment(appointmentId: string): Promise<void>
  cancelAppointment(appointmentId: string, reason?: string): Promise<void>
  modifyAppointment(appointmentId: string, updates: Partial<AppointmentUpdate>): Promise<void>

  // Consulta sin login
  getAppointmentByToken(token: string): Promise<AppointmentPublic>

  // Lista para admin
  listAppointments(filters: { status?, dateRange? }): Promise<Appointment[]>
}
```

**Implementación**:
- Validaciones complejas (franjas disponibles, datos del cliente)
- Generación de tokens únicos y seguros
- Transacciones (reserva + notificación)
- Manejo de conflictos concurrentes

**Por qué es deep**: Callers invocan métodos simples; la orquestación (validar, generar token, notificar) sucede adentro.

---

### 3. **ServiceCatalog** (Deep)

**Responsabilidad**: Gestionar servicios (corte, color, etc.) y sus duraciones.

**Interface**:
```typescript
interface ServiceCatalog {
  addService(name: string, durationMinutes: number): Promise<Service>
  updateService(serviceId: string, updates: Partial<Service>): Promise<void>
  deleteService(serviceId: string): Promise<void>

  listServices(): Promise<Service[]>
  getService(serviceId: string): Promise<Service>

  // Para cálculos
  getServiceDurations(serviceIds: string[]): number[]
}
```

**Implementación**:
- Validaciones (duraciones positivas, nombres únicos)
- Prevención de borrado si hay citas asociadas
- Cache de servicios

**Por qué es deep**: Admin solo llama métodos simples; la lógica de validaciones y restricciones está adentro.

---

### 4. **NotificationHub** (Adapter pattern)

**Responsabilidad**: Enviar notificaciones (WhatsApp, email, panel admin).

**Interface**:
```typescript
interface NotificationHub {
  notifyNewAppointment(appointment: Appointment): Promise<void>
  notifyConfirmation(appointment: Appointment, clientPhone: string): Promise<void>
  notifyCancellation(appointment: Appointment, clientPhone: string): Promise<void>
  notifyAdminUpdate(appointment: Appointment): Promise<void>
}
```

**Adapters** (intercambiables):
- **WhatsAppAdapter**: envía por WhatsApp (Twilio, MessageBird, etc.)
- **EmailAdapter**: envía por email
- **AdminPanelAdapter**: notificación en tiempo real (WebSocket)
- **LogAdapter**: para testing, solo log

**Por qué tiene adapters**: Las notificaciones pueden cambiar (hoy WhatsApp, mañana Telegram); los módulos que usan NotificationHub no lo saben.

---

### 5. **Database Layer** (Adapter pattern)

**Interface** (Repository pattern):
```typescript
interface AppointmentRepository {
  create(appointment: Appointment): Promise<void>
  update(id: string, updates: Partial<Appointment>): Promise<void>
  getById(id: string): Promise<Appointment | null>
  listByStatus(status: AppointmentStatus): Promise<Appointment[]>
}

// Similarmente para ServiceRepository, AvailabilityRepository
```

**Adapters**:
- **PostgresAdapter**: Vercel Postgres (producción)
- **InMemoryAdapter**: para testing
- **SqliteAdapter**: desarrollo local

---

## Flujo de reserva (cómo interactúan los módulos)

```
Cliente web
    ↓
[GET /api/appointments/available] → AvailabilityScheduler.getAvailableSlots()
    ↓
[POST /api/appointments] → AppointmentService.createAppointment()
    ├─ Valida con ServiceCatalog.getServiceDurations()
    ├─ Valida con AvailabilityScheduler.isSlotAvailable()
    ├─ Crea en Database
    └─ NotificationHub.notifyNewAppointment() (WhatsApp)
    ↓
Retorna token único al cliente
```

---

## Estructura de carpetas

```
portal-peluqueria/
├── src/
│   ├── lib/
│   │   ├── availability/
│   │   │   ├── AvailabilityScheduler.ts
│   │   │   └── types.ts
│   │   ├── appointments/
│   │   │   ├── AppointmentService.ts
│   │   │   └── types.ts
│   │   ├── services/
│   │   │   ├── ServiceCatalog.ts
│   │   │   └── types.ts
│   │   ├── notifications/
│   │   │   ├── NotificationHub.ts
│   │   │   ├── adapters/
│   │   │   │   ├── WhatsAppAdapter.ts
│   │   │   │   ├── EmailAdapter.ts
│   │   │   │   └── LogAdapter.ts
│   │   │   └── types.ts
│   │   └── db/
│   │       ├── repositories.ts
│   │       ├── adapters/
│   │       │   ├── PostgresAdapter.ts
│   │       │   └── InMemoryAdapter.ts
│   │       └── schema.ts
│   ├── app/
│   │   ├── (public)/
│   │   │   ├── page.tsx
│   │   │   ├── reserve/
│   │   │   │   └── page.tsx
│   │   │   └── cita/[token]/
│   │   │       └── page.tsx
│   │   ├── (admin)/
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/
│   │   │   ├── appointments/
│   │   │   ├── services/
│   │   │   └── availability/
│   │   └── api/
│   │       ├── appointments/
│   │       ├── availability/
│   │       ├── services/
│   │       └── admin/
│   └── components/
│       ├── ReservationForm.tsx
│       ├── AdminPanel.tsx
│       └── ...
├── tests/
│   ├── lib/
│   │   ├── AvailabilityScheduler.test.ts
│   │   ├── AppointmentService.test.ts
│   │   └── ...
│   └── api/
├── docs/
├── CONTEXT.md
└── package.json
```

---

## Testabilidad

Cada módulo es testeable a través de su interface sin mockear innecesariamente:

```typescript
// Test de AppointmentService
const mockScheduler = new AvailabilityScheduler(mockRepo)
const mockCatalog = new ServiceCatalog(mockRepo)
const mockDb = new InMemoryAdapter()
const service = new AppointmentService(mockScheduler, mockCatalog, mockDb)

// Test: crear cita válida
const result = await service.createAppointment({
  clientName: 'Juan',
  clientPhone: '666123456',
  serviceIds: ['cut-id'],
  startTime: new Date('2026-09-20 10:00')
})

expect(result.token).toBeDefined()
expect(result.status).toBe('pending')
```

No necesitamos mockear WhatsApp, email ni BD; usamos adapters de testing.

---

## Decisiones de design

**¿Por qué Deep modules aquí?**
- Reducen acoplamiento entre capas
- Tests son simples y legibles
- Cambios localizados (ej: cambiar notificador no afecta reservas)

**¿Por qué Adapter pattern en Notifications y DB?**
- Notificaciones pueden evolucionar (hoy WhatsApp, mañana SMS)
- Base de datos puede cambiar (PostgreSQL → MongoDB)
- Testing es trivial (swappear adapters)

**¿Por qué no GraphQL/REST separado?**
- Next.js Server Actions + Route Handlers son suficientes
- Menos complejidad, mismo poder
- Easier to collocate with UI