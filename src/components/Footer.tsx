import React from 'react';
import { ShieldCheck, Mail, Phone, MapPin, BookOpen, HelpCircle, Compass } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface FooterProps {
  onNavigate?: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { contactSettings } = useApp();

  const officeAddress = contactSettings?.officeAddress || 'Avenue Kananga, Q/ Binza Pigeon, C/ Ngaliema, Kinshasa, RDC';
  const supportPhone = contactSettings?.supportPhone || '+243 84 529 4616';
  const contactEmail = contactSettings?.contactEmail || 'joosskalu72@gmail.com';
  const cleanPhone = supportPhone.replace(/\s+/g, '');

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    if (onNavigate) {
      e.preventDefault();
      onNavigate(path);
    }
  };

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
            La référence immobilière à Kinshasa et en République Démocratique du Congo. Recherche interactive sur carte, annonces vérifiées et accompagnement juridique.
          </p>
          <div className="flex items-center gap-2 pt-2 text-xs text-emerald-400 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            Sécurité Renforcée & Annonces Certifiées Kinshasa
          </div>
        </div>

        {/* Col 2: Quartiers & Ressources */}
        <div>
          <h4 className="text-white font-semibold text-sm mb-4">Quartiers, Guides & Aide</h4>
          <ul className="space-y-2.5 text-xs">
            <li>
              <a
                href="/quartiers/gombe"
                onClick={(e) => handleLinkClick(e, '/quartiers/gombe')}
                className="hover:text-emerald-400 transition-colors flex items-center gap-1.5"
              >
                <Compass className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                Immobilier à Gombe
              </a>
            </li>
            <li>
              <a
                href="/quartiers/ngaliema"
                onClick={(e) => handleLinkClick(e, '/quartiers/ngaliema')}
                className="hover:text-emerald-400 transition-colors flex items-center gap-1.5"
              >
                <Compass className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                Immobilier à Ngaliema & Ma Campagne
              </a>
            </li>
            <li>
              <a
                href="/quartiers/limete"
                onClick={(e) => handleLinkClick(e, '/quartiers/limete')}
                className="hover:text-emerald-400 transition-colors flex items-center gap-1.5"
              >
                <Compass className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                Immobilier à Limete Résidentiel
              </a>
            </li>
            <li>
              <a
                href="/blog"
                onClick={(e) => handleLinkClick(e, '/blog')}
                className="hover:text-emerald-400 transition-colors flex items-center gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                Blog & Guides Immobiliers RDC
              </a>
            </li>
            <li>
              <a
                href="/aide"
                onClick={(e) => handleLinkClick(e, '/aide')}
                className="hover:text-emerald-400 transition-colors flex items-center gap-1.5"
              >
                <HelpCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                Centre d’aide & FAQ
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

      <div className="border-t border-slate-900 bg-slate-950/80 py-4 px-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            © {new Date().getFullYear()} KIN IMMOBILIER — Plateforme Immobilière Officielle Kinshasa & RDC.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href="/conditions-utilisation"
              onClick={(e) => handleLinkClick(e, '/conditions-utilisation')}
              className="hover:text-emerald-400 transition-colors"
            >
              Conditions d’utilisation
            </a>
            <a
              href="/confidentialite"
              onClick={(e) => handleLinkClick(e, '/confidentialite')}
              className="hover:text-emerald-400 transition-colors"
            >
              Confidentialité
            </a>
            <a
              href="/mentions-legales"
              onClick={(e) => handleLinkClick(e, '/mentions-legales')}
              className="hover:text-emerald-400 transition-colors"
            >
              Mentions légales
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

