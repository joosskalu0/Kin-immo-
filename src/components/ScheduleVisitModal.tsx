import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Property } from '../types';
import { convertAndFormatPrice } from '../utils/currency';
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  CheckCircle2,
  X,
  Phone,
  User,
  MessageCircle,
  Sparkles,
  Building2,
} from 'lucide-react';

interface ScheduleVisitModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ScheduleVisitModal: React.FC<ScheduleVisitModalProps> = ({
  property,
  isOpen,
  onClose,
}) => {
  const { user, currency, addLeadRequest, agents } = useApp();

  const [visitType, setVisitType] = useState<'in_person' | 'video'>('in_person');
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [selectedTime, setSelectedTime] = useState('10:00');
  const [clientName, setClientName] = useState(user?.name || '');
  const [clientPhone, setClientPhone] = useState(user?.phone || '+243 ');
  const [clientEmail, setClientEmail] = useState(user?.email || '');
  const [notes, setNotes] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen || !property) return null;

  const agent = agents.find((a) => a.id === property.agentId);
  const agentPhone = property.contactPhone || agent?.phone || agent?.whatsapp || '+243810000000';

  const timeSlots = ['09:00', '10:30', '12:00', '14:00', '15:30', '17:00'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Create lead entry
    addLeadRequest({
      propertyId: property.id,
      propertyTitle: property.title,
      agentId: property.agentId,
      userName: clientName,
      userEmail: clientEmail || 'client@kinshasaimmo.cd',
      userPhone: clientPhone,
      message: `Demande de visite [${visitType === 'in_person' ? 'SUR PLACE' : 'VIDÉO LIVE'}] le ${selectedDate} à ${selectedTime}. Note: ${notes}`,
      requestType: 'tour',
      tourDate: selectedDate,
      tourTime: selectedTime,
    });

    setIsSuccess(true);
  };

  const handleWhatsAppDirect = () => {
    const cleanPhone = agentPhone.replace(/[^0-9]/g, '');
    const visitLabel = visitType === 'in_person' ? 'sur place à Kinshasa' : 'en visio / vidéo WhatsApp';
    const text = encodeURIComponent(
      `Bonjour ! Je souhaite planifier une visite ${visitLabel} pour votre annonce :\n\n` +
      `🏠 *${property.title}*\n` +
      `📍 Commune : ${property.commune || property.city || 'Kinshasa'}\n` +
      `💵 Prix : ${convertAndFormatPrice(property.price, currency)}\n` +
      `📅 Date souhaitée : ${selectedDate} à ${selectedTime}\n` +
      `👤 Nom : ${clientName}\n` +
      `📞 Téléphone : ${clientPhone}\n` +
      (notes ? `📝 Précision : ${notes}\n` : '') +
      `\nMerci de me confirmer votre disponibilité.`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl text-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Programmer une Visite
              </h3>
              <p className="text-xs text-slate-400">
                Sur place à Kinshasa ou en direct par vidéo WhatsApp
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Property Snippet */}
          <div className="flex items-center gap-3 p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
            <img
              src={property.images[0] || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=200'}
              alt={property.title}
              className="w-14 h-14 rounded-xl object-cover shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-white truncate text-xs">{property.title}</h4>
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-400" />
                {property.commune || property.city}, {property.address || 'Kinshasa'}
              </p>
              <span className="text-xs font-extrabold text-emerald-400">
                {convertAndFormatPrice(property.price, currency)}
              </span>
            </div>
          </div>

          {isSuccess ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">Demande de visite enregistrée !</h4>
                <p className="text-slate-400 text-xs max-w-sm mx-auto">
                  L'agent immobilier a été notifié pour votre rendez-vous du <strong>{selectedDate}</strong> à <strong>{selectedTime}</strong>.
                </p>
              </div>

              <div className="pt-3 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleWhatsAppDirect}
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Confirmer aussi sur WhatsApp avec l'agent</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type of visit tabs */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Type de visite
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setVisitType('in_person')}
                    className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all ${
                      visitType === 'in_person'
                        ? 'bg-emerald-500/10 border-emerald-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <MapPin className={`w-4 h-4 mt-0.5 ${visitType === 'in_person' ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <div>
                      <div className="font-bold text-xs">Visite sur Place</div>
                      <div className="text-[10px] text-slate-400">Rendez-vous au bien à Kinshasa</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVisitType('video')}
                    className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all ${
                      visitType === 'video'
                        ? 'bg-teal-500/10 border-teal-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Video className={`w-4 h-4 mt-0.5 ${visitType === 'video' ? 'text-teal-400' : 'text-slate-500'}`} />
                    <div>
                      <div className="font-bold text-xs">Visite Vidéo Live</div>
                      <div className="text-[10px] text-slate-400">Via WhatsApp (Idéal Diaspora)</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Date & Time Picker */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300">Date souhaitée</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300">Heure (Créneau)</label>
                  <select
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {timeSlots.map((ts) => (
                      <option key={ts} value={ts}>
                        {ts} (Heure de Kinshasa)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Contact info */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300">Votre Nom Complet *</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ex: Patrick Kalonji"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300">Téléphone / WhatsApp *</label>
                    <input
                      type="tel"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="+243 81..."
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300">Email (optionnel)</label>
                    <input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="votre@email.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300">Notes / Questions pour l'agent</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: Je souhaite aussi vérifier l'accès pour véhicule ou la pression d'eau..."
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Réserver le Créneau</span>
                </button>

                <button
                  type="button"
                  onClick={handleWhatsAppDirect}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-extrabold text-xs border border-emerald-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Direct WhatsApp</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
