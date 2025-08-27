import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Clock, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Floor {
  id: string;
  name: string;
}

interface Location {
  id: string;
  name: string;
  floor_id: string;
  room: string | null;
  x: number;
  y: number;
  type: string | null;
}

interface Route {
  id: string;
  from_location_id: string;
  to_location_id: string;
  distance: number;
  estimated_time: string;
  accessibility: string;
  steps: string[];
}

export const ClinicNavigation = () => {
  const [floors, setFloors] = useState<Floor[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [fromLocation, setFromLocation] = useState<string>("");
  const [toLocation, setToLocation] = useState<string>("");
  const [currentRoute, setCurrentRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchFloors();
  }, []);

  useEffect(() => {
    if (selectedFloor) {
      fetchLocations(selectedFloor);
    }
  }, [selectedFloor]);

  const fetchFloors = async () => {
    try {
      const { data, error } = await supabase
        .from("floors")
        .select("*")
        .order("name");
      
      if (error) throw error;
      setFloors(data || []);
      
      if (data && data.length > 0) {
        setSelectedFloor(data[0].id);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load floors",
        variant: "destructive",
      });
    }
  };

  const fetchLocations = async (floorId: string) => {
    try {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .eq("floor_id", floorId)
        .order("name");
      
      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load locations",
        variant: "destructive",
      });
    }
  };

  const findRoute = async () => {
    if (!fromLocation || !toLocation) {
      toast({
        title: "Error",
        description: "Please select both start and destination locations",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("routes")
        .select("*")
        .eq("from_location_id", fromLocation)
        .eq("to_location_id", toLocation)
        .single();
      
      if (error) {
        // If no direct route found, create a simple route
        const fromLoc = locations.find(l => l.id === fromLocation);
        const toLoc = locations.find(l => l.id === toLocation);
        
        if (fromLoc && toLoc) {
          const distance = Math.round(Math.sqrt(
            Math.pow(toLoc.x - fromLoc.x, 2) + Math.pow(toLoc.y - fromLoc.y, 2)
          ));
          
          setCurrentRoute({
            id: "temp",
            from_location_id: fromLocation,
            to_location_id: toLocation,
            distance,
            estimated_time: `${Math.ceil(distance / 10)} minutes`,
            accessibility: "Standard",
            steps: [
              `Start at ${fromLoc.name}`,
              `Navigate ${distance}m to reach ${toLoc.name}`,
              `Arrive at ${toLoc.name}`
            ]
          });
        }
      } else {
        setCurrentRoute(data);
      }
      
      toast({
        title: "Route Found",
        description: "Navigation route has been calculated",
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to find route",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredLocations = locations.filter(location =>
    location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (location.room && location.room.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getLocationName = (locationId: string) => {
    const location = locations.find(l => l.id === locationId);
    return location ? location.name : "Unknown Location";
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-6 w-6" />
            Clinic Path Navigator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Floor</label>
              <Select value={selectedFloor} onValueChange={setSelectedFloor}>
                <SelectTrigger>
                  <SelectValue placeholder="Select floor" />
                </SelectTrigger>
                <SelectContent>
                  {floors.map((floor) => (
                    <SelectItem key={floor.id} value={floor.id}>
                      {floor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Search Locations</label>
              <Input
                placeholder="Search rooms, departments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              Route Planning
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">From</label>
              <Select value={fromLocation} onValueChange={setFromLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select starting location" />
                </SelectTrigger>
                <SelectContent>
                  {filteredLocations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name} {location.room && `(${location.room})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">To</label>
              <Select value={toLocation} onValueChange={setToLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                  {filteredLocations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name} {location.room && `(${location.room})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={findRoute} 
              disabled={loading || !fromLocation || !toLocation}
              className="w-full"
            >
              {loading ? "Finding Route..." : "Find Route"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Available Locations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredLocations.map((location) => (
                <div key={location.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <h4 className="font-medium">{location.name}</h4>
                    {location.room && (
                      <p className="text-sm text-muted-foreground">Room: {location.room}</p>
                    )}
                  </div>
                  {location.type && (
                    <Badge variant="secondary">{location.type}</Badge>
                  )}
                </div>
              ))}
              {filteredLocations.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No locations found
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {currentRoute && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Navigation Route
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Distance</p>
                <p className="text-2xl font-bold">{currentRoute.distance}m</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Estimated Time</p>
                <p className="text-2xl font-bold">{currentRoute.estimated_time}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Accessibility</p>
                <Badge variant="outline">{currentRoute.accessibility}</Badge>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Route: {getLocationName(currentRoute.from_location_id)} → {getLocationName(currentRoute.to_location_id)}</h4>
              <div className="space-y-2">
                {currentRoute.steps.map((step, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold mt-0.5">
                      {index + 1}
                    </div>
                    <p className="text-sm">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};