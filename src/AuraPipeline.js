/**
 * @module AuraPipeline
 * @description Orquestador principal — conecta los 4 pasos del Bucle de Picard:
 *   Sensing → Recognizing → Modeling → Expressing
 *
 * Uso:
 *   import { AuraPipeline } from './AuraPipeline.js';
 *
 *   const aura = new AuraPipeline();
 *   aura.start();
 *   // ... la UI se adapta sola
 *   aura.stop();
 *
 * @author Xavier
 * @version 1.0.0
 */

import { bufferGlobal }  from './sensors/sensors.js';
import { UIAdapter }     from './ui/UIAdapter.js';

/**
 * Intervalo en ms con el que el pipeline evalúa el estado.
 * Con 1500 ms hay suficientes muestras para una señal estable.
 */
const PIPELINE_INTERVAL_MS = 1500;

export class AuraPipeline {
  /**
   * @param {Object} [options]
   * @param {string}   [options.rootSelector]   Pasado a UIAdapter
   * @param {number}   [options.intervalMs]     Frecuencia del loop
   * @param {boolean}  [options.debug]          Loguea métricas en consola
   */
  constructor(options = {}) {
    this._intervalMs = options.intervalMs ?? PIPELINE_INTERVAL_MS;
    this._debug      = options.debug      ?? false;

    // ── Semana 1: Sensing — consume el buffer de sensors.js ─────────────
    this._classifier = null; // José Miguel inyectará su ML aquí

    // ── Semana 2: Expressing ─────────────────────────────────────────────
    this._adapter = new UIAdapter({
      rootSelector: options.rootSelector ?? 'body',
      onStateChange: ({ from, to }) => {
        if (this._debug) {
          console.info(`[Aura] ${from} → ${to}`);
        }
      },
    });

    this._loopId = null;
  }

  // ─────────────────────────────── Lifecycle ──────────────────────────────

  start() {
    this._loopId = setInterval(() => this._tick(), this._intervalMs);
    console.info('[Aura] Pipeline iniciado.');
  }

  stop() {
    clearInterval(this._loopId);
    this._loopId = null;
    this._adapter.reset();
    console.info('[Aura] Pipeline detenido.');
  }

  // ────────────────────────────── Core Loop ───────────────────────────────

  _tick() {
    try {
      // 1. Sensing — lee las últimas muestras del buffer global de sensors.js
      const ultima = bufferGlobal.at(-1);
      if (!ultima) return;

      // 2+3. Recognizing + Modeling — clasificar si hay clasificador inyectado
      if (!this._classifier) return;
      const estado = this._classifier.classify(ultima);

      if (this._debug) {
        console.debug('[Aura tick]', { ultima, estado });
      }

      // 4. Expressing — adaptar la UI
      this._adapter.applyAdaptation(estado);

    } catch (error) {
      // Si el clasificador falla, el pipeline sigue corriendo sin romper la UI
      console.error('[Aura] Error en tick — pipeline continúa:', error);
    }
  }

  // ───────────────────────────── Public Utils ─────────────────────────────

  /** @returns {import('./ui/UIAdapter').EmotionalState} */
  get currentState() {
    return this._adapter.currentState;
  }

  /**
   * Permite que José Miguel inyecte su clasificador ML en S3
   * sin tocar este orquestador.
   * @param {{ classify: Function }} classifier
   */
  setClassifier(classifier) {
    this._classifier = classifier;
  }
}
