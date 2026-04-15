/* eslint-disable */
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// 1. Configuración de rutas de archivos
const logsPath = './server/telemetry_logs.json';

// Asegurar que el archivo de logs exista al iniciar
if (!fs.existsSync(logsPath)) {
    fs.writeFileSync(logsPath, '[]', 'utf8');
}

// 2. Middlewares
app.use(cors());
app.use(express.json());
// Servir archivos estáticos (index.html)
app.use(express.static(path.join(__dirname, '../'))); 
// Servir archivos estáticos (css)
app.use('/public', express.static(path.join(__dirname, '../public')));
// Sevir archivos estáticos (engine.js)
app.use('/src', express.static(path.join(__dirname, '../src')));

// 3. Ruta para recibir telemetría
app.post('/api/telemetry', (req, res) => {
    const data = req.body;
    const timestamp = new Date().toLocaleTimeString();

    // VISIBILIDAD EN CONSOLA: Para que monitorees el flujo de datos
    console.log(`--------------------------------------------------`);
    console.log(`[${timestamp}] 📥 MUESTRA RECIBIDA`);
    console.log(`   🧠 Estado: ${data.classification.current_state.toUpperCase()}`);
    console.log(`   🖱️ Mouse:  Vel: ${data.metrics.mouse.velocity_norm.toFixed(3)}`);
    console.log(`   ⌨️ Teclado: Dwell: ${data.metrics.keyboard.dwell_time_norm.toFixed(3)}`);

    // PERSISTENCIA (Sincrónica para evitar colisiones de datos)
    try {
        let logs = [];
        
        // 1. Leer el archivo
        if (fs.existsSync(logsPath)) {
            const fileData = fs.readFileSync(logsPath, 'utf8').trim();
            
            // 2. Solo intentar parsear si el archivo NO está vacío
            if (fileData.length > 0) {
                try {
                    logs = JSON.parse(fileData);
                } catch {
                    console.warn("⚠️ Archivo corrupto, reiniciando logs...");
                    logs = [];
                }
            }
        }
        
        // 3. Agregar la nueva muestra
        logs.push({
            full_timestamp: new Date().toISOString(),
            ...data
        });

        // 4. Guardar con validación
        fs.writeFileSync(logsPath, JSON.stringify(logs, null, 2), 'utf8');
        res.status(200).json({ status: "ok" });

    } catch (err) {
        console.error("❌ Error crítico en persistencia:", err.message);
        res.status(500).json({ error: "Fallo en el servidor" });
    }
});

// 4. Inicio del servidor
app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`🚀 AURA SERVER - POSGRADO UPEC`);
    console.log(`📡 Corriendo en: http://localhost:${PORT}`);
    console.log(`📂 Logs en: ${logsPath}`);
    console.log(`⚠️  Abre http://localhost:${PORT}/index.html en tu navegador`);
    console.log(`==================================================\n`);
});