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

import { InputSensor }         from './sensors/InputSensor.js';
import { HeuristicClassifier } from './sensors/HeuristicClassifier.js';
import { UIAdapter }           from './ui/UIAdapter.js';

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

    // ── Semana 1: Sensing ───────────────────────────────────────────────
    this._sensor = new InputSensor({
      sampleRate: 100,
      bufferSize: 50,
    });

    // ── Semana 2: Recognizing + Modeling ────────────────────────────────
    this._classifier = new HeuristicClassifier();

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
    this._sensor.start();
    this._loopId = setInterval(() => this._tick(), this._intervalMs);
    console.info('[Aura] Pipeline iniciado.');
  }

  stop() {
    this._sensor.stop();
    clearInterval(this._loopId);
    this._loopId = null;
    this._adapter.reset();
    console.info('[Aura] Pipeline detenido.');
  }

  // ────────────────────────────── Core Loop ───────────────────────────────

  _tick() {
    // 1. Sensing — obtener muestras acumuladas
    const mouseSamples = this._sensor.flushMouseBuffer();
    const keySamples   = this._sensor.flushKeyBuffer();

    // 2+3. Recognizing + Modeling — clasificar estado
    const state = this._classifier.classify(mouseSamples, keySamples);

    if (this._debug) {
      console.debug('[Aura tick]', {
        mouseSamples: mouseSamples.length,
        keySamples:   keySamples.length,
        state,
      });
    }

    // 4. Expressing — adaptar la UI
    this._adapter.applyState(state);
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
