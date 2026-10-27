/* ============================================================================
   DEFINICION DE LOS MODULOS DE REVISION  (Atención en SDIS – Digitación de documentos)
   ----------------------------------------------------------------------------
   Esquema declarativo que lee app.js. Cada módulo puede tener:
     - gate:      id del campo "¿Cuenta con el documento?". Si la respuesta NO es
                  "SI", no se despliegan las demás preguntas del módulo.
     - campos:    preguntas de base (la del gate va primero).
     - rama:      bifurca según la respuesta de un campo (ej. SI/NO).
     - repetible: un cuadro que se puede agregar varias veces con un botón.

   Tipos de campo (tipo):
     texto, textarea, numero, sino, sinona, fecha, select, multi, mesesMulti,
     asistencia, egreso.

   Nota: los calendarios (tipo fecha) solo permiten años 2024 y 2025 (config.js).
   ==========================================================================*/

var MODULOS = [

  /* ------------------------------------------------- 1. Listados de asistencia */
  {
    id: 'asistencia',
    titulo: 'Listados de asistencia',
    gate: 'cuenta',
    campos: [
      { id: 'cuenta', tipo: 'sino', label: '¿Cuenta con los listados de asistencia?' },
      { id: 'asistencia', tipo: 'asistencia', label: 'Asistencia efectiva en el periodo de atención en SDIS' },
      { id: 'nombreFormato', tipo: 'texto', label: 'Nombre del formato que tiene la entidad' },
      { id: 'enlace', tipo: 'texto', label: 'Hipervínculo o enlace del documento' }
    ]
  },

  /* ------------------------------------- 2. Formalización de Cupo - FOR-PSS-434 */
  {
    id: 'formalizacion',
    titulo: 'Formalización de Cupo',
    codigo: 'FOR-PSS-434',
    gate: 'cuenta',
    campos: [
      { id: 'cuenta', tipo: 'sino', label: '¿Cuenta con el formato de formalización de cupo?' },
      { id: 'nombreFormato', tipo: 'texto', label: 'Nombre del formato que tiene la entidad' },
      { id: 'enlace', tipo: 'texto', label: 'Hipervínculo o enlace del documento' },
      { id: 'legible', tipo: 'sino', label: '¿El documento es legible?' },
      { id: 'completitud', tipo: 'sino', label: '¿La digitalización del documento se evidencia en su completitud?' },
      { id: 'fechaFormalizacion', tipo: 'fecha', label: 'Fecha de formalización de cupo' },
      { id: 'localidad', tipo: 'select', label: 'Localidad de residencia registrada en el formato', opcionesDe: 'LOCALIDADES' },
      { id: 'parrafo', tipo: 'sino', label: 'El formato cuenta con el párrafo de declaración de veracidad y no concurrencia', ayuda: '"Declaro que la información suministrada… no hago parte de otro programa de asistencia social…"' },
      { id: 'firma', tipo: 'sino', label: 'El documento cuenta con firma del padre, madre o acudiente y el responsable del servicio' }
    ]
  },

  /* ------------------------------------------- 3. Ficha SIRBE - FOR-PSS-334 */
  {
    id: 'sirbe',
    titulo: 'Ficha SIRBE',
    codigo: 'FOR-PSS-334',
    gate: 'cuenta',
    campos: [
      { id: 'cuenta', tipo: 'sino', label: '¿Cuenta con la Ficha SIRBE?' },
      { id: 'nombreFormato', tipo: 'texto', label: 'Nombre del formato que tiene la entidad' },
      { id: 'enlace', tipo: 'texto', label: 'Hipervínculo o enlace del documento' },
      { id: 'fechaEntrega', tipo: 'fecha', label: 'Fecha de entrega para la digitación' },
      { id: 'recolectorNombre', tipo: 'texto', label: 'Nombre del recolector de la ficha SIRBE' },
      { id: 'recolectorDoc', tipo: 'numero', label: 'Número de documento del recolector', ayuda: 'Solo números' },
      { id: 'digitadorNombre', tipo: 'texto', label: 'Nombre del digitador de la ficha SIRBE' },
      { id: 'completitud', tipo: 'sino', label: '¿La digitalización del documento se evidencia en su completitud?' },
      { id: 'legible', tipo: 'sino', label: '¿El documento es legible?' },
      { id: 'p25', tipo: 'multi', label: 'Pg2 Sección I p25 — ¿Ha presentado solicitud de ingreso a?', opcionesDe: 'OPCIONES_SIRBE' },
      { id: 'p26', tipo: 'multi', label: 'Pg2 Sección I p26 — ¿Actualmente el niño o la niña recibe atención en?', opcionesDe: 'OPCIONES_SIRBE' }
    ]
  },

  /* ------------------------------------------------ 4. Novedades - FOR-PSS-309 */
  {
    id: 'novedades',
    titulo: 'Novedades',
    codigo: 'FOR-PSS-309',
    gate: 'cuenta',
    campos: [
      { id: 'cuenta', tipo: 'sino', label: '¿Cuenta con el formato de novedades?' },
      { id: 'nombreFormato', tipo: 'texto', label: 'Nombre del formato que tiene la entidad' },
      { id: 'enlace', tipo: 'texto', label: 'Hipervínculo o enlace del documento' },
      { id: 'legible', tipo: 'sino', label: '¿El documento es legible?' },
      { id: 'completitud', tipo: 'sino', label: '¿La digitalización del documento se evidencia en su completitud?' },
      // --- Preguntas nuevas: conteo de novedades ---
      { id: 'totalNovedades', tipo: 'numero', label: 'Cantidad de novedades registradas en el periodo de evaluación', ayuda: 'Solo números.' },
      { id: 'novPresencial', tipo: 'numero', label: 'Cantidad de novedades de tipo presencial', ayuda: 'Solo números.' },
      { id: 'novTelefonica', tipo: 'numero', label: 'Cantidad de novedades de tipo telefónica', ayuda: 'Solo números.' },
      // Cuadro por meses (solo los del periodo de duplicidad), con contador. Igual que Asistencia.
      { id: 'novedadesMeses', tipo: 'asistencia', label: 'Novedades registradas por mes', totalLabel: 'Total de novedades:' },
      // Alerta de cuadre: suma mensual = cantidad del periodo = presencial + telefónica.
      { id: 'novResumen', tipo: 'novResumen', label: '' }
    ]
  },

  /* -------------------------------------------------------- 5. Observador */
  {
    id: 'observador',
    titulo: 'Observador',
    gate: 'cuenta',
    campos: [
      { id: 'cuenta', tipo: 'sino', label: '¿Cuenta con el observador?' },
      { id: 'nombreFormato', tipo: 'texto', label: 'Nombre del formato que tiene la entidad' },
      { id: 'enlace', tipo: 'texto', label: 'Hipervínculo o enlace del documento' },
      { id: 'legible', tipo: 'sino', label: '¿El documento es legible?' },
      { id: 'completitud', tipo: 'sino', label: '¿La digitalización del documento se evidencia en su completitud?' }
    ],
    repetible: {
      id: 'registros',
      titulo: 'Registro de observador',
      botonTexto: 'Crear registro de observador',
      campos: [
        { id: 'periodo', tipo: 'mesesMulti', label: 'Periodo del observador (meses)' },
        { id: 'periodicidad', tipo: 'select', label: 'Periodicidad de registro', opcionesDe: 'PERIODICIDAD_OBSERVADOR' },
        { id: 'fechaInicio', tipo: 'fecha', label: 'Fecha del formato — Inicio' },
        { id: 'fechaFin', tipo: 'fecha', label: 'Fecha del formato — Fin' },
        { id: 'firma', tipo: 'sino', label: 'Cuenta con la firma del padre, madre o acudiente' },
        { id: 'fechaSocializacion', tipo: 'fecha', label: 'Fecha de socialización de observador' }
      ]
    }
  },

  /* ------------------------------------------------- 6. Informe pedagógico */
  {
    id: 'informe',
    titulo: 'Informe pedagógico',
    gate: 'cuenta',
    campos: [
      { id: 'cuenta', tipo: 'sino', label: '¿Cuenta con el informe pedagógico?' },
      { id: 'nombreFormato', tipo: 'texto', label: 'Nombre del formato que tiene la entidad' },
      { id: 'enlace', tipo: 'texto', label: 'Hipervínculo o enlace del documento' }
    ],
    repetible: {
      id: 'registros',
      titulo: 'Informe pedagógico',
      botonTexto: 'Crear registro de informe pedagógico',
      minimo: 1,
      campos: [
        { id: 'legible', tipo: 'sino', label: '¿El documento es legible?' },
        { id: 'completitud', tipo: 'sino', label: '¿La digitalización del documento se evidencia en su completitud?' },
        { id: 'meses', tipo: 'mesesMulti', label: 'Meses que comprenden el informe' },
        { id: 'fechaSocializacion', tipo: 'fecha', label: 'Fecha del formato de socialización' },
        { id: 'firma', tipo: 'sino', label: 'Cuenta con la firma del padre, madre o acudiente' }
      ]
    }
  },

  /* -------------------------------- 7. Entrega de Paquete Jornada Liberada */
  {
    id: 'paqueteLiberada',
    titulo: 'Entrega de Paquete — Jornada Liberada',
    campos: [
      { id: 'cuenta', tipo: 'sino', label: '¿Cuenta con formato de entrega de paquete Jornada Liberada?' }
    ],
    rama: {
      campo: 'cuenta',
      casos: {
        'SI': {
          repetible: {
            id: 'entregas',
            titulo: 'Entrega de paquete — Jornada Liberada',
            botonTexto: 'Crear registro de paquete Jornada Liberada',
            campos: [
              { id: 'nombreFormato', tipo: 'texto', label: 'Nombre del formato que tiene la entidad' },
              { id: 'enlace', tipo: 'texto', label: 'Hipervínculo o enlace del documento' },
              { id: 'legible', tipo: 'sino', label: '¿El documento es legible?' },
              { id: 'completitud', tipo: 'sino', label: '¿La digitalización del documento se evidencia en su completitud?' },
              { id: 'fechaEntrega', tipo: 'fecha', label: 'Fecha de la entrega' },
              { id: 'firma', tipo: 'sino', label: 'Cuenta con la firma del padre, madre o acudiente' },
              { id: 'acta', tipo: 'sino', label: 'Cuenta con acta de verificación de la entrega del paquete' },
              { id: 'rol', tipo: 'select', label: 'Rol de quien acompañó la entrega', opcionesDe: 'ROLES_ENTREGA' }
            ]
          }
        },
        'NO': {
          campos: [
            { id: 'motivo', tipo: 'select', label: 'Motivo por la no entrega de paquete en jornada liberada', opcionesDe: 'MOTIVOS_NO_ENTREGA' }
          ]
        }
      }
    }
  },

  /* ------------------------------ 8. Entrega de Paquete Jornada Pedagógica */
  {
    id: 'paquetePedagogica',
    titulo: 'Entrega de Paquete — Jornada Pedagógica',
    campos: [
      { id: 'cuenta', tipo: 'sino', label: '¿Cuenta con formato de entrega de paquete Jornada Pedagógica?' }
    ],
    rama: {
      campo: 'cuenta',
      casos: {
        'SI': {
          repetible: {
            id: 'entregas',
            titulo: 'Entrega de paquete — Jornada Pedagógica',
            botonTexto: 'Crear registro de paquete Jornada Pedagógica',
            campos: [
              { id: 'nombreFormato', tipo: 'texto', label: 'Nombre del formato que tiene la entidad' },
              { id: 'enlace', tipo: 'texto', label: 'Hipervínculo o enlace del documento' },
              { id: 'legible', tipo: 'sino', label: '¿El documento es legible?' },
              { id: 'completitud', tipo: 'sino', label: '¿La digitalización del documento se evidencia en su completitud?' },
              { id: 'fechaEntrega', tipo: 'fecha', label: 'Fecha de la entrega' },
              { id: 'firma', tipo: 'sino', label: 'Cuenta con la firma del padre, madre o acudiente' },
              { id: 'acta', tipo: 'sino', label: 'Cuenta con acta de verificación de la entrega del paquete' },
              { id: 'rol', tipo: 'select', label: 'Rol de quien acompañó la entrega', opcionesDe: 'ROLES_ENTREGA' }
            ]
          }
        },
        'NO': {
          campos: [
            { id: 'motivo', tipo: 'select', label: 'Motivo por la no entrega de paquete en jornada pedagógica', opcionesDe: 'MOTIVOS_NO_ENTREGA' }
          ]
        }
      }
    }
  },

  /* -------------------------------------------------------------- 9. Egreso */
  {
    id: 'egreso',
    titulo: 'Egreso',
    gate: 'cuenta',
    campos: [
      { id: 'cuenta', tipo: 'sino', label: '¿Cuenta con los soportes de egreso que apliquen?' },
      { id: 'nombreFormato', tipo: 'texto', label: 'Nombre del formato que tiene la entidad' },
      { id: 'enlace', tipo: 'texto', label: 'Hipervínculo o enlace del documento' },
      { id: 'soportes', tipo: 'egreso', label: 'Relacione el soporte para la solicitud de egreso' }
    ]
  }

];
