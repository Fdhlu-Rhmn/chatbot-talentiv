// Hanya path internal, supaya ?next= tidak bisa dipakai redirect ke situs lain.
// Browser membuang tab/baris baru di URL, jadi "/\t/evil.com" menjadi "//evil.com": tolak karakter kontrol.
export const amanNext = (n: unknown): string =>
  typeof n === "string" && n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/\\") && !/[\u0000-\u001f\u007f]/.test(n)
    ? n
    : "/";
