# Rutas GPX — primera versión

Milestone del 6 de octubre de 2026. Importar recorridos ya realizados, mostrarlos sobre el terreno y confirmar manualmente lugares cercanos. No integra Strava, planificación, navegación GPS, meteorología, fotos, recomendaciones ni servicios externos de rutas/elevaciones.

## Modelo PostGIS

`routes` pertenece a `users` mediante `user_id` con borrado en cascada. Tiene nombre, fecha de actividad nullable, geometría, distancia, desniveles, altitudes mínima/máxima, inicio/fin y timestamps. El trigger existente `set_updated_at` también se utiliza aquí.

Se conserva **MultiLineStringZ** cuando todos los puntos contienen elevación. Una línea por `trkseg`, en el orden del documento, también para varios `trk`. Nunca se añade un enlace entre segmentos ni se incluye ese salto en distancia o desnivel. Se rechazan segmentos vacíos, de un solo punto o sin dos coordenadas distintas.

Sin elevaciones se utiliza **MultiLineString 2D**. Una columna `geometry(MultiLineStringZ,4326)` obligaría a inventar Z para estos archivos; `geometry(Geometry,4326)` también impone dimensiones mediante typmod. Por ello Drizzle usa el `customType` existente con tipo SQL `geometry` y CHECK que exige MultiLineString, SRID 4326, 2 o 3 dimensiones y geometría válida no vacía. Si las elevaciones son parciales, la geometría es 2D y `elevation_samples` conserva los valores conocidos y los huecos como arrays nullable por segmento. Este campo interno no viaja en los DTOs del mapa.

Índices: B-tree por usuario y GiST de geometría. La detección utiliza el GiST ya existente de `places.location::geography`; la ruta se obtiene por ID y propietario, por lo que no hace falta otro índice geography de rutas para esta consulta.

Migración Drizzle: `0003_fair_swordsman.sql`, snapshot y journal. `db:migrate` aplica cada migración una vez mediante el registro de Drizzle; repetir el comando no recrea tablas, índices ni triggers. `db:generate` comprueba que el schema no diverge del snapshot.

## Parsing y seguridad

