import { expect, test } from "vitest";
import { terapkanOverride } from "@/lib/jarkoman/efektif";

const kelas = { id: "k1", linkTna: "a", linkGcal: "g" };

test("override menang atas data sumber, walau sumber berubah", () => {
  const o = [{ entitas: "kelas" as const, entitasId: "k1", field: "linkTna", nilai: "b" }];
  const r = terapkanOverride(kelas, "kelas", o);
  expect(r.data.linkTna).toBe("b");
  expect(r.sumber.linkTna).toBe("manual");
  expect(r.sumber.linkGcal).toBe("api");
  expect(terapkanOverride({ ...kelas, linkTna: "baru" }, "kelas", o).data.linkTna).toBe("b");
});

test("tanpa override, nilai sumber dipakai", () => {
  const r = terapkanOverride(kelas, "kelas", [{ entitas: "sesi", entitasId: "k1", field: "linkTna", nilai: "x" }]);
  expect(r.data.linkTna).toBe("a");
  expect(r.sumber.linkTna).toBe("api");
});

test("override field array (profil mentor) dipecah per baris", () => {
  const r = terapkanOverride({ id: "s1", mentorProfil: ["x"] }, "sesi", [
    { entitas: "sesi", entitasId: "s1", field: "mentorProfil", nilai: "a\nb" },
  ]);
  expect(r.data.mentorProfil).toEqual(["a", "b"]);
});
