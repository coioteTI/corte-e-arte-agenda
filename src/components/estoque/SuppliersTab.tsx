import { useState, useEffect, useCallback } from "react";
import { Plus, Edit, Trash2, Package, TrendingUp, TrendingDown, Minus, Building2, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  company_id: string;
}

interface SupplierProduct {
  id: string;
  supplier_id: string;
  product_id: string | null;
  name: string;
  purchase_price: number;
  sale_price: number;
  quantity: number;
  notes: string | null;
  company_id: string;
}

interface StockProduct {
  id: string;
  name: string;
}

interface SuppliersTabProps {
  companyId: string | null;
}

// Calculate profit margin percentage
const calculateMargin = (purchasePrice: number, salePrice: number): number => {
  if (purchasePrice <= 0) return 0;
  return ((salePrice - purchasePrice) / purchasePrice) * 100;
};

// Get margin badge variant and text
const getMarginBadge = (margin: number): { variant: "default" | "secondary" | "destructive"; text: string; icon: React.ReactNode } => {
  if (margin >= 50) {
    return { variant: "default", text: "Margem Boa", icon: <TrendingUp className="h-3 w-3" /> };
  } else if (margin >= 20) {
    return { variant: "secondary", text: "Margem Média", icon: <Minus className="h-3 w-3" /> };
  } else {
    return { variant: "destructive", text: "Margem Ruim", icon: <TrendingDown className="h-3 w-3" /> };
  }
};

