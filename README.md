# 🍪 ZooKies – Privacy-Preserving Advertising Platform

> Targeted ads with zero tracking, powered by attestations and zero-knowledge proofs

## 🌟 What is ZooKies?

ZooKies is a privacy-first ad platform that replaces surveillance-based tracking with **local attestations** and **ZK proofs**. Users receive relevant ads by proving interest in content categories—without exposing any personal data.

## 🚀 Live Demo

1. **Browse Publisher Sites** to build interest attestations:

   * [Spotlite News](http://localhost:8001/)
   * [TheModernByte](http://localhost:8000/)

2. **Visit Ad Platform** to verify and view targeted ads:

   * [ZooKies Platform](http://localhost:8080/zookies-platform.html)

## 🔄 Demo Flow

1. **User Interaction**

   * Click finance-tagged articles
   * Attestations saved locally (IndexedDB)
   * No cookies, no data collection

2. **ZK Proof Generation**

   * Ad platform verifies interest threshold (e.g., 2+ finance clicks)
   * ZK proof generated with no detail leakage

3. **Ad Targeting**

   * Proof unlocks personalized ad
   * All without exposing browsing history or identity

## 🧱 Architecture Overview

```
ZooKies/
├── Publisher Sites (Spotlite, TheModernByte)
├── ZK Layer (ProofBuilder, AffinityAgent, Profile Store)
├── Ad Platform UI (Proof Gen, Analytics)
└── Local Storage (IndexedDB only – no server)
```

## ✨ Key Features

* 🛡️ **Private by Design** – No tracking, no cookies, all local
* 🔐 **ZK Proofs** – Users prove interest without revealing behavior
* 📊 **Attestation System** – Tracks engagement privately
* 👨‍💻 **Demo UI** – Real-time stats, proof viewer, test tools

## 🛠️ Quick Start

```bash
# Start all 3 servers
python3 -m http.server 8080  # ZooKies Platform
python3 -m http.server 8001  # Spotlite News
python3 -m http.server 8000  # TheModernByte
```

Then visit the URLs above and follow the user flow.

## 🧪 Sample User Journey

1. Click 2+ finance articles across both publishers
2. Visit the ZooKies platform and generate a ZK proof
3. Unlock relevant ads without exposing your data

## 🧩 Tech Stack

* **Frontend**: HTML/CSS/JS, responsive UI
* **Storage**: Encrypted IndexedDB (local only)
* **Privacy**: ZK Proofs (Circom), ECDSA attestations
* **Integration**: Cross-origin messaging, modular code

**🔒 Experience the future of privacy-first advertising – Try the demo now.**
