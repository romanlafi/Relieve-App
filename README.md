# Relieve App

Bootstrap de un monorepo TypeScript con npm workspaces. Las decisiones
arquitectónicas siguen [PROJECT_GUIDE.md](./PROJECT_GUIDE.md); esta fase se limita
a preparar las herramientas y una aplicación mínima ejecutable.

## Arquitectura

```text
apps/
  web/       React + Vite + Vanilla Extract
  api/       Hono sobre Cloudflare Workers
packages/
  shared/    Tipos compartidos de la API
  database/  Reserva para Drizzle/PostgreSQL, sin conexión
data/        Reserva para datasets versionados
```

La API es independiente del frontend. Solo implementa `GET /health`, que devuelve
`{"status":"ok"}`. La web muestra una página con estilos estáticos de Vanilla
Extract y un contador para comprobar React. Incluye tokens mínimos en
`apps/web/src/styles/theme.css.ts`.

TypeScript usa `strict` y una configuración común en `tsconfig.base.json`.
ESLint usa configuración plana en la raíz. Los paquetes internos se enlazan
mediante workspaces; sus tipos se pueden consumir directamente sin un build
previo. El build compila primero los paquetes internos y después las aplicaciones.

## Requisitos y ejecución local

Usar Node.js 24 LTS y npm 11 o superior. `.nvmrc` indica la rama de Node.
Desde la raíz:

```bash
npm install
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

Wrangler ejecuta el Worker localmente: no hace falta cuenta de Cloudflare,
autenticación ni servicios externos.

## Validación y build

```bash
npm run lint
npm run typecheck
npm run build
```

El build genera la web en `apps/web/dist`, el bundle del Worker en `apps/api/dist`
y JavaScript/declaraciones de los paquetes en sus respectivos `dist`.
La API usa `wrangler deploy --dry-run`: solo compila, no despliega.
Para previsualizar la web compilada: `npm run preview --workspace=@relieve/web`.
`package-lock.json` fija las versiones resueltas; usar `npm ci` en instalaciones
reproducibles.

## Variables de entorno y alcance

No se requieren variables para este bootstrap. `.env.example` documenta dónde
añadirlas cuando sean necesarias: `apps/web/.env.local` para variables públicas
de Vite y `apps/api/.dev.vars` para secretos locales del Worker. La raíz `.env`
no se carga automáticamente. Las variables `VITE_*` son públicas; nunca deben
contener secretos. Los archivos locales de entorno están ignorados por Git.

MapLibre, Drizzle, PostgreSQL, autenticación, GPX y las funcionalidades de negocio
quedan pendientes para las siguientes fases.
