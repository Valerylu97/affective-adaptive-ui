/**
 * Aura-UI: Sistema de Interfaz Adaptativa Empática (IAE)
 * Estructura de Telemetría - Semana 1
 */

// 1. Objeto Global de Almacenamiento Temporal (Buffer)
// Aquí se guardarán los eventos de mouse y teclado antes de ser procesados.
const IAE_DataBuffer = [];

/**
 * 2. Función de Registro (Helper para el Integrante B)
 * Permite añadir datos al buffer de forma estandarizada.
 */
const recordTelemetry = (type, data) => {
    const entry = {
        timestamp: new Date().toISOString(),
        type: type, // 'mouse' o 'keyboard'
        payload: data
    };
    
    IAE_DataBuffer.push(entry);
    
    // Opcional: Mostrar latido en consola para el "Heartbeat"
    console.log(`[IAE Heartbeat] Evento registrado: ${type}`);
};

// Exportar para que Xavier pueda usarlo en su script de sensores
// (Si usas módulos de ES6, de lo contrario omitir 'export')
// export { IAE_DataBuffer, recordTelemetry };

console.log("IAE System: Infrastructure initialized. Waiting for sensors...");