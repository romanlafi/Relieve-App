# Primera experiencia cartográfica

## Estructura

- `MapView.tsx` y `MapView.css.ts`: composición a pantalla completa, leyenda,
  estados de carga/error/vacío, selector accesible y panel del lugar seleccionado.
- `usePlaces.ts`: petición abortable a `/api/places`, validación Zod del contrato
  `PlaceWithUserState[]` compartido y reintento sin reconstruir el mapa.
- `placesGeoJson.ts`: conversión de DTOs a `FeatureCollection<Point>` con orden
  `[longitude, latitude]`. Solo se representan peak, lake y hut; el UUID se
  conserva como `feature.id` y en las propiedades.
- `layers/placesLayer.ts`: una source GeoJSON con círculos de estado y una capa
  de iconos superpuesta para distinguir picos, lagos y refugios. Sin Marker DOM.
- `usePlacesMap.ts`: instancia MapLibre, eventos, ResizeObserver, actualización
  con `setData`, selección mediante feature-state y limpieza al desmontar.
- `mapConfig.ts`: cámara inicial, proveedores, terrain, hillshade y sprites
  canvas para los iconos propios y el mapa base.
- `placeSchemas.ts`: validación de DTOs de lectura y respuestas de guardado.
- `PlacePersonalForm.tsx` y `.css.ts`: controles HTML accesibles para el registro
  personal, sin dependencias de formularios.

## Estado personal

`/api/places` ya incluye `userState`; no se hace una petición por punto ni una
segunda descarga para combinar estados en el navegador. Guardar llama a
`PUT /api/user/places/:placeId`; quitar el registro usa DELETE. Solo se actualiza
el array React tras una respuesta válida del servidor, sin actualización
optimista. Los errores conservan el borrador y los datos anteriores. Durante
la petición el formulario se deshabilita y un ref bloquea envíos simultáneos,
incluyendo un cambio de selección. Al desmontar se aborta la petición pendiente.
Las modificaciones locales se aplican al pulsar Guardar.

El GeoJSON añade `status` (`unregistered`, `pending`, `visited`) y `favorite`;
las notas y fechas no se copian a la source cartográfica. `setData()` actualiza
la source existente, conservando UUIDs, selección, cámara e instancia WebGL.

Se mantiene el color de tipo y se añade un pictograma claro de montaña, agua o
refugio. Pendiente: círculo casi hueco con borde del tipo y pictograma atenuado.
Visitado: relleno del tipo y borde claro grueso. Sin registro: relleno del tipo
y borde oscuro fino. La selección aumenta el tamaño y resalta el borde. Son
expresiones de MapLibre, sin Markers DOM ni una segunda paleta de estados.
El favorito se indica y edita en el panel y aparece como una estrella dorada
junto al icono del lugar, también reflejada en la leyenda.

Pasar a pendiente elimina la fecha de visita, pero conserva notas y favorito.
El historial fechado permite registrar y eliminar varias visitas al mismo
lugar. Cambiar el estado actual a pendiente conserva esas visitas; quitar el
registro personal borra también su historial, favorito y notas, nunca el lugar
global.

## React y MapLibre

La instancia se guarda en un ref y no depende de los datos ni de la selección
para crearse. La carga del estilo y de la API son independientes; un ref guarda
el GeoJSON más reciente para evitar perder datos si llegan antes del mapa.
Las actualizaciones reutilizan la source existente. `promoteId: 'id'` hace que
los features renderizados y feature-state utilicen los UUID de nuestra API.

Los listeners y el ResizeObserver se retiran y `map.remove()` libera WebGL y
workers al desmontar. El fetch se aborta y sus respuestas dejan de aplicarse
cuando el componente se desmonta, también bajo StrictMode. El primer conjunto
de datos encuadra sus límites una sola vez; cambiar la selección no cambia la
cámara ni vuelve a cargar las teselas. Zoom máximo inicial 9 y pitch 25°.

El clic y el selector nativo comparten `selectedId`; el panel muestra nombre,
tipo y elevación, con un mensaje explícito cuando esta es `null`. El ID queda
disponible en React y en `data-place-id`, preparado para una futura ficha.
El selector ofrece la misma interacción sin depender de acertar en un punto
del canvas. Los controles nativos permiten zoom, rotación e inclinación.

