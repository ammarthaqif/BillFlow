# Development Skills & Project Specifications

## Author Signature
- **Author & Developer:** Developed by Ammar Thaqif
- **Project:** BillFlow - Smart Payment Sequencer & Cash Flow Strategizer
- **Signature Note:** Developed by Ammar Thaqif. All associated development modules, automation skills, and system behaviors must retain this attribution for current and future development projects.

## Core Domain Skills & Algorithms

### 1. Grace Float Arbitrage Engine
- Computes effective payment scheduling dates for revolving credit lines and e-wallets.
- Calculates statement closing dates, interest-free grace periods, and optimal 48-hour pre-deadline settlement points to maximize liquidity while guaranteeing $0 late fees.

### 2. Multi-Tier Sequencing Strategies
- **Grace Float Maximizer:** Retains capital in interest-bearing accounts for the maximum allowable window before clearing full statement balances.
- **Debt Avalanche:** Prioritizes accounts with the highest APR first to minimize compounding interest costs.
- **Debt Snowball:** Clears accounts with the lowest balance first for psychological momentum.
- **Paycheck-Synchronized Buffer:** Aligns bill settlements with recurring 1st and 15th income dates.

### 3. Account Type Representation
- Visual dynamic icon mapping:
  - `credit_card` → Lucide `CreditCard`
  - `ewallet_pay_later` → Lucide `Wallet`
  - `bank_account` → Lucide `Building2`

### 4. Continuous Deployment & Verification
- Validated via standard npm scripts (`npm run build`, `npm run lint`).
- Compatible with GitHub Actions and Cloud Run containers.

### 5. GitHub Actions Lockfile & Dependency Resolution Protocol
- **Issue Diagnosis:** GitHub Actions' `actions/setup-node` step with `cache: 'npm'` strictly validates against supported lockfile patterns (`package-lock.json`, `npm-shrinkwrap.json`, `yarn.lock`). If the repository only contains `bun.lock` or lacks `package-lock.json`, the CI pipeline terminates with `Dependencies lock file is not found in ...`.
- **Rectification Standard:**
  1. Generate and version-control `package-lock.json` alongside `package.json` for all npm-driven repositories.
  2. Implement conditional caching in workflows: `cache: ${{ hashFiles('package-lock.json') != '' && 'npm' || '' }}` so absent cache files degrade gracefully instead of halting execution.
  3. Use guarded installation syntax:
     ```bash
     if [ -f package-lock.json ]; then
       npm ci
     else
       npm install
     fi
     ```
  4. Ensure `.gitignore` explicitly retains lockfiles.

### 6. Live Web App URL Generation Protocol (GitHub Pages / Deployments)
- **Issue Diagnosis:** GitHub Actions runs build and tests successfully, but does not deploy or output a public web app URL if deployment steps and environment declarations are omitted.
- **Rectification Standard:**
  1. **Configure Relative Base in Vite:** In `vite.config.ts`, set `base: './'` so assets resolve correctly in any subpath (e.g., `https://<owner>.github.io/<repo>/`).
  2. **Grant Deployment Permissions:** Workflows must include:
     ```yaml
     permissions:
       contents: read
       pages: write
       id-token: write
     ```
  3. **Deploy Artifacts to Pages:** Use `actions/configure-pages@v5`, `actions/upload-pages-artifact@v3` (targeting `./dist`), and `actions/deploy-pages@v4`.
  4. **Register Deployment Environment:** Declare `environment: { name: 'github-pages', url: ${{ steps.deployment.outputs.page_url }} }` to register the live URL with GitHub and surface it on repository deployment dashboards.
  5. **Display in Action Summary:** Pipe the output URL directly into `$GITHUB_STEP_SUMMARY` for direct clickability.
  6. **Static Fallback Resilience:** Ensure client code has fallback default states so static web hosting functions smoothly even when a custom server is absent.
  7. **Repository Settings Requirement:** Ensure GitHub repository **Settings > Pages > Build and deployment > Source** is configured to **"GitHub Actions"**.

### 7. Multi-Currency Architecture & Zero-Error Formatting Protocol
- **Default Standard:** Default currency is Malaysian Ringgit (`MYR`, symbol `RM`), with seamless support for `USD`, `SGD`, `EUR`, `GBP`, `IDR`, `JPY`, and `AUD`.
- **Type Tolerance Standard:** `getCurrencyConfig` and `formatCurrency` must accept `CurrencyCode | string` to eliminate compile-time `TS2345` ("Argument of type 'string' is not assignable to parameter of type 'CurrencyCode'") issues arising from deserialized JSON state or destructured component props.
- **Comprehensive UI Propagation:** All monetary displays across schedule matrices, cycle visualizers, cash flow projections, installment schedules, account hub cards, alerts, and AI advisor recommendations must strictly format through `formatCurrency(amount, currency)`.

