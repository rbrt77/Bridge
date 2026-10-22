// Owner: Track A. Compares vector-only vs hybrid vs hybrid+rerank vs +context. Table goes into the pitch.
import { readFileSync } from 'node:fs';

const golden = JSON.parse(readFileSync(new URL('./golden.json', import.meta.url), 'utf8')).questions;
const configs = ['vector', 'hybrid', 'hybrid+rerank', 'hybrid+rerank+context'];

// TODO(A): for each config, run retrieve() with that mode and compute hit@1, hit@5, MRR on in_corpus,
//          and abstain accuracy on !in_corpus.
console.log(`Loaded ${golden.length} golden questions. Configs: ${configs.join(', ')}`);
console.table(configs.map((c) => ({ config: c, 'hit@1': '-', 'hit@5': '-', MRR: '-', abstain_acc: '-' })));
