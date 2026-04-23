/**
 * @module AffectiveClassifier
 * @description Motor de inferencia para la detección de estados afectivos (Frustración/Concentración).
 * Optimizado para la investigación de Adaptación de Interfaz - Tesis UPEC.
 */

export class AffectiveClassifier {
    constructor() {
        /**
         * Pesos de las señales (Sensibilidad del Sistema)
         * El Rostro tiene prioridad, pero el Mouse (Esfuerzo Motor) es clave en HCI.
         */
        this.weights = {
            face: 0.50,   
            mouse: 0.40,  
            keyboard: 0.10 
        };

        // Umbrales de decisión (Ajustables para laboratorio)
        this.thresholds = {
            frustration: 0.28, // Bajado para detectar frustración temprana
            focus: 0.65       // Nivel de estabilidad para considerar "concentrado"
        };
    }

    /**
     * Clasifica el estado emocional basado en métricas multimodales.
     * @param {Object} metrics - Datos provenientes del buffer y sensores faciales.
     * @returns {Object} Distribución de probabilidades y estado dominante.
     */
    classify(metrics) {
        const { face, mouse, keyboard } = metrics;
        
        let frustrationScore = 0;
        let focusScore = 0;

        // 1. PROCESAMIENTO DE SEÑAL FACIAL
        if (face) {
            // Frustración: Correlación con expresiones de enojo o tensión (angry)
            frustrationScore += (face.angry || 0) * this.weights.face;
            
            // Concentración: Correlación con neutralidad y parpadeo controlado
            focusScore += (face.neutral || 0) * 0.4;
        }

        // 2. PROCESAMIENTO DE SEÑAL DEL MOUSE (Métricas Motoras)
        if (mouse) {
            /**
             * Jitter: El valor normalizado suele ser < 0.1. 
             * Multiplicamos por un factor de sensibilidad (8.0) para que el impacto sea notable.
             */
            const jitterNormalized = mouse.jitter || 0;
            const jitterImpact = Math.min(jitterNormalized * 8.0, 1.0);
            
            frustrationScore += jitterImpact * this.weights.mouse;

            // Rage Clicking: Comportamiento altamente frustrado (Impacto Crítico)
            if (mouse.isRageClicking) {
                frustrationScore += 0.5; // Disparador casi inmediato
            }

            // Estabilidad: Si no hay jitter, se asume mayor control/foco
            if (jitterNormalized > 0 && jitterNormalized < 0.005) {
                focusScore += 0.35;
            }
        }

        // 3. PROCESAMIENTO DE TECLADO (Velocidad de digitación)
        if (keyboard) {
            // El flightTime (latencia entre teclas) indica ritmo. 
            // Un ritmo muy irregular puede sumar a la frustración.
            const typingIrregularity = Math.min((keyboard.typingSpeed || 0) / 1000, 1);
            frustrationScore += typingIrregularity * this.weights.keyboard;
        }

        // 4. NORMALIZACIÓN Y RESULTADOS
        // Aseguramos que los valores estén en el rango [0, 1]
        const fFinal = Math.min(frustrationScore, 1);
        const cFinal = Math.min(focusScore, 1);
        
        // El estado "normal" es el remanente de no estar ni frustrado ni concentrado
        let normalScore = 1 - Math.max(fFinal, cFinal);

        return {
            frustrado: parseFloat(fFinal.toFixed(3)),
            concentrado: parseFloat(cFinal.toFixed(3)),
            normal: parseFloat(Math.max(normalScore, 0).toFixed(3)),
            dominant: this.getDominantState(fFinal, cFinal)
        };
    }

    /**
     * Lógica de umbralización para el cambio de estado de la UI.
     * @param {number} f - Score de frustración.
     * @param {number} c - Score de concentración.
     * @returns {string} 'frustrado' | 'concentrado' | 'normal'
     */
    getDominantState(f, c) {
        if (f > this.thresholds.frustration) {
            return 'frustrado';
        }
        if (c > this.thresholds.focus) {
            return 'concentrado';
        }
        return 'normal';
    }
}