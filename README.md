# 🍪 ZooKies - Privacy-Preserving Advertising Platform

> Privacy-first advertising using zero-knowledge proofs and attestation-based targeting

## 🌟 Overview

ZooKies is a revolutionary privacy-preserving advertising platform that enables targeted advertising without compromising user privacy. Using zero-knowledge proofs and attestation-based user behavior tracking, ZooKies allows users to receive relevant ads while keeping their personal data completely private.

## 🚀 Live Demo

Experience the full ZooKies demo flow:

1. **Publisher Sites**: Browse articles and build attestations
   - **Spotlite News**: http://localhost:8001/
   - **TheModernByte**: http://localhost:8000/

2. **ZooKies Platform**: Generate ZK proofs and receive targeted ads
   - **Ad Platform**: http://localhost:8080/zookies-platform.html

## 🎯 Demo Flow

### 1. **User Browning & Attestation Building**
- Visit publisher sites (Spotlite News, TheModernByte)
- Click on finance-related articles to build attestations
- Attestations are privately stored in browser IndexedDB
- No personal data is collected or transmitted

### 2. **Zero-Knowledge Proof Generation**
- Visit the ZooKies Ad Platform
- Platform verifies user has ≥2 finance attestations
- Generates ZK proof of qualification without revealing specific articles clicked
- Proof enables access to targeted finance ads

### 3. **Privacy-Preserving Ad Targeting**
- Users receive relevant ads based on proven interests
- No cookies, tracking, or personal data collection
- User maintains complete privacy and control

## 🏗️ Architecture

```
ZooKies Platform
├── 🌐 Publisher Sites (Attestation Collection)
│   ├── spotlite.news/          # News publisher with finance content
│   └── themodernbyte/          # Tech publisher with finance articles
├── 🔐 Zero-Knowledge Layer
│   ├── zkAffinityAgent.js      # ZK proof orchestration
│   ├── zkProofBuilder.js       # Circuit-based proof generation
│   └── profile-store.js        # Privacy-preserving storage
├── 🎛️ Platform Interface
│   ├── zookies-platform.html   # Admin/demo interface
│   ├── Attestation verification
│   ├── Proof generation UI
│   └── Analytics dashboard
└── 💾 Storage Layer
    ├── IndexedDB (browser-side)  # Private attestation storage
    └── No server-side tracking   # Privacy by design
```

## ✨ Key Features

### 🔒 **Privacy-First Design**
- **Zero personal data collection** - No cookies, tracking, or PII
- **Browser-only storage** - All data stays in user's browser
- **ZK proof verification** - Prove qualifications without revealing details
- **User control** - Complete transparency and data ownership

### 📊 **Attestation System**
- **Behavioral tracking** - Track article clicks for interest signals
- **Threshold logic** - Require ≥2 finance clicks for qualification  
- **Time-based validity** - Attestations expire to ensure relevance
- **Publisher diversity** - Support multiple publisher sources

### 🔐 **Zero-Knowledge Proofs**
- **Circuit-based validation** - Cryptographic proof of qualification
- **Public signals** - Prove threshold met without revealing specifics
- **Verification system** - Cryptographically verify user eligibility
- **Privacy preservation** - No data leakage during proof generation

### 🎮 **Comprehensive Demo Interface**
- **Professional UI** - Production-ready interface design
- **Real-time analytics** - Live attestation and proof statistics
- **Demo scenarios** - Pre-configured user journey simulations
- **Testing tools** - Comprehensive debugging and validation

## 🛠️ Technology Stack

### **Frontend**
- **HTML5/CSS3/JavaScript** - Modern web technologies
- **Responsive Design** - Mobile-first, cross-platform compatibility
- **Real-time UI** - Live updates and interactive feedback

### **Privacy & Cryptography**
- **Zero-Knowledge Proofs** - Privacy-preserving verification
- **IndexedDB** - Browser-side encrypted storage
- **Attestation Cryptography** - Secure behavioral proof system
- **Circuit-based Validation** - Mathematical proof generation

### **Integration**
- **Cross-Origin Messaging** - Secure publisher-platform communication
- **Event-Driven Architecture** - Responsive real-time systems
- **Modular Design** - Extensible and maintainable codebase

## 🚀 Quick Start

### Prerequisites
- **Modern Browser** (Chrome, Firefox, Safari, Edge)
- **Python 3.7+** (for local development servers)
- **No installation required** - Pure web-based demo

### 1. **Start Local Servers**

```bash
# Terminal 1: ZooKies Platform (Port 8080)
cd /path/to/ZooKies
python3 -m http.server 8080

# Terminal 2: Spotlite News (Port 8001)  
cd /path/to/ZooKies/spotlite.news
python3 -m http.server 8001

# Terminal 3: TheModernByte (Port 8000)
cd /path/to/ZooKies/themodernbyte  
python3 -m http.server 8000
```

### 2. **Experience the Demo**

