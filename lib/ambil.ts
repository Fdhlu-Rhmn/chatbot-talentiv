// PostgREST membatasi 1000 baris per request. Ambil per halaman sampai habis.
const HALAMAN = 1000;

export async function ambilSemua<T>(
  halaman: (dari: number, sampai: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const hasil: T[] = [];
  for (let dari = 0; ; dari += HALAMAN) {
    const { data, error } = await halaman(dari, dari + HALAMAN - 1);
    if (error) throw new Error(error.message);
    hasil.push(...(data ?? []));
    if (!data || data.length < HALAMAN) return hasil;
  }
}
