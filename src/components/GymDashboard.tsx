import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Package, ShoppingCart, TrendingUp, AlertTriangle, Eye, LogOut, X, Search, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export const GymDashboard = () => {
  const navigate = useNavigate();
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [lowStockItems, setLowStockItems] = useState(0);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [currentStock, setCurrentStock] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [filteredStock, setFilteredStock] = useState<any[]>([]);
  const [lowStockAlert, setLowStockAlert] = useState<any[]>([]);
  const [showLowStockAlert, setShowLowStockAlert] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [salesCategoryFilter, setSalesCategoryFilter] = useState("all");

  useEffect(() => {
    fetchDashboardData();
    // Set up real-time updates
    const channel = supabase
      .channel('dashboard-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => fetchDashboardData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        () => fetchDashboardData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'purchases' },
        () => fetchDashboardData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    let filtered = currentStock;
    
    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }
    
    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredStock(filtered);
  }, [currentStock, selectedCategory, searchQuery]);

  const fetchDashboardData = async () => {
    try {
      // Get total products and current stock
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .order('name');
      
      const totalItems = products?.reduce((sum, product) => sum + product.quantity, 0) || 0;
      setTotalProducts(totalItems);
      setCurrentStock(products || []);

      // Extract unique categories
      const uniqueCategories = Array.from(new Set(products?.map(product => product.category) || []));
      setCategories(uniqueCategories);

      // Get total sales value
      const { data: sales } = await supabase
        .from('sales')
        .select('*');
      
      const totalSalesValue = sales?.reduce((sum, sale) => sum + sale.quantity, 0) || 0;
      setTotalSales(totalSalesValue);

      // Get low stock items (quantity < 5)
      const lowStock = products?.filter(product => product.quantity < 5) || [];
      setLowStockItems(lowStock.length);
      setLowStockAlert(lowStock);

      // Get recent activity
      const { data: recentPurchases } = await supabase
        .from('purchases')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: recentSales } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      // Combine and sort recent activity
      const combinedActivity = [
        ...(recentPurchases?.map(item => ({ ...item, type: 'purchase' })) || []),
        ...(recentSales?.map(item => ({ ...item, type: 'sale' })) || [])
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10);

      setRecentActivity(combinedActivity);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 md:p-6">
      {/* Header with Navigation */}
      <div className="mb-8">
        <div className="flex flex-col gap-4 mb-4">
          {/* Top row with logo and logout */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Inventory Management</h1>
            </div>
            <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
          
          {/* Navigation buttons row */}
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigate("/add-purchase")} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Purchase
            </Button>
            <Button onClick={() => navigate("/new-sale")} variant="secondary" className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              New Sale
            </Button>
            <Button onClick={() => navigate("/view-products")} variant="outline" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              View Products
            </Button>
          </div>
          
          {/* Search bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <p className="text-muted-foreground">Monitor and manage your product inventory</p>
      </div>

      {/* Low Stock Alert */}
      {lowStockAlert.length > 0 && showLowStockAlert && (
        <Alert className="mb-6 border-destructive/50 bg-destructive/10 relative">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowLowStockAlert(false)}
            className="absolute right-2 top-2 h-6 w-6 p-0 text-destructive hover:text-destructive/80"
          >
            <X className="h-4 w-4" />
          </Button>
          <AlertDescription className="text-destructive pr-8">
            <strong>Low Stock Alert:</strong> {lowStockAlert.length} product(s) have less than 5 units in stock:
            <div className="mt-2 flex flex-wrap gap-2">
              {lowStockAlert.map((item, index) => (
                <Badge key={index} variant="destructive" className="text-xs">
                  {item.name} ({item.quantity} left)
                </Badge>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
        <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Stock</CardTitle>
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div className="mt-2">
              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  <SelectItem value="purchased">From Purchases</SelectItem>
                  <SelectItem value="sold">From Sales</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-foreground">{totalProducts}</div>
            <p className="text-sm text-muted-foreground mt-1">Items in inventory</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Items Sold</CardTitle>
              <ShoppingCart className="w-5 h-5 text-primary" />
            </div>
            <div className="mt-2">
              <Select value={salesCategoryFilter} onValueChange={setSalesCategoryFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-foreground">{totalSales}</div>
            <p className="text-sm text-muted-foreground mt-1">Total items sold</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock Alert</CardTitle>
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-destructive">{lowStockItems}</div>
            <p className="text-sm text-muted-foreground mt-1">Items below 5 units</p>
          </CardContent>
        </Card>
      </div>


      {/* Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Current Stock */}
        <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm">
          <CardHeader className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Current Stock
              </CardTitle>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {filteredStock.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No products found</p>
              ) : (
                filteredStock.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.category}</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className={`font-medium ${product.quantity < 5 ? 'text-destructive' : 'text-foreground'}`}>
                        {product.quantity} units
                      </p>
                      <p className="text-sm text-muted-foreground">Rs. {product.price_per_unit.toFixed(2)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {recentActivity.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No recent activity</p>
              ) : (
                recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {activity.type === 'purchase' ? (
                        <Package className="w-4 h-4 text-primary flex-shrink-0" />
                      ) : (
                        <ShoppingCart className="w-4 h-4 text-secondary flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate">
                          {activity.type === 'purchase' ? 'Purchase: ' : 'Sale: '}
                          {activity.product_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Qty: {activity.quantity} • {new Date(activity.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right ml-4 flex-shrink-0">
                      <p className="font-medium text-sm">
                        Rs. {(activity.total_cost || activity.total_amount)?.toFixed(2)}
                      </p>
                      <Badge variant={activity.type === 'purchase' ? 'default' : 'secondary'} className="text-xs">
                        {activity.type === 'purchase' ? 'Purchase' : 'Sale'}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};