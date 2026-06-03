/**
 * agenda-api.js
 * -------------
 * Módulo de integración con Google Apps Script (backend).
 * Reemplaza el uso de localStorage para persistencia de citas.
 *
 * Funciones exportadas:
 * cargarProgramacion(semana)
 * guardarProgramacion(registro)
 * actualizarProgramacion(registro)
 * eliminarProgramacion(semana, hora, dia)
 * sincronizarTodo(semana, agendaData)
 */

// ─── CONFIGURACIÓN DE LA API (Enlace de tu Web App de Google) ─────────────────
const API_URL = 'https://script.google.com/macros/s/AKfycbyax_wujgoNd-fBNmCouQJyhTgHoKLAk7hm17RG6dRWnq2oQxCm64Nnt1or2TIHcjik/exec';

// ─── Utilidades de notificación ───────────────────────────────────────────────

/**
 * Muestra un toast flotante en la parte superior de la pantalla.
 * @param {string} mensaje  Texto a mostrar.
 * @param {'success'|'error'|'warning'|'info'} tipo
 */
function mostrarToast(mensaje, tipo = 'info') {
    // Reutilizar showAlert si ya existe (definida en script.js), si no, fallback propio.
    if (typeof showAlert === 'function') {
        showAlert(mensaje, tipo);
        return;
    }

    let toast = document.getElementById('agendaApiToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'agendaApiToast';
        toast.style.cssText = `
            position: fixed; top: 24px; right: 24px; z-index: 9999;
            min-width: 260px; max-width: 380px;
            padding: 14px 20px; border-radius: 10px;
            font-family: inherit; font-size: 0.9rem; font-weight: 600;
            box-shadow: 0 8px 24px rgba(0,0,0,0.18);
            transition: opacity 0.35s ease, transform 0.35s ease;
            opacity: 0; transform: translateY(-10px);
        `;
        document.body.appendChild(toast);
    }

    const colores = {
        success: { bg: '#f0fff4', border: '#38a169', text: '#276749' },
        error:   { bg: '#fff5f5', border: '#e53e3e', text: '#742a2a' },
        warning: { bg: '#fffbeb', border: '#d97706', text: '#78350f' },
        info:    { bg: '#ebf8ff', border: '#3182ce', text: '#1e4e8c' },
    };
    const c = colores[tipo] || colores.info;
    const iconos = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

    toast.style.background    = c.bg;
    toast.style.border        = `1.5px solid ${c.border}`;
    toast.style.color         = c.text;
    toast.textContent         = `${iconos[tipo] || ''} ${mensaje}`;
    toast.style.opacity       = '1';
    toast.style.transform     = 'translateY(0)';

    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.style.opacity   = '0';
        toast.style.transform = 'translateY(-10px)';
    }, 3800);
}

// ─── Caché local de emergencia (offline fallback) ─────────────────────────────

const CACHE_PREFIX = 'agenda_cache_';

function guardarCache(semana, datos) {
    try {
        localStorage.setItem(CACHE_PREFIX + semana, JSON.stringify(datos));
    } catch (_) { /* ignorar si localStorage no está disponible */ }
}

function leerCache(semana) {
    try {
        const raw = localStorage.getItem(CACHE_PREFIX + semana);
        return raw ? JSON.parse(raw) : null;
    } catch (_) {
        return null;
    }
}

// ─── Función auxiliar: ¿la API está configurada? ─────────────────────────────

function apiConfigurada() {
    return typeof API_URL !== 'undefined' &&
           API_URL !== '' &&
           API_URL !== 'URL_DEL_GOOGLE_APPS_SCRIPT';
}

// ─── Generador de ID único ────────────────────────────────────────────────────

function generarId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

// ─── 1. CARGAR PROGRAMACIÓN (GET) ─────────────────────────────────────────────

/**
 * Obtiene todos los registros de una semana desde el backend.
 * Devuelve un objeto `agendaData` con claves `"hora-dia"`.
 * En caso de error usa el caché local como fallback.
 *
 * @param {string} semana  Fecha del lunes en formato YYYY-MM-DD.
 * @returns {Promise<Object>} agendaData poblado.
 */
async function cargarProgramacion(semana) {
    if (!apiConfigurada()) {
        const cache = leerCache(semana);
        if (cache) return cache;
        return {};
    }

    try {
        const url = `${API_URL}?accion=obtener&semana=${encodeURIComponent(semana)}`;
        const resp = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        const json = await resp.json();
        if (!json.ok) throw new Error(json.error || 'Respuesta inválida del servidor');

        const agendaData = {};
        (json.registros || []).forEach(reg => {
            const key = `${reg.hora}-${reg.dia}`;
            agendaData[key] = {
                id: reg.id,
                clasificacion: reg.clasificacion,
                empleado: reg.clasificacion !== 'blocked' ? {
                    nombre: reg.nombre || '',
                    ibm:    reg.ibm    || '',
                    depto:  reg.area   || ''
                } : null,
                observaciones: reg.observaciones || ''
            };
        });

        guardarCache(semana, agendaData);
        return agendaData;

    } catch (err) {
        console.error('[agenda-api] cargarProgramacion error:', err);
        mostrarToast('⚠️ No se pudo conectar al servidor. Usando datos locales.', 'warning');

        const cache = leerCache(semana);
        return cache || {};
    }
}

// ─── 2. GUARDAR PROGRAMACIÓN (POST) ───────────────────────────────────────────

/**
 * Crea un nuevo registro en el backend.
 * Si ya existe uno con la misma semana+dia+hora, lo actualiza (upsert).
 *
 * @param {Object} registro  { semana, dia, hora, clasificacion, nombre, ibm, area, observaciones, id? }
 * @returns {Promise<Object>} El registro guardado con su id.
 */
