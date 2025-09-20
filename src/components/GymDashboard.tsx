import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Package, ShoppingCart, TrendingUp, AlertTriangle, Eye, LogOut, X, Search, Plus, Dumbbell, Filter, FolderOpen } from "lucide-react";
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
  const [activityFilter, setActivityFilter] = useState("all");
  const [categoryStats, setCategoryStats] = useState<{ name: string; count: number; }[]>([]);

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

  // Recalculate totals when filters change
  useEffect(() => {
    fetchDashboardData();
  }, [stockFilter, salesCategoryFilter]);

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
      
      // Calculate total items based on filter
      let filteredForTotal = products || [];
      if (stockFilter !== "all") {
        filteredForTotal = products?.filter(product => product.category === stockFilter) || [];
      }
      const totalItems = filteredForTotal.reduce((sum, product) => sum + product.quantity, 0);
      setTotalProducts(totalItems);
      setCurrentStock(products || []);

      // Extract unique categories and calculate stats
      const uniqueCategories = Array.from(new Set(products?.map(product => product.category) || []));
      setCategories(uniqueCategories);
      
      // Calculate category statistics
      const categoryStats = uniqueCategories.map(category => ({
        name: category,
        count: products?.filter(p => p.category === category).length || 0
      }));
      setCategoryStats(categoryStats);

      // Get total sales value based on filter
      const { data: saleItems } = await supabase
        .from('sale_items')
        .select('*, products(category)');
      
      let filteredSalesItems = saleItems || [];
      if (salesCategoryFilter !== "all") {
        filteredSalesItems = saleItems?.filter(item => {
          const product = products?.find(p => p.id === item.product_id);
          return product?.category === salesCategoryFilter;
        }) || [];
      }
      const totalSalesValue = filteredSalesItems.reduce((sum, item) => sum + item.quantity, 0);
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

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/login");
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 md:p-6">
      {/* Header with Navigation */}
      <div className="mb-8">
        <div className="flex flex-col gap-4 mb-4">
        {/* Header with logo and navigation */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-3 rounded-lg">
              <Dumbbell className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">FitStock Manager</h1>
              <p className="text-sm text-muted-foreground">Professional Gym Inventory System</p>
            </div>
          </div>
          
          {/* Right side navigation */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
            {/* Search bar with clear button */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchQuery && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Clear search"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-transparent"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {/* Navigation buttons */}
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => navigate("/add-purchase")} size="sm" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Purchase
              </Button>
              <Button onClick={() => navigate("/new-sale")} variant="secondary" size="sm" className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                New Sale
              </Button>
              <Button onClick={() => navigate("/view-products")} variant="outline" size="sm" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                View Products
              </Button>
              <Button onClick={() => navigate("/categories")} variant="outline" size="sm" className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                Categories
              </Button>
              <Button variant="outline" onClick={handleLogout} size="sm" className="flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
        </div>
        <p className="text-muted-foreground">Monitor and manage your product inventory</p>
      </div>

      {/* Low Stock Alert - Hidden since categories are shown in the card */}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
        <Card className="border shadow-lg bg-card/50 backdrop-blur-sm">
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
            <div className="text-2xl md:text-3xl font-bold text-foreground">{totalProducts}</div>
            <p className="text-sm text-muted-foreground mt-1">Items in inventory</p>
          </CardContent>
        </Card>

        <Card className="border shadow-lg bg-card/50 backdrop-blur-sm">
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

        <Card className="border shadow-lg bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock Alert</CardTitle>
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-destructive">{lowStockItems}</div>
            <p className="text-sm text-muted-foreground mt-1">Items below 5 units</p>
            {lowStockAlert.length > 0 && (
              <div className="mt-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Categories affected:</p>
                <div className="flex flex-wrap gap-1">
                  {Array.from(new Set(lowStockAlert.map(item => item.category))).map((category) => (
                    <Badge key={category} variant="outline" className="text-xs px-2 py-0.5 border-destructive/30 text-destructive">
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>


      {/* Current Stock */}
      <Card className="border shadow-lg bg-card/50 backdrop-blur-sm mb-8">
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

      {/* Recent Activity and Category Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="border shadow-lg bg-card/50 backdrop-blur-sm">
          <CardHeader className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Recent Activity
              </CardTitle>
              <Select value={activityFilter} onValueChange={setActivityFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Filter activities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Activities</SelectItem>
                  <SelectItem value="purchase">Purchases</SelectItem>
                  <SelectItem value="sale">Sales</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {recentActivity.filter(activity => activityFilter === "all" || activity.type === activityFilter).length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No recent activity</p>
              ) : (
                recentActivity.filter(activity => activityFilter === "all" || activity.type === activityFilter).map((activity, index) => (
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

        {/* Category Management Card */}
        <Card className="border shadow-lg bg-card/50 backdrop-blur-sm">
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-primary" />
                Category Management
              </CardTitle>
              <Button onClick={() => navigate("/categories")} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Manage
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {categoryStats.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-2">No categories found</p>
                  <Button onClick={() => navigate("/categories")} size="sm">
                    Create First Category
                  </Button>
                </div>
              ) : (
                categoryStats.map((category, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
                    <div>
                      <p className="font-medium text-foreground">{category.name}</p>
                      <p className="text-sm text-muted-foreground">Active category</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-foreground">{category.count}</p>
                      <p className="text-sm text-muted-foreground">products</p>
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