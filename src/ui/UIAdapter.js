/**
 * @module UIAdapter
 * @description Semana 2 — Expressing (Bucle de Picard)
 * Semana 3 — Refinamiento Seamless
 *
 * Implementa tres variantes visuales de la interfaz:
 *   'normal'     → Interfaz completa con menús y notificaciones
 *   'frustrado'  → Modo Soporte: oculta menús, aumenta contraste, muestra toast
 *   'concentrado'→ Modo Zen: reduce opacidad de elementos distractores
 *
 * El motor de Valeria escribe en body[data-aura-state] y la UI reacciona
 * automáticamente sin recargar la página.
 *
 * @author Xavi
 * @version 4.0.0
 */

/** @type {AdaptationState[]} */
const ESTADOS_VALIDOS = ['normal', 'frustrado', 'concentrado'];

/**
 * Duraciones de transición en ms — escalonadas para evitar cambios bruscos.
 */
const TRANSITION = {
  ocultar: 300,
  mostrar: 400,
  color:   500,
  retraso: 150,
};

/** Tiempo en ms antes de que el toast se auto-cierre */
const TOAST_DURACION_MS = 4000;

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
    this._estadoActual   = 'normal';
    this._transicionando = false;
    this._toastTimeout   = null;

    this._inyectarEstilos();
    this._crearToast();
  }

  // ─────────────────────────────── Public API ─────────────────────────────

  /**
   * Cambia la interfaz según el estado emocional detectado.
   * Reacciona al atributo data-aura-state sin recargar la página.
   *
   * @param {AdaptationState} state  'normal' | 'frustrado' | 'concentrado'
   */
  applyAdaptation(state) {
    if (!ESTADOS_VALIDOS.includes(state)) {
      console.warn(`[UIAdapter] Estado inválido: "${state}". Usa: ${ESTADOS_VALIDOS.join(', ')}`);
      return;
    }

    if (state === this._estadoActual) return;
    if (this._transicionando) return;

    const anterior       = this._estadoActual;
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
    this._estadoActual   = this._estadoActual === 'transitioning' ? 'normal' : this._estadoActual;
    this._transicionando = false;
    this.applyAdaptation('normal');
  }

  // ──────────────────────────── Transición escalonada ─────────────────────

  /**
   * Orquesta el cambio en 3 fases para evitar el efecto brusco:
   *   Fase 1 — marca transitioning
   *   Fase 2 — aplica clases y CSS vars (con retraso)
   *   Fase 3 — limpia y notifica
   *
   * @param {AdaptationState} state
   * @param {AdaptationState} anterior
   */
  _transicionEscalonada(state, anterior) {
    const root = document.querySelector(this.rootSelector);
    if (!root) return;

    // Fase 1 — indica que está en transición
    root.classList.add('aura--transitioning');

    // Fase 2 — aplica el nuevo estado
    setTimeout(() => {
      ESTADOS_VALIDOS.forEach(s => root.classList.remove(`aura--${s}`));
      root.classList.add(`aura--${state}`);
      root.dataset.auraState = state;

      const vars = CSS_VARS[state];
      Object.entries(vars).forEach(([prop, val]) => {
        root.style.setProperty(prop, val);
      });

      // Muestra el toast solo en modo frustrado
      if (state === 'frustrado') {
        this._mostrarToast('Modo soporte activado — estamos aquí para ayudarte.');
      } else {
        this._ocultarToast();
      }

    }, TRANSITION.retraso);

    // Fase 3 — limpia y notifica
    setTimeout(() => {
      root.classList.remove('aura--transitioning');
      this._estadoActual   = state;
      this._transicionando = false;

      if (typeof this.onStateChange === 'function') {
        this.onStateChange({ from: anterior, to: state });
      }
    }, TRANSITION.retraso + TRANSITION.color);
  }

  // ──────────────────────────── Toast de ayuda ────────────────────────────

  /**
   * Crea el elemento toast en el DOM — solo una vez.
   * El toast reemplaza al botón fijo de S2 con una notificación contextual.
   */
  _crearToast() {
    if (document.getElementById('aura-toast')) return;

    const toast = document.createElement('div');
    toast.id = 'aura-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');

    // Botón de cierre manual
    const btnCerrar = document.createElement('button');
    btnCerrar.id          = 'aura-toast-cerrar';
    btnCerrar.textContent = '×';
    btnCerrar.setAttribute('aria-label', 'Cerrar notificación');
    btnCerrar.addEventListener('click', () => this._ocultarToast());

    const mensaje = document.createElement('span');
    mensaje.id = 'aura-toast-mensaje';

    toast.appendChild(mensaje);
    toast.appendChild(btnCerrar);
    document.body.appendChild(toast);
  }

  /**
   * Muestra el toast con un mensaje y lo auto-cierra después de TOAST_DURACION_MS.
   * @param {string} mensaje
   */
  _mostrarToast(mensaje) {
    const toast   = document.getElementById('aura-toast');
    const spanMsg = document.getElementById('aura-toast-mensaje');
    if (!toast || !spanMsg) return;

    spanMsg.textContent = mensaje;
    toast.classList.add('aura-toast--visible');

    // Limpia timeout anterior si existía
    if (this._toastTimeout) clearTimeout(this._toastTimeout);
    this._toastTimeout = setTimeout(() => this._ocultarToast(), TOAST_DURACION_MS);
  }

  /** Oculta el toast con animación de salida */
  _ocultarToast() {
    const toast = document.getElementById('aura-toast');
    if (!toast) return;
    toast.classList.remove('aura-toast--visible');
    if (this._toastTimeout) {
      clearTimeout(this._toastTimeout);
      this._toastTimeout = null;
    }
  }

  // ──────────────────────────────── Estilos ────────────────────────────────

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
    '--aura-font-size-base': '16px',
    '--aura-bg':             '#F7F6F2',
    '--aura-surface':        '#FFFFFF',
    '--aura-text':           '#2C2C2A',
    '--aura-text-secondary': '#888780',
    '--aura-border':         '#E4E2DA',
    '--aura-card-radius':    '8px',
    '--aura-spacing':        '1rem',
    '--aura-distractor-op':  '1',
  },
  frustrado: {
    '--aura-font-size-base': '18px',
    '--aura-bg':             '#FFFFFF',
    '--aura-surface':        '#F7F6F2',
    '--aura-text':           '#1A1A18',
    '--aura-text-secondary': '#444441',
    '--aura-border':         '#2C2C2A',
    '--aura-card-radius':    '12px',
    '--aura-spacing':        '1.5rem',
    '--aura-distractor-op':  '0',
  },
  concentrado: {
    '--aura-font-size-base': '15px',
    '--aura-bg':             '#F7F6F2',
    '--aura-surface':        '#FFFFFF',
    '--aura-text':           '#2C2C2A',
    '--aura-text-secondary': '#888780',
    '--aura-border':         '#E4E2DA',
    '--aura-card-radius':    '8px',
    '--aura-spacing':        '1rem',
    '--aura-distractor-op':  '0.25',
  },
};

