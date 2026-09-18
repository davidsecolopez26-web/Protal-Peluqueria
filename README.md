# Portal Peluquería

Sistema de reservas online para peluquería. Los clientes reservan citas sin necesidad de login; el peluquero gestiona disponibilidad y confirma citas desde un panel administrativo protegido.

## Tech Stack

- **Next.js 14+** (App Router)
- **TypeScript**
- **PostgreSQL** (Vercel Postgres / Neon)
- **Drizzle ORM**
- **Tailwind CSS**
- **Vitest** (testing)

## Getting Started

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env.local
# Edita .env.local con tus valores
```

### 3. Ejecutar desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## Testing

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch
```

## Estructura del proyecto

```
src/
├── lib/
│   ├── db/              # Database schema y adapters
│   │   ├── adapters/    # InMemory adapters para testing
│   │   ├── schema.ts    # Drizzle schema
│   │   └── index.ts     # DB connection
│   └── types.ts         # Domain types
├── app/
│   ├── (public)/        # Páginas públicas
│   ├── (admin)/         # Panel admin
│   └── api/             # API routes
└── tests/               # Tests
```

## Dominio

Ver [CONTEXT.md](./CONTEXT.md) para el vocabulario del dominio.

## Arquitectura

Ver [ARCHITECTURE.md](./ARCHITECTURE.md) para detalles de los módulos.