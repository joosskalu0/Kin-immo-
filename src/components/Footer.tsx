import React from 'react';
import { Heart, ShieldCheck, Mail, Phone, MapPin, SlidersHorizontal, Sparkles, Building, Key, Award } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Footer: React.FC = () => {
  const { setIsFieldsBuilderOpen, contactSettings, setFilters } = useApp();

  const officeAddress = contactSettings?.officeAddress || 'Avenue Kananga, Q/ Binza Pigeon, C/ Ngaliema, Kinshasa, RDC';
  const supportPhone = contactSettings?.supportPhone || '+243 84 529 4616';
  const contactEmail = contactSettings?.contactEmail || 'joosskalu72@gmail.com';
  const cleanPhone = supportPhone.replace(/\s+/g, '');

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
            La référence immobilière à Kinshasa et en République Démocratique du Congo. Recherche interactive sur carte, plateforme sécurisée en temps réel et vérification certifiée des titres fonciers.
          </p>
          <div className="flex items-center gap-2 pt-2 text-xs text-emerald-400 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            Sécurité Renforcée & Annonces Certifiées Kinshasa
          </div>
        </div>

        {/* Col 2: Quick Links */}
        <div>
          <h4 className="text-white font-semibold text-sm mb-4">Outils & Services Pro</h4>
          <ul className="space-y-2.5 text-xs">
            <li>
              <a href="#properties" className="hover:text-emerald-400 transition-colors flex items-center gap-1.5 text-left">
                <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                Catalogue des Propriétés Vérifiées
              </a>
            </li>
            <li>
              <a href="#map" className="hover:text-emerald-400 transition-colors">
                Recherche Cartographique par Commune
              </a>
            </li>
            <li>
              <a href="#compare" className="hover:text-emerald-400 transition-colors">
                Comparateur de Biens Détaillé
              </a>
            </li>
            <li>
              <a href="#agents" className="hover:text-emerald-400 transition-colors">
                Annuaire des Agents & Agences Agréés
              </a>
            </li>
            <li>
              <a href="#pdf" className="hover:text-emerald-400 transition-colors">
                Brochures & Fiches PDF Imprimables
              </a>
            </li>
          </ul>
        </div>

        {/* Col 3: Contact details */}
        <div>
          <h4 className="text-white font-semibold text-sm mb-4">Contact & Siège Social</h4>
          <ul className="space-y-2.5 text-xs">
            <li className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{officeAddress}</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
              <a href={`tel:${cleanPhone}`} className="hover:text-emerald-400 transition-colors">
                {supportPhone}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
              <a href={`mailto:${contactEmail}`} className="hover:text-emerald-400 transition-colors">
                {contactEmail}
              </a>
            </li>
          </ul>
        </div>

        {/* Col 4: Newsletter */}
        <div className="space-y-3">
          <h4 className="text-white font-semibold text-sm">Alertes Immobilières</h4>
          <p className="text-xs text-slate-400">
            Recevez directement par e-mail les nouvelles opportunités correspondant à vos critères à Kinshasa.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="Votre adresse e-mail..."
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-full"
            />
            <button className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-3 py-2 rounded-lg text-xs transition-colors shrink-0">
              S'inscrire
            </button>
          </div>
        </div>
      </div>

      {/* SEO KEYWORDS HUB - Mots-clés stratégiques pour le référencement naturel Kinshasa & RDC */}
      <div className="border-t border-slate-900 bg-slate-950/60 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-900 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h3 className="text-white font-extrabold text-xs uppercase tracking-wider">
                Index Immobilier Kinshasa & Recherches Populaires (RDC)
              </h3>
            </div>
            <span className="text-[11px] text-slate-500">
              Mots-clés certifiés pour le cadastre, la vente et la location à Kinshasa
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-xs text-slate-400">
            {/* Colonne 1: Vente Kinshasa */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-200">
                <Building className="w-3.5 h-3.5 text-emerald-400" />
                <span>Vente Immobilière Kinshasa</span>
              </div>
              <ul className="space-y-1.5 text-[11px]">
                {[
                  { text: 'Maison à vendre Kinshasa Gombe', q: 'Gombe', s: 'for-sale' },
                  { text: 'Villa avec piscine Ngaliema Macampagne', q: 'piscine Macampagne', s: 'for-sale' },
                  { text: 'Appartement standing Boulevard 30 Juin', q: '30 Juin', s: 'for-sale' },
                  { text: 'Duplex moderne Limete Résidentiel', q: 'Duplex Limete', s: 'for-sale' },
                  { text: 'Vente villa Binza Pigeon & Météo', q: 'Binza', s: 'for-sale' },
                  { text: 'Maison basse Bandalungwa & Kintambo', q: 'Bandalungwa', s: 'for-sale' },
                ].map((item, i) => (
                  <li key={i}>
                    <button
                      onClick={() => {
                        setFilters((prev) => ({ ...prev, searchQuery: item.q, status: item.s as any }));
                        const el = document.getElementById('properties');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="hover:text-emerald-400 hover:underline text-left transition-colors"
                    >
                      {item.text}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Colonne 2: Location Kinshasa */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-200">
                <Key className="w-3.5 h-3.5 text-emerald-400" />
                <span>Location Immobilière Kinshasa</span>
              </div>
              <ul className="space-y-1.5 text-[11px]">
                {[
                  { text: 'Location appartement Kinshasa Gombe', q: 'appartement Gombe', s: 'for-rent' },
                  { text: 'Appartement meublé court séjour Kinshasa', q: 'meublé', s: 'for-rent' },
                  { text: 'Villa de luxe à louer Ngaliema', q: 'villa Ngaliema', s: 'for-rent' },
                  { text: 'Bureaux et espaces pro Boulevard du 30 Juin', q: 'bureau 30 Juin', s: 'for-rent' },
                  { text: 'Studio moderne à louer Kinshasa', q: 'studio', s: 'for-rent' },
                  { text: 'Hangar et entrepôt commercial Limete', q: 'Limete', s: 'for-rent' },
                ].map((item, i) => (
                  <li key={i}>
                    <button
                      onClick={() => {
                        setFilters((prev) => ({ ...prev, searchQuery: item.q, status: item.s as any }));
                        const el = document.getElementById('properties');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="hover:text-emerald-400 hover:underline text-left transition-colors"
                    >
                      {item.text}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Colonne 3: Terrains & Cadastre */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Terrains & Sécurité Foncière RDC</span>
              </div>
              <ul className="space-y-1.5 text-[11px]">
                {[
                  { text: 'Terrain avec Certificat d\'Enregistrement', q: 'certificat' },
                  { text: 'Parcelle titrée Mont-Ngafula', q: 'Mont-Ngafula', t: 'land' },
                  { text: 'Concession foncière titrée Maluku & Nsele', q: 'concession' },
                  { text: 'Achat terrain sécurisé cadastre RDC', q: 'cadastre' },
                  { text: 'Vente terrain résidentiel Ma Campagne', q: 'Macampagne', t: 'land' },
                  { text: 'Parcelle avec plan cadastral certifié', q: 'cadastre' },
                ].map((item, i) => (
                  <li key={i}>
                    <button
                      onClick={() => {
                        setFilters((prev) => ({
                          ...prev,
                          searchQuery: item.q,
                          type: (item.t as any) || prev.type,
                        }));
                        const el = document.getElementById('properties');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="hover:text-emerald-400 hover:underline text-left transition-colors"
                    >
                      {item.text}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Colonne 4: Services & Confiance */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-200">
                <Award className="w-3.5 h-3.5 text-emerald-400" />
                <span>Services Agréés & Confiance</span>
              </div>
              <ul className="space-y-1.5 text-[11px]">
                {[
                  { text: 'Agences immobilières agréées Kinshasa' },
                  { text: 'Courtiers et agents immobiliers certifiés' },
                  { text: 'Conciergerie immobilière VIP Kinshasa' },
                  { text: 'Estimation prix au m² à Kinshasa' },
                  { text: 'Visites immersives vidéos 30s Kinimmo' },
                  { text: 'Conseils investissement diaspora RDC' },
                ].map((item, i) => (
                  <li key={i} className="text-slate-400">
                    {item.text}
                  </li>
                ))}
              </ul>
            </div>
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

