import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSuperAdmin } from '@/contexts/SuperAdminContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  GitBranch,
  Building2,
  Search,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Branch {
  id: string;
  name: string;
  company_id: string;
  company_name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  is_active: boolean;
  created_at: string;
}

interface Company {
  id: string;
  name: string;
  email: string;
  plan: string;
  branch_count: number;
  appointments_count: number;
  is_blocked: boolean;
  created_at: string;
}

const BranchManagementTab = () => {
  const { session } = useSuperAdmin();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [showDeleteBranchDialog, setShowDeleteBranchDialog] = useState(false);
  const [showDeleteCompanyDialog, setShowDeleteCompanyDialog] = useState(false);
  const [deletingItems, setDeletingItems] = useState(false);

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
    return data.data || data;
  };

  const { data: branches, isLoading: branchesLoading, refetch: refetchBranches } = useQuery({
    queryKey: ['super-admin-branches', session?.token],
    queryFn: () => fetchData('get_all_branches'),
    enabled: !!session?.token,
  });

  const { data: companies, isLoading: companiesLoading, refetch: refetchCompanies } = useQuery({
    queryKey: ['super-admin-companies-list', session?.token],
    queryFn: () => fetchData('get_companies'),
    enabled: !!session?.token,
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ type, ids }: { type: 'branch' | 'company'; ids: string[] }) => {
      const action = type === 'branch' ? 'delete_branches' : 'delete_companies';
      return fetchData(action, { ids });
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.type === 'branch' 
          ? `${variables.ids.length} filial(is) excluída(s) com sucesso` 
          : `${variables.ids.length} empresa(s) excluída(s) com sucesso`
      );
      if (variables.type === 'branch') {
        setSelectedBranches([]);
        refetchBranches();
      } else {
        setSelectedCompanies([]);
        refetchCompanies();
      }
      queryClient.invalidateQueries({ queryKey: ['super-admin'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir');
    },
  });

  const handleDeleteBranches = async () => {
    setDeletingItems(true);
    try {
      await deleteMutation.mutateAsync({ type: 'branch', ids: selectedBranches });
    } finally {
      setDeletingItems(false);
      setShowDeleteBranchDialog(false);
    }
  };

  const handleDeleteCompanies = async () => {
    setDeletingItems(true);
    try {
      await deleteMutation.mutateAsync({ type: 'company', ids: selectedCompanies });
    } finally {
      setDeletingItems(false);
      setShowDeleteCompanyDialog(false);
    }
  };

  const toggleBranchSelection = (id: string) => {
    setSelectedBranches(prev => 
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    );
  };

  const toggleCompanySelection = (id: string) => {
    setSelectedCompanies(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const selectAllBranches = () => {
    const filteredIds = filteredBranches.map(b => b.id);
    setSelectedBranches(prev => 
      prev.length === filteredIds.length ? [] : filteredIds
    );
  };

  const selectAllCompanies = () => {
    const filteredIds = filteredCompanies.map(c => c.id);
    setSelectedCompanies(prev => 
      prev.length === filteredIds.length ? [] : filteredIds
    );
  };

  const filteredBranches = (branches || []).filter((branch: Branch) =>
    branch.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCompanies = (companies || []).filter((company: Company) =>
    company.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (branchesLoading || companiesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-primary" />
            Gerenciamento de Filiais e Empresas
          </h2>
          <p className="text-muted-foreground">
            {branches?.length || 0} filiais • {companies?.length || 0} empresas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { refetchBranches(); refetchCompanies(); }}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, empresa ou cidade..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs defaultValue="branches" className="space-y-4">
        <TabsList>
          <TabsTrigger value="branches" className="gap-2">
            <GitBranch className="w-4 h-4" />
            Filiais ({branches?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="companies" className="gap-2">
            <Building2 className="w-4 h-4" />
            Empresas ({companies?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Branches Tab */}
        <TabsContent value="branches" className="space-y-4">
          {selectedBranches.length > 0 && (
            <div className="flex items-center gap-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <span className="text-sm font-medium text-red-700 dark:text-red-300">
                {selectedBranches.length} filial(is) selecionada(s)
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteBranchDialog(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir Selecionadas
              </Button>
            </div>
          )}

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Lista de Filiais</CardTitle>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedBranches.length === filteredBranches.length && filteredBranches.length > 0}
                    onCheckedChange={selectAllBranches}
                  />
                  <span className="text-sm text-muted-foreground">Selecionar todas</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredBranches.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhuma filial encontrada</p>
              ) : (
                <div className="space-y-2">
                  {filteredBranches.map((branch: Branch) => (
                    <div
                      key={branch.id}
                      className={`p-3 border rounded-lg flex items-center gap-3 transition-colors ${
                        selectedBranches.includes(branch.id) ? 'bg-red-50 dark:bg-red-900/20 border-red-200' : ''
                      }`}
                    >
                      <Checkbox
                        checked={selectedBranches.includes(branch.id)}
                        onCheckedChange={() => toggleBranchSelection(branch.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{branch.name}</span>
                          <Badge variant={branch.is_active ? 'default' : 'secondary'} className="text-xs">
                            {branch.is_active ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <span>{branch.company_name}</span>
                          {branch.city && <span> • {branch.city}/{branch.state}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Criada em {format(new Date(branch.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          setSelectedBranches([branch.id]);
                          setShowDeleteBranchDialog(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Companies Tab */}
        <TabsContent value="companies" className="space-y-4">
          {selectedCompanies.length > 0 && (
            <div className="flex items-center gap-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <span className="text-sm font-medium text-red-700 dark:text-red-300">
                {selectedCompanies.length} empresa(s) selecionada(s)
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteCompanyDialog(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir Selecionadas
              </Button>
            </div>
          )}

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Lista de Empresas</CardTitle>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedCompanies.length === filteredCompanies.length && filteredCompanies.length > 0}
                    onCheckedChange={selectAllCompanies}
                  />
                  <span className="text-sm text-muted-foreground">Selecionar todas</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredCompanies.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhuma empresa encontrada</p>
              ) : (
                <div className="space-y-2">
                  {filteredCompanies.map((company: Company) => (
                    <div
                      key={company.id}
                      className={`p-3 border rounded-lg flex items-center gap-3 transition-colors ${
                        selectedCompanies.includes(company.id) ? 'bg-red-50 dark:bg-red-900/20 border-red-200' : ''
                      }`}
                    >
                      <Checkbox
                        checked={selectedCompanies.includes(company.id)}
                        onCheckedChange={() => toggleCompanySelection(company.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{company.name}</span>
                          <Badge variant="outline" className="text-xs">{company.plan}</Badge>
                          {company.is_blocked && (
                            <Badge variant="destructive" className="text-xs">Bloqueada</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{company.email}</p>
                        <div className="text-xs text-muted-foreground">
                          {company.branch_count} filiais • {company.appointments_count} agendamentos •
                          Criada em {format(new Date(company.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          setSelectedCompanies([company.id]);
                          setShowDeleteCompanyDialog(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Branch Dialog */}
      <AlertDialog open={showDeleteBranchDialog} onOpenChange={setShowDeleteBranchDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Confirmar Exclusão de Filiais
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir <strong>{selectedBranches.length}</strong> filial(is).
              Esta ação não pode ser desfeita e todos os dados associados serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingItems}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBranches}
              disabled={deletingItems}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingItems ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Excluindo...</>
              ) : (
                <>Excluir Filiais</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Company Dialog */}
      <AlertDialog open={showDeleteCompanyDialog} onOpenChange={setShowDeleteCompanyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Confirmar Exclusão de Empresas
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir <strong>{selectedCompanies.length}</strong> empresa(s).
              <br /><br />
              <strong className="text-red-600">ATENÇÃO:</strong> Esta ação irá remover permanentemente:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Todas as filiais da empresa</li>
                <li>Todos os agendamentos</li>
                <li>Todos os profissionais e serviços</li>
                <li>Todas as configurações e dados</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingItems}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCompanies}
              disabled={deletingItems}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingItems ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Excluindo...</>
              ) : (
                <>Excluir Empresas</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BranchManagementTab;
