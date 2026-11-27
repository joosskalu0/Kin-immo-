import { Agency, Agent, Property, User } from '../types';

const DEFAULT_ADVERTISER_NAME = 'Conseiller Kinimmo';
const DEFAULT_ADVERTISER_PHONE = '+243 81 000 0001';
const DEFAULT_ADVERTISER_EMAIL = 'contact@kinimmo.com';
const DEFAULT_ADVERTISER_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';

const PLACEHOLDER_PHONE_DIGITS = new Set(['243810000000', '243810000001', '810000000', '810000001']);

function isNonEmptyString(val: unknown): val is string {
  return typeof val === 'string' && val.trim().length > 0;
}

export function isPlaceholderPhone(phone?: string | null): boolean {
  if (!isNonEmptyString(phone)) return true;
  const digits = phone.replace(/\D/g, '');
  return !digits || PLACEHOLDER_PHONE_DIGITS.has(digits);
}

function pickPreferredPhone(...candidates: Array<string | undefined | null>): string {
  for (const candidate of candidates) {
    if (isNonEmptyString(candidate) && !isPlaceholderPhone(candidate)) {
      return candidate.trim();
    }
  }
  for (const candidate of candidates) {
    if (isNonEmptyString(candidate)) {
      return candidate.trim();
    }
  }
  return DEFAULT_ADVERTISER_PHONE;
}

function pickPreferredEmail(...candidates: Array<string | undefined | null>): string {
  for (const candidate of candidates) {
    if (isNonEmptyString(candidate) && candidate.trim().toLowerCase() !== DEFAULT_ADVERTISER_EMAIL) {
      return candidate.trim();
    }
  }
  return DEFAULT_ADVERTISER_EMAIL;
}

function pickPreferredString(...candidates: Array<string | undefined | null>): string | undefined {
  for (const candidate of candidates) {
    if (isNonEmptyString(candidate)) {
      return candidate.trim();
    }
  }
  return undefined;
}

export interface AdvertiserResolutionContext {
  agents?: Agent[];
  agencies?: Agency[];
  allUsers?: User[];
}

export interface ResolvedPropertyAdvertiser {
  agent: Agent | undefined;
  agency: Agency | undefined;
  matchedUser: User | undefined;
  name: string;
  photo: string;
  phone: string;
  whatsapp: string;
  email: string;
  agencyName: string;
  isVerified: boolean;
  tenureSourceDate: string;
}

export function findPropertyAgent(
  property: Property,
  agents: Agent[] = []
): Agent | undefined {
  const emailCandidates = [property.agentEmail, property.contactEmail]
    .filter(isNonEmptyString)
    .map((e) => e.trim().toLowerCase());

  return agents.find(
    (a) =>
      (property.agentId && (a.id === property.agentId || a.userId === property.agentId || a.name === property.agentId)) ||
      (property.userId && (a.userId === property.userId || a.id === property.userId)) ||
      (a.email && emailCandidates.includes(a.email.trim().toLowerCase()))
  );
}

export function findPropertyAgency(
  property: Property,
  agencies: Agency[] = [],
  agent?: Agent
): Agency | undefined {
  if (property.agencyId) {
    const byId = agencies.find(
      (ag) =>
        ag.id === property.agencyId ||
        ag.name === property.agencyName ||
        (property.agencyId === 'agency_1' && ag.id === 'agency_congo_luxury') ||
        (property.agencyId === 'agency_2' && ag.id === 'agency_fleuve_habitat')
    );
    if (byId) return byId;
  }
  if (agent?.agencyId) {
    const byAgentAgency = agencies.find(
      (ag) => ag.id === agent.agencyId || ag.name === agent.agencyName
    );
    if (byAgentAgency) return byAgentAgency;
  }
  if (property.agencyName) {
    const targetName = property.agencyName.toLowerCase().trim();
    return agencies.find((ag) => ag.name?.toLowerCase().trim() === targetName);
  }
  return undefined;
}

export function resolvePropertyAdvertiser(
  property: Property,
  { agents = [], agencies = [], allUsers = [] }: AdvertiserResolutionContext = {}
): ResolvedPropertyAdvertiser {
  const agent = findPropertyAgent(property, agents);
  const agency = findPropertyAgency(property, agencies, agent);

  const emailCandidates = [property.agentEmail, property.contactEmail]
    .filter(isNonEmptyString)
    .map((e) => e.trim().toLowerCase());

  const matchedUser = allUsers.find(
    (u) =>
      (property.userId && u.id === property.userId) ||
      (property.agentId && (u.id === property.agentId || u.agentId === property.agentId)) ||
      (u.email && emailCandidates.includes(u.email.trim().toLowerCase()))
  );

  const name =
    pickPreferredString(
      agent?.name,
      matchedUser?.name,
      property.agentName,
      agency?.managerName,
      agency?.name,
      property.agencyName
    ) || DEFAULT_ADVERTISER_NAME;

  const photo =
    pickPreferredString(
      agent?.avatar,
      matchedUser?.avatar,
      property.agentAvatar,
      agency?.logo,
      property.agencyLogo
    ) || DEFAULT_ADVERTISER_AVATAR;

  const phone = pickPreferredPhone(
    matchedUser?.phone,
    property.agentPhone,
    property.contactPhone,
    agent?.phone,
    agency?.phone,
    property.agencyPhone,
    matchedUser?.whatsapp,
    property.agentWhatsapp,
    property.contactWhatsapp,
    agent?.whatsapp,
    agency?.whatsapp,
    property.agencyWhatsapp
  );

  const whatsapp = pickPreferredPhone(
    matchedUser?.whatsapp,
    property.agentWhatsapp,
    property.contactWhatsapp,
    agent?.whatsapp,
    agency?.whatsapp,
    property.agencyWhatsapp,
    matchedUser?.phone,
    property.agentPhone,
    property.contactPhone,
    agent?.phone,
    agency?.phone,
    property.agencyPhone
  );

  const email = pickPreferredEmail(
    matchedUser?.email,
    property.agentEmail,
    property.contactEmail,
    agent?.email,
    agency?.email,
    property.agencyEmail
  );

  const agencyName =
    pickPreferredString(agency?.name, agent?.agencyName, property.agencyName) || 'Kinimmo Partenaire';

  const isVerified = Boolean(
    property.trust_status === 'property_verified' ||
      agent?.isVerified ||
      agent?.verificationStatus === 'verified' ||
      matchedUser?.isVerified ||
      property.agentVerified ||
      agency?.isVerified ||
      agency?.verificationStatus === 'verified'
  );

  const tenureSourceDate =
    matchedUser?.createdAt ||
    property.agentCreatedAt ||
    agency?.createdAt ||
    agent?.verifiedAt ||
    property.createdAt;

  return {
    agent,
    agency,
    matchedUser,
    name,
    photo,
    phone,
    whatsapp,
    email,
    agencyName,
    isVerified,
    tenureSourceDate,
  };
}
