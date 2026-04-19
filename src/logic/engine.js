import { UIAdapter } from '../ui/UIAdapter.js';
import { bufferGlobal, startSensors, stopSensors, isSensing } from '../sensors/sensors.js';

// Variables para detección de Rage Clicking (Frustración)
let clickCount = 0;
let lastClickTime = 0;
let lastElement = null;
let isRageClicking = false;

// Evento que captura la frustración cuando el usuario hace muchos clics seguidos
document.addEventListener('click', (e) => {
    const ahora = performance.now();
    // Si hace clic en el mismo elemento en menos de 500ms
    if (e.target === lastElement && (ahora - lastClickTime) < 500) {
        clickCount++;
    } else {
        clickCount = 1;
        isRageClicking = false;
    }
      
    lastClickTime = ahora;
    lastElement = e.target;

    if (clickCount >= 3) {
        isRageClicking = true;
        console.warn("⚠️ Rage Clicking detectado");
    }
});

// Función para enviar los datos al servidor
async function enviarAlServidor(muestra) {
    try {
      await fetch('http://localhost:3000/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: "UPEC-SESSION-" + Date.now(),
          user_tag: "Valeria-Testing", // Puedes cambiar esto por el nombre del tester
          metrics: {
            mouse: { 
              velocity_norm: muestra.velocidadMouse, 
              jitter_norm: muestra.jitter 
            },
            keyboard: { 
              dwell_time_norm: muestra.dwellTime, 
              flight_time_norm: muestra.flightTime 
            }
          },
          classification: {
            // Captura el estado actual que tiene el dataset del body
            current_state: document.body.dataset.auraState || 'normal',
            is_manual_override: true 
          }
        })
      });
    } catch (err) {
      console.error("Error de red:", err.message);
    }
}

// Inicia la captura al cargar la página
startSensors();

const adapter = new UIAdapter({
    rootSelector: 'body',
    onStateChange: ({ from, to }) => {
      console.info(`[Aura] Estado: ${from} → ${to}`);
      document.getElementById('estado-label').textContent = to;
    },
});

// Botones de demo — addEventListener en lugar de onclick
document.getElementById('btn-soporte').addEventListener('click', () => {
    adapter.applyAdaptation('support');
});

document.getElementById('btn-normal').addEventListener('click', () => {
    adapter.applyAdaptation('normal');
});

// Control de privacidad — derecho a la desconexión
document.getElementById('btn-privacidad').addEventListener('click', () => {
    const btn = document.getElementById('btn-privacidad');
    if (isSensing()) {
      stopSensors();
      btn.textContent = '▶ Activar sensores';
    } else {
      startSensors();
      btn.textContent = '⏹ Detener sensores';
    }
});

// Actualiza el panel de telemetría con los datos del buffer
setInterval(() => {
    const ultima = bufferGlobal.at(-1);
    if (!ultima) return;

    // --- LÓGICA DE CLASIFICACIÓN ---
    let estadoActual = "normal";

    // Regla de Frustración: Velocidad alta, Jitter alto o Rage Clicking
    if (isRageClicking || ultima.velocidadMouse > 2.0 || ultima.jitter > 0.7) {
        estadoActual = "frustrated";
    }

    // Regla de Confusión: Tiempos de pulsación largos (Dwell Time)
    else if (ultima.dwellTime > 350) {
        estadoActual = "confused";
    }
      
    // Cumplimos con el requisito del Issue: Imprimir en consola
    console.log(`%c [STATUS] User is ${estadoActual.toUpperCase()} `, 'background: #222; color: #bada55; font-weight: bold;');

    // Guardamos el estado en el dataset para que el envío lo reconozca
    document.body.dataset.auraState = estadoActual;

    // 1. Actualiza la pantalla
    document.getElementById('t-vel').textContent = ultima.velocidadMouse.toFixed(3);
    document.getElementById('t-jit').textContent = ultima.jitter.toFixed(3);
    document.getElementById('t-dw').textContent   = ultima.dwellTime.toFixed(3);
    document.getElementById('t-fl').textContent   = ultima.flightTime.toFixed(3);
    document.getElementById('t-buf').textContent  = bufferGlobal.length;
    
    // 2. ENVÍO AL BACKEND (Lo nuevo)
    enviarAlServidor(ultima);

    // Resetear el flag de rage clicking después de procesar
    if (clickCount > 0) clickCount = 0;
}, 1000);   // Cambio de 500ms a 1000ms para no saturar el servidor local