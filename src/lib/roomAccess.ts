import type { Room } from "@/types";

export function isRoomHost(
  room: Pick<Room, "host_id"> | null,
  userId: string | null,
): boolean {
  return Boolean(room && userId && room.host_id === userId);
}
