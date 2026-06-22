import { describe, expect, it, vi } from "vitest";
import { CLIENT_USER_ID_KEY, getOrCreateClientUserId } from "./clientIdentity";

function createStorage(initialValue: string | null = null) {
  let value = initialValue;
  return {
    getItem: vi.fn(() => value),
    setItem: vi.fn((_key: string, nextValue: string) => {
      value = nextValue;
    }),
  };
}

describe("getOrCreateClientUserId", () => {
  it("reuses the same browser identity", () => {
    const storage = createStorage("existing-id");
    const createId = vi.fn(() => "new-id");

    expect(getOrCreateClientUserId(storage, createId)).toBe("existing-id");
    expect(createId).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("persists a newly generated identity", () => {
    const storage = createStorage();

    expect(getOrCreateClientUserId(storage, () => "new-id")).toBe("new-id");
    expect(storage.setItem).toHaveBeenCalledWith(CLIENT_USER_ID_KEY, "new-id");
  });
});
