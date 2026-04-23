/**
 * @module ABTesting
 * @description Gestión de experimentos A/B y recolección de métricas afectivas.
 * Versión corregida: Integración de actualización de UI y métricas de Tesis UPEC.
 */

import { bufferGlobal } from './sensors/sensors.js';

export class ABTesting {
    /**
     * @param {Object} adapter - Instancia del UIAdapter para conocer el modo actual.
     */
    constructor(adapter) {
        this._adapter = adapter;
        this._inicioTarea = null;
        this._totalTareas = 0;
        
        // Almacén de tiempos para cálculos estadísticos
        this._tiempos = {
            normal: [],
            frustrado: [],
        };

        // Historial para exportación del Dataset (Tesis UPEC)
        this._historial = [];
    }

    /** @returns {boolean} */
    get tareaEnCurso() {
        return this._inicioTarea !== null;
    }

    /**
     * Inicia el cronómetro y limpia el buffer para una medición limpia.
     */
    iniciarTarea() {
        this._inicioTarea = performance.now();
        // Vaciamos el buffer para que las métricas de la tarea anterior 
        // no contaminen la nueva medición.
        bufferGlobal.length = 0; 
        console.info('[ABTesting] ⏳ Tarea iniciada. Capturando métricas del buffer...');
    }

    /**
     * Finaliza la tarea, procesa métricas y actualiza el panel visual.
     * @param {number|null} tiempoManualMs - Tiempo opcional enviado por el iframe.
     */
    completarTarea(tiempoManualMs = null) {
        if (!this._inicioTarea) return null;

        const duracion = tiempoManualMs !== null 
            ? tiempoManualMs 
            : (performance.now() - this._inicioTarea);

        const modo = this._adapter.estadoActual;

        // --- CÁLCULO DE MÉTRICAS MULTIMODALES ---
        const muestras = bufferGlobal;
        
        const jitterPromedio = muestras.length > 0 
            ? muestras.reduce((a, b) => a + (b.jitter || 0), 0) / muestras.length 
            : 0;

        const dwellPromedio = muestras.length > 0 
            ? muestras.reduce((a, b) => a + (b.dwellTime || 0), 0) / muestras.length 
            : 0;

        // Guardar tiempo en el grupo correspondiente
        if (this._tiempos[modo]) {
            this._tiempos[modo].push(duracion);
        }

        this._totalTareas++;
        
        const resultado = {
            tareaNum: this._totalTareas,
            duracionMs: Math.round(duracion),
            modo: modo,
            timestamp: new Date().toISOString(),
            jitterPromedio: parseFloat(jitterPromedio.toFixed(5)),
            dwellPromedio: parseFloat(dwellPromedio.toFixed(5))
        };

        this._historial.push(resultado);
        this._inicioTarea = null;

        console.info('[ABTesting] ✅ Tarea completada:', resultado);

        // ACTUALIZACIÓN AUTOMÁTICA DE LA UI
        this.actualizarPanelResultados();

        return resultado;
    }

    /**
     * Actualiza el DOM con los promedios de tiempo y la conclusión de mejora.
     */
    actualizarPanelResultados() {
        const elA = document.getElementById('ab-grupo-a');
        const elB = document.getElementById('ab-grupo-b');
        const elConclusion = document.getElementById('ab-conclusion');

        const promedioA = this._calcularPromedio(this._tiempos.normal);
        const promedioB = this._calcularPromedio(this._tiempos.frustrado);

        // Actualizar los textos de los grupos en el panel lateral
        if (elA) elA.textContent = `${Math.round(promedioA)} ms (${this._tiempos.normal.length} tareas)`;
        if (elB) elB.textContent = `${Math.round(promedioB)} ms (${this._tiempos.frustrado.length} tareas)`;

        // --- LÓGICA DE CONCLUSIÓN DINÁMICA ---
        if (promedioA > 0 && promedioB > 0) {
            const diferencia = promedioA - promedioB;
            const mejoraPorcentaje = ((diferencia / promedioA) * 100).toFixed(1);

            if (elConclusion) {
                if (diferencia > 0) {
                    elConclusion.innerHTML = `🚀 El Modo Soporte es un <strong>${mejoraPorcentaje}%</strong> más rápido.`;
                    elConclusion.style.color = "#27ae60"; 
                } else if (diferencia < 0) {
                    elConclusion.innerHTML = `⚠️ El Modo Normal es un <strong>${Math.abs(mejoraPorcentaje)}%</strong> más eficiente.`;
                    elConclusion.style.color = "#e67e22";
                } else {
                    elConclusion.textContent = "⚖️ Ambos modos presentan el mismo rendimiento.";
                    elConclusion.style.color = "#3498db";
                }
            }
        } else if (elConclusion) {
            elConclusion.textContent = "Esperando datos de ambos grupos...";
            elConclusion.style.color = "#7f8c8d";
        }
    }

    /**
     * Método auxiliar para obtener el objeto completo de resultados.
     */
    obtenerResultados() {
        const promedioA = this._calcularPromedio(this._tiempos.normal);
        const promedioB = this._calcularPromedio(this._tiempos.frustrado);
        
        const diferencia = promedioA - promedioB;
        const porcentaje = promedioA > 0 ? Math.round((diferencia / promedioA) * 100) : 0;

        return {
            grupoA: { tareas: this._tiempos.normal.length, promedioMs: Math.round(promedioA) },
            grupoB: { tareas: this._tiempos.frustrado.length, promedioMs: Math.round(promedioB) },
            diferenciaMs: Math.round(diferencia),
            mejoraPorcentaje: porcentaje,
            totalTareas: this._totalTareas,
            conclusion: this._formatearConclusion(diferencia, porcentaje)
        };
    }

    _calcularPromedio(arr) {
        return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    _formatearConclusion(diff, porc) {
        if (this._tiempos.normal.length === 0 || this._tiempos.frustrado.length === 0) {
            return "Faltan datos en ambos grupos para comparar.";
        }
        if (diff > 0) return `El soporte es un ${porc}% más eficiente.`;
        if (diff < 0) return `El modo normal es ${Math.abs(porc)}% más rápido.`;
        return "Ambos modos presentan el mismo rendimiento.";
    }

    /**
     * Exportación del Dataset para análisis estadístico (CSV/JSON).
     */
    exportarDataset() {
        if (this._historial.length === 0) {
            alert("No hay muestras registradas aún.");
            return;
        }

        const data = {
            metadata: {
                universidad: "UPEC",
                estudio: "AfectIHM - Adaptación de Interfaz",
                investigadores: "Valeria Lucero, Xavier Guayga y José Guerrero",
                fecha: new Date().toLocaleDateString()
            },
            muestras: this._historial
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `dataset_aura_${Date.now()}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
    }

    reiniciar() {
        this._tiempos = { normal: [], frustrado: [] };
        this._historial = [];
        this._inicioTarea = null;
        this._totalTareas = 0;
        this.actualizarPanelResultados();
        console.warn('[ABTesting] Datos de investigación reseteados.');
    }
}