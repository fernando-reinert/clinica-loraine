import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter as Router, Routes, Route, Navigate, } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./contexts/AuthContext";
import { SupabaseProvider } from "./contexts/SupabaseContext";
import { OfflineProvider } from "./contexts/OfflineContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginScreen from "./screens/LoginScreen";
import DashboardScreen from "./screens/DashboardScreen";
import PatientsScreen from "./screens/PatientsScreen";
import PatientDetailScreen from "./screens/PatientDetailScreen";
import AppointmentsScreen from "./screens/AppointmentsScreen";
import AppointmentCreateScreen from "./screens/AppointmentCreateScreen";
import ProfileScreen from "./screens/ProfileScreen";
import NewPatient from "./screens/NewPatient";
import FinancialControl from "./screens/FinancialControl";
import MedicalRecordScreen from "./screens/MedicalRecordScreen";
import GalleryScreen from "./screens/GalleryScreen";
import AnamneseScreen from "./screens/AnamneseScreen";
import AppointmentTreatmentScreen from "./screens/AppointmentTreatmentScreen";
import "./styles/futurist.css";
function App() {
    return (_jsx(SupabaseProvider, { children: _jsx(AuthProvider, { children: _jsx(OfflineProvider, { children: _jsxs(Router, { children: [_jsx("div", { className: "cosmic-bg" }), _jsx("div", { className: "min-h-screen text-white relative", children: _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(LoginScreen, {}) }), _jsx(Route, { path: "/", element: _jsx(Navigate, { to: "/dashboard", replace: true }) }), _jsx(Route, { path: "/dashboard", element: _jsx(ProtectedRoute, { children: _jsx(DashboardScreen, {}) }) }), _jsx(Route, { path: "/patients", element: _jsx(ProtectedRoute, { children: _jsx(PatientsScreen, {}) }) }), _jsx(Route, { path: "/patients/new", element: _jsx(ProtectedRoute, { children: _jsx(NewPatient, {}) }) }), _jsx(Route, { path: "/patients/:id", element: _jsx(ProtectedRoute, { children: _jsx(PatientDetailScreen, {}) }) }), _jsx(Route, { path: "/patients/:id/edit", element: _jsx(ProtectedRoute, { children: _jsx(NewPatient, {}) }) }), _jsx(Route, { path: "/patients/:patientId/anamnese", element: _jsx(ProtectedRoute, { children: _jsx(AnamneseScreen, {}) }) }), _jsx(Route, { path: "/patients/:id/medical-record", element: _jsx(ProtectedRoute, { children: _jsx(MedicalRecordScreen, {}) }) }), _jsx(Route, { path: "/appointments", element: _jsx(ProtectedRoute, { children: _jsx(AppointmentsScreen, {}) }) }), _jsx(Route, { path: "/appointments/new", element: _jsx(ProtectedRoute, { children: _jsx(AppointmentCreateScreen, {}) }) }), _jsx(Route, { path: "/appointments/:appointmentId/treatment", element: _jsx(ProtectedRoute, { children: _jsx(AppointmentTreatmentScreen, {}) }) }), _jsx(Route, { path: "/gallery", element: _jsx(ProtectedRoute, { children: _jsx(GalleryScreen, {}) }) }), _jsx(Route, { path: "/financial-control", element: _jsx(ProtectedRoute, { children: _jsx(FinancialControl, {}) }) }), _jsx(Route, { path: "/profile", element: _jsx(ProtectedRoute, { children: _jsx(ProfileScreen, {}) }) }), _jsx(Route, { path: "/anamnese", element: _jsx(Navigate, { to: "/patients", replace: true }) }), _jsx(Route, { path: "/clinical-record", element: _jsx(Navigate, { to: "/patients", replace: true }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/dashboard", replace: true }) })] }) }), _jsx(Toaster, { position: "top-center", toastOptions: {
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
                            } })] }) }) }) }));
}
export default App;
