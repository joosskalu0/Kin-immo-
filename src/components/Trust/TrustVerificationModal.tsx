import React, { useState } from 'react';
import { X, ShieldCheck, Upload, Plus, Trash2, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { trustService } from '../../services/trustService';
import { TrustDocumentType } from '../../types/trust';

interface TrustVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'agent' | 'agency' | 'property';
  targetId: string;
  targetName: string;
  onSuccess?: () => void;
}

const DOC_TYPE_OPTIONS: { value: TrustDocumentType; label: string; hint: string }[] = [
  { value: 'certificat_enregistrement', label: 'Certificat d’Enregistrement / Titre Foncier', hint: 'Vol. et Folio délivrés par la Conservation des Titres Immobiliers' },
  { value: 'mandat_exclusif', label: 'Mandat Exclusif de Commercialisation', hint: 'Contrat signé avec le propriétaire légitime du bien' },
  { value: 'mandat_simple', label: 'Mandat Simple de Commercialisation', hint: 'Autorisation écrite de mise en vente ou location' },
  { value: 'cni', label: 'Carte Nationale d’Identité', hint: 'Pièce d’identité officielle en cours de validité' },
  { value: 'passport', label: 'Passeport Ordinaire RDC', hint: 'Passeport biométrique avec photo nette' },
  { value: 'voter_card', label: 'Carte d’Électeur CENI', hint: 'Carte d’électeur lisible avec QR code' },
  { value: 'rccm', label: 'Registre de Commerce (RCCM)', hint: 'N° d’immatriculation au Guichet Unique de Création d’Entreprise' },
  { value: 'id_nat', label: 'Identification Nationale (Id. Nat)', hint: 'Numéro d’identification nationale' },
  { value: 'nif', label: 'Numéro d’Impôt (NIF)', hint: 'Attestation de Numéro d’Impôt DGI' },
  { value: 'livret_logeur', label: 'Livret de Logeur', hint: 'Titre coutumier ou attestation d’occupation parcellaire' },
  { value: 'acte_vente', label: 'Acte de Vente Notarié', hint: 'Acte authentique notarié' },
  { value: 'attestation_localisation', label: 'Attestation de Localisation Parcellaire', hint: 'Document cadastral confirmant l’adresse exacte à Kinshasa' }
];

