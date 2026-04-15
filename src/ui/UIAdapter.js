/**
 * @module UIAdapter
 * @description Semana 3 — Refinamiento de Interacción Seamless
 * Mejora las transiciones entre estados para evitar el efecto
 * "Uncanny Valley" — cambios bruscos que desorientan al usuario.
 *
 * Cambios S3:
 *   - display:none reemplazado por opacity + visibility (animable)
 *   - Transiciones escalonadas: primero oculta, luego muestra
 *   - Animación de entrada para el botón de ayuda (slide desde abajo)
 *   - Animación de entrada para el modo soporte (fade)
 *
 * Modos:
 *   'normal'   → Interfaz completa con menús y notificaciones
 *   'support'  → Modo Soporte: elementos no esenciales ocultos,
 *                mayor contraste, botón de ayuda destacado
 *
 * @author Xavi
 * @version 3.0.0
 */

/** @type {AdaptationState[]} */
const ESTADOS_VALIDOS = ['normal', 'support'];

/**
 * Duraciones de transición en ms.
 * Escalonadas para evitar cambios simultáneos bruscos.
 */
const TRANSITION = {
  ocultar:  300,   // elementos que desaparecen
  mostrar:  400,   // elementos que aparecen
  color:    500,   // cambios de color y fondo
  retraso:  150,   // pausa entre ocultar y mostrar
};

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
    this._transicionando = false;

    this._inyectarEstilos();
    this._crearBotonAyuda();
  }

  // ─────────────────────────────── Public API ─────────────────────────────

  /**
   * Cambia la interfaz según el estado detectado.
   * Usa transiciones escalonadas para evitar cambios bruscos.
   *
   * @param {AdaptationState} state  'normal' | 'support'
   */
  applyAdaptation(state) {
    if (!ESTADOS_VALIDOS.includes(state)) {
      console.warn(`[UIAdapter] Estado inválido: "${state}". Usa: ${ESTADOS_VALIDOS.join(', ')}`);
      return;
    }

    if (state === this._estadoActual) return;
    if (this._transicionando) return;

    const anterior = this._estadoActual;
    this._estadoActual   = 'transitioning';
    this._transicionando = true;

    this._transicionEscalonada(state, anterior);
  }

  /** @returns {AdaptationState} */
  get estadoActual() {
    return this._estadoActual;
  }

  /** Regresa al modo normal */
  reset() {
    this._estadoActual   = 'support';
    this._transicionando = false;
    this.applyAdaptation('normal');
  }

  // ──────────────────────────── Transición escalonada ─────────────────────

  /**
   * Orquesta el cambio en 3 fases para evitar el efecto brusco:
   *   Fase 1 — Oculta los elementos que van a desaparecer
   *   Fase 2 — Cambia colores y layout (retraso pequeño)
   *   Fase 3 — Muestra los elementos nuevos
   *
   * @param {AdaptationState} state
   * @param {AdaptationState} anterior
   */
  _transicionEscalonada(state, anterior) {
    const root = document.querySelector(this.rootSelector);
    if (!root) return;

    // ── Fase 1: marca que está en transición ────────────────────────────
    root.classList.add('aura--transitioning');

    // ── Fase 2: aplica clases y CSS vars después del retraso ─────────────
    setTimeout(() => {
      ESTADOS_VALIDOS.forEach(s => root.classList.remove(`aura--${s}`));
      root.classList.add(`aura--${state}`);
      root.dataset.auraState = state;

      const vars = CSS_VARS[state];
      Object.entries(vars).forEach(([prop, val]) => {
        root.style.setProperty(prop, val);
      });

      // Maneja el botón de ayuda con animación
      this._animarBotonAyuda(state);

    }, TRANSITION.retraso);

    // ── Fase 3: limpia la clase de transición ────────────────────────────
    const duracionTotal = TRANSITION.retraso + TRANSITION.color;
    setTimeout(() => {
      root.classList.remove('aura--transitioning');
      this._estadoActual   = state;
      this._transicionando = false;

      if (typeof this.onStateChange === 'function') {
        this.onStateChange({ from: anterior, to: state });
      }
    }, duracionTotal);
  }

  // ─────────────────────────── Botón de ayuda ─────────────────────────────

  /**
   * Anima la entrada/salida del botón de ayuda.
   * Slide desde abajo al aparecer, slide hacia abajo al desaparecer.
   * @param {AdaptationState} state
   */
  _animarBotonAyuda(state) {
    const btn = document.getElementById('aura-btn-ayuda');
    if (!btn) return;

    if (state === 'support') {
      // Hace visible antes de animar (necesario para que CSS lo vea)
      btn.style.display = 'flex';
      // Pequeño retraso para que el navegador registre el display:flex
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          btn.classList.add('aura-btn-ayuda--visible');
        });
      });
    } else {
      btn.classList.remove('aura-btn-ayuda--visible');
      // Oculta después de que termine la animación de salida
      setTimeout(() => {
        btn.style.display = 'none';
      }, TRANSITION.mostrar);
    }
  }

  /**
   * Crea el botón de ayuda en el DOM.
   * Se inserta una sola vez.
   */
  _crearBotonAyuda() {
    if (document.getElementById('aura-btn-ayuda')) return;

    const btn = document.createElement('button');
    btn.id = 'aura-btn-ayuda';
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
   * Inyecta los estilos base de Aura en <head>.
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
    '--aura-card-radius':       '12px',
    '--aura-spacing':           '1.5rem',
  },
};

