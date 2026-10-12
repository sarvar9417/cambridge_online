export const LIVE_DRAFT_VERSION = 1;
export const LIVE_DRAFT_MAX_AGE_MS = 86_400_000;

export type LiveDraftIdentity = {
  userId: string;
  sessionId: string;
  questionId: string;
};

export type LiveDraftRecord = LiveDraftIdentity & {
  version: typeof LIVE_DRAFT_VERSION;
  answerId: string | null;
  text: string;
  updatedAt: number;
  tabId: string;
};

type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function storageOrNull(storage?: DraftStorage): DraftStorage | null {
  if (storage) return storage;
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function encoded(value: string) {
  return encodeURIComponent(value);
}

export function liveDraftKey(identity: LiveDraftIdentity) {
  return [
    'campath:live-draft',
    `v${LIVE_DRAFT_VERSION}`,
    encoded(identity.userId),
    encoded(identity.sessionId),
    encoded(identity.questionId),
  ].join(':');
}

export function legacyLiveDraftKey(sessionId: string, answerOrQuestionId: string) {
  return `campath:live-draft:${sessionId}:${answerOrQuestionId}`;
}

function parseDraft(raw: string, identity: LiveDraftIdentity, now: number): LiveDraftRecord | null {
  try {
    const value = JSON.parse(raw) as Partial<LiveDraftRecord>;
    if (
      value.version !== LIVE_DRAFT_VERSION
      || value.userId !== identity.userId
      || value.sessionId !== identity.sessionId
      || value.questionId !== identity.questionId
      || typeof value.text !== 'string'
      || typeof value.updatedAt !== 'number'
      || !Number.isFinite(value.updatedAt)
      || now - value.updatedAt > LIVE_DRAFT_MAX_AGE_MS
      || value.updatedAt > now + 60_000
      || typeof value.tabId !== 'string'
      || (value.answerId !== null && typeof value.answerId !== 'string')
    ) return null;
    return value as LiveDraftRecord;
  } catch {
    return null;
  }
}

export function readLiveDraft(
  identity: LiveDraftIdentity,
  options: { storage?: DraftStorage; now?: number } = {},
) {
  const storage = storageOrNull(options.storage);
  if (!storage) return null;
  const key = liveDraftKey(identity);
  const raw = storage.getItem(key);
  if (!raw) return null;
  const parsed = parseDraft(raw, identity, options.now ?? Date.now());
  if (!parsed) {
    try { storage.removeItem(key); } catch { /* Storage may be disabled. */ }
  }
  return parsed;
}

export function writeLiveDraft(
  identity: LiveDraftIdentity,
  input: { answerId: string | null; text: string; tabId: string; updatedAt?: number },
  storage?: DraftStorage,
) {
  const target = storageOrNull(storage);
  if (!target) return;
  const record: LiveDraftRecord = {
    version: LIVE_DRAFT_VERSION,
    ...identity,
    answerId: input.answerId,
    text: input.text,
    updatedAt: input.updatedAt ?? Date.now(),
    tabId: input.tabId,
  };
  try { target.setItem(liveDraftKey(identity), JSON.stringify(record)); } catch { /* Storage may be disabled or full. */ }
}

export function removeLiveDraft(identity: LiveDraftIdentity, storage?: DraftStorage) {
  const target = storageOrNull(storage);
  if (!target) return;
  try { target.removeItem(liveDraftKey(identity)); } catch { /* Storage may be disabled. */ }
}

export function migrateLegacyLiveDraft(
  identity: LiveDraftIdentity,
  answerOrQuestionId: string,
  answerId: string | null,
  tabId: string,
  options: { storage?: DraftStorage; now?: number } = {},
) {
  const storage = storageOrNull(options.storage);
  if (!storage) return null;
  const legacyKey = legacyLiveDraftKey(identity.sessionId, answerOrQuestionId);
  const raw = storage.getItem(legacyKey);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as { text?: unknown; updatedAt?: unknown };
    const now = options.now ?? Date.now();
    if (
      typeof value.text !== 'string'
      || typeof value.updatedAt !== 'number'
      || !Number.isFinite(value.updatedAt)
      || now - value.updatedAt > LIVE_DRAFT_MAX_AGE_MS
      || value.updatedAt > now + 60_000
    ) {
      storage.removeItem(legacyKey);
      return null;
    }
    const record: LiveDraftRecord = {
      version: LIVE_DRAFT_VERSION,
      ...identity,
      answerId,
      text: value.text,
      updatedAt: value.updatedAt,
      tabId,
    };
    storage.setItem(liveDraftKey(identity), JSON.stringify(record));
    storage.removeItem(legacyKey);
    return record;
  } catch {
    try { storage.removeItem(legacyKey); } catch { /* Storage may be disabled. */ }
    return null;
  }
}
