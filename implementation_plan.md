# Diagnóstico: Por qué seleccionar perfil en la UI no cambia el auth

## El Problema en una Frase

Cuando cambias de perfil desde la UI de OpenCode, **sólo se actualiza un archivo JSON en disco** — el proceso de OpenCode que ya está corriendo nunca recibe las variables de entorno aisladas (`OPENCODE_HOME`, `XDG_*`, `APPDATA`) que apuntarían al directorio de datos del nuevo perfil. Como resultado, sigue usando la misma auth que tenía al arrancar.

---

## Diagnóstico Técnico: La Cadena Rota

### Eslabón 1 — Qué hace `selectProfile` realmente

En `packages/core/src/service.ts`, línea 53-77, `selectProfile()` hace sólo dos cosas:

1. **Escribe** `registry.activeProfileId = profile.id` en `~/.opencode-profiles/registry.json`.
2. Intenta un restart vía `restartController`, pero **siempre usa `NoopRestartController`** (que devuelve `canRestart()→false`). El restart nunca ocurre.

La selección **es metadata-only**. El proceso vivo de OpenCode no se entera de nada.

### Eslabón 2 — Cómo se supone que el aislamiento entra al proceso

El aislamiento real requiere que OpenCode arranque con estas env vars **antes de que el proceso inicie**:

```
OPENCODE_HOME       → <profile-data-root>
XDG_CONFIG_HOME     → <profile-data-root>/xdg/config
XDG_DATA_HOME       → <profile-data-root>/xdg/data
XDG_STATE_HOME      → <profile-data-root>/xdg/state
XDG_CACHE_HOME      → <profile-data-root>/xdg/cache
OPENCODE_CONFIG_HOME→ <profile-data-root>/xdg/config
OPENCODE_PROFILE_ID → <profile-id>
OPENCODE_PROFILE_DATA_ROOT → <profile-data-root>
APPDATA             → <profile-data-root>/xdg/config   (Windows)
LOCALAPPDATA        → <profile-data-root>/xdg/data     (Windows)
```

Estas variables las construye `resolveRuntimeBinding()` en `service.ts` (líneas 79-115). **Pero nadie las inyecta al proceso de OpenCode cuando seleccionas desde la UI.**

### Eslabón 3 — El shim existe, pero sólo actúa al lanzar

El shim (`opencode.cmd`) llama a `mpp run`, que llama a `resolveRuntimeBinding()` y lanza el binario original con esas env vars en el `spawn`. Esto funciona **sólo en el momento del lanzamiento inicial**. Una vez que OpenCode está corriendo, las env vars del proceso están fijas — no se pueden cambiar en caliente.

```
[shim opencode.cmd] → [mpp run] → [resolveRuntimeBinding()] → [spawn opencode.mpp-original.cmd con env vars]
```

Si lanzas `opencode` directamente (no desde el shim), o si el PATH resuelve el binario sin extensión antes del `.cmd`, el shim se saltea. El status ya lo confirma:

```
opencode resolved by PATH: C:\Users\Arcila.J\AppData\Roaming\npm\opencode     ← binario sin extensión
opencode managed path:     C:\Users\Arcila.J\AppData\Roaming\npm\opencode.cmd  ← el shim
Warning: PATH resolves a different opencode launcher than the managed shim path.
```

**Este warning es una señal crítica**: Windows ejecuta el archivo sin extensión antes del `.cmd`, lo que significa que el shim se ignora completamente cuando escribes `opencode` en la terminal.

### Eslabón 4 — El hook `shell.env` no está implementado

El único mecanismo documentado para que un plugin inyecte env vars a un proceso hijo **en runtime** es el hook `shell.env` de OpenCode. Está documentado en `docs/opencode-api-validation/docs-research.md`:

> `shell.env` hook can inject env values

Sin embargo, este hook **no está implementado** en ninguno de los tres paquetes del plugin (`packages/opencode-plugin/src/index.ts`, `tui.tsx`). El plugin registra herramientas (`tool.register`) pero nunca engancha `shell.env`.

El `shell.env` hook inyecta variables al entorno del **Bun shell** que OpenCode usa para ejecutar herramientas — **no** al proceso de OpenCode en sí. Por eso tampoco resuelve el problema de auth-isolation completa, pero es el mecanismo más cercano disponible via plugin.

