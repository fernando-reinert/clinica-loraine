import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Clock, MapPin, MoreVertical } from 'lucide-react';
export const AppointmentList = () => {
    const appointments = [
        {
            id: '1',
            patientName: 'Ana Silva',
            time: '09:00',
            type: 'Consulta de Rotina',
            location: 'Sala 1',
            status: 'confirmed'
        },
        {
            id: '2',
            patientName: 'Carlos Santos',
            time: '10:30',
            type: 'Retorno',
            location: 'Sala 2',
            status: 'pending'
        },
        {
            id: '3',
            patientName: 'Marina Oliveira',
            time: '11:15',
            type: 'Primeira Consulta',
            location: 'Sala 1',
            status: 'confirmed'
        },
        {
            id: '4',
            patientName: 'Roberto Lima',
            time: '14:00',
            type: 'Exame',
            location: 'Sala 3',
            status: 'completed'
        }
    ];
    const getStatusColor = (status) => {
        switch (status) {
            case 'confirmed':
                return 'bg-green-100 text-green-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'completed':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };
    return (_jsxs("div", { className: "bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden", children: [_jsxs("div", { className: "p-6 border-b border-gray-200", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900", children: "Pr\u00F3ximas Consultas" }), _jsx("p", { className: "text-sm text-gray-600 mt-1", children: "Hoje, 20 Nov 2024" })] }), _jsx("div", { className: "divide-y divide-gray-100", children: appointments.map((appointment) => (_jsx("div", { className: "p-4 md:p-6 hover:bg-gray-50 transition-colors", children: _jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center space-x-3 mb-2", children: [_jsx("span", { className: `px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`, children: appointment.status === 'confirmed' ? 'Confirmado' :
                                                    appointment.status === 'pending' ? 'Pendente' : 'Concluído' }), _jsxs("div", { className: "flex items-center text-sm text-gray-500", children: [_jsx(Clock, { size: 14, className: "mr-1" }), appointment.time] })] }), _jsx("h3", { className: "font-semibold text-gray-900 truncate", children: appointment.patientName }), _jsx("p", { className: "text-sm text-gray-600 mt-1", children: appointment.type }), _jsxs("div", { className: "flex items-center text-sm text-gray-500 mt-2", children: [_jsx(MapPin, { size: 14, className: "mr-1" }), appointment.location] })] }), _jsx("button", { className: "p-2 hover:bg-gray-100 rounded-lg transition-colors ml-2", children: _jsx(MoreVertical, { size: 16, className: "text-gray-400" }) })] }) }, appointment.id))) }), _jsx("div", { className: "p-4 md:p-6 border-t border-gray-200", children: _jsx("button", { className: "w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02]", children: "Ver Todas as Consultas" }) })] }));
};
