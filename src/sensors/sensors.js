/**
 * @module sensors
 * @description Semana 1 — Sensing (Bucle de Picard)
 * Captura señales de interacción del usuario:
 *   - Mouse: velocidad instantánea y jitter (distancia P1→P2)
 *   - Teclado: dwell time y flight time
 * Envía datos normalizados al buffer global cada 500ms.
 *
 * @author Xavi
 * @version 1.0.0
 */

// ─────────────────────────────── Constantes ─────────────────────────────────

/** Intervalo en ms para enviar datos al buffer global */
const BUFFER_INTERVAL_MS = 500;

/** Valores máximos para normalizar entre 0 y 1 */
const MAX_VELOCIDAD_PX  = 300;
const MAX_JITTER_PX     = 200;
const MAX_DWELL_MS      = 500;
const MAX_FLIGHT_MS     = 2000;

// ─────────────────────────────── Estado interno ──────────────────────────────

/** Última posición conocida del mouse */
let ultimaPosicion = { x: 0, y: 0, ts: 0 };

/** Penúltima posición para calcular jitter */
let penultimaPosicion = { x: 0, y: 0 };

/** Acumulador de muestras de mouse en el intervalo actual */
const muestrasMouse = [];

/** Timestamp de cuando se presionó la última tecla (para dwell time) */
const teclasPresionadas = {};

/** Timestamp de cuando se soltó la última tecla (para flight time) */
let tsUltimoKeyup = 0;

/** Acumulador de muestras de teclado en el intervalo actual */
const muestrasTeclado = [];

/**
 * Buffer global — aquí llegan los datos normalizados cada 500ms.
 * Valeria consume este array para el paso de Recognizing.
 * @type {TelemetrySample[]}
 */
export const bufferGlobal = [];

// ─────────────────────────────── Listeners ──────────────────────────────────

/**
 * Captura movimiento de mouse.
 * Calcula velocidad instantánea y jitter en cada evento.
 */
document.addEventListener('mousemove', (e) => {
  const ahora = performance.now();
  const actual = { x: e.clientX, y: e.clientY };

  // Velocidad instantánea: distancia / tiempo entre eventos
  const distancia = calcularDistancia(ultimaPosicion, actual);
  const deltaTs   = ahora - ultimaPosicion.ts;
  const velocidad = deltaTs > 0 ? distancia / deltaTs : 0;

  // Jitter: distancia entre P1 (penúltima) y P2 (actual)
  const jitter = calcularDistancia(penultimaPosicion, actual);

  muestrasMouse.push({ velocidad, jitter, ts: ahora });

  // Actualiza historial de posiciones
  penultimaPosicion = { ...ultimaPosicion };
  ultimaPosicion    = { x: actual.x, y: actual.y, ts: ahora };
}, { passive: true });

/**
 * Captura tecla presionada.
 * Registra el timestamp para calcular dwell time en keyup.
 * Calcula flight time: tiempo desde el último keyup hasta este keydown.
 */
document.addEventListener('keydown', (e) => {
  const ahora = performance.now();

  // Solo registra si la tecla no estaba ya presionada (evita repeat)
  if (!teclasPresionadas[e.code]) {
    teclasPresionadas[e.code] = ahora;

    // Flight time: tiempo entre el último keyup y este keydown
    const flightTime = tsUltimoKeyup > 0 ? ahora - tsUltimoKeyup : 0;

    muestrasTeclado.push({
      tecla:      e.code,
      tsDown:     ahora,
      flightTime,
      dwellTime:  null, // se completa en keyup
    });
  }
}, { passive: true });

/**
 * Captura tecla soltada.
 * Calcula dwell time: tiempo que estuvo presionada la tecla.
 */
document.addEventListener('keyup', (e) => {
  const ahora = performance.now();
  tsUltimoKeyup = ahora;

  const tsDown = teclasPresionadas[e.code];
  if (tsDown) {
    // Completa el dwell time en la última muestra de esa tecla
    const muestra = [...muestrasTeclado]
      .reverse()
      .find(m => m.tecla === e.code && m.dwellTime === null);

    if (muestra) {
      muestra.dwellTime = ahora - tsDown;
    }

    delete teclasPresionadas[e.code];
  }
}, { passive: true });

// ──────────────────────────── Buffer periódico ───────────────────────────────

/**
 * Cada 500ms calcula las métricas promedio del intervalo,
 * normaliza los valores y los empuja al buffer global.
 */
setInterval(() => {
  const metricas = calcularMetricas();
  const normalizado = normalizar(metricas);

  /** @type {TelemetrySample} */
  const muestra = {
    ts:               performance.now(),
    velocidadMouse:   normalizado.velocidadMouse,
    jitter:           normalizado.jitter,
    dwellTime:        normalizado.dwellTime,
    flightTime:       normalizado.flightTime,
    raw:              metricas,
  };

  bufferGlobal.push(muestra);

  // Log en consola para el entregable de S1
  console.log('[Aura Telemetría]', {
    'Velocidad mouse (norm)': muestra.velocidadMouse.toFixed(3),
    'Jitter (norm)':          muestra.jitter.toFixed(3),
    'Dwell time (norm)':      muestra.dwellTime.toFixed(3),
    'Flight time (norm)':     muestra.flightTime.toFixed(3),
    'raw (px/ms)':            metricas,
  });

  // Limpia acumuladores del intervalo
  muestrasMouse.length   = 0;
  muestrasTeclado.length = 0;

}, BUFFER_INTERVAL_MS);

// ─────────────────────────── Cálculo de métricas ────────────────────────────

/**
 * Promedia las muestras acumuladas del intervalo actual.
 * @returns {RawMetrics}
 */
function calcularMetricas() {
  const velocidadMedia = muestrasMouse.length > 0
    ? promedio(muestrasMouse.map(m => m.velocidad))
    : 0;

  const jitterMedio = muestrasMouse.length > 0
    ? promedio(muestrasMouse.map(m => m.jitter))
    : 0;

  const muestrasConDwell = muestrasTeclado.filter(m => m.dwellTime !== null);
  const dwellMedio = muestrasConDwell.length > 0
    ? promedio(muestrasConDwell.map(m => m.dwellTime))
    : 0;

  const muestrasConFlight = muestrasTeclado.filter(m => m.flightTime > 0);
  const flightMedio = muestrasConFlight.length > 0
    ? promedio(muestrasConFlight.map(m => m.flightTime))
    : 0;

  return {
    velocidadMouse: velocidadMedia,
    jitter:         jitterMedio,
    dwellTime:      dwellMedio,
    flightTime:     flightMedio,
  };
}

/**
 * Normaliza las métricas a valores entre 0 y 1.
 * @param {RawMetrics} metricas
 * @returns {RawMetrics}
 */
function normalizar(metricas) {
  return {
    velocidadMouse: Math.min(metricas.velocidadMouse / MAX_VELOCIDAD_PX,  1),
    jitter:         Math.min(metricas.jitter         / MAX_JITTER_PX,     1),
    dwellTime:      Math.min(metricas.dwellTime      / MAX_DWELL_MS,      1),
    flightTime:     Math.min(metricas.flightTime     / MAX_FLIGHT_MS,     1),
  };
}

// ────────────────────────────── Utilidades ──────────────────────────────────

/**
 * Distancia euclidiana entre dos puntos.
 * @param {{x:number, y:number}} p1
 * @param {{x:number, y:number}} p2
 * @returns {number} distancia en px
 */
function calcularDistancia(p1, p2) {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}

/**
 * Promedio de un array de números.
 * @param {number[]} arr
 * @returns {number}
 */
function promedio(arr) {
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
