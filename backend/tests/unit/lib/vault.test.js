import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';

// Create mock objects
const mockFs = {
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
};

const mockHttps = {
  request: jest.fn(),
};

jest.unstable_mockModule('fs', () => mockFs);
jest.unstable_mockModule('node:https', () => mockHttps);

describe('Vault lib', () => {
  let Vault;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();

    // Setup fs mocks
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockImplementation((path) => {
      if (path === '/run/vault-keys/keys.env') {
        return 'VAULT_TOKEN=test-token-123';
      }
      if (path === '/app/ssl/cert.pem') {
        return Buffer.from('mock-cert');
      }
      return '';
    });

    // Import Vault after mocking
    Vault = (await import('../../../src/lib/vault.js')).default;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('read', () => {
    test('should read a KV v2 secret successfully', async () => {
      const mockResponse = {
        statusCode: 200,
        on: jest.fn((event, handler) => {
          if (event === 'data') {
            handler(JSON.stringify({
              data: {
                data: {
                  username: 'testuser',
                  password: 'testpass'
                }
              }
            }));
          }
          if (event === 'end') handler();
        })
      };

      const mockReq = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
      };

      mockHttps.request.mockImplementation((opts, callback) => {
        callback(mockResponse);
        return mockReq;
      });

      const result = await Vault.read('secret/data/test/path');

      expect(result).toEqual({ username: 'testuser', password: 'testpass' });
      expect(mockHttps.request).toHaveBeenCalled();
    });

    test('should handle 404 response by returning null', async () => {
      const mockResponse = {
        statusCode: 404,
        on: jest.fn((event, handler) => {
          if (event === 'data') handler('');
          if (event === 'end') handler();
        })
      };

      const mockReq = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
      };

      mockHttps.request.mockImplementation((opts, callback) => {
        callback(mockResponse);
        return mockReq;
      });

      const result = await Vault.read('secret/data/nonexistent');

      expect(result).toBeNull();
    });

    test('should handle 204 No Content by returning empty object', async () => {
      const mockResponse = {
        statusCode: 204,
        on: jest.fn((event, handler) => {
          if (event === 'data') handler('');
          if (event === 'end') handler();
        })
      };

      const mockReq = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
      };

      mockHttps.request.mockImplementation((opts, callback) => {
        callback(mockResponse);
        return mockReq;
      });

      const result = await Vault.read('secret/data/empty');

      expect(result).toEqual({});
    });

    test('should handle empty data response', async () => {
      const mockResponse = {
        statusCode: 200,
        on: jest.fn((event, handler) => {
          if (event === 'data') handler('');
          if (event === 'end') handler();
        })
      };

      const mockReq = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
      };

      mockHttps.request.mockImplementation((opts, callback) => {
        callback(mockResponse);
        return mockReq;
      });

      const result = await Vault.read('secret/data/empty');

      expect(result).toEqual({});
    });

    test('should reject on HTTP error (5xx)', async () => {
      const mockResponse = {
        statusCode: 500,
        on: jest.fn((event, handler) => {
          if (event === 'data') handler('Internal Server Error');
          if (event === 'end') handler();
        })
      };

      const mockReq = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
      };

      mockHttps.request.mockImplementation((opts, callback) => {
        callback(mockResponse);
        return mockReq;
      });

      await expect(Vault.read('secret/data/error')).rejects.toThrow();
    });

    test('should reject on JSON parse error', async () => {
      const mockResponse = {
        statusCode: 200,
        on: jest.fn((event, handler) => {
          if (event === 'data') handler('invalid json {{{');
          if (event === 'end') handler();
        })
      };

      const mockReq = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
      };

      mockHttps.request.mockImplementation((opts, callback) => {
        callback(mockResponse);
        return mockReq;
      });

      await expect(Vault.read('secret/data/badjson')).rejects.toThrow();
    });

    test('should reject on network error', async () => {
      const mockReq = {
        on: jest.fn((event, handler) => {
          if (event === 'error') {
            // Simulate network error
            setTimeout(() => handler(new Error('ECONNREFUSED')), 0);
          }
        }),
        write: jest.fn(),
        end: jest.fn()
      };

      mockHttps.request.mockImplementation(() => mockReq);

      const promise = Vault.read('secret/data/network-error');
      await new Promise(resolve => setImmediate(resolve));

      await expect(promise).rejects.toThrow('ECONNREFUSED');
    });

    test('should parse data.data path for KV v2', async () => {
      const mockResponse = {
        statusCode: 200,
        on: jest.fn((event, handler) => {
          if (event === 'data') {
            handler(JSON.stringify({
              data: {
                data: { secret: 'value' }
              }
            }));
          }
          if (event === 'end') handler();
        })
      };

      const mockReq = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
      };

      mockHttps.request.mockImplementation((opts, callback) => {
        callback(mockResponse);
        return mockReq;
      });

      const result = await Vault.read('secret/data/kvv2');

      expect(result).toEqual({ secret: 'value' });
    });

    test('should fallback to data path if data.data is absent', async () => {
      const mockResponse = {
        statusCode: 200,
        on: jest.fn((event, handler) => {
          if (event === 'data') {
            handler(JSON.stringify({
              data: { secret: 'value' }
            }));
          }
          if (event === 'end') handler();
        })
      };

      const mockReq = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
      };

      mockHttps.request.mockImplementation((opts, callback) => {
        callback(mockResponse);
        return mockReq;
      });

      const result = await Vault.read('secret/data/kvv1-fallback');

      expect(result).toEqual({ secret: 'value' });
    });
  });

  describe('write', () => {
    test('should write a secret successfully', async () => {
      const mockResponse = {
        statusCode: 200,
        on: jest.fn((event, handler) => {
          if (event === 'data') handler(JSON.stringify({ data: {} }));
          if (event === 'end') handler();
        })
      };

      const mockReq = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
      };

      mockHttps.request.mockImplementation((opts, callback) => {
        callback(mockResponse);
        return mockReq;
      });

      const secretData = { key: 'value', password: 'secret' };
      await Vault.write('secret/data/test/path', secretData);

      expect(mockHttps.request).toHaveBeenCalled();
      expect(mockReq.write).toHaveBeenCalledWith(
        JSON.stringify({ data: secretData })
      );
    });

    test('should reject on write error', async () => {
      const mockReq = {
        on: jest.fn((event, handler) => {
          if (event === 'error') {
            setTimeout(() => handler(new Error('Write failed')), 0);
          }
        }),
        write: jest.fn(),
        end: jest.fn()
      };

      mockHttps.request.mockImplementation(() => mockReq);

      await expect(Vault.write('secret/data/error', {})).rejects.toThrow();
    });
  });

  describe('delete', () => {
    test('should delete a secret successfully', async () => {
      const mockResponse = {
        statusCode: 204,
        on: jest.fn((event, handler) => {
          if (event === 'data') handler('');
          if (event === 'end') handler();
        })
      };

      const mockReq = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
      };

      mockHttps.request.mockImplementation((opts, callback) => {
        callback(mockResponse);
        return mockReq;
      });

      await Vault.delete('secret/metadata/test/path');

      expect(mockHttps.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE'
        }),
        expect.any(Function)
      );
    });

    test('should reject on delete error', async () => {
      const mockReq = {
        on: jest.fn((event, handler) => {
          if (event === 'error') {
            setTimeout(() => handler(new Error('Delete failed')), 0);
          }
        }),
        write: jest.fn(),
        end: jest.fn()
      };

      mockHttps.request.mockImplementation(() => mockReq);

      await expect(Vault.delete('secret/metadata/error')).rejects.toThrow();
    });
  });

  describe('vaultRequest', () => {
    test('should construct correct HTTPS request options', async () => {
      const mockResponse = {
        statusCode: 200,
        on: jest.fn((event, handler) => {
          if (event === 'data') handler(JSON.stringify({ data: {} }));
          if (event === 'end') handler();
        })
      };

      const mockReq = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
      };

      mockHttps.request.mockImplementation((opts, callback) => {
        callback(mockResponse);
        return mockReq;
      });

      await Vault.read('secret/data/test');

      const callArgs = mockHttps.request.mock.calls[0][0];
      expect(callArgs).toEqual(expect.objectContaining({
        hostname: expect.any(String),
        port: expect.any(Number),
        path: expect.stringContaining('/v1/'),
        method: 'GET',
        headers: expect.objectContaining({
          'X-Vault-Token': 'test-token-123',
          'Content-Type': 'application/json'
        })
      }));
    });

    test('should include CA certificate when available', async () => {
      mockFs.existsSync.mockReturnValue(true);

      const mockResponse = {
        statusCode: 200,
        on: jest.fn((event, handler) => {
          if (event === 'data') handler(JSON.stringify({ data: {} }));
          if (event === 'end') handler();
        })
      };

      const mockReq = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
      };

      mockHttps.request.mockImplementation((opts, callback) => {
        callback(mockResponse);
        return mockReq;
      });

      process.env.NODE_EXTRA_CA_CERTS = '/path/to/cert';

      // Need to re-import to pick up env var
      jest.resetModules();
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('mock-cert');
      
      const VaultReloaded = (await import('../../../src/lib/vault.js')).default;
      await VaultReloaded.read('secret/data/test');

      const callArgs = mockHttps.request.mock.calls[0][0];
      expect(callArgs.ca).toBeDefined();
    });
  });
});
