import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CameraCapture } from '@/components/camera-capture';
import { LocationCapture } from '@/components/location-capture';
import { CheckCircle, Upload, User, MapPin, LogOut, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

interface VerificationAppProps {
  userCode: string;
  onLogout: () => void;
}

type AppState = 'capture' | 'preview' | 'submitting' | 'success';

export const VerificationApp: React.FC<VerificationAppProps> = ({ userCode, onLogout }) => {
  const [appState, setAppState] = useState<AppState>('capture');
  const [capturedImage, setCapturedImage] = useState<Blob | null>(null);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [submissionId, setSubmissionId] = useState<string>('');

  const handleImageCapture = (imageBlob: Blob) => {
    setCapturedImage(imageBlob);
  };

  const handleLocationCapture = (location: LocationData) => {
    setLocationData(location);
  };

  const canSubmit = capturedImage && locationData;

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast({
        title: "Incomplete Data",
        description: "Please capture both photo and location before submitting.",
        variant: "destructive"
      });
      return;
    }

    setAppState('submitting');

    try {
      // Simulate API submission
      const formData = new FormData();
      formData.append('selfie', capturedImage);
      formData.append('location', JSON.stringify(locationData));
      formData.append('userCode', userCode);
      formData.append('timestamp', Date.now().toString());

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate submission ID
      const id = `VER-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`.toUpperCase();
      setSubmissionId(id);
      
      setAppState('success');
      
      toast({
        title: "Verification Submitted",
        description: "Your check-in has been successfully recorded.",
        variant: "default"
      });
    } catch (error) {
      console.error('Submission error:', error);
      setAppState('capture');
      toast({
        title: "Submission Failed",
        description: "Unable to submit verification. Please try again.",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setCapturedImage(null);
    setLocationData(null);
    setAppState('capture');
    setSubmissionId('');
  };

  if (appState === 'success') {
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center shadow-strong">
          <div className="mx-auto mb-6 w-20 h-20 bg-gradient-success rounded-full flex items-center justify-center shadow-medium">
            <CheckCircle className="h-10 w-10 text-success-foreground" />
          </div>
          
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Verification Complete
          </h2>
          <p className="text-muted-foreground mb-6">
            Your check-in has been successfully recorded and verified.
          </p>
          
          <div className="bg-success/10 border border-success/20 rounded-lg p-4 mb-6">
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Submission ID:</span>
                <span className="font-mono text-foreground">{submissionId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Time:</span>
                <span className="font-mono text-foreground">
                  {new Date().toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="text-success font-medium">Verified</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <Button 
              onClick={resetForm} 
              variant="primary" 
              size="lg" 
              className="w-full"
            >
              New Check-in
            </Button>
            <Button 
              onClick={onLogout} 
              variant="outline" 
              size="lg" 
              className="w-full"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground mt-4">
            Data will be automatically deleted after 24 hours
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-background">
      {/* Header */}
      <div className="bg-card shadow-soft border-b">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <User className="h-5 w-5 text-primary mr-2" />
            <span className="font-medium text-foreground">{userCode}</span>
          </div>
          <Button onClick={onLogout} variant="ghost" size="sm">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-lg mx-auto p-4 space-y-6">
        <div className="text-center py-4">
          <h1 className="text-xl font-bold text-foreground mb-1">
            Location Check-in
          </h1>
          <p className="text-sm text-muted-foreground">
            Capture your selfie and current location
          </p>
        </div>

        {/* Camera Section */}
        <div className="space-y-3">
          <div className="flex items-center">
            <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center mr-3">
              <span className="text-primary-foreground text-sm font-bold">1</span>
            </div>
            <h3 className="font-medium text-foreground">Take Your Selfie</h3>
          </div>
          <CameraCapture 
            onCapture={handleImageCapture} 
            disabled={appState === 'submitting'}
          />
        </div>

        {/* Location Section */}
        <div className="space-y-3">
          <div className="flex items-center">
            <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center mr-3">
              <span className="text-primary-foreground text-sm font-bold">2</span>
            </div>
            <h3 className="font-medium text-foreground">Capture Location</h3>
          </div>
          <LocationCapture 
            onLocationCapture={handleLocationCapture}
            disabled={appState === 'submitting'}
          />
        </div>

        {/* Submit Section */}
        <div className="pt-4">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || appState === 'submitting'}
            variant="success"
            size="lg"
            className="w-full"
          >
            {appState === 'submitting' ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-success-foreground mr-2" />
                Submitting Verification...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-5 w-5" />
                Submit Verification
              </>
            )}
          </Button>
          
          {canSubmit && (
            <div className="mt-3 flex items-center justify-center text-xs text-muted-foreground">
              <Clock className="h-3 w-3 mr-1" />
              Data will be deleted in 24 hours
            </div>
          )}
        </div>
      </div>
    </div>
  );
};