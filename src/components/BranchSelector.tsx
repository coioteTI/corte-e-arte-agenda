import { useState } from "react";
import { Building2, ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useBranch } from "@/contexts/BranchContext";

export const BranchSelector = () => {
  const { currentBranch, branches, userRole, setCurrentBranch, refreshBranches } = useBranch();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [newBranchAddress, setNewBranchAddress] = useState("");
  const [newBranchCity, setNewBranchCity] = useState("");
  const [newBranchPhone, setNewBranchPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const canManageBranches = userRole === 'ceo';

  const handleBranchChange = async (branchId: string) => {
    const success = await setCurrentBranch(branchId);
    if (success) {
      toast({
        title: "Filial alterada",
        description: "Dados atualizados para a nova filial",
      });
      // Reload the page to refresh all data with new branch context
      window.location.reload();
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível alterar a filial",
        variant: "destructive",
      });
    }
  };

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('branches')
        .insert({
          name: newBranchName,
          address: newBranchAddress || null,
          city: newBranchCity || null,
          phone: newBranchPhone || null,
        });

      if (error) throw error;

      toast({
        title: "Filial criada",
        description: `${newBranchName} foi adicionada com sucesso`,
      });

      setIsAddDialogOpen(false);
      setNewBranchName("");
      setNewBranchAddress("");
      setNewBranchCity("");
      setNewBranchPhone("");
      await refreshBranches();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar a filial",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (branches.length === 0) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="max-w-[150px] truncate">
              {currentBranch?.name || "Selecionar Filial"}
            </span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[250px]">
          {branches.map((branch) => (
            <DropdownMenuItem
              key={branch.id}
              onClick={() => handleBranchChange(branch.id)}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span>{branch.name}</span>
              </div>
              {currentBranch?.id === branch.id && (
                <Badge variant="secondary" className="text-xs">
                  Atual
                </Badge>
              )}
            </DropdownMenuItem>
          ))}
          
          {canManageBranches && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Filial
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Filial</DialogTitle>
            <DialogDescription>
              Cadastre uma nova filial para sua rede de barbearias
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddBranch} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="branchName">Nome da Filial *</Label>
              <Input
                id="branchName"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder="Ex: Unidade Centro"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="branchAddress">Endereço</Label>
              <Input
                id="branchAddress"
                value={newBranchAddress}
                onChange={(e) => setNewBranchAddress(e.target.value)}
                placeholder="Rua, número"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="branchCity">Cidade</Label>
                <Input
                  id="branchCity"
                  value={newBranchCity}
                  onChange={(e) => setNewBranchCity(e.target.value)}
                  placeholder="Cidade"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branchPhone">Telefone</Label>
                <Input
                  id="branchPhone"
                  value={newBranchPhone}
                  onChange={(e) => setNewBranchPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Criando..." : "Criar Filial"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