// ──────────────────────────────── Base CSS ───────────────────────────────────

const BASE_CSS = `

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
    border-color     ${TRANSITION.color}ms ease,
    opacity          ${TRANSITION.color}ms ease;
}

/* ── Estado base ── */
[data-aura-state] {
  font-size:  var(--aura-font-size-base, 16px);
  background: var(--aura-bg, #F7F6F2);
  color:      var(--aura-text, #2C2C2A);
}

/* ════════════════════════════════════════════
   MODO FRUSTRADO — body[data-aura-state="frustrado"]
   Oculta menús secundarios, aumenta contraste,
   muestra toast de ayuda activa.
   ════════════════════════════════════════════ */

/* Nav lateral — fade out */
[data-aura-role="nav"] {
  opacity:    1;
  visibility: visible;
  transition:
    opacity    ${TRANSITION.ocultar}ms ease,
    visibility ${TRANSITION.ocultar}ms ease,
    background-color ${TRANSITION.color}ms ease;
}

body[data-aura-state="frustrado"] [data-aura-role="nav"] {
  opacity:    0;
  visibility: hidden;
}

/* Menú items secundarios */
.aura-menu-item:not(.aura-menu-item--principal) {
  opacity:    1;
  max-height: 40px;
  overflow:   hidden;
  transition:
    opacity    ${TRANSITION.ocultar}ms ease,
    max-height ${TRANSITION.ocultar}ms ease;
}

body[data-aura-state="frustrado"] .aura-menu-item:not(.aura-menu-item--principal) {
  opacity:    0;
  max-height: 0;
}

/* Elementos secundarios — colapso suave */
.aura-secondary,
[data-aura-role="secondary"] {
  opacity:    1;
  max-height: 300px;
  overflow:   hidden;
  transition:
    opacity    ${TRANSITION.ocultar}ms ease,
    max-height ${TRANSITION.ocultar}ms ease;
}

body[data-aura-state="frustrado"] .aura-secondary,
body[data-aura-state="frustrado"] [data-aura-role="secondary"] {
  opacity:    0;
  max-height: 0;
}

/* Notificaciones */
.aura-notif,
[data-aura-role="notificacion"] {
  opacity:    1;
  visibility: visible;
  transition:
    opacity    ${TRANSITION.ocultar}ms ease,
    visibility ${TRANSITION.ocultar}ms ease;
}

body[data-aura-state="frustrado"] .aura-notif,
body[data-aura-state="frustrado"] [data-aura-role="notificacion"] {
  opacity:    0;
  visibility: hidden;
}

/* Botones de acción — mayor contraste en frustrado */
body[data-aura-state="frustrado"] button,
body[data-aura-state="frustrado"] .aura-btn {
  font-size:   1rem;
  font-weight: 600;
  min-height:  44px;
  transition:  all ${TRANSITION.color}ms ease;
}

/* Cards — borde marcado y animación entrada */
body[data-aura-state="frustrado"] .aura-card {
  border:        2px solid var(--aura-border);
  border-radius: var(--aura-card-radius);
  animation:     aura-fade-in ${TRANSITION.mostrar}ms ease forwards;
}

/* ════════════════════════════════════════════
   MODO CONCENTRADO — body[data-aura-state="concentrado"]
   Reduce opacidad de elementos distractores.
   ════════════════════════════════════════════ */

body[data-aura-state="concentrado"] .aura-secondary,
body[data-aura-state="concentrado"] [data-aura-role="secondary"],
body[data-aura-state="concentrado"] .aura-notif,
body[data-aura-state="concentrado"] [data-aura-role="notificacion"],
body[data-aura-state="concentrado"] .aura-menu-item:not(.aura-menu-item--principal) {
  opacity:    var(--aura-distractor-op, 0.25);
  transition: opacity ${TRANSITION.color}ms ease;
}

/* Cards en concentrado — sin animación brusca */
body[data-aura-state="concentrado"] .aura-card {
  opacity: 0.85;
  transition: opacity ${TRANSITION.color}ms ease;
}

/* ── Sección principal ── */
[data-aura-state] .aura-section {
  padding: var(--aura-spacing, 1rem);
}

/* ── Cursor durante transición ── */
body.aura--transitioning {
  cursor: wait;
}

/* ════════════════════════════════════════════
   TOAST DE AYUDA ACTIVA
   Aparece en la parte superior al entrar en
   modo frustrado. Se auto-cierra en 4 segundos.
   ════════════════════════════════════════════ */

#aura-toast {
  position:        fixed;
  top:             1.5rem;
  left:            50%;
  transform:       translateX(-50%) translateY(-120%);
  background:      #1D9E75;
  color:           #FFFFFF;
  font-size:       14px;
  font-weight:     500;
  padding:         12px 20px;
  border-radius:   999px;
  display:         flex;
  align-items:     center;
  gap:             12px;
  z-index:         9999;
  box-shadow:      0 4px 16px rgba(29, 158, 117, 0.35);
  opacity:         0;
  transition:
    transform ${TRANSITION.mostrar}ms ease,
    opacity   ${TRANSITION.mostrar}ms ease;
  white-space: nowrap;
}

/* Clase que activa la entrada del toast */
#aura-toast.aura-toast--visible {
  opacity:   1;
  transform: translateX(-50%) translateY(0);
}

#aura-toast-cerrar {
  background:    rgba(255,255,255,0.25);
  border:        none;
  color:         #FFFFFF;
  font-size:     16px;
  font-weight:   600;
  width:         24px;
  height:        24px;
  border-radius: 50%;
  cursor:        pointer;
  display:       flex;
  align-items:   center;
  justify-content: center;
  padding:       0;
  line-height:   1;
  transition:    background ${TRANSITION.ocultar}ms ease;
}

#aura-toast-cerrar:hover {
  background: rgba(255,255,255,0.4);
}
`;

/**
 * @typedef {'normal' | 'frustrado' | 'concentrado' | 'transitioning'} AdaptationState
 */