const SuppliersTab = ({ companyId }: SuppliersTabProps) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierProducts, setSupplierProducts] = useState<SupplierProduct[]>([]);
  const [stockProducts, setStockProducts] = useState<StockProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Supplier form state
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [supplierAddress, setSupplierAddress] = useState("");
  const [supplierNotes, setSupplierNotes] = useState("");

  // Product form state
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<SupplierProduct | null>(null);
  const [productSupplierId, setProductSupplierId] = useState("");
  const [productName, setProductName] = useState("");
  const [productPurchasePrice, setProductPurchasePrice] = useState("");
  const [productSalePrice, setProductSalePrice] = useState("");
  const [productQuantity, setProductQuantity] = useState("0");
  const [productNotes, setProductNotes] = useState("");
  const [linkedStockProductId, setLinkedStockProductId] = useState("");

  const loadData = useCallback(async () => {
    if (!companyId) return;
    
    try {
      const [suppliersRes, productsRes, stockRes] = await Promise.all([
        supabase.from("suppliers").select("*").eq("company_id", companyId).order("name"),
        supabase.from("supplier_products").select("*").eq("company_id", companyId).order("name"),
        supabase.from("stock_products").select("id, name").eq("company_id", companyId).order("name"),
      ]);

      if (suppliersRes.data) setSuppliers(suppliersRes.data);
      if (productsRes.data) setSupplierProducts(productsRes.data);
      if (stockRes.data) setStockProducts(stockRes.data);
    } catch (error) {
      console.error("Error loading suppliers:", error);
      toast.error("Erro ao carregar fornecedores");
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
      .channel('suppliers-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'suppliers', filter: `company_id=eq.${companyId}` },
        () => loadData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'supplier_products', filter: `company_id=eq.${companyId}` },
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, loadData]);

  const resetSupplierForm = () => {
    setEditingSupplier(null);
    setSupplierName("");
    setSupplierPhone("");
    setSupplierEmail("");
    setSupplierAddress("");
    setSupplierNotes("");
  };

  const resetProductForm = () => {
    setEditingProduct(null);
    setProductSupplierId("");
    setProductName("");
    setProductPurchasePrice("");
    setProductSalePrice("");
    setProductQuantity("0");
    setProductNotes("");
    setLinkedStockProductId("");
  };

  const handleSaveSupplier = async () => {
    if (!supplierName.trim() || !companyId || isSaving) return;

    setIsSaving(true);
    try {
      const data = {
        name: supplierName.trim(),
        phone: supplierPhone.trim() || null,
        email: supplierEmail.trim() || null,
        address: supplierAddress.trim() || null,
        notes: supplierNotes.trim() || null,
        company_id: companyId,
      };

      if (editingSupplier) {
        const { error } = await supabase
          .from("suppliers")
          .update(data)
          .eq("id", editingSupplier.id);
        if (error) throw error;
        toast.success("Fornecedor atualizado!");
      } else {
        const { error } = await supabase
          .from("suppliers")
          .insert(data);
        if (error) throw error;
        toast.success("Fornecedor cadastrado!");
      }

      setSupplierDialogOpen(false);
      resetSupplierForm();
    } catch (error) {
      console.error("Error saving supplier:", error);
      toast.error("Erro ao salvar fornecedor");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    try {
      const { error } = await supabase.from("suppliers").delete().eq("id", id);
      if (error) throw error;
      toast.success("Fornecedor excluído!");
    } catch (error) {
      console.error("Error deleting supplier:", error);
      toast.error("Erro ao excluir fornecedor");
    }
  };

  const openEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setSupplierName(supplier.name);
    setSupplierPhone(supplier.phone || "");
    setSupplierEmail(supplier.email || "");
    setSupplierAddress(supplier.address || "");
    setSupplierNotes(supplier.notes || "");
    setSupplierDialogOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!productName.trim() || !productSupplierId || !companyId || isSaving) return;

    setIsSaving(true);
    try {
      const data = {
        name: productName.trim(),
        supplier_id: productSupplierId,
        product_id: linkedStockProductId || null,
        purchase_price: parseFloat(productPurchasePrice) || 0,
        sale_price: parseFloat(productSalePrice) || 0,
        quantity: parseInt(productQuantity) || 0,
        notes: productNotes.trim() || null,
        company_id: companyId,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from("supplier_products")
          .update(data)
          .eq("id", editingProduct.id);
        if (error) throw error;
        toast.success("Produto atualizado!");
      } else {
        const { error } = await supabase
          .from("supplier_products")
          .insert(data);
        if (error) throw error;
        toast.success("Produto cadastrado!");
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

  const handleDeleteProduct = async (id: string) => {
    try {
      const { error } = await supabase.from("supplier_products").delete().eq("id", id);
      if (error) throw error;
      toast.success("Produto excluído!");
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Erro ao excluir produto");
    }
  };

  const openAddProduct = (supplierId: string) => {
    resetProductForm();
    setProductSupplierId(supplierId);
    setProductDialogOpen(true);
  };

  const openEditProduct = (product: SupplierProduct) => {
    setEditingProduct(product);
    setProductSupplierId(product.supplier_id);
    setProductName(product.name);
    setProductPurchasePrice(product.purchase_price.toString());
    setProductSalePrice(product.sale_price.toString());
    setProductQuantity(product.quantity.toString());
    setProductNotes(product.notes || "");
    setLinkedStockProductId(product.product_id || "");
    setProductDialogOpen(true);
  };

  const getProductsBySupplier = (supplierId: string) => {
    return supplierProducts.filter(p => p.supplier_id === supplierId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={supplierDialogOpen} onOpenChange={(open) => {
          setSupplierDialogOpen(open);
          if (!open) resetSupplierForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Fornecedor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingSupplier ? "Editar Fornecedor" : "Novo Fornecedor"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="supplierName">Nome *</Label>
                <Input
                  id="supplierName"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="Nome do fornecedor"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="supplierPhone">Telefone</Label>
                  <Input
                    id="supplierPhone"
                    value={supplierPhone}
                    onChange={(e) => setSupplierPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <Label htmlFor="supplierEmail">Email</Label>
                  <Input
                    id="supplierEmail"
                    type="email"
                    value={supplierEmail}
                    onChange={(e) => setSupplierEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="supplierAddress">Endereço</Label>
                <Input
                  id="supplierAddress"
                  value={supplierAddress}
                  onChange={(e) => setSupplierAddress(e.target.value)}
                  placeholder="Endereço completo"
                />
              </div>
              <div>
                <Label htmlFor="supplierNotes">Observações</Label>
                <Textarea
                  id="supplierNotes"
                  value={supplierNotes}
                  onChange={(e) => setSupplierNotes(e.target.value)}
                  placeholder="Notas sobre o fornecedor..."
                  rows={2}
                />
              </div>
              <Button onClick={handleSaveSupplier} className="w-full" disabled={isSaving || !supplierName.trim()}>
                {isSaving ? "Salvando..." : (editingSupplier ? "Salvar Alterações" : "Cadastrar Fornecedor")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {suppliers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum fornecedor cadastrado</h3>
            <p className="text-muted-foreground text-center mb-4">
              Cadastre seu primeiro fornecedor para começar a controlar suas compras
            </p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-4">
          {suppliers.map((supplier) => {
            const products = getProductsBySupplier(supplier.id);
            const totalPurchaseValue = products.reduce((sum, p) => sum + (p.purchase_price * p.quantity), 0);
            const totalSaleValue = products.reduce((sum, p) => sum + (p.sale_price * p.quantity), 0);
            const avgMargin = products.length > 0 
              ? products.reduce((sum, p) => sum + calculateMargin(p.purchase_price, p.sale_price), 0) / products.length
              : 0;

            return (
              <AccordionItem
                key={supplier.id}
                value={supplier.id}
                className="border rounded-lg px-4"
              >
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-primary" />
                      <div className="text-left">
                        <span className="font-medium">{supplier.name}</span>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {supplier.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {supplier.phone}
                            </span>
                          )}
                          {supplier.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {supplier.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{products.length} produtos</Badge>
                      {products.length > 0 && (
                        <Badge {...getMarginBadge(avgMargin)} className="flex items-center gap-1">
                          {getMarginBadge(avgMargin).icon}
                          {avgMargin.toFixed(0)}%
                        </Badge>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pt-4 space-y-4">
                    {/* Supplier summary */}
                    {products.length > 0 && (
                      <div className="grid grid-cols-3 gap-4 p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="text-xs text-muted-foreground">Valor de Compra</p>
                          <p className="font-semibold text-destructive">R$ {totalPurchaseValue.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Valor de Venda</p>
                          <p className="font-semibold text-green-600">R$ {totalSaleValue.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Lucro Potencial</p>
                          <p className="font-semibold text-primary">R$ {(totalSaleValue - totalPurchaseValue).toFixed(2)}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openAddProduct(supplier.id)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar Produto
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditSupplier(supplier)}
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
                            <AlertDialogTitle>Excluir fornecedor?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. Todos os produtos deste fornecedor também serão excluídos.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteSupplier(supplier.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>

                    {products.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Nenhum produto cadastrado para este fornecedor</p>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {products.map((product) => {
                          const margin = calculateMargin(product.purchase_price, product.sale_price);
                          const marginBadge = getMarginBadge(margin);

                          return (
                            <Card key={product.id} className="overflow-hidden">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <h4 className="font-medium">{product.name}</h4>
                                      <Badge variant={marginBadge.variant} className="flex items-center gap-1">
                                        {marginBadge.icon}
                                        {margin.toFixed(0)}% {marginBadge.text}
                                      </Badge>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                      <div>
                                        <p className="text-muted-foreground">Compra</p>
                                        <p className="font-medium text-destructive">R$ {product.purchase_price.toFixed(2)}</p>
                                      </div>
                                      <div>
                                        <p className="text-muted-foreground">Venda</p>
                                        <p className="font-medium text-green-600">R$ {product.sale_price.toFixed(2)}</p>
                                      </div>
                                      <div>
                                        <p className="text-muted-foreground">Lucro Unit.</p>
                                        <p className="font-medium text-primary">R$ {(product.sale_price - product.purchase_price).toFixed(2)}</p>
                                      </div>
                                      <div>
                                        <p className="text-muted-foreground">Qtd. no Fornecedor</p>
                                        <p className="font-medium">{product.quantity}</p>
                                      </div>
                                    </div>
                                    {product.notes && (
                                      <p className="text-xs text-muted-foreground mt-2">{product.notes}</p>
                                    )}
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => openEditProduct(product)}
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
                                          <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Esta ação não pode ser desfeita.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => handleDeleteProduct(product.id)}
                                            className="bg-destructive text-destructive-foreground"
                                          >
                                            Excluir
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* Product Dialog */}
      <Dialog open={productDialogOpen} onOpenChange={(open) => {
        setProductDialogOpen(open);
        if (!open) resetProductForm();
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Editar Produto" : "Novo Produto do Fornecedor"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="productName">Nome do Produto *</Label>
              <Input
                id="productName"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Nome do produto"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="productPurchasePrice">Preço de Compra *</Label>
                <Input
                  id="productPurchasePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={productPurchasePrice}
                  onChange={(e) => setProductPurchasePrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="productSalePrice">Preço de Venda *</Label>
                <Input
                  id="productSalePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={productSalePrice}
                  onChange={(e) => setProductSalePrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Margin preview */}
            {parseFloat(productPurchasePrice) > 0 && parseFloat(productSalePrice) > 0 && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Margem de Lucro:</span>
                  {(() => {
                    const margin = calculateMargin(parseFloat(productPurchasePrice), parseFloat(productSalePrice));
                    const badge = getMarginBadge(margin);
                    return (
                      <Badge variant={badge.variant} className="flex items-center gap-1">
                        {badge.icon}
                        {margin.toFixed(1)}% - {badge.text}
                      </Badge>
                    );
                  })()}
                </div>
                <p className="text-sm mt-1">
                  Lucro unitário: <span className="font-medium text-primary">
                    R$ {(parseFloat(productSalePrice) - parseFloat(productPurchasePrice)).toFixed(2)}
                  </span>
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="productQuantity">Quantidade no Fornecedor</Label>
              <Input
                id="productQuantity"
                type="number"
                min="0"
                value={productQuantity}
                onChange={(e) => setProductQuantity(e.target.value)}
                placeholder="0"
              />
            </div>

            <div>
              <Label>Vincular a Produto do Estoque (Opcional)</Label>
              <Select value={linkedStockProductId} onValueChange={setLinkedStockProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar produto do estoque" />
                </SelectTrigger>
                <SelectContent className="z-[100] bg-background border">
                  <SelectItem value="none">Nenhum</SelectItem>
                  {stockProducts.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Vincule este produto ao seu estoque para facilitar o controle
              </p>
            </div>

            <div>
              <Label htmlFor="productNotes">Observações</Label>
              <Textarea
                id="productNotes"
                value={productNotes}
                onChange={(e) => setProductNotes(e.target.value)}
                placeholder="Notas sobre o produto..."
                rows={2}
              />
            </div>

            <Button 
              onClick={handleSaveProduct} 
              className="w-full" 
              disabled={isSaving || !productName.trim()}
            >
              {isSaving ? "Salvando..." : (editingProduct ? "Salvar Alterações" : "Cadastrar Produto")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuppliersTab;
