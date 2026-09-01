import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Sparkles } from "lucide-react";
import { getPublicPersonalProfile } from "@/lib/public.functions";

export const Route = createFileRoute("/p/$slug")({
  head: ({ params }) => ({ meta: [{ title: `${params.slug} — ARIÉS` }] }),
  component: PerfilPublico,
});

function whatsappLink(numero: string): string {
  const digits = numero.replace(/\D/g, "");
  return `https://wa.me/${digits}`;
}

function PerfilPublico() {
  const { slug } = Route.useParams();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["perfil-publico", slug],
    queryFn: () => getPublicPersonalProfile({ data: { slug } }),
  });

  const especialidades = (profile?.especialidades ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center px-6 py-16">
      {isLoading ? (
        <div className="mt-24 text-[#9A9A9A] text-sm">Carregando…</div>
      ) : !profile ? (
        <div className="mt-24 text-center space-y-2">
          <p className="text-[#D4AF37] text-lg font-semibold">Perfil não encontrado</p>
          <p className="text-[#9A9A9A] text-sm">Esse link não existe ou não está mais disponível.</p>
        </div>
      ) : (
        <div className="w-full max-w-md flex flex-col items-center text-center gap-5">
          {profile.logo_url ? (
            <img src={profile.logo_url} alt={profile.brand_name ?? profile.full_name ?? ""} className="w-32 h-32 object-contain rounded-full border-2 border-[#D4AF37] p-1" />
          ) : (
            <div className="w-32 h-32 rounded-full border-2 border-[#D4AF37] bg-[#161616] flex items-center justify-center text-3xl font-bold text-[#D4AF37]">
              {(profile.brand_name ?? profile.full_name ?? "?").charAt(0).toUpperCase()}
            </div>
          )}

          <div>
            <p className="text-[#D4AF37] text-xs tracking-[0.3em] uppercase mb-1 flex items-center justify-center gap-1.5">
              <Sparkles className="size-3.5" /> Personal Trainer
            </p>
            <h1 className="text-2xl font-bold">{profile.brand_name ?? profile.full_name}</h1>
          </div>

          {especialidades.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-2">
              {especialidades.map((esp) => (
                <span key={esp} className="text-xs px-3 py-1 rounded-full border border-[#2A2417] text-[#F5D76E] bg-[#161616]">
                  {esp}
                </span>
              ))}
            </div>
          ) : null}

          {profile.bio ? <p className="text-[#9A9A9A] text-sm leading-relaxed">{profile.bio}</p> : null}

          {profile.contato_whatsapp ? (
            <a
              href={whatsappLink(profile.contato_whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#D4AF37] text-black font-semibold px-6 py-3 rounded-full mt-2 hover:opacity-90 transition"
            >
              <MessageCircle className="size-4" /> Falar no WhatsApp
            </a>
          ) : null}

          <p className="text-[10px] text-[#9A9A9A]/60 mt-10 tracking-widest uppercase">ARIÉS</p>
        </div>
      )}
    </div>
  );
}
