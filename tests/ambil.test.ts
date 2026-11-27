import { expect, test } from "vitest";
import { ambilSemua } from "@/lib/ambil";

test("C3: ambilSemua mengambil per halaman sampai habis", async () => {
  const data = Array.from({ length: 2500 }, (_, i) => i);
  const panggilan: [number, number][] = [];
  const hasil = await ambilSemua<number>((a, b) => {
    panggilan.push([a, b]);
    return Promise.resolve({ data: data.slice(a, b + 1), error: null });
  });
  expect(hasil).toHaveLength(2500);
  expect(panggilan).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
});

test("ambilSemua melempar error", async () => {
  await expect(ambilSemua(() => Promise.resolve({ data: null, error: { message: "boom" } }))).rejects.toThrow("boom");
});
