# Proyecto: Mountain App / mapa personal de montaña

## Estado de desarrollo — 1 de octubre de 2026

Este apartado registra el estado real; las fases siguientes siguen siendo el roadmap de referencia.

- Fases 0–4 implementadas: monorepo, Neon/PostGIS, dataset de 74 lugares, API, mapa 3D y registro personal persistente.
- Segunda milestone completada: seleccionar un lugar, guardar una visita y actualizar mapa y estadísticas sin recargar.
- Fase 5: tokens y paneles coherentes, búsqueda por nombre entre resultados filtrados, ficha con región y coordenadas.
- Fase 6: filtros por tipo, estado, favoritos y región con descendientes. Altitud y macizos siguen pendientes.
- Fase 7: resumen SQL del catálogo completo: visitados por tipo, pendientes, favoritos, tresmiles con altitud conocida y
  pico más alto visitado. Desgloses por región/macizo/año pendientes.
- Fase 8: barra de controles desplazable y ficha inferior en móvil, con comprobación en navegador. Queda pulido
  adicional con uso real.
- Producción preparada: web estática y `/api/*` en un mismo Worker, validación de sesiones Cloudflare Access y
  separación de usuarios por identidad verificada.
- Pendiente externo para publicar: dominio, aplicación/política de Access, audience y secreto de base de datos en
  Cloudflare. No se ha desplegado.
- GPX continúa fuera del MVP.

Para ejecutar y publicar, consultar `README.md` y `apps/api/DEPLOYMENT.md`.

## 1. Objetivo general

Construir una aplicación web para explorar visualmente los Pirineos y llevar un registro personal de lugares de montaña
visitados o pendientes.

La aplicación debe centrarse inicialmente en:

- Picos.
- Ibones.
- Refugios.
- Collados, opcionalmente más adelante.
- Visualización geográfica sobre mapa con terreno 3D.
- Registro de lugares visitados y pendientes.
- Estadísticas personales.
- Importación futura de rutas GPX.
- Uso real de PostgreSQL + PostGIS para consultas geográficas.

No buscamos construir un clon de Komoot, Strava o Wikiloc.

La prioridad es crear una aplicación técnicamente interesante, limpia, visual y suficientemente acotada para funcionar
como proyecto de portfolio.

---

# 2. Alcance inicial

La primera versión debe centrarse en los Pirineos.

Si necesitamos reducir aún más el alcance durante el desarrollo, empezar por:

- Pirineo aragonés.
- Benasque.
- Ordesa.
- Valle de Tena.
- Hecho / Ansó.

La arquitectura debe permitir añadir posteriormente:

- Pirineo catalán.
- Pirineo navarro.
- Pirineo francés.
- Otros sistemas montañosos.

---

# 3. Stack tecnológico

## Frontend

- React
- TypeScript
- Vite
- MapLibre GL JS
- Vanilla Extract

No utilizar Tailwind.

Toda la aplicación debe usar TypeScript con tipado estricto.

## Estilos

Sistema principal:

- Vanilla Extract

Posible complemento futuro:

- Sprinkles

Sprinkles solo debe introducirse si simplifica de forma clara layouts, spacing o responsive.

No intentar recrear Tailwind utilizando Sprinkles.

Preferencia:

```text
Vanilla Extract
+
CSS moderno
+
CSS variables
+
design tokens
```

Los estilos deben generarse estáticamente durante el build.

Evitar CSS-in-JS en runtime.

## Backend

- Cloudflare Workers
- TypeScript
- Hono

La API debe ser independiente del frontend.

## Base de datos

- PostgreSQL
- Neon
- PostGIS

PostGIS no debe utilizarse únicamente para almacenar latitud y longitud.

Debe aprovecharse para consultas geográficas reales.

## ORM / acceso a datos

Preferencia:

- Drizzle ORM

Para operaciones específicas de PostGIS puede utilizarse SQL directamente cuando resulte más limpio o práctico.

---

# 4. Arquitectura deseada

Ejemplo inicial:

