/**
 * @module UIAdapter
 * @description Semana 2 — Expressing (Bucle de Picard)
 * Implementa las dos variantes visuales de la interfaz y la
 * lógica de transición según el estado emocional detectado.
 *
 * Modos:
 *   'normal'   → Interfaz completa con menús y notificaciones
 *   'support'  → Modo Soporte: elementos no esenciales ocultos,
 *                mayor contraste, botón de ayuda destacado
 *
 * @author Xavi
 * @version 2.0.0
 */

/** @type {AdaptationState[]} */
const ESTADOS_VALIDOS = ['normal', 'support'];

/** Duración de transición CSS en ms — evita cambios bruscos */
const TRANSITION_MS = 400;

export class UIAdapter {
  /**
   * @param {Object} [options]
   * @param {string}   [options.rootSelector='body']  Nodo raíz del DOM
   * @param {Function} [options.onStateChange]        Callback al cambiar estado
   */
  constructor(options = {}) {
    this.rootSelector  = options.rootSelector  ?? 'body';
    this.onStateChange = options.onStateChange ?? null;

    /** @type {AdaptationState} */
    this._estadoActual = 'normal';

    this._inyectarEstilos();
    this._crearBotonAyuda();
  }

  // ─────────────────────────────── Public API ─────────────────────────────

  /**
   * Cambia las clases CSS de la interfaz según el estado detectado.
   * No recarga la página — usa solo manipulación de clases y CSS vars.
   *
   * @param {AdaptationState} state  'normal' | 'support'
   */
  applyAdaptation(state) {
    if (!ESTADOS_VALIDOS.includes(state)) {
      console.warn(`[UIAdapter] Estado inválido: "${state}". Usa: ${ESTADOS_VALIDOS.join(', ')}`);
      return;
    }

    if (state === this._estadoActual) return;

    const anterior = this._estadoActual;
    this._estadoActual = state;

    this._actualizarDOM(state);

    if (typeof this.onStateChange === 'function') {
      this.onStateChange({ from: anterior, to: state });
    }
  }

  /** @returns {AdaptationState} */
  get estadoActual() {
    return this._estadoActual;
  }

  /** Regresa al modo normal */
  reset() {
    this.applyAdaptation('normal');
  }

  // ──────────────────────────── DOM Mutations ──────────────────────────────

  /**
   * Aplica el estado al DOM mediante clases y CSS custom properties.
   * @param {AdaptationState} state
   */
  _actualizarDOM(state) {
    const root = document.querySelector(this.rootSelector);
    if (!root) {
      console.error(`[UIAdapter] Selector no encontrado: "${this.rootSelector}"`);
      return;
    }

    // Limpia clases anteriores
    ESTADOS_VALIDOS.forEach(s => root.classList.remove(`aura--${s}`));

    // Aplica nuevo estado
    root.classList.add(`aura--${state}`);
    root.dataset.auraState = state;

    // Aplica CSS vars del estado
    const vars = CSS_VARS[state];
    Object.entries(vars).forEach(([prop, val]) => {
      root.style.setProperty(prop, val);
    });

    // Muestra u oculta el botón de ayuda
    const btnAyuda = document.getElementById('aura-btn-ayuda');
    if (btnAyuda) {
      btnAyuda.style.display = state === 'support' ? 'flex' : 'none';
    }
  }

  // ─────────────────────────── Botón de ayuda ─────────────────────────────

  /**
   * Crea el botón de ayuda destacado que aparece en modo Soporte.
   * Se inserta una sola vez en el DOM.
   */
  _crearBotonAyuda() {
    if (document.getElementById('aura-btn-ayuda')) return;

    const btn = document.createElement('button');
    btn.id          = 'aura-btn-ayuda';
    btn.textContent = '¿Necesitas ayuda?';
    btn.setAttribute('aria-label', 'Botón de ayuda — modo soporte activo');
    btn.style.display = 'none';

    btn.addEventListener('click', () => {
      console.info('[UIAdapter] Usuario solicitó ayuda en modo soporte.');
      document.dispatchEvent(new CustomEvent('aura:ayuda-solicitada'));
    });

    document.body.appendChild(btn);
  }

