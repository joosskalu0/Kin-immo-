import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { Property, CustomFieldDefinition, Agent, Agency, CurrencyCode, Invoice } from '../types';
import { formatAdminDateFR, getDualCurrencyDisplay } from './currency';
import { buildPropertyShareUrl } from './shareUtils';

export interface GeneratePropertyPDFOptions {
  property: Property;
  customFieldDefs: CustomFieldDefinition[];
  agent?: Agent;
  agency?: Agency | null;
  currencyCode?: CurrencyCode;
  cdfExchangeRate?: number;
  cdfExchangeRateUpdatedAt?: string;
  mode?: 'download' | 'print';
}

async function loadImageAsDataUrl(url: string, timeoutMs: number = 3500): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:image/')) return url;

  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        const maxW = 900;
        const scale = img.width > maxW ? maxW / img.width : 1;
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = url;
  });
}

function triggerHiddenIframePrint(pdfBlob: Blob) {
  if (typeof document === 'undefined') return;
  const blobUrl = URL.createObjectURL(pdfBlob);
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.src = blobUrl;

  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      // Fallback: téléchargement automatique si le navigateur bloque l'impression PDF en iframe
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `Kinimmo_Fiche.pdf`;
      a.click();
    }
    setTimeout(() => {
      try {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(blobUrl);
      } catch {}
    }, 60000);
  };

  document.body.appendChild(iframe);
}

/**
 * Génère la fiche immobilière officielle Kinimmo (A4) avec conversion datée,
 * caractéristiques complètes et véritable QR Code scannable vers /annonces/:slug.
 */
