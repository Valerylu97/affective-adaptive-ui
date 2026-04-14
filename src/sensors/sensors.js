/**
 * @module sensors
 * @description Semana 1 — Sensing (Bucle de Picard)
 * Captura señales de interacción del usuario:
 *   - Mouse: velocidad instantánea y jitter (distancia P1→P2)
 *   - Teclado: dwell time y flight time
 * Envía datos normalizados al buffer global cada 500ms.
 *
 * Optimizaciones aplicadas (revisión del equipo):
 *   - Acumulador simple para mouse en lugar de array (menos memoria)
 *   - startSensors() / stopSensors() para control de privacidad
 *
 * @author Xavi
 * @version 1.1.0
 */

// ─────────────────────────────── Constantes ─────────────────────────────────

const BUFFER_INTERVAL_MS = 500;

const MAX_VELOCIDAD_PX = 300;
const MAX_JITTER_PX    = 200;
const MAX_DWELL_MS     = 500;
const MAX_FLIGHT_MS    = 2000;

// ─────────────────────────── Acumulador de mouse ────────────────────────────
// Optimización: en lugar de un array que crece con cada mousemove,
// solo guardamos la suma y el conteo para calcular el promedio al final.

let acumVelocidad    = 0;
let acumJitter       = 0;
let conteoMouse      = 0;
let ultimaPosicion   = { x: 0, y: 0, ts: 0 };
let penultimaPosicion = { x: 0, y: 0 };

// ────────────────────────── Estado de teclado ───────────────────────────────

const teclasPresionadas = {};
let tsUltimoKeyup       = 0;

/** Acumulador de muestras de teclado en el intervalo actual */
const muestrasTeclado = [];

// ─────────────────────────────── Buffer global ──────────────────────────────

/**
 * Buffer global — datos normalizados cada 500ms.
 * Valeria consume este array para el paso de Recognizing.
 * @type {TelemetrySample[]}
 */
export const bufferGlobal = [];

// ──────────────────────────── Control de captura ────────────────────────────

let _corriendo  = false;
let _intervalId = null;

/** Handlers guardados para poder removerlos en stopSensors() */
const _handlers = {
  mousemove: _onMouseMove,
  keydown:   _onKeyDown,
  keyup:     _onKeyUp,
};

/**
 * Inicia la captura de telemetría.
 * Registra los listeners y arranca el buffer periódico.
 * Derecho a la desconexión: solo captura cuando está activo.
 */
export function startSensors() {
  if (_corriendo) return;
  _corriendo = true;

  document.addEventListener('mousemove', _handlers.mousemove, { passive: true });
  document.addEventListener('keydown',   _handlers.keydown,   { passive: true });
  document.addEventListener('keyup',     _handlers.keyup,     { passive: true });

  _intervalId = setInterval(_enviarAlBuffer, BUFFER_INTERVAL_MS);

  console.info('[Sensors] Captura iniciada.');
}

/**
 * Detiene la captura de telemetría.
 * Remueve listeners y limpia el intervalo.
 * Derecho a la desconexión: el usuario puede detener la captura en cualquier momento.
 */
export function stopSensors() {
  if (!_corriendo) return;
  _corriendo = false;

  document.removeEventListener('mousemove', _handlers.mousemove);
  document.removeEventListener('keydown',   _handlers.keydown);
  document.removeEventListener('keyup',     _handlers.keyup);

  clearInterval(_intervalId);
  _intervalId = null;

  // Limpia acumuladores al detener
  _resetAcumuladores();

  console.info('[Sensors] Captura detenida.');
}

/** @returns {boolean} true si la captura está activa */
export function isSensing() {
  return _corriendo;
}

// ─────────────────────────────── Handlers ───────────────────────────────────

/** @param {MouseEvent} e */
function _onMouseMove(e) {
  const ahora  = performance.now();
  const actual = { x: e.clientX, y: e.clientY };

  // Velocidad instantánea: distancia / tiempo entre eventos
  const distancia = _distancia(ultimaPosicion, actual);
  const deltaTs   = ahora - ultimaPosicion.ts;
  const velocidad = deltaTs > 0 ? distancia / deltaTs : 0;

  // Jitter: distancia entre penúltima y actual (P1→P2)
  const jitter = _distancia(penultimaPosicion, actual);

  // Acumula en lugar de hacer push a un array
  acumVelocidad += velocidad;
  acumJitter    += jitter;
  conteoMouse   += 1;

  penultimaPosicion = { ...ultimaPosicion };
  ultimaPosicion    = { x: actual.x, y: actual.y, ts: ahora };
}

