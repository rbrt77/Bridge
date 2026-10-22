// Owner: Track C. Incoming webhook. NEVER include the question text in help pings (F5).
import { env } from '../env.js';

export async function postToSlack(text) {
  if (!env.slackWebhookUrl) return;
  await fetch(env.slackWebhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
}
