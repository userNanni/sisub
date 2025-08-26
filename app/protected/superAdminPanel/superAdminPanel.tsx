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
  MoreHorizontal,
  PlusCircle,
} from "lucide-react";
import { toast } from "sonner"; // Importação do Sonner

// Importações dos componentes ShadCN UI
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

// Importe seu cliente Supabase e tipos
import supabase from "@/utils/supabase";
import { userLevelType } from "@/auth/auth"; // Assumindo que o tipo está aqui

// Definição do tipo para os dados da tabela profiles_admin
export type ProfileAdmin = {
  id: string;
  saram: string | null;
  name: string | null;
  email: string;
  role: userLevelType;
  created_at: string;
  updated_at: string;
};

export default function SuperAdminPanel() {
  const [profiles, setProfiles] = React.useState<ProfileAdmin[]>([]);
  const [loading, setLoading] = React.useState(true);

  // State para os modais
  const [isAddUserOpen, setIsAddUserOpen] = React.useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = React.useState(false);
  const [selectedProfile, setSelectedProfile] =
    React.useState<ProfileAdmin | null>(null);

  // State para os formulários
  const [newUserEmail, setNewUserEmail] = React.useState("");
  const [editSaram, setEditSaram] = React.useState("");
  const [editRole, setEditRole] = React.useState<userLevelType>(null);

  // Função para buscar os dados do Supabase
  const fetchProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("profiles_admin").select("*");

    if (error) {
      console.error("Error fetching profiles:", error);
      toast.error("Erro ao buscar perfis", {
        description: error.message,
      });
    } else {
      setProfiles(data || []);
    }
    setLoading(false);
  };

  // useEffect para carregar os dados na montagem do componente
  React.useEffect(() => {
    fetchProfiles();
  }, []);

  // Handler para adicionar um novo usuário via Edge Function
  const handleAddUser = async () => {
    if (!newUserEmail) {
      toast.error("Erro de Validação", {
        description: "O email não pode ser vazio.",
      });
      return;
    }

    try {
      // Chama a Edge Function publicada no seu projeto Supabase
      // Nome: "user-creation-with-email"
      // URL direta (para referência): https://jgigqdpdjgnnuwajtayh.supabase.co/functions/v1/user-creation-with-email
      const { data, error } = await supabase.functions.invoke(
        "user-creation-with-email",
        {
          body: {
            email: newUserEmail,
            role: "user", // você pode trocar para um Select no modal se desejar
          },
        }
      );

      if (error) {
        throw new Error(error.message || "Falha ao adicionar usuário");
      }

      // data deve conter { message, profile } conforme sua função
      toast.success("Sucesso!", {
        description: `Usuário ${newUserEmail} adicionado.`,
      });
      setNewUserEmail("");
      setIsAddUserOpen(false);
      fetchProfiles();
    } catch (err: any) {
      toast.error("Erro ao adicionar usuário", {
        description:
          err?.message ??
          "Verifique se o email existe no Auth ou tente novamente.",
      });
    }
  };

  // Handler para atualizar um usuário
  const handleUpdateUser = async () => {
    if (!selectedProfile) return;

    if (editSaram && !/^\d{7}$/.test(editSaram)) {
      toast.error("SARAM inválido", {
        description: "O SARAM deve conter exatamente 7 números.",
      });
      return;
    }

    const { error } = await supabase
      .from("profiles_admin")
      .update({ role: editRole, saram: editSaram })
      .eq("id", selectedProfile.id);

    if (error) {
      toast.error("Erro ao atualizar", {
        description: error.message,
      });
    } else {
      toast.success("Sucesso!", {
        description: `Perfil de ${selectedProfile.email} atualizado.`,
      });
      setIsEditUserOpen(false);
      setSelectedProfile(null);
      fetchProfiles();
    }
  };

  // Definição das colunas da tabela
  const columns: ColumnDef<ProfileAdmin>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
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
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Email <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="lowercase">{row.getValue("email")}</div>
      ),
    },
    {
      accessorKey: "name",
      header: "Nome",
      cell: ({ row }) => <div>{row.getValue("name") || "N/A"}</div>,
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <div className="capitalize">{row.getValue("role")}</div>
      ),
    },
    {
      accessorKey: "saram",
      header: "SARAM",
      cell: ({ row }) => <div>{row.getValue("saram") || "N/A"}</div>,
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const profile = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Ações</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedProfile(profile);
                  setEditSaram(profile.saram || "");
                  setEditRole(profile.role);
                  setIsEditUserOpen(true);
                }}
              >
                Editar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Configuração da tabela
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

  // JSX do componente
  return (
    <div className="w-full p-4">
      {/* Header com Filtro e Botões */}
      <div className="flex items-center py-4">
        <Input
          placeholder="Filtrar por email..."
          value={(table.getColumn("email")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("email")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <div className="ml-auto flex items-center gap-2">
          {/* Botão Adicionar Usuário */}
          <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Adicionar Novo Usuário</DialogTitle>
                <DialogDescription>
                  Digite o email do usuário que você deseja adicionar. O sistema
                  irá verificar se ele existe na base de autenticação.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
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
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={handleAddUser}>
                  Adicionar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Dropdown de Colunas */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
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
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
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
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Carregando...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
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
                  className="h-24 text-center"
                >
                  Nenhum resultado encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginação */}
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="text-muted-foreground flex-1 text-sm">
          {table.getFilteredSelectedRowModel().rows.length} de{" "}
          {table.getFilteredRowModel().rows.length} linha(s) selecionada(s).
        </div>
        <div className="space-x-2">
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

      {/* Modal de Edição */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
            <DialogDescription>
              Altere o SARAM e a Role para o usuário: {selectedProfile?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
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
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                Role
              </Label>
              <Select
                value={editRole || ""}
                onValueChange={(value) => setEditRole(value as userLevelType)}
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
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleUpdateUser}>
              Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
