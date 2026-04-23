/**
 * @module UIAdapter
 * @description Semana 4 — Final Integration (AfectIHM)
 * Controla la metamorfosis de la interfaz y la comunicación con experimentos.
 * * @author Xavi (Modificado para Tesis Aura)
 * @version 4.1.0
 */

const ESTADOS_VALIDOS = ['normal', 'frustrado', 'concentrado'];

const TRANSITION = {
  ocultar: 300,
  mostrar: 400,
  color:   500,
  retraso: 150,
};

export class UIAdapter {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.rootSelector  = options.rootSelector  ?? 'body';
    this.onStateChange = options.onStateChange ?? null;

    this._estadoActual   = 'normal';
    this._transicionando = false;
    this._toastTimeout   = null;

    this._umbralesVisuales = {
      frustrado:     0.40,
      concentrado:   0.65,
      transicion:    TRANSITION.color,
      toastDuracion: 4000,
    };

    this._inyectarEstilos();
    this._crearToast();
  }

  // ─────────────────────────────── Public API ─────────────────────────────

  applyAdaptation(state) {
    if (!ESTADOS_VALIDOS.includes(state)) return;
    if (state === this._estadoActual || this._transicionando) return;

    const anterior = this._estadoActual;
    this._estadoActual   = 'transitioning';
    this._transicionando = true;

    this._transicionEscalonada(state, anterior);
  }

  get estadoActual() {
    return this._estadoActual;
  }

  // ──────────────────────────── Orquestador de Cambio ─────────────────────

  _transicionEscalonada(state, anterior) {
    const root = document.querySelector(this.rootSelector);
    if (!root) return;

    root.classList.add('aura--transitioning');

    setTimeout(() => {
      // 1. Aplicar Clases y Atributos
      ESTADOS_VALIDOS.forEach(s => root.classList.remove(`aura--${s}`));
      root.classList.add(`aura--${state}`);
      root.dataset.auraState = state;

      // 2. Aplicar Variables CSS
      const vars = CSS_VARS[state];
      Object.entries(vars).forEach(([prop, val]) => {
        root.style.setProperty(prop, val);
      });

      // 3. COMUNICACIÓN CON IFRAME (Crítico para la Tarea de Tesis)
      const frame = document.getElementById('experiment-frame');
      if (frame && frame.contentWindow) {
        frame.contentWindow.postMessage({
          type: 'AURA_ADAPTATION_APPLIED',
          state: state
        }, '*');
      }

      // 4. Feedback de Usuario (Toast)
      this._gestionarNotificacion(state);

    }, TRANSITION.retraso);

    setTimeout(() => {
      root.classList.remove('aura--transitioning');
      this._estadoActual   = state;
      this._transicionando = false;

      if (this.onStateChange) {
        this.onStateChange({ from: anterior, to: state });
      }
    }, TRANSITION.retraso + TRANSITION.color);
  }

  _gestionarNotificacion(state) {
    if (state === 'frustrado') {
      this._mostrarToast('Modo soporte activado — Simplificando interfaz.');
    } else if (state === 'concentrado') {
      this._mostrarToast('Modo Zen activo — Minimizando distracciones.');
    } else {
      this._ocultarToast();
    }
  }

  // ──────────────────────────── Componentes UI ────────────────────────────

  _crearToast() {
    if (document.getElementById('aura-toast')) return;
    const toast = document.createElement('div');
    toast.id = 'aura-toast';
    toast.innerHTML = `<span id="aura-toast-mensaje"></span>
                       <button id="aura-toast-cerrar">×</button>`;
    document.body.appendChild(toast);
    document.getElementById('aura-toast-cerrar').onclick = () => this._ocultarToast();
  }

  _mostrarToast(mensaje) {
    const toast = document.getElementById('aura-toast');
    const span = document.getElementById('aura-toast-mensaje');
    if (!toast || !span) return;

    span.textContent = mensaje;
    toast.classList.add('aura-toast--visible');

    if (this._toastTimeout) clearTimeout(this._toastTimeout);
    this._toastTimeout = setTimeout(() => this._ocultarToast(), this._umbralesVisuales.toastDuracion);
  }

  _ocultarToast() {
    const toast = document.getElementById('aura-toast');
    if (toast) toast.classList.remove('aura-toast--visible');
  }

  _inyectarEstilos() {
    if (document.getElementById('aura-ui-styles')) return;
    const style = document.createElement('style');
    style.id = 'aura-ui-styles';
    style.textContent = BASE_CSS;
    document.head.appendChild(style);
  }
}

// ──────────────────────── CONFIGURACIÓN VISUAL ──────────────────────────

const CSS_VARS = {
  normal: {
    '--aura-font-size-base': '16px',
    '--aura-bg': '#F7F6F2',
    '--aura-text': '#2C2C2A',
    '--aura-distractor-op': '1',
    '--aura-accent': '#3498db'
  },
  frustrado: {
    '--aura-font-size-base': '20px', // Aumento de escala (HCI Support)
    '--aura-bg': '#FFFFFF',
    '--aura-text': '#000000',
    '--aura-distractor-op': '0',    // Ocultar ruido visual
    '--aura-accent': '#e74c3c'
  },
  concentrado: {
    '--aura-font-size-base': '15px',
    '--aura-bg': '#F7F6F2',
    '--aura-text': '#2C2C2A',
    '--aura-distractor-op': '0.2',  // Opacidad baja para no distraer
    '--aura-accent': '#2ecc71'
  }
};

const BASE_CSS = `
  body, nav, header, main, .aura-card {
    transition: all ${TRANSITION.color}ms ease-in-out;
  }

  [data-aura-state] {
    font-size: var(--aura-font-size-base);
    background-color: var(--aura-bg);
    color: var(--aura-text);
  }

  /* Reducción de carga cognitiva en modo frustrado */
  body[data-aura-state="frustrado"] [data-aura-role="nav"],
  body[data-aura-state="frustrado"] [data-aura-role="secondary"] {
    opacity: 0;
    pointer-events: none;
    transform: translateX(-20px);
  }

  #aura-toast {
    position: fixed; top: 20px; left: 50%; transform: translateX(-50%) translateY(-100px);
    background: #1D9E75; color: white; padding: 12px 24px; border-radius: 50px;
    display: flex; gap: 15px; align-items: center; z-index: 10000;
    box-shadow: 0 10px 30px rgba(0,0,0,0.1); transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    opacity: 0;
  }

  #aura-toast.aura-toast--visible { transform: translateX(-50%) translateY(0); opacity: 1; }

  #aura-toast-cerrar { background: none; border: none; color: white; cursor: pointer; font-size: 20px; }

  .aura--transitioning { cursor: wait; }
`;