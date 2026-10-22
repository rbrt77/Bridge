# Brightline Software · Engineering Handbook

Version 4.2 · Owner: Ana (Engineering Manager, billing) · Last reviewed: September 2026

This handbook explains how the engineering team at Brightline works day to day.
It applies to every engineer, including interns and contractors. If something here
does not match what you see in practice, tell your manager. The handbook is probably out of date.

## 1. Who we are

Brightline Software builds billing and invoicing software for small and medium businesses
in Romania, Germany, France and the Netherlands. Engineering has 34 people in four teams:

| Team | Owns | Slack |
|---|---|---|
| Invoicing | invoicing-service, **Hermes** (the invoicing queue), dunning | `#team-invoicing` |
| Platform | **Atlas** (the API gateway), **Keystone** (single sign-on), CI | `#team-platform` |
| Payments | payment providers, refunds, the **Ledger** (finance data warehouse) | `#team-payments` |
| Web | the customer web app and **web-shell** | `#team-web` |

Code names you will hear every day:

- **Hermes**: the invoicing queue. Every invoice email, PDF and payment reminder goes through Hermes.
- **Atlas**: the API gateway. Every external request enters through Atlas, which checks the session and the user's roles.
- **Keystone**: single sign-on. You log in to GitHub, Slack, Beacon and the VPN with your Keystone account.
- **Beacon**: our monitoring stack (dashboards, logs, alerts).
- **Ledger**: the finance data warehouse. Read-only for most engineers.
- **Pulse**: the monthly engineering all-hands, on the first Thursday of the month.

## 2. Your first weeks

### 2.1 Buddy

Every new engineer gets a **buddy** for the first three months. Your buddy is a senior engineer
from your team who is not your manager. Your buddy:

- reviews your first pull requests;
- pairs with you at least twice a week in the first month;
- answers "small" questions, so you never have to wait for a meeting.

Juniors keep the same buddy for six months.

### 2.2 First week checklist

1. Set up your laptop and your Keystone account (IT does this on day 1).
2. Complete the Security training (see the separate document). **Deadline: 30 days after your start date.**
3. Run invoicing-service locally with `docs/setup.md` in the repository.
4. Read ARCHITECTURE.md and ADR-007 in invoicing-service.
5. Pick a `good first issue` with your buddy.
6. Join `#team-<your team>`, `#engineering` and `#incidents`.

### 2.3 On-call

New engineers do **not** join the on-call rotation in their first six months. After that, you
shadow two on-call weeks before you are on call alone. Every alert has a runbook; if an alert has
no runbook, that is a bug and you can open an issue for it.

## 3. How we plan and build

### 3.1 Sprints

We work in two-week sprints. Each sprint has:

| Ceremony | When | How long |
|---|---|---|
| Sprint planning | Monday, first day of the sprint, 10:00 | 60 min |
| Daily standup | Every day, 09:45 | 15 min |
| Refinement | Wednesday of the second week, 14:00 | 45 min |
| Sprint review + retro | Friday, last day of the sprint, 14:00 | 90 min |

The agenda for planning and refinement is posted in the team channel **the day before**.
Decisions from planning are written in the sprint ticket by the person who runs the meeting.

### 3.2 Standup format

Standup is short. Each person answers three questions:

1. What did I finish yesterday?
2. What will I work on today?
3. Is anything blocking me?

**Async standup is allowed.** If you cannot join, or you prefer writing, post your three answers
in the standup thread in your team channel before 10:00. Async updates count exactly like spoken ones.

### 3.3 Definition of Done (DoD)

A ticket is **done** only when all of these are true:

1. The code is reviewed and approved by at least one **CODEOWNER** of the changed files.
2. CI is green (lint, build, tests).
3. Every acceptance criterion in the ticket is checked off.
4. New behaviour is covered by tests; a bug fix has a test that failed before the fix.
5. If you changed Hermes jobs or the worker, the Hermes runbook is updated.
6. Documentation is updated if users or other teams will notice the change.
7. The change is deployed to staging and checked there by the author.

"Done except for tests" is not done.

### 3.4 Code review

Review conventions (`blocking:`, `nit:`, `suggestion:`, `question:`) are described in each
repository's CONTRIBUTING.md. Reviewers answer within one working day.

### 3.5 Changes that need the CAB

The **CAB** (Change Advisory Board) meets on Tuesdays at 15:00. It reviews two kinds of changes
before they go to production:

- changes to **Atlas** routing rules or rate limits;
- changes to how we connect to **payment providers**.

### 3.6 RFCs

Big changes that affect more than one team start as an **RFC** (request for comments) in the
`engineering-rfcs` repository. An RFC stays open for at least five working days. Accepted RFCs
become ADRs (architecture decision records) in the repository they affect.

## 4. Communication

### 4.1 Slack

- Ask questions in the team channel, not in private messages. Others learn from the answer.
- Use threads. One topic, one thread.
- Mark urgent messages with **[urgent]** only when production or a customer is affected.
- `#incidents` is for active incidents only.
- Nobody is expected to answer Slack outside working hours.

### 4.2 Focus time and notifications

- **Wednesday mornings (until 13:00) are meeting-free** for all engineers.
- You can set Slack to "Focus" for up to 3 hours a day. Your team will not ping you except for incidents.
- We avoid meetings before 09:30 and after 17:00.

### 4.3 Meetings and cameras

- Cameras are **optional** in every meeting.
- Every meeting with more than three people needs an agenda in the invite.
- Someone writes down decisions and action items and posts them in the team channel after the meeting.
- Pulse (the all-hands) is recorded and has captions. Team ceremonies (planning, refinement, retro) are not recorded.

## 5. Working hours and remote work

Core hours are 10:00 to 16:00 Romanian time. Outside core hours you organise your day yourself.
Engineers can work remotely up to four days a week. The Bucharest office is open every weekday.

## 6. Incidents

| Severity | Meaning | Response |
|---|---|---|
| **P1** | Customers cannot receive invoices or pay, or data may be lost | On-call responds within 15 minutes, 24/7 |
| **P2** | A feature is broken but there is a workaround | Next working day |
| **P3** | Cosmetic or minor issue | Planned in a normal sprint |

After every P1 we write a blameless postmortem within five working days.

## 7. Tools

| Tool | What for | Access |
|---|---|---|
| GitHub (`brightline-software`) | Code, issues, pull requests | Keystone |
| Beacon | Dashboards, logs, alerts | Keystone |
| 1Password | Passwords and shared secrets | IT invite on day 1 |
| Figma | Designs from the web team | Ask in `#team-web` |
| Google Meet | Meetings | Keystone |

All internal tools should work with a keyboard and a screen reader. If one does not, report it in
`#it-help`; it counts as a bug.

## 8. Getting help

1. Search the handbook, the repository docs and the Team FAQ.
2. Ask your buddy.
3. Ask in your team channel.
4. Ask your manager.

There are no stupid questions. If you were stuck for more than 30 minutes, ask.
