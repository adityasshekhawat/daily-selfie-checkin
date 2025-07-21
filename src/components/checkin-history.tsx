import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, Download, Trash2, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { storageService } from '@/lib/storage';

interface CheckinData {
  id: string;
  userCode: string;
  timestamp: number;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
  };
  imageId: string;
  submissionId: string;
}

interface CheckinHistoryProps {
  onBack: () => void;
}

export const CheckinHistory: React.FC<CheckinHistoryProps> = ({ onBack }) => {
  const [checkins, setCheckins] = useState<CheckinData[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageStats, setStorageStats] = useState<{ totalCheckins: number; totalImages: number; storageSize: string } | null>(null);
  const [selectedImage, setSelectedImage] = useState<{ id: string; blob: Blob } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const allCheckins = storageService.getAllCheckins();
      const stats = await storageService.getStorageStats();
      
      setCheckins(allCheckins.reverse()); // Show newest first
      setStorageStats(stats);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({
        title: "Load Error",
        description: "Failed to load check-in history.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const viewImage = async (imageId: string) => {
    try {
      const blob = await storageService.getImage(imageId);
      if (blob) {
        setSelectedImage({ id: imageId, blob });
      } else {
        toast({
          title: "Image Not Found",
          description: "The image could not be loaded.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Failed to load image:', error);
      toast({
        title: "Load Error",
        description: "Failed to load the image.",
        variant: "destructive"
      });
    }
  };

  const downloadImage = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportAllData = async () => {
    try {
      const data = await storageService.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      downloadImage(blob, `selfie-checkins-${new Date().toISOString().split('T')[0]}.json`);
      
      toast({
        title: "Export Complete",
        description: "All data has been exported successfully.",
        variant: "default"
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export data.",
        variant: "destructive"
      });
    }
  };

  const clearAllData = async () => {
    if (confirm('Are you sure you want to delete all stored data? This cannot be undone.')) {
      try {
        await storageService.clearAllData();
        setCheckins([]);
        setStorageStats({ totalCheckins: 0, totalImages: 0, storageSize: '0 KB' });
        
        toast({
          title: "Data Cleared",
          description: "All stored data has been deleted.",
          variant: "default"
        });
      } catch (error) {
        console.error('Failed to clear data:', error);
        toast({
          title: "Clear Failed",
          description: "Failed to clear stored data.",
          variant: "destructive"
        });
      }
    }
  };

  const formatCoordinates = (lat: number, lng: number) => {
    return `${lat.toFixed(6)}°, ${lng.toFixed(6)}°`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const openGoogleMaps = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center p-4">
        <Card className="p-8 text-center">
          <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
          <p className="text-foreground">Loading check-in history...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Check-in History</h1>
              <p className="text-muted-foreground">View your stored selfie check-ins</p>
            </div>
            <Button onClick={onBack} variant="outline">
              Back to App
            </Button>
          </div>

          {/* Storage Stats */}
          {storageStats && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">{storageStats.totalCheckins}</div>
                <div className="text-sm text-muted-foreground">Check-ins</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">{storageStats.totalImages}</div>
                <div className="text-sm text-muted-foreground">Images</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">{storageStats.storageSize}</div>
                <div className="text-sm text-muted-foreground">Storage Used</div>
              </Card>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button onClick={exportAllData} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export Data
            </Button>
            <Button onClick={loadData} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={clearAllData} variant="destructive" size="sm">
              <Trash2 className="mr-2 h-4 w-4" />
              Clear All
            </Button>
          </div>
        </Card>

        {/* Check-ins List */}
        {checkins.length === 0 ? (
          <Card className="p-8 text-center">
            <ImageIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Check-ins Yet</h3>
            <p className="text-muted-foreground">Start by taking your first selfie check-in!</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {checkins.map((checkin) => (
              <Card key={checkin.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="secondary">{checkin.submissionId}</Badge>
                      <Badge variant="outline">{checkin.userCode}</Badge>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground mb-2">
                      <Calendar className="mr-1 h-4 w-4" />
                      {formatDate(checkin.timestamp)}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="mr-1 h-4 w-4" />
                      {formatCoordinates(checkin.location.latitude, checkin.location.longitude)}
                      <Button 
                        onClick={() => openGoogleMaps(checkin.location.latitude, checkin.location.longitude)}
                        variant="link" 
                        size="sm"
                        className="ml-2 p-0 h-auto"
                      >
                        View on Map
                      </Button>
                    </div>
                  </div>
                  <Button 
                    onClick={() => viewImage(checkin.imageId)}
                    variant="outline"
                    size="sm"
                  >
                    <ImageIcon className="mr-2 h-4 w-4" />
                    View Selfie
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Image Modal */}
        {selectedImage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="max-w-2xl w-full max-h-[90vh] overflow-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">Selfie Image</h3>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => downloadImage(selectedImage.blob, `selfie-${selectedImage.id}.jpg`)}
                      variant="outline"
                      size="sm"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                    <Button 
                      onClick={() => setSelectedImage(null)}
                      variant="outline"
                      size="sm"
                    >
                      Close
                    </Button>
                  </div>
                </div>
                <img 
                  src={URL.createObjectURL(selectedImage.blob)} 
                  alt="Selfie" 
                  className="w-full h-auto rounded-lg"
                />
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}; 