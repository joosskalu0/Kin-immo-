import React from 'react';
import { useApp } from '../../context/AppContext';
import { AgentInviteManager } from './AgentInviteManager';
import { X } from 'lucide-react';

export const AgentInviteModal: React.FC = () => {
  const { isInviteModalOpen, setIsInviteModalOpen } = useApp();

  if (!isInviteModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl my-8">
        <button
          type="button"
          onClick={() => setIsInviteModalOpen(false)}
          className="absolute top-4 right-4 z-10 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        <AgentInviteManager />
      </div>
    </div>
  );
};
