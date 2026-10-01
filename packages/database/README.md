# Persistencia geográfica

Este paquete solo se consume desde el backend. PostgreSQL en Neon, Drizzle y
PostGIS mantienen separados el esquema (`src/schema/`), el cliente HTTP de
runtime (`src/client.ts`), las consultas (`src/places.ts`) y las herramientas
Node (`scripts/`). Los handlers Hono viven en `apps/api/src/handlers/`.

## Conexiones y comandos

Desde la raíz, con Node 24 y las variables en `.env` (ignorado por Git) o en el
entorno del proceso:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:check
```

- `DATABASE_URL`: conexión pooled de Neon, utilizada por el driver HTTP de
  `@neondatabase/serverless`, compatible con Cloudflare Workers sin TCP.
- `DATABASE_URL_DIRECT`: conexión directa utilizada por Drizzle Kit y por
  `pg` para ejecutar migraciones y seed con transacciones. Las herramientas
  exigen TLS con validación de certificado y hostname (`sslmode=verify-full`).
- Las variables existentes del proceso tienen prioridad sobre `.env`.
- Nunca se imprimen URLs de conexión ni errores internos de PostgreSQL.

`db:generate` genera SQL y snapshots; `db:migrate` aplica ese SQL y registra el
historial en `drizzle.__drizzle_migrations`. No usar `push` como sustituto de
las migraciones versionadas. Revisar siempre el SQL generado. La migración
inicial incluye explícitamente `CREATE EXTENSION IF NOT EXISTS postgis` antes
de crear columnas espaciales; la segunda añade triggers de `updated_at`.

El seed lee `data/places.geojson`, valida tipos, coordenadas, cotas, nombres y
slugs únicos con Zod, y utiliza `ST_MakePoint(longitude, latitude)` con SRID

4326. Se ejecuta en una única transacción; repetirlo actualiza los mismos
      lugares por slug y conserva sus IDs. Crea Pirineos sin inventar límites
      regionales y un usuario fijo de desarrollo, sin autenticación ni visitas
      ficticias. Los datos personales existentes no se modifican.

## Decisión espacial

`places.location` es **geometry (Point,4326)**, obligatorio y con índice GiST.
Encaja con GeoJSON, bounding boxes de viewport y las futuras consultas de
pertenencia a regiones (`ST_Contains`). `regions.geometry` admite
`geometry(MultiPolygon,4326)` nullable; un Polygon se normalizará mediante
`ST_Multi` cuando haya un importador de límites reales.

Las distancias sobre geometry/4326 se expresan en grados, por lo que **no**
se utilizan directamente para distancias en metros. `placesNearby` aplica
`ST_DWithin(location::geography, point::geography, distanceMeters)` y utiliza
un segundo GiST sobre la expresión `location::geography`. El cast no duplica
la columna almacenada. Así se combina el acceso por viewport con distancias
geodésicas sin perder el índice en la conversión. Véase la documentación de
[ST_DWithin](https://postgis.net/docs/ST_DWithin.html).

Se usa un tipo personalizado de Drizzle para que las migraciones incluyan
explícitamente `geometry(Point,4326)`: el constructor geometry de Drizzle
0.45 genera `geometry(point)` aunque reciba `srid`. PostgreSQL impone tipo y
SRID; un check adicional rechaza puntos vacíos o coordenadas fuera de rango.
La API extrae latitud con `ST_Y` y longitud con `ST_X`, nunca desde el seed.

## Integridad

UUIDs, slugs únicos, nombres no vacíos, enums para tipos/estados, cotas
acotadas, claves foráneas e índices sobre sus columnas. Un lugar solo puede
tener una relación personal por usuario. Una fecha de visita solo puede
existir con estado `visited`; una visita sin fecha sigue siendo válida.
Las relaciones personales se eliminan con su usuario/lugar. Eliminar una
región deja los lugares sin región y se impide si tiene regiones hijas.
Se evita el padre propio; la prevención de ciclos de varios niveles se
deberá incorporar al implementar escrituras de la jerarquía regional.

Los cuatro triggers mantienen `updated_at` incluso con escrituras SQL
externas. Los defaults inicializan ambos timestamps.

`db:check` verifica ambas conexiones, el DTO real de Aneto, búsqueda por ID,
viewport positivo/vacío, proximidad en metros, SRID/tipo y ambos GiST.
