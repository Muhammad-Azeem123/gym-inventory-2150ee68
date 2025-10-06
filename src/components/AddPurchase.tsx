import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCategories } from "@/hooks/useCategories";
import { z } from "zod";

const purchaseSchema = z.object({
  productName: z.string().trim().min(1, "Product name is required").max(100, "Product name too long"),
  category: z.string().trim().min(1, "Category is required").max(50, "Category name too long"),
  quantity: z.number().int().min(1, "Quantity must be at least 1").max(999999, "Quantity too large"),
  pricePerUnit: z.number().min(0.01, "Price must be greater than 0").max(999999.99, "Price too large")
});

export const AddPurchase = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    productName: "",
    category: "",
    quantity: 0,
    pricePerUnit: 0
  });
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { categories, addCategory } = useCategories();

  const totalCost = formData.quantity * formData.pricePerUnit;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate input
      const validated = purchaseSchema.parse({
        productName: formData.productName,
        category: formData.category,
        quantity: formData.quantity,
        pricePerUnit: formData.pricePerUnit
      });

      const { error } = await supabase
        .from('purchases')
        .insert({
          product_name: validated.productName,
          category: validated.category,
          quantity: validated.quantity,
          price_per_unit: validated.pricePerUnit,
          total_cost: totalCost
        });

      if (error) throw error;

      toast({
        title: "Purchase Added",
        description: `Successfully added ${validated.quantity} units of ${validated.productName}`,
      });

      // Reset form
      setFormData({
        productName: "",
        category: "",
        quantity: 0,
        pricePerUnit: 0
      });

      // Navigate back after a short delay
      setTimeout(() => navigate("/"), 1500);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to add purchase. Please try again.",
          variant: "destructive"
        });
      }
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
              <Package className="w-5 h-5 text-primary" />
              Add New Purchase
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Product Name */}
              <div>
                <Label htmlFor="productName">Product Name</Label>
                <Input
                  id="productName"
                  placeholder="Enter product name"
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  required
                />
              </div>

              {/* Category */}
              <div>
                <Label htmlFor="category">Category</Label>
                <div className="space-y-2">
                  <Select 
                    value={isCustomCategory ? "custom" : (formData.category || "")} 
                    onValueChange={(value) => {
                      if (value === "custom") {
                        setIsCustomCategory(true);
                        setFormData({ ...formData, category: "" });
                      } else {
                        setIsCustomCategory(false);
                        setFormData({ ...formData, category: value });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">Custom Category</SelectItem>
                    </SelectContent>
                  </Select>
                  {isCustomCategory && (
                    <Input
                      placeholder="Enter custom category"
                      value={formData.category}
                      onChange={async (e) => {
                        const value = e.target.value;
                        setFormData({ ...formData, category: value });
                        
                        // Auto-add category when user types and it's not empty
                        if (value.trim() && !categories.some(cat => cat.name === value.trim())) {
                          await addCategory(value.trim());
                        }
                      }}
                      required
                    />
                  )}
                </div>
              </div>

              {/* Quantity and Price */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={formData.quantity || ""}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="pricePerUnit">Price per Unit (Rs.)</Label>
                  <Input
                    id="pricePerUnit"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.pricePerUnit || ""}
                    onChange={(e) => setFormData({ ...formData, pricePerUnit: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
              </div>

              {/* Total Cost Display */}
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium">Total Cost:</span>
                  <span className="text-2xl font-bold text-primary">Rs. {totalCost.toFixed(2)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Adding..." : "Add Purchase"}
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