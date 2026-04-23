/**
 * @module sensors
 * @description Versión Corregida para Tesis - Captura de Inestabilidad Motora
 */

const BUFFER_INTERVAL_MS = 500;

// Umbrales basados en benchmarks de usuarios (Ajustados para mayor sensibilidad)
const MAX_VELOCIDAD_PX = 250; 
const MAX_JITTER_PX    = 150; 
const MAX_DWELL_MS     = 400;
const MAX_FLIGHT_MS    = 1500;

let _umbrales = {
  velocidad: MAX_VELOCIDAD_PX,
  jitter:    MAX_JITTER_PX,
  dwell:     MAX_DWELL_MS,
  flight:    MAX_FLIGHT_MS,
};

// ─────────────────────────── Acumuladores ────────────────────────────
let acumVelocidad = 0;
let acumJitter    = 0;
let conteoMouse   = 0;

let ultimaPosicion = { x: 0, y: 0, ts: 0 };
let ultimaDistancia = 0; // Para calcular la variación (jitter)

// Teclado
const teclasPresionadas = {};
let tsUltimoKeyup = 0;
const muestrasTeclado = [];

export const bufferGlobal = [];
let _corriendo = false;
let _intervalId = null;

// ──────────────────────────── Handlers ────────────────────────────

function _onMouseMove(e) {
  const ahora = performance.now();
  const actual = { x: e.clientX, y: e.clientY };

  // 1. Evitar salto inicial desde 0,0
  if (ultimaPosicion.ts === 0) {
    ultimaPosicion = { ...actual, ts: ahora };
    return;
  }

  // 2. Cálculo de Velocidad
  const distancia = Math.sqrt((actual.x - ultimaPosicion.x) ** 2 + (actual.y - ultimaPosicion.y) ** 2);
  const deltaTs = ahora - ultimaPosicion.ts;
  const velocidad = deltaTs > 0 ? distancia / deltaTs : 0;

  // 3. CÁLCULO DE JITTER (Variación de la micro-distancia)
  // El jitter es la diferencia absoluta entre el paso actual y el anterior
  if (conteoMouse > 0) {
    const jitterInstantaneo = Math.abs(distancia - ultimaDistancia);
    acumJitter += jitterInstantaneo;
  }

  acumVelocidad += velocidad;
  conteoMouse += 1;

  // Actualizar estados
  ultimaDistancia = distancia;
  ultimaPosicion = { ...actual, ts: ahora };
}

// ────────────────────────── Registro & Buffer ───────────────────────────────

function _enviarAlBuffer() {
  const metricas = _calcularMetricas();
  const normalizado = _normalizar(metricas);

  const muestra = {
    ts: performance.now(),
    velocidadMouse: normalizado.velocidadMouse,
    jitter: normalizado.jitter,
    dwellTime: normalizado.dwellTime,
    flightTime: normalizado.flightTime,
    raw: metricas,
  };

  bufferGlobal.push(muestra);

  // LOG de depuración para ver que el Jitter ya no es 0
  if (conteoMouse > 0) {
    console.debug(`[Sensor] Jitter Crudo: ${metricas.jitter.toFixed(4)}px`);
  }

  _resetAcumuladores();
}

function _calcularMetricas() {
  return {
    velocidadMouse: conteoMouse > 0 ? acumVelocidad / conteoMouse : 0,
    jitter:         conteoMouse > 1 ? acumJitter / (conteoMouse - 1) : 0,
    dwellTime:      muestrasTeclado.length > 0 ? _promedio(muestrasTeclado.filter(m => m.dwellTime !== null).map(m => m.dwellTime)) : 0,
    flightTime:     muestrasTeclado.length > 0 ? _promedio(muestrasTeclado.filter(m => m.flightTime > 0).map(m => m.flightTime)) : 0
  };
}

// ──────────────────────────── Resto de Funciones ────────────────────────────
// (startSensors, stopSensors, _onKeyDown, _onKeyUp, _normalizar permanecen igual)

export function startSensors() {
  if (_corriendo) return;
  _corriendo = true;
  document.addEventListener('mousemove', _onMouseMove, { passive: true });
  document.addEventListener('keydown', _onKeyDown, { passive: true });
  document.addEventListener('keyup', _onKeyUp, { passive: true });
  _intervalId = setInterval(_enviarAlBuffer, BUFFER_INTERVAL_MS);

  // En sensores.js, dentro de startSensors:
  window.addEventListener('message', (event) => {
      if (event.data.type === 'SENSOR_BRIDGE') {
          const { event: type, data } = event.data;
          
          if (type === 'mousemove') {
              // Simulamos el evento para que _onMouseMove lo procese igual
              _onMouseMove({ clientX: data.clientX, clientY: data.clientY });
          }
          if (type === 'keydown') {
              _onKeyDown({ code: data.code });
          }
          if (type === 'keyup') {
              _onKeyUp({ code: data.code });
          }
      }
  });
}

export function stopSensors() {
  _corriendo = false;
  document.removeEventListener('mousemove', _onMouseMove);
  document.removeEventListener('keydown', _onKeyDown);
  document.removeEventListener('keyup', _onKeyUp);
  clearInterval(_intervalId);
  _resetAcumuladores();
}

function _onKeyDown(e) {
  const ahora = performance.now();
  if (!teclasPresionadas[e.code]) {
    teclasPresionadas[e.code] = ahora;
    const flightTime = tsUltimoKeyup > 0 ? ahora - tsUltimoKeyup : 0;
    muestrasTeclado.push({ tecla: e.code, tsDown: ahora, flightTime, dwellTime: null });
  }
}

function _onKeyUp(e) {
  const ahora = performance.now();
  tsUltimoKeyup = ahora;
  const tsDown = teclasPresionadas[e.code];
  if (tsDown) {
    const muestra = muestrasTeclado.slice().reverse().find(m => m.tecla === e.code && m.dwellTime === null);
    if (muestra) muestra.dwellTime = ahora - tsDown;
    delete teclasPresionadas[e.code];
  }
}

function _normalizar(m) {
  return {
    velocidadMouse: Math.min(m.velocidadMouse / _umbrales.velocidad, 1),
    jitter:         Math.min(m.jitter / _umbrales.jitter, 1),
    dwellTime:      Math.min(m.dwellTime / _umbrales.dwell, 1),
    flightTime:     Math.min(m.flightTime / _umbrales.flight, 1)
  };
}

function _resetAcumuladores() {
  acumVelocidad = 0; acumJitter = 0; conteoMouse = 0; muestrasTeclado.length = 0;
}

function _promedio(arr) {
  return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

export function isSensing() { return _corriendo; }