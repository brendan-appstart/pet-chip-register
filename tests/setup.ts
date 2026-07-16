// Global test environment. Provides deterministic dev keys so config, crypto,
// and integration tests can run without a real .env. These keys are for tests
// ONLY and must never be used in any real deployment.

process.env.APP_URL ??= 'http://localhost:3000';
process.env.OPR_KEK_ACTIVE_ID ??= 'test';
process.env.OPR_KEK_test ??= Buffer.alloc(32, 7).toString('base64');
process.env.OPR_INDEX_KEY ??= Buffer.alloc(32, 9).toString('base64');
process.env.DATABASE_URL ??= 'file::memory:';
process.env.EMAIL_PROVIDER ??= 'console';