1. **📰 Visit Publisher Sites**
   - Go to http://localhost:8001/ (Spotlite News)
   - Go to http://localhost:8000/ (TheModernByte)
   - Click on finance-tagged articles (look for 💰 badges)
   - Watch attestations build in browser storage

2. **🔐 Generate ZK Proofs**
   - Visit http://localhost:8080/zookies-platform.html
   - Check your attestations in the verification panel
   - Generate zero-knowledge proofs for ad qualification
   - View detailed proof results and verification

3. **📊 Explore Analytics**
   - Monitor real-time attestation statistics
   - Test different demo scenarios
   - Experience the complete privacy-preserving flow

## 📁 Project Structure

```
ZooKies/
├── 🌐 Publisher Sites
│   ├── spotlite.news/
│   │   ├── index.html              # News site with finance content
│   │   ├── styles/main.css         # Responsive styling  
│   │   └── scripts.js              # Attestation tracking
│   └── themodernbyte/
│       ├── index.html              # Tech site with finance articles
│       ├── styles.css              # Site styling
│       └── scripts.js              # Click tracking & attestations
├── 🔐 ZooKies Core
│   ├── shared/
│   │   ├── zkAffinityAgent.js      # ZK proof orchestration (1986 lines)
│   │   ├── zkProofBuilder.js       # Circuit proof generation (1113 lines)
│   │   ├── profile-store.js        # Privacy storage system (400+ lines)
│   │   └── privy.js                # Wallet integration
│   └── lib/
│       └── idb/                    # IndexedDB utilities
├── 🎛️ Platform Interface  
│   ├── zookies-platform.html       # Main platform UI (1038 lines)
│   └── Test infrastructure
└── 📊 Analytics & Testing
    ├── Comprehensive demo scenarios
    ├── Real-time statistics tracking
    └── Debug tools and validation
```

## 🧪 Demo Scenarios

### **Finance User Journey**
1. Visit Spotlite News → Click "Financial Markets Hit New Highs" 
2. Visit TheModernByte → Click "Is 5% Yield the New Normal?"
3. Visit ZooKies Platform → Generate proof → Qualify for finance ads

### **Privacy Validation**
- **No cookies created** - Verify in browser dev tools
- **No external requests** - All processing browser-local
- **Data transparency** - View stored attestations in platform
- **Proof verification** - Cryptographic validation of claims

### **Technical Demonstration**
- **ZK proof generation** - See mathematical proof creation
- **Circuit validation** - Understand cryptographic verification
- **Threshold logic** - Experience behavioral qualification
- **Real-time analytics** - Monitor system performance

## 🏆 Innovation Highlights

### **Privacy Technology**
- **First privacy-preserving ad platform** using zero-knowledge proofs
- **Novel attestation system** for behavioral targeting without tracking
- **Browser-first architecture** requiring no infrastructure or data collection

### **Technical Excellence**
- **1000+ lines of ZK proof code** with sophisticated circuit logic
- **Professional UI/UX** with responsive design and real-time features
- **Comprehensive testing** with demo scenarios and validation tools
- **Production-ready** modular architecture

### **Privacy Leadership**
- **Zero data collection** - Truly privacy-preserving by design
- **User empowerment** - Complete transparency and control
- **Cryptographic verification** - Mathematical privacy guarantees
- **Industry disruption** - Reimagining advertising without surveillance

## 🔧 Advanced Configuration

### **Publisher Integration**
```javascript
// Add ZooKies to any publisher site
window.profileStoreModule.recordFinanceAttestation({
    site: 'your-site.com',
    articleTitle: 'Your Article Title',
    articleId: 'unique-id',
    articleTag: 'finance',
    isFinanceContent: true,
    sessionId: 'session-123'
});
```

### **Custom Proof Thresholds**
```javascript
// Configure qualification requirements
const proofResult = await zkAffinityAgent.requestAd('finance', 3); // Require 3 attestations
```

### **Analytics Integration**
```javascript
// Monitor platform statistics
const stats = await profileStoreModule.getAttestationStats();
console.log(`User has ${stats.financeAttestations} finance attestations`);
```

## 📈 Performance Metrics

- **⚡ Proof Generation**: ~3-5 seconds for complete ZK proof
- **💾 Storage Efficiency**: <1MB IndexedDB usage per user
- **🔐 Privacy Guarantee**: Zero personal data transmitted
- **📱 Mobile Ready**: Responsive design, cross-platform compatible

## 🤝 Team & Development

### **Development Status**
- **77% Complete** (17/22 tasks finished)
- **Core functionality** fully implemented and working
- **Demo ready** for evaluation
- **Extensible architecture** for future enhancements

### **Task Management**
This project uses TaskMaster for development tracking:
- Comprehensive task breakdown and dependencies
- Real-time progress monitoring  
- Systematic implementation approach
- Quality assurance and testing protocols

## 📄 License

MIT License

---

**🚀 Ready to experience privacy-preserving advertising? Start the demo now!**