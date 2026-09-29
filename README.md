# Dados de Casino

App web para lanzar uno o dos dados, con animacion de mesa, sonido y modo
sin conexion. Es una PWA: se instala como una aplicacion y funciona sin
internet.

**Demostracion:** <https://damonhawanna.github.io/dados-casino/>

## Que incluye

- Conmutador de **1 dado** o **2 dados**, con la pastilla deslizando.
- Dados que botan y giran, con sombra sincronizada, sonido de casino
  sintetizado con WebAudio y vibracion en movil.
- Avisos en la mesa cuando sale un siete, dobles o un seis, con chispas
  doradas.
- Total con cuenta animada, historial de fichas, grafica de frecuencia
  (11 barras para dos dados, 6 para uno) y media.
- Tres temas: **azul noche**, **rojo y oro** y **fieltro verde**. Se cambian
  con el boton del orbe de la cabecera.
- Atajos de teclado: `Espacio` lanza, `1` y `2` cambian de modo.
- Respeta `prefers-reduced-motion`.

Ajustes, tema, sonido, historial y estadisticas se guardan en
`localStorage`, asi que se mantienen al cerrar la app.

## Instalar

En un movil o navegador de escritorio, la app muestra su prompt de
instalacion. Tambien se puede anadir a mano:

- **Android / Chrome:** menu ⋮ → *Instalar app* / *Anadir a pantalla de inicio*.
- **iOS / Safari:** *Compartir* → *Anadir a pantalla de inicio*.
- **Escritorio:** icono de instalar en la barra de direcciones, o el boton
  de descarga de la app.

Una vez instalada se abre a pantalla completa y arranca sin conexion.

## Desarrollo

La app es estatica, sin dependencias ni paso de compilacion. Para trabajar
en local hace falta un servidor (los service workers no funcionan abriendo
el fichero directamente):

```bash
python -m http.server 8000
```

Y abrir <http://localhost:8000>.

Estructura:

```
index.html              estructura de la pantalla
404.html                pagina de "no encontrado" de GitHub Pages
css/styles.css          temas y animaciones
js/app.js               logica: dados, sonido, historial, instalacion
manifest.webmanifest    datos de instalacion de la PWA
sw.js                   service worker: precache y modo sin conexion
icons/                  iconos de la app
  make-icons.ps1        regenera los PNG (solo Windows, no se publica)
.github/workflows/      despliegue automatico a GitHub Pages
```

Los iconos PNG se generan con `icons/make-icons.ps1` (PowerShell). Se
ejecuta y listo; no hace falta tocarlo salvo que cambie el diseno.

## Despliegue

Cada `push` a `main` dispara `.github/workflows/pages.yml`, que publica el
sitio en GitHub Pages. Para activarlo la primera vez, en el repositorio:
**Settings → Pages → Source → GitHub Actions**.

## Como funciona el modo sin conexion

`sw.js` precachea en la instalacion los once ficheros de la app y sirve las
peticiones desde la cache. Las navegaciones intentan la red primero y caen
a la cache si no hay conexion; el resto se sirve de cache y se refresca por
detras. La version de la cache esta en la constante `VERSION` de `sw.js`:
al subir un cambio hay que incrementarla para que los clientes descarguen los
ficheros nuevos, porque el service worker instalado no se actualiza solo.

El `id` del manifest es relativo (`"./"`) a proposito, para que la app
instale igual desde la raiz de un dominio o desde un subdirectorio como
`usuario.github.io/dados-casino/`.
