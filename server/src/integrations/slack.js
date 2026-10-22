// Owner: Track C. Incoming webhook. NEVER include the question text in help pings (F5).
import { env } from '../env.js';

/** @returns {Promise<boolean>} false when no webhook is configured; throws when Slack rejects the message. */
export async function postToSlack(text) {
  if (!env.slackWebhookUrl) return false;
  const res = await fetch(env.slackWebhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
  if (!res.ok) throw Object.assign(new Error(`Slack ${res.status}`), { status: 502, code: 'slack_failed', expose: true });
  return true;
}
