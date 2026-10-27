# Publicación de staging y producción

## Staging operativo

La primera promoción de `dev` a `staging` se ha desplegado el 27 de octubre de 2026.

| Recurso | Configuración |
| --- | --- |
| Rama Git | `staging` |
| Worker / preview | `relieve-app` / `staging` |
| URL estable | https://staging-relieve-app.romanoscense10.workers.dev |
| Acceso | Cloudflare Access, en la misma aplicación de acceso de las previews |
| Proyecto Neon | `Relieve` (`damp-wave-97795543`) |
| Rama Neon | `staging` (`br-super-morning-b2b1mdr5`), creada desde `dev` |
| Conexión del Worker | `DATABASE_URL` propia de la preview `staging`, con pool |

La rama Neon empieza con una copia del esquema y los datos de `dev`; desde su
creación las escrituras quedan separadas. Se han aplicado las migraciones,
actualizado el seed a 74 lugares y comprobado PostGIS sobre esa rama. Los cambios
de código posteriores no copian ni reinician automáticamente su base de datos.

La preview hereda `ACCESS_TEAM_DOMAIN`, `ACCESS_AUDIENCE` y
`CATALOG_EDITOR_EMAILS` de Previews Base. `DATABASE_URL` se ha sobrescrito
específicamente en staging. No cambiar la conexión de Previews Base para apuntar
a staging: esa configuración también se aplica al crear otras previews.

Para una promoción posterior, partiendo de un árbol limpio:

```sh
git fetch origin
git switch staging
git merge --ff-only origin/dev
npm run lint
npm run typecheck
npm test
npm run build
git push origin staging
```

Workers Builds puede publicar la preview de la rama al recibir el push, usando
la configuración descrita más abajo. El primer despliegue se ha realizado con
Wrangler. Para publicar manualmente desde `staging`, después del build:

```sh
npm run deploy:preview -- --name staging
```

Si una futura promoción incorpora migraciones, aplicarlas antes de publicar
usando las conexiones de staging, nunca las de `.env` de desarrollo. La
preparación inicial ha guardado ambas conexiones en `.env.staging.local`,
ignorado por Git. Los scripts de base de datos no seleccionan ese archivo
automáticamente: pasar sus valores mediante `DATABASE_URL` y
`DATABASE_URL_DIRECT` en el entorno del proceso. El Worker recibe únicamente
la conexión pooled; las credenciales no se versionan.

Para rotar esa conexión sin afectar a `dev`:

```sh
npx wrangler preview secret put DATABASE_URL --name staging --config wrangler.jsonc
```

Después de cada promoción, entrar con Access y comprobar el mapa, filtros,
registro personal, persistencia e importación GPX. `main` continúa siendo la
rama de producción y se promueve por separado, después de validar staging.

La web compilada y la API se sirven desde un mismo Worker. El navegador usa
`/api/*`; `worker.ts` retira ese prefijo antes de pasar la petición a Hono.
`wrangler.jsonc` de la raíz sirve los assets de `apps/web/dist` y ejecuta el
Worker primero para `/api/*`. La configuración local no requiere compilar la web.

## Producción pública

Producción se sirve públicamente en https://relieve.romanlafi.org. El Worker usa
`wrangler.production.jsonc`, con ese dominio como Custom Domain y `workers.dev`
deshabilitado. Producción no usa Cloudflare Access.

`PUBLIC_READ_ONLY=true` habilita la exploración pública del catálogo sin identidad.
La API devuelve el catálogo sin estado personal; las rutas, estadísticas y
acciones personales no se muestran, y todas las peticiones de escritura reciben
403. Staging sigue usando Cloudflare Access y conserva sus funciones personales.

La rama `production` del proyecto Neon contiene el catálogo y las migraciones.
El Worker usa una conexión pooled guardada como secreto `DATABASE_URL`; nunca
subir la conexión ni añadirla a `vars`. Para publicar cambios desde `main`:

```sh
npm run build
npm run deploy:production
```

La compilación no publica; `deploy:production` usa la configuración de producción.
Tras desplegar, comprobar la portada, `/api/health`, `/api/places`, `/api/regions`,
`/api/me` y que las escrituras respondan 403. No ejecutar seed sobre producción
como parte de una publicación normal: conserva los datos del catálogo existentes.
## Previews por rama

Wrangler 4.145 del proyecto soporta Worker Previews (`wrangler preview`).
`wrangler.jsonc` de la raíz habilita `preview_urls` y declara `previews: {}`.
Los assets y la fecha de compatibilidad se comparten; las credenciales se
configuran por separado en **Previews Base config** de la cuenta. La
configuración local `apps/api/wrangler.jsonc` sigue destinada exclusivamente a `dev`.

Preparar en Cloudflare antes de publicar la primera preview:

1. Habilitar Worker Previews y proteger sus URLs con Cloudflare Access para el
   Worker `relieve-app` (o todas las previews de la cuenta). La protección del
   dominio de producción no cubre por sí sola las URLs `workers.dev`.
2. Configurar en Previews Base config `DATABASE_URL`, `ACCESS_TEAM_DOMAIN` y
   `ACCESS_AUDIENCE`. El AUD debe ser el de la aplicación Access que protege
   las previews. Puede diferir del AUD de producción.
