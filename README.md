# fermoza_new

A new Flutter project.

## Getting Started

This project is a starting point for a Flutter application.

A few resources to get you started if this is your first Flutter project:

- [Lab: Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Cookbook: Useful Flutter samples](https://docs.flutter.dev/cookbook)

For help getting started with Flutter development, view the
[online documentation](https://docs.flutter.dev/), which offers tutorials,
samples, guidance on mobile development, and a full API reference.



# 👜 Fermoza + Mika AI Stylist
> The official e-commerce + AI stylist mobile app for **Fermoza.store**, built with Flutter and powered by OpenAI/Gemini.

## 🧠 Overview
**Fermoza App** is a modern e-commerce mobile application that integrates with **Shopify** and features an intelligent stylist assistant — **Mika AI**. Users can browse, shop, and get personalized fashion advice powered by AI trained on the Fermoza catalog.

## 📦 Architecture Summary
| Layer | Description | Stack |
|-------|--------------|-------|
| **Frontend** | Flutter app (Android/iOS/Web) | Flutter + Provider + Firebase |
| **AI Backend (Mika)** | Node.js API serving chat, personalization, and recommendations | Express + OpenAI or Gemini |
| **Commerce Backend** | Shopify Storefront API | Shopify Store / Checkout Webview |
| **Deployment** | API hosted via Cloud Run / Render / Shopify App Proxy | HTTPS / CORS-secure endpoint |

## 📁 Folder Structure
fermoza_new/
├── lib/ # Flutter app source
│ ├── main.dart
│ ├── screens/
│ ├── services/
│ ├── models/
│ ├── providers/
│ └── theme/
├── mika_api/ # Node.js backend for Mika
│ ├── index.js
│ ├── package.json
│ └── .env / .env.prod
├── .env # Flutter local env
├── .env.prod # Flutter production env
└── README.md

shell
Copy code

## ⚙️ Environment Setup
### Flutter `.env.prod`
MIKA_BASE=https://api.fermoza.store
SHOP_URL=https://fermoza.store

shell
Copy code
> If using Shopify App Proxy instead:  
> `MIKA_BASE=https://fermoza.store/apps/mika`

### Mika API `.env`
PORT=8787
API_BASE=/api/mika
GEMINI_API_KEY=YOUR_GEMINI_OR_OPENAI_KEY

shell
Copy code

## 🚀 Running Locally
**Backend**
```bash
cd mika_api
npm install
npm run dev
# http://localhost:8787/api/mika/health
# http://localhost:8787/api/mika/chat
Flutter

bash
Copy code
flutter pub get
flutter run
# or for prod vars
flutter run --dart-define-from-file=.env.prod
🌍 Deployment Options
Option 1: Dedicated API (Recommended)
Host Node.js on Cloud Run / Render / Railway, then set:

ini
Copy code
MIKA_BASE=https://api.fermoza.store
Option 3: Shopify App Proxy (Brand-native URL)

Configure App Proxy to forward /apps/mika → your API host

Flutter:

ini
Copy code
MIKA_BASE=https://fermoza.store/apps/mika
🧩 Key Files
lib/services/mika_service.dart – talks to Mika API, caching

lib/screens/stylist_chat_screen.dart – chat UI

mika_api/index.js – Express server; forwards to OpenAI or Gemini; returns normalized JSON

🧱 Scaling
Cloud Run scales to 1000+ concurrent requests/region. For hundreds of chats/day, defaults are fine.

🛠 Quick Commands
Command	Description
npm run dev	Run Mika API locally
flutter run	Launch Flutter
flutter build apk --dart-define-from-file=.env.prod	Build prod APK

License
Proprietary © 2025 Fermoza / Incognito by Fermoza
'@ | Out-File -Encoding UTF8 README.md
