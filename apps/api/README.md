# Estado personal de lugares

## Endpoints

En local se usa el usuario definido en `packages/database/src/developmentUser.ts`.
En producción el catálogo es público. Neon Auth gestiona registro, correo
verificado, contraseña y sesión; cada cuenta conserva relaciones personales
separadas. Los endpoints personales requieren una sesión verificada. Las
previews pueden mantener Cloudflare Access como barrera externa.
Consultar [DEPLOYMENT.md](./DEPLOYMENT.md) para configurar cuenta y dominio.

| Método | Ruta                    | Respuesta                                                      |
|--------|-------------------------|----------------------------------------------------------------|
| GET    | `/places`               | Array de lugares con `userState` nullable                      |
| GET    | `/places/:id`           | Lugar con `userState` nullable                                 |
| PUT    | `/places/:id`           | Edita datos globales; requiere email en `CATALOG_EDITOR_EMAILS` |
| GET    | `/me`                   | Identidad, disponibilidad de login y permiso de edición         |
| GET    | `/user/places`          | Array de relaciones personales                                 |
| GET    | `/user/places/:placeId` | Relación personal, o `null` si el lugar existe sin registro    |
| PUT    | `/user/places/:placeId` | Upsert; devuelve la relación guardada                          |
| DELETE | `/user/places/:placeId` | 204; elimina la relación personal y su historial                |
| GET    | `/user/places/:placeId/visits` | Historial de fechas de visita del lugar                    |
| POST   | `/user/places/:placeId/visits` | Añade una fecha y deja el estado actual como visitado      |
| DELETE | `/user/places/:placeId/visits/:visitId` | Elimina una fecha de visita                   |
| GET    | `/stats`                | Progreso agregado del catálogo completo para el usuario actual |

`/stats` devuelve total, visited, pending, favorites, byType, byRegion, byYear,
threeThousands y highestPeak. `byRegion` agrega cada región junto a sus
descendientes; los totales de regiones anidadas pueden solaparse. `byYear`
cuenta fechas registradas, incluidas varias visitas al mismo lugar y año.
Las fechas anteriores guardadas en `user_places` se migran al historial nuevo.
Los contadores se agregan en SQL sobre un LEFT JOIN limitado al
usuario autenticado; el pico más alto excluye alturas desconocidas y tiene
desempate estable. Los tresmiles cuentan únicamente picos de altitud conocida
mayor o igual a 3000 m. Los filtros del mapa no modifican este resumen.

La relación expuesta contiene `placeId`, `status`, `favorite`, `visitedAt` y
`notes`. Dentro de `userState` se omite `placeId`, ya disponible en el lugar.
Los lugares inexistentes responden 404; los UUID o cuerpos inválidos, 400.
DELETE es idempotente para un lugar existente, aunque no tuviera registro.

## Registro y sesiones

Con `NEON_AUTH_URL`, `GET /me` y las lecturas del catálogo permiten visitantes;
los registros personales, estadísticas, GPX y cualquier escritura exigen sesión.
El Worker comprueba la cookie contra `get-session` de Neon en cada petición,
sin caché de sesión, y exige correo verificado. El identificador estable de Neon
se guarda con prefijo de proveedor en la columna histórica `users.access_subject`.
No se vinculan automáticamente cuentas de distintos proveedores por email.

El proxy del mismo origen expone únicamente estos POST bajo `/api/auth`:
`sign-up/email`, `sign-in/email`, `sign-out`, `email-otp/verify-email`,
`email-otp/send-verification-otp`, `email-otp/request-password-reset` y
`email-otp/reset-password`. Valida cuerpos, tamaño y Origin antes de reenviar.
Las cookies son host-only, HttpOnly, Secure y SameSite=Lax; las respuestas no
exponen tokens y no hay almacenamiento de credenciales en localStorage.

## Edición del catálogo

`PUT /places/:id` requiere autenticación y que el email verificado de la cuenta
aparezca en `CATALOG_EDITOR_EMAILS`, una lista separada por comas y
comparada sin distinguir mayúsculas. En desarrollo local, `LOCAL_DEVELOPMENT`
solo habilita al usuario local en localhost. La API devuelve 403 a los demás;
ocultar el formulario en la web no sustituye esta comprobación.

El editor puede cambiar nombre, tipo, altitud, región, coordenadas y descripción.
El slug permanece estable y no se permite crear o borrar registros desde esta
interfaz. La región debe existir y las coordenadas/altitud se validan antes de
escribir. Para habilitarlo en Cloudflare, configurar `CATALOG_EDITOR_EMAILS`
como secreto en el Worker o en Previews Base config.

## PUT parcial

```json
{
  "status": "visited",
  "visitedAt": "2026-08-12",
  "favorite": true,
  "notes": "Nota personal"
}
```

