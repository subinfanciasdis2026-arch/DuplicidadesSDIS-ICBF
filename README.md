[README.md](https://github.com/user-attachments/files/33665426/README.md)
# Revisión de Duplicidad de Atención SDIS – ICBF (con login)

Aplicativo móvil para revisar los documentos de las niñas y los niños en posible
duplicidad de atención (concurrencia) entre la SDIS y el ICBF.

Secretaría Distrital de Integración Social · Bogotá D.C.

---

## Seguridad: cómo funciona

- **Ingreso con usuario y contraseña.** Dos roles: `administrador` y `diligenciador`.
- En el **primer ingreso** el usuario debe **cambiar su contraseña**. Las contraseñas
  definidas por el usuario se guardan **cifradas (hash con sal)**, no en texto.
- Los **datos de las niñas y los niños NO se publican en GitHub**: se guardan en una
  carpeta de **Google Drive** y el backend (Apps Script) los entrega **solo a usuarios
  autenticados**. En GitHub solo vive la aplicación (sin datos personales).
- Los usuarios se administran en la pestaña **Usuarios** del archivo consolidado
  (se crea sola al instalar, con 5 usuarios sugeridos).

---

## Piezas

| Parte | Dónde vive | Qué hace |
|---|---|---|
| Aplicación (sin datos) | GitHub Pages | Las pantallas |
| Datos de los niños | Carpeta en Google Drive | 8 archivos JSON (index + 7 categorías) |
| Backend | Google Apps Script | Login, servir datos, consolidar envíos |
| Consolidado + Usuarios | Google Sheets | Revisiones y gestión de usuarios |

---

## Archivos que van a GitHub (carpeta de la app)

```
index.html    styles.css    app.js    modulos.js    config.js    README.md
```
**No** se sube la carpeta `data/` a GitHub.

## Archivos que van a Google Drive (carpeta de datos)

```
index.json  +  los 7 archivos <categoria>.json
```
(en la entrega van en la carpeta `datos_drive/`). Súbalos a una carpeta de Drive
llamada `datos_duplicidad` (o pegue el ID de esa carpeta en `Codigo.gs`).

---

## Configuración

1. En `config.js`: pegar la URL de Apps Script (`/exec`). **Ya viene puesta.**
2. En `Codigo.gs`: pegar el **ID de la carpeta de Drive** con los datos en
   `ID_CARPETA_DATOS` (o nombrar la carpeta `datos_duplicidad`).

---

## Usuarios sugeridos (cambian su contraseña al entrar)

| Usuario | Rol | Contraseña inicial |
|---|---|---|
| admin | administrador | Admin#Dupli2026 |
| diligenciador1 | diligenciador | Dili#Uno2026 |
| diligenciador2 | diligenciador | Dili#Dos2026 |
| diligenciador3 | diligenciador | Dili#Tres2026 |
| diligenciador4 | diligenciador | Dili#Cuatro2026 |

Se administran en la pestaña **Usuarios** del consolidado. El archivo
`Usuarios_Duplicidad.xlsx` trae esta misma tabla y las instrucciones.

---

## Los 9 módulos y lo demás

Igual que antes: ficha del niño, asistencia (solo los meses del periodo de
duplicidad), formalización, SIRBE, novedades, observador, informe trimestral, las
dos jornadas, egreso; pre-guardado, envío que actualiza sin duplicar, habeas data
y resumen final. La identidad de quien diligencia ya no se escribe: sale del login.

---

## Nota de alcance

El rol `administrador` por ahora diligencia igual que el `diligenciador`; se
guarda el rol de quien envía. Se puede ampliar después (p. ej. un tablero para el
administrador).
