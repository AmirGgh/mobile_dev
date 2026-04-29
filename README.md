# TriPro Mobile 🏊‍♂️ 🚴‍♂️ 🏃‍♂️

The official mobile application for the TriPro coaching platform. Built with Expo, React Native, and NativeWind.

## 🏗 Architecture: Unified Backend

This app is configured to use the **Unified TriPro Backend**. Instead of talking directly to Supabase or AI services, all requests are proxied through the central API. This ensures:
- **Centralized Security**: API keys (Gemini, Supabase) are managed on the server.
- **Consistent Data**: Both web and mobile share the exact same database and logic.
- **Improved Performance**: Heavy lifting is handled by the Node.js backend.

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/)
- [Expo Go](https://expo.dev/go) app on your phone (for development)

### 2. Installation
```bash
npm install
```

### 3. Configuration
Create a `.env` file (or update the existing one):
```env
EXPO_PUBLIC_API_URL=http://your-vm-ip:4000
```
> [!IMPORTANT]
> If testing on a physical device, use your computer's local IP or your VM's public IP instead of `localhost`.

### 4. Development
```bash
npx expo start
```
Scan the QR code with your phone to open the app.

## 📱 Building for Android (APK)

We use **EAS Build** for continuous integration and delivery.

### Local Build
To trigger a build from your machine:
```bash
npx eas-build --platform android --profile preview
```

### CI/CD Pipeline
The app uses a 3-stage automated pipeline:
1. **🧪 Test**: Runs on every push and PR (Linting + Type-check).
2. **📱 Preview**: Generates an installable APK on every push to `main`.
3. **🚀 Deploy**: Builds a production AAB and submits it to the Play Store when a version tag (e.g., `v1.0.1`) is pushed.

### CI/CD Setup
1. **EXPO_TOKEN**: Generate at [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens).
2. **GOOGLE_SERVICES_JSON**: (For Play Store) Upload your Google Service Account key as a GitHub Secret.
3. **Project ID**: Run `npx eas build:configure` once locally.

## 🛠 Project Structure
- `app/`: Expo Router file-based routing.
- `lib/api.ts`: Unified API client (Supabase-compatible).
- `lib/ai-service.ts`: Wrapper for backend AI functions.
- `components/`: Shared UI components.
- `assets/`: Icons, splash screens, and images.
