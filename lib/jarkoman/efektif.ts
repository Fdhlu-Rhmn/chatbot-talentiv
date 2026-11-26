export interface Override {
  entitas: "kelas" | "sesi";
  entitasId: string;
  field: string;
  nilai: string;
}

export function terapkanOverride<T extends { id: string }>(
  row: T,
  entitas: "kelas" | "sesi",
  o: Override[],
): { data: T; sumber: Partial<Record<keyof T, "api" | "manual">> } {
  const data = { ...row } as Record<string, unknown>;
  const sumber: Record<string, "api" | "manual"> = {};
  for (const k of Object.keys(row)) sumber[k] = "api";
  for (const x of o) {
    if (x.entitas !== entitas || x.entitasId !== row.id) continue;
    data[x.field] = Array.isArray(data[x.field]) ? x.nilai.split("\n").filter(Boolean) : x.nilai;
    sumber[x.field] = "manual";
  }
  return { data: data as T, sumber: sumber as Partial<Record<keyof T, "api" | "manual">> };
}
