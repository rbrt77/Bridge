// Owner: Track A. Central config; read process.env only here.
export const env = {
  port: Number(process.env.PORT ?? 3001),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  mock: process.env.MOCK === '1',
  openaiKey: process.env.OPENAI_API_KEY,
  chatModel: process.env.CHAT_MODEL ?? 'gpt-5-mini',
  backgroundModel: process.env.BACKGROUND_MODEL ?? 'gpt-5-nano',
  rerankModel: process.env.RERANK_MODEL ?? 'gpt-4.1-mini', // faster + stricter than gpt-5-nano in our tests
  embeddingModel: process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small',
  elevenlabsKey: process.env.ELEVENLABS_API_KEY,
  githubToken: process.env.GITHUB_TOKEN,
  demoRepo: process.env.DEMO_REPO ?? 'brightline-software/invoicing-service',
  warmDemo: process.env.WARM_DEMO === '1', // pre-runs data/demo-questions.json retrieval at start (demo day)
  supabaseUrl: process.env.SUPABASE_URL,
  // New Supabase key names (publishable/secret); legacy anon/service_role still accepted.
  supabaseAnonKey: process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY,
  supabaseServiceKey: process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseJwksUrl: process.env.SUPABASE_JWKS_URL,
};
