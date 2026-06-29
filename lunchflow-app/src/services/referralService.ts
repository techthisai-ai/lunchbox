import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizePhone } from '../constants/auth';
import { creditWalletReward } from './paymentService';
import { syncDocument, loadDocument } from './firestoreSync';

export const REFERRAL_REWARD_AMOUNT = 50;
export const WELCOME_BONUS_AMOUNT = 25;

export type ReferralEvent = {
  id: string;
  type: 'referral_bonus' | 'welcome_bonus';
  title: string;
  description: string;
  amount: number;
  date: string;
  createdAt: string;
  referredPhone?: string;
  referredName?: string;
};

export type ReferralProfile = {
  phone: string;
  name: string;
  code: string;
  creditsEarned: number;
  friendsInvited: number;
  successfulReferrals: number;
  events: ReferralEvent[];
  createdAt: string;
  updatedAt: string;
};

export type ReferralStats = {
  code: string;
  creditsEarned: number;
  friendsInvited: number;
  successfulReferrals: number;
  events: ReferralEvent[];
};

const PROFILE_PREFIX = '@lunchflow_referral_profile_';
const CODE_INDEX_KEY = '@lunchflow_referral_code_index';
const SIGNUP_REFERRAL_PREFIX = '@lunchflow_referral_signup_';

function profileKey(phone: string): string {
  return `${PROFILE_PREFIX}${normalizePhone(phone)}`;
}

function signupKey(phone: string): string {
  return `${SIGNUP_REFERRAL_PREFIX}${normalizePhone(phone)}`;
}

function formatEventDate(date = new Date()): string {
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function normalizeReferralCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '');
}

export function generateReferralCode(name: string, phone: string): string {
  const letters = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
  const prefix = (letters.slice(0, 4) || 'LUNCH').padEnd(4, 'X');
  return `${prefix}${normalizePhone(phone).slice(-4)}`;
}

async function readCodeIndex(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(CODE_INDEX_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

async function writeCodeIndex(index: Record<string, string>): Promise<void> {
  await AsyncStorage.setItem(CODE_INDEX_KEY, JSON.stringify(index));
}

async function loadReferralProfileLocal(phone: string): Promise<ReferralProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(profileKey(phone));
    return raw ? (JSON.parse(raw) as ReferralProfile) : null;
  } catch {
    return null;
  }
}

async function saveReferralProfileLocal(profile: ReferralProfile): Promise<void> {
  await AsyncStorage.setItem(profileKey(profile.phone), JSON.stringify(profile));
  const index = await readCodeIndex();
  index[profile.code] = profile.phone;
  await writeCodeIndex(index);
  await syncDocument('referrals', profile.phone, profile as unknown as Record<string, unknown>);
}

async function hydrateReferralProfileFromRemote(phone: string): Promise<ReferralProfile | null> {
  return loadDocument<ReferralProfile>('referrals', normalizePhone(phone));
}

export async function lookupReferrerPhone(code: string): Promise<string | null> {
  const normalized = normalizeReferralCode(code);
  if (!normalized) return null;

  const index = await readCodeIndex();
  if (index[normalized]) return index[normalized];

  const remote = await loadDocument<{ code: string; phone: string }>('referral_codes', normalized);
  return remote?.phone ?? null;
}

export async function validateReferralCode(
  code: string,
  newUserPhone: string,
): Promise<{ ok: true; referrerPhone: string } | { ok: false; error: string }> {
  const normalized = normalizeReferralCode(code);
  if (!normalized) {
    return { ok: false, error: 'Enter a valid referral code' };
  }

  const newPhone = normalizePhone(newUserPhone);
  const referrerPhone = await lookupReferrerPhone(normalized);
  if (!referrerPhone) {
    return { ok: false, error: 'Referral code not found' };
  }
  if (referrerPhone === newPhone) {
    return { ok: false, error: 'You cannot use your own referral code' };
  }

  return { ok: true, referrerPhone };
}

