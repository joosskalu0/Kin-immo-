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
    <footer className="bg-slate-950 border-t border-slate-800 text-slate-400 text-sm mt-12 pb-20 lg:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Col 1: Brand Info */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1D4ED8] flex items-center justify-center text-[#FACC15] font-bold shadow-md">
              <svg className="w-5 h-5 fill-[#FACC15]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z" />
              </svg>
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white">
                Kinimmo
              </span>
              <span className="block text-[10px] text-[#FACC15] font-bold">
                Trouvez. Vendez. Louez. Gérez.
              </span>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-slate-400">
            La plateforme immobilière de référence à Kinshasa. Recherche rapide, annonces vérifiées et accompagnement complet.
          </p>
          <div className="flex items-center gap-2 pt-1 text-xs text-blue-300 font-semibold">
            <ShieldCheck className="w-4 h-4 text-[#FACC15] shrink-0" />
            Transactions sécurisées à Kinshasa
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
                className="hover:text-[#FACC15] transition-colors flex items-center gap-1.5"
              >
                <Compass className="w-3.5 h-3.5 text-[#FACC15] shrink-0" />
                Immobilier à Gombe
              </a>
            </li>
            <li>
              <a
                href="/quartiers/ngaliema"
                onClick={(e) => handleLinkClick(e, '/quartiers/ngaliema')}
                className="hover:text-[#FACC15] transition-colors flex items-center gap-1.5"
              >
                <Compass className="w-3.5 h-3.5 text-[#FACC15] shrink-0" />
                Immobilier à Ngaliema & Ma Campagne
              </a>
            </li>
            <li>
              <a
                href="/quartiers/limete"
                onClick={(e) => handleLinkClick(e, '/quartiers/limete')}
                className="hover:text-[#FACC15] transition-colors flex items-center gap-1.5"
              >
                <Compass className="w-3.5 h-3.5 text-[#FACC15] shrink-0" />
                Immobilier à Limete Résidentiel
              </a>
            </li>
            <li>
              <a
                href="/blog"
                onClick={(e) => handleLinkClick(e, '/blog')}
                className="hover:text-[#FACC15] transition-colors flex items-center gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5 text-[#FACC15] shrink-0" />
                Blog & Guides Immobiliers RDC
              </a>
            </li>
            <li>
              <a
                href="/aide"
                onClick={(e) => handleLinkClick(e, '/aide')}
                className="hover:text-[#FACC15] transition-colors flex items-center gap-1.5"
              >
                <HelpCircle className="w-3.5 h-3.5 text-[#FACC15] shrink-0" />
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
              <MapPin className="w-4 h-4 text-[#FACC15] shrink-0 mt-0.5" />
              <span>{officeAddress}</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#FACC15] shrink-0" />
              <a href={`tel:${cleanPhone}`} className="hover:text-[#FACC15] transition-colors">
                {supportPhone}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#FACC15] shrink-0" />
              <a href={`mailto:${contactEmail}`} className="hover:text-[#FACC15] transition-colors">
                {contactEmail}
              </a>
            </li>
          </ul>
        </div>

        {/* Col 4: Alertes */}
        <div className="space-y-3">
          <h4 className="text-white font-semibold text-sm">Alertes Immobilières</h4>
          <p className="text-xs text-slate-400">
            Soyez prévenu dès qu'un bien correspondant à vos critères est publié à Kinshasa.
          </p>
          <a
            href="/alertes"
            onClick={(e) => handleLinkClick(e, '/alertes')}
            className="inline-flex items-center justify-center bg-[#FACC15] hover:bg-[#EAB308] text-slate-950 font-extrabold px-4 py-2.5 rounded-xl text-xs transition-colors"
          >
            Créer une alerte gratuite
          </a>
        </div>
      </div>

      <div className="border-t border-slate-900 bg-slate-950/80 py-4 px-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            © {new Date().getFullYear()} Kinimmo — Plateforme Immobilière Kinshasa & RDC.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href="/conditions-utilisation"
              onClick={(e) => handleLinkClick(e, '/conditions-utilisation')}
              className="hover:text-[#FACC15] transition-colors"
            >
              Conditions d’utilisation
            </a>
            <a
              href="/confidentialite"
              onClick={(e) => handleLinkClick(e, '/confidentialite')}
              className="hover:text-[#FACC15] transition-colors"
            >
              Confidentialité
            </a>
            <a
              href="/mentions-legales"
              onClick={(e) => handleLinkClick(e, '/mentions-legales')}
              className="hover:text-[#FACC15] transition-colors"
            >
              Mentions légales
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

