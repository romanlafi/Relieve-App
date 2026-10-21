# Relieve App

Monorepo TypeScript con npm workspaces. Las decisiones arquitectónicas siguen
[PROJECT_GUIDE.md](./PROJECT_GUIDE.md). Incluye la primera capa de persistencia
geográfica real en Neon PostgreSQL con Drizzle y PostGIS.

## Arquitectura

```text
apps/
  web/       React + Vite + Vanilla Extract
  api/       Hono sobre Cloudflare Workers
packages/
  shared/    Tipos compartidos de la API
  database/  Drizzle, PostGIS, consultas, migraciones y seed
data/        GeoJSON versionado con fuentes verificadas
```

La API es independiente del frontend. Implementa `GET /health`, que devuelve
`{"status":"ok"}`, `GET /places` y `GET /places/:id`. La web muestra un mapa
MapLibre de los Pirineos con lugares de la API, selección, controles de cámara
y terreno 3D. Los estilos son estáticos de Vanilla Extract y los colores
compartidos están en `apps/web/src/styles/theme.css.ts`.

TypeScript usa `strict` y una configuración común en `tsconfig.base.json`.
ESLint usa configuración plana en la raíz. Los paquetes internos se enlazan
mediante workspaces; sus tipos se pueden consumir directamente sin un build
previo. El build compila primero los paquetes internos y después las aplicaciones.

## Requisitos y ejecución local

Usar Node.js 24 LTS y npm 11 o superior. `.nvmrc` indica la rama de Node.
Desde la raíz:

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

`dev` arranca los dos servicios en paralelo y los detiene con Ctrl+C:

- Frontend: http://127.0.0.1:5173
- API: http://127.0.0.1:8787/health

También pueden ejecutarse por separado, en dos terminales:

```bash
npm run dev:web
npm run dev:api
```

Wrangler ejecuta el Worker localmente sin despliegue ni autenticación de
Cloudflare. La API consulta la base de datos real de Neon. Configurar las dos
variables de conexión antes de ejecutar migraciones o arrancar la API.

Reiniciar cualquier servidor del bootstrap que siga abierto para que cargue
las nuevas variables. Si el puerto está ocupado, se puede usar
`npm run dev:api -- --port 8788`.

La web llama a `/api/places`; Vite redirige `/api/*` a los endpoints del Worker
manteniendo ese prefijo. El Worker lo retira antes de resolver la ruta. El destino por defecto es
`http://127.0.0.1:8787`. Si se usa
otro puerto, configurar `API_PROXY_TARGET=http://127.0.0.1:8788` en
`apps/web/.env.local` o en el entorno del proceso y reiniciar Vite. Esa variable
solo se utiliza en el servidor de desarrollo/preview y no se expone al navegador.

## Validación y build

```bash
npm run lint
npm run typecheck
npm run db:check
npm run data:check
npm test
npm run test:integration
npm run build
```

El build genera la web en `apps/web/dist`, el bundle del Worker en `apps/api/dist`
y JavaScript/declaraciones de los paquetes en sus respectivos `dist`.
La API usa `wrangler deploy --dry-run`: solo compila, no despliega.
Para previsualizar la web compilada: `npm run preview --workspace=@relieve/web`.
`package-lock.json` fija las versiones resueltas; usar `npm ci` en instalaciones
reproducibles.

`npm test` ejecuta validaciones de dataset y filtros/rutas sin necesitar Neon.
`test:integration` requiere las conexiones locales y comprueba filtros reales,
jerarquía y seed repetido sin modificar estados del usuario de desarrollo.
Las pruebas temporales se limpian o se ejecutan con rollback. `db:check` ejecuta
comprobaciones de integración reales contra Neon: conexiones, DTO, tipo/SRID,
índices, viewport y proximidad. `/health` es una comprobación de disponibilidad
del Worker; la conexión a la base de datos se verifica con `db:check` y `/places`.

## Variables de entorno y alcance

`.env.example` documenta `DATABASE_URL` (pooled, runtime) y
`DATABASE_URL_DIRECT` (directa, Drizzle Kit, migraciones y seed). Guardarlas
localmente en `.env` en la raíz o en el entorno del proceso. Las herramientas
de base de datos cargan ese archivo sin imprimir sus valores.

`npm run dev:api` pasa `DATABASE_URL` y `LOCAL_DEVELOPMENT=true` al Worker mediante un archivo
temporal de secretos y lo elimina al terminar. La conexión directa no se pasa
al Worker. En producción, configurar `DATABASE_URL` como secreto de Cloudflare.
Las variables `VITE_*` son públicas: nunca deben contener secretos. Los archivos
locales de entorno están ignorados por Git.

