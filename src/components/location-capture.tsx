import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MapPin, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

interface LocationCaptureProps {
  onLocationCapture: (location: LocationData) => void;
  disabled?: boolean;
}

export const LocationCapture: React.FC<LocationCaptureProps> = ({ onLocationCapture, disabled }) => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      const errorMsg = 'Geolocation is not supported by this browser.';
      setError(errorMsg);
      toast({
        title: "Location Error",
        description: errorMsg,
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now()
        };
        
        setLocation(locationData);
        setLoading(false);
        onLocationCapture(locationData);
        
        toast({
          title: "Location Captured",
          description: "Your location has been successfully captured.",
          variant: "default"
        });
      },
      (error) => {
        let errorMessage = 'Unable to retrieve your location.';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please allow location permissions.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.';
            break;
        }
        
        setError(errorMessage);
        setLoading(false);
        
        toast({
          title: "Location Error",
          description: errorMessage,
          variant: "destructive"
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000
      }
    );
  };

  const formatCoordinates = (lat: number, lng: number) => {
    return `${lat.toFixed(6)}°, ${lng.toFixed(6)}°`;
  };

  const formatAccuracy = (accuracy: number) => {
    return accuracy < 1000 
      ? `±${Math.round(accuracy)}m` 
      : `±${(accuracy / 1000).toFixed(1)}km`;
  };

  if (error) {
    return (
      <Card className="p-6 bg-destructive/10 border-destructive/20">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
          <p className="text-destructive font-medium mb-4">{error}</p>
          <Button 
            onClick={getCurrentLocation} 
            variant="outline"
            disabled={disabled}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-gradient-background shadow-soft">
      <div className="text-center">
        <MapPin className="mx-auto mb-4 h-12 w-12 text-primary" />
        
        {loading ? (
          <div className="space-y-4">
            <div className="animate-pulse-slow">
              <p className="font-medium text-foreground">Getting your location...</p>
              <p className="text-sm text-muted-foreground mt-2">This may take a moment</p>
            </div>
          </div>
        ) : location ? (
          <div className="space-y-4">
            <div className="bg-success/10 border border-success/20 rounded-lg p-4">
              <div className="flex items-center justify-center mb-2">
                <Check className="h-5 w-5 text-success mr-2" />
                <span className="font-medium text-success">Location Captured</span>
              </div>
              
              <div className="text-sm space-y-2 text-left">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Coordinates:</span>
                  <span className="font-mono">{formatCoordinates(location.latitude, location.longitude)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Accuracy:</span>
                  <span className="font-mono">{formatAccuracy(location.accuracy)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time:</span>
                  <span className="font-mono">{new Date(location.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
            
            <Button 
              onClick={getCurrentLocation} 
              variant="outline" 
              size="sm"
              disabled={disabled}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Update Location
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="font-medium text-foreground">Location Required</p>
            <p className="text-sm text-muted-foreground">
              We need your current location to verify your check-in
            </p>
            <Button 
              onClick={getCurrentLocation} 
              variant="primary"
              disabled={disabled}
            >
              <MapPin className="mr-2 h-4 w-4" />
              Get Location
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};