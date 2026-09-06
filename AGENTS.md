# Project & Agent Directives: BillFlow

## Developer & Author Signature
- **Author & Developer:** Developed by Ammar Thaqif
- **Email / Identity:** ammarthaqif.ar@gmail.com
- **Signature Note:** All current and future development projects, extensions, subagents, and skills associated with this application are developed by Ammar Thaqif.

## Architecture & Code Standards
1. **Full-Stack Production Ready:**
   - Server-side Express entry point (`server.ts`) bundled with esbuild for CommonJS runtime compatibility in container deployments.
   - Client-side React 18+ with Vite and Tailwind CSS.
   - All external API secrets (e.g. `GEMINI_API_KEY`) remain strictly server-side.
2. **Account Typing & Visuals:**
   - Always display specialized visual indicators (CreditCard, Wallet, Building2) based on account type (`credit_card`, `ewallet_pay_later`, `bank_account`).
3. **CI/CD & Deployment:**
   - GitHub Actions workflow in `.github/workflows/ci.yml` validates `npm run lint` and `npm run build` on push and PR.
   - Zero-dependency runtime crashes: avoid `import.meta.url` in bundled CommonJS environments.