### Eslabón 5 — La UI muestra "perfil seleccionado" porque el JSON sí se actualiza

Cuando haces el cambio desde la UI o CLI, `registry.json` sí se actualiza. Por eso la UI muestra el nuevo perfil como activo. Pero `process.env` del proceso de OpenCode en ejecución es inmutable — no hay forma de cambiar `OPENCODE_HOME` en caliente desde adentro.

---

## Resumen del Diagnóstico

| Síntoma | Causa raíz |
|---|---|
| UI muestra "perfil activo" cambiado | ✅ El JSON se actualiza correctamente |
| La auth sigue siendo la misma | ❌ `OPENCODE_HOME`/`XDG_*`/`APPDATA` no cambian en el proceso vivo |
| `NoopRestartController` usado en todos lados | ❌ No hay mecanismo de restart implementado |
| Shim `opencode.cmd` ignorado en algunas terminales | ❌ PATH resuelve el binario sin extensión primero |
| `shell.env` hook ausente en el plugin | ❌ No hay inyección de env vars desde dentro del plugin |

---

## Qué Falta Crear / Implementar

### Gap 1 — Hook `shell.env` en el plugin (parcial, no completa el aislamiento de auth)

**Qué falta**: Implementar el hook `shell.env` en `packages/opencode-plugin/src/index.ts` que devuelva las env vars del perfil activo. Esto inyectaría las variables al Bun shell de OpenCode para comandos futuros.

**Limitación**: Este hook afecta al shell de Bun, no al proceso principal de OpenCode. El `OPENCODE_HOME` que usa OpenCode para abrir su propia DB ya fue fijado al arrancar. Ayuda parcialmente (ej. subprocesos que lean `OPENCODE_HOME` del env), pero **no cambia la DB de auth activa**.

**Estado**: ❌ No existe. Debe crearse.

---

### Gap 2 — Mecanismo de re-launch automático al cambiar perfil

**Qué falta**: Cuando el usuario selecciona un perfil, el sistema debe:
1. Guardar el nuevo `activeProfileId` en el registry (ya lo hace).
2. **Terminar el proceso de OpenCode actual**.
3. **Relanzar OpenCode** con las env vars del nuevo perfil activo.

El `RestartController` tiene la interfaz (`canRestart()`, `restart()`), pero `NoopRestartController` siempre devuelve `false`. Necesita una implementación real.

**Opciones documentadas para implementarlo**:
- **Vía shim + señal**: el shim puede escribir un archivo "restart-requested" que el proceso de OpenCode detecte y actúe — pero requiere polling o un watcher dentro del proceso.
- **Vía plugin hook**: si existe un hook de shutdown/restart en OpenCode (no documentado en v1.14.29), el plugin podría invocarlo.
- **Vía exit con código especial**: el plugin usa `process.exit(EXIT_CODE_RESTART)` y el shim lo detecta y relanza — depende de si OpenCode propaga ese exit code.
- **La más simple y robusta**: mostrar un mensaje claro al usuario con el comando exacto para relanzar, y que el shim automáticamente lo relance en la próxima invocación (ya que lee `registry.json` al arrancar).

**Estado**: ❌ `RestartController` nunca se implementó. Solo existe `Noop`.

---

### Gap 3 — PATH resuelve el binario sin extensión antes del shim (Windows)

**Qué falta**: En Windows, cuando instalas algo con npm globalmente, se crean dos archivos:
- `opencode` (script bash/sh sin extensión) — usado por Git Bash / WSL
- `opencode.cmd` — el verdadero CMD/PowerShell launcher

El shim reemplaza `opencode.cmd`, pero `opencode` (sin extensión) queda intacto apuntando al binario real, y Windows PowerShell puede resolverlo primero dependiendo del PATHEXT y el orden de extensiones.

**Qué se debe hacer**: El shim también debe reemplazar (o wrapear) el archivo sin extensión, o documentar explícitamente que siempre hay que usar `opencode.cmd` explícitamente, o cambiar la estrategia de instalación del shim.

**Estado**: ⚠️ Detectado (sale en el `mpp status`), no resuelto ni documentado como workaround.

---

### Gap 4 — El TUI plugin no tiene el botón "Seleccionar y relanzar"

