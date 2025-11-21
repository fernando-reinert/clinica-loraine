// src/App.tsx - VERSÃO SIMPLIFICADA
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
import PublicClinicalRecordScreen from "./screens/PublicClinicalRecordScreen";
import GalleryScreen from "./screens/GalleryScreen";
import AppointmentsScreen from "./screens/AppointmentsScreen";
import AppointmentCreateScreen from "./screens/AppointmentCreateScreen";
import ProfileScreen from "./screens/ProfileScreen";
import NewPatient from "./screens/NewPatient";
import FinancialControl from "./screens/FinancialControl";
import AnamneseScreen from "./screens/AnamneseScreen";
import PatientFormScreen from "./screens/PatientFormScreen";
import DatabaseCheckScreen from "./screens/DatabaseCheckScreen";
import SignUpForm from "./screens/SignUpForm";
import MedicalRecordScreen from "./screens/MedicalRecordScreen";

function App() {
  return (
    <SupabaseProvider>
      <AuthProvider>
        <OfflineProvider>
          <Router>
            <div className="min-h-screen bg-gray-50">
              <Routes>
                {/* ========== ROTAS PÚBLICAS ========== */}
                <Route path="/login" element={<LoginScreen />} />
                <Route path="/signup" element={<SignUpForm />} />
                
                <Route
                  path="/patient-form/:shareToken"
                  element={<PatientFormScreen />}
                />

                <Route
                  path="/public/patients/:id/clinical-record"
                  element={
                    <PublicClinicalRecordScreen
                      isPublicMode={true}
                      patientId={""}
                    />
                  }
                />

                <Route path="/database-check" element={<DatabaseCheckScreen />} />

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

                {/* Galeria */}
                <Route path="/gallery" element={
                  <ProtectedRoute>
                    <GalleryScreen />
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
                duration: 3000,
                style: {
                  background: "#fff",
                  color: "#374151",
                  borderRadius: "12px",
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                },
                success: {
                  iconTheme: {
                    primary: "#10B981",
                    secondary: "#FFFFFF",
                  },
                },
                error: {
                  iconTheme: {
                    primary: "#EF4444",
                    secondary: "#FFFFFF",
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