```text
mountain-app/
│
├── apps/
│   ├── web/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── features/
│   │   │   ├── pages/
│   │   │   ├── styles/
│   │   │   ├── map/
│   │   │   └── lib/
│   │   └── package.json
│   │
│   └── api/
│       ├── src/
│       └── package.json
│
├── packages/
│   ├── shared/
│   │   └── src/
│   │       └── types/
│   │
│   └── database/
│       ├── schema/
│       └── migrations/
│
├── data/
│   ├── peaks.geojson
│   ├── lakes.geojson
│   ├── huts.geojson
│   └── regions.geojson
│
└── package.json
```

No añadir complejidad de monorepo innecesaria.

Si inicialmente resulta más práctico trabajar con una estructura más sencilla, hacerlo.

La arquitectura debe poder evolucionar sin rehacer el proyecto entero.

---

# 5. Filosofía del proyecto

Prioridades:

1. Funcionalidad.
2. Modelo de datos correcto.
3. Buena arquitectura.
4. Experiencia visual.
5. Código mantenible.
6. Features adicionales.

Evitar:

- sobreingeniería;
- abstracciones prematuras;
- arquitecturas excesivamente complejas;
- introducir servicios externos sin necesidad;
- crear funcionalidades que no formen parte del MVP.

Cada dependencia nueva debe aportar una utilidad clara.

---

# 6. Filosofía visual

La aplicación debe sentirse principalmente como una experiencia cartográfica.

No debe parecer:

- panel administrativo;
- CRM;
- dashboard empresarial;
- aplicación basada en tarjetas.

La interfaz debe dejar protagonismo al terreno.

Preferencia estética:

- dark mode;
- tonos naturales;
- tierra;
- piedra;
- vegetación;
- agua;
- grises;
- contraste claro pero contenido;
- transparencias moderadas;
- panels flotantes;
- bordes discretos;
- sombras muy suaves.

Evitar:

- gradientes excesivos;
- colores neón;
- glassmorphism exagerado;
- tarjetas por todas partes;
- sombras enormes;
- animaciones constantes.

---

# 7. Vanilla Extract

Los estilos deben organizarse utilizando Vanilla Extract.

Ejemplo:

```text
PlaceCard/
├── PlaceCard.tsx
└── PlaceCard.css.ts
```

Otro ejemplo:

```text
MapSidebar/
├── MapSidebar.tsx
├── MapSidebar.css.ts
└── index.ts
```

Preferencia:

```text
componente.tsx
→ estructura + comportamiento

componente.css.ts
→ presentación
```

No introducir grandes cantidades de estilos inline.

Evitar mezclar lógica visual compleja directamente dentro del JSX.

---

# 8. Design tokens

Crear un pequeño sistema de tokens desde el comienzo.

No hardcodear constantemente los mismos colores y medidas.

Ejemplo conceptual:

```ts
export const vars = createGlobalTheme(":root", {
    color: {
        background: "#161816",
        surface: "#20231f",
        surfaceElevated: "#292c27",

        text: "#ecece8",
        textMuted: "#a7aaa3",

        border: "#383c35",

        terrain: "#8a806c",
        vegetation: "#62705b",
        water: "#527c8e",

        visited: "#...",
        pending: "#...",
        favorite: "#..."
    },

    space: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px"
    },

    radius: {
        sm: "6px",
        md: "10px",
        lg: "14px"
    }
});
```

Estos valores son orientativos.

No fijar una paleta definitiva antes de ver la aplicación funcionando.

Los tokens deben permitir ajustar posteriormente la identidad visual sin recorrer cientos de componentes.

---

# 9. Responsive

Usar CSS moderno.

Preferir:

- CSS Grid;
- Flexbox;
- media queries;
- container queries cuando aporten valor;
- `clamp()`;
- `min()`;
- `max()`;
- variables CSS.

Evitar soluciones JavaScript para layout si CSS puede resolverlas.

La aplicación debe funcionar especialmente bien en escritorio.

Responsive móvil debe existir, pero el diseño principal puede estar optimizado inicialmente para desktop.

---

# 10. Sprinkles

No instalar Sprinkles automáticamente.

Añadirlo únicamente si aparece suficiente repetición en propiedades como:

```text
display
flexDirection
alignItems
justifyContent
gap
padding
margin
```

Si se utiliza, debe ser deliberadamente pequeño.

Ejemplo:

```ts
sprinkles({
    display: "flex",
    alignItems: "center",
    gap: "md"
});
```

No crear cientos de utilities.

No convertir Sprinkles en un sustituto completo de Tailwind.

