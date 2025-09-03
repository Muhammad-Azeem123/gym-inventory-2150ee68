import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ShoppingCart, FileText, Download, Package, TrendingUp, AlertTriangle, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export const GymDashboard = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [stats, setStats] = useState({
    totalStock: 0,
    itemsSold: 0,
    lowStockItems: 0
  });
  const [products, setProducts] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
    fetchProducts();
    fetchRecentActivity();
  }, []);

  const fetchStats = async () => {
    try {
      // Get total stock
      const { data: stockData } = await supabase
        .from('products')
        .select('quantity');
      
      const totalStock = stockData?.reduce((sum, item) => sum + item.quantity, 0) || 0;

      // Get items sold
      const { data: salesData } = await supabase
        .from('sales')
        .select('quantity');
      
      const itemsSold = salesData?.reduce((sum, item) => sum + item.quantity, 0) || 0;

      // Get low stock items (quantity < 5)
      const { data: lowStockData } = await supabase
        .from('products')
        .select('*')
        .lt('quantity', 5);
      
      const lowStockItems = lowStockData?.length || 0;

      setStats({ totalStock, itemsSold, lowStockItems });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      let query = supabase.from('products').select('*').order('created_at', { ascending: false });
      
      if (selectedCategory !== "all") {
        query = query.eq('category', selectedCategory);
      }
      
      const { data } = await query;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      // Get recent purchases and sales
      const { data: purchases } = await supabase
        .from('purchases')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: sales } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      // Combine and sort by date
      const combined = [
        ...(purchases?.map(p => ({ ...p, type: 'purchase' })) || []),
        ...(sales?.map(s => ({ ...s, type: 'sale' })) || [])
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10);

      setRecentActivity(combined);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory]);

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Package className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">FitGear Pro</h1>
            <p className="text-muted-foreground">Professional Gym Equipment Management</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button className="gap-2" onClick={() => navigate("/add-purchase")}>
            <Plus className="w-4 h-4" />
            Add Purchase
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => navigate("/new-sale")}>
            <ShoppingCart className="w-4 h-4" />
            New Sale
          </Button>
          <Button variant="outline" className="gap-2">
            <FileText className="w-4 h-4" />
            Generate Invoice
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Filter by Category:</span>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="cardio">Cardio Equipment</SelectItem>
              <SelectItem value="weights">Weights</SelectItem>
              <SelectItem value="accessories">Accessories</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
            <Package className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStock}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.itemsSold}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alert</CardTitle>
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lowStockItems}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="sales">Sales</TabsTrigger>
                <TabsTrigger value="purchases">Purchases</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="mt-4">
                {recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {activity.type === 'purchase' ? (
                            <Plus className="w-4 h-4 text-green-600" />
                          ) : (
                            <ShoppingCart className="w-4 h-4 text-blue-600" />
                          )}
                          <div>
                            <p className="font-medium">{activity.product_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {activity.type === 'purchase' ? 'Purchased' : 'Sold'} {activity.quantity} units
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">₹{(activity.total_cost || activity.total_amount)?.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(activity.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Package className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="font-semibold text-foreground mb-1">No recent activity</h3>
                    <p className="text-sm text-muted-foreground">Your transactions will appear here</p>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="sales" className="mt-4">
                {recentActivity.filter(a => a.type === 'sale').length > 0 ? (
                  <div className="space-y-3">
                    {recentActivity.filter(a => a.type === 'sale').map((sale, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <ShoppingCart className="w-4 h-4 text-blue-600" />
                          <div>
                            <p className="font-medium">{sale.product_name}</p>
                            <p className="text-sm text-muted-foreground">Sold {sale.quantity} units</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">₹{sale.total_amount?.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(sale.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <ShoppingCart className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="font-semibold text-foreground mb-1">No sales yet</h3>
                    <p className="text-sm text-muted-foreground">Sales transactions will appear here</p>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="purchases" className="mt-4">
                {recentActivity.filter(a => a.type === 'purchase').length > 0 ? (
                  <div className="space-y-3">
                    {recentActivity.filter(a => a.type === 'purchase').map((purchase, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Plus className="w-4 h-4 text-green-600" />
                          <div>
                            <p className="font-medium">{purchase.product_name}</p>
                            <p className="text-sm text-muted-foreground">Purchased {purchase.quantity} units</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">₹{purchase.total_cost?.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(purchase.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Plus className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="font-semibold text-foreground mb-1">No purchases yet</h3>
                    <p className="text-sm text-muted-foreground">Purchase transactions will appear here</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Current Stock */}
        <Card>
          <CardHeader>
            <CardTitle>Current Stock</CardTitle>
          </CardHeader>
          <CardContent>
            {products.length > 0 ? (
              <div className="space-y-3">
                {products.map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">{product.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">Stock: {product.quantity}</p>
                      <p className="text-sm text-muted-foreground">₹{product.price_per_unit}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Package className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-foreground mb-1">No products in stock</h3>
                <p className="text-sm text-muted-foreground">Add your first purchase to get started</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};