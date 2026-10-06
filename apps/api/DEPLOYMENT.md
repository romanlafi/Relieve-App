# Publicación con Cloudflare Access

La web compilada y la API se sirven desde un mismo Worker. El navegador usa
`/api/*`; `worker.ts` retira ese prefijo antes de pasar la petición a Hono.
`wrangler.production.jsonc` sirve los assets de `apps/web/dist` y ejecuta el
Worker primero para `/api/*`. La configuración local no requiere compilar la web.

## Configuración de la cuenta

1. Elegir un dominio propio gestionado en Cloudflare y asociarlo al Worker
   `relieve-api` mediante un Custom Domain. Alternativamente añadir `routes`
   con `custom_domain: true` al archivo de producción con el dominio real.
2. Crear una aplicación Self-hosted de Cloudflare Access que proteja **todo el
   dominio**, incluida la web y `/api/*`, con una política que permita únicamente
   los usuarios deseados. Access se encarga de la pantalla de inicio de sesión.
3. Configurar `ACCESS_TEAM_DOMAIN` como `https://TU-EQUIPO.cloudflareaccess.com`
   (sin barra final) y `ACCESS_AUDIENCE` con el Application Audience (AUD) de esa
   aplicación. Son configuración del Worker, no variables `VITE_*`.
4. Configurar `DATABASE_URL` como secreto del Worker. No subir la conexión directa.
   No configurar `LOCAL_DEVELOPMENT` en producción. `workers_dev` y las preview
   URLs están deshabilitados para evitar accesos alternativos al dominio protegido.
5. Aplicar las migraciones con `npm run db:migrate` y compilar con `npm run build`.
   El build de API es un dry-run y **no publica**.

Desde `apps/api`, después de configurar cuenta y dominio:

```sh
npx wrangler secret put DATABASE_URL --config wrangler.production.jsonc
npx wrangler secret put ACCESS_TEAM_DOMAIN --config wrangler.production.jsonc
npx wrangler secret put ACCESS_AUDIENCE --config wrangler.production.jsonc
npx wrangler deploy --config wrangler.production.jsonc
```

Los comandos `secret put` piden el valor de forma interactiva. No incluir
credenciales en scripts, argumentos de terminal ni archivos versionados.

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
