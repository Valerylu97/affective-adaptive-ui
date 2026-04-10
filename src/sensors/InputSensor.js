/**
 * @module InputSensor
 * @description Semana 1 — Sensing (Bucle de Picard)
 * Captura raw events de mouse y teclado y los emite al pipeline.
 * NO realiza clasificación, solo recolecta datos crudos.
 *
 * @author Xavier
 * @version 1.0.0
 */

export class InputSensor {
  /**
   * @param {Object} options
   * @param {number} [options.sampleRate=100]   Intervalo en ms para el tick del mouse
   * @param {number} [options.bufferSize=50]    Máx de eventos a mantener en buffer
   * @param {EventTarget} [options.target=document] Elemento del DOM a escuchar
   */
  constructor(options = {}) {
    this.sampleRate  = options.sampleRate  ?? 100;
    this.bufferSize  = options.bufferSize  ?? 50;
    this.target      = options.target      ?? document;

    /** @type {MouseSample[]} */
    this._mouseBuffer = [];
    /** @type {KeySample[]} */
    this._keyBuffer   = [];

    this._lastMousePos = { x: 0, y: 0 };
    this._lastMouseTs  = 0;
    this._tickId       = null;
    this._running      = false;

    /** Listeners guardados para poder limpiarlos en stop() */
    this._handlers = {
      mousemove: this._onMouseMove.bind(this),
      keydown:   this._onKeyDown.bind(this),
    };
  }

  // ─────────────────────────────── Lifecycle ──────────────────────────────

  /** Inicia la captura de eventos */
  start() {
    if (this._running) return;
    this._running = true;

    this.target.addEventListener('mousemove', this._handlers.mousemove, { passive: true });
    this.target.addEventListener('keydown',   this._handlers.keydown,   { passive: true });

    // Tick periódico para capturar velocidad y aceleración del mouse
    this._tickId = setInterval(() => this._sampleMouse(), this.sampleRate);
  }

  /** Detiene la captura y limpia los listeners */
  stop() {
    if (!this._running) return;
    this._running = false;

    this.target.removeEventListener('mousemove', this._handlers.mousemove);
    this.target.removeEventListener('keydown',   this._handlers.keydown);

    clearInterval(this._tickId);
    this._tickId = null;
  }

  // ─────────────────────────────── Getters ────────────────────────────────

  /**
   * Retorna y vacía el buffer de mouse
   * @returns {MouseSample[]}
   */
  flushMouseBuffer() {
    const data = [...this._mouseBuffer];
    this._mouseBuffer = [];
    return data;
  }

  /**
   * Retorna y vacía el buffer de teclado
   * @returns {KeySample[]}
   */
  flushKeyBuffer() {
    const data = [...this._keyBuffer];
    this._keyBuffer = [];
    return data;
  }

  // ──────────────────────────── Raw Handlers ──────────────────────────────

  /** @param {MouseEvent} e */
  _onMouseMove(e) {
    // Almacenamos la posición más reciente para el tick
    this._lastMousePos = { x: e.clientX, y: e.clientY };
    this._lastMouseTs  = performance.now();
  }

  /**
   * Captura periódica de posición + deriva velocidad
   * Se llama cada this.sampleRate ms
   */
  _sampleMouse() {
    const now = performance.now();
    const { x, y } = this._lastMousePos;

    const prev = this._mouseBuffer.at(-1);

    /** @type {MouseSample} */
    const sample = {
      ts: now,
      x,
      y,
      dx: prev ? x - prev.x : 0,
      dy: prev ? y - prev.y : 0,
    };

    this._pushToBuffer(this._mouseBuffer, sample);
  }

  /** @param {KeyboardEvent} e */
  _onKeyDown(e) {
    const now = performance.now();
    const prev = this._keyBuffer.at(-1);

    /** @type {KeySample} */
    const sample = {
      ts:      now,
      key:     e.key,
      latency: prev ? now - prev.ts : 0,
    };

    this._pushToBuffer(this._keyBuffer, sample);
  }

  // ──────────────────────────────── Utils ─────────────────────────────────

  /**
   * Inserta en buffer respetando bufferSize (FIFO)
   * @param {Array} buffer
   * @param {object} item
   */
  _pushToBuffer(buffer, item) {
    buffer.push(item);
    if (buffer.length > this.bufferSize) {
      buffer.shift();
    }
  }
}

// ─────────────────────────────── JSDoc Types ────────────────────────────────

/**
 * @typedef {Object} MouseSample
 * @property {number} ts   Timestamp (ms, performance.now())
 * @property {number} x    Posición X en el viewport
 * @property {number} y    Posición Y en el viewport
 * @property {number} dx   Delta X respecto al sample anterior
 * @property {number} dy   Delta Y respecto al sample anterior
 */

/**
 * @typedef {Object} KeySample
 * @property {number} ts      Timestamp (ms)
 * @property {string} key     Tecla presionada (e.key)
 * @property {number} latency ms desde la tecla anterior (Inter-Key Interval)
 */