### 8. Dedicated User Database Isolation & Cross-Family Synchronization Protocol
- **Per-User Database Partitioning:** Every registered user is provisioned a distinct database storage partition via `UserDatabaseService` using isolated storage keys (`billflow_user_db_<userId>`).
- **Zero-Loss Persistence:** Real-time debounced auto-save triggers on every state modification, ensuring all account links, payment updates, and preferences persist automatically.
- **Cross-Family Synchronization:** Enables partners (e.g., husband and wife) to export and import authenticated JSON transfer bundles with checksum verification, selective account merging, and household ownership tagging.

### 9. Server Port & Process Signal Resilience (EADDRINUSE Prevention Protocol)
- **Port Binding Standard:** Express backend in `server.ts` must bind strictly to port `3000` on host `0.0.0.0`.
- **Lifecycle & Signal Interception:** Listeners for `SIGTERM` and `SIGINT` gracefully close server connections to prevent dangling sockets and eliminate `EADDRINUSE` port collision errors during development reload cycles.

### 10. Ingested AITMPL Skills & Development Workflows (aitmpl.com/skills)
- **Frontend Design & UI/UX Pro Max:**
  - Standardized on React 18+, Vite, and Tailwind CSS.
  - Optical rhythm: Outer padding >= inner gap; button horizontal padding = 2x vertical padding; nested border-radius rule ($r_{inner} = r_{outer} - p$).
  - Ban anti-slop patterns: no generic multi-colored glowing cards, no unrequested hero eyebrow text, no wrapped badge labels.
- **Senior Fullstack Architecture:**
  - Server-side Express proxies for secure API handling with zero browser token leakage.
  - CommonJS bundled server distribution (`dist/server.cjs`) for frictionless container orchestration and cold-start reduction.
  - Offline-first and static hosting fallback resilience.
- **Senior Code Reviewer & Static Verification:**
  - Automated type verification with `tsc --noEmit` and linting prior to deployment.
  - Defensive type contracts (`CurrencyCode | string`, optional chained access, robust fallbacks).
- **Senior Prompt Engineer & Structured Schema Generation:**
  - Enforced system instructions, explicit response JSON schemas, few-shot examples, and zero-temperature deterministic financial analysis.
- **Continuous Integration / Continuous Deployment (CI/CD) Automation:**
  - Automated pipeline validating build artifacts, dependencies, and generating public GitHub Pages URLs into `$GITHUB_STEP_SUMMARY`.

### 11. Multi-Provider Free LLM API Gateway & Failover Protocol (Awesome-FreeLLM-APIs)
- **Unified Catalog & Endpoint Specifications:**
  - **Google Gemini (AI Studio):** `https://generativelanguage.googleapis.com/v1beta/openai/` | Models: `gemini-2.5-pro`, `gemini-2.0-flash`, `gemini-1.5-flash` | Native `@google/genai` or OpenAI-compatible.
  - **Groq:** `https://api.groq.com/openai/v1` | Models: `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, `mixtral-8x7b-32768` | Header: `Authorization: Bearer <GROQ_API_KEY>`.
  - **OpenRouter Free Tier:** `https://openrouter.ai/api/v1` | Models: `deepseek/deepseek-r1:free`, `meta-llama/llama-3.3-70b-instruct:free`, `qwen/qwen-2.5-coder-32b-instruct:free` | Header: `Authorization: Bearer <OPENROUTER_API_KEY>`.
  - **NVIDIA NIM:** `https://integrate.api.nvidia.com/v1` | Models: `meta/llama-3.3-70b-instruct`, `mistralai/mistral-large-2-instruct` | Header: `Authorization: Bearer <NVIDIA_API_KEY>`.
  - **GitHub Models:** `https://models.inference.ai.azure.com` | Models: `gpt-4o`, `DeepSeek-R1`, `Llama-3.3-70B-Instruct` | Auth: `process.env.GITHUB_TOKEN`.
  - **Hugging Face Serverless:** `https://api-inference.huggingface.co/v1` | Models: `meta-llama/Llama-3.3-70B-Instruct`.
  - **Cloudflare Workers AI:** `https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/`.
