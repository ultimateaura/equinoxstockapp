# Firebase Permissions Debug Guide

## Current Issue

You're getting "insufficient permissions" errors when trying to access the `ai_conversations` collection.

## Step-by-Step Fix

### 1. Deploy the Updated Rules

The main issue is that the Firestore rules haven't been deployed yet. You need to deploy the updated `firestore.rules` file.

#### Option A: Firebase Console (Easiest)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `stock-advisor-app`
3. Go to **Firestore Database** → **Rules**
4. Replace the existing rules with this simplified version:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read and write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // AI Conversations - users can only access their own conversations
    match /ai_conversations/{conversationId} {
      allow read, write: if request.auth != null;
    }
    
    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

1. Click **"Publish"**

#### Option B: Firebase CLI

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Set the project
firebase use stock-advisor-app

# Deploy the rules
firebase deploy --only firestore:rules
```

### 2. Test the Fix

After deploying the rules:

1. **Open your app** and navigate to the AI screen
2. **Check the console** for these messages:
  - ✅ "Firebase permissions test passed" = Working
  - ❌ "Firebase permissions test failed" = Still broken
3. **Try sending a message** in the AI chat
4. **Check if the message persists** when you close and reopen the app

### 3. Debug Steps if Still Not Working

#### Check Authentication

Make sure the user is logged in:

```javascript
// In your app console, check:
console.log('User logged in:', !!auth.currentUser);
console.log('User ID:', auth.currentUser?.uid);
```

#### Check Firebase Project

Verify you're using the correct project:

```javascript
// Check the project ID
console.log('Firebase project:', db.app.options.projectId);
// Should show: stock-advisor-app
```

#### Check Rules Deployment

1. Go to Firebase Console → Firestore → Rules
2. Verify the rules show the `ai_conversations` permissions
3. Check the "Last published" timestamp

### 4. Alternative: Temporary Permissive Rules

If you're still having issues, temporarily use these very permissive rules for testing:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**⚠️ Warning**: These rules are very permissive and should only be used for testing. Replace with proper security rules before production.

### 5. Common Issues and Solutions

#### Issue: "Missing or insufficient permissions"

- **Cause**: Rules not deployed or incorrect
- **Solution**: Deploy the updated rules

#### Issue: "User not authenticated"

- **Cause**: User not logged in
- **Solution**: Ensure user is logged in before accessing AI features

#### Issue: "Project not found"

- **Cause**: Wrong Firebase project
- **Solution**: Check Firebase config and project ID

### 6. Testing Commands

Run these in your app console to debug:

```javascript
// Test Firebase connection
import { db } from './config/firebase';
import { collection, getDocs } from 'firebase/firestore';

// Test reading from ai_conversations
const testRead = async () => {
  try {
    const conversationsRef = collection(db, 'ai_conversations');
    const snapshot = await getDocs(conversationsRef);
    console.log('✅ Read successful:', snapshot.size, 'documents');
  } catch (error) {
    console.error('❌ Read failed:', error);
  }
};

testRead();
```

### 7. Final Verification

After fixing, you should see:

1. ✅ No error messages in the AI screen
2. ✅ "Firebase permissions test passed" in console
3. ✅ Messages save and persist across app sessions
4. ✅ Users can only see their own conversations

## Files to Check

- `firestore.rules` - Main rules file
- `config/firebase.ts` - Firebase configuration
- `utils/testFirebasePermissions.ts` - Permission testing
- `app/ai.tsx` - Error handling and testing

## Next Steps

1. Deploy the updated Firestore rules
2. Test the AI conversation functionality
3. Verify conversations persist across sessions
4. Check that users can only access their own data

