# BillFlow - Smart Payment Sequencer & Cash Flow Strategizer

> **Developed by Ammar Thaqif**

BillFlow is a full-stack financial application designed to calculate cost-effective grace period payment sequences across credit cards and e-wallet "pay later" accounts (e.g. SPayLater, GrabPay Later, Klarna, Apple Pay Later), eliminate late penalties, track multi-month installment plans, and project long-term cash flow.

---

## Key Features

- **Cost-Effective Sequencing Engine**: Choose between **Grace Float Maximizer**, **Debt Avalanche** (high APR first), **Debt Snowball** (lowest balance first), and **Cash Flow Buffer** (paycheck-synchronized).
- **Dynamic Account Type Icons**: Distinctive visual icons for Credit Cards, E-Wallet Pay Later services, and Bank Credit Lines.
- **Grace Float Arbitrage Matrix**: Visual breakdown of billing cycles, cutoff dates, and interest-free float windows.
- **Multi-Month Installments Tracker**: Categorized BNPL & installment tracking with automated 6-month cash outflow step-down projections.
- **AI Cash Flow & Debt Advisor**: Integrated with Google Gemini 3.8 Flash (`@google/genai`) for personalized optimization advice.
- **Open Banking Gateway Simulator**: Sync live balances and statement dates or configure custom cards and e-wallets.
- **Zero-Late-Fee Alert Rules**: Customizable notifications (1, 3, 5, 7 days prior to deadline).

---

## Quick Start

### Prerequisites
- Node.js 20+
- npm 10+

### Installation
```bash
git clone <your-repo-url>
cd billflow
npm install
```

### Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Provide the required variables:
```env
GEMINI_API_KEY="your-gemini-api-key"
```

### Development
Start the full-stack dev server (Express backend + Vite middleware on port 3000):
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

### Production Build & Launch
Compile the Vite client into `dist/` and bundle the Express server into `dist/server.cjs`:
```bash
npm run build
npm run start
```

### Continuous Integration & Deployment (GitHub Actions)
The repository includes a complete CI/CD workflow (`.github/workflows/ci.yml`) that triggers on every push to `main` / `master`:
1. Installs dependencies using fallback-resilient npm lockfile detection.
2. Runs ESLint and TypeScript checks (`npm run lint`).
3. Compiles the optimized production build (`npm run build`).
4. **Deploys directly to GitHub Pages** and generates a live web application URL, printed directly in the GitHub Actions summary and linked in the repository's **Environments** tab.

> **Note to enable GitHub Pages on your repository:**  
> Go to your GitHub repository **Settings** → **Pages** → under **Build and deployment / Source**, select **GitHub Actions**. Upon your next push, your live web app URL (e.g. `https://<your-username>.github.io/BillFlow/`) will be generated automatically!

---

## Author & Attribution

**Developed by Ammar Thaqif**  
Email: `ammarthaqif.ar@gmail.com`
