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


👜 Fermoza Mobile App
Official Flutter E-Commerce App for Fermoza.store
Built for Android & iOS. Powered by Shopify Checkout, Firebase, and Mika AI Stylist.

📌 Overview
The Fermoza App is a full-featured e-commerce mobile application designed for personalized fashion discovery and seamless checkout using Shopify’s secure hosted checkout.

It includes:

🛍 Product browsing (collections, PDPs, search)
🛒 Shopping cart with variant support
🔐 Google / Facebook login
💳 Secure Shopify Hosted Checkout (webview)
🧠 Mika AI Stylist – an AI concierge designed to help users style outfits and recommend Fermoza products
🚚 Order tracking UI
🔔 Push notifications (FB Live alerts, promos)


🧱 Architecture Summary
Layer	Description	Technologies
UI + State	Flutter screens & global state	Flutter, Provider
Backend Commerce	Shopify Storefront API	GraphQL, Storefront API
Checkout	Shopify Hosted Checkout	WebView
Push Notifications	Marketing & Live Alerts	Firebase Messaging
AI Stylist	Mika AI (chat, recommendations, styling tips)	API endpoint (HTTP)


📂 Project Structure
lib/
 ├─ main.dart
 ├─ screens/          # All UI screens (Home, PDP, Cart, Checkout, Stylist, Orders, etc.)
 ├─ services/         # Shopify, Checkout, AI, Tracking, Notifications, Shipping
 ├─ providers/        # Cart, Auth, Live
 ├─ models/           # Product, Order, User, Address, StylistProfile
 ├─ theme/            # Colors, typography, theme
 ├─ utils/            # Helpers (currency, text, etc.)
 └─ widgets/          # Reusable UI components
assets/
.env
.env.prod
README.md

⚙️ Environment Setup
.env (Development)
SHOP_DOMAIN=fermoza.myshopify.com
STOREFRONT_ACCESS_TOKEN=xxxxx
MIKA_BASE=https://api.fermoza.store

.env.prod (Production)

SHOP_DOMAIN=fermoza.myshopify.com
STOREFRONT_ACCESS_TOKEN=xxxxx
MIKA_BASE=https://api.fermoza.store

🚀 Running Locally
flutter pub get
flutter run

Production build:
flutter build apk --dart-define-from-file=.env.prod

🔐 Authentication
Google Sign-In
Facebook Login
Users are stored locally in AuthService
Email is passed to Shopify Checkout for identity inside Shopify

🛒 Checkout Flow (Final)
The official checkout flow used in production:
Add to Cart → Sign In → Shopify Secure Checkout (WebView)
No redundant native checkout steps.
All orders exist inside Shopify as the single source of truth.

🧠 Mika AI Stylist
Mika functions as:
✓ AI Personal Stylist
Understands user body type / preferences
Helps choose outfits
Suggests Fermoza products

✓ AI Concierge
Answers questions
Helps with product selection
Knows Fermoza catalog
Learns from previous conversation context

✓ “Buy the Look” (coming back)

Provides a curated set of Fermoza items that match user messages like:

“I need a bag for a wedding outfit.”
“What should I wear with this dress?”

🧩 Key Technical Files

File	Purpose
lib/services/shopify_service.dart	All Shopify API operations
lib/services/checkout_service.dart	Unified checkout creator
lib/screens/shopify_checkout_screen.dart	Webview checkout
lib/screens/stylist_chat_screen.dart	Mika chat UI
lib/services/mika_service.dart	AI stylist backend integration

📦 Deployment
APK/AAB uploaded to Google Play uses .env.prod automatically.

© License
Proprietary © 2025 Fermoza
