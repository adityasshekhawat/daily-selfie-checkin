# Backend Setup Guide for Daily Selfie Check-in

This document provides multiple options for setting up a backend to store selfie and location data permanently.

## 🎯 **Current Status**

- ✅ **Frontend**: Captures selfies and location data
- ✅ **Local Storage**: Stores data in browser (IndexedDB + localStorage)
- ✅ **Export/Import**: Data export functionality for backups
- 🟡 **Backend**: Optional - multiple options provided below

## 🏗 **Backend Options**

### **Option 1: Node.js + Express + PostgreSQL (Recommended)**

```bash
# 1. Create backend directory
mkdir selfie-checkin-backend
cd selfie-checkin-backend

# 2. Initialize Node.js project
npm init -y

# 3. Install dependencies
npm install express multer pg cors dotenv helmet
npm install -D nodemon @types/node typescript

# 4. Create basic server structure
```

**Backend API endpoints needed:**
```javascript
// server.js
const express = require('express');
const multer = require('multer');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Submit check-in metadata
app.post('/api/checkins', async (req, res) => {
  try {
    const { userCode, timestamp, location, submissionId } = req.body;
    
    const result = await pool.query(
      'INSERT INTO checkins (user_code, timestamp, latitude, longitude, accuracy, submission_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [userCode, timestamp, location.latitude, location.longitude, location.accuracy, submissionId]
    );
    
    res.json({ id: result.rows[0].id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload selfie image
app.post('/api/upload-image', upload.single('image'), async (req, res) => {
  try {
    const { checkinId } = req.body;
    const imageUrl = `/uploads/${req.file.filename}`;
    
    await pool.query(
      'UPDATE checkins SET image_url = $1 WHERE id = $2',
      [imageUrl, checkinId]
    );
    
    res.json({ imageUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user checkins
app.get('/api/checkins', async (req, res) => {
  try {
    const { userCode } = req.query;
    
    const result = await pool.query(
      'SELECT * FROM checkins WHERE user_code = $1 ORDER BY timestamp DESC',
      [userCode]
    );
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**Database Schema (PostgreSQL):**
```sql
CREATE TABLE checkins (
  id SERIAL PRIMARY KEY,
  user_code VARCHAR(255) NOT NULL,
  timestamp BIGINT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION NOT NULL,
  submission_id VARCHAR(255) UNIQUE NOT NULL,
  image_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  synced_at TIMESTAMP
);

CREATE INDEX idx_checkins_user_code ON checkins(user_code);
CREATE INDEX idx_checkins_timestamp ON checkins(timestamp);
```

### **Option 2: Firebase (Serverless)**

```bash
# 1. Install Firebase CLI
npm install -g firebase-tools

# 2. Initialize Firebase project
firebase init

# 3. Enable Firestore and Storage
```

**Firebase configuration:**
```javascript
// firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  // Your Firebase config
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Usage in your app
import { collection, addDoc, uploadBytes } from 'firebase/firestore';

export const submitToFirebase = async (checkinData, imageBlob) => {
  // Upload image to Firebase Storage
  const imageRef = ref(storage, `selfies/${checkinData.submissionId}.jpg`);
  const snapshot = await uploadBytes(imageRef, imageBlob);
  const imageUrl = await getDownloadURL(snapshot.ref);
  
  // Save metadata to Firestore
  await addDoc(collection(db, 'checkins'), {
    ...checkinData,
    imageUrl,
    createdAt: new Date()
  });
};
```

### **Option 3: Supabase (PostgreSQL + Storage)**

```bash
# 1. Install Supabase client
npm install @supabase/supabase-js

