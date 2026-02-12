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

### Iteración 2 — Modelos de datos

- [ ] Modelos Mongoose: SurgicalService, OperatingRoom, Session, WaitingList
- [ ] Modelos Mongoose: HistoricalActivity, EmergencyRecord, ReferralRecord, DropoutRecord
- [ ] Modelos FHIR: Patient, ServiceRequest, Schedule
- [ ] Modelo LearnedConstraint

### Iteración 3 — Generación de datos sintéticos

- [ ] Servicio de generación de datos sintéticos
- [ ] Configuración de volúmenes y distribuciones
- [ ] Rutas API para generación, descarga y subida de ficheros

### Iteración 4 — Frontend base

- [ ] Setup React + Vite
- [ ] Layout (Sidebar + Header)
- [ ] Cuadro de mando de gestión de datos
- [ ] Visualizadores de datasets

### Iteración 5 — Módulo predictivo

- [ ] Predictor de demanda, urgencias, derivaciones y bajas
- [ ] Panel de predicciones en frontend

### Iteración 6 — Aprendizaje de restricciones

- [ ] Association rules mining
- [ ] Clustering, decision trees, anomaly detection
- [ ] Dashboard de restricciones descubiertas

### Iteración 7 — Módulo prescriptivo

- [ ] Motor de optimización con criterios seleccionables
- [ ] Hard/soft constraints con pesos
- [ ] Generación de planilla óptima

### Iteración 8 — Planilla y deploy

- [ ] Calendario visual, tabla y comparativa
- [ ] Dockerfile, nginx.conf, supervisord.conf
- [ ] Deploy en Hugging Face Spaces
