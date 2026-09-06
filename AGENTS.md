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
   - **GitHub Actions Lockfile Requirement (Mandatory Directive):**
     - GitHub's `actions/setup-node@v4` with `cache: 'npm'` strictly requires `package-lock.json` (it does not recognize `bun.lock`).
     - Always generate and maintain `package-lock.json` in the root repository.
     - In `.github/workflows/ci.yml`, always use conditional caching: `cache: ${{ hashFiles('package-lock.json') != '' && 'npm' || '' }}`.
     - In installation steps, always use fallback resilience:
       ```bash
       if [ -f package-lock.json ]; then npm ci; else npm install; fi
       ```
   - **Live Web App URL Generation Protocol (GitHub Pages & Deployments):**
     - When pushing to GitHub, workflows must generate and report a live web app URL.
     - Configure Vite with relative base path (`base: './'`) in `vite.config.ts` so assets resolve accurately on any subpath or domain (e.g. `https://<owner>.github.io/<repo>/`).
     - Grant required permissions in workflow: `pages: write`, `id-token: write`.
     - Include `actions/configure-pages@v5`, `actions/upload-pages-artifact@v3` (targeting `./dist`), and `actions/deploy-pages@v4`.
     - Declare `environment: { name: 'github-pages', url: ${{ steps.deployment.outputs.page_url }} }` to register the deployment environment and surface the URL in GitHub repository tabs.
     - Print the deployed URL into `$GITHUB_STEP_SUMMARY` for immediate clickable access.
     - Note for GitHub Settings: Ensure repository **Settings > Pages > Build and deployment > Source** is set to **"GitHub Actions"**.
     - Provide fallback client-side state so static hosting operates seamlessly even without a live Express server.
4. **Dedicated User Database & Family Synchronization:**
   - Each registered user is provisioned a dedicated, isolated database partition managed by `UserDatabaseService`.
   - Automatic debounced persistence captures all user entries, account links, payment modifications, and settings without manual save triggers.
   - Cross-family synchronization enables secure export and import of encrypted/checksummed JSON packages between partners (e.g., husband and wife) with selective account merging and household ownership tagging.
5. **Multi-Currency System Architecture:**
   - Default application currency is Malaysian Ringgit (`MYR` / `RM`), with seamless support for `USD`, `SGD`, `EUR`, `GBP`, `IDR`, `JPY`, and `AUD`.
   - Utility functions `formatCurrency` and `getCurrencyConfig` must strictly accept `CurrencyCode | string` to eliminate runtime and compile-time TypeScript type mismatches (`TS2345`).
   - All financial projections, matrices, alert messages, installment impact charts, and AI advisor prompts must respect the user's selected active currency.
6. **Server Port & Process Resilience:**
   - The Express application in `server.ts` must bind strictly to port `3000` on host `0.0.0.0`.
   - When handling reload cycles, the server catches process termination signals (`SIGTERM`, `SIGINT`) to close open sockets and prevent `EADDRINUSE` port collision errors.
