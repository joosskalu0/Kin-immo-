import React from 'react';
import { Heart, ShieldCheck, Mail, Phone, MapPin, SlidersHorizontal } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Footer: React.FC = () => {
  const { setIsFieldsBuilderOpen } = useApp();

  return (
    <footer className="bg-slate-950 border-t border-slate-800 text-slate-400 text-sm mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Col 1: Brand Info */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-emerald-500/20">
              <svg className="w-5 h-5 fill-slate-950" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z" />
              </svg>
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white uppercase">
                KIN IMMOBILIER
              </span>
              <span className="block text-[10px] text-emerald-400 font-bold">
                RDC & Kinshasa Real Estate
              </span>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-slate-400">
            La référence immobilière à Kinshasa et en République Démocratique du Congo. Recherche interactive sur carte, base de données Firestore sécurisée en temps réel et vérification des titres fonciers.
          </p>
          <div className="flex items-center gap-2 pt-2 text-xs text-emerald-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Sécurité 2FA & Badges de Vérification Kinshasa
          </div>
        </div>

        {/* Col 2: Quick Links */}
        <div>
          <h4 className="text-white font-semibold text-sm mb-4">PRO Features</h4>
          <ul className="space-y-2.5 text-xs">
            <li>
              <button
                onClick={() => setIsFieldsBuilderOpen(true)}
                className="hover:text-emerald-400 transition-colors flex items-center gap-1.5"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                Fields Builder (Unlimited Custom Fields)
              </button>
            </li>
            <li>
              <a href="#map" className="hover:text-emerald-400 transition-colors">
                AJAX Map Search
              </a>
            </li>
            <li>
              <a href="#compare" className="hover:text-emerald-400 transition-colors">
                Side-by-Side Property Comparison
              </a>
            </li>
            <li>
              <a href="#agents" className="hover:text-emerald-400 transition-colors">
                Agents & Agencies Directory (PRO)
              </a>
            </li>
            <li>
              <a href="#pdf" className="hover:text-emerald-400 transition-colors">
                PDF Flyer Generator
              </a>
            </li>
          </ul>
        </div>

        {/* Col 3: Contact details */}
        <div>
          <h4 className="text-white font-semibold text-sm mb-4">Contact & Siège Social</h4>
          <ul className="space-y-2.5 text-xs">
            <li className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              Avenue Boulevard du 30 Juin, Gombe, Kinshasa, RDC
            </li>
            <li className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-400" />
              +243 81 555 0100 / +243 99 000 0000
            </li>
            <li className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-emerald-400" />
              contact@kin-immobilier.cd
            </li>
          </ul>
        </div>

        {/* Col 4: Newsletter */}
        <div className="space-y-3">
          <h4 className="text-white font-semibold text-sm">Property Alerts</h4>
          <p className="text-xs text-slate-400">
            Subscribe to receive new listings matching your exact criteria in real-time.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="Your email address..."
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-full"
            />
            <button className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-3 py-2 rounded-lg text-xs transition-colors shrink-0">
              Subscribe
            </button>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        <p className="flex items-center justify-center gap-1">
          © {new Date().getFullYear()} KIN IMMOBILIER — Plateforme Immobilière Officielle Kinshasa & RDC. Tous droits réservés.
        </p>
      </div>
    </footer>
  );
};

