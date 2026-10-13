/* ============================================================================
   DEFINICION DE LOS MODULOS DE REVISION  (aplicativo de duplicidad)
   ----------------------------------------------------------------------------
   Esquema declarativo que lee app.js. Cada módulo puede tener:
     - campos:     preguntas de base (siempre visibles)
     - rama:       bifurca según la respuesta de un campo (ej. SI/NO)
     - repetible:  un cuadro que se puede agregar varias veces con un botón

   Tipos de campo (tipo):
     texto     -> cuadro de texto de una línea
     textarea  -> cuadro de texto de varias líneas
     numero    -> cuadro de texto que SOLO admite números
     sino      -> lista desplegable SI / NO
     sinona    -> lista desplegable SI / NO / NO APLICA
     fecha     -> calendario para marcar la fecha
     select    -> lista desplegable con opciones fijas
     multi     -> selección múltiple (varias opciones)
     mesesMulti-> selección múltiple de los meses según el periodo del niño
     asistencia-> cuadro de asistencia por mes con total automático
     egreso    -> soportes de egreso con sus campos dinámicos

   mostrarSi: { campo: 'idOtroCampo', valor: 'SI' }  -> muestra el campo solo si aplica
   ==========================================================================*/

var MODULOS = [

  /* ------------------------------------------------- 1. Listados de asistencia */
  {
    id: 'asistencia',
    titulo: 'Listados de asistencia',
    campos: [
      { id: 'asistencia', tipo: 'asistencia', label: 'Asistencia efectiva en periodo de duplicidad' },
      { id: 'nombreFormato', tipo: 'texto', label: 'Nombre del formato que tiene la entidad' },
      { id: 'enlace', tipo: 'texto', label: 'Hipervínculo o enlace del documento' }
    ]
  },

  /* ------------------------------------- 2. Formalización de Cupo - FOR-PSS-434 */
  {
    id: 'formalizacion',
    titulo: 'Formalización de Cupo',
    codigo: 'FOR-PSS-434',
    campos: [
      { id: 'nombreFormato', tipo: 'texto', label: 'Nombre del formato que tiene la entidad' },
      { id: 'enlace', tipo: 'texto', label: 'Hipervínculo o enlace del documento' },
      { id: 'cuenta', tipo: 'sino', label: 'Cuenta con el formato de formalización de cupo' },
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
    campos: [
      { id: 'nombreFormato', tipo: 'texto', label: 'Nombre del formato que tiene la entidad' },
      { id: 'enlace', tipo: 'texto', label: 'Hipervínculo o enlace del documento' },
      { id: 'cuenta', tipo: 'sino', label: 'Cuenta con Ficha SIRBE' },
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
    campos: [
      { id: 'nombreFormato', tipo: 'texto', label: 'Nombre del formato que tiene la entidad' },
      { id: 'enlace', tipo: 'texto', label: 'Hipervínculo o enlace del documento' },
      { id: 'cuenta', tipo: 'sino', label: 'Cuenta con novedades para el periodo de concurrencia' },
      { id: 'legible', tipo: 'sino', label: '¿El documento es legible?' },
      { id: 'completitud', tipo: 'sino', label: '¿La digitalización del documento se evidencia en su completitud?' }
    ],
    repetible: {
      id: 'registros',
      titulo: 'Registro de novedad',
      botonTexto: 'Crear nuevo registro de novedad',
      campos: [
        { id: 'fecha', tipo: 'fecha', label: 'Fecha de la novedad (D/M/A)' },
        { id: 'tipo', tipo: 'multi', label: 'Tipo de novedad', opcionesDe: 'TIPOS_NOVEDAD' },
        { id: 'contacto', tipo: 'select', label: 'Tipo de contacto', opcionesDe: 'TIPO_CONTACTO' },
        { id: 'firma', tipo: 'sinona', label: 'Cuenta con la firma del padre, madre o acudiente' },
        { id: 'fechaSocializo', tipo: 'fecha', label: 'Fecha de la novedad en que se socializó' }
      ]
    }
  },

  /* -------------------------------------------------------- 5. Observador */
  {
    id: 'observador',
    titulo: 'Observador',
    campos: [
      { id: 'nombreFormato', tipo: 'texto', label: 'Nombre del formato que tiene la entidad' },
      { id: 'enlace', tipo: 'texto', label: 'Hipervínculo o enlace del documento' },
      { id: 'cuenta', tipo: 'sino', label: 'Cuenta con observador para el periodo de concurrencia' },
      { id: 'legible', tipo: 'sino', label: '¿El documento es legible?' },
      { id: 'completitud', tipo: 'sino', label: '¿La digitalización del documento se evidencia en su completitud?' }
    ],
    repetible: {
      id: 'registros',
      titulo: 'Registro de observador',
      botonTexto: 'Crear nuevo registro de observador',
      campos: [
        { id: 'periodo', tipo: 'mesesMulti', label: 'Periodo del observador (meses)' },
        { id: 'periodicidad', tipo: 'select', label: 'Periodicidad de registro', opcionesDe: 'PERIODICIDAD_OBSERVADOR' },
        { id: 'fechaInicio', tipo: 'fecha', label: 'Fecha del formato — Inicio' },
        { id: 'fechaFin', tipo: 'fecha', label: 'Fecha del formato — Fin' },
        { id: 'firma', tipo: 'sino', label: 'Cuenta con la firma del padre, madre o acudiente' }
      ]
    }
  },

  /* ------------------------------------------------- 6. Informe Trimestral */
  {
    id: 'informe',
    titulo: 'Informe Trimestral',
    campos: [
      { id: 'nombreFormato', tipo: 'texto', label: 'Nombre del formato que tiene la entidad' },
      { id: 'enlace', tipo: 'texto', label: 'Hipervínculo o enlace del documento' }
    ],
    repetible: {
      id: 'registros',
      titulo: 'Informe trimestral',
      botonTexto: 'Crear nuevo registro de paquete trimestral',
      minimo: 1,
      campos: [
        { id: 'cuenta', tipo: 'sinona', label: 'Cuenta con informes para el periodo de duplicidad' },
        { id: 'legible', tipo: 'sino', label: '¿El documento es legible?' },
        { id: 'completitud', tipo: 'sino', label: '¿La digitalización del documento se evidencia en su completitud?' },
        { id: 'meses', tipo: 'mesesMulti', label: 'Meses que comprenden el informe trimestral' },
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
      { id: 'cuenta', tipo: 'sino', label: 'Cuenta con formato de entrega de paquete Jornada Liberada' }
    ],
    rama: {
      campo: 'cuenta',
      casos: {
        'SI': {
          repetible: {
            id: 'entregas',
            titulo: 'Entrega de paquete — Jornada Liberada',
            botonTexto: 'Crear nuevo registro de paquete Jornada Liberada',
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
      { id: 'cuenta', tipo: 'sino', label: 'Cuenta con formato de entrega de paquete Jornada Pedagógica' }
    ],
    rama: {
      campo: 'cuenta',
      casos: {
        'SI': {
          repetible: {
            id: 'entregas',
            titulo: 'Entrega de paquete — Jornada Pedagógica',
            botonTexto: 'Crear nuevo registro de paquete Jornada Pedagógica',
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
    campos: [
      { id: 'nombreFormato', tipo: 'texto', label: 'Nombre del formato que tiene la entidad' },
      { id: 'enlace', tipo: 'texto', label: 'Hipervínculo o enlace del documento' },
      { id: 'cuenta', tipo: 'sino', label: 'Cuenta con soportes de egreso que apliquen en la concurrencia' },
      { id: 'soportes', tipo: 'egreso', label: 'Relacione el soporte para la solicitud de egreso' }
    ]
  }

];