# 2. Create Supabase project at https://supabase.com
```

**Supabase integration:**
```javascript
// supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const submitToSupabase = async (checkinData, imageBlob) => {
  // Upload image to Supabase Storage
  const { data: imageData, error: imageError } = await supabase.storage
    .from('selfies')
    .upload(`${checkinData.submissionId}.jpg`, imageBlob);
  
  if (imageError) throw imageError;
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('selfies')
    .getPublicUrl(imageData.path);
  
  // Insert checkin data
  const { data, error } = await supabase
    .from('checkins')
    .insert([{
      user_code: checkinData.userCode,
      timestamp: checkinData.timestamp,
      latitude: checkinData.location.latitude,
      longitude: checkinData.location.longitude,
      accuracy: checkinData.location.accuracy,
      submission_id: checkinData.submissionId,
      image_url: publicUrl
    }]);
    
  if (error) throw error;
  return data;
};
```

### **Option 4: AWS (S3 + DynamoDB)**

```javascript
// aws-config.js
import AWS from 'aws-sdk';

AWS.config.update({
  accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
  region: process.env.REACT_APP_AWS_REGION
});

const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB.DocumentClient();

export const submitToAWS = async (checkinData, imageBlob) => {
  // Upload to S3
  const s3Params = {
    Bucket: 'your-selfie-bucket',
    Key: `selfies/${checkinData.submissionId}.jpg`,
    Body: imageBlob,
    ContentType: 'image/jpeg'
  };
  
  const s3Result = await s3.upload(s3Params).promise();
  
  // Save to DynamoDB
  const dynamoParams = {
    TableName: 'SelfieCheckins',
    Item: {
      id: checkinData.submissionId,
      userCode: checkinData.userCode,
      timestamp: checkinData.timestamp,
      location: checkinData.location,
      imageUrl: s3Result.Location,
      createdAt: new Date().toISOString()
    }
  };
  
  await dynamodb.put(dynamoParams).promise();
};
```

## 🔧 **Environment Configuration**

Create `.env` file in your project root:

```env
# API Configuration
REACT_APP_API_BASE_URL=http://localhost:3001/api

# Firebase (if using)
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id

# Supabase (if using)
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key

# AWS (if using)
REACT_APP_AWS_ACCESS_KEY_ID=your_access_key
REACT_APP_AWS_SECRET_ACCESS_KEY=your_secret_key
REACT_APP_AWS_REGION=us-east-1
```

## 🧪 **Testing Your Setup**

1. **Test Local Storage** (Already working):
   ```bash
   npm run dev
   # Take a selfie and check browser DevTools > Application > IndexedDB
   ```

2. **Test Backend API**:
   ```bash
   # Start your backend server
   curl http://localhost:3001/api/health
   ```

3. **Test Full Integration**:
   - Take a selfie in the app
   - Check browser network tab for API calls
   - Verify data in your database/storage

## 📊 **Data Flow Comparison**

| Feature | Local Only | + Node.js API | + Firebase | + Supabase | + AWS |
|---------|------------|---------------|------------|------------|-------|
| Offline Support | ✅ | ✅ | ✅ | ✅ | ✅ |
| Cross-device Sync | ❌ | ✅ | ✅ | ✅ | ✅ |
| Real-time Updates | ❌ | 🟡 | ✅ | ✅ | 🟡 |
| Scalability | ❌ | 🟡 | ✅ | ✅ | ✅ |
| Cost | Free | Low | Medium | Low | Medium |
| Setup Complexity | Easy | Medium | Easy | Easy | Hard |

## 🚀 **Deployment Options**

1. **Frontend**: Vercel, Netlify, GitHub Pages
2. **Backend API**: Railway, Render, Heroku, AWS EC2
3. **Database**: Railway, Supabase, AWS RDS, Google Cloud SQL
4. **File Storage**: AWS S3, Google Cloud Storage, Cloudinary

## 🔐 **Security Considerations**

- Use HTTPS in production
- Implement proper authentication
- Validate file types and sizes
- Add rate limiting
- Sanitize location data
- Consider GDPR compliance for EU users

Your app will work perfectly with just local storage, but adding any of these backend options will enable data persistence across devices and better collaboration. 