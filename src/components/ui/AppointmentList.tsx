// src/components/ui/AppointmentList.tsx
import React from 'react';
import { Clock, MapPin, MoreVertical } from 'lucide-react';

interface Appointment {
  id: string;
  patientName: string;
  time: string;
  type: string;
  location: string;
  status: 'confirmed' | 'pending' | 'completed';
}

export const AppointmentList: React.FC = () => {
  const appointments: Appointment[] = [
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

  const getStatusColor = (status: string) => {
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

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Próximas Consultas</h2>
        <p className="text-sm text-gray-600 mt-1">Hoje, 20 Nov 2024</p>
      </div>
      
      <div className="divide-y divide-gray-100">
        {appointments.map((appointment) => (
          <div key={appointment.id} className="p-4 md:p-6 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-3 mb-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                    {appointment.status === 'confirmed' ? 'Confirmado' : 
                     appointment.status === 'pending' ? 'Pendente' : 'Concluído'}
                  </span>
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock size={14} className="mr-1" />
                    {appointment.time}
                  </div>
                </div>
                
                <h3 className="font-semibold text-gray-900 truncate">{appointment.patientName}</h3>
                <p className="text-sm text-gray-600 mt-1">{appointment.type}</p>
                
                <div className="flex items-center text-sm text-gray-500 mt-2">
                  <MapPin size={14} className="mr-1" />
                  {appointment.location}
                </div>
              </div>
              
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors ml-2">
                <MoreVertical size={16} className="text-gray-400" />
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <div className="p-4 md:p-6 border-t border-gray-200">
        <button className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02]">
          Ver Todas as Consultas
        </button>
      </div>
    </div>
  );
};