// ──────────────────────────────── Base CSS ───────────────────────────────────

const BASE_CSS = `

/* ── Animaciones definidas ── */
@keyframes aura-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes aura-slide-up {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0);    }
}

@keyframes aura-slide-down {
  from { opacity: 1; transform: translateY(0);    }
  to   { opacity: 0; transform: translateY(24px); }
}

/* ── Transiciones limitadas a contenedores principales ── */
body,
nav[data-aura-role="nav"],
.aura-secondary,
.aura-notif,
.aura-card,
.aura-section,
header,
main {
  transition:
    background-color ${TRANSITION.color}ms ease,
    color            ${TRANSITION.color}ms ease,
    font-size        ${TRANSITION.color}ms ease,
    border-color     ${TRANSITION.color}ms ease;
}

/* ── Estado base del body ── */
[data-aura-state] {
  font-size:  var(--aura-font-size-base, 16px);
  background: var(--aura-bg, #F7F6F2);
  color:      var(--aura-text, #2C2C2A);
}

/* ── Nav lateral ── */
[data-aura-role="nav"] {
  opacity:    1;
  visibility: visible;
  transition:
    opacity    ${TRANSITION.ocultar}ms ease,
    visibility ${TRANSITION.ocultar}ms ease,
    background-color ${TRANSITION.color}ms ease;
}

/* Oculta con fade — NO display:none directo */
body.aura--support [data-aura-role="nav"] {
  opacity:    0;
  visibility: hidden;
}

/* ── Elementos secundarios ── */
.aura-secondary,
[data-aura-role="secondary"] {
  opacity:    1;
  visibility: visible;
  max-height: 200px;
  overflow:   hidden;
  transition:
    opacity    ${TRANSITION.ocultar}ms ease,
    visibility ${TRANSITION.ocultar}ms ease,
    max-height ${TRANSITION.ocultar}ms ease;
}

body.aura--support .aura-secondary,
body.aura--support [data-aura-role="secondary"] {
  opacity:    0;
  visibility: hidden;
  max-height: 0;
}

/* ── Notificaciones ── */
.aura-notif,
[data-aura-role="notificacion"] {
  opacity:    1;
  visibility: visible;
  transition:
    opacity    ${TRANSITION.ocultar}ms ease,
    visibility ${TRANSITION.ocultar}ms ease;
}

body.aura--support .aura-notif,
body.aura--support [data-aura-role="notificacion"] {
  opacity:    0;
  visibility: hidden;
}

/* ── Items secundarios del menú ── */
.aura-menu-item:not(.aura-menu-item--principal) {
  opacity:    1;
  max-height: 40px;
  overflow:   hidden;
  transition:
    opacity    ${TRANSITION.ocultar}ms ease,
    max-height ${TRANSITION.ocultar}ms ease;
}

body.aura--support .aura-menu-item:not(.aura-menu-item--principal) {
  opacity:    0;
  max-height: 0;
}

/* ── Cards — animación de entrada en modo soporte ── */
body.aura--support .aura-card {
  border:        2px solid var(--aura-border);
  border-radius: var(--aura-card-radius);
  animation:     aura-fade-in ${TRANSITION.mostrar}ms ease forwards;
}

/* ── Sección principal ── */
[data-aura-state] .aura-section {
  padding: var(--aura-spacing, 1rem);
}

/* ── Indicador de transición en curso ── */
body.aura--transitioning {
  cursor: wait;
}

/* ── Botón de ayuda ── */
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

  /* Estado inicial — invisible y abajo */
  opacity:   0;
  transform: translateY(24px);
  transition:
    transform  ${TRANSITION.mostrar}ms ease,
    box-shadow ${TRANSITION.mostrar}ms ease,
    opacity    ${TRANSITION.mostrar}ms ease;
}

/* Clase que activa la animación de entrada */
#aura-btn-ayuda.aura-btn-ayuda--visible {
  opacity:   1;
  transform: translateY(0);
  animation: aura-slide-up ${TRANSITION.mostrar}ms ease forwards;
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
 * @typedef {'normal' | 'support' | 'transitioning'} AdaptationState
 */
