// Owner: Track A. Central config; read process.env only here.
export const env = {
  port: Number(process.env.PORT ?? 3001),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  mock: process.env.MOCK === '1',
  openaiKey: process.env.OPENAI_API_KEY,
  chatModel: process.env.CHAT_MODEL ?? 'gpt-5-mini',
  backgroundModel: process.env.BACKGROUND_MODEL ?? 'gpt-5-nano',
  embeddingModel: process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small',
  cohereKey: process.env.COHERE_API_KEY,
  elevenlabsKey: process.env.ELEVENLABS_API_KEY,
  githubToken: process.env.GITHUB_TOKEN,
  demoRepo: process.env.DEMO_REPO ?? 'brightline-software/invoicing-service',
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
};
