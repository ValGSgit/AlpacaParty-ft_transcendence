/**
 * fetchSecrets Unit Tests
 *
 * Tests the Vault secret-fetching workflow driven by getSecrets(), which runs
 * automatically on import. Each test re-imports the module (via resetModules)
 * to trigger a fresh run against the configured mocks.
 *
 * Covered behaviours:
 *   - Key mapping: snake_case vault keys → UPPER_CASE env var names
 *   - DATABASE_URL construction from mapped credentials + DB_HOST/DB_PORT env vars
 *   - Vault KV v2 (data.data) and KV v1 (data) response shapes
 *   - HTTPS request options: hostname, port, path, auth header, CA cert
 *   - File output: path, KEY="VALUE" format, permissions (0o600)
 *   - Directory creation for /run/secrets when absent
 *   - process.exit(1) on non-2xx Vault response, network error, bad JSON,
 *     and missing DATABASE_URL fields
 */
import {
  jest,
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockFs = {
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  chmodSync: jest.fn(),
};

const mockHttpsRequest = jest.fn();

jest.unstable_mockModule("fs", () => ({ default: mockFs, ...mockFs }));
jest.unstable_mockModule("node:https", () => ({
  default: { request: mockHttpsRequest },
  request: mockHttpsRequest,
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

/** Minimum env vars required for a successful run. */
const BASE_ENV = {
  VAULT_ADDR: "https://vault.test:8200",
  VAULT_TOKEN: "test-token",
  DB_HOST: "db",
  DB_PORT: "5432",
};

/** Vault secret payload that satisfies buildDatabaseUrl. */
const FULL_SECRETS = {
  db_user: "alpaca",
  db_password: "pass123",
  db_name: "alpacadb",
  jwt_secret: "supersecret",
};

// ── Mock helpers ──────────────────────────────────────────────────────────────

/**
 * Simulate a successful Vault HTTPS response.
 * @param {object}  data   - the secrets object Vault returns
 * @param {boolean} nested - true → KV v2 shape {data:{data}}, false → KV v1 {data}
 */
function mockVaultSuccess(data, { nested = true } = {}) {
  const body = nested ? { data: { data } } : { data };
  mockHttpsRequest.mockImplementation((opts, cb) => {
    const mockReq = { on: jest.fn(), end: jest.fn() };
    const mockRes = {
      statusCode: 200,
      on: jest.fn((event, handler) => {
        if (event === "data") handler(JSON.stringify(body));
        if (event === "end") handler();
      }),
    };
    cb(mockRes);
    return mockReq;
  });
}

/** Simulate Vault returning a non-2xx HTTP status. */
function mockVaultHttpError(statusCode) {
  mockHttpsRequest.mockImplementation((opts, cb) => {
    const mockReq = { on: jest.fn(), end: jest.fn() };
    const mockRes = {
      statusCode,
      on: jest.fn((event, handler) => {
        if (event === "data") handler("error body");
        if (event === "end") handler();
      }),
    };
    cb(mockRes);
    return mockReq;
  });
}

/** Simulate a network-level HTTPS error (e.g. ECONNREFUSED). */
function mockVaultNetworkError(err = new Error("ECONNREFUSED")) {
  mockHttpsRequest.mockImplementation(() => {
    const handlers = {};
    return {
      on: jest.fn((event, handler) => {
        handlers[event] = handler;
      }),
      // Emit the error as a microtask, after req.on('error', ...) is registered
      end: jest.fn(() => {
        Promise.resolve().then(() => handlers.error?.(err));
      }),
    };
  });
}

/** Simulate Vault returning a response that cannot be parsed as JSON. */
function mockVaultBadJson() {
  mockHttpsRequest.mockImplementation((opts, cb) => {
    const mockReq = { on: jest.fn(), end: jest.fn() };
    const mockRes = {
      statusCode: 200,
      on: jest.fn((event, handler) => {
        if (event === "data") handler("{{{invalid json");
        if (event === "end") handler();
      }),
    };
    cb(mockRes);
    return mockReq;
  });
}

/**
 * Import fetchSecrets.js fresh (resetModules must be called first) and flush
 * the async operations so getSecrets() completes before assertions run.
 */
async function runFetchSecrets() {
  await import("../../../src/tools/fetchSecrets.js");
  await new Promise((resolve) => setImmediate(resolve));
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

let exitSpy;

beforeEach(() => {
  jest.clearAllMocks();
  jest.resetModules();

  Object.assign(process.env, BASE_ENV);
  delete process.env.NODE_EXTRA_CA_CERTS;

  // Default filesystem state: nothing exists, cert read returns dummy buffer
  mockFs.existsSync.mockReturnValue(false);
  mockFs.readFileSync.mockReturnValue(Buffer.from("mock-cert"));

  // Suppress console output and prevent process.exit from killing the runner
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
  exitSpy = jest.spyOn(process, "exit").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  for (const key of Object.keys(BASE_ENV)) delete process.env[key];
});

// ── Key mapping ───────────────────────────────────────────────────────────────

describe("key mapping", () => {
  test("maps snake_case vault keys to UPPER_CASE env var names", async () => {
    mockVaultSuccess(FULL_SECRETS);
    await runFetchSecrets();

    const written = mockFs.writeFileSync.mock.calls[0][1];
    expect(written).toContain('DB_USER="alpaca"');
    expect(written).toContain('DB_PASSWORD="pass123"');
    expect(written).toContain('DB_NAME="alpacadb"');
    expect(written).toContain('JWT_SECRET="supersecret"');
  });

  test("passes unknown vault keys through unchanged", async () => {
    mockVaultSuccess({ ...FULL_SECRETS, custom_setting: "foo" });
    await runFetchSecrets();

    const written = mockFs.writeFileSync.mock.calls[0][1];
    expect(written).toContain('custom_setting="foo"');
  });

  test("maps all known vault keys to their env var names", async () => {
    mockVaultSuccess({
      ...FULL_SECRETS,
      api_keys: "k1,k2",
      google_client_id: "gcid",
      google_client_secret: "gcsec",
      github_client_id: "ghid",
      github_client_secret: "ghsec",
      mod_users: "admin1,admin2",
    });
    await runFetchSecrets();

    const written = mockFs.writeFileSync.mock.calls[0][1];
    expect(written).toContain('API_KEYS="k1,k2"');
    expect(written).toContain('GOOGLE_CLIENT_ID="gcid"');
    expect(written).toContain('GOOGLE_CLIENT_SECRET="gcsec"');
    expect(written).toContain('GITHUB_CLIENT_ID="ghid"');
    expect(written).toContain('GITHUB_CLIENT_SECRET="ghsec"');
    expect(written).toContain('MOD_USERS="admin1,admin2"');
  });
});

// ── DATABASE_URL construction ─────────────────────────────────────────────────

describe("buildDatabaseUrl", () => {
  test("builds DATABASE_URL from mapped credentials and env vars", async () => {
    mockVaultSuccess(FULL_SECRETS);
    await runFetchSecrets();

    const written = mockFs.writeFileSync.mock.calls[0][1];
    expect(written).toContain(
      'DATABASE_URL="postgresql://alpaca:pass123@db:5432/alpacadb"',
    );
  });

  test("URL-encodes special characters in DB_PASSWORD", async () => {
    mockVaultSuccess({ ...FULL_SECRETS, db_password: "p@ss w0rd!" });
    await runFetchSecrets();

    const written = mockFs.writeFileSync.mock.calls[0][1];
    expect(written).toContain(
      'DATABASE_URL="postgresql://alpaca:p%40ss%20w0rd!@db:5432/alpacadb"',
    );
  });

  test("calls process.exit(1) and skips write when DB_USER is missing", async () => {
    const { db_user: _, ...noUser } = FULL_SECRETS;
    mockVaultSuccess(noUser);
    await runFetchSecrets();

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });

  test("calls process.exit(1) and skips write when DB_PASSWORD is missing", async () => {
    const { db_password: _, ...noPass } = FULL_SECRETS;
    mockVaultSuccess(noPass);
    await runFetchSecrets();

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });

  test("calls process.exit(1) when DB_HOST env var is absent", async () => {
    delete process.env.DB_HOST;
    mockVaultSuccess(FULL_SECRETS);
    await runFetchSecrets();

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  test("calls process.exit(1) when DB_PORT env var is absent", async () => {
    delete process.env.DB_PORT;
    mockVaultSuccess(FULL_SECRETS);
    await runFetchSecrets();

    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});

// ── Vault response formats ────────────────────────────────────────────────────

describe("Vault response formats", () => {
  test("reads secrets from data.data path (KV v2)", async () => {
    mockVaultSuccess(FULL_SECRETS, { nested: true });
    await runFetchSecrets();

    expect(mockFs.writeFileSync).toHaveBeenCalled();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  test("falls back to data path when data.data is absent (KV v1)", async () => {
    mockVaultSuccess(FULL_SECRETS, { nested: false });
    await runFetchSecrets();

    expect(mockFs.writeFileSync).toHaveBeenCalled();
    expect(exitSpy).not.toHaveBeenCalled();
  });
});

// ── HTTPS request options ─────────────────────────────────────────────────────

describe("HTTPS request options", () => {
  test("sends GET to the correct Vault path with auth token", async () => {
    mockVaultSuccess(FULL_SECRETS);
    await runFetchSecrets();

    const [opts] = mockHttpsRequest.mock.calls[0];
    expect(opts.hostname).toBe("vault.test");
    expect(opts.port).toBe(8200);
    expect(opts.path).toContain("/v1/secret/data/alpacaparty");
    expect(opts.method).toBe("GET");
    expect(opts.headers["X-Vault-Token"]).toBe("test-token");
  });

  test("attaches CA cert when NODE_EXTRA_CA_CERTS file exists", async () => {
    process.env.NODE_EXTRA_CA_CERTS = "/etc/ssl/vault-ca.pem";
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(Buffer.from("ca-pem-data"));
    mockVaultSuccess(FULL_SECRETS);
    await runFetchSecrets();

    const [opts] = mockHttpsRequest.mock.calls[0];
    expect(mockFs.readFileSync).toHaveBeenCalledWith("/etc/ssl/vault-ca.pem");
    expect(opts.ca).toEqual(Buffer.from("ca-pem-data"));
  });

  test("falls back to default CA path when NODE_EXTRA_CA_CERTS is unset", async () => {
    mockFs.existsSync.mockReturnValue(true);
    mockVaultSuccess(FULL_SECRETS);
    await runFetchSecrets();

    expect(mockFs.existsSync).toHaveBeenCalledWith("/app/ssl/cert.pem");
  });

  test("omits CA cert option when cert file does not exist", async () => {
    mockFs.existsSync.mockReturnValue(false);
    mockVaultSuccess(FULL_SECRETS);
    await runFetchSecrets();

    const [opts] = mockHttpsRequest.mock.calls[0];
    expect(opts.ca).toBeUndefined();
  });
});

// ── Error handling ────────────────────────────────────────────────────────────

describe("error handling", () => {
  test("calls process.exit(1) on 403 from Vault", async () => {
    mockVaultHttpError(403);
    await runFetchSecrets();

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });

  test("calls process.exit(1) on 404 from Vault", async () => {
    mockVaultHttpError(404);
    await runFetchSecrets();

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });

  test("calls process.exit(1) on network error", async () => {
    mockVaultNetworkError(new Error("ECONNREFUSED"));
    await runFetchSecrets();

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });

  test("calls process.exit(1) when Vault response is not valid JSON", async () => {
    mockVaultBadJson();
    await runFetchSecrets();

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });
});

// ── File output ───────────────────────────────────────────────────────────────

describe("file output", () => {
  test("writes secrets to /run/secrets/.env", async () => {
    mockVaultSuccess(FULL_SECRETS);
    await runFetchSecrets();

    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      "/run/secrets/.env",
      expect.any(String),
    );
  });

  test("sets file permissions to 0o600", async () => {
    mockVaultSuccess(FULL_SECRETS);
    await runFetchSecrets();

    expect(mockFs.chmodSync).toHaveBeenCalledWith("/run/secrets/.env", 0o600);
  });

  test("creates /run/secrets directory when it does not exist", async () => {
    // CA cert path returns true so the cert check doesn't interfere
    mockFs.existsSync.mockImplementation((p) => p !== "/run/secrets");
    mockVaultSuccess(FULL_SECRETS);
    await runFetchSecrets();

    expect(mockFs.mkdirSync).toHaveBeenCalledWith("/run/secrets", {
      recursive: true,
    });
  });

  test("skips directory creation when /run/secrets already exists", async () => {
    mockFs.existsSync.mockReturnValue(true);
    mockVaultSuccess(FULL_SECRETS);
    await runFetchSecrets();

    expect(mockFs.mkdirSync).not.toHaveBeenCalled();
  });

  test('writes each secret on its own line as KEY="VALUE"', async () => {
    mockVaultSuccess(FULL_SECRETS);
    await runFetchSecrets();

    const written = mockFs.writeFileSync.mock.calls[0][1];
    for (const line of written.split("\n")) {
      expect(line).toMatch(/^[A-Za-z_]+=".+"$/);
    }
  });
});