export async function generatePropertyPDF(
  propertyOrOptions: Property | GeneratePropertyPDFOptions,
  customFieldDefsArg: CustomFieldDefinition[] = [],
  agentArg?: Agent,
  currencyCodeArg: CurrencyCode = 'USD'
): Promise<void> {
  const options: GeneratePropertyPDFOptions =
    'property' in propertyOrOptions
      ? propertyOrOptions
      : {
          property: propertyOrOptions,
          customFieldDefs: customFieldDefsArg,
          agent: agentArg,
          currencyCode: currencyCodeArg,
        };

  const {
    property,
    customFieldDefs,
    agent,
    agency,
    currencyCode = 'USD',
    cdfExchangeRate = 2850,
    cdfExchangeRateUpdatedAt,
    mode = 'download',
  } = options;

  const listingUrl = buildPropertyShareUrl(property);
  const dual = getDualCurrencyDisplay(
    property.price,
    property.currency || 'USD',
    currencyCode,
    cdfExchangeRate
  );

  const [qrDataUrl, heroPhotoDataUrl] = await Promise.all([
    QRCode.toDataURL(listingUrl, {
      width: 300,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    }).catch(() => null),
    Array.isArray(property.images) && property.images[0]
      ? loadImageAsDataUrl(property.images[0])
      : Promise.resolve(null),
  ]);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // 1. En-tête Kinimmo
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, 210, 26, 'F');
  doc.setFillColor(5, 150, 105); // Emerald 600 accent bar
  doc.rect(0, 26, 210, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('KINIMMO', 14, 13);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(167, 243, 208);
  doc.text('Plateforme Immobilière Officielle — Kinshasa & RDC', 14, 20);

  doc.setTextColor(226, 232, 240);
  doc.setFontSize(9);
  doc.text(`Réf : ${property.id}`, 196, 12, { align: 'right' });
  doc.text(`MAJ : ${formatAdminDateFR(property.updatedAt || property.createdAt)}`, 196, 19, {
    align: 'right',
  });

  // 2. Titre & Prix dual devise
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  const titleLines = doc.splitTextToSize(property.title, 182);
  doc.text(titleLines.slice(0, 2), 14, 37);

  const afterTitleY = 37 + Math.min(titleLines.length, 2) * 6.5;

  doc.setTextColor(5, 150, 105);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  const periodSuffix = property.period === 'month' ? ' / mois' : '';
  doc.text(`${dual.primaryFormatted}${periodSuffix}`, 14, afterTitleY + 2);

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `≈ ${dual.secondaryFormatted}${periodSuffix}  (Taux admin : 1 USD = ${dual.effectiveRate.toLocaleString('fr-FR')} FC au ${formatAdminDateFR(cdfExchangeRateUpdatedAt)})`,
    14,
    afterTitleY + 8
  );

  // 3. Localisation & Point de repère
  const locY = afterTitleY + 15;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.rect(14, locY, 182, 13, 'FD');
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const statusFrench =
    property.status === 'sold'
      ? 'VENDU'
      : property.status === 'for-sale'
      ? 'À VENDRE'
      : property.status === 'for-rent'
      ? 'À LOUER'
      : property.status.toUpperCase();
  doc.text(
    `${statusFrench}  •  ${property.commune || property.city || 'Kinshasa'}${property.quartier ? ` (${property.quartier})` : ''}`,
    18,
    locY + 5.2
  );
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Point de repère : ${property.referencePoint || property.avenue || property.address || 'Secteur résidentiel Kinshasa'}`,
    18,
    locY + 10.2
  );

  // 4. Photo Principale + Caractéristiques Clés
  const mediaY = locY + 17;
  if (heroPhotoDataUrl) {
    doc.addImage(heroPhotoDataUrl, 'JPEG', 14, mediaY, 120, 68, undefined, 'FAST');
    doc.setDrawColor(203, 213, 225);
    doc.rect(14, mediaY, 120, 68);
  } else {
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.rect(14, mediaY, 120, 68, 'FD');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('Aperçu photo disponible en ligne', 45, mediaY + 35);
  }

  // Encart Caractéristiques à droite de la photo
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.rect(138, mediaY, 58, 68, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Caractéristiques', 142, mediaY + 8);

  const specsRows = [
    ['Type', String(property.type || '-').toUpperCase()],
    ['Surface', property.area ? `${property.area} m²` : '-'],
    ['Chambres', `${property.bedrooms ?? 0}`],
    ['Salles d’eau', `${property.bathrooms ?? 0}`],
    ['Parking', `${property.garages ?? 0} pl.`],
    ['Année', property.yearBuilt ? `${property.yearBuilt}` : 'N/C'],
  ];

  let specY = mediaY + 17;
  specsRows.forEach(([label, val]) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(label, 142, specY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(val, 192, specY, { align: 'right' });
    specY += 8.2;
  });

  // 5. Critères complémentaires & Équipements
  let currentY = mediaY + 76;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Critères & Équipements', 14, currentY);
  currentY += 5.5;

  const publicCustomFields = customFieldDefs
    .filter((f) => !f.isPrivate && property.customFields?.[f.key])
    .slice(0, 4);

  publicCustomFields.forEach((fieldDef) => {
    const val = property.customFields?.[fieldDef.key];
    const label =
      (typeof fieldDef.label === 'string'
        ? fieldDef.label
        : fieldDef.label?.fr || fieldDef.label?.en) || fieldDef.key;
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(`• ${label} :`, 15, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(`${val} ${fieldDef.unit || ''}`.trim(), 82, currentY);
    currentY += 5.2;
  });

  if (Array.isArray(property.amenities) && property.amenities.length > 0) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    const amenitiesLine = doc.splitTextToSize(
      `Équipements : ${property.amenities.join(' • ')}`,
      180
    );
    doc.text(amenitiesLine.slice(0, 2), 15, currentY + 1);
    currentY += Math.min(amenitiesLine.length, 2) * 4.8 + 2;
  }

  // 6. Description synthétique
  currentY += 3;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Description', 14, currentY);
  currentY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(51, 65, 85);
  const splitDesc = doc.splitTextToSize(
    property.description || 'Bien immobilier sélectionné sur Kinimmo Kinshasa.',
    182
  );
  doc.text(splitDesc.slice(0, 5), 14, currentY);

  // 7. Pied de fiche : Contact Annonceur + Vrai QR Code scannable
  const footerY = 236;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, footerY, 182, 46, 'FD');

  const advertiserName = agent?.name || agency?.name || property.agencyName || 'Conseiller Kinimmo';
  const advertiserPhone = agent?.phone || agency?.phone || property.contactPhone || '+243 81 000 0001';
  const advertiserEmail = agent?.email || agency?.email || property.contactEmail || 'contact@kinimmo.com';
  const advertiserAgency = agency?.name || agent?.agencyName || property.agencyName || 'Kinimmo Partenaire';
  const isVerified = Boolean(agent?.isVerified || agent?.verificationStatus === 'verified' || agency?.isVerified);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`Annonceur : ${advertiserName}`, 19, footerY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(5, 150, 105);
  doc.text(
    `Statut : ${isVerified ? 'Profil Vérifié Kinimmo Trust' : 'Annonceur Enregistré'}`,
    19,
    footerY + 14
  );

  doc.setTextColor(71, 85, 105);
  doc.text(`Agence : ${advertiserAgency}`, 19, footerY + 20);
  doc.text(`Téléphone / WhatsApp : ${advertiserPhone}`, 19, footerY + 26);
  doc.text(`Email : ${advertiserEmail}`, 19, footerY + 32);

  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const urlLines = doc.splitTextToSize(`Lien direct : ${listingUrl}`, 128);
  doc.text(urlLines.slice(0, 2), 19, footerY + 38.5);

  // Vrai QR Code scannable à droite
  if (qrDataUrl) {
    doc.setFillColor(255, 255, 255);
    doc.rect(155, footerY + 4, 34, 34, 'F');
    doc.addImage(qrDataUrl, 'PNG', 156, footerY + 5, 32, 32);
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('Scanner la fiche', 172, footerY + 42.5, { align: 'center' });
  }

  const cleanFileName = `Kinimmo_${property.title
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 36)}_${property.id}.pdf`;

  if (mode === 'print') {
    doc.autoPrint();
    const blob = doc.output('blob');
    triggerHiddenIframePrint(blob);
  } else {
    doc.save(cleanFileName);
  }
}

export interface GenerateReceiptOptions {
  cdfExchangeRate?: number;
  planName?: string;
  mode?: 'download' | 'print';
}

/**
 * Génère le reçu officiel de paiement Kinimmo RDC (A4) avec QR Code de vérification,
 * référence Mobile Money validée, montant USD/CDF et période d'activation.
 */
export async function generatePaymentReceiptPDF(
  invoice: Invoice,
  optionsOrRate: GenerateReceiptOptions | number = {}
): Promise<void> {
  const options: GenerateReceiptOptions =
    typeof optionsOrRate === 'number' ? { cdfExchangeRate: optionsOrRate } : optionsOrRate;
  const { cdfExchangeRate = 2850, planName, mode = 'download' } = options;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const invoiceNum = invoice.invoiceNumber || invoice.invoice_number || invoice.id;
  const receiptNum =
    invoice.receiptNumber ||
    invoice.receipt_number ||
    `REC-${invoiceNum.replace(/[^A-Z0-9]/gi, '').slice(-8)}`;
  const paidDateStr = formatAdminDateFR(
    invoice.paidAt || invoice.paid_at || invoice.validatedAt || invoice.updated_at || new Date().toISOString()
  );
  const issuedDateStr = formatAdminDateFR(
    invoice.createdAt || invoice.created_at || new Date().toISOString()
  );

  const amountUsd = Number(invoice.totalAmount ?? invoice.amount ?? invoice.amount_usd ?? 0);
  const amountCdf = Number(
    invoice.totalAmountCDF ?? invoice.amount_cdf ?? invoice.total_amount_cdf ?? Math.round(amountUsd * cdfExchangeRate)
  );

  const isRefunded = invoice.status === 'refunded';
  const verificationPayload = `KINIMMO|${receiptNum}|${invoiceNum}|${amountUsd}USD|${invoice.transactionReference || invoice.transaction_reference || 'ADMIN'}|${invoice.status}`;

  let qrDataUrl: string | null = null;
  try {
    qrDataUrl = await QRCode.toDataURL(verificationPayload, {
      width: 240,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    });
  } catch {
    qrDataUrl = null;
  }

  // En-tête officiel Kinimmo
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 34, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(255, 255, 255);
  doc.text('KINIMMO RDC', 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Plateforme Immobilière Officielle • Kinshasa, RDC', 14, 21);
  doc.text('RCCM : CD/KIN/RCCM/20-B-04921 • contact@kinimmo.com', 14, 26.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(isRefunded ? 248 : 52, isRefunded ? 113 : 211, isRefunded ? 113 : 153);
  doc.text(isRefunded ? 'AVOIR / REÇU REMBOURSÉ' : 'REÇU DE PAIEMENT OFFICIEL', 196, 15, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`N° Reçu : ${receiptNum}`, 196, 21.5, { align: 'right' });
  doc.text(`Facture liée : ${invoiceNum}`, 196, 27, { align: 'right' });

  // Bannière statut
  doc.setFillColor(isRefunded ? 254 : 236, isRefunded ? 242 : 253, isRefunded ? 242 : 245);
  doc.setDrawColor(isRefunded ? 248 : 16, isRefunded ? 113 : 185, isRefunded ? 113 : 129);
  doc.rect(14, 42, 182, 18, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(isRefunded ? 185 : 4, isRefunded ? 28 : 120, isRefunded ? 28 : 87);
  doc.text(
    isRefunded
      ? 'PAIEMENT REMBOURSÉ PAR L’ADMINISTRATION'
      : 'PAIEMENT VÉRIFIÉ ET ACQUITTÉ',
    20,
    50
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Date de validation : ${paidDateStr}  •  Date d'émission : ${issuedDateStr}`, 20, 56);

  // Coordonnées Client & Règlement
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.rect(14, 68, 88, 42, 'FD');
  doc.rect(108, 68, 88, 42, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('COMPTE FACTURÉ', 19, 75);
  doc.text('MOYEN DE RÈGLEMENT MOBILE MONEY', 113, 75);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text((invoice.targetName || (invoice as any).user_name || 'Client Kinimmo').slice(0, 34), 19, 82);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text((invoice.targetEmail || (invoice as any).user_email || '').slice(0, 38), 19, 88.5);
  if (invoice.targetPhone) {
    doc.text(`Tél : ${invoice.targetPhone}`, 19, 95);
  }
  if (invoice.targetNifRccm) {
    doc.text(`RCCM / NIF : ${invoice.targetNifRccm}`, 19, 101.5);
  }

  const providerLabel =
    invoice.payment_method_provider ||
    invoice.paymentMethod ||
    'Mobile Money RDC';
  const txRef =
    invoice.transactionReference ||
    invoice.transaction_reference ||
    'Validation directe Admin';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(String(providerLabel).slice(0, 34), 113, 82);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Réf. Transaction : ${String(txRef).slice(0, 28)}`, 113, 88.5);
  const cycleLabel =
    (invoice.billingCycle || invoice.billing_cycle) === 'yearly'
      ? 'Annuel (12 mois)'
      : (invoice.billingCycle || invoice.billing_cycle) === 'trial'
      ? 'Essai Gratuit'
      : (invoice.invoiceType || invoice.invoice_type) === 'boost'
      ? 'Boost Ponctuel'
      : 'Mensuel (30 jours)';
  doc.text(`Périodicité : ${cycleLabel}`, 113, 95);
  if (invoice.periodStart || invoice.period_start || invoice.periodEnd || invoice.period_end) {
    const pStart = invoice.periodStart || invoice.period_start;
    const pEnd = invoice.periodEnd || invoice.period_end;
    doc.text(
      `Couverture : ${pStart ? formatAdminDateFR(pStart) : '—'} → ${pEnd ? formatAdminDateFR(pEnd) : '—'}`,
      113,
      101.5
    );
  }

  // Tableau des prestations
  let y = 122;
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text('DÉSIGNATION DE LA FORMULE / OPTION', 18, y + 6);
  doc.text('QTÉ', 132, y + 6, { align: 'center' });
  doc.text('MONTANT USD', 162, y + 6, { align: 'right' });
  doc.text('ÉQUIV. CDF', 192, y + 6, { align: 'right' });

  y += 14;
  const lineItems =
    Array.isArray(invoice.items) && invoice.items.length > 0
      ? invoice.items
      : [
          {
            id: 'item_default',
            description:
              planName ||
              (invoice as any).plan_name ||
              invoice.optionName ||
              invoice.option_name ||
              'Abonnement / Option Kinimmo',
            amount: amountUsd,
            quantity: 1,
          },
        ];

  lineItems.forEach((item) => {
    const lineUsd = Number(item.amount || 0) * Number(item.quantity || 1);
    const lineCdf = Math.round(lineUsd * cdfExchangeRate);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    const descLines = doc.splitTextToSize(item.description || 'Service Kinimmo', 105);
    doc.text(descLines.slice(0, 2), 18, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(item.quantity || 1), 132, y, { align: 'center' });
    doc.text(`${lineUsd.toLocaleString('fr-FR')} $`, 162, y, { align: 'right' });
    doc.text(`${lineCdf.toLocaleString('fr-FR')} FC`, 192, y, { align: 'right' });
    y += Math.max(8, descLines.slice(0, 2).length * 5 + 3);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, y - 2, 196, y - 2);
  });

  // Totaux
  y += 6;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.rect(108, y, 88, 26, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Total réglé en USD :', 113, y + 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(`${amountUsd.toLocaleString('fr-FR')} USD`, 191, y + 8, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Équivalent CDF (1$ = ${cdfExchangeRate.toLocaleString('fr-FR')} FC) :`, 113, y + 17);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(5, 150, 105);
  doc.text(`${amountCdf.toLocaleString('fr-FR')} CDF`, 191, y + 17, { align: 'right' });

  // Notes éventuelles (remboursement ou commentaire admin)
  const noteText =
    invoice.refundNote ||
    invoice.refund_note ||
    invoice.notes ||
    'Ce reçu certifie la réception et la validation du paiement sur les comptes officiels Kinimmo RDC.';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Mentions & Notes :', 14, y + 40);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const noteLines = doc.splitTextToSize(noteText, 132);
  doc.text(noteLines.slice(0, 4), 14, y + 46);

  // QR Code de vérification en pied de reçu
  if (qrDataUrl) {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.rect(158, y + 36, 36, 40, 'FD');
    doc.addImage(qrDataUrl, 'PNG', 160, y + 38, 32, 32);
    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Vérification Reçu', 176, y + 73.5, { align: 'center' });
  }

  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Document généré électroniquement par Kinimmo RDC • Réf. ${receiptNum}`,
    105,
    285,
    { align: 'center' }
  );

  const cleanFileName = `Recu_Kinimmo_${receiptNum}.pdf`;
  if (mode === 'print') {
    doc.autoPrint();
    const blob = doc.output('blob');
    triggerHiddenIframePrint(blob);
  } else {
    doc.save(cleanFileName);
  }
}

/**
 * Génère localement un QR Code PNG DataURL pour une annonce (sans dépendance API externe).
 */
export async function generateListingQrPng(url: string, size = 512): Promise<string> {
  return QRCode.toDataURL(url, {
    width: size,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: { dark: '#0f172a', light: '#ffffff' },
  });
}

/**
 * Génère localement un QR Code SVG vectoriel haute qualité pour panneaux imprimés.
 */
export async function generateListingQrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: 'svg',
    margin: 2,
    errorCorrectionLevel: 'H',
    color: { dark: '#0f172a', light: '#ffffff' },
  });
}

/**
 * Génère une affiche imprimable « À VENDRE » ou « À LOUER » (A4 portrait)
 * destinée aux panneaux d'affichage sur façade ou parcelle avec QR code scannable (P2).
 */
export async function generateSignboardPosterPDF(
  property: Property,
  listingUrl: string,
  contactPhone = '+243 84 529 4616',
  mode: 'download' | 'print' = 'download'
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const isSale = property.status === 'for-sale';
  const bannerLabel = isSale ? 'À VENDRE' : 'À LOUER';
  const priceLabel = `${Number(property.price || 0).toLocaleString('fr-FR')} ${property.currency || 'USD'}${
    !isSale && property.period === 'month' ? ' / mois' : ''
  }`;
  const locationLabel = [property.quartier, property.commune || property.city || 'Kinshasa']
    .filter(Boolean)
    .join(' • ');

  const qrDataUrl = await generateListingQrPng(listingUrl, 720);

  // Bandeau d'accroche supérieur haute visibilité
  doc.setFillColor(isSale ? 5 : 15, isSale ? 150 : 23, isSale ? 105 : 42);
  doc.rect(0, 0, 210, 56, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(42);
  doc.setTextColor(255, 255, 255);
  doc.text(bannerLabel, 105, 32, { align: 'center' });

  doc.setFontSize(11);
  doc.setTextColor(226, 232, 240);
  doc.text('KINIMMO RDC • ANNONCE IMMOBILIÈRE VÉRIFIÉE', 105, 45, { align: 'center' });

  // Cadre titre & prix
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, 66, 182, 50, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(15, 23, 42);
  const titleLines = doc.splitTextToSize(property.title || 'Bien immobilier à Kinshasa', 166);
  doc.text(titleLines.slice(0, 2), 105, 80, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(71, 85, 105);
  doc.text(locationLabel, 105, 96, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(5, 150, 105);
  doc.text(priceLabel, 105, 109, { align: 'center' });

  // Grand QR code central scannable à distance
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.8);
  doc.rect(47, 126, 116, 122, 'FD');
  doc.addImage(qrDataUrl, 'PNG', 53, 132, 104, 104);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('SCANNEZ POUR VOIR PHOTOS, VIDÉO & PRIX', 105, 243, { align: 'center' });

  // Contact & lien direct en pied d'affiche
  doc.setFillColor(15, 23, 42);
  doc.rect(14, 256, 182, 28, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(52, 211, 153);
  doc.text(`TÉL / WHATSAPP : ${contactPhone}`, 105, 268, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(listingUrl.slice(0, 85), 105, 277, { align: 'center' });

  const slugName = (property.title || property.id)
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 28);
  const fileName = `Panneau_${isSale ? 'A_Vendre' : 'A_Louer'}_${slugName}.pdf`;

  if (mode === 'print') {
    doc.autoPrint();
    const blob = doc.output('blob');
    triggerHiddenIframePrint(blob);
  } else {
    doc.save(fileName);
  }
}

