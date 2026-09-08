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

## Ingested Agent Skills & Capabilities (AITMPL Standards)
The following capabilities sourced from `https://www.aitmpl.com/skills/` are formally ingested into the agent operating system:

1. **Frontend Design & UI/UX Pro Max:**
   - Deliver high aesthetic fidelity, balanced typography (1.25+ scale step ratio), accessible contrast (WCAG AA), and intentional whitespace.
   - Utilize micro-interactions, responsive mobile-to-desktop grid systems, and cohesive design tokens across Tailwind CSS and modern React components.
   - Eliminate generic AI templates ("AI slop") by enforcing optical spacing, mathematical container-to-child padding ratios, and strict single-screen focus.

2. **Senior Architect & Fullstack Development:**
   - Enforce modular domain-driven architecture with clean layer separation (Controllers, Services, Data Utilities, State Stores).
   - Implement type-safe server proxies (`/api/*`) that encapsulate sensitive backend integrations and prevent any browser-side secret leakage.
   - Ensure zero-latency local fallback mechanisms when operating in static hosting environments.

3. **Senior Code Reviewer & Static Analysis:**
   - Conduct preemptive static analysis across all modified files to eliminate fatal syntax errors, broken imports, and type mismatches.
   - Guard against CommonJS / ESM bundling collisions (e.g. avoiding `import.meta.url` in esbuild CommonJS bundles).
   - Require passing validation through `npm run lint` and `npm run build` on every iteration.

4. **Senior Prompt Engineer & Agent Workflow Designer:**
   - Formulate high-precision prompt templates utilizing schema-enforced JSON outputs, structured few-shot demonstrations, and deterministic system framing.
   - Implement dynamic prompt routing based on active domain context, user financial profile, and active currency selection.

5. **DevOps & Pipeline Automation:**
   - Maintain resilient GitHub Actions workflows with conditional lockfile caching, robust fallback dependency installation, and automated GitHub Pages artifact deployment.
   - Guarantee automatic generation and publication of live web application deployment URLs in GitHub Step Summaries.

6. **Security & Vulnerability Auditing:**
   - Strict server-side secret isolation for all AI and database credentials.
   - Client-side input sanitization, safe checksum verification on exported state payloads, and CORS restriction standards.

## Free LLM API Gateway & Multi-Provider Directory (Awesome-FreeLLM-APIs)
Ingested from `https://github.com/open-free-llm-api/awesome-freellm-apis` for current and future multi-model inference and fallback resilience:

1. **Integrated Free Provider Endpoints & Configurations:**
   - **Google Gemini (AI Studio):**
     - Base URL: `https://generativelanguage.googleapis.com/v1beta/openai/`
     - Models: `gemini-2.5-pro`, `gemini-2.0-flash`, `gemini-1.5-flash`, `gemini-1.5-flash-8b`
     - Format: OpenAI SDK Compatible or `@google/genai` native
     - Authentication: `process.env.GEMINI_API_KEY`
   - **Groq:**
     - Base URL: `https://api.groq.com/openai/v1`
     - Models: `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, `mixtral-8x7b-32768`
     - Format: OpenAI SDK Compatible (`Authorization: Bearer <GROQ_API_KEY>`)
     - Advantage: Ultra-fast LPUs for high-throughput inference
   - **OpenRouter (Unified Gateway):**
     - Base URL: `https://openrouter.ai/api/v1`
     - Models: `openrouter/auto`, `deepseek/deepseek-r1:free`, `meta-llama/llama-3.3-70b-instruct:free`, `qwen/qwen-2.5-coder-32b-instruct:free`
     - Format: OpenAI SDK Compatible (`Authorization: Bearer <OPENROUTER_API_KEY>`)
     - Advantage: Access to 400+ models with zero-credit-card free tiers
   - **NVIDIA NIM:**
     - Base URL: `https://integrate.api.nvidia.com/v1`
     - Models: `meta/llama-3.3-70b-instruct`, `mistralai/mistral-large-2-instruct`, `qwen/qwen2.5-72b-instruct`
     - Format: OpenAI SDK Compatible (`Authorization: Bearer <NVIDIA_API_KEY>`)
   - **Hugging Face Serverless Inference:**
     - Base URL: `https://api-inference.huggingface.co/v1`
     - Models: Open-weights collection (`meta-llama/Llama-3.3-70B-Instruct`, `Qwen/Qwen2.5-Coder-32B-Instruct`)
     - Authentication: `process.env.HF_TOKEN`
   - **Cloudflare Workers AI:**
     - Base URL: `https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/`
     - Models: `@cf/meta/llama-3.3-70b-instruct`, `@cf/qwen/qwq-32b`
   - **GitHub Models:**
     - Base URL: `https://models.inference.ai.azure.com`
     - Models: `gpt-4o`, `DeepSeek-R1`, `Llama-3.3-70B-Instruct`
     - Authentication: `process.env.GITHUB_TOKEN` (no credit card required)

