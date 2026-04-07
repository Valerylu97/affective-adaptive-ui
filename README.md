# 🧠 Aura-UI: Interfaz Adaptativa con Computación Afectiva

> **Proyecto de Maestría en Ingeniería de Software** > Un sistema inteligente que detecta frustración, concentración y confusión mediante señales biométricas indirectas y adapta la interfaz para optimizar la experiencia del usuario (IHM).

---

## 📋 Tabla de Contenidos
- [📖 Introducción](#-introducción)
- [🏗️ Arquitectura del Sistema](#️-arquitectura-del-sistema)
- [🛠️ Stack Tecnológico](#️-stack-tecnológico)
- [♾️ Prácticas DevOps (Estándares de Calidad)](#️-prácticas-devops-estándares-de-calidad)
- [🚀 Guía de Configuración del Entorno](#-guía-de-configuración-del-entorno)
- [🌿 Flujo de Trabajo (GitFlow)](#-flujo-de-trabajo-gitflow)
- [👥 Equipo](#-equipo)

---

## 📖 Introducción
Aura-UI nace de la necesidad de interfaces más humanas. Utilizando el **Bucle de Picard** (Sensing -> Recognizing -> Modeling -> Expressing), el sistema analiza el comportamiento del cursor, la cadencia de tecleo y las micro-expresiones faciales para reaccionar ante la fatiga o frustración cognitiva del usuario.

## 🏗️ Arquitectura del Sistema
El proyecto se divide en tres capas fundamentales procesadas en el **lado del cliente (Edge Computing)** para garantizar la privacidad:

1.  **Capa de Sensado (Input):** Captura de eventos del DOM (mouse/teclado) y flujo de video.
2.  **Capa de Inteligencia (Logic):** Procesamiento con `face-api.js` y clasificación con `TensorFlow.js`.
3.  **Capa de Adaptación (UI):** Manipulación dinámica del DOM para alternar entre "Modo Normal" y "Modo Soporte".

---

## 🛠️ Stack Tecnológico
* **Lenguaje:** JavaScript (ES6+) / HTML5 / CSS3.
* **IA de Visión:** `face-api.js` (detección de expresiones faciales).
* **Motor de ML:** `TensorFlow.js` (para el modelo de clasificación de estados).
* **Base de Datos:** `Supabase` (Almacenamiento de telemetría anónima).
* **Infraestructura:** Node.js v18+.

---

## ♾️ Prácticas DevOps (Estándares de Calidad)
Este repositorio aplica metodologías de nivel industrial para asegurar la estabilidad del software:

### 🛡️ Protección de Ramas
La rama `develop` está blindada con las siguientes reglas:
* **PR Obligatorio:** Nadie puede hacer `push` directo a `develop`.
* **Revisión por Pares:** Se requiere al menos **1 aprobación** de otro integrante para fusionar código.
* **Administradores Incluidos:** Las reglas se aplican a todos los miembros del equipo sin excepción.

### 🔄 Pipeline de Integración Continua (CI)
Uso de **GitHub Actions** (`.github/workflows/ci.yml`) que se dispara en cada Pull Request:
1.  **Checkout:** Descarga del código.
2.  **Environment:** Configuración de Node.js v18.
3.  **Install:** Instalación limpia de dependencias (`npm install`).
4.  **Linting:** Ejecución de `ESLint` para validar sintaxis y buenas prácticas. Si hay errores, el PR se bloquea.

### 📝 Estándar de Commits (Semánticos)
Usamos el estándar **Conventional Commits**:
* `feat:` Nueva funcionalidad.
* `fix:` Corrección de un error.
* `docs:` Cambios en la documentación.
* `chore:` Tareas de mantenimiento (configuraciones, dependencias).

---

## 🚀 Guía de Configuración del Entorno

### 1. Requisitos Previos
Es obligatorio tener instalado:
* **Node.js (LTS v18+):** [Descargar aquí](https://nodejs.org/)
* **Git:** [Descargar aquí](https://git-scm.com/)

### 2. Instalación Paso a Paso
```bash
# 1. Clonar el repositorio
git clone [https://github.com/Valerylu97/affective-adaptive-ui.git](https://github.com/Valerylu97/affective-adaptive-ui.git)

# 2. Entrar a la carpeta
cd affective-adaptive-ui

# 3. Instalar herramientas de desarrollo (ESLint, Prettier, etc.)
npm install
```
### 3. Comandos Útiles
Revisar errores de código: 
```bash
npm run lint
```
Corregir errores de formato automáticamente: 
```bash
npm run lint:fix
```

---

## 🌿 Flujo de Trabajo (GitFlow)
Para añadir una nueva funcionalidad, sigue estos pasos:
### 1. Crea una rama desde develop: 
```bash
git checkout -b feature/nombre-tarea.
```
### 2. Realiza tus cambios y haz commit: 
```bash
git commit -m "feat: descripción".
```
### 3. Sube tu rama: 
```bash
git push origin feature/nombre-tarea.
```
### 4. Abre un Pull Request hacia develop en GitHub y avisa al equipo para la revisión.

---

## 👥 Equipo
* **Integrante A:** Valeria Lucero - DevOps & Backend Infrastructure
* **Integrante B:** Xavier Guaygua - Frontend & IHM Specialist
* **Integrante C:** José Guerrero - Data Scientist & AI Ethics

Última actualización: 06 de Abril, 2026
