# Dataset del Pirineo aragonés

`places.geojson`: 74 lugares WGS84, en orden **[longitud, latitud]**.
`regions.json`: seis regiones con UUID, tipo y parentId; todas tienen geometry null.
`sources/osm-selection.json`: evidencia factual congelada de los elementos OSM
seleccionados, incluyendo las cotas reportadas que no se importan automáticamente.
`sources/selection.overpass`: consulta de revisión de esos identificadores, solo
para preparación de datos; nunca se ejecuta desde la aplicación o el seed.

La auditoría actual registra 4 descripciones editoriales y deja 64 de las 74
cotas sin confirmar como `null`; `npm run data:check` muestra este resumen por
tipo para guiar la siguiente revisión sin inventar datos.

| Región de exploración                    | Picos | Ibones | Refugios | Total |
|------------------------------------------|------:|-------:|---------:|------:|
| Valle de Benasque                        |     9 |     10 |        4 |    23 |
| Ordesa / Monte Perdido                   |     9 |      4 |        4 |    17 |
| Valle de Tena                            |     8 |      8 |        3 |    19 |
| Hecho / Ansó                             |     8 |      2 |        4 |    14 |
| Pirineo aragonés, sin subregión asignada |     0 |      1 |        0 |     1 |
| Total                                    |    34 |     25 |       15 |    74 |

El lugar directamente asociado al sector es el Ibón de Plan: pertenece al valle
de Gistaín/Chistau, no a Benasque ni a Ordesa. Se conserva el registro previo sin
forzar una clasificación falsa ni añadir otra zona de navegación en esta fase.

## Validación y seed

```text
npm run data:check
npm run db:migrate
npm run db:seed
npm test
npm run test:integration
```

El importador valida UUIDs, slugs únicos, nombres normalizados, tipos, coordenadas
finitas/en rango, referencias regionales, padres existentes y ausencia de ciclos.
Las descripciones editoriales son opcionales, limitadas a 2000 caracteres y
deben enlazar su evidencia en `additionalSources`. `db:seed` las sincroniza solo
cuando el dataset contiene el campo; los registros sin descripción no borran una
descripción editada desde la aplicación.
Una envolvente de revisión [-0.95, 42.45, 0.8, 42.94] detecta errores evidentes; **no es una frontera regional** ni
sustituye la procedencia o revisión del lugar.

Los UUID están persistidos en los archivos. Los seis lugares y Pirineos conservan
los UUID de la base existente; los nuevos se generaron una sola vez mediante UUIDv5 (namespace DNS y clave
`relieve.app/place/<tipo-osm>/<id>` o `relieve.app/region/<slug>`).
El seed nunca genera UUIDs ni utiliza el nombre como identidad. Cambiar el nombre,
slug, geometría o fuente no justifica regenerar el UUID del registro.

El seed inserta padres antes que hijos y hace upsert por **id**, dentro de una
transacción. Una colisión de slug con otro UUID aborta y exige reconciliación
explícita: no renumera lugares ni pierde relaciones personales silenciosamente.
Esto también se aplica a otra instalación antigua cuyos UUID fueran distintos.

No borra registros ausentes, ni lee/modifica `user_places`, ni inventa visitas.
Solo crea el usuario de desarrollo si falta. Se puede repetir conservando IDs,
favoritos, estados, notas y fechas. Los triggers pueden actualizar `updated_at`
de lugares/regiones aunque los valores importados no hayan cambiado.

Fuentes, atribución, discrepancias y limitaciones: [SOURCES.md](./SOURCES.md).
