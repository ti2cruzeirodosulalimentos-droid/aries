import { type ReactNode, useState } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  Shield,
  LogOut,
  Menu,
  X,
  DollarSign,
  Calendar,
  Receipt,
  TrendingUp,
  Sun,
  Moon,
  MessageCircle,
  Settings,
} from "lucide-react";
import { Logo } from "./Logo";
import { useAuth } from "@/lib/auth";
import { usePermissions } from "@/lib/permissions";
import { useTheme } from "@/lib/theme";
import { toast } from "sonner";

type NavItem = { to: string; label: string; icon: typeof Users };

const NAV_ADMIN_PERSONAL: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/alunos", label: "Alunos", icon: Users },
  { to: "/exercicios", label: "Exercícios", icon: Dumbbell },
  { to: "/agenda", label: "Agenda", icon: Calendar },
  { to: "/mensagens", label: "Mensagens", icon: MessageCircle },
  { to: "/financeiro", label: "Financeiro", icon: DollarSign },
];

const NAV_ALUNO: NavItem[] = [
  { to: "/dashboard", label: "Início", icon: LayoutDashboard },
  { to: "/meus-treinos", label: "Meus Treinos", icon: Dumbbell },
  { to: "/minha-evolucao", label: "Evolução", icon: TrendingUp },
  { to: "/minha-agenda", label: "Agenda", icon: Calendar },
  { to: "/meus-pagamentos", label: "Pagamentos", icon: Receipt },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { signOut, user } = useAuth();
  const { role, isAdmin, isAluno } = usePermissions();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  const baseNav = isAluno ? NAV_ALUNO : NAV_ADMIN_PERSONAL;
  const visibleNav: NavItem[] = isAdmin
    ? [...baseNav, { to: "/admin/customizacao", label: "Customização", icon: Settings }, { to: "/permissoes", label: "Permissões", icon: Shield }]
    : baseNav;

  async function handleSignOut() {
    await signOut();
    toast.success("Sessão encerrada");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border/60 bg-background/85 px-4 py-3 backdrop-blur md:hidden">
        <Logo size={36} />
        <div className="flex items-center gap-2">
          <button onClick={toggle} className="rounded-md gold-border p-2" aria-label="Alternar tema">
            {theme === "dark" ? <Sun className="size-5 text-primary" /> : <Moon className="size-5 text-primary" />}
          </button>
          <button onClick={() => setOpen((v) => !v)} className="rounded-md gold-border p-2" aria-label="Menu">
            {open ? <X className="size-5 text-primary" /> : <Menu className="size-5 text-primary" />}
          </button>
        </div>
      </header>

      <div className="flex">
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-72 transform border-r border-sidebar-border bg-sidebar transition-transform duration-300 md:static md:translate-x-0 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="hidden md:block px-6 pt-7 pb-4">
            <Logo size={44} />
          </div>
          <div className="flex items-center justify-between px-5 pt-5 pb-3 md:hidden">
            <Logo size={36} />
            <button onClick={() => setOpen(false)} className="rounded-md gold-border p-1.5">
              <X className="size-4 text-primary" />
            </button>
          </div>

          <nav className="space-y-1 px-3 py-4">
            {visibleNav.map((item) => {
              const isActive = pathname === item.to || pathname.startsWith(item.to + "/");
              const Icon = item.icon;
              const cls = `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground gold-border"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground"
              }`;
              return (
                <Link key={item.label} to={item.to} onClick={() => setOpen(false)} className={cls}>
                  <Icon className="size-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="absolute inset-x-0 bottom-0 border-t border-sidebar-border p-4">
            <div className="mb-1 truncate text-xs text-muted-foreground">{user?.email}</div>
            <div className="mb-3 text-[10px] uppercase tracking-[0.25em] text-primary">
              {role === "admin" ? "Administrador" : role === "personal" ? "Personal Trainer" : "Aluno"}
            </div>
            <button
              onClick={toggle}
              className="mb-2 flex w-full items-center gap-2 rounded-lg gold-border px-3 py-2 text-sm text-primary transition hover:bg-primary/10"
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
              Versão {theme === "dark" ? "White" : "Black"}
            </button>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 rounded-lg gold-border px-3 py-2 text-sm text-primary transition hover:bg-primary/10"
            >
              <LogOut className="size-4" /> Sair
            </button>
          </div>
        </aside>

        {open && <div onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" />}

        <main className="min-h-dvh flex-1 px-4 py-6 md:px-10 md:py-10">
          <div key={pathname} className="page-enter">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
