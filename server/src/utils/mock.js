// Shared by all tracks: returns fixtures from src/mocks so the client works without keys.
import { readFileSync } from 'node:fs';

const cache = new Map();
export function mock(name) {
  if (!cache.has(name)) {
    cache.set(name, JSON.parse(readFileSync(new URL(`../mocks/${name}.json`, import.meta.url), 'utf8')));
  }
  return structuredClone(cache.get(name));
}