2. **Multi-Provider Fallback & Orchestration Architecture:**
   - Server-side AI proxy handlers should implement sequential provider cascade:
     1. Primary: Google Gemini (`gemini-2.5-pro` / `gemini-2.0-flash` / `gemini-1.5-flash`)
     2. Secondary Failover: Groq (`llama-3.3-70b-versatile`)
     3. Tertiary Failover: OpenRouter Free Tier (`deepseek/deepseek-r1:free`)
   - Exponential backoff retry on HTTP 429 (Rate Limit / Quota Exceeded) and automatic payload failover.
   - Uniform response normalization preserving schema consistency regardless of underlying LLM provider.

## Ingested Agent Optimization Harness & Architecture Systems
Ingested for current and future application development across all projects, sessions, and agents (Developed by Ammar Thaqif):

### 1. ECC: Agent Harness Performance Optimization System (`affaan-m/ecc`)
- **Harness & Context Optimization:**
  - Enforce research-first development: verify dependencies, analyze code structure, and review existing implementations before generating new code.
  - Active context window budgeting: prune redundant prompt context and focus working memory strictly on target tasks.
- **Agent Roles & Performance Shims:**
  - Ingest ECC's 68 agent personas, 286 skills, and 94 command shims covering Architecture, Planning, Review, Build Repair, and Security.
  - Test-driven validation: always verify modifications through targeted build and lint commands.
  - Self-review loop: review diffs and edge cases prior to finalizing work.
- **AgentShield Security Standards:**
  - Automated security scanning of dependencies and execution scripts.
  - Prevention of unauthorized file writes or secret exfiltration.

### 2. Awesome LLM Apps & Multi-Agent Systems (`Shubhamsaboo/awesome-llm-apps`)
- **RAG & Agentic Architecture Patterns:**
  - **Autonomous & Agentic RAG:** Dynamic retrieval, semantic query routing, document chunking, and self-correcting retrieval pipelines.
  - **Local & Hybrid RAG:** Offline-capable vector stores with optional cloud fallback.
  - **Multi-Agent Orchestration:** Hierarchical, sequential, and collaborative agent workflows (e.g. planner $\to$ researcher $\to$ coder $\to$ reviewer).
- **Domain-Specific AI Applications:**
  - Ready-to-deploy architectural patterns for Finance, Investment, Legal, Data Analysis, and Code Intelligence.
  - "Chat with X" multi-modal paradigms (Chat with PDFs, GitHub repos, databases, live web data).
- **Provider-Agnostic Engine:**
  - Dynamic switching across Google Gemini, Claude, OpenAI, and local open-source models via standardized configuration.

### 3. Agency Agents: 51 AI Agency Personas & Runbooks (`msitarzewski/agency-agents`)
- **Full-Spectrum Agency Roles:**
  - Ingest 51 specialized agent personas across Engineering, Product, Strategy, Design, Marketing, and Operations.
  - Standardized agent persona structure: Identity, Core Mission, Behavioral Traits, Workflows, Deliverables with code standards, and Success Metrics.
- **Orchestrated Scenario Runbooks:**
  - **Startup MVP Runbook:** Rapid prototype scaffolding with validated product architecture and production deployment.
  - **Enterprise Feature Runbook:** Thorough specification, security review, modular code implementation, and automated test coverage.
  - **Security & Refactor Runbook:** Static analysis, vulnerability mitigation, and zero-downtime refactoring.
- **Execution Standards:**
  - Local-first architecture, typed IPC patterns, zero telemetry, and cross-platform compatibility across AI coding harnesses.

### 4. Agent-Reach: Keyless Universal Web & Platform Reach (`Panniantong/agent-reach`)
- **Zero-Fee, Keyless Web Access:**
  - Enable AI agents to search and ingest content across 13+ public platforms (Twitter/X, Reddit, YouTube transcripts, GitHub, Web Search, Bilibili) without paid API keys.
  - Utilize lightweight scraping, public search indexing, and transcript extraction.
- **Model Context Protocol (MCP) Compliance:**
  - Standardized stdio server integration conforming to modern MCP specifications.
- **Self-Healing Diagnostics:**
  - Built-in `doctor` pattern to auto-detect broken dependencies, network timeouts, and selector updates, triggering automatic recovery.
