/**
 * @module HeuristicClassifier
 * @description Semana 2 — Heurísticas de clasificación 
 * Convierte las métricas brutas del InputSensor en un EmotionalState.
 * Esta es la versión de reglas manuales (S2).
 * @author Xavier
 * @version 1.0.0
 */

/**
 * Umbrales heurísticos.
 * Todos los valores son empíricos y deberán calibrarse en S3
 * una vez que José Miguel tenga el dataset etiquetado.
 */
const THRESHOLDS = {
  mouse: {
    /** px/sample — por encima se considera movimiento errático */
    erraticSpeedHigh:  120,
    /** px/sample — movimiento mínimo en modo concentrado */
    focusedSpeedLow:    5,
  },
  keyboard: {
    /** ms — IKI lento indica distracción o frustración */
    slowIKI:           800,
    /** ms — IKI muy rápido indica concentración activa */
    fastIKI:           180,
    /** ms — desviación estándar alta en IKI → frustración */
    highIKIVariance:   400,
  },
};

export class HeuristicClassifier {
  /**
   * @param {Object} [options]
   * @param {typeof THRESHOLDS} [options.thresholds]  Overrides de umbrales
   */
  constructor(options = {}) {
    this.thresholds = { ...THRESHOLDS, ...options.thresholds };
  }

  // ─────────────────────────────── Public API ─────────────────────────────

  /**
   * Clasifica el estado emocional a partir de los buffers del sensor.
   *
   * @param {import('../sensors/InputSensor').MouseSample[]} mouseSamples
   * @param {import('../sensors/InputSensor').KeySample[]}  keySamples
   * @returns {EmotionalState}
   */
  classify(mouseSamples, keySamples) {
    const mouseMetrics = this._computeMouseMetrics(mouseSamples);
    const keyMetrics   = this._computeKeyMetrics(keySamples);

    return this._applyRules(mouseMetrics, keyMetrics);
  }

  // ──────────────────────────── Metric Computation ────────────────────────

  /**
   * Deriva métricas del buffer de mouse.
   * @param {import('../sensors/InputSensor').MouseSample[]} samples
   * @returns {MouseMetrics}
   */
  _computeMouseMetrics(samples) {
    if (samples.length < 2) {
      return { avgSpeed: 0, maxSpeed: 0, directionChanges: 0 };
    }

    const speeds = samples.map(s => Math.sqrt(s.dx ** 2 + s.dy ** 2));
    const avgSpeed = mean(speeds);
    const maxSpeed = Math.max(...speeds);

    // Cambios de dirección: veces que el eje X o Y invierten signo
    let directionChanges = 0;
    for (let i = 1; i < samples.length; i++) {
      const prev = samples[i - 1];
      const curr = samples[i];
      const xFlip = Math.sign(prev.dx) !== 0 && Math.sign(curr.dx) !== Math.sign(prev.dx);
      const yFlip = Math.sign(prev.dy) !== 0 && Math.sign(curr.dy) !== Math.sign(prev.dy);
      if (xFlip || yFlip) directionChanges++;
    }

    return { avgSpeed, maxSpeed, directionChanges };
  }

  /**
   * Deriva métricas del buffer de teclado (IKI = Inter-Key Interval).
   * @param {import('../sensors/InputSensor').KeySample[]} samples
   * @returns {KeyMetrics}
   */
  _computeKeyMetrics(samples) {
    const ikis = samples.map(s => s.latency).filter(l => l > 0);

    if (ikis.length === 0) {
      return { avgIKI: 0, ikiVariance: 0, keyCount: 0 };
    }

    const avgIKI    = mean(ikis);
    const ikiVariance = stddev(ikis);

    return { avgIKI, ikiVariance, keyCount: samples.length };
  }

  // ────────────────────────────── Rule Engine ─────────────────────────────

  /**
   * Aplica las reglas heurísticas para devolver un EstadoEmocional.
   * Prioridad: frustrado > concentrado > normal
   *
   * @param {MetricasMouse} m
   * @param {MetricasTeclado} k
   * @returns {EstadoEmocional}
   */
  _applyRules(m, k) {
    const { mouse, keyboard } = this.thresholds;

    // ── Reglas de FRUSTRACIÓN ───────────────────────────────────────────
    // R1: movimientos de mouse muy erráticos
    const erraticMouse = m.avgSpeed > mouse.erraticSpeedHigh;

    // R2: alta varianza en el ritmo de tecleo (inestabilidad)
    const unstableTyping = k.ikiVariance > keyboard.highIKIVariance;

    // R3: IKI lento + movimiento errático (frustración por bloqueo)
    const blockedAndErratic = k.avgIKI > keyboard.slowIKI && m.directionChanges > 5;

    if (erraticMouse || unstableTyping || blockedAndErratic) {
      return 'frustrated';
    }

    // ── Reglas de CONCENTRACIÓN ─────────────────────────────────────────
    // R4: mouse quieto + tipeo rápido y estable
    const quietMouse  = m.avgSpeed < mouse.focusedSpeedLow;
    const fastTyping  = k.avgIKI > 0 && k.avgIKI < keyboard.fastIKI;
    const stableIKI   = k.ikiVariance < keyboard.highIKIVariance / 2;

    if (quietMouse && fastTyping && stableIKI && k.keyCount > 3) {
      return 'focused';
    }

    return 'normal';
  }
}

// ────────────────────────────── Math helpers ────────────────────────────────

/** @param {number[]} arr @returns {number} */
function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/** @param {number[]} arr @returns {number} */
function stddev(arr) {
  const m = mean(arr);
  return Math.sqrt(mean(arr.map(x => (x - m) ** 2)));
}

// ─────────────────────────────── JSDoc Types ────────────────────────────────

/**
 * @typedef {'normal' | 'focused' | 'frustrated'} EmotionalState
 */

/**
 * @typedef {Object} MouseMetrics
 * @property {number} avgSpeed         Velocidad media del mouse (px/sample)
 * @property {number} maxSpeed         Velocidad máxima
 * @property {number} directionChanges Número de cambios bruscos de dirección
 */

/**
 * @typedef {Object} KeyMetrics
 * @property {number} avgIKI      Inter-Key Interval promedio (ms)
 * @property {number} ikiVariance Desviación estándar de IKI
 * @property {number} keyCount    Teclas en el buffer actual
 */
