#!/bin/bash

echo "🚀 Deploying Firestore Rules..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Installing..."
    npm install -g firebase-tools
fi

# Check if user is logged in
if ! firebase projects:list &> /dev/null; then
    echo "🔐 Please login to Firebase first:"
    firebase login
fi

# Set the project
echo "📁 Setting Firebase project to stock-advisor-app..."
firebase use stock-advisor-app

# Deploy the rules
echo "📤 Deploying Firestore rules..."
firebase deploy --only firestore:rules

echo "✅ Rules deployed successfully!"
echo "🧪 Test your app now - the AI conversations should work."
