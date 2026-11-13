# El Laboratorio

> Un espacio para experimentar con las matemáticas.

Aplicación web para estudiantes de bachillerato: dos laboratorios interactivos (Factorización y Razón y proporción), cuentas con roles, progreso guardado, puntos, insignias, ranking por grupo y panel de docente.

---

## Cómo arrancarla

**Opción A — doble clic:** ejecuta `iniciar.cmd`. Abre el navegador en `http://localhost:8099`.

**Opción B — consola:**

```powershell
node server\server.js
```

Requiere **Node.js 22 o superior** (usa `node:sqlite`, incluido). No hay dependencias que instalar: no hace falta `npm install`.

Para que la abran celulares en la misma red Wi-Fi, el servidor ya imprime la URL de red local (por ejemplo `http://192.168.1.9:8099`).

### Variables opcionales

| Variable | Por defecto | Para qué |
|---|---|---|
| `PORT` | `8099` | Puerto del servidor |
| `HOST` | `0.0.0.0` | Interfaz de escucha |
| `GOOGLE_CLIENT_ID` | — | Activa el acceso real con Google |
| `GOOGLE_CLIENT_SECRET` | — | Secreto del cliente OAuth |
| `OAUTH_REDIRECT` | `http://localhost:8099/api/auth/google/callback` | URI de retorno registrada en Google |

### Activar el acceso real con Google

1. En Google Cloud Console crea un **ID de cliente OAuth** de tipo *Aplicación web*.
2. Autoriza como URI de redirección exactamente el valor de `OAUTH_REDIRECT`.
3. Arranca el servidor con las dos variables:

```powershell
$env:GOOGLE_CLIENT_ID="tu-id.apps.googleusercontent.com"
$env:GOOGLE_CLIENT_SECRET="tu-secreto"
node server\server.js
```

Con las credenciales puestas, el botón de acceso lleva a Google de verdad. Sin ellas, la app
sigue funcionando con el registro local por correo y lo advierte en pantalla (no finge que es OAuth).

---

## Roles y cómo probarlos

| Rol | Cómo entrar | Qué ve |
|---|---|---|
| **Estudiante** | Cualquier correo | Home con los dos laboratorios, puntos, insignias, ranking, grupo y mensajes |
| **Docente** | Correo promovido por el superadmin | Panel con sus grupos, tablero de avance, detalle por estudiante, ranking y mensajes |
| **Superadmin** | `nicolasalquerque@gmail.com` | Todos los grupos, gestión de cuentas y ranking global |
| **Invitado** | Botón "Probar como invitado" | Los dos laboratorios completos, sin guardar progreso |

> **Nota sobre el acceso con Google.** En esta versión el inicio de sesión es local: se escribe el correo y el nombre, y la cuenta se crea o se recupera en la base de datos. No hay redirección a Google ni verificación de identidad, porque eso exige un cliente OAuth registrado y un dominio público. La estructura ya está lista para conectarlo (ver "Pendientes").

**Recorrido mínimo para probarlo todo:**

1. Entra con `nicolasalquerque@gmail.com` (serás superadmin).
2. Crea un grupo desde *Todos los grupos → Crear grupo*. Copia el código `LAB-XXXX`.
3. Sal, entra con otro correo (serás estudiante) y únete con ese código.
4. Haz un laboratorio. Vuelve a entrar como superadmin: verás el avance, los intentos y las respuestas abiertas.

---

## Estructura

```
lab-mate/
├── server/
│   ├── server.js      API HTTP + archivos estáticos (sin dependencias)
│   └── db.js          esquema SQLite y consultas
├── public/
│   ├── index.html
│   ├── css/app.css    sistema de diseño completo
│   ├── fonts/         Fraunces, DM Sans, JetBrains Mono (autoalojadas)
│   ├── vendor/katex/  render matemático local
│   └── js/
│       ├── app.js     arranque, barra superior y rutas
│       ├── router.js  enrutado por hash
│       ├── store.js   sesión, progreso, invitado vs cuenta
│       ├── ui.js      componentes, toasts, modales, sonido
│       ├── views/     home, grupo, ranking, mensajes, docente, admin, login
│       └── labs/
│           ├── tiles.js          motor del modelo de áreas
│           ├── math.js           parser algebraico y clasificación de errores
│           ├── factorizacion.js  las 5 fases
│           └── razon.js          4 escenarios y 5 fases
├── data/laboratorio.db   base de datos (se crea sola)
└── tools/                pruebas automatizadas y capturas
```