  // ──────────────────────────────── Estilos ────────────────────────────────

  /**
   * Inyecta en <head> los estilos base de Aura.
   * Idempotente — solo se ejecuta una vez.
   */
  _inyectarEstilos() {
    const STYLE_ID = 'aura-ui-adapter-styles';
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id          = STYLE_ID;
    style.textContent = BASE_CSS;
    document.head.appendChild(style);
  }
}

// ──────────────────────── CSS Variables por Estado ──────────────────────────

const CSS_VARS = {
  normal: {
    '--aura-font-size-base':    '16px',
    '--aura-bg':                '#F7F6F2',
    '--aura-surface':           '#FFFFFF',
    '--aura-text':              '#2C2C2A',
    '--aura-text-secondary':    '#888780',
    '--aura-border':            '#E4E2DA',
    '--aura-nav-display':       'block',
    '--aura-secondary-display': 'block',
    '--aura-notif-display':     'block',
    '--aura-card-radius':       '8px',
    '--aura-spacing':           '1rem',
  },
  support: {
    '--aura-font-size-base':    '18px',
    '--aura-bg':                '#FFFFFF',
    '--aura-surface':           '#F7F6F2',
    '--aura-text':              '#1A1A18',
    '--aura-text-secondary':    '#444441',
    '--aura-border':            '#2C2C2A',
    '--aura-nav-display':       'none',
    '--aura-secondary-display': 'none',
    '--aura-notif-display':     'none',
    '--aura-card-radius':       '12px',
    '--aura-spacing':           '1.5rem',
  },
};

// ──────────────────────────────── Base CSS ───────────────────────────────────

const BASE_CSS = `
*, *::before, *::after {
  transition:
    background-color ${TRANSITION_MS}ms ease,
    color            ${TRANSITION_MS}ms ease,
    font-size        ${TRANSITION_MS}ms ease,
    border-color     ${TRANSITION_MS}ms ease,
    opacity          ${TRANSITION_MS}ms ease;
}

[data-aura-state] {
  font-size:  var(--aura-font-size-base, 16px);
  background: var(--aura-bg, #F7F6F2);
  color:      var(--aura-text, #2C2C2A);
}

.aura-nav,
[data-aura-role="nav"] {
  display: var(--aura-nav-display, block);
}

.aura-secondary,
[data-aura-role="secondary"] {
  display: var(--aura-secondary-display, block);
}

.aura-notif,
[data-aura-role="notificacion"] {
  display: var(--aura-notif-display, block);
}

[data-aura-state] .aura-section {
  padding: var(--aura-spacing, 1rem);
}

[data-aura-state="aura--support"] .aura-card {
  border:        2px solid var(--aura-border);
  border-radius: var(--aura-card-radius);
}

#aura-btn-ayuda {
  position:      fixed;
  bottom:        2rem;
  right:         2rem;
  display:       none;
  align-items:   center;
  gap:           8px;
  background:    #1D9E75;
  color:         #FFFFFF;
  font-size:     1rem;
  font-weight:   600;
  padding:       14px 24px;
  border:        none;
  border-radius: 999px;
  cursor:        pointer;
  z-index:       9999;
  box-shadow:    0 4px 16px rgba(29, 158, 117, 0.4);
  transition:
    transform  ${TRANSITION_MS}ms ease,
    box-shadow ${TRANSITION_MS}ms ease;
}

#aura-btn-ayuda:hover {
  transform:  translateY(-2px);
  box-shadow: 0 6px 20px rgba(29, 158, 117, 0.5);
}

#aura-btn-ayuda:active {
  transform: scale(0.97);
}
`;

/**
 * @typedef {'normal' | 'support'} AdaptationState
 */
