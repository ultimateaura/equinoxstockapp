# Firebase Setup Guide

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter project name (e.g., "equinox-stocks")
4. Enable Google Analytics (optional)
5. Click "Create project"

## Step 2: Add Web App to Firebase Project

1. In your Firebase project dashboard, click the web icon (`</>`)
2. Enter app nickname (e.g., "Equinox Stocks App")
3. Check "Also set up Firebase Hosting" (optional)
4. Click "Register app"
5. Copy the Firebase configuration object

## Step 3: Enable Authentication

1. In Firebase Console, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable "Email/Password" provider
5. Click "Save"

## Step 4: Enable Firestore Database

1. In Firebase Console, go to "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location for your database
5. Click "Done"

## Step 5: Update Firebase Configuration

Replace the placeholder values in `config/firebase.ts` with your actual Firebase config:

```typescript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-actual-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-actual-sender-id",
  appId: "your-actual-app-id"
};
```

## Step 6: Set Up Firestore Security Rules

1. In Firebase Console, go to "Firestore Database" > "Rules"
2. Replace the default rules with the rules from `firestore.rules` file
3. Click "Publish"

## Step 7: Test the Setup

1. Start your app: `npm start`
2. Try to sign up with a test email
3. Check Firebase Console > Authentication > Users to see if the user was created
4. Check Firestore Database to see if user data was saved

## Troubleshooting

### Common Issues:

1. **"Firebase: Error (auth/invalid-api-key)"**
   - Check that your API key is correct in the config

2. **"Firebase: Error (auth/project-not-found)"**
   - Verify your project ID is correct

3. **"Firebase: Error (auth/network-request-failed)"**
   - Check your internet connection
   - Verify Firebase project is active

4. **"Firebase: Error (auth/too-many-requests)"**
   - Wait a few minutes and try again
   - This happens when too many requests are made in a short time

### Development vs Production:

- **Development**: Use test mode for Firestore rules
- **Production**: Implement proper security rules before going live

## Security Rules (Already Created)

The `firestore.rules` file contains proper security rules that:
- Only allow authenticated users to access their own data
- Validate user document structure
- Prevent unauthorized access

Make sure to deploy these rules to your Firebase project.
