# 🚀 Solana Crowdfunding Platform

A decentralized crowdfunding platform built on Solana blockchain. Create campaigns, donate SOL, and track funding progress transparently on-chain.

## ✨ Features

- ✅ Create crowdfunding campaigns with custom goals and deadlines
- ✅ Donate SOL to campaigns with one click
- ✅ Real-time progress tracking
- ✅ Secure fund withdrawal by creators
- ✅ Transparent on-chain record of all donations
- ✅ Campaign categorization and filtering
- ✅ Mobile-responsive design
- ✅ Wallet integration (Phantom, Solflare, etc.)

## 🏗️ Architecture

Smart Contract (Rust)

├── Create Campaign

├── Donate to Campaign

├── Withdraw Funds

├── Cancel Campaign

└── Update Campaign


Frontend (React/Next.js)

├── Wallet Integration

├── Campaign Dashboard

├── Donation Interface

└── Real-time Updates


## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Rust 1.70+
- Solana CLI 1.17+
- Git

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/klausnat/solana-crowdfunding.git
cd solana-crowdfunding
```

2. **Install dependencies**  

# Program (Rust)
cd program
cargo build

# Frontend
cd ../app
npm install

3. **Setup Solana Environment**    

solana config set --url devnet
solana-keygen new

4. **Deploy the program**    

cd program
cargo build-bpf
solana program deploy ./target/deploy/solana_crowdfunding.so

5. **Update program ID**    

# Copy the deployed program ID and update:
# - app/src/utils/program.ts
# - tests/crowdfunding.test.ts

6. **Run the frontend**

cd app
npm run dev

📁 Project Structure

solana-crowdfunding/
├── program/                 # Solana program (Rust)
│   ├── src/
│   │   └── lib.rs          # Main program logic
│   └── Cargo.toml
├── app/                    # Frontend application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/         # Next.js pages
│   │   └── utils/         # Program client
│   └── package.json
├── tests/                  # Integration tests
└── .github/               # CI/CD workflows

🔧 Testing

Run the test suite:
bash

# Unit tests for Rust program
cd program
cargo test

# Integration tests
cd tests
npm test

🌐 Deployment
Devnet Deployment

    Deploy program to devnet

    Update program ID in frontend

    Deploy frontend to Vercel/Netlify

Mainnet Deployment

    Audit the smart contract

    Deploy program to mainnet-beta

    Update configuration

    Deploy frontend

📄 License

MIT License - see LICENSE file for details
🤝 Contributing

    Fork the repository

    Create a feature branch

    Commit your changes

    Push to the branch

    Open a Pull Request

💬 Support

For support, open an issue or join our Discord community.
🎯 Roadmap

    Multi-token support (USDC, etc.)

    NFT rewards for donors

    Governance voting

    Milestone-based funding

    Social sharing features

    Analytics dashboard
