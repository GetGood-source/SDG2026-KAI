# Smart Procurement System

An SME procurement MVP for requesting spare parts, comparing supplier quotations, obtaining human approval and tracking purchase orders and deliveries.

## Product and scope

- Starts with a Malaysian car repair shop, but part/model fields and configurable industry support other SME sectors.
- User requested a white-and-blue design.
- Five stages: request, connected stock/supplier data, explained decision, human approval, visible purchase/delivery outcome.
- Includes inventory management, supplier directory, searchable audit trail and CSV export.
- Shared demonstration workspace, without authentication or verified roles. Do not treat it as a production authorization system.
- Sample suppliers, ratings and quotations are marked Demo. New suppliers and quotes can be recorded manually.
- Google search opens externally when recorded sourcing is insufficient. Automated Google result ingestion is not connected.
- Follow-ups are saved drafts with an email-client handoff, not automatically sent messages.
- Purchase orders are recorded internally; no supplier order or payment is automatically submitted.
- Delivery receipt updates inventory. Historical quote amounts are not converted when currency settings change; currency changes are blocked when quotes exist.

## Run & operate

- API workflow: `artifacts/api-server: API Server`
- App workflow: `artifacts/smart-procurement: web`
- `pnpm run typecheck` — workspace TypeScript checks
- `pnpm --filter @workspace/api-spec run codegen` — regenerate clients and validation schemas
- `pnpm --filter @workspace/db run push` — development schema changes
- Database: preconfigured PostgreSQL through `DATABASE_URL`
- AI: Replit-managed OpenAI integration. AI explanation is requested explicitly from a request's decision stage.

## Stack and source locations

- React, Vite, Tailwind, Wouter and React Query in `artifacts/smart-procurement`.
- Shared Express API in `artifacts/api-server`.
- API contract: `lib/api-spec/openapi.yaml`.
- Database model: `lib/db/src/schema/procurement.ts`.
- Workflow rules and seeds: `artifacts/api-server/src/lib/procurement-*`.
- API route implementation: `artifacts/api-server/src/routes/procurement.ts`.
- AI client package: `lib/integrations-openai-ai-server`.

## Architecture decisions

- This small shared-workspace MVP stores a versioned-by-update workspace document in PostgreSQL. Transactions lock the row so each workflow transition, inventory update and audit entry commits atomically. Normalize entities before scaling to multi-company workspaces.
- Supplier recommendation is deterministic: 50% relative landed cost, 30% recorded supplier rating, 20% meeting delivery deadline; unavailable quotes are excluded.
- AI explains the selected recommendation rather than independently changing the winner.
- Backend enforces valid transitions and blocks ordering before approval. Shared-workspace approver labels are not verified identities.
- The frontend refreshes shared state every 20 seconds and invalidates the workspace query after writes.

## Operational notes

- App preview is `/`; API is `/api`.
- Keep the OpenAPI title `Api`, regenerate after contract changes, and import generated hooks through `@workspace/api-client-react`.
- Run workflows using their managed names rather than launching duplicate servers.
- Add authentication, permission-controlled approvals, real supplier/search and email integrations before handling real procurement operations.
