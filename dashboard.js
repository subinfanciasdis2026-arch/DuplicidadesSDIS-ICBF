/* ============================================================================
   TABLERO DE CONTROL  ·  Revisión de Duplicidad SDIS-ICBF
   ----------------------------------------------------------------------------
   Visible SOLO para el rol "administrador". Resumen de respuestas con filtros
   por convenio, caja de compensación / operador, jardín y periodo, más un
   "filtro por respuesta" (módulo → pregunta → valor). Muestra, por cada módulo,
   cuántos casos tenían el documento (SI), cuántos no (NO) y cuántos sin diligenciar.

   Es autocontenido: solo hay que incluirlo en index.html DESPUÉS de app.js:
     <script src="dashboard.js"></script>
   Lee la sesión de sessionStorage ('dup:sesion') y usa CONFIG y MODULOS (globales).
   ==========================================================================*/
(function () {
  'use strict';

  var URL_API = (window.CONFIG && CONFIG.URL_APPS_SCRIPT) || '';
  var MODULOS = window.MODULOS || [];
  var CLAVE_SESION = 'dup:sesion';

  // Orden y títulos de respaldo por si MODULOS no estuviera disponible.
  var MODS = [
    ['asistencia', 'Listados de asistencia'],
    ['formalizacion', 'Formalización de Cupo'],
    ['sirbe', 'Ficha SIRBE'],
    ['novedades', 'Novedades'],
    ['observador', 'Observador'],
    ['informe', 'Informe pedagógico'],
    ['paqueteLiberada', 'Paquete — Jornada Liberada'],
    ['paquetePedagogica', 'Paquete — Jornada Pedagógica'],
    ['egreso', 'Egreso']
  ];

  var estado = { datos: null, cargando: false, abierto: false };

  /* ----------------------------------------------------- utilidades */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function crear(tag, clase, texto) { var e = document.createElement(tag); if (clase) e.className = clase; if (texto != null) e.textContent = texto; return e; }
  function limpiar(el) { while (el && el.firstChild) el.removeChild(el.firstChild); }
  function txt(v) { return v === null || v === undefined ? '' : String(v); }

  // Agrupación "asociado + año": primer token de la categoría + periodo.
  // Ej: "COFINANCIADO 2025" -> "Cofinanciados 2025"; "CAFAM 5587-2025" -> "Cafam 2025".
  function grupoConvenio(r) {
    var cat = txt(r.categoria).trim();
    var tipo = (cat.split(/\s+/)[0] || '').toUpperCase();
    var map = { COFINANCIADO: 'Cofinanciados', COMPENSAR: 'Compensar', COLSUBSIDIO: 'Colsubsidio', CAFAM: 'Cafam' };
    var lbl = map[tipo] || (tipo ? tipo.charAt(0) + tipo.slice(1).toLowerCase() : 'Sin categoría');
    var anio = txt(r.periodo).trim();
    return (lbl + (anio ? ' ' + anio : '')).trim();
  }

  function sesion() { try { return JSON.parse(sessionStorage.getItem(CLAVE_SESION) || 'null'); } catch (e) { return null; } }
  function esAdmin() { var s = sesion(); return !!(s && s.token && String(s.rol || '').toLowerCase() === 'administrador'); }

  function modTitulo(id) {
    for (var i = 0; i < MODULOS.length; i++) if (MODULOS[i].id === id) return MODULOS[i].titulo;
    for (var j = 0; j < MODS.length; j++) if (MODS[j][0] === id) return MODS[j][1];
    return id;
  }
  // Campos de base filtrables de un módulo (incluye los de las ramas SI/NO).
  function camposFiltrables(id) {
    var mod = null;
    for (var i = 0; i < MODULOS.length; i++) if (MODULOS[i].id === id) { mod = MODULOS[i]; break; }
    var res = [], vistos = {};
    function agregar(c) {
      if (!c || vistos[c.id]) return;
      if (['sino', 'sinona', 'select', 'multi'].indexOf(c.tipo) < 0) return;
      vistos[c.id] = true; res.push({ id: c.id, label: c.label || c.id, tipo: c.tipo });
    }
    if (mod) {
      (mod.campos || []).forEach(agregar);
      if (mod.rama && mod.rama.casos) {
        Object.keys(mod.rama.casos).forEach(function (k) { (mod.rama.casos[k].campos || []).forEach(agregar); });
      }
    }
    // Siempre permitir filtrar por el "gate" (cuenta) aunque no esté arriba.
    if (!vistos['cuenta']) res.unshift({ id: 'cuenta', label: '¿Cuenta con el documento?', tipo: 'sino' });
    return res;
  }

  /* ----------------------------------------------------- estilos */
  function inyectarEstilos() {
    if ($('#tbl-estilos')) return;
    var css =
      '#tbl-boton{display:none;align-items:center;gap:6px;background:#F7C600;color:#0E2A5C;border:none;border-radius:999px;' +
      'font-weight:800;font-size:13px;padding:8px 14px;cursor:pointer;margin-right:10px;white-space:nowrap}' +
      '#tbl-boton:hover{filter:brightness(.96)}' +
      '.tbl-capa{position:fixed;inset:0;background:#eef1f6;z-index:9999;overflow:auto;-webkit-overflow-scrolling:touch}' +
      '.tbl-top{position:sticky;top:0;z-index:2;background:#0E2A5C;color:#fff;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px}' +
      '.tbl-top h2{margin:0;font-size:17px;font-weight:800}' +
      '.tbl-top .tbl-sub{font-size:12px;opacity:.8;font-weight:500}' +
      '.tbl-acc{display:flex;gap:8px;align-items:center}' +
      '.tbl-btn{background:#1b3e7a;color:#fff;border:none;border-radius:8px;padding:8px 12px;font-weight:700;font-size:13px;cursor:pointer}' +
      '.tbl-btn:hover{background:#274d8f}.tbl-btn--cerrar{background:#F7C600;color:#0E2A5C}' +
      '.tbl-wrap{max-width:1100px;margin:0 auto;padding:16px}' +
      '.tbl-card{background:#fff;border:1px solid #e2e6ee;border-radius:12px;padding:14px 16px;margin-bottom:14px;box-shadow:0 1px 2px rgba(16,42,92,.04)}' +
      '.tbl-card h3{margin:0 0 10px;font-size:14px;color:#0E2A5C;font-weight:800}' +
      '.tbl-filtros{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}' +
      '.tbl-f label{display:block;font-size:12px;font-weight:700;color:#44506a;margin-bottom:4px}' +
      '.tbl-f select{width:100%;padding:9px 10px;border:1px solid #cdd4e2;border-radius:8px;font-size:13px;background:#fff;color:#1a2440}' +
      '.tbl-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:14px}' +
      '.tbl-kpi{background:#0E2A5C;color:#fff;border-radius:12px;padding:14px 16px}' +
      '.tbl-kpi b{display:block;font-size:26px;line-height:1.1}.tbl-kpi span{font-size:12px;opacity:.85}' +
      '.tbl-kpi--alt{background:#1b3e7a}' +
      'table.tbl-tabla{width:100%;border-collapse:collapse;font-size:13px}' +
      '.tbl-tabla th,.tbl-tabla td{padding:9px 10px;text-align:left;border-bottom:1px solid #eef1f6}' +
      '.tbl-tabla th{color:#44506a;font-size:11px;text-transform:uppercase;letter-spacing:.03em}' +
      '.tbl-tabla td.num,.tbl-tabla th.num{text-align:right;font-variant-numeric:tabular-nums}' +
      '.tbl-tabla tbody tr:hover{background:#f7f9fc}' +
      '.tbl-mod{font-weight:700;color:#1a2440}' +
      '.tbl-si{color:#167a3c;font-weight:800}.tbl-no{color:#b4232a;font-weight:800}.tbl-sd{color:#8a93a6}' +
      '.tbl-bar{height:8px;border-radius:999px;background:#eef1f6;overflow:hidden;min-width:90px}' +
      '.tbl-bar i{display:block;height:100%;background:#167a3c}' +
      '.tbl-resp{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;align-items:end}' +
      '.tbl-dist td.v{font-weight:700;color:#1a2440}.tbl-dist .tbl-bar i{background:#1b3e7a}' +
      '.tbl-cargando{padding:40px;text-align:center;color:#44506a}' +
      '.tbl-aviso{padding:10px 12px;border-radius:8px;background:#fff4d6;color:#7a5b00;font-size:13px}' +
      '@media(max-width:640px){.tbl-wrap{padding:12px}.tbl-top h2{font-size:15px}}';
    var s = crear('style'); s.id = 'tbl-estilos'; s.textContent = css; document.head.appendChild(s);
  }

  /* ----------------------------------------------------- botón admin */
  function asegurarBoton() {
    inyectarEstilos();
    var btn = $('#tbl-boton');
    if (!btn) {
      btn = crear('button', null, '📊 Tablero'); btn.id = 'tbl-boton'; btn.type = 'button';
      btn.addEventListener('click', abrir);
      var fila = $('.barra-superior__fila');
      var ses = $('#sesion');
      if (fila && ses) fila.insertBefore(btn, ses);
      else if (fila) fila.appendChild(btn);
      else document.body.appendChild(btn);
    }
    btn.style.display = esAdmin() ? 'inline-flex' : 'none';
  }

  /* ----------------------------------------------------- carga de datos */
  function cargar(cb) {
    var s = sesion();
    if (!s || !s.token) { cb({ ok: false, error: 'Sesión no iniciada.' }); return; }
    fetch(URL_API, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ accion: 'tablero', token: s.token }), redirect: 'follow'
    }).then(function (r) { return r.text(); })
      .then(function (t) { var j; try { j = JSON.parse(t); } catch (e) { j = { ok: false, error: 'Respuesta inesperada del servidor.' }; } cb(j); })
      .catch(function (e) { cb({ ok: false, error: 'Error de conexión: ' + (e && e.message ? e.message : e) }); });
  }

  /* ----------------------------------------------------- panel */
  function abrir() {
    if (!esAdmin()) { alert('Esta sección es solo para el rol administrador.'); return; }
    if (estado.abierto) return;
    estado.abierto = true;
    var capa = crear('div', 'tbl-capa'); capa.id = 'tbl-capa';

    var top = crear('div', 'tbl-top');
    var tit = crear('div');
    tit.appendChild(crear('h2', null, 'Tablero de control — Revisión de Duplicidad'));
    tit.appendChild(crear('div', 'tbl-sub', 'Resumen de respuestas · SDIS – ICBF'));
    var acc = crear('div', 'tbl-acc');
    var bAct = crear('button', 'tbl-btn', '↻ Actualizar'); bAct.type = 'button'; bAct.addEventListener('click', function () { estado.datos = null; cargarYrender(); });
    var bCsv = crear('button', 'tbl-btn', '⤓ CSV'); bCsv.type = 'button'; bCsv.id = 'tbl-csv'; bCsv.addEventListener('click', descargarCSV);
    var bX = crear('button', 'tbl-btn tbl-btn--cerrar', '✕ Cerrar'); bX.type = 'button'; bX.addEventListener('click', cerrar);
    acc.appendChild(bAct); acc.appendChild(bCsv); acc.appendChild(bX);
    top.appendChild(tit); top.appendChild(acc);

    var wrap = crear('div', 'tbl-wrap'); wrap.id = 'tbl-wrap';
    wrap.appendChild(crear('div', 'tbl-cargando', 'Cargando datos del tablero…'));

    capa.appendChild(top); capa.appendChild(wrap);
    document.body.appendChild(capa);
    document.body.style.overflow = 'hidden';
    cargarYrender();
  }
  function cerrar() {
    var capa = $('#tbl-capa'); if (capa) capa.parentNode.removeChild(capa);
    document.body.style.overflow = '';
    estado.abierto = false;
  }

  function cargarYrender() {
    var wrap = $('#tbl-wrap'); if (!wrap) return;
    limpiar(wrap); wrap.appendChild(crear('div', 'tbl-cargando', 'Cargando datos del tablero…'));
    if (estado.datos) { construirUI(); return; }
    cargar(function (j) {
      if (!j.ok) {
        limpiar(wrap);
        var a = crear('div', 'tbl-aviso', (j.codigo === 'NO_AUTORIZADO' ? 'No autorizado: ' : 'No se pudo cargar: ') + (j.error || ''));
        wrap.appendChild(a);
        if (j.codigo === 'SESION') a.textContent = 'La sesión expiró. Cierre el tablero, vuelva a ingresar y ábralo de nuevo.';
        return;
      }
      estado.datos = j.registros || [];
      construirUI();
    });
  }

  /* ----------------------------------------------------- construir UI */
  function distintos(arr) { var o = {}, r = []; arr.forEach(function (x) { x = txt(x).trim(); if (x && !o[x]) { o[x] = 1; r.push(x); } }); r.sort(function (a, b) { return a.localeCompare(b, 'es'); }); return r; }

  function opcion(val, lbl) { var o = crear('option'); o.value = val; o.textContent = lbl; return o; }
  function selectFiltro(id, etiqueta, valores, cambio) {
    var cont = crear('div', 'tbl-f');
    cont.appendChild(crear('label', null, etiqueta));
    var sel = crear('select'); sel.id = id;
    sel.appendChild(opcion('', 'Todos (' + valores.length + ')'));
    valores.forEach(function (v) { sel.appendChild(opcion(v, v)); });
    sel.addEventListener('change', cambio);
    cont.appendChild(sel);
    return cont;
  }

  function construirUI() {
    var wrap = $('#tbl-wrap'); limpiar(wrap);
    var regs = estado.datos || [];

    // --- Filtros principales
    var cardF = crear('div', 'tbl-card'); cardF.appendChild(crear('h3', null, 'Filtros'));
    var grid = crear('div', 'tbl-filtros');
    grid.appendChild(selectFiltro('tbl-fConvenio', 'Asociado y año', distintos(regs.map(grupoConvenio)), render));
    grid.appendChild(selectFiltro('tbl-fCaja', 'Caja de compensación / operador', distintos(regs.map(function (r) { return r.caja; })), render));
    grid.appendChild(selectFiltro('tbl-fJardin', 'Jardín infantil (unidad operativa)', distintos(regs.map(function (r) { return r.jardin; })), render));
    grid.appendChild(selectFiltro('tbl-fPeriodo', 'Periodo', distintos(regs.map(function (r) { return r.periodo; })), render));
    cardF.appendChild(grid);
    wrap.appendChild(cardF);

    // --- Filtro por respuesta
    var cardR = crear('div', 'tbl-card'); cardR.appendChild(crear('h3', null, 'Filtro por respuesta'));
    var gridR = crear('div', 'tbl-resp');
    // módulo
    var fm = crear('div', 'tbl-f'); fm.appendChild(crear('label', null, 'Módulo'));
    var selM = crear('select'); selM.id = 'tbl-rMod'; selM.appendChild(opcion('', '—'));
    MODS.forEach(function (m) { selM.appendChild(opcion(m[0], modTitulo(m[0]))); });
    selM.addEventListener('change', function () { llenarPreguntas(); render(); });
    fm.appendChild(selM); gridR.appendChild(fm);
    // pregunta
    var fp = crear('div', 'tbl-f'); fp.appendChild(crear('label', null, 'Pregunta'));
    var selP = crear('select'); selP.id = 'tbl-rPreg'; selP.appendChild(opcion('', '—'));
    selP.addEventListener('change', function () { llenarValores(); render(); });
    fp.appendChild(selP); gridR.appendChild(fp);
    // valor
    var fv = crear('div', 'tbl-f'); fv.appendChild(crear('label', null, 'Valor'));
    var selV = crear('select'); selV.id = 'tbl-rVal'; selV.appendChild(opcion('', 'Todos'));
    selV.addEventListener('change', render);
    fv.appendChild(selV); gridR.appendChild(fv);
    cardR.appendChild(gridR);
    wrap.appendChild(cardR);

    // --- KPIs + resumen (se llenan en render)
    var cardK = crear('div'); cardK.id = 'tbl-kpis-cont'; wrap.appendChild(cardK);
    var cardS = crear('div', 'tbl-card'); cardS.id = 'tbl-resumen';
    cardS.appendChild(crear('h3', null, 'Resumen por módulo (¿tenían el documento?)'));
    cardS.appendChild(crear('div')); wrap.appendChild(cardS);
    var cardD = crear('div', 'tbl-card'); cardD.id = 'tbl-dist'; cardD.style.display = 'none';
    cardD.appendChild(crear('h3', null, 'Distribución de la pregunta seleccionada'));
    cardD.appendChild(crear('div')); wrap.appendChild(cardD);

    render();
  }

  function llenarPreguntas() {
    var selP = $('#tbl-rPreg'), selV = $('#tbl-rVal');
    limpiar(selP); selP.appendChild(opcion('', '—'));
    limpiar(selV); selV.appendChild(opcion('', 'Todos'));
    var mid = $('#tbl-rMod').value; if (!mid) return;
    camposFiltrables(mid).forEach(function (c) { selP.appendChild(opcion(c.id, c.label)); });
  }
  function llenarValores() {
    var selV = $('#tbl-rVal'); limpiar(selV); selV.appendChild(opcion('', 'Todos'));
    var mid = $('#tbl-rMod').value, cid = $('#tbl-rPreg').value; if (!mid || !cid) return;
    var vals = {};
    (estado.datos || []).forEach(function (r) {
      var v = ((r.mod || {})[mid] || {})[cid];
      v = txt(v).trim();
      if (v === '') { vals['(sin dato)'] = 1; return; }
      // multi: separar por "; "
      v.split('; ').forEach(function (p) { p = p.trim(); if (p) vals[p] = 1; });
    });
    Object.keys(vals).sort(function (a, b) { return a.localeCompare(b, 'es'); }).forEach(function (v) { selV.appendChild(opcion(v, v)); });
  }

  /* ----------------------------------------------------- filtrado + conteo */
  function filtrar() {
    var regs = estado.datos || [];
    var fc = val('#tbl-fConvenio'), fj = val('#tbl-fJardin'), fk = val('#tbl-fCaja'), fp = val('#tbl-fPeriodo');
    var rMod = val('#tbl-rMod'), rPreg = val('#tbl-rPreg'), rVal = val('#tbl-rVal');
    return regs.filter(function (r) {
      if (fc && grupoConvenio(r) !== fc) return false;
      if (fj && txt(r.jardin) !== fj) return false;
      if (fk && txt(r.caja) !== fk) return false;
      if (fp && txt(r.periodo) !== fp) return false;
      if (rMod && rPreg && rVal) {
        var v = txt(((r.mod || {})[rMod] || {})[rPreg]).trim();
        if (rVal === '(sin dato)') { if (v !== '') return false; }
        else {
          var partes = v.split('; ').map(function (x) { return x.trim(); });
          if (partes.indexOf(rVal) < 0) return false;
        }
      }
      return true;
    });
  }
  function val(sel) { var e = $(sel); return e ? e.value : ''; }

  function render() {
    if (!estado.datos) return;
    var f = filtrar();
    pintarKPIs(f);
    pintarResumen(f);
    pintarDistribucion(f);
  }

  function pintarKPIs(f) {
    var cont = $('#tbl-kpis-cont'); if (!cont) return; limpiar(cont);
    var box = crear('div', 'tbl-kpis');
    var docs = {}; f.forEach(function (r) { docs[txt(r.doc)] = 1; });
    var k1 = crear('div', 'tbl-kpi'); k1.appendChild(cr('b', String(f.length))); k1.appendChild(cr('span', 'casos en el filtro')); box.appendChild(k1);
    var k2 = crear('div', 'tbl-kpi tbl-kpi--alt'); k2.appendChild(cr('b', String(Object.keys(docs).length))); k2.appendChild(cr('span', 'niñas y niños (documentos)')); box.appendChild(k2);
    var k3 = crear('div', 'tbl-kpi tbl-kpi--alt'); k3.appendChild(cr('b', String((estado.datos || []).length))); k3.appendChild(cr('span', 'casos totales (sin filtro)')); box.appendChild(k3);
    cont.appendChild(box);
  }
  function cr(tag, t) { return crear(tag, null, t); }

  function pintarResumen(f) {
    var card = $('#tbl-resumen'); if (!card) return;
    var cont = card.children[1]; limpiar(cont);
    var tabla = crear('table', 'tbl-tabla');
    var thead = crear('thead'); var trh = crear('tr');
    ['Módulo / documento', 'Con documento (SÍ)', 'Sin documento (NO)', 'Sin diligenciar', '% con documento', ''].forEach(function (h, i) {
      var th = crear('th', i >= 1 && i <= 4 ? 'num' : '', h); if (i === 0 || i === 5) th.className = i === 5 ? '' : ''; trh.appendChild(th);
    });
    thead.appendChild(trh); tabla.appendChild(thead);
    var tbody = crear('tbody');
    MODS.forEach(function (m) {
      var mid = m[0], si = 0, no = 0, sd = 0;
      f.forEach(function (r) {
        var v = txt(((r.mod || {})[mid] || {}).cuenta).trim().toUpperCase();
        if (v === 'SI' || v === 'SÍ') si++; else if (v === 'NO') no++; else sd++;
      });
      var tot = si + no + sd, pct = tot ? Math.round(si / tot * 100) : 0;
      var tr = crear('tr');
      tr.appendChild(td(modTitulo(mid), 'tbl-mod'));
      tr.appendChild(tdNum(si, 'tbl-si'));
      tr.appendChild(tdNum(no, 'tbl-no'));
      tr.appendChild(tdNum(sd, 'tbl-sd'));
      tr.appendChild(tdNum(pct + '%'));
      var tdb = crear('td');
      var bar = crear('div', 'tbl-bar'); var i = crear('i'); i.style.width = pct + '%'; bar.appendChild(i); tdb.appendChild(bar);
      tr.appendChild(tdb);
      tbody.appendChild(tr);
    });
    tabla.appendChild(tbody); cont.appendChild(tabla);
  }
  function td(t, clase) { var c = crear('td', clase || '', t); return c; }
  function tdNum(t, clase) { var c = crear('td', 'num ' + (clase || ''), String(t)); return c; }

  function pintarDistribucion(f) {
    var card = $('#tbl-dist'); if (!card) return;
    var mid = val('#tbl-rMod'), cid = val('#tbl-rPreg');
    if (!mid || !cid) { card.style.display = 'none'; return; }
    card.style.display = '';
    card.children[0].textContent = 'Distribución · ' + modTitulo(mid) + ' → ' + preguntaLabel(mid, cid);
    var cont = card.children[1]; limpiar(cont);
    var conteo = {}; var total = 0;
    f.forEach(function (r) {
      var v = txt(((r.mod || {})[mid] || {})[cid]).trim();
      if (v === '') { conteo['(sin dato)'] = (conteo['(sin dato)'] || 0) + 1; total++; return; }
      v.split('; ').forEach(function (p) { p = p.trim(); if (!p) return; conteo[p] = (conteo[p] || 0) + 1; });
      total++;
    });
    var tabla = crear('table', 'tbl-tabla tbl-dist');
    var thead = crear('thead'); var trh = crear('tr');
    ['Respuesta', 'Casos', '% del filtro', ''].forEach(function (h, i) { trh.appendChild(crear('th', i >= 1 && i <= 2 ? 'num' : '', h)); });
    thead.appendChild(trh); tabla.appendChild(thead);
    var tbody = crear('tbody');
    Object.keys(conteo).sort(function (a, b) { return conteo[b] - conteo[a]; }).forEach(function (k) {
      var n = conteo[k], pct = total ? Math.round(n / total * 100) : 0;
      var tr = crear('tr');
      tr.appendChild(td(k, 'v'));
      tr.appendChild(tdNum(n));
      tr.appendChild(tdNum(pct + '%'));
      var tdb = crear('td'); var bar = crear('div', 'tbl-bar'); var ii = crear('i'); ii.style.width = pct + '%'; bar.appendChild(ii); tdb.appendChild(bar); tr.appendChild(tdb);
      tbody.appendChild(tr);
    });
    tabla.appendChild(tbody); cont.appendChild(tabla);
  }
  function preguntaLabel(mid, cid) {
    var cs = camposFiltrables(mid);
    for (var i = 0; i < cs.length; i++) if (cs[i].id === cid) return cs[i].label;
    return cid;
  }

  /* ----------------------------------------------------- CSV */
  function descargarCSV() {
    var f = filtrar();
    var head = ['DOCUMENTO', 'NOMBRE', 'ASOCIADO Y AÑO', 'CAJA/OPERADOR', 'CONVENIO', 'JARDIN', 'PERIODO'];
    MODS.forEach(function (m) { head.push(m[1] + ' (cuenta)'); });
    var filas = [head];
    f.forEach(function (r) {
      var fila = [txt(r.doc), txt(r.nombre), grupoConvenio(r), txt(r.caja), txt(r.convenio), txt(r.jardin), txt(r.periodo)];
      MODS.forEach(function (m) { fila.push(txt(((r.mod || {})[m[0]] || {}).cuenta)); });
      filas.push(fila);
    });
    var csv = filas.map(function (row) {
      return row.map(function (c) { c = txt(c); return /[",\n;]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(',');
    }).join('\r\n');
    var blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    var a = crear('a'); a.href = window.URL.createObjectURL(blob);
    a.download = 'tablero_duplicidad.csv'; document.body.appendChild(a); a.click();
    setTimeout(function () { window.URL.revokeObjectURL(a.href); a.remove(); }, 400);
  }

  /* ----------------------------------------------------- arranque */
  document.addEventListener('DOMContentLoaded', function () {
    asegurarBoton();
    // El login ocurre después; revisamos periódicamente para mostrar/ocultar el botón.
    setInterval(asegurarBoton, 1200);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && estado.abierto) cerrar(); });

})();
