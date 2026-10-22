# Brightline Software · Security Training for Engineers

Version 3.1 · Owner: Security team (`#security`) · Mandatory for every engineer

**Deadline:** complete this training and the quiz at the end **within 30 days of your start date**.
After that, you repeat it every year in January. Your manager sees whether you completed it.

## 1. Why this matters

We handle invoices, customer names, addresses, bank details and payment history for thousands of
businesses. A leak would hurt our customers and would have to be reported to the data protection
authority within 72 hours. Most incidents start with a small mistake, not with a hacker.

## 2. Accounts and passwords

- You log in everywhere with **Keystone** (single sign-on). Never create separate accounts for work tools.
- Multi-factor authentication (MFA) is required on Keystone. Use the authenticator app, not SMS.
- Store every password and shared secret in **1Password**. Never in Slack, email, notes or code.
- Never share your Keystone account, not even with your buddy.

## 3. Secrets in code

- Secrets (API keys, tokens, database passwords) live in environment variables, never in the repository.
- `.env` files are in `.gitignore`. Check `git status` before every commit.
- GitHub secret scanning is on for every repository. If it finds a secret, the secret is treated as leaked:
  rotate it immediately and tell `#security`, even if you deleted the commit.
- Local development uses fake keys only. For example, `ATLAS_DEV_TOKEN` works only on your laptop,
  never in production.

## 4. Customer data

- **Never copy production data to your laptop.** Use the seed data (`npm run db:seed`) instead.
- Access to production databases goes through Atlas with your own Keystone account, and every query is logged.
- Read-only access to the **Ledger** is given per project and expires after 90 days.
- Do not paste customer data into AI tools, translation websites or public pastebins.
- Logs must not contain customer emails or bank details. Our logger redacts known fields; do not work around it.

## 5. Phishing

- Brightline will never ask for your password by email or Slack.
- Check the sender's address. Real Brightline emails come from `@brightline.example`.
- Be careful with urgent requests about invoices or payments: attackers know we are a billing company.
- Report suspicious messages with the **Report phishing** button in Gmail, or in `#security`.

## 6. Laptops and working outside the office

- Lock your screen when you leave your laptop (Windows + L, or Ctrl + Cmd + Q on a Mac).
- Disk encryption must stay on. IT checks it automatically.
- Use the VPN on public Wi-Fi.
- Report a lost or stolen laptop to `#it-help` within one hour. IT can wipe it remotely.

## 7. Dependencies

- Add new npm packages only after checking their maintenance and licence. Mention new dependencies in your PR description.
- Dependabot opens pull requests for security updates. Treat a critical one as a P2 incident.

## 8. Incidents

If you think something went wrong (a leaked secret, a strange login, data sent to the wrong customer):

1. Do not try to hide or fix it alone.
2. Post in `#security` or call the on-call security engineer (number in 1Password, "Security on-call").
3. Write down what happened and when.

Reporting early is always the right choice. Nobody is punished for reporting a mistake.

## 9. Quiz

The quiz has 15 questions and is in the Learning portal (log in with Keystone). You need 12 correct
answers to pass. You can retake it as many times as you need.
