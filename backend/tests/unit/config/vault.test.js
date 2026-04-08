/**
 * Vault Config Unit Tests
 *
 * Vault integration was replaced by Docker secrets (/run/secrets/.env).
 * vault.js is kept as a commented-out reference for future re-enablement.
 * These tests simply verify the module can be imported without throwing.
 */
import { describe, test, expect } from '@jest/globals';

describe('vault module', () => {
  test('imports without throwing', async () => {
    await expect(import('../../../src/config/vault.js')).resolves.toBeDefined();
  });
});
