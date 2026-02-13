# Planificador de Sesiones Quirúrgicas Inteligente

Sistema de optimización del calendario de reparto de sesiones quirúrgicas por servicio. No es un programador de cirugías individuales, sino un planificador que distribuye sesiones de quirófano entre servicios quirúrgicos de forma óptima.

## Stack Técnico

- **Backend**: Node.js con Express
- **Frontend**: React con Vite
- **Base de datos**: MongoDB Atlas (conexión externa vía `MONGODB_URI`)
- **Estándar**: FHIR R4 para datos sanitarios
- **Deploy**: Hugging Face Spaces (Docker, puerto 7860)

## Estructura de Carpetas

```
├── backend/
│   ├── src/
│   │   ├── index.js                  # Servidor Express (puerto 7860)
│   │   ├── config/
│   │   │   └── database.js           # Conexión MongoDB Atlas
│   │   ├── models/
│   │   │   ├── fhir/                 # Patient, ServiceRequest, Schedule
│   │   │   ├── SurgicalService.js
│   │   │   ├── OperatingRoom.js
│   │   │   ├── Session.js
│   │   │   ├── WaitingList.js
│   │   │   ├── HistoricalActivity.js
│   │   │   ├── EmergencyRecord.js
│   │   │   ├── ReferralRecord.js
│   │   │   ├── DropoutRecord.js
│   │   │   └── LearnedConstraint.js
│   │   ├── services/
│   │   │   ├── dataGenerator/        # Generación de datos sintéticos
│   │   │   ├── fileHandler/          # Import/export de ficheros
│   │   │   ├── prediction/           # Módulo predictivo
│   │   │   ├── learning/             # Aprendizaje de restricciones
│   │   │   └── optimization/         # Módulo prescriptivo
│   │   └── routes/
│   │       ├── fhir/
│   │       ├── data.routes.js
│   │       ├── prediction.routes.js
│   │       ├── learning.routes.js
│   │       ├── optimization.routes.js
│   │       └── schedule.routes.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── components/
│   │       ├── Layout/               # Sidebar, Header
│   │       ├── Dashboard/            # Panel principal
│   │       ├── DataManagement/       # Cuadro de mando de datos
│   │       │   └── DatasetViewer/    # Visualizadores por tipo de dato
│   │       ├── Prediction/           # Panel de predicciones
│   │       ├── Constraints/          # Restricciones aprendidas
│   │       ├── Optimization/         # Criterios y pesos
│   │       ├── Schedule/             # Planilla óptima
│   │       └── Common/              # Charts, Tables reutilizables
│   ├── package.json
│   └── vite.config.js
├── Dockerfile
├── nginx.conf
├── supervisord.conf
└── CLAUDE.md                         # Este archivo
```

## Comandos Útiles

### Backend

```bash
cd backend
npm install          # Instalar dependencias
npm run dev          # Arrancar con nodemon (desarrollo)
npm start            # Arrancar en producción
```

El servidor escucha en `http://localhost:7860`. Health check en `GET /api/health`.

### Variables de Entorno

```
MONGODB_URI=mongodb+srv://...    # Conexión a MongoDB Atlas
PORT=7860                        # Puerto del servidor (default 7860)
```

Si `MONGODB_URI` no está definida, el servidor arranca pero sin conexión a BD.

## Módulos del Sistema

1. **Gestión de datos** — Generación de datos sintéticos con cuadro de mando interactivo (configurar volúmenes, generar, descargar, subir ficheros)
2. **Módulo predictivo** — Predice hasta la fecha de corte: entradas LEQ, urgencias diferidas/inmediatas, derivaciones, bajas
3. **Aprendizaje de restricciones** — Descubre restricciones explícitas e implícitas del histórico (association rules, clustering, decision trees, anomaly detection)
4. **Módulo prescriptivo** — Optimización multicriterio con hard/soft constraints y pesos ajustables
5. **Planilla óptima** — Calendario de sesiones por servicio/quirófano con comparativa vs actual

### Tipos de sesión

- **Mañana (M)**: 08:00 – 15:00
- **Tarde (T)**: 15:00 – 22:00
- **Continuada (C)**: 08:00 – 20:00

### Prioridades CatSalut

| Prioridad | Plazo máximo |
|---|---|
| Oncológico Prioritario | 45 días |
| Oncológico Estándar | 60 días |
| Cardíaca | 90 días |
| Garantizado 180 | 180 días |
| Referencia P1 | 90 días |
| Referencia P2 | 180 días |
| Referencia P3 | 365 días |

## Estado Actual del Desarrollo

### Iteración 1 — Scaffold (completada)

- [x] Estructura de carpetas (backend y frontend)
- [x] `backend/package.json` con dependencias (express, mongoose, cors, dotenv)
- [x] `backend/src/index.js` — Servidor Express con health check en `/api/health`
- [x] `backend/src/config/database.js` — Conexión a MongoDB Atlas

## Próximos Pasos

### Iteración 2 — Modelos de datos (completada)

