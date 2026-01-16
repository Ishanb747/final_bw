# TruthLens Web App Setup

## Prerequisites
1.  **Firebase Project**: Create a project at [firebase.google.com](https://firebase.google.com).
2.  **Firestore**: Enable Firestore Database in test mode (or production with rules).
3.  **App Registration**: Register a "Web App" in Firebase settings to get the configuration (API Key, etc).

## Setup Steps

### 1. Web App Configuration
1.  Rename `.env.example` to `.env`.
2.  Fill in the Firebase configuration values from your Firebase Console.

### 2. Backend Configuration
1.  Go to Firebase Console -> Project Settings -> Service Accounts.
2.  Generate a new private key.
3.  Save the file as `serviceAccountKey.json` into `c:\projects\TruthLens-ext\backend\`.

### 3. Running the System
1.  **Backend**:
    ```bash
    cd backend
    venv\Scripts\activate
    python server.py
    ```
2.  **Web App**:
    ```bash
    cd web
    npm install
    npm run dev
    ```
3.  **Extension**:
    Reload the extension in `chrome://extensions`.

## Usage
Clicking "Fact Check" in the extension will now open a new tab with the detailed report.