`GET /places` devuelve un array de DTOs compartidos con las coordenadas
extraídas desde PostGIS (`ST_Y`/`ST_X`). Los 74 lugares del dataset inicial pueden
filtrarse por tipo, región y estado personal, combinados con viewport. La
paginación queda pendiente cuando el volumen la requiera. `/regions` expone la
jerarquía y las regiones padre incluyen sus descendientes en las consultas.
`GET /places/:id` valida UUIDs y devuelve 400/404 cuando corresponda. Los errores
internos se responden con un JSON genérico sin consultas, stack traces ni secretos.

La justificación de `geometry(Point,4326)`, los índices GiST y las consultas en
metros mediante geography están en [packages/database/README.md](./packages/database/README.md).
Las fuentes y los datos omitidos están en [data/README.md](./data/README.md).

El mapa base usa OpenFreeMap Dark y el terreno usa el DEM público de Mapterhorn
sin claves. Los lugares proceden únicamente de nuestra API. La estructura,
el ciclo de vida de MapLibre y las decisiones de proveedores están documentados
en [apps/web/src/map/README.md](./apps/web/src/map/README.md).

## Registro personal de desarrollo

`GET /places` y `GET /places/:id` incluyen `userState` (o `null` si no existe
registro). Un `LEFT JOIN` filtrado por usuario recupera lugares y estados en
una única consulta, sin N+1. El panel permite guardar estado, favorito, fecha y
notas sin recargar la página. Los detalles del contrato están en
[apps/api/README.md](./apps/api/README.md).

En desarrollo local se usa el usuario fijo existente. En producción la API valida
sesiones Cloudflare Access con `jose` y resuelve usuarios separados por identidad
verificada. El modo local exige hostname localhost/loopback y no está presente
en la configuración de producción. No se aceptan IDs de usuario del cliente;
las respuestas personales no se cachean. La migración `0002` añade una identidad
externa única y nullable a `users`, conservando los registros existentes.

El seed no inventa visitas y no sobrescribe registros personales al repetirse.
El registro personal reutiliza los constraints, índices y trigger de
`user_places`; la migración de identidad afecta únicamente a `users`.

El mapa incluye búsqueda por nombre entre los resultados filtrados, ficha con
región/coordenadas y progreso del catálogo completo vía `GET /stats`. Guardar o
eliminar un registro refresca las agregaciones SQL sin recargar el mapa. El
resumen incluye visitados por tipo, pendientes, favoritos, tresmiles de cota
conocida y pico más alto visitado. Los controles fluyen en una barra desplazable
y la ficha se sitúa abajo en móvil.

La configuración de producción reúne web y `/api/*` en un Worker con assets
estáticos; `npm run build` compila primero la web y valida el Worker con dry-run.
La configuración local sigue funcionando sin build previo. Consultar
[publicación y Cloudflare Access](./apps/api/DEPLOYMENT.md) para dominio,
políticas y variables. No se han creado recursos ni publicado la aplicación.
El panel de progreso incluye estadísticas por región/macizo y año. El historial
personal conserva varias fechas por lugar y las estadísticas anuales cuentan
cada visita registrada, incluso si repites un lugar. La edición de lugares
globales sigue pendiente.
El estado de fases se registra al principio de `PROJECT_GUIDE.md`.

## Previews de Cloudflare Workers

Después de `npm run build`, `npm run deploy:preview` crea o actualiza la preview
de la rama actual; `npm run deploy:preview -- --name dev` permite elegir el nombre.
`npm run deploy:production` publica producción. Ambos usan
`wrangler.jsonc` de la raíz, que incluye web y API en el mismo origen y declara
el nombre `relieve-app`, igual que el Worker conectado en Cloudflare.
El build sigue siendo un dry-run y no publica por sí solo.

Para Workers Builds: directorio raíz del repositorio, build `npm run build`,
deploy de producción `npm run deploy:production` y comando de preview
`npm run deploy:preview`. Habilitar Preview Builds en las ramas secundarias.
El comando predeterminado `npx wrangler preview` también funciona desde la raíz.
Configurar Access y los secretos de previews, incluyendo una conexión Neon de
pruebas con las migraciones aplicadas, según [DEPLOYMENT.md](apps/api/DEPLOYMENT.md).

## Rutas GPX

Importación privada de tracks, visualización en terrain y confirmación manual de lugares cercanos. Modelo, endpoints, límites, pruebas y decisiones: [Rutas GPX](docs/GPX_ROUTES.md).
