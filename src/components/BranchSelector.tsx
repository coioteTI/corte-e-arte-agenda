import { useState, useEffect } from "react";
import { Building2, ChevronDown, Plus, Check } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
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
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const { toast } = useToast();

  const canManageBranches = userRole === 'ceo';

  // Auto reload when complete
  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => {
        window.location.reload();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isComplete]);

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

  const simulateProgress = (startValue: number, endValue: number, message: string, duration: number) => {
    return new Promise<void>((resolve) => {
      setProgressMessage(message);
      const steps = 10;
      const increment = (endValue - startValue) / steps;
      const stepDuration = duration / steps;
      let current = startValue;
      
      const interval = setInterval(() => {
        current += increment;
        if (current >= endValue) {
          setProgress(endValue);
          clearInterval(interval);
          resolve();
        } else {
          setProgress(Math.round(current));
        }
      }, stepDuration);
    });
  };

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;

    setIsLoading(true);
    setProgress(0);
    setIsComplete(false);

    try {
      // Step 1: Validating data (0-20%)
      await simulateProgress(0, 20, "Validando dados...", 400);

      // Get current user's company ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (!company) throw new Error('Empresa não encontrada');

      // Step 2: Creating branch (20-50%)
      await simulateProgress(20, 50, "Criando filial...", 500);
      
      const { error } = await supabase
        .from('branches')
        .insert({
          name: newBranchName,
          address: newBranchAddress || null,
          city: newBranchCity || null,
          phone: newBranchPhone || null,
          company_id: company.id,
        });

      if (error) throw error;

      // Step 3: Configuring permissions (50-75%)
      await simulateProgress(50, 75, "Configurando permissões...", 400);

      // Step 4: Refreshing data (75-95%)
      await simulateProgress(75, 95, "Atualizando sistema...", 300);
      await refreshBranches();

      // Step 5: Complete (95-100%)
      await simulateProgress(95, 100, "Concluído!", 200);

      setIsComplete(true);

      toast({
        title: "✅ Filial criada com sucesso!",
        description: `${newBranchName} foi adicionada. Recarregando...`,
      });

      setNewBranchName("");
      setNewBranchAddress("");
      setNewBranchCity("");
      setNewBranchPhone("");
      
    } catch (error: any) {
      setProgress(0);
      setProgressMessage("");
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar a filial",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!isLoading) {
      setIsAddDialogOpen(open);
      setProgress(0);
      setProgressMessage("");
      setIsComplete(false);
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

      <Dialog open={isAddDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Filial</DialogTitle>
            <DialogDescription>
              Cadastre uma nova filial para sua rede de barbearias
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{progressMessage}</span>
                  <span className="text-sm font-bold text-primary">{progress}%</span>
                </div>
                <Progress value={progress} className="h-3" />
              </div>
              
              {isComplete && (
                <div className="flex items-center justify-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <Check className="h-5 w-5" />
                  <span className="font-medium">Filial criada! Recarregando página...</span>
                </div>
              )}
            </div>
          ) : (
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
                  Criar Filial
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