---

## Decisiones de diseño

**El modelo de áreas es un tablero real.** Las fichas se arrastran, se giran con doble clic (o clic derecho) y encajan en una cuadrícula; `x` mide 3 celdas, así que un rectángulo de 5 celdas de ancho son `(x + 2)`. Un rectángulo se considera perfecto solo si cubre su caja sin huecos ni sobrantes.

**Las respuestas se validan algebraicamente, no como texto.** `(x+3)(x+2)` es igual de válida que `(x+2)(x+3)`, y `2(x+2)(x+3)` vale para `2x²+10x+12`. El parser convierte la expresión del estudiante en un polinomio y lo compara coeficiente a coeficiente. Además clasifica el error: signos cambiados, factor común olvidado, números que no suman ni multiplican, o sintaxis inválida.

**Los puntos se calculan, no se confían.** El servidor recalcula el total del estudiante a partir del mejor puntaje de cada laboratorio más los bonus de insignias globales, y nunca deja que un puntaje bajo reemplace a uno alto.

**La interfaz es mobile-first.** Se probó a 390 px de ancho con emulación de dispositivo real; no hay desbordamiento horizontal ni acciones que dependan de `hover`.

---

## Pruebas

Todo está automatizado y se puede volver a ejecutar con el servidor encendido:

```powershell
node tools\api_test.js    # 31 comprobaciones de API y reglas de negocio
node tools\ui_test.js     # recorrido de interfaz + capturas
node tools\v11_test.js    # 28 comprobaciones de la v1.1 (lienzo, logros, escenas, vista previa)
node tools\flow_test.js   # argumentar, cierre e insignias, y laboratorio de razón
```

`ui_test`, `tiles_test` y `flow_test` usan el navegador vía CDP y guardan imágenes en `shots/`.

---

## Pendientes (fuera del alcance de esta v1)

- **Google OAuth real**: sustituir el formulario local de acceso por Google Identity Services y verificar el token en el servidor (`POST /api/auth/google` ya es el punto de entrada).
- **Despliegue**: la app es un servidor Node sin dependencias; funciona igual en un VPS, en Render o en un contenedor. Al publicarla, cambiar el `fetch` del cliente a HTTPS y servir con un proxy inverso.
- **Backup**: la base es un único archivo (`data/laboratorio.db`); basta copiarlo.
- Notificaciones por correo, app nativa, importación masiva de estudiantes: deliberadamente no incluidos.


---

## Novedades de la v1.1

**El lienzo ahora mide de verdad.** `x` vale 2.5, 3.5 o 4.5 unidades de cuadrícula, nunca un entero.
Consecuencia pedagógica: el cuadrado x² (área x²) **no** se puede rellenar con rectángulos `x`
(área x cada uno), porque ninguna cantidad entera de ellos da x². El encaje se valida por área:
sin solapes, si la suma de áreas iguala el rectángulo envolvente, está perfecto.

- **Catálogo de 8 bloques**: x², x, 2x, 3x y cuadrados de 1, 4, 9 y 16.
- **Eliminar ficha** con la × de cada bloque, además de girar con doble clic.
- **Modo libre** (botón en el Home y en el laboratorio): salta a cualquier fase, genera ejercicios
  al azar, los puntos valen la mitad y no se otorga la insignia God.
- **Más ejercicios**: 8 retos en Construir, 20 en Retar (5 fáciles, 10 medios, 5 difíciles) y
  6 preguntas en Argumentar (opción múltiple, selección visual y respuesta abierta).
- **Insignias SVG** con animación de sello al desbloquearlas y pantalla **Logros** con las 12
  insignias (las bloqueadas en gris y con la pista de cómo conseguirlas).
- **Razón y proporción con escenas animadas**: mesa de la receta, obreros caminando con pared
  que se construye, mapa con línea punteada y coche que cambia de tamaño según la distancia.
  En Explorar y Modo libre hay **dos variables libres** por escenario.
- **Probar Laboratorio** para docentes y superadmin: juegan todo, pero nada se guarda ni altera
  el ranking.


---

## Novedades de la v1.2

