# Smart Procurement System

An SME procurement MVP for requesting spare parts, comparing supplier quotations, obtaining human approval and tracking purchase orders and deliveries.

## Product and scope

- Starts with a Malaysian car repair shop, but part/model fields and configurable industry support other SME sectors.
- User requested a white-and-blue design.
- Public homepage must present separate Employee Login and Manager Login actions in the top navigation. Keep the role choice simple and prominent.
- Five stages: request, connected stock/supplier data, explained decision, human approval, visible purchase/delivery outcome.
- Includes inventory management, supplier directory, searchable audit trail and CSV export.
- One company workspace, protected by verified Clerk accounts and manager-controlled membership. Unknown signups cannot access procurement data.
- Staff can create requests, source/record/select quotations, add suppliers, update stock, record approved orders and receive deliveries. Managers additionally approve/reject purchases, edit company settings and manage team access.
- Team access is preauthorized by email. No invitation email is sent; managers share the app link separately.
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
- Backend enforces valid transitions, manager-only purchase decisions and ordering only after approval. New audit activity records the authenticated identity; historical demonstration records retain their sample labels.
- The frontend refreshes shared state every 20 seconds and invalidates the workspace query after writes.
- Identity is handled by Replit-managed Clerk, with database-backed workspace membership. No app-managed passwords or browser bearer-token plumbing.
- The first manager is claimed only by a verified primary email matching the owner-configured `INITIAL_MANAGER_EMAIL`. Existing memberships, including revocations and demotions, are never reset by bootstrap. Keep at least one active manager.
- **Why:** making the first arbitrary signup a manager would expose procurement records. The configured owner must prove email ownership, and future logins must not undo deliberate access changes.

## Operational notes

- App preview is `/`; API is `/api`.
- Keep the OpenAPI title `Api`, regenerate after contract changes, and import generated hooks through `@workspace/api-client-react`.
- Run workflows using their managed names rather than launching duplicate servers.
- Development and production Clerk accounts are separate. The configured owner signs up and verifies their email separately in each environment; the same runtime bootstrap policy applies. Apply development database schema changes during publishing as required.
- Real supplier/search, invitation-email and purchasing integrations remain unconnected.
