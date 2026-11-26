import { FormAdminWa } from "@/components/FormAdminWa";
import { Kartu } from "@/components/ui";
import { muatDashboard } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Nomor() {
  const data = await muatDashboard();
  const terhubung = Boolean(process.env.WA_PHONE_NUMBER_ID && process.env.WA_TOKEN);
  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="text-3xl md:text-4xl">Nomor WhatsApp</h1>
      <Kartu>
        <p className="text-xs text-ink-muted">Nomor bisnis (pengirim)</p>
        <p className="text-lg font-semibold">{process.env.WA_BUSINESS_NUMBER || "Belum diatur"}</p>
        <p className={`text-sm ${terhubung ? "text-cta" : "text-oranye"}`}>
          {terhubung ? "Terhubung ke WhatsApp Cloud API resmi Meta" : "Belum terhubung: isi WA_TOKEN dan WA_PHONE_NUMBER_ID di server"}
        </p>
        <p className="mt-3 text-sm text-ink-muted">
          Notifikasi memakai dua template resmi: <code>jarkoman_siap_kirim</code> dan <code>jarkoman_perlu_dilengkapi</code>.
          Grup kelas tidak bisa dikirimi langsung lewat API resmi (maksimal 8 anggota), jadi admin menyalin teks ke grup.
        </p>
      </Kartu>
      <Kartu>
        <FormAdminWa awal={data.pengaturan.admin_wa ?? ""} />
      </Kartu>
    </div>
  );
}