Nueva dependencia: [saxes](https://github.com/lddubeau/saxes), parser XML por eventos con validación de XML bien formado y soporte de namespaces. Aporta esa validación sin construir un DOM ni implementar un parser XML propio. No se resuelven recursos externos. DTD y declaraciones de entidades se rechazan antes de parsear, y también mediante el evento `doctype`. Solo se extrae la jerarquía GPX `gpx/trk/trkseg/trkpt` del namespace raíz (GPX 1.0, 1.1 o sin namespace); las extensiones no pueden hacerse pasar por puntos del track.

Límites:

- Archivo `.gpx`, UTF-8 válido y raíz GPX; no se confía en el MIME del cliente.
- 5 MiB de archivo y 5 MiB + 64 KiB para todo el multipart (campos y delimitadores).
- Se cuenta el cuerpo real incluso con Content-Length infradeclarado o sin esa cabecera.
- 50.000 trackpoints en total, profundidad XML máxima de 32 y campos relevantes de hasta 512 caracteres.
- Nombre normalizado de 1–200 caracteres; precedencia: nombre del formulario, primer nombre de track, nombre del archivo.
- Coordenadas finitas en longitud ±180 / latitud ±90. Elevaciones finitas entre −12.000 y 10.000 m. Fechas ISO con zona horaria.
- Un único archivo y un único campo nombre; confirmaciones con entre 1 y 100 UUID distintos.

Zod valida los puntos y entradas API; consultas Drizzle/SQL parametrizadas; todos los endpoints requieren la identidad verificada existente. Lectura, listado, proximidad, confirmación y borrado comprueban propietario. Una ruta de otro usuario devuelve 404.

No se almacena el XML ni el archivo original. React muestra nombres como texto; no se inserta HTML del GPX. Se conservan coordenadas originales y, cuando existen, sus elevaciones. No se almacenan tiempos individuales ni extensiones no usadas: una futura exportación fiel o auditoría podría justificar conservar el original en almacenamiento privado con políticas explícitas de tamaño y retención.

## Métricas

- Distancia horizontal geodésica: `ST_Length(ST_Force2D(geometry)::geography)` en metros sobre el elipsoide. Suma las líneas sin conectar segmentos. No es distancia 3D ni una estimación de dificultad.
- Mínimo/máximo sobre las elevaciones proporcionadas. Si son parciales, describen únicamente las muestras conocidas. Si no hay ninguna, ambos son null.
- Desnivel: por segmento, se parte de la primera elevación como referencia. Se ignoran cambios de menos de 3 m respecto a la referencia; al alcanzar esa diferencia se suma todo el cambio positivo/negativo y se mueve la referencia. Esto acumula pendientes suaves sin sumar cada pequeña oscilación. Se descarta el residuo inferior a 3 m al final de cada segmento. La geometría no se modifica. No elimina saltos grandes de GPS ni sustituye una futura evaluación con tracks reales. Si falta cualquier elevación, desniveles positivo/negativo null.
- Inicio, fin y fecha se ofrecen solo si todos los puntos tienen timestamps válidos y no decrecientes, en orden del documento. Duración total = fin − inicio, incluyendo pausas y huecos entre segmentos; no es tiempo en movimiento. Fecha de actividad = día UTC del inicio. Timestamps parciales o desordenados dejan estos campos null; timestamps malformados se rechazan.

No se consulta ningún servicio para completar altitudes o tiempos ausentes.

## API

El Worker sirve estos endpoints con prefijo `/api`; Hono trabaja sin ese prefijo:

| Método y endpoint | Resultado |
| --- | --- |
| `POST /routes` | Multipart `file` + `name` opcional; 201 con detalle y geometría normalizada |
| `GET /routes` | Resúmenes del usuario, más recientes primero, sin geometrías |
| `GET /routes/:id` | Resumen, duración y GeoJSON MultiLineString (XY/XYZ), sin XML ni muestras auxiliares |
| `DELETE /routes/:id` | 204; 404 si no existe o no pertenece al usuario; conserva visitas |
| `GET /routes/:id/nearby-places?distance=100` | `{place, distanceFromRoute, userState}[]`; 1–500 m; orden por distancia, nombre e ID |
| `POST /routes/:id/confirm-places` | JSON `{placeIds, useActivityDate: false}`; devuelve `UserPlace[]` |

La proximidad usa `ST_DWithin(place.location::geography, ST_Force2D(route.geometry)::geography, radius)` y `ST_Distance` para devolver metros. El umbral inicial de la interfaz y de la confirmación es **100 m**. La query de lectura permite otro radio, pero la confirmación de esta primera versión siempre revalida los 100 m. No compara alturas: un lugar puede quedar horizontalmente cerca y a otra cota. Tampoco certifica que el usuario haya alcanzado una cima. La interfaz explica esa limitación y muestra distancias.

La importación nunca crea visitas. El usuario selecciona lugares y confirma; el handler revalida que todos pertenezcan a la detección. `confirmVisitedPlaces` vive en el módulo existente de `user_places`, usa sus constraints/DTOs y realiza un único upsert SQL atómico para todo el lote. Conserva notas/favoritos. Si un registro ya estaba visitado, conserva su fecha, incluso si era null, frente a conflictos y escrituras concurrentes. La fecha GPX se ofrece mediante un checkbox inicialmente desmarcado y se aplica únicamente a nuevas visitas o estados anteriormente pendientes. Se bloquean dobles envíos en el cliente con un ref.

## Interfaz y mapa

La pestaña Rutas convive con Lugares y Mi progreso. Selección de archivo, nombre opcional, porcentaje real de subida con XMLHttpRequest, fase de procesado, errores, selector de rutas, métricas, detección, confirmación y borrado con confirmación local. El importador se pliega al seleccionar una ruta. La barra es desplazable y puede ocultarse para explorar el mapa, también en móvil. Vanilla Extract y tokens existentes; un token de color cálido distingue la línea de los puntos.

Una única source GeoJSON y line layer de MapLibre, por debajo de los POIs. `setData` cambia el recorrido y vacía la capa al deseleccionar/borrar. `fitBounds` encuadra cada selección, sin reencuadrar al confirmar visitas. No se recrea el mapa y se conserva terrain, pitch y controles. No se crean nodos DOM por trackpoint. Las confirmaciones refrescan lugares y estadísticas con el mecanismo existente de `usePlaces`.

Geometría canónica sin simplificación. El ensayo local con 10.000 puntos mostró importación y representación funcionales sin problemas observados; no justifica incorporar ST_Simplify todavía. Si aparecen problemas con recorridos largos reales, simplificar solo la respuesta de mapa con tolerancia métrica adecuada, conservando siempre el dato original y los segmentos.

## Verificación

Fixtures pequeños: Aneto, Renclusa (recorrido sintético), segmentos separados sin elevación y coordenadas inválidas. Las pruebas unitarias cubren XML inválido, namespaces/formato, falta/parcialidad de altitudes y tiempos, límites de tamaño/profundidad/puntos, elevación con ruido pequeño y múltiples segmentos. Las de integración usan PostGIS real, identidades Access firmadas diferentes, endpoints GPX, distancia conocida en el ecuador (dos segmentos ≈222,639 m sin sumar el salto), proximidad y ausencia de falso enlace, visita manual, preservación de fecha/notas/favoritos, progreso y borrado. Usuarios y puntos de prueba se limpian.

En Chrome se ha verificado importación mediante input de archivo, nombre, listado, métricas, line layer visible sobre terrain, fitBounds, misma instancia/canvas al confirmar, visita de la Renclusa con fecha UTC, actualización del POI y Mi progreso, recarga/persistencia, eliminación y limpieza de la capa sin borrar visitas. Escritorio 1440×900 y emulación táctil 390×844, barra desplazable, ocultar/mostrar controles y sin desbordamiento horizontal. Ensayo generado en memoria con 10.000 puntos / ~450 KiB: todos los puntos permanecen en el detalle y se representan en MapLibre; no se añadió un fichero grande al repositorio. Se restauró el historial previo del usuario de desarrollo y se eliminaron todas las rutas de prueba.

Checks ejecutados y correctos: `lint`, `typecheck`, `test` (14 pruebas), `test:integration` (6 pruebas), `build`, `db:check`, `db:migrate` repetido y `db:generate` sin drift. El build conserva el aviso de tamaño del bundle de MapLibre/Vite; no se ha ocultado. Consola tras recargar sin errores, warnings ni incidencias de formularios; solo mensajes de desarrollo de Vite/React.

## Evolución pendiente

- Validar la banda de desnivel de 3 m con tracks reales y evaluar saltos grandes de GPS.
- Probar tracks cercanos a los límites en el Worker de producción; el ensayo local no acredita rendimiento bajo cuotas de CPU/uso reales.
- Paginación de la lista cuando un usuario acumule muchas rutas; actualmente devuelve sus resúmenes completos.
- Fecha local/tiempo en movimiento y exportación GPX si se necesitan, sin inferir datos ausentes.
- Simplificación exclusiva de representación y conservación opcional del original solo si el uso real lo requiere.
- Revisar mantenimiento futuro del parser: el repositorio de saxes está archivado; la versión utilizada se verifica con fixtures adversariales y queda fijada en el lockfile.
