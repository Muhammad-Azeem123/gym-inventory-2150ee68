import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ShoppingCart, Download, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  category: string;
  quantity: number;
  price_per_unit: number;
}

export const NewSale = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    category: "all",
    productId: "",
    quantity: 0,
    customerName: "",
    customerPhone: "",
    discountedPrice: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch products on component mount
  useEffect(() => {
    fetchProducts();
  }, []);

  // Filter products when category changes
  useEffect(() => {
    if (formData.category === "all") {
      setFilteredProducts(products);
    } else {
      setFilteredProducts(products.filter(p => p.category === formData.category));
    }
    // Reset selected product when category changes
    setFormData(prev => ({ ...prev, productId: "" }));
    setSelectedProduct(null);
  }, [formData.category, products]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .gt('quantity', 0) // Only show products with stock
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch products",
        variant: "destructive"
      });
      console.error('Error fetching products:', error);
    }
  };

  const handleProductSelect = (productId: string) => {
    const product = filteredProducts.find(p => p.id === productId);
    setSelectedProduct(product || null);
    setFormData(prev => ({ ...prev, productId }));
  };

  const actualPrice = selectedProduct?.price_per_unit || 0;
  const discountedPrice = formData.discountedPrice || actualPrice;
  const totalAmount = formData.quantity * discountedPrice;

  // Auto-fill discounted price with actual price when product changes
  useEffect(() => {
    if (selectedProduct && !formData.discountedPrice) {
      setFormData(prev => ({ ...prev, discountedPrice: selectedProduct.price_per_unit }));
    }
  }, [selectedProduct]);

  const generateInvoicePDF = () => {
    if (!selectedProduct) return;
    
    const invoiceData = {
      invoiceNumber: `INV-${Date.now()}`,
      date: new Date().toLocaleDateString(),
      productName: selectedProduct.name,
      category: selectedProduct.category,
      quantity: formData.quantity,
      actualPrice: actualPrice,
      discountedPrice: discountedPrice,
      totalAmount: totalAmount,
      customerName: formData.customerName || "Customer"
    };

    const invoiceContent = `
FITSTOCK MANAGER - INVOICE
=========================

Invoice Number: ${invoiceData.invoiceNumber}
Date: ${invoiceData.date}
Customer: ${invoiceData.customerName}

ITEM DETAILS:
Product: ${invoiceData.productName}
Category: ${invoiceData.category}
Quantity: ${invoiceData.quantity}

PRICING:
Actual Price per Unit: Rs. ${invoiceData.actualPrice.toFixed(2)}
Discounted Price per Unit: Rs. ${invoiceData.discountedPrice.toFixed(2)}
${invoiceData.actualPrice !== invoiceData.discountedPrice ? `Discount: Rs. ${(invoiceData.actualPrice - invoiceData.discountedPrice).toFixed(2)} per unit` : ''}

TOTAL AMOUNT: Rs. ${invoiceData.totalAmount.toFixed(2)}

Thank you for choosing FitStock Manager!
    `;

    const blob = new Blob([invoiceContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${invoiceData.invoiceNumber}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Invoice Downloaded",
      description: `Invoice ${invoiceData.invoiceNumber} downloaded as PDF`
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProduct || formData.quantity <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please select a product and enter a valid quantity.",
        variant: "destructive"
      });
      return;
    }

    if (formData.quantity > selectedProduct.quantity) {
      toast({
        title: "Insufficient Stock",
        description: `Only ${selectedProduct.quantity} units available in stock.`,
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('sales')
        .insert({
          product_id: selectedProduct.id,
          product_name: selectedProduct.name,
          category: selectedProduct.category,
          quantity: formData.quantity,
          price_per_unit: discountedPrice,
          total_amount: totalAmount,
          customer_name: formData.customerName || null,
          customer_phone: formData.customerPhone || null
        });

      if (error) throw error;

      toast({
        title: "Sale Completed",
        description: `Successfully sold ${formData.quantity} units of ${selectedProduct.name}`,
      });

      // Reset form
      setFormData({
        category: "all",
        productId: "",
        quantity: 0,
        customerName: "",
        customerPhone: "",
        discountedPrice: 0
      });
      setSelectedProduct(null);

      // Navigate back after a short delay
      setTimeout(() => navigate("/"), 1500);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete sale. Please try again.",
        variant: "destructive"
      });
      console.error('Error completing sale:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              New Sale
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Category Filter */}
              <div>
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {Array.from(new Set(products.map(p => p.category))).map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Product Selection */}
              <div>
                <Label htmlFor="product">Select Product</Label>
                <Select 
                  value={formData.productId} 
                  onValueChange={handleProductSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredProducts.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} (Stock: {product.quantity}) - Rs. {product.price_per_unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity */}
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max={selectedProduct?.quantity || 1}
                  value={formData.quantity || ""}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                  disabled={!selectedProduct}
                  required
                />
                {selectedProduct && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Available stock: {selectedProduct.quantity} units
                  </p>
                )}
              </div>

              {/* Pricing */}
              {selectedProduct && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="actualPrice">Actual Price (Rs.)</Label>
                    <Input
                      id="actualPrice"
                      type="number"
                      value={actualPrice.toFixed(2)}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div>
                    <Label htmlFor="discountedPrice">Discounted Price (Rs.)</Label>
                    <Input
                      id="discountedPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.discountedPrice || ""}
                      onChange={(e) => setFormData({ ...formData, discountedPrice: parseFloat(e.target.value) || 0 })}
                      placeholder={`Default: ${actualPrice.toFixed(2)}`}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Leave empty to use actual price
                    </p>
                  </div>
                </div>
              )}

              {/* Customer Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerName">Customer Name (Optional)</Label>
                  <Input
                    id="customerName"
                    placeholder="Customer name"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="customerPhone">Phone (Optional)</Label>
                  <Input
                    id="customerPhone"
                    placeholder="Phone number"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  />
                </div>
              </div>

              {/* Total Amount Display */}
              <div className="bg-muted p-4 rounded-lg">
                <div className="space-y-2">
                  {selectedProduct && actualPrice !== discountedPrice && (
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span>Actual Total: Rs. {(formData.quantity * actualPrice).toFixed(2)}</span>
                      <span>Discount: Rs. {((actualPrice - discountedPrice) * formData.quantity).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium">Total Amount:</span>
                    <span className="text-2xl font-bold text-primary">Rs. {totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Invoice Actions */}
              {selectedProduct && formData.quantity > 0 && (
                <div className="bg-primary/5 p-4 rounded-lg space-y-3">
                  <h3 className="font-medium text-primary">Invoice Options (Optional)</h3>
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={generateInvoicePDF}
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Generate & Download Invoice
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    You can complete the sale without generating an invoice
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={isSubmitting || !selectedProduct || formData.quantity <= 0}
                >
                  {isSubmitting ? "Processing..." : "Complete Sale"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate("/")}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};