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

## Producción pública con cuentas

Producción se sirve en https://relieve.romanlafi.org usando
`wrangler.production.jsonc`. El catálogo y el mapa son públicos. Los visitantes
pueden crear una cuenta con nombre, correo y contraseña, confirmar su correo
mediante un código y recuperar la contraseña desde la propia aplicación.
Neon Auth gestiona las credenciales; producción no usa Cloudflare Access.

`NEON_AUTH_URL` apunta al servicio de la rama `production` de Neon. Las sesiones
se guardan en cookies del dominio de Relieve; el Worker valida cada petición
personal contra el servicio de Neon y resuelve una identidad de aplicación.
Las lecturas anónimas del catálogo devuelven `userState: null`. Los datos
personales requieren sesión y la edición global exige además un email
verificado incluido en el secreto `CATALOG_EDITOR_EMAILS`.

Configuración de Neon Auth por rama:

- Email y contraseña habilitados, registro abierto y verificación obligatoria.
- Verificación OTP, envío al registrarse e intentar entrar sin verificar.
- Dominio de producción permitido; localhost deshabilitado en producción.
- Los correos usan inicialmente el remitente compartido de Neon. Se puede
  configurar SMTP propio para personalizar el remitente y ampliar los límites.

La rama `production` contiene el catálogo y las migraciones. El Worker usa su
conexión pooled como secreto `DATABASE_URL`. No ejecutar seed en una publicación
normal. Las nuevas tablas de identidad y sesión las administra Neon Auth en el
esquema `neon_auth`, sin alterar los registros personales existentes.

Para publicar desde `main` después de validar staging:

```sh
npm run build
npm run deploy:production
```

Staging usa su propio servicio Neon Auth, junto a su base de datos aislada.
Configurar su URL exclusivamente en la preview staging:

```sh
npx wrangler preview secret put NEON_AUTH_URL --name staging --config wrangler.jsonc
```

Las URLs de Auth son configuración pública; las conexiones PostgreSQL y el
listado administrativo se mantienen como secretos del Worker. El build no
necesita credenciales ni conexión a Neon.

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

En producción, las cookies de Neon Auth son HttpOnly, Secure y SameSite=Lax,
restringidas al dominio de Relieve. La API comprueba la sesión con Neon en cada
petición personal, incluida su caducidad y que el correo esté verificado. Un
cierre de sesión revoca la cookie en Neon. `/api/me` informa de la sesión sin
exponer tokens; el navegador remonta el mapa al cambiar de identidad para
limpiar datos personales y sincroniza el cambio entre pestañas.

Las previews que no tengan `NEON_AUTH_URL` conservan la validación de JWT RS256
de Cloudflare Access. `LOCAL_DEVELOPMENT=true` solo funciona en localhost; si se
configura Neon Auth, este tiene prioridad para poder probar el login real.
No se aceptan IDs de usuario enviados por el cliente ni se enlazan identidades
por compartir un email. Las respuestas de la API usan `private, no-store`.
Las escrituras requieren el mismo origen y los permisos se comprueban en la API.

## Comprobación tras publicar

- Abrir el dominio sin sesión: mapa y catálogo disponibles, con botones de acceso.
- Registrarse, confirmar el código e iniciar sesión.
- Guardar favorito, nota y visita; recargar y comprobar persistencia.
- Entrar con otra cuenta y comprobar que no ve datos ni GPX de la primera.
- Recuperar la contraseña y volver a entrar.
- Cerrar sesión y comprobar que la cookie anterior ya no da acceso personal.
- Revisar escritorio, móvil y navegación con teclado del diálogo de acceso.

Referencias: [Neon Auth con React](https://neon.com/docs/auth/quick-start/react),
[verificación del correo](https://neon.com/docs/auth/guides/email-verification),
[producción](https://neon.com/docs/auth/production-checklist) y
[API de códigos OTP](https://better-auth.com/docs/plugins/email-otp).