- [x] SurgicalService.js — Servicios quirúrgicos con especialidades, duraciones medias por prioridad, quirófanos permitidos
- [x] OperatingRoom.js — Quirófanos con equipamiento, servicios permitidos, disponibilidad semanal
- [x] Session.js — Sesiones (M/T/C) con auto-cálculo de horarios, índice único room+date+type
- [x] WaitingList.js — LEQ con prioridades CatSalut, auto-cálculo de garantía y días en espera
- [x] LearnedConstraint.js — Restricciones explícitas/descubiertas con métricas de calidad
- [x] HistoricalActivity.js — Actividad quirúrgica histórica con duraciones planificadas vs reales
- [x] EmergencyRecord.js — Urgencias inmediatas/diferidas con desplazamiento de sesiones
- [x] ReferralRecord.js — Derivaciones a centros externos con motivos y seguimiento
- [x] DropoutRecord.js — Bajas de LEQ con motivos CatSalut y snapshot de estado
- [x] FHIR Patient.js — Recurso FHIR R4 Patient simplificado
- [x] FHIR ServiceRequest.js — Solicitud quirúrgica con mapeo prioridad FHIR/CatSalut
- [x] FHIR Schedule.js — Calendario FHIR con horizonte de planificación y sesiones

### Iteración 3 — Generación de datos sintéticos (completada)

- [x] configPresets.js — Volúmenes por defecto, distribuciones CatSalut, catálogo servicios/quirófanos/procedimientos
- [x] waitingListGenerator.js — Genera pacientes sintéticos con distribución exponencial, FHIR Patient + ServiceRequest
- [x] syntheticDataGenerator.js — Orquestador: generateAll, seedServicesAndRooms, histórico, urgencias, derivaciones, bajas, sesiones
- [x] data.routes.js — POST /generate, GET /waiting-list, GET /statistics, GET /export/:type, POST /import/:type
- [x] index.js actualizado con rutas de datos

### Iteración 4 — Frontend base (completada)

- [x] Setup React 18 + Vite + Tailwind CSS + React Router + Axios + Recharts
- [x] Layout: Sidebar con navegación activa, Header con selector de fecha de corte, MainLayout wrapper
- [x] Dashboard principal con métricas del sistema (conectado a /api/health y /api/data/statistics)
- [x] Rutas: /, /datos, /prediccion, /restricciones, /optimizacion, /planilla
- [x] Cuadro de mando de gestión de datos (DataDashboard con tabs: Generar, LEQ, Descargar, Subir)
- [x] VolumeConfigurator: sliders + distribución prioridad con validación 100%
- [x] WaitingListViewer: tabla paginada con filtros, gráficos Recharts por prioridad/servicio
- [x] FileUploader: drag & drop con validación JSON, selección de tipo y replace
- [x] FileDownloader: descarga por tipo de dataset
- [x] services/api.js: capa Axios centralizada

### Iteración 5 — Módulo predictivo (completada)

- [x] demandPredictor.js: tasa histórica por servicio con estacionalidad
- [x] emergencyPredictor.js: urgencias diferidas/inmediatas por servicio
- [x] referralPredictor.js: derivaciones por servicio y motivo
- [x] dropoutPredictor.js: bajas por servicio y motivo
- [x] predictionOrchestrator.js: orquesta predictores, persiste resultados en BD
- [x] prediction.routes.js: POST /run, GET /latest, GET /history
- [x] PredictionPanel.jsx: selector de módulos, ejecutar/cargar predicción
- [x] PredictionResults.jsx: cards, tabla por servicio, bar chart agrupado, pie charts
- [x] api.js actualizado con runPrediction, getLatestPrediction, getPredictionHistory

### Iteración 6 — Aprendizaje de restricciones (completada)

- [x] associationRulesMiner.js: Apriori simplificado con soporte, confianza, lift
- [x] patternClusterer.js: K-Means con detección de outliers por distancia
- [x] decisionTreeBuilder.js: ID3 con extracción de reglas IF-THEN e importancia de features
- [x] anomalyDetector.js: detección por ausencia, combinaciones raras, outliers de duración
- [x] constraintLearner.js: orquestador que clasifica en explícitas/descubiertas y persiste en LearnedConstraint
- [x] learning.routes.js: POST /run, GET /constraints, PUT /constraints/:id/validate, GET /summary
- [x] ConstraintsDashboard.jsx: botón aprender, resumen, tabs (todas/explícitas/descubiertas/validadas/pendientes)
- [x] ConstraintsList.jsx: tabla con filtros, acciones validar/rechazar, paginación
- [x] ConstraintDetail.jsx: modal con regla JSON formateada, métricas, botones validar/rechazar
- [x] DiscoveryMethodsChart.jsx: pie chart por método, bar chart por categoría
- [x] api.js actualizado con runLearning, getConstraints, validateConstraint, getLearningSummary

### Iteración 7 — Módulo prescriptivo

- [ ] Motor de optimización con criterios seleccionables
- [ ] Hard/soft constraints con pesos
- [ ] Generación de planilla óptima

### Iteración 8 — Planilla y deploy

- [ ] Calendario visual, tabla y comparativa
- [ ] Dockerfile, nginx.conf, supervisord.conf
- [ ] Deploy en Hugging Face Spaces
