/* ============================================================================
   REVISIÓN DE DUPLICIDAD SDIS-ICBF   |   Lógica del aplicativo
   ----------------------------------------------------------------------------
   Pantalla 1  Categoría -> Jardín -> Niña/Niño -> Nombre (+ protección de datos)
   Pantalla 2  Ficha del niño + los 9 módulos de revisión documental
   Pantalla 3  Resumen del envío

   Los módulos se definen en modulos.js. Lo diligenciado se pre-guarda en el
   navegador y sólo viaja al servidor al presionar ENVIAR.
   ==========================================================================*/

(function () {
  'use strict';

  var CLAVE_BORRADOR = 'dup:borrador:';
  var CLAVE_SESION = 'dup:sesion';

  var estado = {
    auth: { token: '', usuario: '', nombre: '', rol: '' },
    indice: null,
    cacheCat: {},
    seleccion: {
      categoria: '', slug: '', jardinCod: '', jardin: '', jardinCorto: '',
      casoId: '', nombre: '', doc: '', periodo: '',
      aceptoHabeasData: false, fechaAceptacionHD: ''
    },
    caso: null,              // detalle completo del caso seleccionado
    respuestas: {},          // { moduloId: { base:{}, rep:{repId:[...]} } }
    enviando: false
  };

  /* ====================================================== ATAJOS */
  function $(id) { return document.getElementById(id); }
  function crear(tag, clase) { var e = document.createElement(tag); if (clase) e.className = clase; return e; }
  function limpiar(el) { while (el && el.firstChild) el.removeChild(el.firstChild); }
  function txt(v) { return v === null || v === undefined ? '' : String(v); }

  function opcion(valor, etiqueta) {
    var o = crear('option'); o.value = valor; o.textContent = etiqueta; return o;
  }
  function reiniciarSelect(sel, inicial, habilitado) {
    limpiar(sel); sel.appendChild(opcion('', inicial)); sel.disabled = !habilitado; sel.value = '';
  }
  function mostrarPantalla(nombre) {
    ['pantallaLogin', 'pantallaCambio', 'pantallaBusqueda', 'pantallaFormulario', 'pantallaFin'].forEach(function (id) {
      $(id).classList.toggle('oculto', id !== nombre);
    });
    $('barraTrabajo').classList.toggle('oculto', nombre !== 'pantallaFormulario');
    // La barra de sesión (usuario + Salir) se ve solo cuando ya ingresó.
    var dentro = (nombre === 'pantallaBusqueda' || nombre === 'pantallaFormulario' || nombre === 'pantallaFin');
    $('sesion').classList.toggle('oculto', !dentro || !estado.auth.token);
    window.scrollTo(0, 0);
  }
  function idAleatorio() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return 'env-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
  }
  function hoyTexto() {
    var d = new Date();
    function dd(n) { return (n < 10 ? '0' : '') + n; }
    return dd(d.getDate()) + '/' + dd(d.getMonth() + 1) + '/' + d.getFullYear() +
           ' ' + dd(d.getHours()) + ':' + dd(d.getMinutes());
  }
  function isoAhora_() { try { return new Date().toISOString(); } catch (e) { return hoyTexto(); } }

  // Limita todo calendario a los años permitidos (2024 y 2025 por defecto).
  function limitarFecha(input) {
    input.min = (CONFIG.FECHA_MIN || '2024-01-01');
    input.max = (CONFIG.FECHA_MAX || '2025-12-31');
  }

  function opcionesDe(campo) {
    if (campo.opciones) return campo.opciones;
    if (campo.opcionesDe && CONFIG[campo.opcionesDe]) return CONFIG[campo.opcionesDe];
    if (campo.tipo === 'sino') return CONFIG.SI_NO;
    if (campo.tipo === 'sinona') return CONFIG.SI_NO_NA;
    return [];
  }
  function mesesDe(periodo) {
    return String(periodo) === '2024' ? CONFIG.MESES_2024 : CONFIG.MESES_2025;
  }

  // Abreviatura de mes por número (1-12)
  var MES_ABBR = ['', 'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  function mesNumDeFecha(f) {
    var m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(txt(f));
    return m ? parseInt(m[2], 10) : 0;
  }
  // Meses habilitados según el/los periodo(s) de duplicidad del caso.
  // Devuelve { ABBR: true }. Si no hay fechas legibles, habilita todos los del periodo.
  function mesesHabilitados(caso) {
    var lista = mesesDe(caso.periodo);
    var permitidos = {};
    (caso.duplicidades || []).forEach(function (d) {
      var mi = mesNumDeFecha(d.inicio), mf = mesNumDeFecha(d.fin);
      if (!mi && !mf) return;
      if (!mi) mi = mf;
      if (!mf) mf = mi;
      if (mf < mi) { var t = mi; mi = mf; mf = t; }
      for (var m = mi; m <= mf; m++) {
        var ab = MES_ABBR[m];
        if (ab && lista.indexOf(ab) >= 0) permitidos[ab] = true;
      }
    });
    if (!Object.keys(permitidos).length) { lista.forEach(function (ab) { permitidos[ab] = true; }); }
    return permitidos;
  }

  /* ====================================================== ARRANQUE */
  document.addEventListener('DOMContentLoaded', iniciar);

  function iniciar() {
    $('tituloApp').textContent = CONFIG.TITULO;
    $('subtituloApp').textContent = CONFIG.SUBTITULO;
    $('introApp').textContent = CONFIG.INTRO;
    document.title = CONFIG.TITULO + ' · SDIS';
    prepararHabeasData();
    conectarEventos();

    if (urlSinConfigurar()) {
      mostrarPantalla('pantallaLogin');
      mensaje('zonaLogin', 'error', 'Falta configurar el servidor',
        'El archivo config.js todavía no tiene la URL de Google Apps Script. El ingreso no funcionará hasta configurarla.');
      return;
    }
    // ¿Hay una sesión guardada en esta pestaña? Se intenta reutilizar.
    var ses = leerSesionGuardada();
    if (ses && ses.token) {
      estado.auth = ses;
      pintarSesion();
      entrarAlAplicativo();
    } else {
      mostrarPantalla('pantallaLogin');
      $('inpUsuario').focus();
    }
  }

  function urlSinConfigurar() {
    var url = txt(CONFIG.URL_APPS_SCRIPT);
    return (!url || url.indexOf('PEGA_AQUI') === 0 || url.indexOf('/exec') < 0);
  }

  function conectarEventos() {
    // Login
    $('formLogin').addEventListener('submit', alIngresar);
    $('btnIngresar').addEventListener('click', alIngresar);
    $('formCambio').addEventListener('submit', alGuardarClave);
    $('btnGuardarClave').addEventListener('click', alGuardarClave);
    $('inpNueva').addEventListener('input', validarCambio);
    $('inpNueva2').addEventListener('input', validarCambio);
    $('btnSalir').addEventListener('click', salir);

    // Búsqueda
    $('selCategoria').addEventListener('change', alCambiarCategoria);
    $('selJardin').addEventListener('change', alCambiarJardin);
    $('selNino').addEventListener('change', validarBusqueda);
    $('btnIniciar').addEventListener('click', iniciarDiligenciamiento);

    $('chkHabeas').addEventListener('change', alMarcarHabeas);
    $('btnVerPolitica').addEventListener('click', abrirPolitica);
    $('btnCerrarPolitica').addEventListener('click', function () { cerrarPolitica(false); });
    $('btnAceptarPolitica').addEventListener('click', function () { cerrarPolitica(true); });

    $('btnAtras').addEventListener('click', confirmarSalida);
    $('btnEnviar').addEventListener('click', confirmarEnvio);
    $('btnVolverInicio').addEventListener('click', volverAlInicio);
    $('btnOtroNino').addEventListener('click', volverAlInicio);
  }

  /* ====================================================== API (servidor) */

  function apiPost(cuerpo) {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var corte = setTimeout(function () { if (ctrl) ctrl.abort(); }, CONFIG.TIMEOUT_ENVIO_SEG * 1000);
    return fetch(CONFIG.URL_APPS_SCRIPT, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(cuerpo), redirect: 'follow', signal: ctrl ? ctrl.signal : undefined
    })
      .then(function (r) { return r.text(); })
      .then(function (t) {
        clearTimeout(corte);
        var j; try { j = JSON.parse(t); } catch (e) {
          throw new Error('El servidor respondió algo inesperado. Verifique que la implementación esté publicada para «Cualquier persona».');
        }
        return j;
      })
      .catch(function (e) { clearTimeout(corte); throw e; });
  }

  // Petición autenticada que entrega datos. Si la sesión venció o exige cambio,
  // redirige a la pantalla correspondiente.
  function apiDatos(accion, extra) {
    var cuerpo = { accion: accion, token: estado.auth.token };
    if (extra) Object.keys(extra).forEach(function (k) { cuerpo[k] = extra[k]; });
    return apiPost(cuerpo).then(function (r) {
      if (!r.ok) {
        if (r.codigo === 'SESION') { forzarRelogin('Su sesión expiró. Vuelva a ingresar.'); throw new Error('SESION'); }
        if (r.codigo === 'DEBE_CAMBIAR') { mostrarCambio(); throw new Error('DEBE_CAMBIAR'); }
        throw new Error(r.error || 'Error del servidor.');
      }
      return r.datos;
    });
  }

  /* ====================================================== LOGIN */

  function alIngresar(e) {
    if (e && e.preventDefault) e.preventDefault();
    var usuario = txt($('inpUsuario').value).trim();
    var clave = $('inpClave').value;
    limpiarZona('zonaLogin');
    if (!usuario || !clave) { mensaje('zonaLogin', 'error', 'Faltan datos', 'Escriba su usuario y contraseña.'); return; }

    $('btnIngresar').disabled = true;
    $('btnIngresar').innerHTML = '<span class="rueda rueda--blanca"></span> Ingresando…';

    apiPost({ accion: 'login', usuario: usuario, contrasena: clave })
      .then(function (r) {
        if (!r.ok) { mensaje('zonaLogin', 'error', 'No se pudo ingresar', r.error || 'Usuario o contraseña incorrectos.'); return; }
        estado.auth = { token: r.token, usuario: r.usuario, nombre: r.nombre, rol: r.rol };
        guardarSesion();
        pintarSesion();
        $('inpClave').value = '';
        if (r.debeCambiar) { mostrarCambio(); }
        else { entrarAlAplicativo(); }
      })
      .catch(function (err) {
        mensaje('zonaLogin', 'error', 'No se pudo ingresar', err.message || 'Error de conexión.');
      })
      .then(function () { $('btnIngresar').textContent = 'INGRESAR'; $('btnIngresar').disabled = false; });
  }

  function mostrarCambio() {
    limpiarZona('zonaCambio');
    $('inpNueva').value = ''; $('inpNueva2').value = '';
    $('ayudaNueva').textContent = 'Mínimo ' + (CONFIG.MIN_LARGO_CONTRASENA || 8) + ' caracteres.';
    $('btnGuardarClave').disabled = true;
    mostrarPantalla('pantallaCambio');
    $('inpNueva').focus();
  }

  function validarCambio() {
    var a = $('inpNueva').value, b = $('inpNueva2').value;
    var minimo = CONFIG.MIN_LARGO_CONTRASENA || 8;
    var ayuda = $('ayudaNueva');
    var ok = true;
    if (a.length < minimo) { ayuda.textContent = 'Mínimo ' + minimo + ' caracteres.'; ayuda.className = 'campo__ayuda'; ok = false; }
    else if (b && a !== b) { ayuda.textContent = 'Las dos contraseñas no coinciden.'; ayuda.className = 'campo__ayuda campo__ayuda--error'; ok = false; }
    else if (a === b) { ayuda.textContent = 'Las contraseñas coinciden.'; ayuda.className = 'campo__ayuda'; }
    $('btnGuardarClave').disabled = !(ok && a && a === b);
  }

  function alGuardarClave(e) {
    if (e && e.preventDefault) e.preventDefault();
    var nueva = $('inpNueva').value;
    if ($('btnGuardarClave').disabled) return;
    $('btnGuardarClave').disabled = true;
    $('btnGuardarClave').innerHTML = '<span class="rueda rueda--blanca"></span> Guardando…';

    apiPost({ accion: 'cambiar', token: estado.auth.token, nueva: nueva })
      .then(function (r) {
        if (!r.ok) {
          if (r.codigo === 'SESION') { forzarRelogin('Su sesión expiró. Vuelva a ingresar.'); return; }
          mensaje('zonaCambio', 'error', 'No se pudo cambiar', r.error || 'Error.'); return;
        }
        guardarSesion();
        entrarAlAplicativo();
      })
      .catch(function (err) { mensaje('zonaCambio', 'error', 'No se pudo cambiar', err.message || 'Error de conexión.'); })
      .then(function () { $('btnGuardarClave').textContent = 'GUARDAR Y CONTINUAR'; validarCambio(); });
  }

  function entrarAlAplicativo() {
    mostrarPantalla('pantallaBusqueda');
    limpiarZona('zonaMensajes');
    pintarBorradores();
    cargarIndice();
    validarBusqueda();
  }

  function salir() {
    abrirModal({ titulo: 'Cerrar sesión', texto: '¿Desea salir del aplicativo? Los avances pre-guardados quedan en este dispositivo.',
      botones: [ { texto: 'Sí, salir', clase: 'boton--principal', accion: function () { cerrarModal(); hacerSalir(); } },
                 { texto: 'Cancelar', clase: 'boton--secundario', accion: cerrarModal } ] });
  }
  function hacerSalir() {
    estado.auth = { token: '', usuario: '', nombre: '', rol: '' };
    estado.indice = null; estado.cacheCat = {}; estado.caso = null; estado.respuestas = {};
    // Reiniciar aceptación de protección de datos: el próximo ingreso la pide de nuevo.
    estado.seleccion.aceptoHabeasData = false; estado.seleccion.fechaAceptacionHD = '';
    if ($('chkHabeas')) { $('chkHabeas').checked = false; }
    try { sessionStorage.removeItem(CLAVE_SESION); } catch (e) {}
    $('sesion').classList.add('oculto');
    $('inpUsuario').value = ''; $('inpClave').value = '';
    mostrarPantalla('pantallaLogin');
    $('inpUsuario').focus();
  }
  function forzarRelogin(msg) {
    estado.auth = { token: '', usuario: '', nombre: '', rol: '' };
    try { sessionStorage.removeItem(CLAVE_SESION); } catch (e) {}
    $('sesion').classList.add('oculto');
    mostrarPantalla('pantallaLogin');
    if (msg) mensaje('zonaLogin', 'alerta', 'Sesión finalizada', msg);
  }

  function pintarSesion() {
    var a = estado.auth;
    $('sesionInfo').textContent = (a.nombre || a.usuario) + ' · ' + (a.rol || '');
    $('sesion').classList.remove('oculto');
  }
  function guardarSesion() { try { sessionStorage.setItem(CLAVE_SESION, JSON.stringify(estado.auth)); } catch (e) {} }
  function leerSesionGuardada() { try { var c = sessionStorage.getItem(CLAVE_SESION); return c ? JSON.parse(c) : null; } catch (e) { return null; } }

  /* ====================================================== HABEAS DATA */
  function hdActivo() { return !!(CONFIG.HABEAS_DATA && CONFIG.HABEAS_DATA.ACTIVO); }

  function prepararHabeasData() {
    var bloque = $('bloqueHabeas');
    if (!hdActivo()) { if (bloque) bloque.classList.add('oculto'); estado.seleccion.aceptoHabeasData = true; return; }
    var hd = CONFIG.HABEAS_DATA;
    $('habeasAvisoCorto').textContent = hd.AVISO_CORTO || '';
    $('habeasDeclaracion').textContent = hd.DECLARACION || '';
    $('btnVerPolitica').textContent = hd.ENLACE_POLITICA || 'Ver la política de datos';
    var enlace = $('politicaEnlaceOficial');
    if (hd.URL_POLITICA) enlace.href = hd.URL_POLITICA; else enlace.classList.add('oculto');
    construirPolitica();
  }
  function construirPolitica() {
    var hd = CONFIG.HABEAS_DATA;
    $('politicaTitulo').textContent = hd.TITULO_POLITICA || 'Política de tratamiento de datos';
    var cont = $('politicaCuerpo'); limpiar(cont);
    (hd.POLITICA || []).forEach(function (sec) {
      var b = crear('section', 'politica__seccion');
      if (sec.titulo) { var t = crear('h4', 'politica__titulo'); t.textContent = sec.titulo; b.appendChild(t); }
      (sec.parrafos || []).forEach(function (p) { var x = crear('p', 'politica__parrafo'); x.textContent = p; b.appendChild(x); });
      if (sec.items && sec.items.length) {
        var ul = crear('ul', 'politica__lista');
        sec.items.forEach(function (it) { var li = crear('li'); li.textContent = it; ul.appendChild(li); });
        b.appendChild(ul);
      }
      cont.appendChild(b);
    });
  }
  function alMarcarHabeas() {
    var m = $('chkHabeas').checked;
    estado.seleccion.aceptoHabeasData = m;
    estado.seleccion.fechaAceptacionHD = m ? isoAhora_() : '';
    validarBusqueda();
  }
  function abrirPolitica() { $('capaPolitica').classList.remove('oculto'); $('politicaCuerpo').scrollTop = 0; $('btnAceptarPolitica').focus(); }
  function cerrarPolitica(aceptar) {
    $('capaPolitica').classList.add('oculto');
    if (aceptar && hdActivo() && !$('chkHabeas').checked) { $('chkHabeas').checked = true; alMarcarHabeas(); }
  }

  /* ====================================================== ÍNDICE */
  function cargarIndice() {
    if (estado.indice) { llenarCategorias(); $('cargandoIndice').classList.add('oculto'); $('formBusqueda').classList.remove('oculto'); return; }
    $('cargandoIndice').classList.remove('oculto');
    $('formBusqueda').classList.add('oculto');
    apiDatos('index')
      .then(function (d) {
        estado.indice = d;
        $('cargandoIndice').classList.add('oculto');
        $('formBusqueda').classList.remove('oculto');
        llenarCategorias();
        pintarBorradores();
        $('resumenBase').textContent =
          d.categorias.length + ' categorías · ' +
          d.categorias.reduce(function (a, c) { return a + c.nJardines; }, 0) + ' jardines · ' +
          d.categorias.reduce(function (a, c) { return a + c.nCasos; }, 0) + ' casos';
      })
      .catch(function (err) {
        $('cargandoIndice').classList.add('oculto');
        if (err.message === 'SESION' || err.message === 'DEBE_CAMBIAR') return;
        mensaje('zonaMensajes', 'error', 'No se pudo cargar la base de datos', 'Detalle: ' + err.message);
      });
  }
  function llenarCategorias() {
    var sel = $('selCategoria');
    reiniciarSelect(sel, 'Seleccione la categoría…', true);
    estado.indice.categorias.forEach(function (c) { sel.appendChild(opcion(c.slug, c.nombre)); });
  }
  function catPorSlug(slug) {
    var l = estado.indice.categorias;
    for (var i = 0; i < l.length; i++) if (l[i].slug === slug) return l[i];
    return null;
  }

  /* ====================================================== PANTALLA 1 */
  function alCambiarCategoria() {
    var slug = $('selCategoria').value;
    reiniciarSelect($('selJardin'), 'Primero seleccione la categoría', false);
    reiniciarSelect($('selNino'), 'Primero seleccione el jardín', false);
    estado.seleccion.jardinCod = ''; estado.seleccion.jardin = ''; estado.seleccion.casoId = '';
    validarBusqueda();
    if (!slug) { estado.seleccion.categoria = ''; estado.seleccion.slug = ''; $('ayudaJardin').textContent = ''; return; }
    var cat = catPorSlug(slug);
    estado.seleccion.categoria = cat.nombre; estado.seleccion.slug = slug;
    var sel = $('selJardin');
    reiniciarSelect(sel, 'Seleccione el jardín…', true);
    cat.jardines.forEach(function (j) { sel.appendChild(opcion(j.cod, j.corto + '  (' + j.nCasos + ')')); });
    $('ayudaJardin').textContent = cat.nJardines + ' jardines · ' + cat.nCasos + ' casos · periodo ' + cat.periodo;
    cargarCategoria(slug).catch(function () {});
  }
  function alCambiarJardin() {
    var cod = $('selJardin').value;
    reiniciarSelect($('selNino'), 'Primero seleccione el jardín', false);
    estado.seleccion.casoId = '';
    validarBusqueda();
    if (!cod) { estado.seleccion.jardinCod = ''; estado.seleccion.jardin = ''; return; }
    var cat = catPorSlug(estado.seleccion.slug);
    var jardin = null;
    for (var i = 0; i < cat.jardines.length; i++) if (cat.jardines[i].cod === cod) { jardin = cat.jardines[i]; break; }
    if (!jardin) return;
    estado.seleccion.jardinCod = jardin.cod; estado.seleccion.jardin = jardin.nombre; estado.seleccion.jardinCorto = jardin.corto;
    var sel = $('selNino');
    reiniciarSelect(sel, 'Seleccione la niña o el niño…', true);
    jardin.casos.forEach(function (c) { sel.appendChild(opcion(c.id, c.nombre + '  ·  ' + c.doc)); });
  }
  function validarBusqueda() {
    var s = estado.seleccion;
    s.casoId = $('selNino').value;
    var habeasOk = !hdActivo() || s.aceptoHabeasData;
    var listo = !!(s.categoria && s.jardinCod && s.casoId && habeasOk);
    $('btnIniciar').disabled = !listo;
    return listo;
  }

  /* ====================================================== CARGA DEL CASO */
  function cargarCategoria(slug) {
    if (estado.cacheCat[slug]) return Promise.resolve(estado.cacheCat[slug]);
    return apiDatos('cat', { slug: slug }).then(function (d) { estado.cacheCat[slug] = d; return d; });
  }

  function iniciarDiligenciamiento() {
    if (!validarBusqueda()) return;
    var s = estado.seleccion;
    $('btnIniciar').disabled = true;
    $('btnIniciar').innerHTML = '<span class="rueda rueda--blanca"></span> Cargando…';
    var caso;
    cargarCategoria(s.slug)
      .then(function (d) {
        caso = d.casos[s.casoId];
        if (!caso) throw new Error('No se encontró el caso seleccionado.');
        estado.caso = caso;
        s.nombre = caso.nombre; s.doc = caso.doc; s.periodo = caso.periodo;
        // Trae lo que ya estaba registrado para este niño (del servidor), para continuar.
        return cargarRespuestasServidor(s.casoId);
      })
      .then(function (servidor) {
        var local = leerBorradorSilencioso();
        // Se prefiere el pre-guardado local si existe (puede tener cambios sin enviar);
        // si no, se usa lo que ya está registrado en el servidor.
        if (local && Object.keys(local).length) {
          estado.respuestas = local;
          mensaje('mensajesFormulario', 'info', 'Se recuperó su avance', 'Encontramos un pre-guardado en este dispositivo. Puede continuar donde quedó.');
        } else if (servidor && Object.keys(servidor).length) {
          estado.respuestas = servidor;
          mensaje('mensajesFormulario', 'info', 'Se cargó lo ya registrado', 'Se trajo la información que ya estaba guardada para esta niña o niño. Puede revisarla, ajustarla y volver a enviar.');
        } else {
          estado.respuestas = {};
        }
        pintarFicha();
        pintarModulos();
        actualizarProgreso();
        mostrarPantalla('pantallaFormulario');
      })
      .catch(function (err) { if (err.message !== 'SESION' && err.message !== 'DEBE_CAMBIAR') mensaje('zonaMensajes', 'error', 'No se pudo abrir el caso', err.message); })
      .then(function () { $('btnIniciar').textContent = 'INICIAR DILIGENCIAMIENTO'; validarBusqueda(); });
  }

  // Trae del servidor la última información registrada para este caso (si existe).
  function cargarRespuestasServidor(casoId) {
    return apiDatos('cargar', { casoId: casoId })
      .then(function (d) { return (d && d.respuestas) ? d.respuestas : {}; })
      .catch(function (err) {
        if (err.message === 'SESION' || err.message === 'DEBE_CAMBIAR') throw err;
        return {};   // si falla la consulta, se continúa sin precarga del servidor
      });
  }

  /* ====================================================== FICHA */
  function pintarFicha() {
    var c = estado.caso, cont = $('ficha'); limpiar(cont);

    var cab = crear('div', 'ficha__cabeza');
    var n = crear('div', 'ficha__nombre'); n.textContent = c.nombre; cab.appendChild(n);
    var dc = crear('div', 'ficha__doc'); dc.textContent = 'Documento ' + c.doc; cab.appendChild(dc);
    cont.appendChild(cab);

    var grid = crear('div', 'ficha__grid');
    function dato(k, v, ancho) {
      var d = crear('div', 'ficha__dato' + (ancho ? ' ficha__dato--ancho' : ''));
      var kk = crear('div', 'ficha__clave'); kk.textContent = k;
      var vv = crear('div', 'ficha__valor'); vv.textContent = txt(v) || '—';
      d.appendChild(kk); d.appendChild(vv); return d;
    }
    grid.appendChild(dato('Unidad operativa', c.jardin, true));
    grid.appendChild(dato('Asociado', c.asociado));
    grid.appendChild(dato('Localidad ICBF', c.locICBF));
    grid.appendChild(dato('Localidad SDIS', c.locSDIS));
    grid.appendChild(dato('Inicio atención SDIS', c.iniSDIS));
    grid.appendChild(dato('Fin atención SDIS', c.finSDIS));
    cont.appendChild(grid);

    var dup = crear('div', 'ficha__dup');
    var dt = crear('div', 'ficha__dup-tit'); dt.textContent = 'Periodo(s) de atención en SDIS'; dup.appendChild(dt);
    (c.duplicidades || []).forEach(function (d) {
      var it = crear('div', 'ficha__dup-item');
      it.textContent = '· ' + (d.inicio || '?') + '  →  ' + (d.fin || '?') + (d.dias ? '   (' + d.dias + ' días)' : '');
      dup.appendChild(it);
    });
    if (!(c.duplicidades || []).length) { var v = crear('div', 'ficha__dup-item'); v.textContent = '—'; dup.appendChild(v); }
    var p = crear('span', 'ficha__periodo'); p.textContent = 'Periodo ' + c.periodo; dup.appendChild(p);
    cont.appendChild(dup);
  }

  /* ====================================================== VALORES */
  function modEstado(mid) {
    if (!estado.respuestas[mid]) estado.respuestas[mid] = { base: {}, rep: {} };
    return estado.respuestas[mid];
  }
  function getBase(mid, cid) { var m = modEstado(mid); return m.base[cid]; }
  function setBase(mid, cid, v) { modEstado(mid).base[cid] = v; }
  function getRep(mid, rid) { var m = modEstado(mid); if (!m.rep[rid]) m.rep[rid] = []; return m.rep[rid]; }

  function onCambio(estructural, mod) {
    guardarBorradorConRetardo();
    if (estructural && mod) { redibujarCuerpo(mod); }
    actualizarProgreso();
  }

  /* ====================================================== MÓDULOS */
  function pintarModulos() {
    var cont = $('modulos'); limpiar(cont);
    var nav = $('modnav'); limpiar(nav);

    MODULOS.forEach(function (mod, i) {
      // chip de navegación
      var chip = crear('button', 'modnav__chip'); chip.type = 'button';
      chip.textContent = (i + 1) + '. ' + mod.titulo;
      chip.dataset.mid = mod.id;
      chip.addEventListener('click', function () { abrirModulo(mod.id, true); });
      nav.appendChild(chip);

      // tarjeta del módulo
      var card = crear('article', 'modulo'); card.dataset.mid = mod.id; card.id = 'mod-' + mod.id;

      var cab = crear('button', 'modulo__cabeza'); cab.type = 'button';
      var num = crear('span', 'modulo__num'); num.textContent = i + 1; cab.appendChild(num);
      var tit = crear('span', 'modulo__tit'); tit.textContent = mod.titulo + (mod.codigo ? ' · ' + mod.codigo : ''); cab.appendChild(tit);
      var fl = crear('span', 'modulo__flecha'); fl.textContent = '▼'; cab.appendChild(fl);
      cab.addEventListener('click', function () { toggleModulo(mod.id); });
      card.appendChild(cab);

      var cuerpo = crear('div', 'modulo__cuerpo oculto'); cuerpo.dataset.cuerpo = mod.id;
      card.appendChild(cuerpo);
      cont.appendChild(card);
    });

    abrirModulo(MODULOS[0].id, false);
    actualizarChips();
  }

  function toggleModulo(mid) {
    var card = $('mod-' + mid);
    var abierto = card.classList.contains('abierto');
    if (abierto) { card.classList.remove('abierto'); card.querySelector('[data-cuerpo]').classList.add('oculto'); }
    else { abrirModulo(mid, true); }
  }
  function abrirModulo(mid, desplazar) {
    MODULOS.forEach(function (m) {
      var card = $('mod-' + m.id);
      var cuerpo = card.querySelector('[data-cuerpo]');
      if (m.id === mid) {
        card.classList.add('abierto'); cuerpo.classList.remove('oculto');
        if (!cuerpo.childNodes.length) renderCuerpo(buscarModulo(mid));
        if (desplazar) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else { card.classList.remove('abierto'); cuerpo.classList.add('oculto'); }
    });
    actualizarChips(mid);
  }
  function buscarModulo(mid) { for (var i = 0; i < MODULOS.length; i++) if (MODULOS[i].id === mid) return MODULOS[i]; return null; }

  function redibujarCuerpo(mod) { renderCuerpo(mod); }

  function renderCuerpo(mod) {
    var cuerpo = $('mod-' + mod.id).querySelector('[data-cuerpo]');
    limpiar(cuerpo);

    // Gate: si el módulo tiene "¿Cuenta con el documento?" y la respuesta NO es "SI",
    // no se despliegan las demás preguntas.
    var gateCerrado = false;
    if (mod.gate) {
      gateCerrado = (getBase(mod.id, mod.gate) !== 'SI');
    }

    (mod.campos || []).forEach(function (campo) {
      if (gateCerrado && campo.id !== mod.gate) return;   // solo se muestra la pregunta del gate
      cuerpo.appendChild(renderCampo(mod, 'base', campo));
    });

    if (gateCerrado) {
      var nota = crear('div', 'preg__ayuda');
      nota.textContent = getBase(mod.id, mod.gate) === 'NO'
        ? 'Respondió NO: no se requieren más preguntas para este documento.'
        : 'Responda la pregunta anterior para continuar.';
      cuerpo.appendChild(nota);
      return;
    }

    // Rama (bifurcación según un campo)
    if (mod.rama) {
      var val = getBase(mod.id, mod.rama.campo);
      var caso = mod.rama.casos[val];
      if (caso) {
        (caso.campos || []).forEach(function (c) { cuerpo.appendChild(renderCampo(mod, 'base', c)); });
        if (caso.repetible) cuerpo.appendChild(renderRepetible(mod, caso.repetible));
      }
    }

    // Repetible directo del módulo
    if (mod.repetible) cuerpo.appendChild(renderRepetible(mod, mod.repetible));
  }

  /* --------------------------------------------- repetibles */
  function renderRepetible(mod, rep) {
    var cont = crear('div');
    var lista = getRep(mod.id, rep.id);
    if (!lista.length && rep.minimo) { for (var k = 0; k < rep.minimo; k++) lista.push({}); }

    var wrap = crear('div', 'repetibles');
    lista.forEach(function (registro, idx) {
      var cuadro = crear('div', 'cuadro');
      var tit = crear('div', 'cuadro__tit');
      var tt = crear('span'); tt.textContent = rep.titulo + ' ' + (idx + 1); tit.appendChild(tt);
      if (lista.length > (rep.minimo || 0)) {
        var bq = crear('button', 'cuadro__borrar'); bq.type = 'button'; bq.textContent = 'Quitar';
        bq.addEventListener('click', function () { lista.splice(idx, 1); onCambio(true, mod); });
        tit.appendChild(bq);
      }
      cuadro.appendChild(tit);
      rep.campos.forEach(function (campo) { cuadro.appendChild(renderCampo(mod, 'rep', campo, rep.id, idx)); });
      wrap.appendChild(cuadro);
    });
    cont.appendChild(wrap);

    var add = crear('button', 'boton boton--agregar'); add.type = 'button'; add.textContent = '+ ' + rep.botonTexto;
    add.style.marginTop = '11px';
    add.addEventListener('click', function () { getRep(mod.id, rep.id).push({}); onCambio(true, mod); });
    cont.appendChild(add);
    return cont;
  }

  /* --------------------------------------------- un campo */
  function leerValor(mod, scope, campo, repId, repIndex) {
    if (scope === 'rep') { var r = getRep(mod.id, repId)[repIndex] || {}; return r[campo.id]; }
    return getBase(mod.id, campo.id);
  }
  function escribirValor(mod, scope, campo, repId, repIndex, valor) {
    if (scope === 'rep') { var r = getRep(mod.id, repId)[repIndex] || (getRep(mod.id, repId)[repIndex] = {}); r[campo.id] = valor; }
    else setBase(mod.id, campo.id, valor);
  }

  function renderCampo(mod, scope, campo, repId, repIndex) {
    if (campo.tipo === 'asistencia') return renderAsistencia(mod, campo);
    if (campo.tipo === 'egreso') return renderEgreso(mod, campo);

    var cont = crear('div', 'preg' + (campo.ancho ? ' preg--ancho' : ''));
    var lab = crear('label', 'preg__label'); lab.textContent = campo.label; cont.appendChild(lab);
    if (campo.ayuda) { var ay = crear('div', 'preg__ayuda'); ay.textContent = campo.ayuda; cont.appendChild(ay); }

    var valor = leerValor(mod, scope, campo, repId, repIndex);
    var control;

    if (campo.tipo === 'multi' || campo.tipo === 'mesesMulti') {
      control = renderMulti(mod, scope, campo, repId, repIndex, valor);
    } else if (campo.tipo === 'texto' || campo.tipo === 'numero') {
      control = crear('input', 'control'); control.type = 'text';
      if (campo.tipo === 'numero') { control.inputMode = 'numeric'; }
      control.value = txt(valor);
      control.addEventListener('input', function () {
        var v = control.value;
        if (campo.tipo === 'numero') { v = v.replace(/[^0-9]/g, ''); if (v !== control.value) control.value = v; }
        escribirValor(mod, scope, campo, repId, repIndex, v); onCambio(false);
      });
    } else if (campo.tipo === 'textarea') {
      control = crear('textarea', 'control'); control.value = txt(valor);
      control.addEventListener('input', function () { escribirValor(mod, scope, campo, repId, repIndex, control.value); onCambio(false); });
    } else if (campo.tipo === 'fecha') {
      control = crear('input', 'control'); control.type = 'date'; control.value = txt(valor);
      limitarFecha(control);
      control.addEventListener('change', function () { escribirValor(mod, scope, campo, repId, repIndex, control.value); onCambio(false); });
    } else { // sino, sinona, select
      control = crear('select', 'control');
      control.appendChild(opcion('', 'Seleccione…'));
      opcionesDe(campo).forEach(function (o) { control.appendChild(opcion(o, o)); });
      control.value = txt(valor);
      control.addEventListener('change', function () {
        escribirValor(mod, scope, campo, repId, repIndex, control.value);
        var estructural = !!((mod.gate && scope === 'base' && campo.id === mod.gate) ||
                             (mod.rama && scope === 'base' && campo.id === mod.rama.campo));
        onCambio(estructural, mod);
      });
    }
    cont.appendChild(control);
    return cont;
  }

  function renderMulti(mod, scope, campo, repId, repIndex, valor) {
    var seleccion = Array.isArray(valor) ? valor.slice() : [];
    var ops = campo.tipo === 'mesesMulti' ? mesesDe(estado.caso.periodo) : opcionesDe(campo);
    var cont = crear('div', 'multi');
    ops.forEach(function (op) {
      var lab = crear('label', 'multi__op' + (seleccion.indexOf(op) >= 0 ? ' sel' : ''));
      var chk = crear('input'); chk.type = 'checkbox'; chk.checked = seleccion.indexOf(op) >= 0;
      var sp = crear('span', 'multi__txt'); sp.textContent = op;
      chk.addEventListener('change', function () {
        var arr = leerValor(mod, scope, campo, repId, repIndex);
        arr = Array.isArray(arr) ? arr.slice() : [];
        var p = arr.indexOf(op);
        if (chk.checked) { if (p < 0) arr.push(op); lab.classList.add('sel'); }
        else { if (p >= 0) arr.splice(p, 1); lab.classList.remove('sel'); }
        escribirValor(mod, scope, campo, repId, repIndex, arr);
        onCambio(false);
      });
      lab.appendChild(chk); lab.appendChild(sp); cont.appendChild(lab);
    });
    return cont;
  }

  /* --------------------------------------------- asistencia */
  function renderAsistencia(mod, campo) {
    var cont = crear('div', 'preg preg--ancho');
    var lab = crear('label', 'preg__label'); lab.textContent = campo.label + ' (' + estado.caso.periodo + ')'; cont.appendChild(lab);

    var meses = mesesDe(estado.caso.periodo);
    var habil = mesesHabilitados(estado.caso);   // { ABBR: true } meses del periodo de duplicidad
    var valor = getBase(mod.id, campo.id); if (!valor || typeof valor !== 'object') { valor = {}; setBase(mod.id, campo.id, valor); }

    // Ayuda: qué meses quedan habilitados según la duplicidad
    var habilitados = meses.filter(function (m) { return habil[m]; });
    var ayuda = crear('div', 'preg__ayuda');
    ayuda.textContent = 'Solo se habilitan los meses del periodo de atención en SDIS: ' + habilitados.join(', ') + '.';
    cont.appendChild(ayuda);

    var box = crear('div', 'asistencia');
    var tabla = crear('table', 'asistencia__tabla');
    var thead = crear('thead'); var trh = crear('tr');
    meses.forEach(function (m) {
      var th = crear('th', habil[m] ? '' : 'mes-off'); th.textContent = m; trh.appendChild(th);
    });
    thead.appendChild(trh); tabla.appendChild(thead);
    var tbody = crear('tbody'); var trb = crear('tr');
    meses.forEach(function (m) {
      var activo = !!habil[m];
      if (!activo) { valor[m] = ''; }   // los meses fuera de la duplicidad no guardan valor
      var td = crear('td', activo ? '' : 'mes-off');
      var inp = crear('input'); inp.type = 'text'; inp.inputMode = 'numeric'; inp.value = txt(valor[m]);
      if (!activo) { inp.disabled = true; inp.title = 'Mes fuera del periodo de atención en SDIS'; }
      else {
        inp.addEventListener('input', function () {
          var v = inp.value.replace(/[^0-9]/g, ''); if (v !== inp.value) inp.value = v;
          valor[m] = v; actualizarTotal(); onCambio(false);
        });
      }
      td.appendChild(inp); trb.appendChild(td);
    });
    tbody.appendChild(trb); tabla.appendChild(tbody); box.appendChild(tabla); cont.appendChild(box);

    var total = crear('div', 'asistencia__total');
    var tl = crear('span'); tl.textContent = 'Total de asistencias:'; total.appendChild(tl);
    var tv = crear('strong'); total.appendChild(tv);
    cont.appendChild(total);

    function actualizarTotal() {
      var s = 0; meses.forEach(function (m) { if (habil[m]) s += parseInt(valor[m], 10) || 0; });
      tv.textContent = s;
    }
    actualizarTotal();
    return cont;
  }

  /* --------------------------------------------- egreso */
  function renderEgreso(mod, campo) {
    var cont = crear('div', 'preg preg--ancho'); cont.dataset.egreso = '1';
    var lab = crear('label', 'preg__label'); lab.textContent = campo.label; cont.appendChild(lab);

    var seleccion = getBase(mod.id, 'soportes'); if (!Array.isArray(seleccion)) { seleccion = []; setBase(mod.id, 'soportes', seleccion); }

    var multi = crear('div', 'multi');
    CONFIG.SOPORTES_EGRESO.forEach(function (op) {
      var l = crear('label', 'multi__op' + (seleccion.indexOf(op) >= 0 ? ' sel' : ''));
      var chk = crear('input'); chk.type = 'checkbox'; chk.checked = seleccion.indexOf(op) >= 0;
      var sp = crear('span', 'multi__txt'); sp.textContent = op;
      chk.addEventListener('change', function () {
        var arr = getBase(mod.id, 'soportes'); arr = Array.isArray(arr) ? arr : [];
        var p = arr.indexOf(op);
        if (chk.checked) { if (p < 0) arr.push(op); } else { if (p >= 0) arr.splice(p, 1); }
        setBase(mod.id, 'soportes', arr);
        onCambio(true, mod); // re-render para mostrar/ocultar sub-cuadros
      });
      l.appendChild(chk); l.appendChild(sp); multi.appendChild(l);
    });
    cont.appendChild(multi);

    // Sub-cuadros por cada soporte seleccionado
    seleccion.forEach(function (sop) { cont.appendChild(renderSoporteEgreso(mod, sop)); });
    return cont;
  }

  function renderSoporteEgreso(mod, sop) {
    var cuadro = crear('div', 'cuadro'); cuadro.style.marginTop = '11px';
    var tit = crear('div', 'cuadro__tit'); var tt = crear('span'); tt.textContent = sop; tit.appendChild(tt); cuadro.appendChild(tit);

    if (sop === 'Carta') {
      cuadro.appendChild(campoFechaSimple(mod, 'egreso_Carta_fecha', 'Fecha del soporte'));
      return cuadro;
    }
    // Los demás: cantidad (solo números) + N fechas
    var etiquetas = {
      'Visita domiciliaria': ['Cantidad de visitas hechas', 'Visita'],
      'Llamadas telefónicas': ['Cantidad de llamadas hechas', 'Llamada'],
      'Novedad': ['Cantidad de novedades hechas', 'Novedad'],
      'Acta de seguimiento': ['Cantidad de actas hechas', 'Acta']
    };
    var cfg = etiquetas[sop] || ['Cantidad', 'Registro'];
    var claveCant = 'egreso_' + sop + '_cantidad';
    var claveFechas = 'egreso_' + sop + '_fechas';

    var pc = crear('div', 'preg');
    var lc = crear('label', 'preg__label'); lc.textContent = cfg[0]; pc.appendChild(lc);
    var inp = crear('input', 'control'); inp.type = 'text'; inp.inputMode = 'numeric';
    inp.value = txt(getBase(mod.id, claveCant));
    inp.addEventListener('input', function () {
      var v = inp.value.replace(/[^0-9]/g, ''); if (v !== inp.value) inp.value = v;
      setBase(mod.id, claveCant, v);
      // ajusta el arreglo de fechas al tamaño
      var n = Math.min(parseInt(v, 10) || 0, 60);
      var fechas = getBase(mod.id, claveFechas); if (!Array.isArray(fechas)) fechas = [];
      while (fechas.length < n) fechas.push('');
      fechas = fechas.slice(0, n);
      setBase(mod.id, claveFechas, fechas);
      onCambio(true, mod);
    });
    pc.appendChild(inp); cuadro.appendChild(pc);

    var fechas = getBase(mod.id, claveFechas); if (!Array.isArray(fechas)) fechas = [];
    fechas.forEach(function (f, i) {
      var p = crear('div', 'preg');
      var l = crear('label', 'preg__label'); l.textContent = cfg[1] + ' ' + (i + 1); p.appendChild(l);
      var d = crear('input', 'control'); d.type = 'date'; d.value = txt(f); limitarFecha(d);
      d.addEventListener('change', function () {
        var arr = getBase(mod.id, claveFechas); arr = Array.isArray(arr) ? arr : [];
        arr[i] = d.value; setBase(mod.id, claveFechas, arr); onCambio(false);
      });
      p.appendChild(d); cuadro.appendChild(p);
    });
    return cuadro;
  }

  function campoFechaSimple(mod, clave, label) {
    var p = crear('div', 'preg');
    var l = crear('label', 'preg__label'); l.textContent = label; p.appendChild(l);
    var d = crear('input', 'control'); d.type = 'date'; d.value = txt(getBase(mod.id, clave)); limitarFecha(d);
    d.addEventListener('change', function () { setBase(mod.id, clave, d.value); onCambio(false); });
    p.appendChild(d); return p;
  }

  /* ====================================================== PROGRESO */
  function moduloTieneDatos(mod) {
    var m = estado.respuestas[mod.id]; if (!m) return false;
    function algo(v) {
      if (v === null || v === undefined || v === '') return false;
      if (Array.isArray(v)) return v.some(algo);
      if (typeof v === 'object') return Object.keys(v).some(function (k) { return algo(v[k]); });
      return true;
    }
    if (m.base && Object.keys(m.base).some(function (k) { return algo(m.base[k]); })) return true;
    if (m.rep && Object.keys(m.rep).some(function (rid) { return (m.rep[rid] || []).some(function (r) { return Object.keys(r).some(function (k) { return algo(r[k]); }); }); })) return true;
    return false;
  }
  function actualizarProgreso() {
    var total = MODULOS.length, con = 0;
    MODULOS.forEach(function (mod) { if (moduloTieneDatos(mod)) con++; });
    $('progresoTexto').innerHTML = '<strong>' + con + ' de ' + total + '</strong> módulos con información';
    $('progresoRelleno').style.width = (con / total * 100) + '%';
    actualizarChips();
  }
  function actualizarChips(activo) {
    var chips = $('modnav').querySelectorAll('.modnav__chip');
    chips.forEach(function (chip) {
      var mid = chip.dataset.mid, mod = buscarModulo(mid);
      chip.classList.toggle('hecho', moduloTieneDatos(mod));
      var card = $('mod-' + mid);
      chip.classList.toggle('activo', activo ? mid === activo : (card && card.classList.contains('abierto')));
      var cardEl = $('mod-' + mid);
      if (cardEl) cardEl.classList.toggle('lleno', moduloTieneDatos(mod));
    });
  }

  /* ====================================================== PRE-GUARDADO */
  var tGuardado = null;
  function guardarBorradorConRetardo() { if (tGuardado) clearTimeout(tGuardado); tGuardado = setTimeout(guardarBorrador, 400); }
  function claveBorrador() { return CLAVE_BORRADOR + estado.seleccion.casoId; }
  function guardarBorrador() {
    var s = estado.seleccion;
    var paquete = {
      categoria: s.categoria, slug: s.slug, jardinCod: s.jardinCod, jardin: s.jardin, jardinCorto: s.jardinCorto,
      casoId: s.casoId, nombre: s.nombre, doc: s.doc, periodo: s.periodo,
      actualizado: hoyTexto(),
      respuestas: estado.respuestas
    };
    try { localStorage.setItem(claveBorrador(), JSON.stringify(paquete)); avisoGuardado(); }
    catch (e) { mensaje('mensajesFormulario', 'alerta', 'No se pudo pre-guardar', 'El navegador no permitió guardar el avance. Evite cerrar antes de enviar.'); }
  }
  function leerBorrador() {
    try {
      var crudo = localStorage.getItem(claveBorrador()); if (!crudo) return null;
      var p = JSON.parse(crudo);
      if (p && p.respuestas) {
        mensaje('mensajesFormulario', 'info', 'Se recuperó su avance', 'Encontramos un pre-guardado del ' + p.actualizado + '. Puede continuar donde quedó.');
        return p.respuestas;
      }
    } catch (e) {}
    return null;
  }
  // Igual que leerBorrador pero sin mostrar mensaje (el llamador decide qué avisar).
  function leerBorradorSilencioso() {
    try {
      var crudo = localStorage.getItem(claveBorrador()); if (!crudo) return null;
      var p = JSON.parse(crudo);
      if (p && p.respuestas) return p.respuestas;
    } catch (e) {}
    return null;
  }
  function borrarBorrador(clave) { try { localStorage.removeItem(clave || claveBorrador()); } catch (e) {} }
  function avisoGuardado() {
    var el = $('avisoGuardado'); el.textContent = 'Pre-guardado ✓'; el.classList.add('visible');
    clearTimeout(avisoGuardado._t); avisoGuardado._t = setTimeout(function () { el.classList.remove('visible'); }, 1600);
  }

  function listarBorradores() {
    var l = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(CLAVE_BORRADOR) === 0) {
          try { var p = JSON.parse(localStorage.getItem(k)); if (p && p.respuestas) { p._clave = k; l.push(p); } } catch (e) {}
        }
      }
    } catch (e) {}
    return l;
  }
  function pintarBorradores() {
    var cont = $('borradores'), caja = $('tarjetaBorradores'); limpiar(cont);
    var l = listarBorradores(); caja.classList.toggle('oculto', l.length === 0);
    l.forEach(function (p) {
      var fila = crear('div', 'borrador');
      var info = crear('div', 'borrador__info');
      var t = crear('div', 'borrador__titulo'); t.textContent = p.nombre + ' · ' + (p.jardinCorto || p.jardin); info.appendChild(t);
      var m = crear('div', 'borrador__meta'); m.textContent = p.categoria + ' · ' + p.actualizado; info.appendChild(m);
      var acc = crear('div', 'borrador__acciones');
      var b1 = crear('button', 'boton boton--secundario boton--pequeno'); b1.type = 'button'; b1.textContent = 'Continuar';
      b1.addEventListener('click', function () { retomarBorrador(p); });
      var b2 = crear('button', 'enlace-borrar'); b2.type = 'button'; b2.textContent = 'Descartar';
      b2.addEventListener('click', function () {
        abrirModal({ titulo: 'Descartar este avance', texto: 'Se borrará el pre-guardado de ' + p.nombre + '.',
          botones: [ { texto: 'Sí, descartar', clase: 'boton--principal', accion: function () { borrarBorrador(p._clave); pintarBorradores(); cerrarModal(); } },
                     { texto: 'Cancelar', clase: 'boton--secundario', accion: cerrarModal } ] });
      });
      acc.appendChild(b1); acc.appendChild(b2); fila.appendChild(info); fila.appendChild(acc); cont.appendChild(fila);
    });
  }
  function retomarBorrador(p) {
    $('selCategoria').value = p.slug; alCambiarCategoria();
    $('selJardin').value = p.jardinCod; alCambiarJardin();
    $('selNino').value = p.casoId;
    validarBusqueda();
    if (!$('btnIniciar').disabled) iniciarDiligenciamiento();
    else if (hdActivo() && !estado.seleccion.aceptoHabeasData) $('bloqueHabeas').scrollIntoView({ behavior: 'smooth', block: 'center' });
    else $('selNino').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ====================================================== SALIR */
  function confirmarSalida() {
    abrirModal({ titulo: 'Volver a la búsqueda',
      texto: 'Su avance queda pre-guardado en este dispositivo. La información sólo llega al servidor cuando presiona ENVIAR.',
      botones: [ { texto: 'Volver a la búsqueda', clase: 'boton--principal', accion: function () { guardarBorrador(); cerrarModal(); volverAlInicio(); } },
                 { texto: 'Seguir diligenciando', clase: 'boton--secundario', accion: cerrarModal } ] });
  }
  function volverAlInicio() { limpiarZona('zonaMensajes'); pintarBorradores(); mostrarPantalla('pantallaBusqueda'); validarBusqueda(); }

  /* ====================================================== RESUMEN */
  function etiquetaMod(mid) { var m = buscarModulo(mid); return m ? m.titulo : mid; }

  function resumenValor(v) {
    if (Array.isArray(v)) return v.join(', ');
    if (v && typeof v === 'object') return '';
    return txt(v);
  }

  function construirResumen() {
    var c = estado.caso, s = estado.seleccion;
    var L = [];
    L.push('NIÑA O NIÑO: ' + c.nombre + '  (Doc. ' + c.doc + ')');
    L.push('Unidad operativa: ' + c.jardin);
    L.push('Categoría: ' + s.categoria + '  ·  Periodo: ' + c.periodo);
    L.push('Asociado: ' + c.asociado + '  ·  Localidad ICBF: ' + c.locICBF + '  ·  Localidad SDIS: ' + c.locSDIS);
    L.push('Atención SDIS: ' + (c.iniSDIS || '?') + ' a ' + (c.finSDIS || '?'));
    var dups = (c.duplicidades || []).map(function (d) { return (d.inicio || '?') + ' a ' + (d.fin || '?'); });
    L.push('Periodo(s) de atención en SDIS: ' + (dups.join('  |  ') || '—'));
    L.push('Diligenciado por: ' + estado.auth.nombre + ' (' + estado.auth.usuario + ' · ' + estado.auth.rol + ')');
    L.push('');
    L.push('DOCUMENTOS REVISADOS:');

    MODULOS.forEach(function (mod, i) {
      var m = estado.respuestas[mod.id];
      if (!m || !moduloTieneDatos(mod)) { L.push('• ' + (i + 1) + '. ' + mod.titulo + ': sin información'); return; }
      var partes = [];

      if (mod.id === 'asistencia') {
        var a = (m.base && m.base.asistencia) || {};
        var tot = Object.keys(a).reduce(function (x, k) { return x + (parseInt(a[k], 10) || 0); }, 0);
        partes.push('total asistencias: ' + tot);
      }
      // campos base (no objetos)
      if (m.base) Object.keys(m.base).forEach(function (k) {
        if (k === 'asistencia' || k.indexOf('egreso_') === 0 || k === 'soportes') return;
        var rv = resumenValor(m.base[k]); if (rv) partes.push(k + '=' + rv);
      });
      if (m.base && Array.isArray(m.base.soportes) && m.base.soportes.length) {
        partes.push('soportes: ' + m.base.soportes.join(', '));
      }
      // repetibles
      if (m.rep) Object.keys(m.rep).forEach(function (rid) {
        var arr = m.rep[rid] || []; if (arr.length) partes.push(arr.length + ' registro(s)');
      });

      L.push('• ' + (i + 1) + '. ' + mod.titulo + ': ' + (partes.join('; ') || 'con información'));
    });

    return L.join('\n');
  }

  /* ====================================================== ENVÍO */
  function confirmarEnvio() {
    var con = 0; MODULOS.forEach(function (m) { if (moduloTieneDatos(m)) con++; });
    if (!con) { mensaje('mensajesFormulario', 'error', 'No hay nada para enviar', 'Diligencie al menos un módulo antes de enviar.'); return; }
    abrirModal({ titulo: 'Enviar la información',
      texto: 'Se enviará la revisión de ' + estado.caso.nombre + ' con ' + con + ' de ' + MODULOS.length + ' módulos diligenciados. Podrá completarla después y volver a enviar (se actualiza, no se duplica).',
      botones: [ { texto: 'Sí, enviar ahora', clase: 'boton--enviar', accion: function () { cerrarModal(); enviar(); } },
                 { texto: 'Revisar antes', clase: 'boton--secundario', accion: cerrarModal } ] });
  }

  function enviar() {
    var s = estado.seleccion, c = estado.caso;
    var resumen = construirResumen();
    var paquete = {
      accion: 'guardar',
      token: estado.auth.token,
      idEnvio: idAleatorio(),
      categoria: s.categoria, jardin: c.jardin, jardinCod: s.jardinCod,
      casoId: s.casoId, documento: c.doc, nombre: c.nombre, periodo: c.periodo,
      asociado: c.asociado, locICBF: c.locICBF, locSDIS: c.locSDIS,
      iniSDIS: c.iniSDIS, finSDIS: c.finSDIS,
      duplicidades: c.duplicidades,
      habeasDataAceptado: hdActivo() ? (s.aceptoHabeasData ? 'SI' : 'NO') : 'N/A',
      habeasDataVersion: hdActivo() ? txt(CONFIG.HABEAS_DATA.VERSION) : '',
      habeasDataFecha: s.fechaAceptacionHD || '',
      resumen: resumen,
      respuestas: estado.respuestas
    };

    estado.enviando = true;
    $('btnEnviar').disabled = true; $('btnAtras').disabled = true;
    $('btnEnviar').innerHTML = '<span class="rueda rueda--blanca"></span> Enviando…';
    limpiarZona('mensajesFormulario');

    apiPost(paquete)
      .then(function (resp) {
        if (!resp.ok) {
          if (resp.codigo === 'SESION') { estado.enviando = false; guardarBorrador(); forzarRelogin('Su sesión expiró. Vuelva a ingresar; su avance quedó pre-guardado.'); return; }
          throw new Error(resp.error || 'Error desconocido.');
        }
        exitoEnvio(resp, resumen);
      })
      .catch(function (err) { falloEnvio(err, paquete); });
  }

  function exitoEnvio(resp, resumen) {
    estado.enviando = false;
    $('btnEnviar').textContent = 'ENVIAR INFORMACIÓN'; $('btnEnviar').disabled = false; $('btnAtras').disabled = false;
    borrarBorrador();
    $('finTitulo').textContent = resp.duplicado ? 'Esta revisión ya estaba registrada (se actualizó)' : 'Información enviada correctamente';
    $('finResumen').textContent = resumen;
    pintarBorradores();
    mostrarPantalla('pantallaFin');
  }
  function falloEnvio(err, paquete) {
    estado.enviando = false;
    $('btnEnviar').textContent = 'ENVIAR INFORMACIÓN'; $('btnEnviar').disabled = false; $('btnAtras').disabled = false;
    guardarBorrador();
    var motivo = err && err.name === 'AbortError' ? 'El envío tardó demasiado y se canceló.' : (err && err.message ? err.message : 'Error de conexión.');
    mensaje('mensajesFormulario', 'error', 'No se pudo enviar',
      motivo + ' Su avance quedó pre-guardado en este dispositivo: revise la conexión y presione ENVIAR de nuevo. Si ya había llegado, no se duplica.');
    try { localStorage.setItem('dup:ultimoEnvioFallido', JSON.stringify({ hora: hoyTexto(), motivo: motivo, paquete: paquete })); } catch (e) {}
    window.scrollTo(0, 0);
  }

  /* ====================================================== MENSAJES / MODAL */
  function mensaje(zonaId, tipo, titulo, texto) {
    var zona = $(zonaId); var caja = crear('div', 'mensaje mensaje--' + tipo);
    var t = crear('strong'); t.textContent = titulo; caja.appendChild(t);
    caja.appendChild(document.createTextNode(texto)); zona.appendChild(caja);
  }
  function limpiarZona(zonaId) { limpiar($(zonaId)); }
  function abrirModal(cfg) {
    $('modalTitulo').textContent = cfg.titulo; $('modalTexto').textContent = cfg.texto;
    var acc = $('modalAcciones'); limpiar(acc);
    cfg.botones.forEach(function (b) { var btn = crear('button', 'boton ' + b.clase); btn.type = 'button'; btn.textContent = b.texto; btn.addEventListener('click', b.accion); acc.appendChild(btn); });
    $('capaModal').classList.remove('oculto');
    var p = acc.querySelector('button'); if (p) p.focus();
  }
  function cerrarModal() { $('capaModal').classList.add('oculto'); }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!$('capaPolitica').classList.contains('oculto')) cerrarPolitica(false);
    else if (!$('capaModal').classList.contains('oculto')) cerrarModal();
  });

  window.addEventListener('beforeunload', function (e) {
    if ($('pantallaFormulario').classList.contains('oculto')) return;
    if (Object.keys(estado.respuestas).length && !estado.enviando) { guardarBorrador(); e.preventDefault(); e.returnValue = ''; return ''; }
  });

})();
