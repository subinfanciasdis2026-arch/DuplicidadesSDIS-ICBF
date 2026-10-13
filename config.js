/* ============================================================================
 *  CONFIGURACION  -  Revisión de Duplicidad de Atención SDIS-ICBF
 * ============================================================================
 *
 *  Edite aquí la URL de Apps Script, los textos y los catálogos de los módulos.
 *  El bloque HABEAS_DATA al final contiene los textos legales (los puede ajustar
 *  la Oficina Asesora Jurídica sin tocar el resto del aplicativo).
 *
 * ==========================================================================*/

var CONFIG = {

  // 1) URL de la aplicacion web de Google Apps Script (termina en /exec)
  URL_APPS_SCRIPT: 'https://script.google.com/macros/s/AKfycbyhO86ElyyED2uCIOz5oj8hwo0Lt_Ni-xNUQpSEmZUwN3hde4SqLcUFyR0f-0e7FZ4F4g/exec',

  // 2) Encabezado
  TITULO: 'Revisión de Duplicidad',
  SUBTITULO: 'Concurrencia SDIS · ICBF',

  // 3) Intro de la pantalla de inicio
  INTRO: 'Este formulario permite cargar y revisar los documentos de las niñas y ' +
         'los niños que posiblemente están en duplicidad de atención entre la SDIS ' +
         'y el ICBF.',

  // 4) Ruta del índice de datos
  RUTA_INDICE: 'data/index.json',

  // 5) Seguridad: longitud mínima de la nueva contraseña (debe coincidir con el backend)
  MIN_LARGO_CONTRASENA: 8,

  // 6) Segundos de espera máxima en las peticiones al servidor
  TIMEOUT_ENVIO_SEG: 60,

  /* ==========================================================================
   *  7) CATALOGOS DE LOS MODULOS  (editables)
   * ========================================================================*/

  // Meses del cuadro de asistencia según el periodo (columna X de la base).
  MESES_2024: ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
               'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'],
  MESES_2025: ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP'],

  // 20 localidades de Bogotá (módulo Formalización de Cupo).
  LOCALIDADES: [
    'Usaquén', 'Chapinero', 'Santa Fe', 'San Cristóbal', 'Usme', 'Tunjuelito',
    'Bosa', 'Kennedy', 'Fontibón', 'Engativá', 'Suba', 'Barrios Unidos',
    'Teusaquillo', 'Los Mártires', 'Antonio Nariño', 'Puente Aranda',
    'La Candelaria', 'Rafael Uribe Uribe', 'Ciudad Bolívar', 'Sumapaz'
  ],

  // Opciones de la Ficha SIRBE (preguntas p25 y p26). Selección múltiple.
  OPCIONES_SIRBE: [
    'Jardín infantil Diurno', 'Jardín Infantil nocturno',
    'Casas de pensamiento intercultural',
    'Crecemos en la ruralidad o espacios rurales', 'Creciendo juntos',
    'Centros Amar', 'Hogar comunitario ICBF', 'Hogar Infantil ICBF',
    'FAMI del ICBF', 'Institución privada', 'Institución Educativa Distrital',
    'Ninguno'
  ],

  // Tipos de novedad (módulo Novedades). Selección múltiple.
  TIPOS_NOVEDAD: [
    '1) Indicadores comportamentales y emocionales',
    '2) Indicadores relacionados con el estado de salud',
    '3) Presunta vulneración de derechos',
    '4) Higiene y Cuidado',
    '5) Inasistencia, ingreso y salida fuera del horario del servicio',
    '6) Accidente',
    '7) Autorización de acudiente',
    '8) Remisión a profesionales de apoyo interdisciplinar',
    '9) Casos en seguimiento',
    '10) Otro'
  ],

  TIPO_CONTACTO: ['Presencial', 'Telefónico'],
  SI_NO: ['SI', 'NO'],
  SI_NO_NA: ['SI', 'NO', 'NO APLICA'],

  PERIODICIDAD_OBSERVADOR: ['Diario', 'Quincenal', 'Semanal', 'Mensual'],

  MOTIVOS_NO_ENTREGA: [
    'Inasistencia',
    'Fecha de Estado en atención',
    'Fechas periodo de concurrencia'
  ],

  ROLES_ENTREGA: ['Profesional Local', 'Nutricionista Caja'],

  SOPORTES_EGRESO: [
    'Carta', 'Visita domiciliaria', 'Llamadas telefónicas',
    'Novedad', 'Acta de seguimiento'
  ],

  // Párrafo que debe contener el formato de Formalización de Cupo.
  PARRAFO_FORMALIZACION:
    'Declaro que la información suministrada a la Secretaría Distrital de ' +
    'Integración Social o asociado para la vinculación es verídica y que he sido ' +
    'informado(a) sobre el objeto de este servicio/modalidad, de mis derechos, ' +
    'obligaciones y de las condiciones de ingreso, permanencia y egreso. De igual ' +
    'manera, informo que actualmente no hago parte de otro programa de asistencia ' +
    'social de esta u otra entidad que preste servicios de atención integral a la ' +
    'primera infancia y que frente a cualquier cambio en las circunstancias de ' +
    'vulnerabilidad deberé informar para que se valore la pertinencia de la ' +
    'continuidad en el servicio/modalidad',

  /* ==========================================================================
   *  8) PROTECCION DE DATOS PERSONALES  (Habeas Data - Ley 1581 de 2012)
   * ------------------------------------------------------------------------
   *  Validar con la Oficina Asesora Jurídica antes de producción:
   *  NIT, URL_POLITICA, correo de protección de datos y texto de la DECLARACION.
   * ========================================================================*/
  HABEAS_DATA: {
    VERSION: 'v1 · 2026',
    ACTIVO: true,
    URL_POLITICA: 'https://www.integracionsocial.gov.co/index.php/proteccion-de-datos-personales',

    RESPONSABLE: {
      NOMBRE: 'Secretaría Distrital de Integración Social (SDIS)',
      NIT: '899.999.061-9',                 // VERIFICAR con el área jurídica
      DIRECCION: 'Carrera 7 # 32-12, Edificio San Martín, Bogotá D.C.',
      TELEFONO: '(601) 380 8330 · Línea 195',
      CORREO: 'protecciondatos@sdis.gov.co', // VERIFICAR el buzón oficial de habeas data
      CORREO_RADICACION: 'integracion@sdis.gov.co'
    },

    AVISO_CORTO:
      'La información que se diligencia corresponde a datos personales de niñas ' +
      'y niños, de especial protección. La Secretaría Distrital de Integración ' +
      'Social los trata en el marco de sus funciones y conforme a la Ley 1581 ' +
      'de 2012 y a su Política de Tratamiento de Datos Personales.',

    DECLARACION:
      'Declaro que la información que cargo corresponde a la revisión documental ' +
      'de la niña o el niño, que la recolecto en ejercicio de las funciones de la ' +
      'SDIS y que conozco la Política de Tratamiento de Datos Personales de la entidad.',

    ENLACE_POLITICA: 'Leer la política de tratamiento de datos',
    TITULO_POLITICA: 'Política de Tratamiento de Datos Personales',

    POLITICA: [
      {
        titulo: '1. Responsable del tratamiento',
        parrafos: [
          'La Secretaría Distrital de Integración Social (SDIS), NIT 899.999.061-9, ' +
          'con sede en la Carrera 7 # 32-12, Edificio San Martín, Bogotá D.C., es la ' +
          'responsable del tratamiento de los datos personales recolectados en este ' +
          'formulario. Canales de contacto: teléfono (601) 380 8330, Línea 195, correo ' +
          'protecciondatos@sdis.gov.co.'
        ]
      },
      {
        titulo: '2. Finalidad del tratamiento',
        parrafos: [
          'Los datos se recolectan con el fin de revisar la documentación de las niñas ' +
          'y los niños que posiblemente se encuentran en duplicidad de atención entre la ' +
          'SDIS y el ICBF, verificar los soportes del servicio y adelantar las ' +
          'actuaciones administrativas a que haya lugar.'
        ]
      },
      {
        titulo: '3. Datos que se tratan',
        parrafos: [
          'Se tratan datos de identificación de la niña o el niño (nombre y número de ' +
          'documento), la unidad operativa, el asociado, las localidades de atención, las ' +
          'fechas de servicio y de duplicidad, y la información de los documentos del ' +
          'expediente. Se registra además el nombre de la persona de la SDIS que diligencia.'
        ]
      },
      {
        titulo: '4. Datos de niñas, niños y adolescentes',
        parrafos: [
          'El tratamiento de datos de niñas, niños y adolescentes es de especial protección. ' +
          'Se realiza atendiendo a su interés superior y al respeto de sus derechos ' +
          'fundamentales, conforme al artículo 7 del Decreto 1377 de 2013, la Ley 1098 de ' +
          '2006 (Código de la Infancia y la Adolescencia) y la Constitución Política.'
        ]
      },
      {
        titulo: '5. Derechos del titular',
        parrafos: [
          'De acuerdo con el artículo 8 de la Ley 1581 de 2012, el titular (o su ' +
          'representante) puede:'
        ],
        items: [
          'Conocer, actualizar y rectificar sus datos personales.',
          'Solicitar prueba de la autorización otorgada.',
          'Ser informado sobre el uso que se ha dado a sus datos.',
          'Presentar quejas ante la Superintendencia de Industria y Comercio.',
          'Revocar la autorización y/o solicitar la supresión del dato cuando proceda.',
          'Acceder de forma gratuita a sus datos objeto de tratamiento.'
        ]
      },
      {
        titulo: '6. Canales para ejercer sus derechos',
        parrafos: [
          'Las consultas y reclamos pueden presentarse al correo protecciondatos@sdis.gov.co, ' +
          'en la Carrera 7 # 32-12, Edificio San Martín, Bogotá D.C., o a través de la Línea ' +
          '195, en los términos de la Ley 1581 de 2012 y sus decretos reglamentarios.'
        ]
      },
      {
        titulo: '7. Marco legal y autorización',
        parrafos: [
          'El tratamiento se rige por la Constitución Política (artículo 15), la Ley 1581 de ' +
          '2012, el Decreto 1074 de 2015 (que compila el Decreto 1377 de 2013) y la Política ' +
          'de Tratamiento de Datos Personales de la SDIS. La recolección se efectúa en ' +
          'ejercicio de las funciones legales y misionales de la entidad.'
        ]
      },
      {
        titulo: '8. Vigencia',
        parrafos: [
          'Los datos se conservarán durante el tiempo necesario para cumplir la finalidad ' +
          'descrita y las obligaciones legales de la entidad. Para consultar la política ' +
          'completa y vigente, visite el sitio web oficial de la SDIS.'
        ]
      }
    ]
  }
};
