import { useState, useEffect } from 'react';
import { useSuperAdmin } from '@/contexts/SuperAdminContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Users, Search, RefreshCw, Trash2, AlertTriangle, Loader2,
  Edit2, Ban, Unlock, Building2, Mail, Phone, Shield, Crown, User
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UserAccess {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: 'ceo' | 'admin' | 'employee';
  company_id: string | null;
  company_name: string | null;
  branch_id: string | null;
  branch_name: string | null;
  is_blocked: boolean;
  created_at: string;
}

interface Company {
  id: string;
  name: string;
}

const SUPER_ADMIN_EMAIL = 'corteearte.suporte@gmail.com';

const UserAccessManagementTab = () => {
  const { session } = useSuperAdmin();
  const [users, setUsers] = useState<UserAccess[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  
  // Selection state
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  
  // Dialog states
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccess | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: '',
    company_id: '',
    is_blocked: false,
    new_password: ''
  });

  useEffect(() => {
    loadData();
  }, [session]);

  const fetchData = async (action: string, params?: Record<string, any>) => {
    const response = await fetch(
      'https://gwyickztdeiplccievyt.supabase.co/functions/v1/super-admin-data',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-super-admin-token': session?.token || '',
        },
        body: JSON.stringify({ action, params }),
      }
    );
    
    if (!response.ok) throw new Error('Failed to fetch data');
    const data = await response.json();
    return data.success ? data.data : null;
  };

  const loadData = async () => {
    if (!session?.token) return;
    setLoading(true);
    
    try {
      const [usersData, companiesData] = await Promise.all([
        fetchData('get_all_user_access'),
        fetchData('get_companies_list')
      ]);
      
      if (usersData) {
        // Filter out super admin
        const filteredUsers = usersData.filter((u: UserAccess) => 
          u.email?.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase()
        );
        setUsers(filteredUsers);
      }
      if (companiesData) setCompanies(companiesData);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: UserAccess) => {
    setEditingUser(user);
    setEditForm({
      full_name: user.full_name || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role,
      company_id: user.company_id || '',
      is_blocked: user.is_blocked,
      new_password: ''
    });
    setShowEditDialog(true);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    setActionLoading(true);
    
    try {
      const result = await fetchData('update_user_access', {
        user_id: editingUser.user_id,
        full_name: editForm.full_name,
        email: editForm.email,
        phone: editForm.phone,
        role: editForm.role,
        company_id: editForm.company_id || null,
        is_blocked: editForm.is_blocked,
        new_password: editForm.new_password || null
      });
      
      if (result?.success) {
        toast.success('Usuário atualizado com sucesso');
        setShowEditDialog(false);
        setEditingUser(null);
        loadData();
      } else {
        toast.error(result?.message || 'Erro ao atualizar usuário');
      }
    } catch (error) {
      toast.error('Erro ao atualizar usuário');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUsers = async () => {
    if (selectedUsers.length === 0) return;
    setActionLoading(true);
    
    try {
      const result = await fetchData('delete_users', { user_ids: selectedUsers });
      
      if (result?.success) {
        toast.success(`${selectedUsers.length} usuário(s) removido(s)`);
        setSelectedUsers([]);
        setShowDeleteDialog(false);
        loadData();
      } else {
        toast.error('Erro ao remover usuários');
      }
    } catch (error) {
      toast.error('Erro ao remover usuários');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleBlock = async (user: UserAccess) => {
    try {
      const result = await fetchData('toggle_user_block', {
        user_id: user.user_id,
        is_blocked: !user.is_blocked
      });
      
      if (result?.success) {
        toast.success(user.is_blocked ? 'Acesso liberado' : 'Acesso bloqueado');
        loadData();
      }
    } catch (error) {
      toast.error('Erro ao alterar bloqueio');
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const selectAllUsers = () => {
    const filteredIds = filteredUsers.map(u => u.user_id);
    setSelectedUsers(prev => 
      prev.length === filteredIds.length ? [] : filteredIds
    );
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ceo':
        return <Badge className="bg-purple-500"><Crown className="w-3 h-3 mr-1" />CEO</Badge>;
      case 'admin':
        return <Badge className="bg-blue-500"><Shield className="w-3 h-3 mr-1" />Admin</Badge>;
      case 'employee':
        return <Badge variant="secondary"><User className="w-3 h-3 mr-1" />Funcionário</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            Gerenciamento de Acessos
          </h2>
          <p className="text-sm text-muted-foreground">
            {users.length} usuários na plataforma
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={loadData} className="w-fit">
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail ou empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Cargo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ceo">CEO</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="employee">Funcionário</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Selection Actions */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <span className="text-sm font-medium text-red-700 dark:text-red-300">
            {selectedUsers.length} usuário(s) selecionado(s)
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir
          </Button>
        </div>
      )}

      {/* Users List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-lg">Usuários ({filteredUsers.length})</CardTitle>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                onCheckedChange={selectAllUsers}
              />
              <span className="text-sm text-muted-foreground">Selecionar todos</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          <ScrollArea className="h-[500px]">
            {filteredUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum usuário encontrado</p>
            ) : (
              <div className="space-y-2 p-4 sm:p-0">
                {filteredUsers.map((user) => (
                  <div
                    key={user.user_id}
                    className={`p-3 sm:p-4 border rounded-lg transition-colors ${
                      selectedUsers.includes(user.user_id) ? 'bg-red-50 dark:bg-red-900/20 border-red-200' : ''
                    } ${user.is_blocked ? 'opacity-60' : ''}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <Checkbox
                        checked={selectedUsers.includes(user.user_id)}
                        onCheckedChange={() => toggleUserSelection(user.user_id)}
                      />
                      
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{user.full_name || 'Sem nome'}</span>
                          {getRoleBadge(user.role)}
                          {user.is_blocked && (
                            <Badge variant="destructive"><Ban className="w-3 h-3 mr-1" />Bloqueado</Badge>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />{user.email}
                          </span>
                          {user.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />{user.phone}
                            </span>
                          )}
                        </div>
                        
                        {user.company_name && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {user.company_name}
                            {user.branch_name && ` • ${user.branch_name}`}
                          </p>
                        )}
                        
                        <p className="text-xs text-muted-foreground">
                          Cadastrado em {format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={user.is_blocked ? "default" : "destructive"}
                          size="sm"
                          onClick={() => handleToggleBlock(user)}
                        >
                          {user.is_blocked ? <Unlock className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() => {
                            setSelectedUsers([user.user_id]);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Altere as informações de {editingUser?.full_name || editingUser?.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input
                value={editForm.full_name}
                onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                placeholder="Nome do usuário"
              />
            </div>
            
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                placeholder="email@exemplo.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                placeholder="(00) 00000-0000"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Cargo</Label>
              <Select value={editForm.role} onValueChange={(v) => setEditForm({...editForm, role: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cargo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ceo">CEO</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="employee">Funcionário</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Select value={editForm.company_id} onValueChange={(v) => setEditForm({...editForm, company_id: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhuma</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Nova Senha (opcional)</Label>
              <Input
                type="password"
                value={editForm.new_password}
                onChange={(e) => setEditForm({...editForm, new_password: e.target.value})}
                placeholder="Deixe em branco para manter a senha atual"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Checkbox
                checked={editForm.is_blocked}
                onCheckedChange={(checked) => setEditForm({...editForm, is_blocked: !!checked})}
              />
              <Label className="text-sm">Bloquear acesso do usuário</Label>
            </div>
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button onClick={handleSaveUser} disabled={actionLoading} className="w-full sm:w-auto">
              {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a remover <strong>{selectedUsers.length}</strong> usuário(s) do sistema.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel disabled={actionLoading} className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUsers}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
            >
              {actionLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Excluindo...</>
              ) : (
                <>Excluir Usuários</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserAccessManagementTab;
