import { expect, test } from "vitest";
import { amanNext } from "@/lib/aman";

test("amanNext menolak redirect ke luar", () => {
  expect(amanNext("/jadwal?x=1")).toBe("/jadwal?x=1");
  expect(amanNext("//evil.com")).toBe("/");
  expect(amanNext("/\\evil.com")).toBe("/");
  expect(amanNext("https://evil.com")).toBe("/");
  expect(amanNext(null)).toBe("/");
});

test("M1: karakter kontrol ditolak", () => {
  expect(amanNext("/\t/evil.com")).toBe("/");
  expect(amanNext("/\n/evil.com")).toBe("/");
});
