import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { loader, action } from './apiRancho';

// Polyfill for Request in Node.js test environment
global.Request = class Request {
  method: string;
  url: string;
  
  constructor(url: string, options: { method?: string } = {}) {
    this.url = url;
    this.method = options.method || 'GET';
  }
} as any;

global.Response = class Response {
  status: number;
  headers: Map<string, string>;
  body: any;

  constructor(body: any, options: { status?: number; headers?: Record<string, string> } = {}) {
    this.body = body;
    this.status = options.status || 200;
    this.headers = new Map(Object.entries(options.headers || {}));
  }

  static json(data: any, options: { status?: number; headers?: Record<string, string> } = {}) {
    return new Response(JSON.stringify(data), {
      status: options.status,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
  }

  async json() {
    return JSON.parse(this.body);
  }

  get(headerName: string) {
    return this.headers.get(headerName);
  }
} as any;

// Mock Supabase with more realistic data
const mockSupabaseData = [
  {
    data: '2024-03-15',
    unidade: 'DIRAD - DIRAD',
    refeicao: 'almoco',
    total_vai_comer: 5
  },
  {
    data: '2024-03-15',
    unidade: 'GAP-RJ - HCA',
    refeicao: 'cafe',
    total_vai_comer: 3
  },
  {
    data: '2024-03-16',
    unidade: 'DIRAD - DIRAD',
    refeicao: 'janta',
    total_vai_comer: 7
  }
];

jest.mock('../utils/supabase', () => ({
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      order: jest.fn(() => ({
        order: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({
            data: mockSupabaseData,
            error: null
          }))
        }))
      }))
    }))
  }))
}));

describe('apiRancho routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loader', () => {
    it('should return 405 for non-GET requests', async () => {
      const request = new Request('http://localhost/api/rancho', {
        method: 'POST'
      });

      const response = await loader({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.error).toBe('Método não permitido. Use apenas GET.');
    });

    it('should return data for GET requests', async () => {
      const request = new Request('http://localhost/api/rancho', {
        method: 'GET'
      });

      const response = await loader({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('summary');
      expect(data).toHaveProperty('data');
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data).toEqual(mockSupabaseData);
    });

    it('should include correct CORS headers', async () => {
      const request = new Request('http://localhost/api/rancho', {
        method: 'GET'
      });

      const response = await loader({ request } as any);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET');
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=300');
    });

    it('should calculate summary statistics correctly', async () => {
      const request = new Request('http://localhost/api/rancho', {
        method: 'GET'
      });

      const response = await loader({ request } as any);
      const data = await response.json();

      expect(data.summary).toHaveProperty('total_records');
      expect(data.summary).toHaveProperty('total_pessoas_comendo');
      expect(data.summary).toHaveProperty('total_dias');
      expect(data.summary).toHaveProperty('total_unidades');
      expect(data.summary).toHaveProperty('total_refeicoes_servidas');
      
      // Verify calculated values based on mock data
      expect(data.summary.total_records).toBe(3);
      expect(data.summary.total_pessoas_comendo).toBe(15); // 5 + 3 + 7
      expect(data.summary.total_dias).toBe(2); // 2024-03-15 and 2024-03-16
      expect(data.summary.total_unidades).toBe(2); // DIRAD and GAP-RJ
      expect(data.summary.total_refeicoes_servidas).toBe(15);
      
      expect(typeof data.summary.total_records).toBe('number');
      expect(typeof data.summary.total_pessoas_comendo).toBe('number');
      expect(typeof data.summary.total_dias).toBe('number');
      expect(typeof data.summary.total_unidades).toBe('number');
    });

  });

  describe('action', () => {
    it('should handle OPTIONS requests for CORS', async () => {
      const request = new Request('http://localhost/api/rancho', {
        method: 'OPTIONS'
      });

      const response = await action({ request } as any);

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET');
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
    });

    it('should return 405 for non-OPTIONS requests', async () => {
      const request = new Request('http://localhost/api/rancho', {
        method: 'POST'
      });

      const response = await action({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.error).toBe('Método não permitido');
    });

    it('should return 405 for PUT requests', async () => {
      const request = new Request('http://localhost/api/rancho', {
        method: 'PUT'
      });

      const response = await action({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.error).toBe('Método não permitido');
    });
  });
});