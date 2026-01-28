import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Edit, Trash2, MoveRight, Package, FolderOpen, ShoppingCart, History, Check, Clock, AlertCircle, TrendingUp, TrendingDown, Building2, Receipt } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import SuppliersTab from "@/components/estoque/SuppliersTab";
import ExpensesTab from "@/components/estoque/ExpensesTab";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AdminPasswordModal } from "@/components/AdminPasswordModal";
import { useAdminPassword } from "@/hooks/useAdminPassword";
import { useBranch } from "@/contexts/BranchContext";

interface Category {
  id: string;
  name: string;
  company_id: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
  description: string | null;
  image_url: string | null;
  category_id: string;
  company_id: string;
}

interface Client {
  id: string;
  name: string;
  phone: string;
}

interface Sale {
  id: string;
  product_id: string;
  client_id: string | null;
  client_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  payment_status: string;
  payment_method: string | null;
  notes: string | null;
  sold_at: string;
  product?: Product;
}

const Estoque = () => {
  const { currentBranchId, userRole, companyId: branchCompanyId, loading: branchLoading } = useBranch();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastBranchId, setLastBranchId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("products");

  // Should filter by branch - CEO sees all, others see only their branch
  const shouldFilterByBranch = userRole !== 'ceo' && currentBranchId;
  // Category form state
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState("");

  // Product form state
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productQuantity, setProductQuantity] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productImageUrl, setProductImageUrl] = useState("");
  const [productCategoryId, setProductCategoryId] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  // Move product state
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [movingProduct, setMovingProduct] = useState<Product | null>(null);
  const [targetCategoryId, setTargetCategoryId] = useState("");

  // Sale form state
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);
  const [sellingProduct, setSellingProduct] = useState<Product | null>(null);
  const [saleQuantity, setSaleQuantity] = useState("1");
  const [salePaymentStatus, setSalePaymentStatus] = useState("pending");
  const [salePaymentMethod, setSalePaymentMethod] = useState("");
  const [saleNotes, setSaleNotes] = useState("");

  // Edit sale state
  const [editSaleDialogOpen, setEditSaleDialogOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editSaleQuantity, setEditSaleQuantity] = useState("1");
  const [editSalePaymentStatus, setEditSalePaymentStatus] = useState("pending");
  const [editSalePaymentMethod, setEditSalePaymentMethod] = useState("");
  const [editSaleNotes, setEditSaleNotes] = useState("");

  // Admin password state
  const [adminPasswordModalOpen, setAdminPasswordModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [pendingActionDescription, setPendingActionDescription] = useState("");
  const [hasAdminPasswordConfigured, setHasAdminPasswordConfigured] = useState(false);
  const { hasAdminPassword } = useAdminPassword();

  // Processing states to prevent duplicate submissions
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: company } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!company) {
        setError('Empresa não encontrada');
        return;
      }
      setCompanyId(company.id);

      // Check if admin password is configured
      const hasPass = await hasAdminPassword(company.id);
      setHasAdminPasswordConfigured(hasPass);

      // Build queries with branch filtering
      let categoriesQuery = supabase.from("stock_categories").select("*").eq("company_id", company.id).order("name");
      let productsQuery = supabase.from("stock_products").select("*").eq("company_id", company.id).order("name");
      let salesQuery = supabase.from("stock_sales").select("*").eq("company_id", company.id).order("sold_at", { ascending: false }).limit(100);

      if (shouldFilterByBranch) {
        categoriesQuery = categoriesQuery.or(`branch_id.eq.${currentBranchId},branch_id.is.null`);
        productsQuery = productsQuery.or(`branch_id.eq.${currentBranchId},branch_id.is.null`);
        salesQuery = salesQuery.or(`branch_id.eq.${currentBranchId},branch_id.is.null`);
      }

      // Timeout promise
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Tempo limite excedido')), 15000)
      );

      const [categoriesRes, productsRes, clientsRes, salesRes] = await Promise.race([
        Promise.all([
          categoriesQuery,
          productsQuery,
          supabase.from("clients").select("id, name, phone").order("name"),
          salesQuery,
        ]),
        timeoutPromise
      ]) as any[];

      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (productsRes.data) setProducts(productsRes.data);
      if (clientsRes.data) setClients(clientsRes.data);
      if (salesRes.data) setSales(salesRes.data);
      setLastBranchId(currentBranchId);
    } catch (err) {
      console.error("Error loading data:", err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [hasAdminPassword, shouldFilterByBranch, currentBranchId]);

  // Clear and reload when branch changes
  useEffect(() => {
    if (branchLoading) return;
    
    if (lastBranchId !== currentBranchId) {
      setCategories([]);
      setProducts([]);
      setSales([]);
      loadData();
    }
  }, [currentBranchId, branchLoading, lastBranchId, loadData]);

  // Initial load
  useEffect(() => {
    if (!branchLoading && lastBranchId === null) {
      loadData();
    }
  }, [branchLoading, lastBranchId, loadData]);

  // Realtime subscriptions for automatic updates
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel('stock-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stock_products',
          filter: `company_id=eq.${companyId}`
        },
        () => {
          // Reload products on any change
          supabase.from("stock_products")
            .select("*")
            .eq("company_id", companyId)
            .order("name")
            .then(({ data }) => {
              if (data) setProducts(data);
            });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stock_sales',
          filter: `company_id=eq.${companyId}`
        },
        () => {
          // Reload sales on any change
          supabase.from("stock_sales")
            .select("*")
            .eq("company_id", companyId)
            .order("sold_at", { ascending: false })
            .limit(100)
            .then(({ data }) => {
              if (data) setSales(data);
            });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stock_categories',
          filter: `company_id=eq.${companyId}`
        },
        () => {
          // Reload categories on any change
          supabase.from("stock_categories")
            .select("*")
            .eq("company_id", companyId)
            .order("name")
            .then(({ data }) => {
              if (data) setCategories(data);
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  // Helper function to require admin password before sensitive actions
  const requireAdminPassword = useCallback((action: () => void, description: string) => {
    if (hasAdminPasswordConfigured && companyId) {
      setPendingAction(() => action);
      setPendingActionDescription(description);
      setAdminPasswordModalOpen(true);
    } else {
      action();
    }
  }, [hasAdminPasswordConfigured, companyId]);

  const handleAdminPasswordSuccess = () => {
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
      setPendingActionDescription("");
    }
  };

  // Category CRUD
  const handleSaveCategory = async () => {
    if (!categoryName.trim() || !companyId) return;
    if (isSaving) return; // Prevent duplicate submissions

    setIsSaving(true);
    try {
      if (editingCategory) {
        const { error } = await supabase
          .from("stock_categories")
          .update({ name: categoryName.trim() })
          .eq("id", editingCategory.id);

        if (error) throw error;
        toast.success("Categoria atualizada");
      } else {
        const { error } = await supabase
          .from("stock_categories")
          .insert({ name: categoryName.trim(), company_id: companyId });

        if (error) throw error;
        toast.success("Categoria criada");
      }

      setCategoryDialogOpen(false);
      resetCategoryForm();
    } catch (error) {
      console.error("Error saving category:", error);
      toast.error("Erro ao salvar categoria");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      const { error } = await supabase
        .from("stock_categories")
        .delete()
        .eq("id", categoryId);

      if (error) throw error;
      toast.success("Categoria excluída");
      loadData();
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Erro ao excluir categoria. Verifique se não há produtos nela.");
    }
  };

  const resetCategoryForm = () => {
    setEditingCategory(null);
    setCategoryName("");
  };

  const openEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryDialogOpen(true);
  };

  // Product CRUD
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyId) return;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${companyId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("gallery")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("gallery")
        .getPublicUrl(fileName);

      setProductImageUrl(publicUrl);
      toast.success("Imagem enviada");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Erro ao enviar imagem");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProduct = async () => {
    if (!productName.trim() || !productCategoryId || !companyId) {
      toast.error("Preencha nome e categoria");
      return;
    }
    if (isSaving) return; // Prevent duplicate submissions

    const price = parseFloat(productPrice) || 0;
    const quantity = parseInt(productQuantity) || 0;

    if (price < 0) {
      toast.error("O preço não pode ser negativo");
      return;
    }

    if (quantity < 0) {
      toast.error("A quantidade não pode ser negativa");
      return;
    }

    setIsSaving(true);
    try {
      const productData = {
        name: productName.trim(),
        price,
        quantity,
        description: productDescription.trim() || null,
        image_url: productImageUrl || null,
        category_id: productCategoryId,
        company_id: companyId,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from("stock_products")
          .update(productData)
          .eq("id", editingProduct.id);

        if (error) throw error;
        toast.success("Produto atualizado com sucesso!");
      } else {
        const { error } = await supabase
          .from("stock_products")
          .insert(productData);

        if (error) throw error;
        toast.success("Produto criado com sucesso!");
      }

      setProductDialogOpen(false);
      resetProductForm();
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Erro ao salvar produto");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      const { error } = await supabase
        .from("stock_products")
        .delete()
        .eq("id", productId);

      if (error) throw error;
      toast.success("Produto excluído");
      loadData();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Erro ao excluir produto");
    }
  };

  const handleMoveProduct = async () => {
    if (!movingProduct || !targetCategoryId) return;

    try {
      const { error } = await supabase
        .from("stock_products")
        .update({ category_id: targetCategoryId })
        .eq("id", movingProduct.id);

      if (error) throw error;
      toast.success("Produto movido");
      setMoveDialogOpen(false);
      setMovingProduct(null);
      setTargetCategoryId("");
      loadData();
    } catch (error) {
      console.error("Error moving product:", error);
      toast.error("Erro ao mover produto");
    }
  };

  const resetProductForm = () => {
    setEditingProduct(null);
    setProductName("");
    setProductPrice("");
    setProductQuantity("");
    setProductDescription("");
    setProductImageUrl("");
    setProductCategoryId("");
  };

  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductName(product.name);
    setProductPrice(product.price.toString());
    setProductQuantity(product.quantity.toString());
    setProductDescription(product.description || "");
    setProductImageUrl(product.image_url || "");
    setProductCategoryId(product.category_id);
    setProductDialogOpen(true);
  };

  const openAddProduct = (categoryId: string) => {
    resetProductForm();
    setProductCategoryId(categoryId);
    setProductDialogOpen(true);
  };

  const openMoveProduct = (product: Product) => {
    setMovingProduct(product);
    setTargetCategoryId("");
    setMoveDialogOpen(true);
  };

  // Sale functions
  const openSaleDialog = (product: Product) => {
    setSellingProduct(product);
    setSaleQuantity("1");
    setSalePaymentStatus("pending");
    setSalePaymentMethod("");
    setSaleNotes("");
    setSaleDialogOpen(true);
  };

  const handleSaveSale = async () => {
    if (!sellingProduct || !companyId) {
      toast.error("Erro ao registrar venda");
      return;
    }
    if (isSaving) return; // Prevent duplicate submissions

    const quantity = parseInt(saleQuantity) || 1;
    
    if (quantity <= 0) {
      toast.error("A quantidade deve ser maior que zero");
      return;
    }
    
    // Verificar se há estoque suficiente
    if (quantity > sellingProduct.quantity) {
      toast.error(`Estoque insuficiente! Disponível: ${sellingProduct.quantity} unidades`);
      return;
    }
    
    const totalPrice = sellingProduct.price * quantity;

    setIsSaving(true);
    try {
      const { error } = await supabase.from("stock_sales").insert({
        company_id: companyId,
        product_id: sellingProduct.id,
        client_id: null,
        client_name: "Venda avulsa",
        quantity,
        unit_price: sellingProduct.price,
        total_price: totalPrice,
        payment_status: salePaymentStatus,
        payment_method: salePaymentMethod || null,
        notes: saleNotes.trim() || null,
      });

      if (error) throw error;
      
      toast.success(`Venda de ${quantity}x ${sellingProduct.name} registrada!`, {
        description: `Total: R$ ${totalPrice.toFixed(2)} - ${salePaymentStatus === 'paid' ? 'Pago' : 'Pendente'}`
      });
      setSaleDialogOpen(false);
    } catch (error) {
      console.error("Error saving sale:", error);
      toast.error("Erro ao registrar venda");
    } finally {
      setIsSaving(false);
    }
  };

  // Edit sale functions
  const openEditSaleDialog = (sale: Sale) => {
    setEditingSale(sale);
    setEditSaleQuantity(sale.quantity.toString());
    setEditSalePaymentStatus(sale.payment_status || "pending");
    setEditSalePaymentMethod(sale.payment_method || "none");
    setEditSaleNotes(sale.notes || "");
    setEditSaleDialogOpen(true);
  };

  const handleUpdateSale = async () => {
    if (!editingSale || !companyId) return;
    if (isSaving) return; // Prevent duplicate submissions

    const quantity = parseInt(editSaleQuantity) || 1;
    
    if (quantity <= 0) {
      toast.error("A quantidade deve ser maior que zero");
      return;
    }
    
    const product = products.find(p => p.id === editingSale.product_id);
    
    // Calcular diferença de quantidade para verificar estoque
    // O trigger vai restaurar a quantidade antiga e descontar a nova
    const quantityDiff = quantity - editingSale.quantity;
    if (product && quantityDiff > 0 && quantityDiff > product.quantity) {
      toast.error(`Estoque insuficiente! Disponível: ${product.quantity} unidades adicionais`);
      return;
    }

    const unitPrice = editingSale.unit_price;
    const totalPrice = unitPrice * quantity;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("stock_sales")
        .update({
          quantity,
          total_price: totalPrice,
          payment_status: editSalePaymentStatus,
          payment_method: editSalePaymentMethod === "none" ? null : editSalePaymentMethod || null,
          notes: editSaleNotes.trim() || null,
        })
        .eq("id", editingSale.id);

      if (error) throw error;
      
      toast.success("Venda atualizada!", {
        description: `Nova quantidade: ${quantity} - Total: R$ ${totalPrice.toFixed(2)}`
      });
      setEditSaleDialogOpen(false);
      setEditingSale(null);
    } catch (error) {
      console.error("Error updating sale:", error);
      toast.error("Erro ao atualizar venda");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSale = async (saleId: string) => {
    const sale = sales.find(s => s.id === saleId);
    
    try {
      const { error } = await supabase
        .from("stock_sales")
        .delete()
        .eq("id", saleId);

      if (error) throw error;
      
      toast.success("Venda excluída!", {
        description: sale ? `${sale.quantity}x ${getProductName(sale.product_id)} devolvido ao estoque` : "Estoque restaurado"
      });
    } catch (error) {
      console.error("Error deleting sale:", error);
      toast.error("Erro ao excluir venda");
    }
  };

  const handleUpdatePaymentStatus = async (saleId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("stock_sales")
        .update({ payment_status: newStatus })
        .eq("id", saleId);

      if (error) throw error;
      toast.success("Status atualizado");
      loadData();
    } catch (error) {
      console.error("Error updating payment status:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  const getProductsByCategory = useCallback((categoryId: string) => {
    return products.filter((p) => p.category_id === categoryId);
  }, [products]);

  const getProductName = useCallback((productId: string) => {
    const product = products.find(p => p.id === productId);
    return product?.name || "Produto removido";
  }, [products]);

  // Stock summary statistics
  const stockStats = useMemo(() => {
    const totalProducts = products.length;
    const totalValue = products.reduce((acc, p) => acc + (p.price * p.quantity), 0);
    const lowStockProducts = products.filter(p => p.quantity > 0 && p.quantity <= 5).length;
    const outOfStockProducts = products.filter(p => p.quantity === 0).length;
    const todaySales = sales.filter(s => {
      const saleDate = new Date(s.sold_at).toDateString();
      return saleDate === new Date().toDateString();
    });
    const todaySalesTotal = todaySales.reduce((acc, s) => acc + s.total_price, 0);
    const todayPaidSales = todaySales.filter(s => s.payment_status === 'paid');
    const todayPaidTotal = todayPaidSales.reduce((acc, s) => acc + s.total_price, 0);
    
    return {
      totalProducts,
      totalValue,
      lowStockProducts,
      outOfStockProducts,
      todaySalesCount: todaySales.length,
      todaySalesTotal,
      todayPaidTotal
    };
  }, [products, sales]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Estoque</h1>
            <p className="text-muted-foreground">Gerencie seus produtos e vendas</p>
          </div>
        </div>

        {/* Stock Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card>
            <CardContent className="p-3 md:pt-4 md:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs md:text-sm text-muted-foreground truncate">Total de Produtos</p>
                  <p className="text-xl md:text-2xl font-bold">{stockStats.totalProducts}</p>
                </div>
                <Package className="h-6 w-6 md:h-8 md:w-8 text-primary opacity-70 shrink-0" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 md:pt-4 md:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs md:text-sm text-muted-foreground truncate">Valor em Estoque</p>
                  <p className="text-xl md:text-2xl font-bold text-primary truncate">R$ {stockStats.totalValue.toFixed(2)}</p>
                </div>
                <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-green-500 opacity-70 shrink-0" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 md:pt-4 md:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs md:text-sm text-muted-foreground truncate">Vendas Hoje (Pago)</p>
                  <p className="text-xl md:text-2xl font-bold text-green-600 truncate">R$ {stockStats.todayPaidTotal.toFixed(2)}</p>
                </div>
                <ShoppingCart className="h-6 w-6 md:h-8 md:w-8 text-green-500 opacity-70 shrink-0" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 md:pt-4 md:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs md:text-sm text-muted-foreground truncate">Alertas</p>
                  <div className="flex flex-wrap items-center gap-1">
                    {stockStats.outOfStockProducts > 0 && (
                      <Badge variant="destructive" className="text-xs">{stockStats.outOfStockProducts} sem</Badge>
                    )}
                    {stockStats.lowStockProducts > 0 && (
                      <Badge variant="secondary" className="text-xs">{stockStats.lowStockProducts} baixo</Badge>
                    )}
                    {stockStats.outOfStockProducts === 0 && stockStats.lowStockProducts === 0 && (
                      <Badge variant="default" className="text-xs">Tudo OK</Badge>
                    )}
                  </div>
                </div>
                <AlertCircle className="h-6 w-6 md:h-8 md:w-8 text-yellow-500 opacity-70 shrink-0" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="products" className="flex items-center gap-1 text-xs md:text-sm px-2 md:px-3">
              <Package className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Produtos</span>
              <span className="sm:hidden">Prod.</span>
            </TabsTrigger>
            <TabsTrigger value="sales" className="flex items-center gap-1 text-xs md:text-sm px-2 md:px-3">
              <History className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Vendas</span>
              <span className="sm:hidden">Vend.</span>
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="flex items-center gap-1 text-xs md:text-sm px-2 md:px-3">
              <Building2 className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Fornecedores</span>
              <span className="sm:hidden">Forn.</span>
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex items-center gap-1 text-xs md:text-sm px-2 md:px-3">
              <Receipt className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Gastos</span>
              <span className="sm:hidden">Gast.</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={categoryDialogOpen} onOpenChange={(open) => {
                setCategoryDialogOpen(open);
                if (!open) resetCategoryForm();
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Categoria
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingCategory ? "Editar Categoria" : "Nova Categoria"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="categoryName">Nome da Categoria</Label>
                      <Input
                        id="categoryName"
                        value={categoryName}
                        onChange={(e) => setCategoryName(e.target.value)}
                        placeholder="Ex: Roupas, Eletrônicos..."
                      />
                    </div>
                    <Button onClick={handleSaveCategory} className="w-full" disabled={isSaving}>
                      {isSaving ? "Salvando..." : (editingCategory ? "Salvar Alterações" : "Criar Categoria")}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {categories.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma categoria criada</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Crie sua primeira categoria para começar a organizar seu estoque
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Accordion type="multiple" className="space-y-4">
                {categories.map((category) => (
                  <AccordionItem
                    key={category.id}
                    value={category.id}
                    className="border rounded-lg px-4"
                  >
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-5 w-5 text-primary" />
                          <span className="font-medium">{category.name}</span>
                          <span className="text-sm text-muted-foreground">
                            ({getProductsByCategory(category.id).length} produtos)
                          </span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-4 space-y-4">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openAddProduct(category.id)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Adicionar Produto
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditCategory(category)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-1" />
                                Excluir
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. Todos os produtos desta categoria também serão excluídos.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteCategory(category.id)}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>

                        {getProductsByCategory(category.id).length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>Nenhum produto nesta categoria</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {getProductsByCategory(category.id).map((product) => (
                              <Card key={product.id}>
                                <CardHeader className="pb-2">
                                  {product.image_url && (
                                    <img
                                      src={product.image_url}
                                      alt={product.name}
                                      className="w-full h-32 object-cover rounded-md mb-2"
                                    />
                                  )}
                                  <CardTitle className="text-base">{product.name}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <p className="text-lg font-semibold text-primary">
                                      R$ {product.price.toFixed(2)}
                                    </p>
                                    <Badge variant={product.quantity > 0 ? (product.quantity <= 5 ? "secondary" : "default") : "destructive"}>
                                      {product.quantity} un.
                                    </Badge>
                                  </div>
                                  {product.quantity <= 5 && product.quantity > 0 && (
                                    <p className="text-xs text-yellow-600">Estoque baixo</p>
                                  )}
                                  {product.quantity === 0 && (
                                    <p className="text-xs text-destructive">Sem estoque</p>
                                  )}
                                  {product.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                      {product.description}
                                    </p>
                                  )}
                                  <div className="flex flex-wrap gap-1 pt-2">
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={() => openSaleDialog(product)}
                                      disabled={product.quantity === 0}
                                      title={product.quantity === 0 ? "Sem estoque disponível" : "Vender produto"}
                                    >
                                      <ShoppingCart className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => requireAdminPassword(
                                        () => openEditProduct(product),
                                        "editar este produto"
                                      )}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => openMoveProduct(product)}
                                    >
                                      <MoveRight className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button size="sm" variant="ghost" className="text-destructive">
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Esta ação não pode ser desfeita.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => requireAdminPassword(
                                              () => handleDeleteProduct(product.id),
                                              "excluir este produto"
                                            )}
                                            className="bg-destructive text-destructive-foreground"
                                          >
                                            Excluir
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </TabsContent>

          <TabsContent value="sales" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Histórico de Vendas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sales.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma venda registrada ainda</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Produto</TableHead>
                          <TableHead>Qtd</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sales.map((sale) => (
                          <TableRow key={sale.id}>
                            <TableCell className="whitespace-nowrap">
                              {format(new Date(sale.sold_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell>{getProductName(sale.product_id)}</TableCell>
                            <TableCell>{sale.quantity}</TableCell>
                            <TableCell className="font-medium">
                              R$ {sale.total_price.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={sale.payment_status === "paid" ? "default" : "secondary"}>
                                {sale.payment_status === "paid" ? (
                                  <><Check className="h-3 w-3 mr-1" /> Pago</>
                                ) : (
                                  <><Clock className="h-3 w-3 mr-1" /> Pendente</>
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => requireAdminPassword(
                                    () => openEditSaleDialog(sale),
                                    "editar esta venda"
                                  )}
                                  title="Editar venda"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="ghost" className="text-destructive" title="Excluir venda">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Excluir venda?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Esta ação não pode ser desfeita. A venda será removida do histórico.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => requireAdminPassword(
                                          () => handleDeleteSale(sale.id),
                                          "excluir esta venda"
                                        )}
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
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Suppliers Tab */}
          <TabsContent value="suppliers">
            <SuppliersTab companyId={companyId} />
          </TabsContent>

          {/* Expenses Tab */}
          <TabsContent value="expenses">
            <ExpensesTab companyId={companyId} sales={sales} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Product Dialog */}
      <Dialog open={productDialogOpen} onOpenChange={(open) => {
        setProductDialogOpen(open);
        if (!open) resetProductForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Editar Produto" : "Novo Produto"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="productName">Nome do Produto</Label>
              <Input
                id="productName"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Ex: Camiseta, Vinho..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="productPrice">Valor (R$)</Label>
                <Input
                  id="productPrice"
                  type="number"
                  step="0.01"
                  value={productPrice}
                  onChange={(e) => setProductPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="productQuantity">Quantidade em Estoque</Label>
                <Input
                  id="productQuantity"
                  type="number"
                  min="0"
                  value={productQuantity}
                  onChange={(e) => setProductQuantity(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="productDescription">Descrição</Label>
              <Textarea
                id="productDescription"
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                placeholder="Descrição do produto..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="productCategory">Categoria</Label>
              <Select value={productCategoryId} onValueChange={setProductCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent className="z-[100] bg-background border">
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="productImage">Imagem</Label>
              <Input
                id="productImage"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploadingImage}
              />
              {productImageUrl && (
                <img
                  src={productImageUrl}
                  alt="Preview"
                  className="mt-2 w-full h-32 object-cover rounded-md"
                />
              )}
            </div>

            <Button onClick={handleSaveProduct} className="w-full" disabled={uploadingImage || isSaving}>
              {isSaving ? "Salvando..." : (editingProduct ? "Salvar Alterações" : "Criar Produto")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Move Product Dialog */}
      <Dialog 
        open={moveDialogOpen} 
        onOpenChange={(open) => {
          setMoveDialogOpen(open);
          if (!open) {
            setMovingProduct(null);
            setTargetCategoryId("");
          }
        }}
      >
        <DialogContent className="z-50" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Mover Produto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Mover "{movingProduct?.name}" para:
            </p>
            <Select 
              value={targetCategoryId} 
              onValueChange={setTargetCategoryId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione a categoria destino" />
              </SelectTrigger>
              <SelectContent className="z-[100] bg-background border">
                {categories
                  .filter((cat) => cat.id !== movingProduct?.category_id)
                  .map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setMoveDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleMoveProduct} 
                className="flex-1" 
                disabled={!targetCategoryId}
              >
                Mover Produto
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sale Dialog */}
      <Dialog open={saleDialogOpen} onOpenChange={setSaleDialogOpen}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Registrar Venda
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {sellingProduct && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{sellingProduct.name}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-primary font-semibold">R$ {sellingProduct.price.toFixed(2)}</p>
                  <Badge variant={sellingProduct.quantity > 0 ? "default" : "destructive"}>
                    {sellingProduct.quantity} un. disponíveis
                  </Badge>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="saleQuantity">Quantidade</Label>
              <Input
                id="saleQuantity"
                type="number"
                min="1"
                max={sellingProduct?.quantity || 1}
                value={saleQuantity}
                onChange={(e) => setSaleQuantity(e.target.value)}
              />
              {sellingProduct && parseInt(saleQuantity) > sellingProduct.quantity && (
                <p className="text-xs text-destructive mt-1">
                  Quantidade maior que o estoque disponível ({sellingProduct.quantity})
                </p>
              )}
            </div>

            <div>
              <Label>Status do Pagamento</Label>
              <Select value={salePaymentStatus} onValueChange={setSalePaymentStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[100] bg-background border">
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Forma de Pagamento</Label>
              <Select value={salePaymentMethod} onValueChange={setSalePaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="z-[100] bg-background border">
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                  <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="saleNotes">Observações</Label>
              <Textarea
                id="saleNotes"
                value={saleNotes}
                onChange={(e) => setSaleNotes(e.target.value)}
                placeholder="Observações sobre a venda..."
                rows={2}
              />
            </div>

            {sellingProduct && (
              <div className="p-3 bg-primary/10 rounded-lg">
                <p className="text-sm text-muted-foreground">Total da venda:</p>
                <p className="text-xl font-bold text-primary">
                  R$ {(sellingProduct.price * (parseInt(saleQuantity) || 1)).toFixed(2)}
                </p>
              </div>
            )}

            <Button 
              onClick={handleSaveSale} 
              className="w-full"
              disabled={!sellingProduct || sellingProduct.quantity === 0 || parseInt(saleQuantity) > sellingProduct.quantity || isSaving}
            >
              {isSaving ? "Processando..." : "Confirmar Venda"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Sale Dialog */}
      <Dialog open={editSaleDialogOpen} onOpenChange={(open) => {
        setEditSaleDialogOpen(open);
        if (!open) setEditingSale(null);
      }}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Editar Venda
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {editingSale && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{getProductName(editingSale.product_id)}</p>
                <p className="text-sm text-muted-foreground">
                  Preço unitário: R$ {editingSale.unit_price.toFixed(2)}
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="editSaleQuantity">Quantidade</Label>
              <Input
                id="editSaleQuantity"
                type="number"
                min="1"
                value={editSaleQuantity}
                onChange={(e) => setEditSaleQuantity(e.target.value)}
              />
            </div>

            <div>
              <Label>Status do Pagamento</Label>
              <Select value={editSalePaymentStatus} onValueChange={setEditSalePaymentStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[100] bg-background border">
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Forma de Pagamento</Label>
              <Select value={editSalePaymentMethod} onValueChange={setEditSalePaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="z-[100] bg-background border">
                  <SelectItem value="none">Não informado</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                  <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="editSaleNotes">Observações</Label>
              <Textarea
                id="editSaleNotes"
                value={editSaleNotes}
                onChange={(e) => setEditSaleNotes(e.target.value)}
                placeholder="Observações sobre a venda..."
                rows={2}
              />
            </div>

            {editingSale && (
              <div className="p-3 bg-primary/10 rounded-lg">
                <p className="text-sm text-muted-foreground">Total da venda:</p>
                <p className="text-xl font-bold text-primary">
                  R$ {(editingSale.unit_price * (parseInt(editSaleQuantity) || 1)).toFixed(2)}
                </p>
              </div>
            )}

            <Button onClick={handleUpdateSale} className="w-full" disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin Password Modal */}
      {companyId && (
        <AdminPasswordModal
          open={adminPasswordModalOpen}
          onOpenChange={setAdminPasswordModalOpen}
          companyId={companyId}
          onSuccess={handleAdminPasswordSuccess}
          actionDescription={pendingActionDescription}
        />
      )}
    </DashboardLayout>
  );
};

export default Estoque;
