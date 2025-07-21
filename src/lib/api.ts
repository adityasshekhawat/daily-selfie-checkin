interface ApiCheckinData {
  userCode: string;
  timestamp: number;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
  };
  submissionId: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class ApiService {
  private baseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

  // Upload selfie image to backend
  async uploadImage(imageBlob: Blob, checkinId: string): Promise<ApiResponse<{ imageUrl: string }>> {
    try {
      const formData = new FormData();
      formData.append('image', imageBlob, `selfie-${checkinId}.jpg`);
      formData.append('checkinId', checkinId);

      const response = await fetch(`${this.baseUrl}/upload-image`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      return { success: true, data: result };
    } catch (error) {
      console.error('Image upload failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Upload failed' 
      };
    }
  }

  // Submit checkin metadata to backend
  async submitCheckin(data: ApiCheckinData): Promise<ApiResponse<{ id: string }>> {
    try {
      const response = await fetch(`${this.baseUrl}/checkins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Submission failed');
      }

      return { success: true, data: result };
    } catch (error) {
      console.error('Checkin submission failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Submission failed' 
      };
    }
  }

  // Complete workflow: Submit data and upload image
  async submitCompleteCheckin(
    checkinData: ApiCheckinData,
    imageBlob: Blob
  ): Promise<ApiResponse<{ checkinId: string; imageUrl: string }>> {
    try {
      // First submit the checkin data
      const checkinResponse = await this.submitCheckin(checkinData);
      
      if (!checkinResponse.success || !checkinResponse.data) {
        return checkinResponse as ApiResponse<{ checkinId: string; imageUrl: string }>;
      }

      const checkinId = checkinResponse.data.id;

      // Then upload the image
      const imageResponse = await this.uploadImage(imageBlob, checkinId);
      
      if (!imageResponse.success || !imageResponse.data) {
        return imageResponse as ApiResponse<{ checkinId: string; imageUrl: string }>;
      }

      return {
        success: true,
        data: {
          checkinId,
          imageUrl: imageResponse.data.imageUrl
        }
      };
    } catch (error) {
      console.error('Complete submission failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Complete submission failed' 
      };
    }
  }

  // Get user's checkin history from backend
  async getUserCheckins(userCode: string): Promise<ApiResponse<any[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/checkins?userCode=${encodeURIComponent(userCode)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch checkins');
      }

      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to fetch checkins:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch checkins' 
      };
    }
  }

  // Health check for API connectivity
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        timeout: 5000,
      });
      
      return response.ok;
    } catch (error) {
      console.log('API health check failed:', error);
      return false;
    }
  }
}

export const apiService = new ApiService();

// Hybrid storage approach: Use both local and remote storage
export class HybridStorageService {
  async storeCheckinWithSync(
    userCode: string,
    location: any,
    imageBlob: Blob,
    submissionId: string
  ): Promise<{ localId: string; synced: boolean; error?: string }> {
    
    // Always store locally first
    const { storageService } = await import('./storage');
    
    try {
      const localCheckin = await storageService.storeCompleteCheckin(
        userCode,
        location,
        imageBlob,
        submissionId
      );

      // Try to sync to server
      const apiHealthy = await apiService.healthCheck();
      
      if (apiHealthy) {
        const apiResponse = await apiService.submitCompleteCheckin(
          {
            userCode,
            timestamp: Date.now(),
            location,
            submissionId
          },
          imageBlob
        );

        if (apiResponse.success) {
          // Mark as synced in local storage (you could add this functionality)
          console.log('Data synced to server:', apiResponse.data);
          return { localId: localCheckin.id, synced: true };
        } else {
          return { 
            localId: localCheckin.id, 
            synced: false, 
            error: apiResponse.error 
          };
        }
      } else {
        return { 
          localId: localCheckin.id, 
          synced: false, 
          error: 'Server not available' 
        };
      }
    } catch (error) {
      throw new Error('Failed to store checkin locally');
    }
  }
}

export const hybridStorage = new HybridStorageService(); 