---

# 11. Conceptos principales

## Place

Representa un lugar de montaña.

Tipos:

```ts
type PlaceType =
    | "peak"
    | "lake"
    | "hut"
    | "pass"
    | "viewpoint";
```

Inicialmente trabajar solo con:

```text
peak
lake
hut
```

Campos aproximados:

```text
id
name
slug
type
elevation
coordinates
region_id
massif_id
description
created_at
updated_at
```

La ubicación debe almacenarse usando PostGIS.

Preferentemente:

```text
GEOGRAPHY(Point, 4326)
```

o:

```text
GEOMETRY(Point, 4326)
```

Seleccionar la alternativa más adecuada según las consultas previstas y documentar la decisión.

---

# 12. Regiones y jerarquía geográfica

Queremos poder representar jerarquías como:

```text
Pirineos
│
├── Pirineo occidental
├── Pirineo central
│   ├── Maladeta
│   ├── Posets
│   └── Monte Perdido
└── Pirineo oriental
```

No es necesario implementar toda esta taxonomía inicialmente.

Modelo aproximado:

```text
regions

id
name
slug
type
parent_id
geometry
```

Tipos posibles:

```text
mountain_system
sector
massif
valley
```

`parent_id` permite construir jerarquías.

La geometría puede ser:

```text
Polygon
MultiPolygon
```

---

# 13. Sistema de visitas

Los lugares no deben contener directamente:

```text
visited
```

La información personal debe estar separada.

Modelo aproximado:

```text
user_places

id
user_id
place_id
status
visited_at
favorite
rating
notes
created_at
updated_at
```

Preferencia:

```text
status:
pending | visited

favorite:
boolean
```

Un lugar puede estar visitado y ser favorito simultáneamente.

---

# 14. Multiusuario

Aunque inicialmente la aplicación pueda utilizarla una sola persona, diseñar el modelo para soportar múltiples usuarios.

No es necesario implementar autenticación desde el primer momento.

Durante desarrollo puede existir un usuario fijo.

No acoplar los datos personales a los registros globales de lugares.

---

# 15. Funcionalidad principal del mapa

La pantalla principal debe ser el mapa.

El mapa debe funcionar como interfaz principal de la aplicación.

Usar:

- MapLibre GL JS;
- terrain;
- pitch;
- bearing;
- zoom;
- GeoJSON;
- layers;
- markers solo cuando sean apropiados.

Debe permitir:

- visualizar picos;
- visualizar ibones;
- visualizar refugios;
- seleccionar un lugar;
- abrir su ficha;
- diferenciar visitados y pendientes;
- filtrar por tipo.

Filtros principales:

```text
Todos
Picos
Ibones
Refugios
```

Filtros personales:

```text
Todos
Visitados
Pendientes
Favoritos
```

---

# 16. Arquitectura del mapa

No concentrar toda la lógica cartográfica en un único componente enorme.

Separar responsabilidades.

Ejemplo:

```text
map/
├── MapView.tsx
├── MapView.css.ts
├── mapConfig.ts
├── layers/
│   ├── placesLayer.ts
│   ├── lakesLayer.ts
│   └── routesLayer.ts
├── hooks/
│   ├── useMap.ts
│   └── useMapPlaces.ts
└── utils/
```

No sobrefragmentar inicialmente.

La estructura anterior es una dirección, no una obligación.

---

# 17. Ficha de lugar

Al seleccionar un lugar debe aparecer un panel.

Ejemplo conceptual:

```text
ANETO

3.404 m
Pico
Macizo de la Maladeta

Visitado
12/08/2026

★ Favorito
```

Datos iniciales:

- nombre;
- tipo;
- altitud;
- región;
- macizo;
- coordenadas;
- estado personal;
- fecha de visita;
- notas.

No incluir inicialmente:

- fotos;
- meteorología;
- reseñas;
- comentarios;
- social;
- recomendaciones IA.

---

# 18. Paneles flotantes

Los controles secundarios deben convivir con el mapa.

Posibles componentes:

```text
MapToolbar
PlaceDetailsPanel
MapFilters
RegionSelector
StatsSummary
```

Los panels pueden utilizar:

```text
background
border
backdrop-filter
```

de forma moderada.

No oscurecer excesivamente el mapa.

