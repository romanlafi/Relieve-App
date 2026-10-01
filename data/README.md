# Dataset inicial

`places.geojson` contiene seis puntos WGS84 en orden **[longitud, latitud]**.
Las fuentes se consultaron el 1 de octubre de 2026; cada registro conserva
su enlace.

| Lugar              | Latitud           | Longitud             | Elevación (m) | Fuente                                                                              |
|--------------------|-------------------|----------------------|---------------|-------------------------------------------------------------------------------------|
| Aneto              | 42.630991666667   | 0.65668611111111     | 3404          | [Wikipedia](https://es.wikipedia.org/wiki/Pico_Aneto)                               |
| Posets             | 42.654481         | 0.4352               | null          | [Wikipedia](https://es.wikipedia.org/wiki/Pico_Posets)                              |
| Monte Perdido      | 42.673888888889   | 0.033333333333333    | null          | [Wikipedia](https://es.wikipedia.org/wiki/Monte_Perdido)                            |
| Ibón de Plan       | 42.54611111       | 0.325                | 1910          | [Wikipedia](https://es.wikipedia.org/wiki/Ib%C3%B3n_de_Plan)                        |
| Refugio de Góriz   | 42.66330555555555 | 0.015055555555555557 | null          | [Federación Aragonesa de Montañismo](https://www.alberguesyrefugios.com/goriz/)     |
| Refugio Ángel Orús | 42.62741666666667 | 0.4573888888888889   | 2150          | [Federación Aragonesa de Montañismo](https://www.alberguesyrefugios.com/angelorus/) |

Las coordenadas de los picos y del Ibón de Plan proceden de los valores
decimales de sus fichas, sin redondearlas a los segundos del texto mostrado.
Las de los refugios se convierten aritméticamente desde las coordenadas GEO
de la FAM: Góriz 42°39′47.9″N 0°00′54.2″E; Ángel Orús
42°37′38.7″N 0°27′26.6″E. Un punto de lago representa su localización,
no su contorno ni un acceso.

Se omiten las altitudes de Posets (3368/3369/3375 según fuente), Monte
Perdido (3348/3355) y Góriz (2200/2215) por discrepancias entre fuentes.
`null` expresa falta de una cota verificada con suficiente seguridad.
Los Ibones de Bachimaña se omiten: el nombre agrupa varios lagos y esta
fase no ha verificado una coordenada inequívoca para cada uno. No se usan
coordenadas del refugio como sustituto de las de los lagos.

No se inventan polígonos de regiones ni visitas personales. El seed crea
solo la región Pirineos y el usuario de desarrollo.

Las fichas de Wikipedia ofrecen atribución bajo CC BY-SA 4.0; se enlaza cada
fuente y se conservan únicamente hechos geográficos. No se copian imágenes
ni textos descriptivos. Las coordenadas publicadas por la FAM se atribuyen
a sus fichas oficiales.
