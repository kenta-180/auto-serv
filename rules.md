# Change Control Rules — Automobile Workshop Management App
## Core Directive

You are modifying an existing, working, production-grade application. Every change must be **surgical**: solve exactly the requested task and touch nothing else. Do not "improve," refactor, rename, reformat, reorganize, or "clean up" any code that is not directly required to complete the request, even if you believe it is better practice.

## Hard Rules — Do NOT

1. **Do not change scope.** If asked to fix/add one feature, do not modify unrelated modules, routes, components, services, or files. If the fix genuinely requires touching a shared file, name that file explicitly and explain why before making the change.
2. **Do not alter the database schema silently.** Never edit `schema.prisma` structurally (add/remove/rename columns, tables, relations, enums) unless the task explicitly requires it. If a schema change is unavoidable, state it up front, produce a proper Prisma migration (`prisma migrate dev --name <descriptive_name>`), and never use `db push --force-reset` or any destructive/reset command on a database that may hold real data.
3. **Do not break RBAC.** Never loosen, bypass, or remove Admin/Technician/Student guard logic while working on an unrelated feature. If a change affects permissions, call it out explicitly.
4. **Do not touch financial/payment logic incidentally.** Stripe/Razorpay webhook verification, signature checks, and the "DB updates only after verified webhook" rule must never be weakened, bypassed, or reordered unless payment logic is the explicit target of the task.
5. **Do not remove or weaken security controls** (Argon2/bcrypt hashing, password/hash stripping from API responses, HTTPS/TLS enforcement, input validation, parameterized Prisma queries) as a side effect of an unrelated fix.
6. **Do not change API contracts silently.** Don't rename endpoints, change request/response shapes, or alter status codes consumed by the frontend or mobile app unless that is the task. If a contract must change, list every consumer of that endpoint that will need updating.
7. **Do not modify Capacitor/native config** (Android/iOS build settings, plugin versions, permissions) unless the task is mobile-specific.
8. **Do not add new dependencies** unless necessary, and if added, state the package name, version, and why an existing dependency couldn't do the job.
9. **Do not delete or overwrite files wholesale** when a targeted edit (function-level or block-level change) will do.
10. **Do not assume — verify.** If the request is ambiguous about which file/module it affects, ask, or state your assumption explicitly before proceeding, rather than guessing across the codebase.

## Required Before Every Change

- **State the blast radius first**: list exactly which file(s) and function(s)/component(s) will be touched, and confirm nothing else is affected.
- **Preserve existing behavior for every other role, module, and page.** Admin/Technician/Student flows, dashboard tiles, inventory CRUD, payments, and Twilio dispatch must all continue working exactly as before unless the task is about one of them.
- **Keep transactions intact.** Any multi-step DB operation that was wrapped in a Prisma/Postgres transaction must remain wrapped; do not split or simplify it away.
- **Keep audit logging intact.** Inventory/stock modifications must continue logging timestamp + user ID.
- **Maintain indexing, caching (Redis), and queue (BullMQ) usage** already in place — don't strip these out to "simplify" code.

## Required After Every Change

- **Summarize exactly what changed** — files touched, and a one-line reason for each.
- **Confirm what was NOT touched** — explicitly state that other modules/roles/DB structures remain unaffected.
- **Flag any migration needed** and give the exact command to run it safely (never a destructive one) on an existing database.
- **Flag any breaking change** to API/mobile contracts, however small.

## Response Format When a Change Is Requested

1. Restate the task in one line to confirm understanding.
2. List files/modules that will be modified (and only those).
3. Make the change.
4. Summary: what changed, what didn't, any migration/config steps needed, any risk called out.
