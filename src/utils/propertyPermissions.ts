import { Agent, Property, User } from '../types';

/**
 * Règle d'autorisation stricte :
 * Les actions sensibles sur une annonce (« Modifier », « Supprimer », confirmation de disponibilité)
 * sont visibles et autorisées UNIQUEMENT pour :
 * 1. L'administrateur de la plateforme (`admin`)
 * 2. Le propriétaire / créateur / agent titulaire de l'annonce
 * 3. L'agence mandataire rattachée à cette annonce (et son titulaire / collaborateur de la même agence)
 */
export function canUserManageProperty(
  user: User | null | undefined,
  property: Property | null | undefined,
  agents: Agent[] = []
): boolean {
  if (!user || !property) return false;

  // 1. Administrateur : accès complet
  if (user.role === 'admin') {
    return true;
  }

  const userEmail = user.email?.toLowerCase().trim();
  const propContactEmail = property.contactEmail?.toLowerCase().trim();
  const propOwnerEmail = property.privateFields?.ownerEmail?.toLowerCase().trim();

  // 2. Propriétaire / créateur / agent directement titulaire de l'annonce
  const isDirectOwner = Boolean(
    (property.userId && property.userId === user.id) ||
    (property.agentId && (
      property.agentId === user.id ||
      (user.agentId && property.agentId === user.agentId) ||
      (userEmail && property.agentId.toLowerCase().trim() === userEmail)
    )) ||
    (property.assignedAgentId && (
      property.assignedAgentId === user.id ||
      (user.agentId && property.assignedAgentId === user.agentId)
    )) ||
    (userEmail && (
      (propContactEmail && propContactEmail === userEmail) ||
      (propOwnerEmail && propOwnerEmail === userEmail)
    ))
  );

  if (isDirectOwner) {
    return true;
  }

  // 3. Agence rattachée au bien (uniquement si l'utilisateur appartient réellement à CETTE agence)
  const propAgencyId = property.agencyId?.trim();
  const propAgencyName = property.agencyName?.toLowerCase().trim();

  // Vérifier si l'agent rattaché au bien fait partie de l'agence de l'utilisateur
  const matchedAgent = agents.find(
    (a) => a.id === property.agentId || (propContactEmail && a.email?.toLowerCase().trim() === propContactEmail)
  );
  const resolvedPropAgencyId = propAgencyId || matchedAgent?.agencyId?.trim();
  const resolvedPropAgencyName = propAgencyName || matchedAgent?.agencyName?.toLowerCase().trim();

  const isSameAgencyById = Boolean(
    resolvedPropAgencyId && (
      (user.agencyId && user.agencyId.trim() === resolvedPropAgencyId) ||
      (user.role === 'agency' && user.id === resolvedPropAgencyId)
    )
  );

  const isSameAgencyByName = Boolean(
    user.role === 'agency' &&
    user.agencyName &&
    resolvedPropAgencyName &&
    user.agencyName.toLowerCase().trim() === resolvedPropAgencyName
  );

  return isSameAgencyById || isSameAgencyByName;
}