/** @param {KeyboardEvent} e */
function _onKeyDown(e) {
  const ahora = performance.now();
  if (!teclasPresionadas[e.code]) {
    teclasPresionadas[e.code] = ahora;

    const flightTime = tsUltimoKeyup > 0 ? ahora - tsUltimoKeyup : 0;
    muestrasTeclado.push({ tecla: e.code, tsDown: ahora, flightTime, dwellTime: null });
  }
}

/** @param {KeyboardEvent} e */
function _onKeyUp(e) {
  const ahora  = performance.now();
  tsUltimoKeyup = ahora;

  const tsDown = teclasPresionadas[e.code];
  if (tsDown) {
    const muestra = [...muestrasTeclado]
      .reverse()
      .find(m => m.tecla === e.code && m.dwellTime === null);

    if (muestra) muestra.dwellTime = ahora - tsDown;
    delete teclasPresionadas[e.code];
  }
}

// ────────────────────────── Buffer periódico ────────────────────────────────

function _enviarAlBuffer() {
  const metricas    = _calcularMetricas();
  const normalizado = _normalizar(metricas);

  /** @type {TelemetrySample} */
  const muestra = {
    ts:             performance.now(),
    velocidadMouse: normalizado.velocidadMouse,
    jitter:         normalizado.jitter,
    dwellTime:      normalizado.dwellTime,
    flightTime:     normalizado.flightTime,
    raw:            metricas,
  };

  bufferGlobal.push(muestra);

  console.log('[Aura Telemetría]', {
    'Velocidad mouse (norm)': muestra.velocidadMouse.toFixed(3),
    'Jitter (norm)':          muestra.jitter.toFixed(3),
    'Dwell time (norm)':      muestra.dwellTime.toFixed(3),
    'Flight time (norm)':     muestra.flightTime.toFixed(3),
    'raw (px/ms)':            metricas,
  });

  _resetAcumuladores();
}

// ──────────────────────── Cálculo de métricas ───────────────────────────────

function _calcularMetricas() {
  // Promedio directo desde el acumulador — sin iterar un array
  const velocidadMedia = conteoMouse > 0 ? acumVelocidad / conteoMouse : 0;
  const jitterMedio    = conteoMouse > 0 ? acumJitter    / conteoMouse : 0;

  const muestrasConDwell  = muestrasTeclado.filter(m => m.dwellTime !== null);
  const muestrasConFlight = muestrasTeclado.filter(m => m.flightTime > 0);

  const dwellMedio  = muestrasConDwell.length  > 0
    ? _promedio(muestrasConDwell.map(m => m.dwellTime))  : 0;
  const flightMedio = muestrasConFlight.length > 0
    ? _promedio(muestrasConFlight.map(m => m.flightTime)) : 0;

  return { velocidadMouse: velocidadMedia, jitter: jitterMedio, dwellTime: dwellMedio, flightTime: flightMedio };
}

function _normalizar(metricas) {
  return {
    velocidadMouse: Math.min(metricas.velocidadMouse / MAX_VELOCIDAD_PX, 1),
    jitter:         Math.min(metricas.jitter         / MAX_JITTER_PX,    1),
    dwellTime:      Math.min(metricas.dwellTime      / MAX_DWELL_MS,     1),
    flightTime:     Math.min(metricas.flightTime     / MAX_FLIGHT_MS,    1),
  };
}

function _resetAcumuladores() {
  acumVelocidad        = 0;
  acumJitter           = 0;
  conteoMouse          = 0;
  muestrasTeclado.length = 0;
}

// ──────────────────────────── Utilidades ────────────────────────────────────

function _distancia(p1, p2) {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}

function _promedio(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// ─────────────────────────────── JSDoc Types ────────────────────────────────

/**
 * @typedef {Object} TelemetrySample
 * @property {number} ts              Timestamp de la muestra
 * @property {number} velocidadMouse  Velocidad media normalizada (0-1)
 * @property {number} jitter          Jitter medio normalizado (0-1)
 * @property {number} dwellTime       Dwell time medio normalizado (0-1)
 * @property {number} flightTime      Flight time medio normalizado (0-1)
 * @property {RawMetrics} raw         Valores crudos en px y ms
 */

/**
 * @typedef {Object} RawMetrics
 * @property {number} velocidadMouse  px/ms
 * @property {number} jitter          px
 * @property {number} dwellTime       ms
 * @property {number} flightTime      ms
 */
