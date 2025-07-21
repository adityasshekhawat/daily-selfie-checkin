// Firebase Storage Service - 100% FREE
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, where } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// 🔥 FREE Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCMXux-UQ8tJs0Cjc_cs5Cv7kA8dY5YxkA",
    authDomain: "location-detection-jt.firebaseapp.com",
    projectId: "location-detection-jt",
    storageBucket: "location-detection-jt.firebasestorage.app",
    messagingSenderId: "944485836400",
    appId: "1:944485836400:web:9c50554a72f34b7c8476b5",
    measurementId: "G-8LL4W6D6M8"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

interface CheckinData {
  id?: string;
  userCode: string;
  submissionId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  imageUrl?: string;
  timestamp: number;
  createdAt?: any;
}

export class FirebaseStorageService {
  async storeCompleteCheckin(
    userCode: string,
    location: {
      latitude: number;
      longitude: number;
      accuracy: number;
      timestamp: number;
    },
    imageBlob: Blob,
    submissionId: string
  ): Promise<CheckinData> {
    try {
      console.log('🔥 Starting Firebase storage...');
      
      // 1. Upload image to Firebase Storage
      const imageFileName = `selfies/${submissionId}.jpg`;
      const imageRef = ref(storage, imageFileName);
      
      console.log('📷 Uploading image...');
      const snapshot = await uploadBytes(imageRef, imageBlob, {
        contentType: 'image/jpeg',
        customMetadata: {
          userCode,
          submissionId,
          uploadedAt: new Date().toISOString()
        }
      });

      // 2. Get download URL
      const imageUrl = await getDownloadURL(snapshot.ref);
      console.log('✅ Image uploaded:', imageUrl);

      // 3. Store metadata in Firestore
      const checkinData = {
        userCode,
        submissionId,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        imageUrl,
        timestamp: Date.now(),
        createdAt: new Date()
      };

      console.log('💾 Saving to Firestore...');
      const docRef = await addDoc(collection(db, 'checkins'), checkinData);
      
      console.log('✅ Successfully stored to Firebase!');
      return {
        id: docRef.id,
        ...checkinData
      };

    } catch (error) {
      console.error('❌ Firebase storage error:', error);
      throw new Error(`Firebase storage failed: ${error.message}`);
    }
  }

  // Get all checkins for admin dashboard
  async getAllCheckins(): Promise<CheckinData[]> {
    try {
      const q = query(
        collection(db, 'checkins'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CheckinData[];
    } catch (error) {
      console.error('Failed to fetch checkins:', error);
      throw error;
    }
  }

  // Get checkins for specific user
  async getUserCheckins(userCode: string): Promise<CheckinData[]> {
    try {
      const q = query(
        collection(db, 'checkins'),
        where('userCode', '==', userCode),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CheckinData[];
    } catch (error) {
      console.error('Failed to fetch user checkins:', error);
      throw error;
    }
  }

  // Get statistics for admin dashboard
  async getStats(): Promise<{
    totalCheckins: number;
    uniqueUsers: number;
    todayCheckins: number;
    thisWeekCheckins: number;
  }> {
    try {
      const allCheckins = await this.getAllCheckins();
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const totalCheckins = allCheckins.length;
      const uniqueUsers = new Set(allCheckins.map(c => c.userCode)).size;
      
      const todayCheckins = allCheckins.filter(c => {
        const checkinDate = new Date(c.timestamp);
        return checkinDate >= today;
      }).length;
      
      const thisWeekCheckins = allCheckins.filter(c => {
        const checkinDate = new Date(c.timestamp);
        return checkinDate >= weekAgo;
      }).length;

      return {
        totalCheckins,
        uniqueUsers,
        todayCheckins,
        thisWeekCheckins
      };
    } catch (error) {
      console.error('Failed to get stats:', error);
      return {
        totalCheckins: 0,
        uniqueUsers: 0,
        todayCheckins: 0,
        thisWeekCheckins: 0
      };
    }
  }
}

export const firebaseStorage = new FirebaseStorageService(); 