El usuario debe seguir percibiendo el terreno como elemento principal.

---

# 19. Estadísticas

Crear una sección sencilla de progreso.

Ejemplos:

```text
Picos visitados
17 / 146

Ibones visitados
26 / 193

Refugios visitados
8 / 41
```

Otras estadísticas:

- pico más alto visitado;
- número total de lugares;
- tresmiles visitados;
- visitas por tipo;
- progreso por macizo;
- progreso por región;
- visitas por año.

Priorizar agregaciones SQL.

---

# 20. Uso de PostGIS

PostGIS debe ser una parte importante del proyecto.

No limitarse a almacenar:

```text
latitude
longitude
```

Queremos realizar consultas como:

```text
lugares a menos de X km
```

utilizando:

```sql
ST_DWithin
(...)
```

También:

```text
lugares dentro de una región
```

con:

```sql
ST_Contains
(...)
```

Y:

```text
lugares dentro del área visible del mapa
```

utilizando bounding boxes.

El frontend puede enviar:

```text
north
south
east
west
```

y el backend debe devolver únicamente los lugares necesarios.

---

# 21. Índices espaciales

Crear índices adecuados.

Ejemplo:

```sql
CREATE INDEX...
    USING GIST (...);
```

sobre columnas geográficas.

No realizar consultas espaciales importantes sin revisar que existan índices apropiados.

---

# 22. Datos iniciales

No depender inicialmente de APIs externas.

La aplicación debe funcionar utilizando:

- frontend;
- API;
- PostgreSQL/PostGIS;
- datasets propios.

Mantener datasets versionados.

Ejemplo:

```text
data/
├── peaks.geojson
├── lakes.geojson
├── huts.geojson
└── regions.geojson
```

Crear un proceso de importación.

Por ejemplo:

```bash
npm run seed
```

El seed debe:

1. leer GeoJSON;
2. validar;
3. normalizar;
4. transformar;
5. insertar en PostgreSQL/PostGIS.

Posteriormente estos archivos pueden generarse desde fuentes externas.

La aplicación no debe depender directamente de dichas fuentes para funcionar.

---

# 23. GPX

GPX forma parte del roadmap, pero no del primer sprint.

Modelo futuro:

```text
routes

id
user_id
name
date
geometry
distance
elevation_gain
created_at
```

Geometría:

```text
LineString
```

Funcionalidad futura:

1. subir GPX;
2. parsear track;
3. generar LineString;
4. guardar ruta;
5. visualizar sobre terreno;
6. detectar POIs cercanos.

Ejemplo:

```sql
ST_DWithin
(
  route.geometry,
  place.geometry,
  100
)
```

Esto permitirá detectar automáticamente lugares visitados durante una ruta.

---

# 24. APIs externas

No integrar inicialmente:

- Strava;
- Open-Meteo;
- OpenRouteService;
- APIs fotográficas;
- IA;
- recomendaciones;
- navegación.

Solo plantearlas cuando el core esté funcionando.

---

# 25. Fotos

No implementar en la primera versión.

Si se añaden posteriormente:

- Cloudflare R2;
- thumbnails;
- WebP;
- reducción automática de tamaño.

No condicionar el modelo inicial por esta funcionalidad.

---

# 26. API inicial

## Places

```text
GET /places
GET /places/:id
GET /places/:slug
```

Filtros:

```text
?type=peak
?status=visited
?region=maladeta
```

Viewport:

```text
?north=
&south=
&east=
&west=
```

Nearby:

```text
GET /places/:id/nearby
```

Ejemplo:

```text
?distance=10000
&type=lake
```

---

## User places

```text
GET /user/places
PUT /user/places/:placeId
DELETE /user/places/:placeId
```

Ejemplo:

```json
{
  "status": "visited",
  "visitedAt": "2026-08-12",
  "favorite": true,
  "notes": "..."
}
```

---

## Regions

```text
GET /regions
GET /regions/:slug
GET /regions/:slug/places
```

---

## Stats

```text
GET /stats
GET /stats/regions
GET /stats/place-types
```

---

# 27. Tipos compartidos

Evitar duplicación innecesaria entre frontend y backend.

Crear tipos compartidos.

Ejemplo:

```ts
export type PlaceType =
    | "peak"
    | "lake"
    | "hut"
    | "pass"
    | "viewpoint";

export interface Place {
    id: string;
    name: string;
    slug: string;
    type: PlaceType;
    elevation: number | null;
    latitude: number;
    longitude: number;
}
```

No compartir directamente modelos internos de base de datos si produce demasiado acoplamiento.

Separar cuando sea necesario:

```text
DB models
API DTOs
frontend models
```

---

# 28. Validación

Utilizar Zod o alternativa equivalente para:

- request bodies;
- query params;
- variables de entorno;
- datos importados;
- GeoJSON cuando sea necesario.

Nunca confiar directamente en input del cliente.

---

# 29. Manejo de errores

Formato coherente:

```json
{
  "error": {
    "code": "PLACE_NOT_FOUND",
    "message": "Place not found"
  }
}
```

No devolver:

- stack traces;
- secrets;
- errores internos de base de datos.

---

# 30. Rendimiento

No optimizar prematuramente.

Pero diseñar correctamente:

- POIs por viewport;
- índices espaciales;
- evitar cargar todo el dataset;
- clustering cuando sea necesario;
- consultas agregadas eficientes;
- evitar renders innecesarios de MapLibre.

---

# 31. Accesibilidad

Aunque el mapa sea central, las funciones principales deben ser accesibles mediante interfaz convencional.

Por ejemplo:

- búsqueda;
- filtros;
- selección de lugar;
- cambio de estado.

No depender exclusivamente de clicar pequeños puntos en el mapa.

Los componentes interactivos deben utilizar elementos HTML adecuados:

```text
button
input
select
dialog
```

cuando corresponda.

---

# 32. Seguridad

- secrets en variables de entorno;
- PostgreSQL nunca expuesto directamente;
- API mediante Worker;
- inputs validados;
- CORS restringido;
- prepared statements / ORM;
- no incluir secretos en frontend.

---

# 33. Tests

No perseguir cobertura por cobertura.

Priorizar:

- consultas geográficas;
- validaciones;
- endpoints;
- importadores;
- lógica relevante.

Evitar tests triviales sin utilidad.

---

# 34. Código

Reglas:

- TypeScript strict.
- Evitar `any`.
- Funciones pequeñas.
- Nombres claros.
- Evitar comentarios redundantes.
- Evitar abstraer demasiado pronto.
- Componentes React mantenibles.
- No mezclar excesivamente lógica cartográfica y UI.
- No introducir dependencias sin motivo.

---

# 35. Convenciones de estilos

Evitar:

```tsx
style = {
{
    backgroundColor: "...",
        padding
:
    "...",
        borderRadius
:
    "..."
}
}
```

salvo casos dinámicos directamente relacionados con MapLibre o datos runtime.

Preferir:

```ts
export const panel = style({
    padding: vars.space.lg,
    background: vars.color.surface,
    borderRadius: vars.radius.lg
});
```

No utilizar strings de clases gigantescos.

No utilizar Tailwind.

No introducir CSS global innecesario.

---

# 36. Global styles

Los estilos globales deben limitarse a:

- reset;
- html/body;
- tipografía base;
- fondo;
- selección;
- focus;
- variables globales.

Todo lo demás debe vivir cerca del componente correspondiente.

Ejemplo:

```text
styles/
├── theme.css.ts
├── global.css.ts
└── typography.css.ts
```

---

# 37. Orden de implementación

## Fase 0 — Bootstrap

Crear:

- repo;
- React + TypeScript;
- Vite;
- Vanilla Extract;
- Worker Hono;
- PostgreSQL;
- PostGIS;
- variables de entorno;
- migraciones.

Objetivo:

```text
frontend
   ↓
API
   ↓
PostgreSQL
```

funcionando.

No perder tiempo todavía en diseño detallado.

---

# 38. Fase 1 — Modelo geográfico

Crear:

- regions;
- places;
- users;
- user_places.

Configurar PostGIS.

Crear índices espaciales.

Crear datos iniciales.

Objetivo:

tener lugares reales almacenados correctamente.

---

# 39. Fase 2 — API

Implementar:

```text
GET /places
GET /places/:id
GET /regions
PUT /user/places/:placeId
GET /stats
```

Añadir filtros.

Añadir consultas por viewport.

---

# 40. Fase 3 — Mapa

