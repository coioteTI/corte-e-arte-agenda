import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit, 
  Shield, 
  User, 
  Crown, 
  Loader2,
  Building2,
  Eye,
  EyeOff,
  Copy,
  Check
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useBranch } from "@/contexts/BranchContext";
import { AppRole } from "@/hooks/useUserRole";

interface UserData {
  id: string;
  email: string;
  full_name: string;
  role: AppRole;
  branches: { id: string; name: string }[];
  created_at: string;
}

const roleLabels: Record<AppRole, { label: string; icon: React.ComponentType<any>; color: string }> = {
  employee: { label: "Funcionário", icon: User, color: "bg-blue-500" },
  admin: { label: "Administrador", icon: Shield, color: "bg-orange-500" },
  ceo: { label: "CEO", icon: Crown, color: "bg-purple-500" },
};

// Component for displaying temp password with copy functionality
const TempPasswordDisplay = ({ 
  email, 
  tempPassword, 
  onClose 
}: { 
  email: string; 
  tempPassword?: string; 
  onClose: () => void;
}) => {
  const [copied, setCopied] = useState<'email' | 'password' | 'all' | null>(null);
  const { toast } = useToast();

  const copyToClipboard = async (text: string, type: 'email' | 'password' | 'all') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      toast({
        title: "Copiado!",
        description: type === 'all' ? "Credenciais copiadas" : `${type === 'email' ? 'E-mail' : 'Senha'} copiada`,
      });
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      toast({
        title: "Erro ao copiar",
        description: "Use Ctrl+C para copiar manualmente",
        variant: "destructive",
      });
    }
  };

  const copyAllCredentials = () => {
    const text = `E-mail: ${email}\nSenha Temporária: ${tempPassword}`;
    copyToClipboard(text, 'all');
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-muted rounded-lg space-y-4">
        <div>
          <Label className="text-xs text-muted-foreground">E-mail de acesso</Label>
          <div className="flex items-center gap-2 mt-1">
            <p className="font-medium flex-1 truncate">{email}</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(email, 'email')}
              className="shrink-0"
            >
              {copied === 'email' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        
        {tempPassword && (
          <div>
            <Label className="text-xs text-muted-foreground">Senha Temporária</Label>
            <div className="flex items-center gap-2 mt-1">
              <p className="font-mono text-sm bg-background p-2 rounded border flex-1 break-all select-all">
                {tempPassword}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(tempPassword, 'password')}
                className="shrink-0"
              >
                {copied === 'password' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}
      </div>
      
      <Button 
        variant="outline" 
        className="w-full" 
        onClick={copyAllCredentials}
      >
        {copied === 'all' ? <Check className="h-4 w-4 mr-2 text-green-500" /> : <Copy className="h-4 w-4 mr-2" />}
        Copiar Todas as Credenciais
      </Button>

      <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
        <p className="text-sm">
          <strong>Instruções para o funcionário:</strong>
        </p>
        <ol className="text-sm text-muted-foreground mt-2 space-y-1 list-decimal list-inside">
          <li>Acessar a página de login</li>
          <li>Digitar o e-mail informado</li>
          <li>Clicar em "Continuar"</li>
          <li>Inserir a senha temporária</li>
          <li>Criar uma senha definitiva</li>
        </ol>
      </div>

      <Button className="w-full" onClick={onClose}>
        Concluir
      </Button>
    </div>
  );
};

