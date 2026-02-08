import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSuperAdmin } from '@/contexts/SuperAdminContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Building2, Search, RefreshCw, Trash2, AlertTriangle, Loader2, Crown, Ban
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

const CompanyManagementTab = () => {
  const { session } = useSuperAdmin();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
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

  const { data: companies, isLoading, refetch } = useQuery({
    queryKey: ['super-admin-companies-management', session?.token],
    queryFn: () => fetchData('get_companies_only'),
    enabled: !!session?.token,
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return fetchData('delete_companies', { ids });
    },
    onSuccess: (_, ids) => {
      toast.success(`${ids.length} empresa(s) excluída(s) com sucesso`);
      setSelectedCompanies([]);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['super-admin'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir');
    },
  });

  const handleDeleteCompanies = async () => {
    setDeletingItems(true);
    try {
      await deleteMutation.mutateAsync(selectedCompanies);
    } finally {
      setDeletingItems(false);
      setShowDeleteDialog(false);
    }
  };

  const toggleCompanySelection = (id: string) => {
    setSelectedCompanies(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const selectAllCompanies = () => {
    const filteredIds = filteredCompanies.map(c => c.id);
    setSelectedCompanies(prev => 
      prev.length === filteredIds.length ? [] : filteredIds
    );
  };

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'premium_mensal':
        return <Badge className="bg-green-500 hover:bg-green-600"><Crown className="w-3 h-3 mr-1" />Premium Mensal</Badge>;
      case 'premium_anual':
        return <Badge className="bg-blue-500 hover:bg-blue-600"><Crown className="w-3 h-3 mr-1" />Premium Anual</Badge>;
      case 'trial':
        return <Badge variant="secondary">Trial</Badge>;
      case 'pro':
        return <Badge variant="secondary">Pro</Badge>;
      default:
        return <Badge variant="outline">{plan}</Badge>;
    }
  };

  const filteredCompanies = (companies || []).filter((company: Company) =>
    company.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
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
            <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            Gerenciamento de Empresas
          </h2>
          <p className="text-sm text-muted-foreground">
            {companies?.length || 0} empresas (matrizes) cadastradas
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={() => refetch()} className="w-fit">
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou e-mail..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Selection Actions */}
      {selectedCompanies.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <span className="text-sm font-medium text-red-700 dark:text-red-300">
            {selectedCompanies.length} empresa(s) selecionada(s)
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

      {/* Companies List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Empresas Matriz</CardTitle>
              <CardDescription>Apenas empresas principais (CEOs)</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedCompanies.length === filteredCompanies.length && filteredCompanies.length > 0}
                onCheckedChange={selectAllCompanies}
              />
              <span className="text-sm text-muted-foreground">Selecionar todas</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          <ScrollArea className="h-[400px] sm:h-[500px]">
            {filteredCompanies.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhuma empresa encontrada</p>
            ) : (
              <div className="space-y-2 p-4 sm:p-0">
                {filteredCompanies.map((company: Company) => (
                  <div
                    key={company.id}
                    className={`p-3 border rounded-lg flex flex-col sm:flex-row sm:items-center gap-3 transition-colors ${
                      selectedCompanies.includes(company.id) ? 'bg-red-50 dark:bg-red-900/20 border-red-200' : ''
                    }`}
                  >
                    <Checkbox
                      checked={selectedCompanies.includes(company.id)}
                      onCheckedChange={() => toggleCompanySelection(company.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{company.name}</span>
                        {getPlanBadge(company.plan)}
                        {company.is_blocked && (
                          <Badge variant="destructive"><Ban className="w-3 h-3 mr-1" />Bloqueada</Badge>
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
                        setShowDeleteDialog(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
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
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel disabled={deletingItems} className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCompanies}
              disabled={deletingItems}
              className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
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

export default CompanyManagementTab;
