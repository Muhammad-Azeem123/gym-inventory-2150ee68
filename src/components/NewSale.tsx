import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ShoppingCart, Download, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCategories } from "@/hooks/useCategories";
import jsPDF from 'jspdf';
import { z } from "zod";

const customerSchema = z.object({
  customerName: z.string().optional(),
  customerPhone: z.string().optional()
});

interface Product {
  id: string;
  name: string;
  category: string;
  quantity: number;
  price_per_unit: number;
}

interface CartItem {
  id: string;
  product_id: string;
  product_name: string;
  category: string;
  quantity: number;
  price_per_unit: number;
  discounted_price: number;
  total_amount: number;
  available_stock: number;
}

export const NewSale = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const { categories } = useCategories();
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
    setFormData(prev => ({ ...prev, productId, discountedPrice: product?.price_per_unit || 0 }));
  };

  const addToCart = () => {
    if (!selectedProduct || formData.quantity <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please select a product and enter a valid quantity.",
        variant: "destructive"
      });
      return;
    }

    // Check if product already exists in cart
    const existingItemIndex = cartItems.findIndex(item => item.product_id === selectedProduct.id);
    const existingQuantity = existingItemIndex >= 0 ? cartItems[existingItemIndex].quantity : 0;
    const totalRequestedQuantity = existingQuantity + formData.quantity;

    if (totalRequestedQuantity > selectedProduct.quantity) {
      toast({
        title: "Insufficient Stock",
        description: `Only ${selectedProduct.quantity} units available in stock. You already have ${existingQuantity} in cart.`,
        variant: "destructive"
      });
      return;
    }

    const discountedPrice = formData.discountedPrice || selectedProduct.price_per_unit;
    const newItem: CartItem = {
      id: Date.now().toString(),
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      category: selectedProduct.category,
      quantity: formData.quantity,
      price_per_unit: selectedProduct.price_per_unit,
      discounted_price: discountedPrice,
      total_amount: formData.quantity * discountedPrice,
      available_stock: selectedProduct.quantity
    };

    if (existingItemIndex >= 0) {
      // Update existing item
      const updatedItems = [...cartItems];
      updatedItems[existingItemIndex] = {
        ...updatedItems[existingItemIndex],
        quantity: totalRequestedQuantity,
        total_amount: totalRequestedQuantity * discountedPrice
      };
      setCartItems(updatedItems);
    } else {
      // Add new item
      setCartItems([...cartItems, newItem]);
    }

    // Reset form
    setFormData(prev => ({ ...prev, productId: "", quantity: 0, discountedPrice: 0 }));
    setSelectedProduct(null);

    toast({
      title: "Item Added",
      description: `Added ${formData.quantity} units of ${selectedProduct.name} to cart`,
    });
  };

  const removeFromCart = (itemId: string) => {
    setCartItems(cartItems.filter(item => item.id !== itemId));
    toast({
      title: "Item Removed",
      description: "Item removed from cart",
    });
  };

  const actualPrice = selectedProduct?.price_per_unit || 0;
  const discountedPrice = formData.discountedPrice || actualPrice;
  const cartTotal = cartItems.reduce((sum, item) => sum + item.total_amount, 0);

  // Auto-fill discounted price with actual price when product changes
  useEffect(() => {
    if (selectedProduct && !formData.discountedPrice) {
      setFormData(prev => ({ ...prev, discountedPrice: selectedProduct.price_per_unit }));
    }
  }, [selectedProduct]);

  const generateInvoicePDF = () => {
    if (cartItems.length === 0) return;
    
    const invoiceData = {
      invoiceNumber: `INV-${Date.now()}`,
      date: new Date().toLocaleDateString(),
      customerName: formData.customerName || "Customer",
      items: cartItems,
      totalAmount: cartTotal
    };

    // Create PDF using jsPDF
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('FITSTOCK MANAGER', 20, 30);
    doc.setFontSize(16);
    doc.text('INVOICE', 20, 45);
    
    // Invoice details
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(`Invoice Number: ${invoiceData.invoiceNumber}`, 20, 65);
    doc.text(`Date: ${invoiceData.date}`, 20, 75);
    doc.text(`Customer: ${invoiceData.customerName}`, 20, 85);
    
    // Items header
    doc.setFont(undefined, 'bold');
    doc.text('ITEMS:', 20, 105);
    
    // Items details
    let yPosition = 115;
    doc.setFont(undefined, 'normal');
    
    cartItems.forEach((item, index) => {
      doc.text(`${index + 1}. ${item.product_name}`, 20, yPosition);
      doc.text(`   Category: ${item.category}`, 20, yPosition + 8);
      doc.text(`   Quantity: ${item.quantity} x Rs. ${item.discounted_price.toFixed(2)}`, 20, yPosition + 16);
      doc.text(`   Subtotal: Rs. ${item.total_amount.toFixed(2)}`, 20, yPosition + 24);
      
      if (item.price_per_unit !== item.discounted_price) {
        doc.text(`   (Original price: Rs. ${item.price_per_unit.toFixed(2)})`, 20, yPosition + 32);
        yPosition += 40;
      } else {
        yPosition += 32;
      }
      yPosition += 8; // Extra spacing between items
    });
    
    // Total
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`TOTAL AMOUNT: Rs. ${invoiceData.totalAmount.toFixed(2)}`, 20, yPosition + 20);
    
    // Footer
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('Thank you for choosing FitStock Manager!', 20, yPosition + 50);
    
    // Save the PDF
    doc.save(`invoice-${invoiceData.invoiceNumber}.pdf`);

    toast({
      title: "Invoice Downloaded",
      description: `Invoice ${invoiceData.invoiceNumber} downloaded as PDF`
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (cartItems.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add at least one item to the cart before completing the sale.",
        variant: "destructive"
      });
      return;
    }

    // Validate customer data
    try {
      customerSchema.parse({
        customerName: formData.customerName,
        customerPhone: formData.customerPhone
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive"
        });
        return;
      }
    }

    setIsSubmitting(true);
    
    try {
      // First, create the sale header
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert({
          customer_name: formData.customerName.trim() || null,
          customer_phone: formData.customerPhone.trim() || null,
          total_amount: 0, // Will be calculated by trigger
        })
        .select()
        .single();

      if (saleError || !saleData) {
        throw saleError;
      }

      // Then, insert all sale items
      const saleItemsData = cartItems.map(item => ({
        sale_id: saleData.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        price_per_unit: item.discounted_price,
        total_amount: item.total_amount
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItemsData);

      if (itemsError) {
        throw itemsError;
      }

      toast({
        title: "Sale Completed",
        description: `Successfully completed sale with ${cartItems.length} items`,
      });

      // Reset form and cart
      setFormData({
        category: "all",
        productId: "",
        quantity: 0,
        customerName: "",
        customerPhone: "",
        discountedPrice: 0
      });
      setSelectedProduct(null);
      setCartItems([]);

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
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
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

              {/* Product Details */}
              {selectedProduct && (
                <div className="bg-muted/50 p-4 rounded-lg border">
                  <h3 className="font-medium text-sm text-muted-foreground mb-2">Selected Product</h3>
                  <p className="font-semibold">{selectedProduct.name}</p>
                  <p className="text-sm text-muted-foreground">Category: {selectedProduct.category}</p>
                  <p className="text-sm text-muted-foreground">Available Stock: {selectedProduct.quantity} units</p>
                  <p className="text-sm font-medium text-primary">Actual Price: Rs. {selectedProduct.price_per_unit.toFixed(2)}</p>
                </div>
              )}

              {/* Quantity and Pricing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    placeholder="Enter quantity"
                  />
                  {selectedProduct && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Max: {selectedProduct.quantity} units
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="discountedPrice">Discounted Price per Unit (Rs.)</Label>
                  <Input
                    id="discountedPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    max={actualPrice}
                    value={formData.discountedPrice || ""}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      if (value <= actualPrice || value === 0) {
                        setFormData({ ...formData, discountedPrice: value });
                      } else {
                        toast({
                          title: "Invalid Price", 
                          description: `Discounted price cannot exceed actual price of Rs. ${actualPrice.toFixed(2)}`,
                          variant: "destructive"
                        });
                      }
                    }}
                    placeholder={selectedProduct ? `Default: ${actualPrice.toFixed(2)}` : "Select product first"}
                    disabled={!selectedProduct}
                  />
                  {selectedProduct && (
                    <div className="mt-1 space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Actual Price: Rs. {actualPrice.toFixed(2)}
                      </p>
                      {formData.discountedPrice && formData.discountedPrice !== actualPrice && (
                        <p className="text-xs text-green-600">
                          Discount: Rs. {(actualPrice - formData.discountedPrice).toFixed(2)} per unit
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Add to Cart Button */}
              <div className="flex justify-center">
                <Button 
                  type="button"
                  onClick={addToCart}
                  disabled={!selectedProduct || formData.quantity <= 0}
                  className="px-8 py-2 min-w-48"
                  size="lg"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Cart
                </Button>
              </div>

              {/* Cart Items */}
              {cartItems.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-lg font-medium">Cart Items</Label>
                    <span className="text-sm text-muted-foreground">{cartItems.length} items</span>
                  </div>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.quantity} x Rs. {item.discounted_price.toFixed(2)} = Rs. {item.total_amount.toFixed(2)}
                          </p>
                          {item.price_per_unit !== item.discounted_price && (
                            <p className="text-xs text-green-600">
                              Discount: Rs. {((item.price_per_unit - item.discounted_price) * item.quantity).toFixed(2)}
                            </p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromCart(item.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
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
              {cartItems.length > 0 && (
                <div className="bg-muted p-4 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-medium">Total Amount:</span>
                      <span className="text-2xl font-bold text-primary">Rs. {cartTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Invoice Actions */}
              {cartItems.length > 0 && (
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
                  disabled={isSubmitting || cartItems.length === 0}
                >
                  {isSubmitting ? "Processing..." : `Complete Sale (${cartItems.length} items)`}
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