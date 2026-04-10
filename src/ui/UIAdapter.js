/**
 * @module UIAdapter
 * @description Semana 2 — Expressing (Bucle de Picard)
 * Recibe el estado emocional clasificado y muta el DOM para
 * reducir / aumentar la carga cognitiva según el estado.
 *
 * Modos:
 *   'normal'      → UI estándar completa
 *   'focused'     → UI compacta, menos distracciones
 *   'frustrated'  → UI simplificada, mayor tipografía, menos opciones
 *
 * @author Xavier
 * @version 1.0.0
 */

/** @type {EmotionalState[]} */
const VALID_STATES = ['normal', 'focused', 'frustrated'];

/** Duración de la transición CSS en ms */
const TRANSITION_MS = 400;

export class UIAdapter {
  /**
   * @param {Object} options
   * @param {string} [options.rootSelector='body']   Nodo raíz del DOM a mutar
   * @param {Function} [options.onStateChange]       Callback cuando cambia el estado
   */
  constructor(options = {}) {
    this.rootSelector  = options.rootSelector  ?? 'body';
    this.onStateChange = options.onStateChange ?? null;

    /** @type {EmotionalState} */
    this._currentState = 'normal';

    this._injectBaseStyles();
  }

  // ─────────────────────────────── Public API ─────────────────────────────

  /**
   * Aplica el estado emocional a la interfaz.
   * Si el estado es el mismo que el actual, no hace nada.
   *
   * @param {EmotionalState} state
   */
  applyState(state) {
    if (!VALID_STATES.includes(state)) {
      console.warn(`[UIAdapter] Estado inválido: "${state}". Usa: ${VALID_STATES.join(', ')}`);
      return;
    }

    if (state === this._currentState) return;

    const prev = this._currentState;
    this._currentState = state;

    this._updateDOM(state);

    if (typeof this.onStateChange === 'function') {
      this.onStateChange({ from: prev, to: state });
    }
  }

  /** @returns {EmotionalState} */
  get currentState() {
    return this._currentState;
  }

  /** Regresa la UI al estado normal */
  reset() {
    this.applyState('normal');
  }

  // ────────────────────────────── DOM Mutations ───────────────────────────

  /**
   * Aplica el data-attribute en el root y ajusta los CSS vars.
   * El CSS hace el trabajo visual real.
   * @param {EmotionalState} state
   */
  _updateDOM(state) {
    const root = document.querySelector(this.rootSelector);
    if (!root) {
      console.error(`[UIAdapter] No se encontró el selector: "${this.rootSelector}"`);
      return;
    }

    // Elimina clases anteriores
    VALID_STATES.forEach(s => root.classList.remove(`aura-state--${s}`));

    // Aplica nuevo estado como data-attribute (para CSS) y clase (para JS hooks)
    root.dataset.auraState = state;
    root.classList.add(`aura-state--${state}`);

    // Aplica CSS variables del estado
    const vars = STATE_VARS[state];
    Object.entries(vars).forEach(([prop, value]) => {
      root.style.setProperty(prop, value);
    });
  }

  // ─────────────────────────────── Styles ─────────────────────────────────

  /**
   * Inyecta en <head> las reglas CSS base de Aura.
   * Solo lo hace una vez (idempotente).
   */
  _injectBaseStyles() {
    const STYLE_ID = 'aura-ui-adapter-styles';
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = BASE_CSS;
    document.head.appendChild(style);
  }
}

// ──────────────────────────────── CSS Variables por Estado ──────────────────

/**
 * Cada estado sobreescribe CSS custom properties en el root.
 * El resto del app solo necesita consumir estas variables.
 *
 * @type {Record<EmotionalState, Record<string, string>>}
 */
const STATE_VARS = {
  normal: {
    '--aura-font-size-base':    '16px',
    '--aura-spacing-unit':      '1rem',
    '--aura-sidebar-display':   'block',
    '--aura-secondary-display': 'block',
    '--aura-overlay-opacity':   '0',
    '--aura-card-radius':       '8px',
    '--aura-bg-tint':           'transparent',
    '--aura-border-accent':     'transparent',
  },
  focused: {
    '--aura-font-size-base':    '15px',
    '--aura-spacing-unit':      '0.875rem',
    '--aura-sidebar-display':   'none',
    '--aura-secondary-display': 'block',
    '--aura-overlay-opacity':   '0',
    '--aura-card-radius':       '6px',
    '--aura-bg-tint':           'transparent',
    '--aura-border-accent':     'transparent',
  },
  frustrated: {
    '--aura-font-size-base':    '18px',
    '--aura-spacing-unit':      '1.25rem',
    '--aura-sidebar-display':   'none',
    '--aura-secondary-display': 'none',
    '--aura-overlay-opacity':   '1',
    '--aura-card-radius':       '12px',
    '--aura-bg-tint':           'rgba(234, 243, 222, 0.15)',   /* verde suave */
    '--aura-border-accent':     '#1D9E75',
  },
};

// ─────────────────────────────────── Base CSS ───────────────────────────────

const BASE_CSS = `
/* ── Aura UI Adapter — Base Styles ── */
*,
*::before,
*::after {
  transition:
    background-color ${TRANSITION_MS}ms ease,
    color            ${TRANSITION_MS}ms ease,
    font-size        ${TRANSITION_MS}ms ease,
    border-color     ${TRANSITION_MS}ms ease,
    box-shadow       ${TRANSITION_MS}ms ease;
}

/* Aplica tipografía base dinámica */
[data-aura-state] {
  font-size: var(--aura-font-size-base, 16px);
}

/* Oculta sidebar/nav secundaria en focused y frustrated */
.aura-sidebar,
[data-aura-role="sidebar"] {
  display: var(--aura-sidebar-display, block);
}

/* Oculta elementos secundarios en modo frustrated */
.aura-secondary,
[data-aura-role="secondary"] {
  display: var(--aura-secondary-display, block);
}

/* Overlay de "respira" en modo frustrated */
[data-aura-role="calm-overlay"] {
  opacity:        var(--aura-overlay-opacity, 0);
  pointer-events: none;
  position:       fixed;
  inset:          0;
  background:     var(--aura-bg-tint, transparent);
  transition:     opacity ${TRANSITION_MS}ms ease;
  z-index:        9999;
  display:        flex;
  align-items:    center;
  justify-content:center;
}

/* Acento visual en tarjetas durante frustrated */
[data-aura-state="frustrated"] .aura-card,
[data-aura-state="frustrated"] [data-aura-role="card"] {
  border-color: var(--aura-border-accent);
  border-width: 2px;
  border-style: solid;
  border-radius: var(--aura-card-radius);
  background: var(--aura-bg-tint);
}

/* Espaciado dinámico */
[data-aura-state] .aura-section {
  padding: var(--aura-spacing-unit);
}

/* Reduce densidad de opciones en frustrated */
[data-aura-state="frustrated"] .aura-menu-item:not(.aura-menu-item--primary) {
  display: none;
}
`;

// ─────────────────────────────── JSDoc Types ────────────────────────────────

/**
 * @typedef {'normal' | 'focused' | 'frustrated'} EmotionalState
 */