const Funcionarios = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  
  // Form state
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<AppRole>("employee");
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const { toast } = useToast();
  const { userRole, branches, currentBranchId } = useBranch();

  const canManageUsers = userRole === 'ceo' || userRole === 'admin';
  const canCreateAdmins = userRole === 'ceo';

  useEffect(() => {
    loadUsers();
  }, [currentBranchId, userRole]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Get all user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      let filteredRoles = rolesData || [];
      let userBranchesData: any[] = [];
      
      if (userRole === 'admin' && currentBranchId) {
        // Admin: Only get user_branches for the CURRENT branch
        const { data: branchUsersData, error: branchUsersError } = await supabase
          .from('user_branches')
          .select('user_id, branch_id, branches(id, name)')
          .eq('branch_id', currentBranchId);

        if (branchUsersError) throw branchUsersError;
        userBranchesData = branchUsersData || [];
        
        // Get ONLY user IDs that belong to the current branch
        const usersInCurrentBranch = new Set(
          branchUsersData?.map(ub => ub.user_id) || []
        );
        
        // Filter: only employees from current branch, EXCLUDE CEO and other admins
        filteredRoles = rolesData?.filter(r => {
          // Admin can only see employees - never CEO or other admins
          if (r.role === 'ceo' || r.role === 'admin') return false;
          // CRITICAL: Only show employees that are EXPLICITLY assigned to current branch
          return usersInCurrentBranch.has(r.user_id);
        }) || [];
      } else {
        // CEO: Get all user branches
        const { data: allBranchesData, error: branchesError } = await supabase
          .from('user_branches')
          .select('user_id, branch_id, branches(id, name)');

        if (branchesError) throw branchesError;
        userBranchesData = allBranchesData || [];
      }

      // Get profiles for these users
      const userIds = filteredRoles?.map(r => r.user_id) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000']);

      if (profilesError) throw profilesError;

      // Combine data
      const usersMap = new Map<string, UserData>();
      
      filteredRoles?.forEach(role => {
        const profile = profilesData?.find(p => p.user_id === role.user_id);
        const userBranches = userBranchesData
          ?.filter(ub => ub.user_id === role.user_id)
          .map(ub => ub.branches as unknown as { id: string; name: string })
          .filter(Boolean) || [];

        usersMap.set(role.user_id, {
          id: role.user_id,
          email: '',
          full_name: profile?.full_name || 'Sem nome',
          role: role.role as AppRole,
          branches: userBranches,
          created_at: new Date().toISOString(),
        });
      });

      setUsers(Array.from(usersMap.values()));
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os usuários",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const [createdUserInfo, setCreatedUserInfo] = useState<{ email: string; tempPassword?: string } | null>(null);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail) return;

    // Admin can only create employees
    if (userRole === 'admin' && newUserRole !== 'employee') {
      toast({
        title: "Sem permissão",
        description: "Administradores só podem criar funcionários",
        variant: "destructive",
      });
      return;
    }

    // Admin must assign to their current branch only
    const branchesToAssign = userRole === 'admin' && currentBranchId 
      ? [currentBranchId] 
      : selectedBranches;

    if (branchesToAssign.length === 0 && newUserRole !== 'ceo') {
      toast({
        title: "Selecione uma filial",
        description: "É necessário selecionar pelo menos uma filial",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Call edge function to create user
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: newUserEmail,
          password: newUserPassword || undefined, // Optional - will trigger first access flow if empty
          full_name: newUserName,
          role: newUserRole,
          branch_ids: branchesToAssign,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Show temp password if it was auto-generated
      if (data?.user?.is_first_access && data?.user?.temp_password) {
        setCreatedUserInfo({
          email: newUserEmail,
          tempPassword: data.user.temp_password,
        });
      } else {
        setCreatedUserInfo(null);
      }

      toast({
        title: "Usuário criado",
        description: `${newUserName} foi cadastrado com sucesso`,
      });
      
      setIsAddDialogOpen(false);
      resetForm();
      loadUsers();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar o usuário",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    // Admin can only edit employees and can't change their role
    if (userRole === 'admin') {
      if (selectedUser.role !== 'employee') {
        toast({
          title: "Sem permissão",
          description: "Você só pode editar funcionários",
          variant: "destructive",
        });
        return;
      }
    }

    setIsSaving(true);
    try {
      // Only CEO can change roles
      if (userRole === 'ceo') {
        const { error: roleError } = await supabase
          .from('user_roles')
          .upsert({
            user_id: selectedUser.id,
            role: newUserRole,
          }, { onConflict: 'user_id,role' });

        if (roleError) throw roleError;

        // Only CEO can update branches
        await supabase
          .from('user_branches')
          .delete()
          .eq('user_id', selectedUser.id);

        if (selectedBranches.length > 0) {
          const branchInserts = selectedBranches.map((branchId, index) => ({
            user_id: selectedUser.id,
            branch_id: branchId,
            is_primary: index === 0,
          }));

          const { error: branchInsertError } = await supabase
            .from('user_branches')
            .insert(branchInserts);

          if (branchInsertError) throw branchInsertError;
        }
      }

      // Update profile name (both admin and CEO can do this)
      await supabase
        .from('profiles')
        .upsert({
          user_id: selectedUser.id,
          full_name: newUserName,
        }, { onConflict: 'user_id' });

      toast({
        title: "Usuário atualizado",
        description: "As alterações foram salvas com sucesso",
      });

      setIsEditDialogOpen(false);
      resetForm();
      loadUsers();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar o usuário",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Tem certeza que deseja remover este usuário?")) return;

    try {
      // Remove user role and branch assignments
      await Promise.all([
        supabase.from('user_roles').delete().eq('user_id', userId),
        supabase.from('user_branches').delete().eq('user_id', userId),
        supabase.from('user_sessions').delete().eq('user_id', userId),
      ]);

      toast({
        title: "Usuário removido",
        description: "O acesso do usuário foi revogado",
      });

      loadUsers();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível remover o usuário",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (user: UserData) => {
    setSelectedUser(user);
    setNewUserName(user.full_name);
    setNewUserRole(user.role);
    setSelectedBranches(user.branches.map(b => b.id));
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setNewUserName("");
    setNewUserEmail("");
    setNewUserPassword("");
    setNewUserRole("employee");
    setSelectedBranches([]);
    setSelectedUser(null);
  };

  const toggleBranch = (branchId: string) => {
    setSelectedBranches(prev => 
      prev.includes(branchId)
        ? prev.filter(id => id !== branchId)
        : [...prev, branchId]
    );
  };

  if (!canManageUsers) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
            <p className="text-muted-foreground">
              Você não tem permissão para gerenciar funcionários
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" />
              Gestão de Funcionários
            </h1>
            <p className="text-muted-foreground">
              Gerencie funcionários, administradores e suas permissões no sistema
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Funcionário
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Funcionários Cadastrados</CardTitle>
            <CardDescription>
              Lista de todos os funcionários com acesso ao sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum funcionário cadastrado ainda</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Filiais</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const RoleIcon = roleLabels[user.role].icon;
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name}</TableCell>
                        <TableCell>
                          <Badge className={`${roleLabels[user.role].color} text-white`}>
                            <RoleIcon className="h-3 w-3 mr-1" />
                            {roleLabels[user.role].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.branches.length === 0 ? (
                              <span className="text-muted-foreground text-sm">Todas</span>
                            ) : (
                              user.branches.map(branch => (
                                <Badge key={branch.id} variant="outline" className="text-xs">
                                  {branch.name}
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {userRole === 'ceo' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteUser(user.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add User Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Funcionário</DialogTitle>
            <DialogDescription>
              Cadastre um novo funcionário no sistema
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userName">Nome completo *</Label>
              <Input
                id="userName"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Nome do usuário"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="userEmail">E-mail *</Label>
              <Input
                id="userEmail"
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="email@exemplo.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="userPassword">Senha (opcional)</Label>
              <div className="relative">
                <Input
                  id="userPassword"
                  type={showPassword ? "text" : "password"}
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Deixe vazio para primeiro acesso"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Se deixar vazio, o usuário criará sua própria senha no primeiro acesso.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Perfil de acesso *</Label>
              <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Funcionário
                    </div>
                  </SelectItem>
                  {canCreateAdmins && (
                    <>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Administrador
                        </div>
                      </SelectItem>
                      <SelectItem value="ceo">
                        <div className="flex items-center gap-2">
                          <Crown className="h-4 w-4" />
                          CEO
                        </div>
                      </SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Branch selection - only for CEO, Admin assigns to their current branch automatically */}
            {userRole === 'ceo' ? (
              <div className="space-y-2">
                <Label>Filiais de acesso</Label>
                <div className="grid grid-cols-2 gap-2">
                  {branches.map(branch => (
                    <Button
                      key={branch.id}
                      type="button"
                      variant={selectedBranches.includes(branch.id) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleBranch(branch.id)}
                      className="justify-start"
                    >
                      <Building2 className="h-4 w-4 mr-2" />
                      {branch.name}
                    </Button>
                  ))}
                </div>
                {selectedBranches.length === 0 && newUserRole !== 'ceo' && (
                  <p className="text-xs text-muted-foreground">
                    Selecione pelo menos uma filial
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Filial de acesso</Label>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {branches.find(b => b.id === currentBranchId)?.name || 'Filial atual'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Funcionários serão automaticamente vinculados à sua filial
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Criando..." : "Criar Usuário"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Altere as permissões e filiais do usuário
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editUserName">Nome completo</Label>
              <Input
                id="editUserName"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Nome do usuário"
              />
            </div>

            {/* Role selection - only for CEO */}
            {userRole === 'ceo' ? (
              <div className="space-y-2">
                <Label>Perfil de acesso</Label>
                <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as AppRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Funcionário
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Administrador
                      </div>
                    </SelectItem>
                    <SelectItem value="ceo">
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4" />
                        CEO
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Perfil de acesso</Label>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  {selectedUser && roleLabels[selectedUser.role] && (
                    <>
                      {(() => {
                        const RoleIcon = roleLabels[selectedUser.role].icon;
                        return <RoleIcon className="h-4 w-4" />;
                      })()}
                      <span className="text-sm">{roleLabels[selectedUser.role].label}</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Apenas o CEO pode alterar o perfil de acesso
                </p>
              </div>
            )}

            {/* Branch selection - only for CEO */}
            {userRole === 'ceo' ? (
              <div className="space-y-2">
                <Label>Filiais de acesso</Label>
                <div className="grid grid-cols-2 gap-2">
                  {branches.map(branch => (
                    <Button
                      key={branch.id}
                      type="button"
                      variant={selectedBranches.includes(branch.id) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleBranch(branch.id)}
                      className="justify-start"
                    >
                      <Building2 className="h-4 w-4 mr-2" />
                      {branch.name}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Filial de acesso</Label>
                <div className="flex flex-wrap gap-1">
                  {selectedUser?.branches.map(branch => (
                    <Badge key={branch.id} variant="secondary">
                      <Building2 className="h-3 w-3 mr-1" />
                      {branch.name}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Apenas o CEO pode alterar filiais de acesso
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Temp Password Info Dialog */}
      <Dialog open={!!createdUserInfo} onOpenChange={() => setCreatedUserInfo(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              Funcionário Criado com Sucesso!
            </DialogTitle>
            <DialogDescription>
              Compartilhe as credenciais abaixo com o novo funcionário.
            </DialogDescription>
          </DialogHeader>

          {createdUserInfo && (
            <TempPasswordDisplay 
              email={createdUserInfo.email} 
              tempPassword={createdUserInfo.tempPassword} 
              onClose={() => setCreatedUserInfo(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Funcionarios;
