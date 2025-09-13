// src/components/SuperAdminPanel.tsx
"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ChevronDown,
  ExternalLink,
  Maximize2,
  MoreHorizontal,
  PlusCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

// Shadcn UI
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Supabase e tipos
import supabase from "@/utils/supabase";
import { checkUserLevel, UserLevelOrNull } from "@/auth/adminService";
import { useAuth } from "@/auth/auth";
import type { Route } from "./+types/superAdminPanel";

// Rancho (OMs)
import { useRancho } from "~/components/hooks/useRancho";
import { Navigate } from "react-router";

// Skeleton simples no estilo shadcn + tailwind
function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-gray-200 ${className}`} />
  );
}

// Badge do hero (mesmo conceito da página Admin)
function ShieldBadge() {
  return (
    <span className="inline-flex items-center justify-center rounded-full w-5 h-5 bg-blue-100 text-blue-700">
      <svg
        className="w-3.5 h-3.5"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M12 3l7 3v5c0 5-3.5 9-7 10-3.5-1-7-5-7-10V6l7-3z"
          stroke="currentColor"
          strokeWidth={2}
          fill="none"
        />
        <path
          d="M9.5 12l2 2 3.5-3.5"
          stroke="currentColor"
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

// Tipos
export type ProfileAdmin = {
  id: string;
  saram: string | null;
  name: string | null;
  email: string;
  role: UserLevelOrNull;
  om: string | null;
  created_at: string;
  updated_at: string;
};

type UserLevel = UserLevelOrNull;

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Painel SuperAdmin" },
    { name: "description", content: "Controle o Sistema" },
  ];
}

export default function SuperAdminPanel() {
  const { user } = useAuth();
  const [shouldRedirect, setShouldRedirect] = React.useState(false);

  React.useEffect(() => {
    const fetchUserLevel = async () => {
      if (user?.id) {
        const level = await checkUserLevel(user.id);
        if (level !== "superadmin") {
          setShouldRedirect(true);
        }
      }
    };
    fetchUserLevel();
  }, [user]);

  if (shouldRedirect) {
    return <Navigate to="/rancho" replace />;
  }

  // Fade-in como na página Admin
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(t);
  }, []);

  // Dados
  const [profiles, setProfiles] = React.useState<ProfileAdmin[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Estados dos diálogos
  const [isAddUserOpen, setIsAddUserOpen] = React.useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = React.useState(false);
  const [isDeleteUserOpen, setIsDeleteUserOpen] = React.useState(false);

  const [isAdding, setIsAdding] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const [selectedProfile, setSelectedProfile] =
    React.useState<ProfileAdmin | null>(null);

  // Form - Adição
  const [newUserId, setNewUserId] = React.useState("");
  const [newUserEmail, setNewUserEmail] = React.useState("");
  const [newUserName, setNewUserName] = React.useState("");
  const [newUserSaram, setNewUserSaram] = React.useState("");
  const [newUserRole, setNewUserRole] = React.useState<UserLevel | null>(null);
  const [newUserOm, setNewUserOm] = React.useState<string>("");

  // Form - Edição
  const [editSaram, setEditSaram] = React.useState("");
  const [editRole, setEditRole] = React.useState<UserLevel | null>(null);
  const [editOm, setEditOm] = React.useState<string>("");

  // Hook de OMs
  const {
    unidades,
    isLoading: isLoadingUnidades,
    error: unidadesError,
  } = useRancho();

  // Indicadores (Power BI) como card destacado com expand
  const [expanded, setExpanded] = React.useState(false);
  const toggleExpanded = () => setExpanded((e) => !e);
  const frameHeight = React.useMemo(() => "clamp(520px, 78vh, 1000px)", []);

  // Buscar perfis
  const fetchProfiles = React.useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles_admin")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching profiles:", error);
      toast.error("Erro ao buscar perfis", {
        description: error.message,
      });
    } else {
      setProfiles(data || []);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // Adicionar
  const handleAddUser = async () => {
    const id = newUserId.trim();
    const email = newUserEmail.trim().toLowerCase();
    const name = newUserName.trim();
    const saram = newUserSaram.trim();
    const role = newUserRole;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(id)) {
      toast.error("Erro de Validação", {
        description: "ID inválido. Informe um UUID válido do usuário admin.",
      });
      return;
    }
    if (!emailRegex.test(email)) {
      toast.error("Erro de Validação", { description: "Email inválido." });
      return;
    }
    if (!name) {
      toast.error("Erro de Validação", {
        description: "O nome é obrigatório.",
      });
      return;
    }
    if (!/^\d{7}$/.test(saram)) {
      toast.error("SARAM inválido", {
        description: "O SARAM deve conter exatamente 7 números.",
      });
      return;
    }
    if (!role) {
      toast.error("Erro de Validação", {
        description: "Selecione uma role para o usuário.",
      });
      return;
    }

    try {
      setIsAdding(true);
      const { error } = await supabase.from("profiles_admin").insert([
        {
          id,
          email,
          name,
          saram,
          role,
          om: newUserOm || null,
        },
      ]);
      if (error) throw error;

      toast.success("Sucesso!", {
        description: `Usuário ${email} adicionado.`,
      });

      // Limpa e fecha modal
      setNewUserId("");
      setNewUserEmail("");
      setNewUserName("");
      setNewUserSaram("");
      setNewUserRole(null);
      setNewUserOm("");
      setIsAddUserOpen(false);

      fetchProfiles();
    } catch (err: any) {
      toast.error("Erro ao adicionar usuário", {
        description:
          err?.message ?? "Ocorreu um erro ao salvar. Tente novamente.",
      });
    } finally {
      setIsAdding(false);
    }
  };

  // Atualizar
  const handleUpdateUser = async () => {
    if (!selectedProfile) return;

    if (editSaram && !/^\d{7}$/.test(editSaram)) {
      toast.error("SARAM inválido", {
        description: "O SARAM deve conter exatamente 7 números.",
      });
      return;
    }

    try {
      setIsUpdating(true);
      const { error } = await supabase
        .from("profiles_admin")
        .update({
          role: editRole,
          saram: editSaram || null,
          om: editOm || null,
        })
        .eq("id", selectedProfile.id);

      if (error) throw error;

      toast.success("Sucesso!", {
        description: `Perfil de ${selectedProfile.email} atualizado.`,
      });
      setIsEditUserOpen(false);
      setSelectedProfile(null);
      fetchProfiles();
    } catch (err: any) {
      toast.error("Erro ao atualizar", {
        description: err?.message ?? "Não foi possível atualizar o registro.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Excluir (Dialog com isOpen — substituindo AlertDialog)
  const handleDeleteUser = async () => {
    if (!selectedProfile) return;

    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from("profiles_admin")
        .delete()
        .eq("id", selectedProfile.id);

      if (error) throw error;

      toast.success("Registro excluído", {
        description: `Usuário ${selectedProfile.email} removido.`,
      });

      setIsDeleteUserOpen(false);
      setSelectedProfile(null);
      fetchProfiles();
    } catch (err: any) {
      toast.error("Erro ao excluir", {
        description: err?.message ?? "Não foi possível excluir o registro.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Colunas
  const columns: ColumnDef<ProfileAdmin>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Selecionar todos"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Selecionar linha"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="px-0"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Email <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="lowercase text-gray-900">{row.getValue("email")}</div>
      ),
    },
    {
      accessorKey: "name",
      header: "Nome",
      cell: ({ row }) => (
        <div className="text-gray-700">{row.getValue("name") || "N/A"}</div>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <div className="capitalize font-medium">
          {row.getValue("role") || "N/A"}
        </div>
      ),
    },
    {
      accessorKey: "saram",
      header: "SARAM",
      cell: ({ row }) => (
        <div className="tabular-nums">{row.getValue("saram") || "N/A"}</div>
      ),
    },
    {
      accessorKey: "om",
      header: "OM",
      cell: ({ row }) => <div>{row.getValue("om") || "N/A"}</div>,
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const profile = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Ações</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedProfile(profile);
                  setEditSaram(profile.saram || "");
                  setEditRole(profile.role || null);
                  setEditOm(profile.om || "");
                  setIsEditUserOpen(true);
                }}
              >
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => {
                  setSelectedProfile(profile);
                  setIsDeleteUserOpen(true);
                }}
              >
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Tabela
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data: profiles,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const emailFilter =
    (table.getColumn("email")?.getFilterValue() as string) ?? "";
  const roleFilter =
    (table.getColumn("role")?.getFilterValue() as string) ?? "";

  const resetFilters = () => {
    table.resetColumnFilters();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Hero */}
      <section
        id="hero"
        className={`container mx-auto max-w-screen-2xl px-4 pt-10 md:pt-14 transition-all duration-500 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-blue-50 text-blue-700 border border-blue-200 mb-3">
            <ShieldBadge />
            Painel SuperAdmin
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Controle do Sistema
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Gerencie permissões, cadastre administradores e acompanhe
            indicadores gerais do SISUB.
          </p>
        </div>
      </section>

      {/* Conteúdo */}
      <section
        id="content"
        className={`container mx-auto max-w-screen-2xl px-4 py-10 md:py-14 transition-all duration-500 delay-100 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        {loading && profiles.length === 0 ? (
          // Skeletons iniciais
          <div className="grid grid-cols-1 gap-6 lg:gap-8">
            <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-6 w-60" />
                <Skeleton className="h-6 w-24" />
              </div>
              <Skeleton className="h-[520px] w-full rounded-lg" />
            </div>
            <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-10 w-40" />
              </div>
              <Skeleton className="h-12 w-full rounded-md mb-3" />
              <Skeleton className="h-64 w-full rounded-md" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:gap-8">
            {/* Card: Indicadores (Power BI) */}
            <div
              className={`bg-white rounded-2xl border border-blue-100 shadow-sm ${
                expanded ? "p-0" : "p-6"
              }`}
            >
              <div
                className={`${
                  expanded ? "px-4 py-3" : "mb-4"
                } flex items-center justify-between`}
              >
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  Indicadores Gerais
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      window.open(
                        "https://app.powerbi.com/view?r=eyJrIjoiNGY4ZTI2YTktYTg1NC00NDgyLWIyYTItNWI4ZTIzYTgxZTNiIiwidCI6ImViMjk0Zjg5LTUwNWUtNDI4MC1iYjdiLTFlMzlhZjg5YTg4YyJ9",
                        "_blank",
                        "noopener,noreferrer"
                      )
                    }
                    className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700"
                    aria-label="Abrir relatório em nova aba"
                    title="Abrir em nova aba"
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    Abrir
                  </button>

                  <button
                    onClick={toggleExpanded}
                    className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700"
                    aria-pressed={expanded}
                    aria-label={expanded ? "Reduzir" : "Expandir"}
                    title={expanded ? "Reduzir" : "Expandir"}
                  >
                    <Maximize2 className="h-4 w-4" aria-hidden="true" />
                    {expanded ? "Reduzir" : "Expandir"}
                  </button>
                </div>
              </div>

              <div className={expanded ? "" : "px-0"}>
                <div className={`${expanded ? "" : "px-6"} pb-4`}>
                  {!expanded && (
                    <>
                      <h2 className="text-xl font-bold text-gray-900">
                        Indicadores do Sistema
                      </h2>
                      <p className="text-gray-600 text-sm">
                        Acompanhe métricas gerais do SISUB. Expanda para tela
                        cheia para melhor visualização.
                      </p>
                    </>
                  )}
                </div>

                <div className={`${expanded ? "" : "px-6"} pb-6`}>
                  <div className="rounded-2xl border border-gray-200 overflow-hidden bg-gray-50">
                    <iframe
                      title="Sistema_sisub_FINALFINAL"
                      className="w-full"
                      style={{ height: frameHeight }}
                      src="https://app.powerbi.com/view?r=eyJrIjoiNGY4ZTI2YTktYTg1NC00NDgyLWIyYTItNWI4ZTIzYTgxZTNiIiwidCI6ImViMjk0Zjg5LTUwNWUtNDI4MC1iYjdiLTFlMzlhZjg5YTg4YyJ9"
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                  <div className="mt-3 text-xs text-gray-500 px-1">
                    Dica: use o botão de tela cheia dentro do relatório para
                    melhor experiência.
                  </div>
                </div>
              </div>
            </div>

            {/* Card: Gestão de Perfis */}
            <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-6">
              {/* Toolbar */}
              <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 py-2">
                <div className="flex-1 flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder="Filtrar por email..."
                    value={emailFilter}
                    onChange={(event) =>
                      table
                        .getColumn("email")
                        ?.setFilterValue(event.target.value)
                    }
                    className="max-w-sm"
                  />
                  <Select
                    value={roleFilter || ""}
                    onValueChange={(value) =>
                      table
                        .getColumn("role")
                        ?.setFilterValue(value || undefined)
                    }
                  >
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Filtrar por role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="superadmin">Superadmin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 md:ml-auto">
                  <Button
                    variant="outline"
                    onClick={resetFilters}
                    className="whitespace-nowrap"
                  >
                    Limpar filtros
                  </Button>

                  {/* Adicionar Usuário */}
                  <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                    <DialogTrigger asChild>
                      <Button className="whitespace-nowrap">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Adicionar Usuário
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[520px]">
                      <DialogHeader>
                        <DialogTitle>Adicionar Novo Usuário</DialogTitle>
                        <DialogDescription>
                          Preencha todos os campos para cadastrar o usuário em
                          profiles_admin. O ID deve ser o UUID do usuário que se
                          tornará Admin.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="grid gap-4 py-2">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="id" className="text-right">
                            ID (UUID)
                          </Label>
                          <Input
                            id="id"
                            value={newUserId}
                            onChange={(e) => setNewUserId(e.target.value)}
                            className="col-span-3"
                            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                          />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="name" className="text-right">
                            Nome
                          </Label>
                          <Input
                            id="name"
                            value={newUserName}
                            onChange={(e) => setNewUserName(e.target.value)}
                            className="col-span-3"
                            placeholder="Nome completo"
                          />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="email" className="text-right">
                            Email
                          </Label>
                          <Input
                            id="email"
                            value={newUserEmail}
                            onChange={(e) => setNewUserEmail(e.target.value)}
                            className="col-span-3"
                            placeholder="usuario@exemplo.com"
                            type="email"
                          />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="saram" className="text-right">
                            SARAM
                          </Label>
                          <Input
                            id="saram"
                            value={newUserSaram}
                            onChange={(e) => setNewUserSaram(e.target.value)}
                            className="col-span-3"
                            maxLength={7}
                            inputMode="numeric"
                            pattern="\d{7}"
                            placeholder="Apenas 7 números"
                          />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="role" className="text-right">
                            Role
                          </Label>
                          <Select
                            value={newUserRole ?? ""}
                            onValueChange={(value) =>
                              setNewUserRole(value as UserLevel)
                            }
                          >
                            <SelectTrigger className="col-span-3">
                              <SelectValue placeholder="Selecione uma role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="superadmin">
                                Superadmin
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="om" className="text-right">
                            OM
                          </Label>
                          <Select
                            value={newUserOm || ""}
                            onValueChange={(value) => setNewUserOm(value)}
                            disabled={isLoadingUnidades}
                          >
                            <SelectTrigger className="col-span-3">
                              <SelectValue
                                placeholder={
                                  isLoadingUnidades
                                    ? "Carregando OMs..."
                                    : "Selecione a OM (opcional)"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {(unidades || []).map((u) => (
                                <SelectItem key={u.value} value={u.value}>
                                  {u.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {unidadesError && (
                          <p className="col-span-4 text-sm text-destructive">
                            {unidadesError}
                          </p>
                        )}
                      </div>

                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsAddUserOpen(false)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="submit"
                          onClick={handleAddUser}
                          disabled={isAdding}
                        >
                          {isAdding ? "Adicionando..." : "Adicionar"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* Dropdown de Colunas */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="whitespace-nowrap">
                        Colunas <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {table
                        .getAllColumns()
                        .filter((column) => column.getCanHide())
                        .map((column) => (
                          <DropdownMenuCheckboxItem
                            key={column.id}
                            className="capitalize"
                            checked={column.getIsVisible()}
                            onCheckedChange={(value) =>
                              column.toggleVisibility(!!value)
                            }
                          >
                            {column.id}
                          </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Tabela */}
              <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
                <Table>
                  <TableHeader className="bg-gray-50">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="h-24">
                          <div className="flex items-center justify-center gap-2 text-gray-600">
                            <svg
                              className="animate-spin h-4 w-4 text-gray-400"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                                fill="none"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8v4l3.5-3.5L12 0v4a8 8 0 100 16v4l3.5-3.5L12 20v4a8 8 0 01-8-8z"
                              />
                            </svg>
                            Carregando...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow
                          key={row.id}
                          data-state={row.getIsSelected() && "selected"}
                          className="hover:bg-gray-50"
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          className="h-24 text-center text-gray-600"
                        >
                          Nenhum resultado encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Paginação */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4">
                <div className="text-muted-foreground text-sm">
                  {table.getFilteredSelectedRowModel().rows.length} de{" "}
                  {table.getFilteredRowModel().rows.length} linha(s)
                  selecionada(s).
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    Próximo
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Modal de Edição */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
            <DialogDescription>
              Altere o SARAM, OM e a Role do usuário:{" "}
              <span className="font-medium text-gray-900">
                {selectedProfile?.email}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="saram" className="text-right">
                SARAM
              </Label>
              <Input
                id="saram"
                value={editSaram}
                onChange={(e) => setEditSaram(e.target.value)}
                className="col-span-3"
                maxLength={7}
                pattern="\d{7}"
                placeholder="Apenas 7 números"
              />
            </div>

            {/* Campo OM */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="om" className="text-right">
                OM
              </Label>
              <Select
                value={editOm || ""}
                onValueChange={(value) => setEditOm(value)}
                disabled={isLoadingUnidades}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue
                    placeholder={
                      isLoadingUnidades ? "Carregando OMs..." : "Selecione a OM"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {(unidades || []).map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                Role
              </Label>
              <Select
                value={editRole ?? ""}
                onValueChange={(value) => setEditRole(value as UserLevel)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione uma role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="superadmin">Superadmin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {unidadesError && (
              <p className="col-span-4 text-sm text-destructive">
                {unidadesError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditUserOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateUser} disabled={isUpdating}>
              {isUpdating ? "Salvando..." : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Exclusão (Dialog, conforme solicitado) */}
      <Dialog open={isDeleteUserOpen} onOpenChange={setIsDeleteUserOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o registro do usuário{" "}
              <strong>{selectedProfile?.email}</strong>? Esta ação não pode ser
              desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteUserOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={isDeleting}
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
