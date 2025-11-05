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
import ProtectedRoute from "./components/ProtectedRoute"; // ✅ APENAS ESTE
import LoginScreen from "./screens/LoginScreen";
import DashboardScreen from "./screens/DashboardScreen";
import PatientsScreen from "./screens/PatientsScreen";
import PatientDetailScreen from "./screens/PatientDetailScreen";
import ClinicalRecordScreen from "./screens/ClinicalRecordScreen";
import PublicClinicalRecordScreen from "./screens/PublicClinicalRecordScreen";
import GalleryScreen from "./screens/GalleryScreen";
import AppointmentsScreen from "./screens/AppointmentsScreen";
import ProfileScreen from "./screens/ProfileScreen";
import NewPatient from "./screens/NewPatient";
import FinancialControl from "./screens/FinancialControl";
import AnamneseScreen from "./screens/AnamneseScreen";
import PatientFormScreen from "./screens/PatientFormScreen";
import DatabaseCheckScreen from "./screens/DatabaseCheckScreen";

function App() {
  return (
    <SupabaseProvider>
      <AuthProvider>
        <OfflineProvider>
          <Router>
            <div className="min-h-screen bg-gray-50">
              <Routes>
                {/* ========== ROTAS PÚBLICAS (SEM AUTENTICAÇÃO) ========== */}

                {/* Formulário de Anamnese para Paciente - SEM login */}
                <Route
                  path="/patient-form/:shareToken"
                  element={<PatientFormScreen />}
                />

                {/* Login */}
                <Route path="/login" element={<LoginScreen />} />
                <Route
                  path="/database-check"
                  element={<DatabaseCheckScreen />}
                />
                {/* Ficha clínica pública */}
                <Route
                  path="/public/patients/:id/clinical-record"
                  element={
                    <PublicClinicalRecordScreen
                      isPublicMode={false}
                      patientId={""}
                    />
                  }
                />

                {/* ========== ROTAS PROTEGIDAS (COM AUTENTICAÇÃO) ========== */}

                {/* Dashboard */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      {" "}
                      {/* ✅ APENAS ProtectedRoute */}
                      <DashboardScreen />
                    </ProtectedRoute>
                  }
                />

                {/* Anamnese - Modo Clínica (criação/edição) */}
                <Route
                  path="/patients/:patientId/anamnese"
                  element={
                    <ProtectedRoute>
                      {" "}
                      {/* ✅ APENAS ProtectedRoute */}
                      <AnamneseScreen />
                    </ProtectedRoute>
                  }
                />

                {/* Anamnese por ID do formulário */}
                <Route
                  path="/anamnese/form/:formId"
                  element={
                    <ProtectedRoute>
                      {" "}
                      {/* ✅ APENAS ProtectedRoute */}
                      <AnamneseScreen />
                    </ProtectedRoute>
                  }
                />

                {/* Ficha clínica - Rota protegida */}
                <Route
                  path="/patients/:id/clinical-record"
                  element={
                    <ProtectedRoute>
                      {" "}
                      {/* ✅ APENAS ProtectedRoute */}
                      <ClinicalRecordScreen />
                    </ProtectedRoute>
                  }
                />

                {/* Detalhes do paciente */}
                <Route
                  path="/patients/:id"
                  element={
                    <ProtectedRoute>
                      {" "}
                      {/* ✅ APENAS ProtectedRoute */}
                      <PatientDetailScreen />
                    </ProtectedRoute>
                  }
                />

                {/* Lista de pacientes */}
                <Route
                  path="/patients"
                  element={
                    <ProtectedRoute>
                      {" "}
                      {/* ✅ APENAS ProtectedRoute */}
                      <PatientsScreen />
                    </ProtectedRoute>
                  }
                />

                {/* Galeria */}
                <Route
                  path="/gallery"
                  element={
                    <ProtectedRoute>
                      {" "}
                      {/* ✅ APENAS ProtectedRoute */}
                      <GalleryScreen />
                    </ProtectedRoute>
                  }
                />

                {/* Agendamentos */}
                <Route
                  path="/appointments"
                  element={
                    <ProtectedRoute>
                      {" "}
                      {/* ✅ APENAS ProtectedRoute */}
                      <AppointmentsScreen />
                    </ProtectedRoute>
                  }
                />

                {/* Perfil */}
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      {" "}
                      {/* ✅ APENAS ProtectedRoute */}
                      <ProfileScreen />
                    </ProtectedRoute>
                  }
                />

                {/* Novo paciente */}
                <Route
                  path="/patients/new"
                  element={
                    <ProtectedRoute>
                      {" "}
                      {/* ✅ APENAS ProtectedRoute */}
                      <NewPatient />
                    </ProtectedRoute>
                  }
                />

                {/* Controle financeiro */}
                <Route
                  path="/financial-control"
                  element={
                    <ProtectedRoute>
                      {" "}
                      {/* ✅ APENAS ProtectedRoute */}
                      <FinancialControl />
                    </ProtectedRoute>
                  }
                />

                {/* Fallback - redireciona para home */}
                <Route path="*" element={<Navigate to="/" replace />} />
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
              }}
            />
          </Router>
        </OfflineProvider>
      </AuthProvider>
    </SupabaseProvider>
  );
}

export default App;
