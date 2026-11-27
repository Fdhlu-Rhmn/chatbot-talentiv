import { expect, test } from "vitest";
import { cariBentrok } from "@/lib/jarkoman/bentrok";
import { wib } from "@/lib/jarkoman/waktu";

test("sesi tumpang tindih di hari yang sama bentrok", () => {
  const r = cariBentrok([
    { id: "a", mulai: wib(2026, 12, 1, 19, 30) },
    { id: "b", mulai: wib(2026, 12, 1, 20, 0) },
  ]);
  expect([...r].sort()).toEqual(["a", "b"]);
});

test("berurutan tanpa tumpang tindih tidak bentrok", () => {
  expect(cariBentrok([{ id: "a", mulai: wib(2026, 12, 1, 19, 30) }, { id: "b", mulai: wib(2026, 12, 1, 21, 30) }]).size).toBe(0);
});

test("hari berbeda tidak bentrok", () => {
  expect(cariBentrok([{ id: "a", mulai: wib(2026, 12, 1, 19, 30) }, { id: "b", mulai: wib(2026, 12, 2, 19, 30) }]).size).toBe(0);
});
