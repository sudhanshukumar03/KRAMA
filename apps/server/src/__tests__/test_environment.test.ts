import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateIntegrationTargets, assertIntegrationEnvironment } from '../testing/testEnvironment';

const valid = { TEST_DATABASE_URL: 'postgresql://test:test@localhost:5432/krama_integration_test', TEST_REDIS_URL: 'redis://localhost:6379/15', DATABASE_URL: 'postgresql://app:app@localhost:5432/krama', REDIS_URL: 'redis://localhost:6379/0' };
test('integration targets require explicit isolated services', () => {
  assert.throws(() => validateIntegrationTargets({}), /require/);
  assert.throws(() => validateIntegrationTargets({ ...valid, TEST_DATABASE_URL: valid.DATABASE_URL }), /end in _test/);
  assert.throws(() => validateIntegrationTargets({ ...valid, DATABASE_URL: valid.TEST_DATABASE_URL }), /must differ/);
  assert.throws(() => validateIntegrationTargets({ ...valid, TEST_REDIS_URL: valid.REDIS_URL }), /nonzero/);
  assert.throws(() => validateIntegrationTargets({ ...valid, REDIS_URL: valid.TEST_REDIS_URL }), /must differ/);
  assert.throws(() => validateIntegrationTargets({ ...valid, TEST_DATABASE_URL: 'postgresql://test:test@localhost:5432/bad";DROP_test' }), /end in _test/);
  assert.doesNotThrow(() => validateIntegrationTargets(valid));
});
test('direct integration execution without runner authorization refuses mutation', () => {
  assert.throws(() => assertIntegrationEnvironment(), /refusing workspace mutation/);
});
