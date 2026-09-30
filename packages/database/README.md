# Database

Workspace reservado para el acceso a PostgreSQL con Drizzle.

- `src/`: futuro cliente y funciones de acceso a datos.
- `schema/`: futuros esquemas de Drizzle.
- `migrations/`: futuras migraciones SQL.

El bootstrap no instala ORM ni drivers, no define tablas y no abre conexiones.
Los detalles de PostgreSQL se decidirán al implementar esta capa, siguiendo
`PROJECT_GUIDE.md`. Este paquete será utilizado por la API, nunca por el frontend.
