/**
 * @module ABTesting
 * @description Semana 3 — A/B Testing
 * Valida si el Modo Soporte reduce el tiempo de tarea
 * en usuarios frustrados comparado con el modo normal.
 *
 * Grupo A → usuario completa tarea en modo 'normal'
 * Grupo B → usuario completa tarea en modo 'frustrado' (soporte activo)
 *
 * Uso:
 *   import { ABTesting } from './src/ab-testing.js';
 *   const ab = new ABTesting(adapter);
 *   ab.iniciarTarea();      // cuando el usuario empieza
 *   ab.completarTarea();    // cuando el usuario termina
 *   ab.obtenerResultados(); // para ver el resumen
 *
 * @author Xavi
 * @version 1.0.0
 */

export class ABTesting {
  /**
   * @param {import('./ui/UIAdapter').UIAdapter} adapter
   * Necesita el adapter para saber en qué modo está el usuario
   * cuando completa cada tarea.
   */
  constructor(adapter) {
    this._adapter = adapter;

    /**
     * Timestamp de cuando empezó la tarea actual.
     * @type {number|null}
     */
    this._inicioTarea = null;

    /**
     * Resultados acumulados por grupo.
     * Grupo A = normal, Grupo B = frustrado
     * @type {{ normal: number[], frustrado: number[] }}
     */
    this._tiempos = {
      normal:    [],
      frustrado: [],
    };

    /** Contador de tareas completadas */
    this._totalTareas = 0;
  }

  // ─────────────────────────────── Public API ─────────────────────────────

  /**
   * Marca el inicio de una tarea.
   * Llama esto cuando el usuario empieza a trabajar.
   */
  iniciarTarea() {
    this._inicioTarea = performance.now();
    console.info('[ABTesting] Tarea iniciada.');
  }

  /**
   * Marca el fin de una tarea y registra el tiempo en el grupo correcto.
   * El grupo se determina por el estado actual del adapter.
   * Llama esto cuando el usuario completa la tarea.
   *
   * @returns {TareaResultado|null} resultado de la tarea o null si no había tarea activa
   */
  completarTarea() {
    if (!this._inicioTarea) {
      console.warn('[ABTesting] No hay tarea activa. Llama iniciarTarea() primero.');
      return null;
    }

    const duracion = performance.now() - this._inicioTarea;
    const modo     = this._adapter.estadoActual;

    // Solo registra en los grupos válidos
    if (modo === 'normal' || modo === 'frustrado') {
      this._tiempos[modo].push(duracion);
    }

    this._totalTareas++;
    this._inicioTarea = null;

    /** @type {TareaResultado} */
    const resultado = {
      duracionMs: Math.round(duracion),
      modo,
      tareaNum: this._totalTareas,
    };

    console.info('[ABTesting] Tarea completada:', resultado);
    return resultado;
  }

  /**
   * Devuelve el resumen estadístico de los dos grupos.
   * @returns {Resultados}
   */
  obtenerResultados() {
    const promedioA = this._promedio(this._tiempos.normal);
    const promedioB = this._promedio(this._tiempos.frustrado);

    const diferencia  = promedioA - promedioB;
    const porcentaje  = promedioA > 0
      ? Math.round((diferencia / promedioA) * 100)
      : 0;

    /** @type {Resultados} */
    return {
      grupoA: {
        modo:      'normal',
        tareas:    this._tiempos.normal.length,
        promedioMs: Math.round(promedioA),
        tiempos:   [...this._tiempos.normal.map(t => Math.round(t))],
      },
      grupoB: {
        modo:      'frustrado',
        tareas:    this._tiempos.frustrado.length,
        promedioMs: Math.round(promedioB),
        tiempos:   [...this._tiempos.frustrado.map(t => Math.round(t))],
      },
      conclusion: this._conclusion(diferencia, porcentaje),
      diferenciaMsMs: Math.round(diferencia),
      mejoraPorcentaje: porcentaje,
      totalTareas: this._totalTareas,
    };
  }

  /**
   * Reinicia todos los datos acumulados.
   * Útil para empezar una nueva sesión de pruebas.
   */
  reiniciar() {
    this._tiempos     = { normal: [], frustrado: [] };
    this._inicioTarea = null;
    this._totalTareas = 0;
    console.info('[ABTesting] Datos reiniciados.');
  }

  // ──────────────────────────── Utilidades ────────────────────────────────

  /**
   * Calcula el promedio de un array de números.
   * @param {number[]} arr
   * @returns {number}
   */
  _promedio(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  /**
   * Genera la conclusión basada en los datos.
   * @param {number} diferencia
   * @param {number} porcentaje
   * @returns {string}
   */
  _conclusion(diferencia, porcentaje) {
    const grupoA = this._tiempos.normal.length;
    const grupoB = this._tiempos.frustrado.length;

    if (grupoA === 0 || grupoB === 0) {
      return 'Datos insuficientes — se necesitan tareas en ambos grupos.';
    }

    if (diferencia > 0) {
      return `El Modo Soporte redujo el tiempo de tarea un ${porcentaje}% (${Math.round(diferencia)}ms más rápido).`;
    }

    if (diferencia < 0) {
      return `El Modo Normal fue más rápido un ${Math.abs(porcentaje)}%. Revisar umbrales.`;
    }

    return 'Sin diferencia significativa entre los dos grupos.';
  }
}

// ─────────────────────────────── JSDoc Types ────────────────────────────────

/**
 * @typedef {Object} TareaResultado
 * @property {number} duracionMs  Duración en ms
 * @property {string} modo        Estado del adapter al completar
 * @property {number} tareaNum    Número de tarea completada
 */

/**
 * @typedef {Object} GrupoResultado
 * @property {string}   modo        Nombre del modo
 * @property {number}   tareas      Número de tareas registradas
 * @property {number}   promedioMs  Promedio en ms
 * @property {number[]} tiempos     Lista de tiempos individuales
 */

/**
 * @typedef {Object} Resultados
 * @property {GrupoResultado} grupoA
 * @property {GrupoResultado} grupoB
 * @property {string}         conclusion
 * @property {number}         diferenciaMsMs
 * @property {number}         mejoraPorcentaje
 * @property {number}         totalTareas
 */