En `tui.tsx` líneas 169-202, la opción "Select as active" sólo llama a `service.selectProfile()` y muestra un toast "Restart OpenCode to apply provider auth isolation." El usuario tiene que saber manualmente qué comando ejecutar para relanzar con el perfil correcto.

**Qué falta**: El diálogo de confirmación debe mostrar el **comando exacto a ejecutar** con las variables reales del perfil seleccionado, por ejemplo:

```
OPENCODE_HOME=C:\Users\..\.opencode-profiles\profile-a\data opencode
```

O mejor: un botón que copie ese comando al portapapeles.

**Estado**: ❌ El mensaje existe pero es genérico. El usuario no sabe qué comando ejecutar exactamente.

---

## Plan de Implementación

### Fase 1 — Resolver el PATH / shim en Windows (crítico, bloqueante)

**Qué**: Hacer que el shim también wrapee el launcher sin extensión.

**Archivos a modificar**:
- `packages/cli/src/shim.ts` — `installOpencodeShim()` y `buildWindowsShimScript()`

**Descripción**: Al instalar, también copiar/reemplazar el archivo sin extensión (`opencode`) junto con el `.cmd`, o agregar un script bash wrapper que llame a `mpp run`. Sin esto, cualquier terminal que resuelva `opencode` sin extensión bypasea todo el sistema.

---

### Fase 2 — Implementar `shell.env` hook en el plugin

**Qué**: Agregar el hook `shell.env` al plugin para inyectar env vars del perfil activo al Bun shell de OpenCode.

**Archivos a modificar**:
- `packages/opencode-plugin/src/index.ts` — agregar hook `shell.env`

**Impacto**: Subprocesos que OpenCode lance via Bun shell heredarán las env vars del perfil activo. No resuelve el problema de la DB de auth de OpenCode mismo, pero es el único mecanismo in-process disponible actualmente.

---

### Fase 3 — Mejorar el UX del "restart requerido"

**Qué**: Al seleccionar un perfil, mostrar el comando exacto de relaunch con todas las env vars necesarias, y/o un botón de copiar al portapapeles.

**Archivos a modificar**:
- `packages/opencode-plugin/src/tui.tsx` — en `openProfileActions`, construir el comando real desde `resolveRuntimeBinding()` y mostrarlo.
- `packages/opencode-plugin/src/index.ts` — el resultado de `profile_select` ya incluye `OPENCODE_HOME=...`, pero puede hacerse más explícito.

---

### Fase 4 — Implementar `RestartController` real (si el shim lo soporta)

**Qué**: En lugar de `NoopRestartController`, implementar uno que use el shim para auto-relanzar OpenCode con el perfil activo.

**Estrategia recomendada (exit code)**:
- El plugin llama a `process.exit(75)` (código reservado: restart requested).
- El shim detecta ese exit code y relanza `mpp run` automáticamente.

**Archivos a crear/modificar**:
- `packages/core/src/restart-controller.ts` — nueva clase `ExitCodeRestartController`
- `packages/cli/src/shim.ts` — el script `.cmd` detecta exit code 75 y relanza
- `packages/opencode-plugin/src/tui.tsx` — pasar el controlador real a `ProfileService`

> [!WARNING]
> Esta fase requiere verificar experimentalmente si OpenCode propaga el exit code del proceso al shim sin interferirlo. Si OpenCode captura los exit codes de proceso hijo, esta estrategia no funciona.

---

## Open Questions

> [!IMPORTANT]
> Antes de ejecutar cualquier fase, necesito que respondas estas preguntas:

1. **¿Cómo estás lanzando OpenCode actualmente?** ¿Desde el terminal con `opencode`, desde un acceso directo, o desde otra forma? Esto determina si el shim se está usando o no.

2. **¿El `shell.env` hook resuelve tu necesidad inmediata?** Si lo que necesitas es que los *agentes dentro de OpenCode* usen las credenciales del perfil correcto (ej. API keys de un proveedor distinto), `shell.env` puede ser suficiente sin el restart. Si la auth está guardada en la DB de OpenCode (que se abre al arrancar), el restart es obligatorio.

3. **¿Tienes acceso a modificar el shim y a instalar una nueva versión** antes de cada prueba, o necesitas que el sistema funcione "silenciosamente" sin reinstalación manual?

4. **¿Cuántos perfiles necesitas manejar?** ¿2, o un número variable? Esto afecta la UX del comando de relaunch.
