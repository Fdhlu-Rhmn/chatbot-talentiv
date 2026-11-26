// Hanya path internal, supaya ?next= tidak bisa dipakai redirect ke situs lain.
export const amanNext = (n: unknown): string =>
  typeof n === "string" && n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/\\") ? n : "/";