3. Usar una base/branch Neon de pruebas para `DATABASE_URL`. Aplicar allí las
   migraciones y el seed mediante las herramientas existentes, con las
   conexiones pooled/directa de esa base en el entorno del proceso.
   Cloudflare no crea ni aísla automáticamente una base PostGIS externa.
4. No definir `LOCAL_DEVELOPMENT` en las previews. La API conserva la validación
   JWT existente y rechaza peticiones sin identidad verificada.
5. Configurar `CATALOG_EDITOR_EMAILS` solo con las identidades autorizadas para
   editar el catálogo global. Es una lista de emails separados por comas; no
   conceder el permiso a todos los usuarios de Access. Los cambios de Previews
   Base solo afectan a previews nuevas.

Los secretos base pueden configurarse desde `apps/api`:

```sh
npx wrangler preview base-config secret put DATABASE_URL --config ../../wrangler.jsonc
npx wrangler preview base-config secret put ACCESS_TEAM_DOMAIN --config ../../wrangler.jsonc
npx wrangler preview base-config secret put ACCESS_AUDIENCE --config ../../wrangler.jsonc
npx wrangler preview base-config secret put CATALOG_EDITOR_EMAILS --config ../../wrangler.jsonc
```

Se introducen interactivamente y se aplican al crear nuevas previews. Para
cambiar el secreto de una preview ya existente:

```sh
npx wrangler preview secret put DATABASE_URL --name dev --config ../../wrangler.jsonc
```

Desde la raíz del repositorio:

```sh
npm run build
npm run deploy:preview
# Nombre explícito opcional; por defecto se usa la rama Git actual.
npm run deploy:preview -- --name dev
```

El comando publica web y API de la rama y devuelve su URL. No mueve tráfico
de producción. Para publicar producción después del build:

```sh
npm run deploy:production
```

### Workers Builds conectado a Git

En Settings > Build configurar:

| Ajuste | Valor |
| --- | --- |
| Root directory | Raíz del repositorio (`/`) |
| Build command | `npm run build` |
| Deploy command | `npm run deploy:production` |
| Preview command | `npx wrangler preview` (o `npm run deploy:preview`) |
| Production branch | La rama estable elegida, por ejemplo `main` |
| Enable Preview Builds | Activado para las ramas secundarias, incluida `dev` |

La instalación debe usar Node 24, npm 11 y el lockfile (`npm ci`). El build
compila todos los workspaces y no necesita credenciales Neon: no ejecuta
migraciones, seed ni pruebas de integración. Esas tareas se realizan
explícitamente sobre la base correspondiente antes de probar la preview.
Los secretos de runtime se configuran en Worker/Previews Base config, no como
variables públicas del build ni variables `VITE_*`.

Workers anteriormente conectados a Builds pueden requerir **Set up Worker
Previews** en el dashboard. La documentación indica que ese cambio de modelo
no se puede revertir. Los scripts de este repositorio usan el modelo actual
por rama; no emplean `versions upload`, que reutiliza recursos de producción.

Tras publicar, comprobar login de Access en la URL de preview, aislamiento
entre usuarios, importación GPX y persistencia en la base de pruebas.

Referencias: [Worker Previews](https://developers.cloudflare.com/workers/previews/),
[configuración y secretos](https://developers.cloudflare.com/workers/previews/configuration/),
[Workers Builds y ramas](https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/)
y [Access para Workers](https://developers.cloudflare.com/workers/configuration/cloudflare-access/).

## Identidad y comportamiento

La API valida la firma RS256 de `Cf-Access-Jwt-Assertion` con las claves públicas
del dominio de equipo configurado. Verifica issuer, audience, expiración, `iat`,
`sub` y email. No confía en la cabecera de email ni en IDs del cliente.
La identidad estable `issuer|sub` resuelve una fila propia de `users`; el email
es solo su nombre. Las consultas y escrituras personales usan ese ID de usuario.
Dos identidades con el mismo email siguen siendo usuarios independientes.

Sin configuración válida, los endpoints personales responden 503; sin sesión
o con token inválido, 401. Las respuestas de API usan `private, no-store`.
Las escrituras con Origin ajeno se rechazan con 403. No hay CORS abierto.

`npm run dev:api` inyecta `LOCAL_DEVELOPMENT=true` únicamente en su archivo temporal
local. El usuario fijo solo se permite cuando el hostname de la petición es
localhost/loopback. Sus visitas existentes **no se transfieren automáticamente**
a una cuenta de Access.

## Comprobación tras publicar

- Abrir el dominio sin sesión: debe aparecer el login de Access.
- Entrar y comprobar `/api/places`, `/api/regions` y `/api/stats`.
- Guardar una visita, recargar y comprobar persistencia y progreso.
- Entrar con otra identidad autorizada: no debe ver el registro de la primera.
- Comprobar assets, terrain, atribuciones y ausencia de rutas alternativas públicas.

Las pruebas locales incluyen JWTs firmados de prueba y aislamiento real en Neon.
El login y las políticas de la cuenta de Cloudflare requieren comprobarse con la
aplicación Access real; no se han desplegado ni creado recursos de Cloudflare.

Referencias
oficiales: [validación de JWTs de Access](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)
y [assets estáticos del Worker](https://developers.cloudflare.com/workers/static-assets/).
