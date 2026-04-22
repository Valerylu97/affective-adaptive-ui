/**
 * @module Engine
 * @description Orquestador central del sistema Aura-UI.
 * Gestiona el ciclo de vida de los sensores, el motor de inferencia afectiva
 * y la lógica de experimentación para la tesis UPEC.
 */

import { UIAdapter } from '../ui/UIAdapter.js';
import { bufferGlobal, startSensors, stopSensors, isSensing } from '../sensors/sensors.js';
import { ABTesting } from '../ab-testing.js';
import { getFaceMetrics, startFaceDetection, stopFaceDetection } from '../sensors/face_sensor.js';
import { AffectiveClassifier } from './classifier.js';

/**
 * 1. INICIALIZACIÓN DE COMPONENTES CORE
 */
const adapter = new UIAdapter({
    rootSelector: 'body',
    onStateChange: ({ to }) => {
        console.info(`[Aura] Cambio de interfaz a: ${to}`);
        const label = document.getElementById('estado-label');
        if (label) label.textContent = to;
    },
});

const ab = new ABTesting(adapter);
const classifier = new AffectiveClassifier();

// Variables de control de estado
let clickCount = 0;
let isRageClicking = false;
let lastClickTime = 0;
let lastElement = null;
let videoElement = null;
let inferenceInterval = null;

/**
 * 2. GESTIÓN DE SENSORES Y PRIVACIDAD
 */
async function inicializarSistemaAfectivo() {
    if (isSensing()) return; 

    console.warn("[Aura] Iniciando protocolos de captura afectiva...");
    
    try {
        startSensors();
        videoElement = await startFaceDetection();
        
        if (videoElement) {
            iniciarBucleInferencia();
            const btnPriv = document.getElementById('btn-privacidad');
            if (btnPriv) btnPriv.textContent = '⏹ Detener sensores';
            
            // Sincronización inicial con el modo seleccionado en el HTML
            const modoInicial = document.querySelector('input[name="test-mode"]:checked')?.value;
            if (modoInicial && modoInicial !== 'auto') {
                adapter.applyAdaptation(modoInicial);
            }
        }
    } catch (err) {
        console.error("[Aura] Error crítico al acceder a los sensores:", err);
    }
}

/**
 * 3. BUS DE EVENTOS (Comunicación Inter-Módulos)
 */
window.addEventListener('init-aura-sensors', () => {
    inicializarSistemaAfectivo();
});

window.addEventListener('aura-task-start', () => {
    ab.iniciarTarea(); 
    const estadoLabel = document.getElementById('estado-label');
    if (estadoLabel) {
        estadoLabel.textContent = "GRABANDO MÉTRICAS...";
        estadoLabel.style.color = "#e67e22"; 
    }
});

window.addEventListener('message', (event) => {
    const { type, action, duration } = event.data;

    if (type === 'EXPERIMENT_EVENT') {
        if (action === 'task_completed') {
            const fueRegistrado = ab.completarTarea(duration);
            if (fueRegistrado) {
                actualizarPanelAB();
                const estadoLabel = document.getElementById('estado-label');
                if (estadoLabel) {
                    estadoLabel.textContent = adapter.estadoActual;
                    estadoLabel.style.color = "";
                }
            }
        }
        if (action === 'trigger_frustration') {
            activarSoporteConExplicacion('motor'); // Trigger manual desde el experimento
        }
    }
});

/**
 * 4. MOTOR DE INFERENCIA AFECTIVA (Control Híbrido)
 */
function iniciarBucleInferencia() {
    if (inferenceInterval) clearInterval(inferenceInterval);

    inferenceInterval = setInterval(async () => {
        if (!isSensing() || !videoElement) return;

        // Prioridad: ¿Estamos en modo manual o automático?
        const selectorModo = document.querySelector('input[name="test-mode"]:checked')?.value || 'auto';

        const ultimaMuestra = bufferGlobal.at(-1);
        if (!ultimaMuestra) return;

        let cara = null;
        try { cara = await getFaceMetrics(videoElement); }
        catch (err) {
            console.error("Error en engine.js:", err);
        }

        const datosEntrada = {
            face: cara,
            mouse: { 
                jitter: ultimaMuestra.jitter, 
                isRageClicking: isRageClicking 
            },
            keyboard: { 
                typingSpeed: ultimaMuestra.flightTime 
            }
        };

        const prediccion = classifier.classify(datosEntrada);
        const nuevoEstadoIA = prediccion.dominant;
        const estadoActualUI = adapter.estadoActual;

        // LÓGICA DE DECISIÓN (Integración con Panel de Transparencia)
        if (selectorModo === 'auto') {
            const esEstadoCritico = ab.tareaEnCurso && estadoActualUI === 'frustrado';
            
            if (!esEstadoCritico && nuevoEstadoIA !== estadoActualUI) {
                if (nuevoEstadoIA === 'frustrado') {
                    // Decidimos la métrica disparadora para la explicación
                    let razon = 'mixto';
                    if (prediccion.frustrado > 0.6 && ultimaMuestra.jitter < 0.05) razon = 'facial';
                    else if (ultimaMuestra.jitter > 0.07 || isRageClicking) razon = 'motor';
                    
                    activarSoporteConExplicacion(razon);
                } else {
                    adapter.applyAdaptation('normal');
                }
            }
        } else {
            // Modo Manual (Investigador)
            if (estadoActualUI !== selectorModo) {
                if (selectorModo === 'frustrado') {
                    activarSoporteConExplicacion('default');
                } else {
                    adapter.applyAdaptation('normal');
                }
            }
        }

        actualizarTelemetriaUI(ultimaMuestra, cara, prediccion, (selectorModo === 'auto' ? nuevoEstadoIA : selectorModo));
        
        isRageClicking = false;
        clickCount = 0;
    }, 500);
}

