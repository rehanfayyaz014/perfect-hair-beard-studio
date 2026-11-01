# Perfect Hair and Beard Studio — Agent Instructions

## Project scope

This repository contains the production website for Perfect Hair and Beard Studio in Bahria Town Phase 7, Islamabad. The frontend and backend are separate applications.

The frontend uses Next.js, React, TypeScript, Tailwind CSS v4, shadcn/ui, and Lucide React. The planned backend uses FastAPI, Python, REST APIs, SQLAlchemy, Alembic, and PostgreSQL.

Preserve the existing frontend-specific instructions in `frontend/AGENTS.md`.

## Approval-first workflow

Before every meaningful batch:

1. Inspect the current workspace and relevant files.
2. Explain the recommended work and expected result.
3. List exact files to create, edit, or delete.
4. List packages and commands that would be used.
5. Explain material risks and the verification plan.
6. Stop and wait for explicit user approval.

Inspection and read-only validation are allowed before approval. Do not edit files, install packages, run migrations, modify the database, or execute project-changing commands without approval.

After approval, preserve unrelated user changes. Stop and request new approval if the work expands into a new material risk, destructive operation, dependency change, database change, or unrelated feature.

## Product requirements

- Official name: Perfect Hair and Beard Studio.
- Location: Shop No. 10-C, F Bahria Expy, Near Rasheed Sweets, Phase 7, Sector F, Bahria Town, Islamabad, 46620.
- Hours: Every day, 08:00 AM–09:00 PM.
- WhatsApp: 0349 9689783 (`+923499689783` for URLs).
- Phone: 0323 0753944.
- The design should be premium, mobile-first, responsive, accessible, and use navy blue, warm white, and subtle gold.
- Required public areas include Home, Services, Deals, Gallery, Reviews, Contact, Privacy Policy, and Terms.
- WhatsApp booking must open a prefilled message that the customer sends manually.
- The initial release must show the AI assistant as Coming Soon only. Do not add AI inference, training, RAG, embeddings, vector databases, or AI APIs.

## Security and data rules

- Never commit secrets, credentials, tokens, or production connection strings.
- Validate and authorize every protected admin action on the server.
- Keep public content separate from admin-only operations.
- Use environment variables for deployment-specific configuration.
- Do not modify PostgreSQL schemas or run Alembic migrations without explicit approval for that batch.
- Do not use `npm audit fix --force` or blindly upgrade dependencies.

## Code quality and testing

- Prefer small, maintainable changes that preserve working code.
- Keep TypeScript strict and maintain accessible labels, focus states, keyboard navigation, and adequate contrast.
- Use the repository's existing scripts where possible.
- At minimum, run `npm run lint` and `npx tsc --noEmit` after frontend changes. Run `npm run build` when the approved batch includes production-build verification.
- Report each command's actual result; never claim a test or build passed without running it.

## Progress tracking

Update the root `PROJECT_STATUS.md` after every approved implementation batch. Include the date, completed work, changed files, package changes, commands and results, known issues and risks, pending features, and one exact recommended next task.
