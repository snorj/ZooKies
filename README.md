# ZooKies

Privacy-first advertising platform built on Ethereum attestations

## Overview

ZooKies is a revolutionary advertising platform that puts user privacy first while enabling targeted advertising through cryptographic attestations. This implementation demonstrates the core concepts with two publisher sites and a shared ZooKies integration.

## Project Structure

```
zookies-step-1.1/
├── shared/                     # Shared ZooKies library files
│   ├── zkAffinityAgent.js      # Core ZooKies SDK
│   ├── database.js             # Database management
│   ├── cryptography.js         # Signing and verification
│   ├── styles.css              # Shared styling
│   └── publisher-keys.js       # Publisher cryptographic keys
├── themodernbyte/              # Tech-focused publisher site
│   ├── index.html
│   ├── styles.css
│   ├── scripts.js
│   └── articles/
├── smartlivingguide/           # Lifestyle-focused publisher site
│   ├── index.html
│   ├── styles.css
│   ├── scripts.js
│   └── articles/
├── database/                   # SQLite database files
│   └── zookies.db
├── scripts/                    # Utility scripts
├── server.js                   # Express.js API server
└── package.json
```

## Setup Instructions

### Prerequisites

- Node.js 16.0.0 or higher
- npm package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ZooKies
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Initialize the database**
   ```bash
   npm run init-db
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with hot reload
- `npm run init-db` - Initialize SQLite database

### Access Points

Once the server is running:

- **TheModernByte**: http://localhost:3000/themodernbyte
- **SmartLivingGuide**: http://localhost:3000/smartlivingguide
- **API Health**: http://localhost:3000/api/health

## Features

### Current Implementation (Step 1.1)

- ✅ Complete project structure setup
- ✅ Two publisher demo sites
- ✅ Express.js API server
- ✅ Basic ZooKies SDK placeholder
- ✅ Database integration setup
- ✅ Cryptographic signing framework

### Planned Features

- [ ] Ethereum attestation integration
- [ ] User wallet connection
- [ ] Ad click tracking
- [ ] Profile management
- [ ] Privacy-preserving targeting
- [ ] Publisher analytics dashboard

## Technology Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Backend**: Node.js, Express.js
- **Database**: SQLite3
- **Blockchain**: Ethereum (ethers.js)
- **Cryptography**: ECDSA signing

## Contributing

This is a demonstration project for the ZooKies privacy-first advertising platform. Please refer to the task management system for current development priorities.

## License

MIT License - see LICENSE file for details

## Support

For questions or issues, please refer to the TaskMaster system or contact the development team.