/**
 * 5. FUNCIÓN DE TRANSPARENCIA Y EXPLICABILIDAD (Semana 4)
 * Muestra al usuario qué estado se detectó y por qué.
 */
function activarSoporteConExplicacion(metricaDisparadora) {
    const labelRazon = document.getElementById('razon-activacion');
    let mensaje = "";

    switch(metricaDisparadora) {
        case 'facial':
            mensaje = "Detectamos gestos de tensión o frustración en su expresión facial.";
            break;
        case 'motor':
            mensaje = "Detectamos movimientos erráticos (Jitter alto) y lentitud en la interacción.";
            break;
        case 'mixto':
            mensaje = "Se detectó una combinación de fatiga visual y alta carga motora.";
            break;
        default:
            mensaje = "Intervención manual del investigador o protocolo de prueba.";
    }

    if (labelRazon) labelRazon.textContent = mensaje;
    
    // Aplicar cambio visual
    adapter.applyAdaptation('frustrado');
    console.info(`[Transparencia] Soporte activado por: ${metricaDisparadora}`);
}

/**
 * 6. CONTROL DE PROTOCOLO (Investigación A/B)
 */
document.addEventListener('change', (e) => {
    if (e.target.name === 'test-mode') {
        const modoManual = e.target.value;
        if (modoManual !== 'auto') {
            if (modoManual === 'frustrado') {
                activarSoporteConExplicacion('default');
            } else {
                adapter.applyAdaptation('normal');
            }
        }
    }
});

/**
 * 7. UTILIDADES DE TELEMETRÍA
 */
function actualizarTelemetriaUI(ultima, cara, prediccion, estadoMostrado) {
    const tVel = document.getElementById('t-vel');
    const tJit = document.getElementById('t-jit');
    if (!tVel || !tJit) return;

    tVel.textContent = ultima.velocidadMouse.toFixed(4);
    tJit.textContent = ultima.jitter.toFixed(4);
    
    if (document.getElementById('t-dw')) document.getElementById('t-dw').textContent = ultima.dwellTime.toFixed(4);
    if (document.getElementById('t-buf')) document.getElementById('t-buf').textContent = bufferGlobal.length;

    const panelFace = document.getElementById('t-face');
    if (panelFace && cara) {
        panelFace.innerHTML = `
            <div style="font-weight: bold; color: ${estadoMostrado === 'frustrado' ? '#D85A30' : '#3498db'}">
                SISTEMA: ${estadoMostrado.toUpperCase()}
            </div>
            <div style="font-size: 0.85em; margin-top: 4px; color: #666;">
                IA detecta -> F: ${Math.round(prediccion.frustrado * 100)}% | C: ${Math.round(prediccion.concentrado * 100)}%
            </div>
        `;
    }
}

function actualizarPanelAB() {
    ab.actualizarPanelResultados(); // Usamos el método unificado de la clase ABTesting
}

/**
 * 8. LISTENERS DE INTERACCIÓN Y PRIVACIDAD
 */
document.addEventListener('click', (e) => {
    const ahora = performance.now();
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
        console.warn("⚠️ Rage Clicking detectado!");
    }
});

document.getElementById('btn-exportar')?.addEventListener('click', () => {
    ab.exportarDataset();
});

document.getElementById('btn-privacidad')?.addEventListener('click', async () => {
    if (isSensing()) {
        stopSensors(); 
        stopFaceDetection(videoElement); 
        if (inferenceInterval) clearInterval(inferenceInterval);
        document.getElementById('btn-privacidad').textContent = '▶ Activar sensores';
        adapter.applyAdaptation('normal');
    } else {
        inicializarSistemaAfectivo();
    }
});