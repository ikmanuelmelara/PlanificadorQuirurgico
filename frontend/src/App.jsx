import { Routes, Route } from 'react-router-dom';
import MainLayout from './components/Layout/MainLayout';
import MainDashboard from './components/Dashboard/MainDashboard';
import DataDashboard from './components/DataManagement/DataDashboard';
import PredictionPanel from './components/Prediction/PredictionPanel';
import ConstraintsDashboard from './components/Constraints/ConstraintsDashboard';
import OptimizationPanel from './components/Optimization/OptimizationPanel';

// Placeholder pages for future iterations
function PlaceholderPage({ title }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-700">{title}</h2>
        <p className="mt-2 text-gray-500">Disponible en próximas iteraciones</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<MainDashboard />} />
        <Route path="/datos" element={<DataDashboard />} />
        <Route path="/prediccion" element={<PredictionPanel />} />
        <Route path="/restricciones" element={<ConstraintsDashboard />} />
        <Route path="/optimizacion" element={<OptimizationPanel />} />
        <Route path="/planilla" element={<PlaceholderPage title="Planilla Óptima" />} />
      </Route>
    </Routes>
  );
}