Integrar MapLibre.

Orden:

1. mapa base;
2. cargar datos de API;
3. mostrar picos;
4. selección;
5. terrain 3D;
6. pitch;
7. bearing;
8. diferentes tipos de lugares.

No hardcodear lugares en frontend.

---

# 41. Fase 4 — Interacción

Añadir:

- ficha lateral;
- pendiente;
- visitado;
- favorito;
- fecha;
- notas.

Persistir cambios.

Reflejar cambios inmediatamente en mapa.

---

# 42. Fase 5 — Diseño visual

En este momento crear el sistema visual real.

Definir:

```text
theme.css.ts
global.css.ts
tokens
```

Construir:

- MapToolbar;
- MapFilters;
- PlaceDetailsPanel;
- Search;
- RegionSelector.

Evitar diseñar una librería entera de componentes antes de conocer las necesidades reales.

---

# 43. Fase 6 — Filtros

Añadir:

```text
tipo
estado
región
macizo
altitud
```

Solo introducir filtros con utilidad clara.

---

# 44. Fase 7 — Estadísticas

Añadir:

- visitados por tipo;
- pico más alto;
- tresmiles;
- progreso;
- regiones;
- macizos.

---

# 45. Fase 8 — Responsive y pulido

Revisar:

- desktop;
- portátil;
- tablet;
- móvil.

En móvil, probablemente utilizar:

```text
bottom sheet
```

en lugar de sidebar lateral.

No intentar hacer una experiencia móvil perfecta antes de que la versión escritorio funcione correctamente.

---

# 46. Fase 9 — GPX

Después del MVP:

- upload;
- parse;
- almacenamiento;
- LineString;
- visualización;
- detección de lugares.

---

# 47. Primera milestone

La primera milestone útil debe ser:

> Abrir la aplicación y explorar un mapa de los Pirineos con varios picos obtenidos desde PostgreSQL.

Flujo:

```text
PostgreSQL/PostGIS
        ↓
Cloudflare Worker
        ↓
API
        ↓
React
        ↓
MapLibre
        ↓
Picos sobre el mapa
```

No avanzar hacia features secundarias hasta conseguirlo.

---

# 48. Segunda milestone

Completar:

```text
Aneto en el mapa
        ↓
seleccionarlo
        ↓
abrir ficha
        ↓
marcar visitado
        ↓
persistir
        ↓
actualizar mapa
        ↓
actualizar estadísticas
```

Este flujo debe quedar terminado de extremo a extremo.

---

# 49. Tercera milestone

Conseguir una experiencia visual sólida:

```text
terrain 3D
+
POIs
+
filtros
+
ficha
+
progreso personal
```

Debe empezar a sentirse como una aplicación real y no como una demo técnica.

---

# 50. Criterio para Codex

Antes de modificar código:

1. revisar la estructura existente;
2. entender los patrones actuales;
3. localizar los archivos afectados;
4. reutilizar soluciones existentes;
5. evitar refactors innecesarios.

Después:

1. implementar solo lo necesario;
2. ejecutar lint;
3. ejecutar typecheck;
4. ejecutar tests relevantes;
5. ejecutar build;
6. corregir errores introducidos.

No añadir nuevas dependencias sin explicar por qué son necesarias.

Si detectas una mejora arquitectónica importante:

- explicar el problema;
- proponer solución;
- explicar ventajas;
- explicar impacto.

No realizar grandes refactors no solicitados automáticamente.

---

# 51. Regla específica para diseño

Codex no debe improvisar una identidad visual distinta en cada componente.

Debe utilizar:

```text
theme
tokens
variables
```

existentes.

Antes de hardcodear:

```text
color
spacing
radius
border
shadow
```

comprobar si existe un token apropiado.

Si un nuevo valor se repite o representa un concepto visual del sistema, crear un token.

No convertir absolutamente cada valor CSS en token.

Mantener equilibrio entre consistencia y simplicidad.

---

# 52. Principio fundamental

La aplicación debe ser sencilla de explicar:

> Un mapa 3D de los Pirineos en el que puedes explorar picos, ibones y refugios y registrar los lugares que has
> visitado.

Toda funcionalidad debe reforzar esa idea.

Si una funcionalidad no mejora significativamente esa experiencia, probablemente todavía no pertenece al proyecto.
