export const CLIENT_USER_ID_KEY = "minkaraUserId";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function getOrCreateClientUserId(
  storage: StorageLike,
  createId: () => string = () => crypto.randomUUID(),
): string {
  const savedId = storage.getItem(CLIENT_USER_ID_KEY);
  if (savedId) return savedId;

  const userId = createId();
  storage.setItem(CLIENT_USER_ID_KEY, userId);
  return userId;
}

export function getClientUserId(): string {
  if (typeof window === "undefined") return "anonymous";
  return getOrCreateClientUserId(window.localStorage);
}
