import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Edit, Trash2, Receipt, Upload, Eye, Calendar, DollarSign, Building2, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Expense {
  id: string;
  amount: number;
  description: string;
  expense_date: string;
  supplier_id: string | null;
  supplier_product_id: string | null;
  receipt_url: string | null;
  company_id: string;
  created_at: string;
}

interface Supplier {
  id: string;
  name: string;
}

interface SupplierProduct {
  id: string;
  name: string;
  supplier_id: string;
}

interface Sale {
  id: string;
  total_price: number;
  payment_status: string;
  sold_at: string;
}

interface ExpensesTabProps {
  companyId: string | null;
  sales?: Sale[];
}

const ExpensesTab = ({ companyId, sales = [] }: ExpensesTabProps) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierProducts, setSupplierProducts] = useState<SupplierProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  // Filter state
  const [filterPeriod, setFilterPeriod] = useState<"day" | "week" | "month" | "all">("month");
  const [filterDate, setFilterDate] = useState<Date>(new Date());

  // Form state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState<Date>(new Date());
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");

  // View receipt dialog
  const [viewReceiptUrl, setViewReceiptUrl] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!companyId) return;
    
    try {
      const [expensesRes, suppliersRes, productsRes] = await Promise.all([
        supabase.from("expenses").select("*").eq("company_id", companyId).order("expense_date", { ascending: false }),
        supabase.from("suppliers").select("id, name").eq("company_id", companyId).order("name"),
        supabase.from("supplier_products").select("id, name, supplier_id").eq("company_id", companyId).order("name"),
      ]);

      if (expensesRes.data) setExpenses(expensesRes.data);
      if (suppliersRes.data) setSuppliers(suppliersRes.data);
      if (productsRes.data) setSupplierProducts(productsRes.data);
    } catch (error) {
      console.error("Error loading expenses:", error);
      toast.error("Erro ao carregar gastos");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime subscriptions
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel('expenses-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `company_id=eq.${companyId}` },
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, loadData]);

  const resetForm = () => {
    setEditingExpense(null);
    setAmount("");
    setDescription("");
    setExpenseDate(new Date());
    setSelectedSupplierId("");
    setSelectedProductId("");
    setReceiptUrl("");
  };

  const handleUploadReceipt = async (file: File) => {
    if (!companyId) return;

    setUploadingReceipt(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${companyId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(fileName);

      setReceiptUrl(data.publicUrl);
      toast.success("Comprovante enviado!");
    } catch (error) {
      console.error("Error uploading receipt:", error);
      toast.error("Erro ao enviar comprovante");
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleSaveExpense = async () => {
    if (!description.trim() || !amount || !companyId || isSaving) return;

    setIsSaving(true);
    try {
      const data = {
        amount: parseFloat(amount),
        description: description.trim(),
        expense_date: format(expenseDate, 'yyyy-MM-dd'),
        supplier_id: selectedSupplierId || null,
        supplier_product_id: selectedProductId || null,
        receipt_url: receiptUrl || null,
        company_id: companyId,
      };

      if (editingExpense) {
        const { error } = await supabase
          .from("expenses")
          .update(data)
          .eq("id", editingExpense.id);
        if (error) throw error;
        toast.success("Gasto atualizado!");
      } else {
        const { error } = await supabase
          .from("expenses")
          .insert(data);
        if (error) throw error;
        toast.success("Gasto registrado!");
      }

      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving expense:", error);
      toast.error("Erro ao salvar gasto");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
      toast.success("Gasto excluído!");
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast.error("Erro ao excluir gasto");
    }
  };

  const openEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setAmount(expense.amount.toString());
    setDescription(expense.description);
    setExpenseDate(parseISO(expense.expense_date));
    setSelectedSupplierId(expense.supplier_id || "");
    setSelectedProductId(expense.supplier_product_id || "");
    setReceiptUrl(expense.receipt_url || "");
    setDialogOpen(true);
  };

  const getSupplierName = (id: string | null) => {
    if (!id) return null;
    return suppliers.find(s => s.id === id)?.name || null;
  };

  const getProductName = (id: string | null) => {
    if (!id) return null;
    return supplierProducts.find(p => p.id === id)?.name || null;
  };

  const getProductsBySupplier = (supplierId: string) => {
    return supplierProducts.filter(p => p.supplier_id === supplierId);
  };

  // Filter expenses by period
  const filteredExpenses = useMemo(() => {
    if (filterPeriod === "all") return expenses;

    return expenses.filter(expense => {
      const expDate = parseISO(expense.expense_date);
      
      if (filterPeriod === "day") {
        return format(expDate, 'yyyy-MM-dd') === format(filterDate, 'yyyy-MM-dd');
      } else if (filterPeriod === "week") {
        const weekStart = startOfWeek(filterDate, { weekStartsOn: 0 });
        const weekEnd = endOfWeek(filterDate, { weekStartsOn: 0 });
        return isWithinInterval(expDate, { start: weekStart, end: weekEnd });
      } else if (filterPeriod === "month") {
        const monthStart = startOfMonth(filterDate);
        const monthEnd = endOfMonth(filterDate);
        return isWithinInterval(expDate, { start: monthStart, end: monthEnd });
      }
      return true;
    });
  }, [expenses, filterPeriod, filterDate]);

  // Calculate total expenses
  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  // Calculate sales total based on filter period (paid sales only)
  const filteredSalesTotal = useMemo(() => {
    if (filterPeriod === "all") {
      return sales.filter(s => s.payment_status === 'paid').reduce((sum, s) => sum + s.total_price, 0);
    }

    return sales.filter(sale => {
      if (sale.payment_status !== 'paid') return false;
      const saleDate = parseISO(sale.sold_at.split('T')[0]);
      
      if (filterPeriod === "day") {
        return format(saleDate, 'yyyy-MM-dd') === format(filterDate, 'yyyy-MM-dd');
      } else if (filterPeriod === "week") {
        const weekStart = startOfWeek(filterDate, { weekStartsOn: 0 });
        const weekEnd = endOfWeek(filterDate, { weekStartsOn: 0 });
        return isWithinInterval(saleDate, { start: weekStart, end: weekEnd });
      } else if (filterPeriod === "month") {
        const monthStart = startOfMonth(filterDate);
        const monthEnd = endOfMonth(filterDate);
        return isWithinInterval(saleDate, { start: monthStart, end: monthEnd });
      }
      return true;
    }).reduce((sum, s) => sum + s.total_price, 0);
  }, [sales, filterPeriod, filterDate]);

  // Calculate net balance (sales - expenses)
  const netBalance = filteredSalesTotal - totalExpenses;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary and filters */}
      <div className="flex flex-col gap-4">
        {/* Summary Cards - Mobile responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="px-3 py-2 md:px-4 md:py-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-green-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Vendas (Pago)</p>
                <p className="text-base md:text-lg font-bold text-green-600 truncate">R$ {filteredSalesTotal.toFixed(2)}</p>
              </div>
            </div>
          </Card>
          <Card className="px-3 py-2 md:px-4 md:py-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-destructive shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Total Gastos</p>
                <p className="text-base md:text-lg font-bold text-destructive truncate">R$ {totalExpenses.toFixed(2)}</p>
              </div>
            </div>
          </Card>
          <Card className={`px-3 py-2 md:px-4 md:py-3 ${netBalance >= 0 ? 'border-green-200 bg-green-50/50 dark:bg-green-950/20' : 'border-red-200 bg-red-50/50 dark:bg-red-950/20'}`}>
            <div className="flex items-center gap-2">
              <Wallet className={`h-4 w-4 md:h-5 md:w-5 shrink-0 ${netBalance >= 0 ? 'text-green-600' : 'text-destructive'}`} />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Saldo Líquido</p>
                <p className={`text-base md:text-lg font-bold truncate ${netBalance >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                  R$ {netBalance.toFixed(2)}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex items-center gap-2">
          <Select value={filterPeriod} onValueChange={(v) => setFilterPeriod(v as typeof filterPeriod)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[100] bg-background border">
              <SelectItem value="day">Dia</SelectItem>
              <SelectItem value="week">Semana</SelectItem>
              <SelectItem value="month">Mês</SelectItem>
              <SelectItem value="all">Todos</SelectItem>
            </SelectContent>
          </Select>

          {filterPeriod !== "all" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[180px] justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  {filterPeriod === "day" 
                    ? format(filterDate, "dd/MM/yyyy", { locale: ptBR })
                    : filterPeriod === "week"
                    ? `Sem. ${format(filterDate, "dd/MM", { locale: ptBR })}`
                    : format(filterDate, "MMMM yyyy", { locale: ptBR })
                  }
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[100]" align="end">
                <CalendarComponent
                  mode="single"
                  selected={filterDate}
                  onSelect={(date) => date && setFilterDate(date)}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          )}

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Gasto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingExpense ? "Editar Gasto" : "Registrar Gasto"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="amount">Valor *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>Data *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <Calendar className="h-4 w-4 mr-2" />
                          {format(expenseDate, "dd/MM/yyyy", { locale: ptBR })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-[100]" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={expenseDate}
                          onSelect={(date) => date && setExpenseDate(date)}
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Motivo/Descrição *</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descreva o gasto..."
                    rows={2}
                  />
                </div>

                <div>
                  <Label>Fornecedor (Opcional)</Label>
                  <Select 
                    value={selectedSupplierId} 
                    onValueChange={(v) => {
                      setSelectedSupplierId(v === "none" ? "" : v);
                      setSelectedProductId("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar fornecedor" />
                    </SelectTrigger>
                    <SelectContent className="z-[100] bg-background border">
                      <SelectItem value="none">Nenhum</SelectItem>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedSupplierId && (
                  <div>
                    <Label>Produto (Opcional)</Label>
                    <Select 
                      value={selectedProductId} 
                      onValueChange={(v) => setSelectedProductId(v === "none" ? "" : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar produto" />
                      </SelectTrigger>
                      <SelectContent className="z-[100] bg-background border">
                        <SelectItem value="none">Nenhum</SelectItem>
                        {getProductsBySupplier(selectedSupplierId).map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label>Comprovante (Opcional)</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {receiptUrl ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Receipt className="h-3 w-3" />
                          Anexado
                        </Badge>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setViewReceiptUrl(receiptUrl)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => setReceiptUrl("")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <Input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadReceipt(file);
                          }}
                          disabled={uploadingReceipt}
                        />
                        <Button type="button" variant="outline" size="sm" asChild disabled={uploadingReceipt}>
                          <span>
                            <Upload className="h-4 w-4 mr-1" />
                            {uploadingReceipt ? "Enviando..." : "Anexar"}
                          </span>
                        </Button>
                      </label>
                    )}
                  </div>
                </div>

                <Button 
                  onClick={handleSaveExpense} 
                  className="w-full" 
                  disabled={isSaving || !description.trim() || !amount}
                >
                  {isSaving ? "Salvando..." : (editingExpense ? "Salvar Alterações" : "Registrar Gasto")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Expenses table */}
      {filteredExpenses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum gasto registrado</h3>
            <p className="text-muted-foreground text-center mb-4">
              Registre seus gastos para controlar suas finanças
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-center">Comprovante</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.map((expense) => {
                const expDate = parseISO(expense.expense_date);
                const supplierName = getSupplierName(expense.supplier_id);
                const productName = getProductName(expense.supplier_product_id);

                return (
                  <TableRow key={expense.id}>
                    <TableCell>
                      <div className="text-sm">
                        <p className="font-medium">{format(expDate, "dd/MM/yyyy", { locale: ptBR })}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(expDate, "EEEE", { locale: ptBR })}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{expense.description}</p>
                      {productName && (
                        <p className="text-xs text-muted-foreground">Produto: {productName}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      {supplierName ? (
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                          <Building2 className="h-3 w-3" />
                          {supplierName}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-bold text-destructive">
                        R$ {expense.amount.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {expense.receipt_url ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setViewReceiptUrl(expense.receipt_url)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditExpense(expense)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir gasto?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteExpense(expense.id)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* View Receipt Dialog */}
      <Dialog open={!!viewReceiptUrl} onOpenChange={() => setViewReceiptUrl(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Comprovante
            </DialogTitle>
          </DialogHeader>
          {viewReceiptUrl && (
            <div className="flex justify-center">
              <img 
                src={viewReceiptUrl} 
                alt="Comprovante" 
                className="max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExpensesTab;
