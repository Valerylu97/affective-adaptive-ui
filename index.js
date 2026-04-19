/**
 * Aura-UI: Sistema de Interfaz Adaptativa Empática (IAE)
 * Estructura de Telemetría - Semana 1
 */

import { checkEmotionalState } from './src/logic/engine.js';

// 1. Objeto Global de Almacenamiento Temporal (Buffer)
export const IAE_DataBuffer = [];

/**
 * 2. Función de Registro (Helper para el Integrante B)
 */
export const recordTelemetry = (type, data) => {
    const entry = {
        timestamp: new Date().toISOString(),
        type: type, // 'mouse' o 'keyboard'
        payload: data
    };
    
    IAE_DataBuffer.push(entry);
    checkEmotionalState(entry);
     
    console.log(`[IAE Heartbeat] Evento registrado: ${type}`);
};

// Mensaje inicial de infraestructura
 
console.log("IAE System: Infrastructure initialized. Module Mode Active.");