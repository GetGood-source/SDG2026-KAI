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
How We Use Replit
Our team used Replit as the main environment to build and run the Smart Procurement System. The React frontend and Node.js API are managed in the same workspace and tested using Replit’s preview and workflows. We published the prototype with Replit Deployments. API credentials are stored in Replit Secrets rather than in the source code. We have not claimed Multiplayer collaboration, as we can’t confirm it was used.

📄 Proof of use: 
[Replit Proof of Use (PDF)](Submission/SDC2026_KAI_Replit_POU.pdf)

## Challenges & Learnings

As someone with limited programming experience, one of my biggest challenges was turning a real procurement problem into a working app and understanding how the interface, API, database, and supplier search fit together. I overcame this by building the project in smaller steps, using Replit and AI tools to learn and debug, and testing the main user flows as I went. I also learned not to treat online supplier listings or AI recommendations as confirmed facts, so the app requires people to verify quotes and managers to approve purchases.

Through the project, I learned how to write clearer prompts, develop and test a full-stack prototype, connect external services, and keep API credentials out of the source code. We also learned that AI can support decisions, but people need to review important purchasing decisions.

## Future Improvements

- [x] Improvement 1 - Improve time management by setting clear milestones and reserving time for testing and fixing issues as it is 3.25am as im writing this.
- [x] Improvement 2 - Understand more about programming to better utilize and adapt AI generated answers,

## Team

| Name        | Role                | GitHub                                   |
| ----------- | ------------------- | ---------------------------------------- |
| Woon Kai Xiang | All rounder | [@username](https://github.com/username) |


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