**Etiquetas algebraicas, siempre.** El error era que el lado se *deducía* de la longitud en píxeles
y por eso podía salir `(x + 0.5)`. Ahora el lado se calcula sumando las fichas que tocan ese borde:
cada ficha aporta `x` o un entero, así que el resultado es algebraico por construcción.
Verificado con seis construcciones: `(x)(x+3)`, `(4)(4)`, `(x+1)²`, `(x+2)(x+3)`, `(2x)(2x)`, `(4)(2)`.

**Obreros.** La animación pivotaba sobre el origen del SVG, no sobre el cuerpo: por eso parecían
saltar por toda la escena. Se corrigió con `transform-box: fill-box` y se redujo el paso a ~1.3 px
y 1°, un caminar corto y pesado.

**Usuarios.** Nueva sección en el menú de docentes (sus estudiantes, solo lectura) y de superadmin
(todas las cuentas, con promoción de rol). Endpoint `GET /api/users` con permisos por rol.

**Escenas con paisaje.** El coche tiene cielo degradado, sol, montañas y carretera con línea
discontinua; va a la izquierda para dar sensación de avance. La obra tiene cielo, sol, colinas,
andamio y pared.

**Decoración indie.** Ilustraciones en el Home (con y sin sesión), friso en el menú y separadores
dibujados a mano.

**Sin usuarios por defecto.** La base arranca vacía: `nicolasalquerque@gmail.com` se convierte en
superadmin la primera vez que entra.


---

## Compartir con estudiantes y colegas

**En el mismo Wi‑Fi (sin internet):**

1. Deja `iniciar.cmd` abierto. La ventana imprime `http://192.168.x.x:8099`.
2. Tus estudiantes abren esa dirección en el celular, o escanean el QR de la pantalla
   **Compartir acceso** (menú del docente).
3. Si no carga, casi siempre es el firewall. Una vez, en PowerShell **como administrador**:

```powershell
New-NetFirewallRule -DisplayName "El Laboratorio" -Direction Inbound -LocalPort 8099 -Protocol TCP -Action Allow
```

**Fuera de la red (o si el firewall no se puede tocar):**

1. Deja el servidor abierto.
2. Doble clic en `compartir-internet.cmd`.
3. Espera a que aparezca `https://algo.trycloudflare.com` y comparte ese enlace.

El túnel de Cloudflare no necesita cuenta ni abrir puertos, y funciona desde cualquier red.
Es temporal: mientras la ventana esté abierta. Para un uso permanente conviene publicar la app
en un servidor (Render, Fly, un VPS) con las variables de entorno del apartado de OAuth.


---

## Publicarla en internet (sin depender de tu PC)

La app es un servidor Node sin dependencias, así que cualquier servicio que ejecute Node sirve.
El único cuidado es la base de datos: **debe vivir en un disco persistente**, no en la carpeta
efímera del contenedor.

Ya están preparados `Dockerfile`, `render.yaml` y `fly.toml`.

### Opción A — Render (la más simple)

1. Sube esta carpeta a un repositorio de GitHub.
2. En Render: **New → Blueprint**, elige el repo. Detecta `render.yaml` y crea el servicio
   con disco persistente en `/var/data`.
3. Cuando termine, tu URL será algo como `https://el-laboratorio.onrender.com`.

Si prefieres hacerlo a mano: **New → Web Service**, runtime *Node*, build command vacío,
start command `node server/server.js`, y añade un disco montado en `/var/data` con
`DATA_DIR=/var/data`.

> El plan gratuito de Render **no permite discos**: el servicio se duerme y la base se borra en
> cada despliegue. Para un colegio, el plan *starter* con disco de 1 GB es lo mínimo razonable.

### Opción B — Fly.io

```powershell
fly launch --copy-config --name el-laboratorio
fly volumes create datos --size 1
fly deploy
```

### Opción C — un VPS con Docker

```bash
docker build -t laboratorio .
docker run -d -p 80:8080 -v labdata:/data --restart unless-stopped laboratorio
```

En cualquiera de las tres, si quieres el **login real con Google**, añade las variables
`GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`, y registra como URI de redirección
`https://TU-DOMINIO/api/auth/google/callback`.

### Comprobar que quedó bien

- `https://TU-DOMINIO/api/health` debe responder `{"ok":true}`.
- Entra con `nicolasalquerque@gmail.com`: se crea tu cuenta de superadmin en esa base.
- Crea un grupo, copia el código y pruébalo desde el celular con datos móviles (no Wi‑Fi).
