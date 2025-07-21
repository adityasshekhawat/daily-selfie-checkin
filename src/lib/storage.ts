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
  imageId: string; // Reference to blob in IndexedDB
  submissionId: string;
}

interface StoredImage {
  id: string;
  blob: Blob;
  timestamp: number;
}

class StorageService {
  private dbName = 'SelfieCheckinDB';
  private dbVersion = 1;
  private imageStoreName = 'images';
  private db: IDBDatabase | null = null;

  async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create images store for blob storage
        if (!db.objectStoreNames.contains(this.imageStoreName)) {
          const imageStore = db.createObjectStore(this.imageStoreName, { keyPath: 'id' });
          imageStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  // Store selfie image in IndexedDB
  async storeImage(blob: Blob): Promise<string> {
    if (!this.db) await this.initDB();
    
    const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const imageData: StoredImage = {
      id: imageId,
      blob,
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.imageStoreName], 'readwrite');
      const store = transaction.objectStore(this.imageStoreName);
      const request = store.add(imageData);

      request.onsuccess = () => resolve(imageId);
      request.onerror = () => reject(request.error);
    });
  }

  // Retrieve selfie image from IndexedDB
  async getImage(imageId: string): Promise<Blob | null> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.imageStoreName], 'readonly');
      const store = transaction.objectStore(this.imageStoreName);
      const request = store.get(imageId);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.blob : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Store check-in metadata in localStorage
  storeCheckin(data: Omit<CheckinData, 'id'>): string {
    const checkinId = `checkin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const checkinData: CheckinData = {
      id: checkinId,
      ...data
    };

    const existingData = this.getAllCheckins();
    existingData.push(checkinData);
    
    localStorage.setItem('selfie_checkins', JSON.stringify(existingData));
    return checkinId;
  }

  // Get all check-ins from localStorage
  getAllCheckins(): CheckinData[] {
    const stored = localStorage.getItem('selfie_checkins');
    return stored ? JSON.parse(stored) : [];
  }

  // Get specific check-in by ID
  getCheckin(id: string): CheckinData | null {
    const allCheckins = this.getAllCheckins();
    return allCheckins.find(checkin => checkin.id === id) || null;
  }

  // Complete storage workflow
  async storeCompleteCheckin(
    userCode: string,
    location: CheckinData['location'],
    imageBlob: Blob,
    submissionId: string
  ): Promise<CheckinData> {
    try {
      // Store image in IndexedDB
      const imageId = await this.storeImage(imageBlob);
      
      // Store metadata in localStorage
      const checkinId = this.storeCheckin({
        userCode,
        timestamp: Date.now(),
        location,
        imageId,
        submissionId
      });

      return {
        id: checkinId,
        userCode,
        timestamp: Date.now(),
        location,
        imageId,
        submissionId
      };
    } catch (error) {
      console.error('Storage error:', error);
      throw new Error('Failed to store check-in data');
    }
  }

  // Export data for backup/sync
  async exportData(): Promise<{ checkins: CheckinData[]; images: { [key: string]: string } }> {
    const checkins = this.getAllCheckins();
    const images: { [key: string]: string } = {};

    for (const checkin of checkins) {
      const blob = await this.getImage(checkin.imageId);
      if (blob) {
        // Convert blob to base64 for export
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        images[checkin.imageId] = base64;
      }
    }

    return { checkins, images };
  }

  // Clear all stored data
  async clearAllData(): Promise<void> {
    localStorage.removeItem('selfie_checkins');
    
    if (!this.db) await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.imageStoreName], 'readwrite');
      const store = transaction.objectStore(this.imageStoreName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get storage statistics
  async getStorageStats(): Promise<{ totalCheckins: number; totalImages: number; storageSize: string }> {
    const checkins = this.getAllCheckins();
    
    if (!this.db) await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.imageStoreName], 'readonly');
      const store = transaction.objectStore(this.imageStoreName);
      const request = store.count();

      request.onsuccess = () => {
        // Estimate storage size (rough calculation)
        const storageSize = this.estimateStorageSize();
        
        resolve({
          totalCheckins: checkins.length,
          totalImages: request.result,
          storageSize
        });
      };
      request.onerror = () => reject(request.error);
    });
  }

  private estimateStorageSize(): string {
    const localStorageSize = new Blob([localStorage.getItem('selfie_checkins') || '']).size;
    // IndexedDB size estimation is complex, this is a rough estimate
    const estimatedSize = localStorageSize + (this.getAllCheckins().length * 500 * 1024); // ~500KB per image estimate
    
    if (estimatedSize < 1024 * 1024) {
      return `${(estimatedSize / 1024).toFixed(1)} KB`;
    } else {
      return `${(estimatedSize / (1024 * 1024)).toFixed(1)} MB`;
    }
  }
}

export const storageService = new StorageService(); 