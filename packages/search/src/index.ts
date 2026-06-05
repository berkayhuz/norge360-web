export type SearchResultItem = {
  id: string;
  source: string | number;
  type: string;
  title: string;
  summary: string;
  url: string;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  followersCount?: number | null;
  isVerified?: boolean | null;
};

export type SearchSuggestResponse = {
  query: string;
  page: number;
  pageSize: number;
  totalCount: number;
  items: SearchResultItem[];
};

type RawRecord = Record<string, unknown>;

export function normalizeSearchSuggestResponse(raw: unknown): SearchSuggestResponse | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as RawRecord;
  const query = readString(source, "query", "Query");
  const page = readNumber(source, "page", "Page");
  const pageSize = readNumber(source, "pageSize", "PageSize");
  const totalCount = readNumber(source, "totalCount", "TotalCount");
  const itemsRaw = readUnknown(source, "items", "Items");
  if (query === null || page === null || pageSize === null || totalCount === null || !Array.isArray(itemsRaw)) {
    return null;
  }

  const items = itemsRaw
    .map(normalizeItem)
    .filter((item): item is SearchResultItem => item !== null);

  return { query, page, pageSize, totalCount, items };
}

function normalizeItem(raw: unknown): SearchResultItem | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as RawRecord;
  const id = readString(source, "id", "Id");
  const resultSource = readStringOrNumber(source, "source", "Source");
  const type = readString(source, "type", "Type");
  const title = readString(source, "title", "Title");
  const summary = readString(source, "summary", "Summary") ?? "";
  const url = readString(source, "url", "Url") ?? "/";
  if (!id || resultSource === null || !type || !title) {
    return null;
  }

  return {
    id,
    source: resultSource,
    type,
    title,
    summary,
    url,
    username: readString(source, "username", "Username"),
    displayName: readString(source, "displayName", "DisplayName"),
    avatarUrl: readString(source, "avatarUrl", "AvatarUrl"),
    bio: readString(source, "bio", "Bio"),
    followersCount: readNumber(source, "followersCount", "FollowersCount"),
    isVerified: readBoolean(source, "isVerified", "IsVerified"),
  };
}

function readUnknown(source: RawRecord, ...keys: string[]) {
  for (const key of keys) {
    if (key in source) return source[key];
  }
  return undefined;
}

function readString(source: RawRecord, ...keys: string[]) {
  const value = readUnknown(source, ...keys);
  return typeof value === "string" ? value : null;
}

function readNumber(source: RawRecord, ...keys: string[]) {
  const value = readUnknown(source, ...keys);
  return typeof value === "number" ? value : null;
}

function readBoolean(source: RawRecord, ...keys: string[]) {
  const value = readUnknown(source, ...keys);
  return typeof value === "boolean" ? value : null;
}

function readStringOrNumber(source: RawRecord, ...keys: string[]) {
  const value = readUnknown(source, ...keys);
  return typeof value === "string" || typeof value === "number" ? value : null;
}