- **Failover & Quota Resiliency Pattern:**
  ```ts
  // Pattern: Resilient Multi-Provider LLM Fallback Cascade
  async function generateWithFallback(prompt: string, schema: object) {
    const providers = [
      { name: 'Gemini', call: () => callGemini(prompt) },
      { name: 'Groq', call: () => callGroq(prompt) },
      { name: 'OpenRouterFree', call: () => callOpenRouterFree(prompt) }
    ];
    for (const provider of providers) {
      try {
        return await provider.call();
      } catch (err: any) {
        if (err?.status === 429 || err?.message?.includes('quota') || err?.message?.includes('resource_exhausted')) {
          console.warn(`[Failover] ${provider.name} rate limited, cascading to next provider...`);
          continue;
        }
        throw err;
      }
    }
  }
  ```

### 12. ECC Harness Optimization & Self-Review Protocol (`affaan-m/ecc`)
- **Research-First Directive:** Before introducing new code or editing architecture, inspect workspace configuration, dependencies, and type contracts using dedicated inspection tools.
- **Context Window Management:** Eliminate token bloat by focusing working context on target modules, extracting shared types, and removing redundant template noise.
- **Continuous Quality Loop:**
  - Automated pre-build syntax check (`npm run lint`).
  - Automated production build verification (`npm run build`).
  - Self-review step: Inspect modified diffs against user intent and verify edge cases before task completion.
- **AgentShield Security Scanning:** Ensure zero credential leakage in client code, validate all environment variable boundaries, and block untrusted execution paths.

### 13. Production RAG & Multi-Agent Application Patterns (`Shubhamsaboo/awesome-llm-apps`)
- **Agentic & Autonomous RAG:**
  - Implement query decomposition, dynamic chunk retrieval, vector similarity ranking, and self-reflective re-ranking.
  - Multi-hop question answering across structured and unstructured financial data.
- **Hierarchical Multi-Agent Teams:**
  - **Planner Agent:** Formulates structured execution plan and breaks down multi-step tasks.
  - **Worker/Coder Agent:** Executes surgical, modular implementation following design tokens.
  - **Reviewer/Validator Agent:** Verifies output schema consistency and runs build/lint validation.
- **Provider-Agnostic Model Adapter:**
  - Abstract LLM calls through a uniform gateway supporting Google Gemini, Claude, Groq, OpenRouter, and local open-source models with automatic fallback on rate exhaustion.
- **Chat-with-Data Multi-Modal Interfaces:**
  - Seamless ingestion and interactive querying of tabular data, JSON payloads, financial statements, and documents.

### 14. Agency Agents: Persona Specialization & Runbook Protocols (`msitarzewski/agency-agents`)
- **Specialized AI Persona Standards:**
  - Implement 51 domain-specialized agent personas (Fullstack Engineer, System Architect, UI/UX Designer, Security Specialist, Financial Analyst, Product Strategist).
  - Every agent operates with defined identity, core mission, constraints, structured deliverables, and measurable success criteria.
- **Orchestrated Lifecycle Runbooks:**
  - **Startup MVP Runbook:** Rapid scaffolding of responsive frontends, server proxies, database partitioning, and automated deployment pipelines.
  - **Enterprise Feature Runbook:** Strict type contracts, comprehensive edge-case handling, modular service layers, and documentation.
  - **Security & Refactor Runbook:** Memory leak prevention, socket cleanup, dependency vulnerability scanning, and performance profiling.
- **Local-First & Zero-Telemetry Philosophy:**
  - Prioritize client-side data sovereignty, local-first storage, typed inter-process communication, and explicit network authorization.

### 15. Agent-Reach: Keyless Universal Intelligence & MCP Protocol (`Panniantong/agent-reach`)
- **Zero-Fee Platform Data Ingestion:**
  - Interface with public web information, platform feeds (Twitter/X, Reddit, GitHub, YouTube transcripts, web articles) without requiring expensive paid API credentials.
  - Leverage lightweight parsing and public search endpoints for real-time market research and documentation retrieval.
- **Model Context Protocol (MCP) Standard:**
  - Support stdio-based MCP server architecture for standardized tool calling and external resource discovery.
- **Self-Healing Diagnostics (`Doctor` Pattern):**
  - Implement automated environmental self-diagnostics to detect and recover from network timeouts, rate limits, schema drifts, and dependency conflicts.