export const TrustVerificationModal: React.FC<TrustVerificationModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetName,
  onSuccess
}) => {
  const [phone, setPhone] = useState('');
  const [documents, setDocuments] = useState<Array<{
    doc_type: TrustDocumentType;
    title: string;
    document_number: string;
    file_url: string;
    file_size: string;
  }>>([
    {
      doc_type: targetType === 'property' ? 'certificat_enregistrement' : (targetType === 'agency' ? 'rccm' : 'passport'),
      title: targetType === 'property' ? 'Certificat d’Enregistrement' : (targetType === 'agency' ? 'Extrait RCCM' : 'Pièce d’identité officielle'),
      document_number: '',
      file_url: '',
      file_size: '2.1 MB'
    }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleAddDocument = () => {
    setDocuments([
      ...documents,
      {
        doc_type: 'cni',
        title: '',
        document_number: '',
        file_url: '',
        file_size: '1.5 MB'
      }
    ]);
  };

  const handleRemoveDocument = (index: number) => {
    if (documents.length <= 1) return;
    setDocuments(documents.filter((_, i) => i !== index));
  };

  const handleDocChange = (index: number, field: string, value: string) => {
    const updated = [...documents];
    updated[index] = { ...updated[index], [field]: value };
    setDocuments(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Vérification des champs
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      if (!doc.title.trim()) {
        setError(`Veuillez renseigner le titre du document #${i + 1}`);
        return;
      }
      if (!doc.file_url.trim()) {
        // Si vide, générons une URL sécurisée d'exemple
        doc.file_url = `https://storage.kinimmo.cd/trust/docs/${targetId}_${Date.now()}_${i + 1}.pdf`;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await trustService.submitApplication({
        target_type: targetType,
        target_id: targetId,
        target_name: targetName,
        applicant_phone: phone,
        documents
      });

      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 2000);
      } else {
        setError(res.message || 'Erreur lors de la soumission du dossier.');
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur réseau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X size={20} />
        </button>

        {/* Titre */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <ShieldCheck size={28} className="text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">
              Demande de Certification Kinimmo Trust
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Cible : <span className="text-emerald-300 font-semibold">{targetName}</span> ({targetType === 'property' ? 'Annonce' : targetType === 'agent' ? 'Agent PRO' : 'Agence'})
            </p>
          </div>
        </div>

        {success ? (
          <div className="py-12 text-center space-y-4">
            <CheckCircle2 size={56} className="text-emerald-400 mx-auto animate-bounce" />
            <h4 className="text-xl font-bold text-white">Dossier Déposé avec Succès !</h4>
            <p className="text-sm text-slate-300 max-w-md mx-auto">
              Nos auditeurs immobiliers à Kinshasa procèdent à la vérification des pièces justificatives. Vous recevrez une notification dès validation.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            {error && (
              <div className="p-4 rounded-2xl bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
                <AlertCircle size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Note d'information */}
            {/* Note d'information et règle de propriété */}
            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 space-y-2">
              <div className="font-semibold text-emerald-400 flex items-center gap-2">
                <ShieldCheck size={16} />
                <span>Règle métier Kinimmo Trust & Audit Cadastral</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Vous pouvez uniquement demander la certification des biens immobiliers dont vous êtes l'annonceur ou le propriétaire légitime. Aucun badge de confiance n’est affiché publiquement avant la validation formelle des titres par nos administrateurs.
              </p>
            </div>

            {/* Téléphone de contact */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Numéro WhatsApp / Téléphone de contact
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+243 81 000 0000"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Pièces justificatives */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Pièces Justificatives Obligatoires ({documents.length})
                </label>
                <button
                  type="button"
                  onClick={handleAddDocument}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-emerald-400 flex items-center gap-1.5 transition-colors"
                >
                  <Plus size={14} />
                  <span>Ajouter une pièce</span>
                </button>
              </div>

              {documents.map((doc, index) => (
                <div
                  key={index}
                  className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/70 space-y-3 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 flex items-center gap-2">
                      <FileText size={15} className="text-emerald-400" />
                      Document #{index + 1}
                    </span>
                    {documents.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDocument(index)}
                        className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                        title="Supprimer ce document"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Type de document
                      </label>
                      <select
                        value={doc.doc_type}
                        onChange={(e) => handleDocChange(index, 'doc_type', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                      >
                        {DOC_TYPE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Intitulé / Référence
                      </label>
                      <input
                        type="text"
                        value={doc.title}
                        onChange={(e) => handleDocChange(index, 'title', e.target.value)}
                        placeholder="Ex: Certificat Enregistrement Gombe"
                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        N° de document / Folio / Vol (optionnel)
                      </label>
                      <input
                        type="text"
                        value={doc.document_number}
                        onChange={(e) => handleDocChange(index, 'document_number', e.target.value)}
                        placeholder="Ex: CE-KIN-2024-412"
                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Lien URL ou Fichier Téléversé
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={doc.file_url}
                          onChange={(e) => handleDocChange(index, 'file_url', e.target.value)}
                          placeholder="Lien PDF ou image (https://...)"
                          className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleDocChange(index, 'file_url', `https://storage.kinimmo.cd/trust/scan_${Date.now()}.pdf`)}
                          className="px-2.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs flex items-center gap-1 shrink-0"
                          title="Simuler téléversement direct"
                        >
                          <Upload size={13} />
                          <span className="hidden sm:inline">Joindre</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-emerald-500/20 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>Dépôt en cours...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>Soumettre mon dossier Kinimmo Trust</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
