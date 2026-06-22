export function isUniqueConstraintViolation(
  error: { code?: string } | null,
): boolean {
  return error?.code === "23505";
}
