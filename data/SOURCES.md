# Procedencia y revisión del dataset

Consulta: **1 de octubre de 2026**. Datos factuales, sin imágenes ni descripciones
copiadas. Las regiones son una jerarquía editorial de exploración: no se inventan
polígonos ni se afirma que coincidan con límites administrativos/hidrológicos.

## OpenStreetMap

[OpenStreetMap](https://www.openstreetmap.org/copyright), extraído durante preparación
con [Overpass](https://wiki.openstreetmap.org/wiki/Overpass_API) en
`https://overpass.kumi.systems/api/interpreter`. El proveedor informó una snapshot
OSM de **2026-05-31T22:37:44Z**, anterior a la consulta. No se presenta como un
inventario exhaustivo ni como una comprobación del estado operativo actual de refugios.

Se revisó una búsqueda amplia y se seleccionaron manualmente 68 elementos con
identidad concreta. Se descartaron aguas corrientes, fuentes, balsas genéricas,
elementos franceses interiores, duplicados way/relation, hoteles y agrupaciones
de lagos sin un punto individual inequívoco. Se conservaron algunos lugares
fronterizos accesibles desde las zonas aragonesas (picos y Tucarroya), sin afirmar
que todos sus lados estén en Aragón. La pertenencia es editorial y explícita,
no una clasificación automática por cuatro rectángulos.

Cada lugar nuevo enlaza su node/way/relation en `source`, conserva `osmId`, y,
si estaba disponible, `wikidataId` para trazabilidad. No se añade una columna a
PostgreSQL ni se consulta OSM/Wikidata en runtime. Los nombres en castellano
proceden de `name:es` cuando existe; se conservan variantes locales cuando no
existe, sin inventar una traducción. Las normalizaciones de Ibón de Anayet,
Estanés y Literola no cambian el identificador de la entidad.

Coordenadas: los picos utilizan los nodes publicados. Para polígonos de lago y
algunos refugios libres se conserva el **centro de bounds publicado por Overpass**,
identificado con `coordinateMethod: overpass-bounds-center`: es un punto de
representación cartográfica, no un acceso, cumbre, centroide de superficie ni
garantía de estar dentro de un polígono cóncavo. Los endpoints de geometría completa
no respondieron de forma fiable durante esta consulta, por lo que no se afirma
haber auditado la inclusión de cada centro dentro del agua. Revisar puntos
representativos con los polígonos originales antes de usos de navegación/proximidad
de precisión. No se mezclan esas coordenadas con las de un refugio cercano.

Las cotas OSM no se aceptaron como verdad absoluta: `reportedElevation` queda en
`sources/osm-selection.json`; las cotas sin corroboración independiente permanecen **null** en el dataset. Tampoco se
deducen del DEM de MapLibre. `hut` agrupa refugios
guardados y libres, sin garantizar servicios, apertura ni disponibilidad.

## Federación Aragonesa de Montañismo

Fichas oficiales para contrastar existencia, clasificación, ubicación regional y
coordenadas de refugios; `additionalSources` enlaza la ficha correspondiente.
Las coordenadas GEO DMS se convierten aritméticamente a WGS84 decimal, sin promediar
con OSM; se utiliza `coordinateMethod: official-published`.

| Ficha                                                                        | Cota importada | Nota                                                   |
|------------------------------------------------------------------------------|---------------:|--------------------------------------------------------|
| [Estós](https://www.alberguesyrefugios.com/estos/)                           |           1890 | FAM y OSM coinciden                                    |
| [La Renclusa](https://www.alberguesyrefugios.com/larenclusa/)                |           2138 | FAM y OSM coinciden                                    |
| [Casa de Piedra](https://www.alberguesyrefugios.com/casadepiedra/)           |           1636 | FAM y OSM coinciden                                    |
| [Pineta](https://www.alberguesyrefugios.com/pineta/)                         |           1240 | FAM y OSM coinciden                                    |
| [Ibones de Bachimaña](https://www.alberguesyrefugios.com/ibonesdebachimana/) |           2200 | FAM y OSM coinciden; no es un lago                     |
| [Respomuso](https://www.alberguesyrefugios.com/respomuso/)                   |           null | FAM 2200 / OSM 2220                                    |
| [Linza](https://www.alberguesyrefugios.com/linza/)                           |           null | Ficha FAM 1344 / OSM 1330; webcam FAM también usa 1330 |
| [Gabardito](https://www.alberguesyrefugios.com/gabardito/)                   |           null | Ficha FAM 1360 / OSM 1400; webcam FAM también usa 1400 |

No se usa la sección meteorológica de las fichas como dataset ni servicio.

## Contexto regional oficial

[Gobierno de Aragón: Ordesa y Monte Perdido](https://www.aragon.es/-/parque-nacional-de-ordesa-y-monte-perdido),
[sendero Estós–Batisielles–Escarpinosa](https://www.aragon.es/documents/20127/674325/S3_Estos_Escarpinosa.pdf/7f794810-de14-4f27-3ae5-2769fb2368d1)
y [nomenclátor de Ordesa](https://icearagon.aragon.es/toponimia/t22107.htm)
sirven de contraste de nombres, lugares y agrupación de exploración, no como
fuente de polígonos que este proyecto haya verificado.

Ordesa / Monte Perdido agrupa el macizo y accesos de Ordesa, Bujaruelo y Pineta.
Hecho / Ansó es un sector de exploración de Valles Occidentales, no un único valle;
incluye Estanés y Bisaurín. No se añade Lizara (Aragüés/Jasa) como si perteneciera
automáticamente a uno de esos dos valles.

## Los seis registros anteriores

Se mantienen sus UUID, coordenadas y decisiones previas:

- [Aneto](https://es.wikipedia.org/wiki/Pico_Aneto): 3404 m.
- [Posets](https://es.wikipedia.org/wiki/Pico_Posets): null por cotas 3368/3369/3375.
- [Monte Perdido](https://es.wikipedia.org/wiki/Monte_Perdido): null por cotas 3348/3355 (OSM reporta 3349).
- [Ibón de Plan](https://es.wikipedia.org/wiki/Ib%C3%B3n_de_Plan): 1910 m; asociado directamente al sector aragonés.
- [Góriz](https://www.alberguesyrefugios.com/goriz/): null por cotas 2200/2215.
- [Ángel Orús](https://www.alberguesyrefugios.com/angelorus/): 2150 m.

Los puntos originales de Monte Perdido e Ibón de Plan difieren de OSM (del orden
de centenares de metros y de un centenar de metros, respectivamente). No se
promedian ni se sustituyen silenciosamente: la fuente original sigue explícita.
Queda pendiente resolver esas diferencias con cartografía oficial de mayor precisión.
Se omiten los embalses de Bachimaña Alto/Bajo y los nombres colectivos de lagos,
evitando convertir un conjunto o un refugio en un único ibón ficticio.

## Atribución y licencia

La parte derivada de OSM y su snapshot factual se distribuyen bajo **ODbL 1.0**:
[licencia](https://opendatacommons.org/licenses/odbl/1-0/) y
[atribución OSM](https://osmfoundation.org/wiki/Licence/Attribution_Guidelines).
Atribución: **© OpenStreetMap contributors**. La web mantiene la atribución
OpenStreetMap visible de MapLibre; al reutilizar/exportar estos datos debe
conservarse también la atribución y procedencia del dataset, no solo la del mapa base.

Las fichas FAM se atribuyen a la Federación Aragonesa de Montañismo. Las fuentes
previas Wikipedia conservan sus enlaces de atribución; no se reproducen sus textos
descriptivos ni sus imágenes. Los IDs, metadatos y decisiones de normalización del
dataset están versionados y no se regeneran automáticamente al repetir el seed.