- Se exige al menos un campo reconocido. No se admiten claves adicionales.
- `status`: únicamente `pending` o `visited`.
- `favorite`: booleano independiente; funciona en ambos estados.
- `notes`: string de hasta 5000 caracteres o `null` para borrarlas.
- `visitedAt`: fecha real `YYYY-MM-DD` o `null`, sin hora ni zona horaria.
- Los campos omitidos se conservan en un registro existente. Al crear uno,
  los defaults son `pending`, `favorite: false`, fecha y notas nulas.
  Por tanto, un PUT de solo favorito sobre un lugar sin registro crea un pendiente.
- Pasar de `visited` a `pending` **borra siempre `visitedAt`**, incluso cuando
  se omite el campo. Conserva favorito, notas e historial. Volver a visitado
  no restaura la fecha principal. Un visitado sin fecha es válido.
- Una fecha no nula requiere estado efectivo `visited`: se rechaza si se
  envía junto a `pending`, o sin estado sobre un pendiente/sin registro.
  En un visitado existente se puede guardar una fecha sin cambiar notas o favorito;
  las fechas nuevas también se agregan al historial, sin duplicar el mismo día.

Se conserva el tipo `timestamptz` del esquema existente: las fechas nuevas se
almacenan a medianoche UTC y los DTO usan la fecha UTC, sin conversiones de
zona local. El historial usa una fecha SQL y no admite horas. Pasar a pendiente
limpia la fecha principal, pero conserva visitas anteriores; quitar el registro
personal elimina también su historial.

## Separación y concurrencia

`validation/userPlaces.ts` valida con Zod; `handlers/userPlaces.ts` resuelve HTTP;
`packages/database/src/userPlaces.ts` contiene las consultas y
`packages/database/src/dto/userPlace.ts` transforma filas a DTO.

`places.ts` combina lugares y relaciones con un LEFT JOIN cuyo filtro de usuario
está en el ON: no elimina lugares sin registro ni mezcla datos de otros usuarios.
La restricción única `(user_id, place_id)` permite el upsert; el merge de campos
omitidos se hace en SQL usando los valores vigentes, no sobrescribiendo una
copia previamente leída. La fecha se limpia con CASE cuando el estado efectivo
es pendiente, conservando el constraint incluso ante escrituras concurrentes.
La lectura previa comprueba existencia y compatibilidad de la fecha; si otra
petición cambia simultáneamente a pendiente, prevalece la limpieza de fecha.

Runtime conserva `DATABASE_URL` pooled. Herramientas, migraciones y seed
mantienen `DATABASE_URL_DIRECT`; ninguna credencial se envía al frontend.

## Filtros de lugares y jerarquía

`GET /places` admite filtros combinables validados por Zod:

```text
/places?type=peak
/places?region=valle-de-benasque
/places?status=visited
/places?status=unregistered
/places?favorite=true
/places?type=peak&region=valle-de-benasque&status=pending
/places?region=pirineo-aragones&north=42.9&south=42.5&east=0.7&west=-0.9
/places?massif=ordesa-monte-perdido&elevationMin=2500&elevationMax=3500
```

`type`: peak/lake/hut/pass/viewpoint; `status`: pending/visited/unregistered.
`favorite` acepta exclusivamente `true` o `false`, no coerción de strings a truthy.
`favorite=false` selecciona relaciones registradas no favoritas, no filas ausentes;
para ausencia se usa `status=unregistered` (userState null, sin crear pendientes).
`massif` admite el slug de una región de tipo macizo. `elevationMin` y
`elevationMax` admiten cotas enteras entre -500 y 9000 m; si se envían ambas,
la mínima no puede superar la máxima. Las cotas nulas no coinciden con filtros
de altitud. Región y macizo pueden combinarse y se intersectan.

La región se identifica por slug. Una CTE recursiva obtiene la región y sus
descendientes a través de parent_id; usa UNION para no repetir IDs y terminar
incluso si hubiera un ciclo accidental en la base. No requiere polígonos.
Una región bien formada pero inexistente devuelve un array vacío. Los DTOs
incluyen regionId para relacionarlos con `/regions`, sin un join adicional.

El viewport exige los cuatro límites finitos/en rango, north > south y east >
west. Viewports cruzando el antimeridiano no se admiten en esta fase regional.
Se aplica `location && ST_MakeEnvelope(...,4326)`, compatible con GiST. Todos
los filtros se aplican en PostgreSQL sobre el LEFT JOIN filtrado por usuario,
en una única consulta de datos parametrizada, sin N+1.

`GET /regions` devuelve estructura plana ordenada por nombre con id, name,
slug, type y parentId; el frontend reconstruye el árbol para las opciones,
sin IDs/regiones hardcodeados.
