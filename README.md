# SDC2026-KAI

# One Stop Smart Procurement

> One stop smart procurement read inventory, compare suppliers, manage purchase requests, and track manager-approved orders in one place for SME business owners and employees.

---

## Team Information

| Field                  | Details                                     |
| ---------------------- | ------------------------------------------- |
| **Team Name**          | KAI                                         |
| **Team Domain**        | Domain 2                                    |
| **SDG Track (1–17)**   | SDG 9 Industry, Innovation and Infrastructure
| **Team Leader**        | Woon Kai Xiang                              |
| **University**         | Sunway University                           |
| **Number of Members**  | 1                                           |

## Links

| Resource          | Link                                           |
| ----------------- | ---------------------------------------------- |
| GitHub Repository | https://github.com/GetGood-source/SDC-Hackathon-KAI  |
| Live Demo         | https://one-stop-smart-procurement-system.replit.app                     |
| RunPod Endpoint   | -                                              |
| Slide Deck        | https://docs.google.com/presentation/d/1JQ5IfLaisiVLiId1FQzE9Po7hvrPBYoJ/edit?usp=sharing&ouid=112411798393941255457&rtpof=true&sd=true                     |
| Demo Video        | https://youtu.be/jr1RM37vFrg                 |
| Pitch Video |      https://youtu.be/ASf6w6EKvx0                                           |

---

## Overview

### Problem

Many SMEs have limited time, staff, and storage for managing purchasing. When they need less common or urgent items that are not in stock or in their usual supplier catalogs, employees may spend hours searching for suppliers, comparing prices, and tracking orders manually. This can delay operations, increase costs, and lead to purchasing decisions based on incomplete information.

### Solution

One Stop Smart Procurement uses AI to explain supplier quote comparisons and help staff understand which option best meets their needs. The system also checks inventory and supplier records, applies clear rules to compare price, ratings, and delivery time, and can find potential suppliers online when no suitable option is listed. This helps SMEs spend less time sourcing and comparing items, while improving the information available for decisions. Staff still verify supplier details, and a manager must approve purchases.

### Key Features

Spare-part requests: Submit part details and deadline.

Inventory check: Check stock and supplier catalogs.

Supplier search: Find potential suppliers online.

Quote comparison: Compare price, availability, and delivery.

Recommendations: Rank quotes and explain the choice.

Manager approval: Approve or reject purchases.

Order tracking: Follow each request’s status.

Audit trail: Record key actions.

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| Backend | Node.js, Express |
| Database | PostgreSQL, Drizzle ORM |
| AI / Compute | OpenAI `gpt-5.4-mini` via Replit AI Integrations; SerpApi for supplier search |
| Hosting / Dev | Replit |

---

## Project Structure

```
├── submission/              # Required submission documents
│   ├── SDC2026_KAI_Replit_POU.pdf       # Replit proof of use
│   ├── SDC2026_KAI_SlideDecks.pdf       # Slides
│   ├── SDC2026_KAI_TechDeclaration.pdf  # Technology declaration
│   ├── SDC2026_KAI_Preliminary.pdf      # Preliminary submission
├── artifacts/
│   ├── smart-procurement/   # Web app
│   └── api-server/          # Backend API
├── lib/                     # Shared code, database, and integrations
├── scripts/                 # source code
├── .gitignore
├── .replit                  # Replit run configuration
├── LICENSE
├── README.md
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── replit.md
├── tsconfig.json
└── tsconfig.base.json

```

### Architecture

```
User
  ↓
Replit web app
  ↓
Replit API server
  ├── PostgreSQL — requests, inventory, suppliers, approvals
  ├── SerpApi — Google Search/Maps supplier leads
  └── Replit AI Integration — AI explanation of quote comparisons
  ↓
Results shown in the web app
```

## How We Use Replit *(Required)*

Describe how your team used Replit. For example:

- **Development:** Collaborative coding in a shared Repl using Multiplayer.
- **Hosting:** The app is deployed with Replit Deployments at the Live Demo link above.
- **Secrets:** API keys are stored in Replit Secrets, never in the code.

📄 Proof of use: 

## How We Use RunPod *(Required)*

Describe how your team used RunPod. For example:

- **Workload:** Model inference (e.g. text generation, image processing) runs on a RunPod GPU.
- **Setup:** `runpod/handler.py` is deployed as a **RunPod Serverless Endpoint**.
- **Integration:** The Replit app sends requests to the endpoint using `RUNPOD_API_KEY` and `RUNPOD_ENDPOINT_ID`.

Example request:

```bash
curl -X POST https://api.runpod.ai/v2/$RUNPOD_ENDPOINT_ID/runsync \
  -H "Authorization: Bearer $RUNPOD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"input": {"prompt": "Hello"}}'
```

📄 Proof of use: [`submission/SDC2026_TeamName_Runpod_POU.pdf`](submission/SDC2026_TeamName_Runpod_POU.pdf)

---

## Challenges & Learnings

- What challenges did you face, and how did you overcome them?
- What did your team learn?

## Future Improvements

- [ ] Improvement 1
- [ ] Improvement 2

## Team

| Name        | Role                | GitHub                                   |
| ----------- | ------------------- | ---------------------------------------- |
| Member Name | Team Lead / Backend | [@username](https://github.com/username) |
| Member Name | Frontend            | [@username](https://github.com/username) |
| Member Name | AI / RunPod         | [@username](https://github.com/username) |

---

## Submission Checklist

- [ ] Team name, domain (Domain 1 / Domain 2) and SDG track filled in
- [ ] Slide deck link added
- [ ] Demo video link added
- [ ] Replit used, with proof of use in `submission/`
- [ ] RunPod used, with proof of use in `submission/`
- [ ] Preliminary submission completed (`SDC2026_TeamName_Preliminary.pdf`)
- [ ] Technology declaration completed (`SDC2026_TeamName_TechDeclaration.pdf`)
- [ ] Submission files renamed with your team name (replace `TeamName`)
- [ ] "How to Run" steps verified
- [ ] No API keys or secrets committed to the repository

## License

This project is licensed under the [Apache License 2.0](LICENSE).

