/* global faceapi */

export async function startFaceDetection() {
    const MODEL_URL = '/models'; 
    
    try {
        // USAR Promise.all para asegurar que TODOS los modelos estén listos
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
        ]);
        console.log("IA: Modelos cargados con éxito");
    } catch (error) {
        console.error("IA: Error cargando modelos desde " + MODEL_URL, error);
        return null;
    }

    const video = document.getElementById('video');
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
        video.srcObject = stream;
        await video.play();
        return video;
    } catch (err) {
        // Usamos 'err' para ver el motivo real en la consola (NotAllowedError, NotFoundError, etc.)
        console.warn("IA: No se pudo acceder a la cámara. Detalle:", err.name);
        return null;
    }
}

export async function getFaceMetrics(video) {
    // Detecta la cara y las expresiones
    const detection = await faceapi.detectSingleFace(video, 
        new faceapi.TinyFaceDetectorOptions()).withFaceExpressions();

    if (detection) {
        return {
            angry: detection.expressions.angry,
            neutral: detection.expressions.neutral,
            happy: detection.expressions.happy
        };
    }
    return null;
}

/**
 * Detiene físicamente la cámara y libera el hardware
 * @param {HTMLVideoElement} video - El elemento de video de la UI
 */
export function stopFaceDetection(video) {
    if (video && video.srcObject) {
        const stream = video.srcObject;
        const tracks = stream.getTracks();

        tracks.forEach(track => {
            track.stop(); // Detiene el hardware (apaga el LED)
        });

        video.srcObject = null; // Limpia el elemento de video
        console.log("IA: Cámara apagada correctamente.");
    }
}