import { defineConfig } from 'drizzle-kit'

// drizzle-kit does not read .env on its own. A missing file is fine: in CI and
// on the host the variable comes from the real environment instead.
try {
  process.loadEnvFile()
} catch {
  // no .env file
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  strict: true,
  verbose: true,
})