Se importa solo `maplibre-gl/dist/maplibre-gl.css` como hoja del proveedor;
los estilos de la aplicación y las adaptaciones de controles usan Vanilla
Extract. El worker se sirve como un asset local de Vite (`?worker&url`), sin CDN
de código ni librería de componentes adicional.

## Mapa base y terreno

- [OpenFreeMap](https://openfreemap.org/quick_start/): estilo vectorial Dark
  sobre OpenStreetMap, sin clave ni registro. Se conserva la atribución nativa.
  Su sprite actual omite `circle-11` y `wood-pattern`; un resolver genera
  un círculo simple y un relleno forestal discreto localmente, evitando avisos
  al usar la cámara sin alterar los datos del mapa base.
- [Mapterhorn](https://mapterhorn.com/): DEM público global, con TileJSON en
  `https://tiles.mapterhorn.com/tilejson.json`, teselas de 512 px y codificación **terrarium**, comprobada en su
  metadata. Se conserva su atribución.
- Terrain activo con exageración 1 y sombreado moderado. Hillshade y terrain
  usan sources DEM separadas, como recomienda MapLibre, para conservar la
  calidad de renderizado. Ambas consultan el mismo proveedor.
- Los puntos se dibujan sobre la superficie del DEM y mantienen sus coordenadas
  geográficas originales. El DEM no sustituye la altitud del DTO: las alturas
  de pantalla dependen de su resolución/zoom y pueden diferir de la cota de
  una cumbre. No se emplea el valor de elevation como desplazamiento vertical.
- Si falla cualquiera de las sources DEM, se desactiva terrain y el sombreado,
  se muestra un aviso y siguen disponibles los lugares y el mapa base en 2D.

## API y despliegue

El navegador usa `/api/places` del mismo origen. El proxy de Vite y preview
lo conserva hacia el Worker; `worker.ts` retira `/api` antes de resolver Hono. `API_PROXY_TARGET` configura
el destino local y nunca es una variable pública `VITE_*`.

`wrangler.jsonc` de la raíz incluye los assets compilados de la web y enruta
`/api/*` al Worker antes de servir assets. Las sesiones se validan con Cloudflare
Access. Consultar `apps/api/DEPLOYMENT.md` para preparar dominio y cuenta.

Revisar los proveedores públicos y sus condiciones de servicio/atribución al
preparar producción. La pantalla necesita conectividad para las teselas y el
DEM; los datos de negocio permanecen en la API propia. MapLibre y su worker
aumentan el tamaño del build; no se ha añadido otro motor cartográfico ni
se ha ocultado el aviso de tamaño de Vite.

## Verificación de esta fase

Lint, typecheck y build. En Chrome: respuesta real de `/api/places`, seis
features renderizados, IDs correctos, colores, selección por clic, cursor,
resaltado, panel con cota conocida/null, cámara, viewport móvil y ausencia de
errores/avisos de consola. También se simularon carga diferida, array vacío,
respuesta 503 con reintento y fallo del DEM con continuidad en 2D.

Para el registro personal se comprobó el ciclo sin registro → pendiente →
visitado, fecha, notas y favorito, recarga con persistencia, vuelta a pendiente
con limpieza de fecha, desmarcado de favorito y eliminación sin borrar el lugar.
El GeoJSON cambió en la misma instancia/canvas y mantuvo la selección.
También se comprobó un fallo de guardado conservando el borrador y un doble
submit bloqueado durante la petición, controles en móvil y consola sin errores.
Las comprobaciones HTTP incluyeron upserts parciales, defaults, fechas inválidas
y bisiestas, notas nulas/límite, claves desconocidas, 400/404 y DELETE repetido.
Se eliminaron los registros temporales creados al probar; no se dejaron visitas
ficticias en el usuario de desarrollo.

## Dataset ampliado y navegación

`MapFilters.tsx` y `.css.ts` contienen controles nativos combinables de tipo,
estado y región en un details plegable, inicialmente cerrado para no tapar el
terreno. `useRegions.ts` obtiene y valida `/api/regions` con abort/reintento.
`placeFilters.ts` serializa filtros y concilia el estado personal tras guardar.

La API filtra los 74 lugares de PostgreSQL; el navegador no descarga todo para
filtrarlo localmente. La jerarquía se reconstruye con parentId y se representa
con opciones indentadas. Sin registrar mantiene userState null, sin sintetizar
relaciones pending. El selector de lugares solo ofrece los resultados visibles.
El alcance inicial se configura con el slug público `pirineo-aragones`, no un
UUID. La lista, nombres, tipos y relaciones de regiones siempre llegan de la API.

Cambiar filtros aborta la lectura anterior y elimina la selección anterior.
Los filtros combinan tipo, estado personal, región, macizo y rango de altitud.
La altitud se aplica al confirmar y excluye lugares sin cota conocida; macizo
se combina con región como una intersección de ambas áreas.
La respuesta valida el contrato e instala el nuevo GeoJSON con setData (), sin
recrear instancia, listeners o canvas. Cambiar región encuadra una vez sus datos;
cambiar tipo/estado o guardar no vuelve a mover la cámara. El encuadre desktop
deja margen para los controles. No se descarga por cada movimiento de cámara
todavía; el endpoint admite viewport para incorporarlo cuando sea necesario.

Después de guardar se aplica la respuesta y se retira inmediatamente un lugar
que deje de cumplir el filtro personal; después se revalida el resultado con
la misma consulta a la API. La comprobación local es únicamente conciliación
post-mutación, no la estrategia de filtrado del dataset. Mientras se guarda se
bloquean los filtros para evitar mezclar lecturas y escrituras. La selección
se conserva si el lugar sigue cumpliendo los filtros; si desaparece se cierra
el panel y aparece un mensaje de confirmación.

Los radios interpolan según zoom (3 px en vista general, 6–8 px al acercarse,
con prioridad para selección/visitado), conservando la diferenciación por tipo
y estado. No se añadieron labels permanentes ni clustering: con el dataset
real, puntos pequeños y navegación por región no hubo cobertura excesiva del
terreno. Hay solapamientos puntuales en cumbres próximas a zoom general; se
resuelven acercándose o con el selector accesible. Revisar clustering cuando
crezca el dataset, no añadirlo solo por alcanzar una cifra.

Se comprobaron las cuatro regiones, tres tipos, estados y combinaciones, cambios
que conservan/retiran el POI, terrain, misma instancia/canvas, escritorio y móvil,
panel desplazable y consola sin errores. Los tests de integración verifican
queries combinadas, descendientes, userState null y seed repetido, incluida
preservación de relaciones y registros ausentes, con rollback/limpieza.

## Progreso, búsqueda y responsive

`StatsSummary.tsx` obtiene y valida `/api/stats`, aborta lecturas obsoletas y
permite reintentar. `usePlaces` incrementa `mutationVersion` solo tras una
escritura confirmada; ese contador refresca el progreso también al eliminar.
Las agregaciones abarcan el catálogo completo, independientemente de filtros
o búsqueda, y excluyen alturas desconocidas de las estadísticas de elevación.

La búsqueda ignora mayúsculas y tildes, afecta al selector de resultados y no
retira POIs del mapa. Su alcance está explicado junto al input: resultados de
los filtros actuales. Elegir un resultado enfoca la cámara, respetando reduced
motion; cerrar o guardar no reconstruye el mapa. Región y coordenadas se
muestran en la ficha, reutilizando una única carga de regiones compartida con
los filtros.

Los paneles izquierdos fluyen en una barra desplazable. En móvil la ficha
es inferior y desplazable; la barra de exploración y la leyenda se ocultan al abrir
la ficha para conservar espacio de terreno. Cerrar restaura la barra y devuelve
el foco al selector; Escape también cierra. Se comprobó escritorio y viewport
390×844 con emulación táctil, búsqueda, guardar/eliminar y actualización del
progreso, sin desbordamiento horizontal ni errores de consola. Los registros
de prueba se eliminaron.
