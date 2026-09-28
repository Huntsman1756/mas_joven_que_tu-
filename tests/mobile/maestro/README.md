# Chrome en Android con Maestro

Pruebas nativas del navegador en un AVD; no sustituyen un teléfono físico.
Ejecutar los flows en serie, sin otra sesión Maestro ni CDP manipulando el mismo
dispositivo. `hideKeyboard` no debe repetirse tras elegir municipio: la aplicación
ya retira el foco y un Back adicional puede cerrar la pestaña.

Preparación (desde la raíz, herramientas ya instaladas):

```powershell
# En una terminal: build estático y servidor con Range
cd app
npm run build
node scripts/static-server.mjs 4297
```

Con el AVD arrancado y Chrome configurado, en otra terminal desde la raíz:

```powershell
adb -s emulator-5554 reverse tcp:4297 tcp:4297
& F:\maestro\maestro\bin\maestro.bat --udid emulator-5554 test --format JUNIT --output evidence/android-mobile.xml tests/mobile/maestro/form.yaml tests/mobile/maestro/viewer.yaml tests/mobile/maestro/method.yaml
```

Adaptar la ruta de Maestro y el serial al equipo. No borrar datos del AVD.
Si el emulador no resuelve las fuentes externas, comprobar primero su DNS. La
corrida de 2026-09-28 utilizó un arranque sin snapshot y `-dns-server 8.8.8.8`,
servidor secundario ya configurado en el host; no cambió firewall ni DNS de Windows.

Después de terminar Maestro, comprobar contenido en ese mismo Chrome mediante CDP:

```powershell
adb -s emulator-5554 forward tcp:9222 localabstract:chrome_devtools_remote
cd app
node scripts/android-readiness.mjs
```

Este script usa la última pestaña abierta del emulador. No crea un navegador de
escritorio. Inspeccionar las capturas además del JSON: cargar una capa no demuestra
por sí solo que contenga una imagen útil. Las respuestas no se simulan.

El test de reproducción acota la espera automática posterior al toque para no
esperar hasta el final de la animación; véase
[tapOn de Maestro](https://docs.maestro.dev/reference/commands-available/tapon).

Resultados y límites: [informe Android](../../../docs/ANDROID_MAESTRO_20260928.md).
