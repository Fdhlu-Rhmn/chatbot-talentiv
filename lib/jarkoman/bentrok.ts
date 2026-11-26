const MENIT = 60_000;

// Id sesi yang rentang waktunya tumpang tindih dengan sesi lain. O(n log n) via urut + sapuan.
export function cariBentrok(sesi: { id: string; mulai: Date; durasiMenit?: number }[]): Set<string> {
  const hasil = new Set<string>();
  const urut = sesi
    .map((s) => ({ id: s.id, a: s.mulai.getTime(), b: s.mulai.getTime() + (s.durasiMenit ?? 120) * MENIT }))
    .sort((x, y) => x.a - y.a);
  let terjauh: { id: string; b: number } | null = null;
  for (const s of urut) {
    if (terjauh && s.a < terjauh.b) {
      hasil.add(s.id);
      hasil.add(terjauh.id);
    }
    if (!terjauh || s.b > terjauh.b) terjauh = { id: s.id, b: s.b };
  }
  return hasil;
}
