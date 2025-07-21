import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Camera, RotateCcw, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface CameraCaptureProps {
  onCapture: (imageBlob: Blob) => void;
  disabled?: boolean;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, disabled }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      setError('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setIsStreaming(true);
      }
    } catch (err) {
      const errorMessage = 'Camera access denied. Please allow camera permissions and refresh.';
      setError(errorMessage);
      toast({
        title: "Camera Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsStreaming(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    context.drawImage(video, 0, 0);
    
    canvas.toBlob((blob) => {
      if (blob) {
        const imageUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageUrl);
        stopCamera();
        onCapture(blob);
      }
    }, 'image/jpeg', 0.8);
  };

  const retake = () => {
    setCapturedImage(null);
    startCamera();
  };

  if (error) {
    return (
      <Card className="p-6 text-center bg-destructive/10 border-destructive/20">
        <Camera className="mx-auto mb-4 h-12 w-12 text-destructive" />
        <p className="text-destructive font-medium mb-4">{error}</p>
        <Button onClick={startCamera} variant="outline">
          Try Again
        </Button>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden bg-gradient-primary shadow-medium">
      <div className="relative aspect-[4/3] bg-card">
        {capturedImage ? (
          <img 
            src={capturedImage} 
            alt="Captured selfie" 
            className="w-full h-full object-cover"
          />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover transform scale-x-[-1]"
          />
        )}
        
        {!capturedImage && isStreaming && (
          <div className="absolute inset-0 border-4 border-primary/20 rounded-lg">
            <div className="absolute top-4 left-4 right-4 bg-primary/90 text-primary-foreground px-3 py-2 rounded-md text-sm font-medium text-center">
              Position your face in the center
            </div>
          </div>
        )}
      </div>
      
      <div className="p-4 bg-card space-y-3">
        {capturedImage ? (
          <div className="flex gap-3">
            <Button 
              onClick={retake} 
              variant="outline" 
              className="flex-1"
              disabled={disabled}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Retake
            </Button>
            <Button 
              variant="success" 
              className="flex-1"
              disabled={disabled}
            >
              <Check className="mr-2 h-4 w-4" />
              Use Photo
            </Button>
          </div>
        ) : (
          <Button 
            onClick={capturePhoto}
            disabled={!isStreaming || disabled}
            variant="capture"
            size="lg"
            className="w-full"
          >
            <Camera className="mr-2 h-5 w-5" />
            Take Selfie
          </Button>
        )}
      </div>
      
      <canvas ref={canvasRef} className="hidden" />
    </Card>
  );
};