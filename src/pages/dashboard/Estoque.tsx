import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, MoveRight, Package, FolderOpen } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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

interface Category {
  id: string;
  name: string;
  company_id: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  description: string | null;
  image_url: string | null;
  category_id: string;
  company_id: string;
}

const Estoque = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Category form state
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState("");

  // Product form state
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productImageUrl, setProductImageUrl] = useState("");
  const [productCategoryId, setProductCategoryId] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  // Move product state
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [movingProduct, setMovingProduct] = useState<Product | null>(null);
  const [targetCategoryId, setTargetCategoryId] = useState("");

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
        .single();

      if (!company) return;
      setCompanyId(company.id);

      const [categoriesRes, productsRes] = await Promise.all([
        supabase.from("stock_categories").select("*").eq("company_id", company.id).order("name"),
        supabase.from("stock_products").select("*").eq("company_id", company.id).order("name"),
      ]);

      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (productsRes.data) setProducts(productsRes.data);
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
    setProductDescription("");
    setProductImageUrl("");
    setProductCategoryId("");
  };

  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductName(product.name);
    setProductPrice(product.price.toString());
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

  const getProductsByCategory = (categoryId: string) => {
    return products.filter((p) => p.category_id === categoryId);
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
            <p className="text-muted-foreground">Gerencie seus produtos por categoria</p>
          </div>

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
                              <p className="text-lg font-semibold text-primary">
                                R$ {product.price.toFixed(2)}
                              </p>
                              {product.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {product.description}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-1 pt-2">
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
                <SelectContent>
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
    </DashboardLayout>
  );
};

export default Estoque;