export async function ensureReferralProfile(phone: string, name: string): Promise<ReferralProfile> {
  const normalized = normalizePhone(phone);
  let profile = await loadReferralProfileLocal(normalized);
  if (!profile) {
    profile = await hydrateReferralProfileFromRemote(normalized);
    if (profile) {
      await saveReferralProfileLocal(profile);
      return profile;
    }
  }
  if (profile) return profile;

  const index = await readCodeIndex();
  let code = generateReferralCode(name, normalized);
  let attempt = 0;
  while (index[code] && index[code] !== normalized && attempt < 26) {
    code = `${generateReferralCode(name, normalized)}${String.fromCharCode(65 + attempt)}`;
    attempt += 1;
  }

  const now = new Date().toISOString();
  profile = {
    phone: normalized,
    name: name.trim() || 'Customer',
    code,
    creditsEarned: 0,
    friendsInvited: 0,
    successfulReferrals: 0,
    events: [],
    createdAt: now,
    updatedAt: now,
  };

  await saveReferralProfileLocal(profile);
  await syncDocument('referral_codes', code, { code, phone: normalized, updatedAt: now });
  return profile;
}

export async function loadReferralStats(phone: string, name: string): Promise<ReferralStats> {
  const profile = await ensureReferralProfile(phone, name);
  return {
    code: profile.code,
    creditsEarned: profile.creditsEarned,
    friendsInvited: profile.friendsInvited,
    successfulReferrals: profile.successfulReferrals,
    events: [...profile.events].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}

function buildReferralEvent(
  type: ReferralEvent['type'],
  title: string,
  description: string,
  amount: number,
  extras?: Pick<ReferralEvent, 'referredPhone' | 'referredName'>,
): ReferralEvent {
  const now = new Date();
  return {
    id: `${type}-${now.getTime()}`,
    type,
    title,
    description,
    amount,
    date: formatEventDate(now),
    createdAt: now.toISOString(),
    ...extras,
  };
}

export async function applyReferralOnSignup(input: {
  newUserPhone: string;
  newUserName: string;
  referralCode: string;
}): Promise<void> {
  const newPhone = normalizePhone(input.newUserPhone);
  const validation = await validateReferralCode(input.referralCode, newPhone);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const alreadyApplied = await AsyncStorage.getItem(signupKey(newPhone));
  if (alreadyApplied) return;

  const referrerPhone = validation.referrerPhone;
  const referrerProfile = await loadReferralProfileLocal(referrerPhone);
  if (!referrerProfile) return;

  const referrerName = referrerProfile.name || 'Friend';
  const newUserName = input.newUserName.trim() || 'Friend';
  const now = new Date().toISOString();

  const referrerEvent = buildReferralEvent(
    'referral_bonus',
    'Referral Bonus',
    `${referrerName} referred ${newUserName}`,
    REFERRAL_REWARD_AMOUNT,
    { referredPhone: newPhone, referredName: newUserName },
  );

  const updatedReferrer: ReferralProfile = {
    ...referrerProfile,
    creditsEarned: referrerProfile.creditsEarned + REFERRAL_REWARD_AMOUNT,
    friendsInvited: referrerProfile.friendsInvited + 1,
    successfulReferrals: referrerProfile.successfulReferrals + 1,
    events: [referrerEvent, ...referrerProfile.events],
    updatedAt: now,
  };

  await saveReferralProfileLocal(updatedReferrer);
  await creditWalletReward(
    referrerPhone,
    REFERRAL_REWARD_AMOUNT,
    'Referral Credit',
    'Referral Credit',
  );

  await ensureReferralProfile(newPhone, newUserName);
  const newUserProfile = await loadReferralProfileLocal(newPhone);
  if (newUserProfile) {
    const welcomeEvent = buildReferralEvent(
      'welcome_bonus',
      'Welcome Bonus',
      'Account signup with referral code',
      WELCOME_BONUS_AMOUNT,
    );
    const updatedNewUser: ReferralProfile = {
      ...newUserProfile,
      creditsEarned: newUserProfile.creditsEarned + WELCOME_BONUS_AMOUNT,
      events: [welcomeEvent, ...newUserProfile.events],
      updatedAt: now,
    };
    await saveReferralProfileLocal(updatedNewUser);
  }

  await creditWalletReward(
    newPhone,
    WELCOME_BONUS_AMOUNT,
    'Welcome Bonus',
    'Welcome Bonus',
  );

  await AsyncStorage.setItem(signupKey(newPhone), normalizeReferralCode(input.referralCode));
}

export function buildReferralShareMessage(code: string): string {
  return `Join LunchFlow for daily lunchbox delivery! Use my referral code ${code} when you sign up.`;
}
