import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, MoveRight, Package, FolderOpen, ShoppingCart, History, Check, Clock } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("products");

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
  const [saleClientId, setSaleClientId] = useState("");
  const [saleClientName, setSaleClientName] = useState("");
  const [saleQuantity, setSaleQuantity] = useState("1");
  const [salePaymentStatus, setSalePaymentStatus] = useState("pending");
  const [salePaymentMethod, setSalePaymentMethod] = useState("");
  const [saleNotes, setSaleNotes] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: company } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!company) return;
      setCompanyId(company.id);

      const [categoriesRes, productsRes, clientsRes, salesRes] = await Promise.all([
        supabase.from("stock_categories").select("*").eq("company_id", company.id).order("name"),
        supabase.from("stock_products").select("*").eq("company_id", company.id).order("name"),
        supabase.from("clients").select("id, name, phone").order("name"),
        supabase.from("stock_sales").select("*").eq("company_id", company.id).order("sold_at", { ascending: false }).limit(100),
      ]);

      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (productsRes.data) setProducts(productsRes.data);
      if (clientsRes.data) setClients(clientsRes.data);
      if (salesRes.data) setSales(salesRes.data);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  // Category CRUD
  const handleSaveCategory = async () => {
    if (!categoryName.trim() || !companyId) return;

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
      loadData();
    } catch (error) {
      console.error("Error saving category:", error);
      toast.error("Erro ao salvar categoria");
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

    try {
      const productData = {
        name: productName.trim(),
        price: parseFloat(productPrice) || 0,
        quantity: parseInt(productQuantity) || 0,
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
        toast.success("Produto atualizado");
      } else {
        const { error } = await supabase
          .from("stock_products")
          .insert(productData);

        if (error) throw error;
        toast.success("Produto criado");
      }

      setProductDialogOpen(false);
      resetProductForm();
      loadData();
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Erro ao salvar produto");
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
    setSaleClientId("");
    setSaleClientName("");
    setSaleQuantity("1");
    setSalePaymentStatus("pending");
    setSalePaymentMethod("");
    setSaleNotes("");
    setSaleDialogOpen(true);
  };

  const handleClientSelect = (clientId: string) => {
    setSaleClientId(clientId);
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setSaleClientName(client.name);
    }
  };

  const handleSaveSale = async () => {
    if (!sellingProduct || !saleClientName.trim() || !companyId) {
      toast.error("Preencha o nome do cliente");
      return;
    }

    const quantity = parseInt(saleQuantity) || 1;
    
    // Verificar se há estoque suficiente
    if (quantity > sellingProduct.quantity) {
      toast.error(`Estoque insuficiente! Disponível: ${sellingProduct.quantity} unidades`);
      return;
    }
    
    const totalPrice = sellingProduct.price * quantity;

    try {
      const { error } = await supabase.from("stock_sales").insert({
        company_id: companyId,
        product_id: sellingProduct.id,
        client_id: saleClientId || null,
        client_name: saleClientName.trim(),
        quantity,
        unit_price: sellingProduct.price,
        total_price: totalPrice,
        payment_status: salePaymentStatus,
        payment_method: salePaymentMethod || null,
        notes: saleNotes.trim() || null,
      });

      if (error) throw error;
      toast.success("Venda registrada com sucesso!");
      setSaleDialogOpen(false);
      loadData();
    } catch (error) {
      console.error("Error saving sale:", error);
      toast.error("Erro ao registrar venda");
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

  const getProductsByCategory = (categoryId: string) => {
    return products.filter((p) => p.category_id === categoryId);
  };

  const getProductName = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product?.name || "Produto removido";
  };

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

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Produtos
            </TabsTrigger>
            <TabsTrigger value="sales" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Vendas
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
                    <Button onClick={handleSaveCategory} className="w-full">
                      {editingCategory ? "Salvar Alterações" : "Criar Categoria"}
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
                                      onClick={() => openEditProduct(product)}
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
                                            onClick={() => handleDeleteProduct(product.id)}
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
                          <TableHead>Cliente</TableHead>
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
                            <TableCell>{sale.client_name}</TableCell>
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
                              {sale.payment_status === "pending" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdatePaymentStatus(sale.id, "paid")}
                                >
                                  Marcar como pago
                                </Button>
                              )}
                              {sale.payment_status === "paid" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleUpdatePaymentStatus(sale.id, "pending")}
                                >
                                  Marcar pendente
                                </Button>
                              )}
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

            <Button onClick={handleSaveProduct} className="w-full" disabled={uploadingImage}>
              {editingProduct ? "Salvar Alterações" : "Criar Produto"}
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
        <DialogContent className="z-50">
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
        <DialogContent>
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
              <Label>Cliente cadastrado (opcional)</Label>
              <Select value={saleClientId} onValueChange={handleClientSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent className="z-[100] bg-background border">
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="saleClientName">Nome do Cliente *</Label>
              <Input
                id="saleClientName"
                value={saleClientName}
                onChange={(e) => setSaleClientName(e.target.value)}
                placeholder="Digite o nome do cliente"
              />
            </div>

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
              disabled={!sellingProduct || sellingProduct.quantity === 0 || parseInt(saleQuantity) > sellingProduct.quantity}
            >
              Confirmar Venda
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Estoque;
