import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseKey);

interface CheckinData {
  id?: string;
  user_code: string;
  submission_id: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  image_url?: string;
  created_at?: string;
}

export class SupabaseStorageService {
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
      // 1. Upload image to Supabase Storage
      const imageFileName = `${submissionId}.jpg`;
      const { data: imageData, error: imageError } = await supabase.storage
        .from('selfies')
        .upload(imageFileName, imageBlob, {
          cacheControl: '3600',
          upsert: true
        });

      if (imageError) {
        console.error('Image upload error:', imageError);
        throw new Error(`Image upload failed: ${imageError.message}`);
      }

      // 2. Get public URL for the image
      const { data: { publicUrl } } = supabase.storage
        .from('selfies')
        .getPublicUrl(imageFileName);

      // 3. Store metadata in database
      const checkinData: Omit<CheckinData, 'id' | 'created_at'> = {
        user_code: userCode,
        submission_id: submissionId,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        image_url: publicUrl
      };

      const { data, error } = await supabase
        .from('checkins')
        .insert([checkinData])
        .select()
        .single();

      if (error) {
        console.error('Database insert error:', error);
        throw new Error(`Database insert failed: ${error.message}`);
      }

      console.log('✅ Successfully stored to Supabase:', data);
      return data;

    } catch (error) {
      console.error('Supabase storage error:', error);
      throw error;
    }
  }

  // Get all checkins for admin dashboard
  async getAllCheckins(): Promise<CheckinData[]> {
    try {
      const { data, error } = await supabase
        .from('checkins')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to fetch checkins:', error);
      throw error;
    }
  }

  // Get checkins for specific user
  async getUserCheckins(userCode: string): Promise<CheckinData[]> {
    try {
      const { data, error } = await supabase
        .from('checkins')
        .select('*')
        .eq('user_code', userCode)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
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
      const { data: allCheckins, error } = await supabase
        .from('checkins')
        .select('user_code, created_at');

      if (error) throw error;

      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const totalCheckins = allCheckins.length;
      const uniqueUsers = new Set(allCheckins.map(c => c.user_code)).size;
      const todayCheckins = allCheckins.filter(c => 
        c.created_at.startsWith(today)
      ).length;
      const thisWeekCheckins = allCheckins.filter(c => 
        c.created_at >= weekAgo
      ).length;

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

export const supabaseStorage = new SupabaseStorageService(); 