import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, Eye, EyeOff, Loader2, Shield, User, Crown } from "lucide-react";
import logo from "@/assets/logo.png";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole, AppRole } from "@/hooks/useUserRole";

const roleLabels: Record<AppRole, { label: string; icon: React.ComponentType<any>; color: string }> = {
  employee: { label: "Funcionário", icon: User, color: "bg-blue-500" },
  admin: { label: "Administrador", icon: Shield, color: "bg-orange-500" },
  ceo: { label: "CEO", icon: Crown, color: "bg-purple-500" },
};

const BranchSelection = () => {
  const [password, setPassword] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<"confirm" | "branch">("confirm");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role, loading: roleLoading, branches, setCurrentBranch, hasSessionActive } = useUserRole();

  useEffect(() => {
    // If user already has active session, redirect to dashboard
    if (!roleLoading && hasSessionActive()) {
      navigate("/dashboard");
    }
  }, [roleLoading, hasSessionActive, navigate]);

  useEffect(() => {
    // Auto-select primary branch or first branch
    if (branches.length > 0 && !selectedBranchId) {
      const primaryBranch = branches.find(b => b.is_primary);
      setSelectedBranchId(primaryBranch?.id || branches[0].id);
    }
  }, [branches, selectedBranchId]);

  // CEO bypasses password confirmation - skip directly to branch selection
  useEffect(() => {
    if (!roleLoading && role === 'ceo' && step === 'confirm') {
      if (branches.length === 0) {
        handleAutoConvertToBranch();
      } else if (branches.length === 1) {
        handleBranchSelect(branches[0].id);
      } else {
        setStep("branch");
      }
    }
  }, [roleLoading, role, step, branches]);

  const handlePasswordConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        toast({
          title: "Erro",
          description: "Usuário não encontrado",
          variant: "destructive",
        });
        return;
      }

      // Verify password by trying to sign in again
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });

      if (error) {
        toast({
          title: "Senha incorreta",
          description: "Confirme sua senha para continuar",
          variant: "destructive",
        });
        return;
      }

      // Password confirmed, move to branch selection
      if (branches.length === 0) {
        // No branches yet, user needs to create one or we auto-convert company
        await handleAutoConvertToBranch();
      } else if (branches.length === 1) {
        // Only one branch, auto-select it
        await handleBranchSelect(branches[0].id);
      } else {
        setStep("branch");
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao verificar senha",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoConvertToBranch = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Erro",
          description: "Sessão expirada. Faça login novamente.",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      // Call edge function to assign CEO role and create branch (bypasses RLS)
      const response = await fetch(
        `https://gwyickztdeiplccievyt.supabase.co/functions/v1/assign-ceo-role`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar filial');
      }

      // Successfully created branch, redirect to dashboard
      if (result.branchId) {
        await setCurrentBranch(result.branchId);
        toast({
          title: "Bem-vindo, CEO!",
          description: result.hasMultipleBranches 
            ? "Acesso liberado. Selecione uma filial."
            : "Filial criada e acesso liberado.",
        });
        navigate("/dashboard");
      }
    } catch (error: any) {
      console.error('Error converting to branch:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar filial. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBranchSelect = async (branchId?: string) => {
    setIsLoading(true);
    const targetBranchId = branchId || selectedBranchId;

    try {
      const success = await setCurrentBranch(targetBranchId);
      
      if (success) {
        toast({
          title: "Acesso liberado",
          description: "Bem-vindo ao sistema!",
        });
        navigate("/dashboard");
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível selecionar a filial",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao selecionar filial",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show loading state for CEO while auto-processing
  if (role === 'ceo' && step === 'confirm') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md animate-fade-in">
          <CardHeader className="text-center">
            <img 
              src={logo} 
              alt="Corte & Arte" 
              className="h-12 w-auto mx-auto mb-4"
            />
            <CardTitle className="text-xl">Bem-vindo, CEO</CardTitle>
            <CardDescription>Preparando seu acesso...</CardDescription>
            <div className="flex justify-center mt-4">
              <Badge className="bg-purple-500 text-white flex items-center gap-1">
                <Crown className="h-3 w-3" />
                CEO
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const RoleIcon = role ? roleLabels[role].icon : User;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="text-center">
          <img 
            src={logo} 
            alt="Corte & Arte" 
            className="h-12 w-auto mx-auto mb-4"
          />
          <CardTitle className="text-xl">
            {step === "confirm" ? "Confirmar Acesso" : "Selecionar Filial"}
          </CardTitle>
          <CardDescription>
            {step === "confirm" 
              ? "Confirme sua senha para continuar" 
              : "Escolha a filial onde você irá trabalhar"}
          </CardDescription>
          
          {role && (
            <div className="flex justify-center mt-4">
              <Badge className={`${roleLabels[role].color} text-white flex items-center gap-1`}>
                <RoleIcon className="h-3 w-3" />
                {roleLabels[role].label}
              </Badge>
            </div>
          )}
        </CardHeader>

        <CardContent>
          {step === "confirm" ? (
            <form onSubmit={handlePasswordConfirm} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  "Confirmar"
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="branch">Filial</Label>
                <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma filial" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          {branch.name}
                          {branch.is_primary && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              Principal
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={() => handleBranchSelect()} 
                className="w-full" 
                disabled={isLoading || !selectedBranchId}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setStep("confirm")}
              >
                Voltar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BranchSelection;