async function guardarProgramacion(registro) {
    if (!apiConfigurada()) {
        mostrarToast('Horario agendado (solo local — configura la API para sincronizar).', 'info');
        return registro;
    }

    try {
        const payload = {
            accion: 'crear',
            id:             registro.id || generarId(),
            semana:         registro.semana,
            dia:            String(registro.dia),
            hora:           registro.hora,
            clasificacion:  registro.clasificacion,
            nombre:         registro.nombre         || '',
            ibm:            registro.ibm            || '',
            area:           registro.area           || '',
            observaciones:  registro.observaciones  || '',
            creado_en:      new Date().toISOString(),
            actualizado_en: new Date().toISOString()
        };

        const resp = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        if (!json.ok) throw new Error(json.error || 'Error al guardar');

        mostrarToast('Registro guardado correctamente.', 'success');
        return { ...registro, id: json.id || payload.id };

    } catch (err) {
        console.error('[agenda-api] guardarProgramacion error:', err);
        mostrarToast('Error de sincronización. El cambio se guardó localmente.', 'error');
        return registro;
    }
}

// ─── 3. ACTUALIZAR PROGRAMACIÓN (PUT) ─────────────────────────────────────────

/**
 * Actualiza un registro existente en el backend.
 *
 * @param {Object} registro  { id, semana, dia, hora, clasificacion, nombre, ibm, area, observaciones }
 * @returns {Promise<Object>} El registro actualizado.
 */
async function actualizarProgramacion(registro) {
    if (!apiConfigurada()) {
        mostrarToast('Horario actualizado (solo local — configura la API para sincronizar).', 'info');
        return registro;
    }

    try {
        const payload = {
            accion:         'actualizar',
            id:             registro.id,
            semana:         registro.semana,
            dia:            String(registro.dia),
            hora:           registro.hora,
            clasificacion:  registro.clasificacion,
            nombre:         registro.nombre        || '',
            ibm:            registro.ibm           || '',
            area:           registro.area          || '',
            observaciones:  registro.observaciones || '',
            actualizado_en: new Date().toISOString()
        };

        const resp = await fetch(API_URL, {
            method: 'POST', // Apps Script solo acepta GET/POST
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        if (!json.ok) throw new Error(json.error || 'Error al actualizar');

        mostrarToast('Registro actualizado.', 'success');
        return registro;

    } catch (err) {
        console.error('[agenda-api] actualizarProgramacion error:', err);
        mostrarToast('Error de sincronización al actualizar. Cambio guardado localmente.', 'error');
        return registro;
    }
}

// ─── 4. ELIMINAR PROGRAMACIÓN (DELETE vía POST) ───────────────────────────────

/**
 * Elimina un registro del backend por semana + dia + hora.
 *
 * @param {string} semana  Fecha lunes YYYY-MM-DD.
 * @param {string} hora    Ej. "9:00".
 * @param {string|number} dia  1–5.
 * @returns {Promise<boolean>} true si se eliminó correctamente.
 */
async function eliminarProgramacion(semana, hora, dia) {
    if (!apiConfigurada()) {
        mostrarToast('Registro eliminado (solo local — configura la API para sincronizar).', 'info');
        return true;
    }

    try {
        const payload = {
            accion: 'eliminar',
            semana: semana,
            dia:    String(dia),
            hora:   hora
        };

        const resp = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        if (!json.ok) throw new Error(json.error || 'Error al eliminar');

        mostrarToast('Registro eliminado.', 'success');
        return true;

    } catch (err) {
        console.error('[agenda-api] eliminarProgramacion error:', err);
        mostrarToast('Error de sincronización al eliminar. Cambio guardado localmente.', 'error');
        return false;
    }
}

// ─── 5. SINCRONIZAR TODO (llamada al generar PDF) ─────────────────────────────

/**
 * Sincroniza el estado actual del agendaData al backend.
 * Se usa antes de generar PDF para garantizar que todo esté guardado.
 *
 * @param {string} semana      Fecha lunes YYYY-MM-DD.
 * @param {Object} agendaData  Objeto completo de la semana actual.
 * @returns {Promise<void>}
 */
async function sincronizarTodo(semana, agendaData) {
    if (!apiConfigurada()) {
        mostrarToast('PDF generado. (Configura la API para persistencia en la nube)', 'info');
        return;
    }

    mostrarToast('Sincronizando con el servidor…', 'info');

    try {
        const registros = [];

        for (const key in agendaData) {
            const [hora, dia] = key.split('-');
            const slot = agendaData[key];
            if (!slot || slot.clasificacion === 'unassigned') continue;

            registros.push({
                id:             slot.id || generarId(),
                semana:         semana,
                dia:            String(dia),
                hora:           hora,
                clasificacion:  slot.clasificacion,
                nombre:         slot.empleado ? (slot.empleado.nombre || '') : '',
                ibm:            slot.empleado ? (slot.empleado.ibm    || '') : '',
                area:           slot.empleado ? (slot.empleado.depto  || '') : '',
                observaciones:  slot.observaciones || '',
                actualizado_en: new Date().toISOString()
            });
        }

        const payload = {
            accion:    'sincronizar',
            semana:    semana,
            registros: registros
        };

        const resp = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        if (!json.ok) throw new Error(json.error || 'Error en sincronización');

        guardarCache(semana, agendaData);
        mostrarToast('Información almacenada correctamente.', 'success');

    } catch (err) {
        console.error('[agenda-api] sincronizarTodo error:', err);
        mostrarToast('Error de sincronización. El PDF se generará de todas formas.', 'error');
    }
}
