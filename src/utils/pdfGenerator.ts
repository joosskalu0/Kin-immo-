import { jsPDF } from 'jspdf';
import { Property, CustomFieldDefinition, Agent, CurrencyCode } from '../types';
import { convertAndFormatPrice } from './currency';

export function generatePropertyPDF(
  property: Property,
  customFieldDefs: CustomFieldDefinition[],
  agent?: Agent,
  currencyCode: CurrencyCode = 'EUR'
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Header Banner
  doc.setFillColor(30, 41, 59); // Slate 800
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('ImmoCraft Real Estate', 14, 14);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Fiche Descriptive Officielle', 14, 21);

  doc.text(`Réf: #${property.id}`, 170, 14);

  // Property Title & Price
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(property.title, 14, 38);

  const formattedPrice = convertAndFormatPrice(property.price, currencyCode);
  doc.setTextColor(16, 185, 129); // Emerald 500
  doc.setFontSize(15);
  doc.text(formattedPrice + (property.period === 'month' ? ' / mois' : ''), 14, 46);

  // Location
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${property.address}, ${property.zipCode} ${property.city}, ${property.country}`, 14, 53);

  // Status & Category badges
  doc.setFillColor(241, 245, 249);
  doc.rect(14, 57, 182, 8, 'F');
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(9);
  const statusFrench = property.status === 'sold' ? 'VENDU (TRANSACTION CONCLUE)' : property.status === 'for-sale' ? 'A VENDRE' : property.status === 'for-rent' ? 'A LOUER' : property.status;
  doc.text(`Statut: ${statusFrench}   |   Type: ${property.type.toUpperCase()}   |   Catégorie: ${property.category}`, 18, 62);

  // Main Image placeholder frame
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.rect(14, 69, 182, 75, 'FD');
  
  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139);
  doc.text(`[ Photo Principale de la propriété ]`, 70, 105);
  doc.setFontSize(8);
  doc.text(`URL: ${property.images[0] || 'Image indisponible'}`, 25, 112);

  // Key Specs Grid
  doc.setFillColor(241, 245, 249);
  doc.rect(14, 148, 182, 22, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);

  doc.text(`Chambres: ${property.bedrooms}`, 20, 157);
  doc.text(`Salles de bain: ${property.bathrooms}`, 65, 157);
  doc.text(`Surface: ${property.area} m²`, 115, 157);
  doc.text(`Garages: ${property.garages || 0}`, 160, 157);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Année de constr.: ${property.yearBuilt || 'N/C'}`, 20, 164);

  // Custom Fields (Fields Builder Section)
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Champs Personnalisés (Fields Builder)', 14, 180);

  let currentY = 188;
  const publicCustomFields = customFieldDefs.filter(f => !f.isPrivate);

  if (publicCustomFields.length > 0) {
    publicCustomFields.forEach((fieldDef) => {
      const val = property.customFields[fieldDef.key];
      if (val !== undefined && val !== null && val !== '') {
        const label = fieldDef.label['fr'] || fieldDef.label['en'] || fieldDef.key;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text(`• ${label}:`, 16, currentY);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        doc.text(`${val} ${fieldDef.unit || ''}`, 70, currentY);
        currentY += 6;
      }
    });
  } else {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text('Aucun champ personnalisé défini pour cette propriété.', 16, currentY);
    currentY += 6;
  }

  // Description
  currentY += 4;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Description', 14, currentY);
  currentY += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);

  const splitDescription = doc.splitTextToSize(property.description, 180);
  doc.text(splitDescription.slice(0, 4), 14, currentY);

  // Agent Contact Box Footer
  const footerY = 250;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(226, 232, 240);
  doc.rect(14, footerY, 182, 32, 'FD');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`Agent Référent: ${agent ? agent.name : 'ImmoCraft Service Client'}`, 20, footerY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Téléphone: ${agent ? agent.phone : '+33 1 89 20 40 50'}`, 20, footerY + 14);
  doc.text(`Email: ${agent ? agent.email : 'contact@immocraft.fr'}`, 20, footerY + 20);
  doc.text(`Agence: ${agent ? agent.agencyName || 'ImmoCraft Deluxe' : 'ImmoCraft Inc'}`, 20, footerY + 26);

  // Simulated QR Code Frame
  doc.setDrawColor(15, 23, 42);
  doc.rect(160, footerY + 4, 24, 24);
  doc.setFontSize(6);
  doc.text('SCAN QR', 165, footerY + 17);

  // Trigger browser download
  doc.save(`ImmoCraft_Property_${property.id}_${property.city}.pdf`);
}
