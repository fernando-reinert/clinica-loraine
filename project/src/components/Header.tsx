import React from 'react';
import { ArrowLeft, Wifi, WifiOff, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOffline } from '../contexts/OfflineContext';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({ title, showBack = false, rightAction }) => {
  const navigate = useNavigate();
  const { isOnline, syncStatus, pendingChanges } = useOffline();

  return (
    <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-b border-gray-700 safe-area-top">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-3">
          {showBack && (
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-full hover:bg-gray-800 active:scale-95 transition-all"
            >
              <ArrowLeft size={24} className="text-white" />
            </button>
          )}
          <h1 className="text-xl font-semibold">{title}</h1>
        </div>

        <div className="flex items-center space-x-3">
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            {isOnline ? (
              <Wifi size={18} className="text-green-400" />
            ) : (
              <WifiOff size={18} className="text-red-400" />
            )}
            
            {syncStatus === 'syncing' && (
              <RotateCcw size={16} className="text-blue-500 animate-spin" />
            )}
            
            {pendingChanges > 0 && (
              <span className="bg-red-600 text-white text-xs px-3 py-1 rounded-full">
                {pendingChanges}
              </span>
            )}
          </div>

          {/* Right Action */}
          {rightAction && (
            <div className="flex items-center">
              {rightAction}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Header;
