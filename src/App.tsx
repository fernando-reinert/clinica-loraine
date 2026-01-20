// src/App.tsx - DESIGN FUTURISTA COMPLETO
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./contexts/AuthContext";
import { SupabaseProvider } from "./contexts/SupabaseContext";
import { OfflineProvider } from "./contexts/OfflineContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginScreen from "./screens/LoginScreen";
import DashboardScreen from "./screens/DashboardScreen";
import PatientsScreen from "./screens/PatientsScreen";
import PatientDetailScreen from "./screens/PatientDetailScreen";
import ClinicalRecordScreen from "./screens/ClinicalRecordScreen";
import AppointmentsScreen from "./screens/AppointmentsScreen";
import AppointmentCreateScreen from "./screens/AppointmentCreateScreen";
import ProfileScreen from "./screens/ProfileScreen";
import NewPatient from "./screens/NewPatient";
import FinancialControl from "./screens/FinancialControl";
import MedicalRecordScreen from "./screens/MedicalRecordScreen";
import GalleryScreen from "./screens/GalleryScreen";
import AnamneseScreen from "./screens/AnamneseScreen";
import AppointmentTreatmentScreen from "./screens/AppointmentTreatmentScreen";
import ProceduresScreen from "./screens/ProceduresScreen";

import "./styles/futurist.css";

function App() {
  return (
    <SupabaseProvider>
      <AuthProvider>
        <OfflineProvider>
          <Router>
            {/* 🌌 Background Cosmic Fixo */}
            <div className="cosmic-bg"></div>
            
            <div className="min-h-screen text-white relative">
              <Routes>
                {/* ========== ROTAS PÚBLICAS ========== */}
                <Route path="/login" element={<LoginScreen />} />
                
                {/* ========== ROTAS PROTEGIDAS ========== */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <DashboardScreen />
                  </ProtectedRoute>
                } />

                {/* Pacientes */}
                <Route path="/patients" element={
                  <ProtectedRoute>
                    <PatientsScreen />
                  </ProtectedRoute>
                } />

                <Route path="/patients/new" element={
                  <ProtectedRoute>
                    <NewPatient />
                  </ProtectedRoute>
                } />

                <Route path="/patients/:id" element={
                  <ProtectedRoute>
                    <PatientDetailScreen />
                  </ProtectedRoute>
                } />

                <Route path="/patients/:id/edit" element={
                  <ProtectedRoute>
                    <NewPatient />
                  </ProtectedRoute>
                } />

                {/* Anamnese */}
                <Route path="/patients/:patientId/anamnese" element={
                  <ProtectedRoute>
                    <AnamneseScreen />
                  </ProtectedRoute>
                } />

                {/* Prontuário Médico */}
                <Route path="/patients/:id/medical-record" element={
                  <ProtectedRoute>
                    <MedicalRecordScreen />
                  </ProtectedRoute>
                } />

                {/* Agendamentos */}
                <Route path="/appointments" element={
                  <ProtectedRoute>
                    <AppointmentsScreen />
                  </ProtectedRoute>
                } />

                <Route path="/appointments/new" element={
                  <ProtectedRoute>
                    <AppointmentCreateScreen />
                  </ProtectedRoute>
                } />

                <Route path="/appointments/:appointmentId/treatment" element={
                  <ProtectedRoute>
                    <AppointmentTreatmentScreen />
                  </ProtectedRoute>
                } />

                {/* Galeria */}
                <Route path="/gallery" element={
                  <ProtectedRoute>
                    <GalleryScreen />
                  </ProtectedRoute>
                } />

                {/* Catálogo de Procedimentos */}
                <Route path="/procedures" element={
                  <ProtectedRoute>
                    <ProceduresScreen />
                  </ProtectedRoute>
                } />

                {/* Financeiro */}
                <Route path="/financial-control" element={
                  <ProtectedRoute>
                    <FinancialControl />
                  </ProtectedRoute>
                } />

                {/* Perfil */}
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <ProfileScreen />
                  </ProtectedRoute>
                } />

                {/* Rotas de redirecionamento */}
                <Route path="/anamnese" element={<Navigate to="/patients" replace />} />
                <Route path="/clinical-record" element={<Navigate to="/patients" replace />} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </div>

            <Toaster
              position="top-center"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'rgba(42, 43, 69, 0.95)',
                  backdropFilter: 'blur(20px)',
                  color: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                },
                success: {
                  iconTheme: {
                    primary: '#00ff88',
                    secondary: '#1a1b2f',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#1a1b2f',
                  },
                },
              }}
            />
          </Router>
        </OfflineProvider>
      </AuthProvider>
    </SupabaseProvider>
  );
}

export default App;