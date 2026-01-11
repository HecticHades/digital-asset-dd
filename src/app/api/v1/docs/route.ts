import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * OpenAPI 3.0 Specification for the Digital Asset Due Diligence API
 */
const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Digital Asset Due Diligence API',
    description: `
REST API for the Digital Asset Due Diligence Tool.

## Authentication

All API requests require authentication using an API key. You can obtain an API key from the Settings > API Keys page in the dashboard.

Include your API key in requests using one of these methods:
- **Authorization header**: \`Authorization: Bearer <your-api-key>\`
- **X-API-Key header**: \`X-API-Key: <your-api-key>\`

## Rate Limiting

API requests are rate limited to **100 requests per minute** per API key.

Rate limit headers are included in all responses:
- \`X-RateLimit-Limit\`: Maximum requests allowed per window
- \`X-RateLimit-Remaining\`: Requests remaining in current window
- \`X-RateLimit-Reset\`: Unix timestamp when the window resets

## Scopes

API keys can be configured with the following scopes:
- **read**: Access to read resources (GET requests)
- **write**: Access to create and update resources (POST, PATCH requests)
- **delete**: Access to delete resources (DELETE requests)

## Pagination

List endpoints support pagination using query parameters:
- \`page\`: Page number (default: 1)
- \`limit\`: Items per page (default: 20, max: 100)

Responses include pagination metadata:
\`\`\`json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
\`\`\`

## Error Responses

Errors are returned with appropriate HTTP status codes and a JSON body:
\`\`\`json
{
  "error": "Error message describing what went wrong"
}
\`\`\`

Common status codes:
- \`400\` - Bad Request (invalid parameters)
- \`401\` - Unauthorized (missing or invalid API key)
- \`403\` - Forbidden (insufficient scopes)
- \`404\` - Not Found
- \`429\` - Too Many Requests (rate limited)
- \`500\` - Internal Server Error
    `,
    version: '1.0.0',
    contact: {
      name: 'API Support',
      email: 'support@example.com',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1',
    },
  ],
  security: [
    { bearerAuth: [] },
    { apiKeyAuth: [] },
  ],
  tags: [
    { name: 'Clients', description: 'Client management endpoints' },
    { name: 'Cases', description: 'Case management endpoints' },
    { name: 'Documents', description: 'Document management endpoints' },
    { name: 'Transactions', description: 'Transaction management endpoints' },
  ],
  paths: {
    '/clients': {
      get: {
        tags: ['Clients'],
        summary: 'List all clients',
        description: 'Retrieve a paginated list of clients',
        operationId: 'listClients',
        parameters: [
          { $ref: '#/components/parameters/page' },
          { $ref: '#/components/parameters/limit' },
          {
            name: 'status',
            in: 'query',
            schema: { $ref: '#/components/schemas/ClientStatus' },
          },
          {
            name: 'risk_level',
            in: 'query',
            schema: { $ref: '#/components/schemas/RiskLevel' },
          },
          {
            name: 'search',
            in: 'query',
            description: 'Search by name or email',
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'List of clients',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Client' },
                    },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          429: { $ref: '#/components/responses/RateLimited' },
        },
      },
      post: {
        tags: ['Clients'],
        summary: 'Create a new client',
        operationId: 'createClient',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateClient' },
            },
          },
        },
        responses: {
          201: {
            description: 'Client created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/Client' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/clients/{clientId}': {
      get: {
        tags: ['Clients'],
        summary: 'Get a client by ID',
        operationId: 'getClient',
        parameters: [{ $ref: '#/components/parameters/clientId' }],
        responses: {
          200: {
            description: 'Client details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/ClientDetail' },
                  },
                },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        tags: ['Clients'],
        summary: 'Update a client',
        operationId: 'updateClient',
        parameters: [{ $ref: '#/components/parameters/clientId' }],
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateClient' },
            },
          },
        },
        responses: {
          200: {
            description: 'Client updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/ClientDetail' },
                  },
                },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Clients'],
        summary: 'Delete a client',
        operationId: 'deleteClient',
        parameters: [{ $ref: '#/components/parameters/clientId' }],
        responses: {
          200: {
            description: 'Client deleted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/cases': {
      get: {
        tags: ['Cases'],
        summary: 'List all cases',
        operationId: 'listCases',
        parameters: [
          { $ref: '#/components/parameters/page' },
          { $ref: '#/components/parameters/limit' },
          {
            name: 'status',
            in: 'query',
            schema: { $ref: '#/components/schemas/CaseStatus' },
          },
          {
            name: 'risk_level',
            in: 'query',
            schema: { $ref: '#/components/schemas/RiskLevel' },
          },
          {
            name: 'client_id',
            in: 'query',
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'List of cases',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Case' },
                    },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Cases'],
        summary: 'Create a new case',
        operationId: 'createCase',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateCase' },
            },
          },
        },
        responses: {
          201: {
            description: 'Case created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/Case' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/cases/{caseId}': {
      get: {
        tags: ['Cases'],
        summary: 'Get a case by ID',
        operationId: 'getCase',
        parameters: [{ $ref: '#/components/parameters/caseId' }],
        responses: {
          200: {
            description: 'Case details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/CaseDetail' },
                  },
                },
              },
            },
          },
        },
      },
      patch: {
        tags: ['Cases'],
        summary: 'Update a case',
        operationId: 'updateCase',
        parameters: [{ $ref: '#/components/parameters/caseId' }],
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateCase' },
            },
          },
        },
        responses: {
          200: { description: 'Case updated' },
        },
      },
      delete: {
        tags: ['Cases'],
        summary: 'Delete a case',
        operationId: 'deleteCase',
        parameters: [{ $ref: '#/components/parameters/caseId' }],
        responses: {
          200: { description: 'Case deleted' },
        },
      },
    },
    '/documents': {
      get: {
        tags: ['Documents'],
        summary: 'List all documents',
        operationId: 'listDocuments',
        parameters: [
          { $ref: '#/components/parameters/page' },
          { $ref: '#/components/parameters/limit' },
          {
            name: 'client_id',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'category',
            in: 'query',
            schema: { $ref: '#/components/schemas/DocumentType' },
          },
          {
            name: 'status',
            in: 'query',
            schema: { $ref: '#/components/schemas/DocumentStatus' },
          },
        ],
        responses: {
          200: {
            description: 'List of documents',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Document' },
                    },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/documents/{documentId}': {
      get: {
        tags: ['Documents'],
        summary: 'Get a document by ID',
        operationId: 'getDocument',
        parameters: [{ $ref: '#/components/parameters/documentId' }],
        responses: {
          200: {
            description: 'Document details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/DocumentDetail' },
                  },
                },
              },
            },
          },
        },
      },
      patch: {
        tags: ['Documents'],
        summary: 'Update a document',
        operationId: 'updateDocument',
        parameters: [{ $ref: '#/components/parameters/documentId' }],
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateDocument' },
            },
          },
        },
        responses: {
          200: { description: 'Document updated' },
        },
      },
      delete: {
        tags: ['Documents'],
        summary: 'Delete a document',
        operationId: 'deleteDocument',
        parameters: [{ $ref: '#/components/parameters/documentId' }],
        responses: {
          200: { description: 'Document deleted' },
        },
      },
    },
    '/transactions': {
      get: {
        tags: ['Transactions'],
        summary: 'List all transactions',
        operationId: 'listTransactions',
        parameters: [
          { $ref: '#/components/parameters/page' },
          { $ref: '#/components/parameters/limit' },
          {
            name: 'client_id',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'wallet_id',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'type',
            in: 'query',
            schema: { $ref: '#/components/schemas/TransactionType' },
          },
          {
            name: 'source',
            in: 'query',
            schema: { $ref: '#/components/schemas/TransactionSource' },
          },
          {
            name: 'asset',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'start_date',
            in: 'query',
            schema: { type: 'string', format: 'date-time' },
          },
          {
            name: 'end_date',
            in: 'query',
            schema: { type: 'string', format: 'date-time' },
          },
        ],
        responses: {
          200: {
            description: 'List of transactions',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Transaction' },
                    },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/transactions/{transactionId}': {
      get: {
        tags: ['Transactions'],
        summary: 'Get a transaction by ID',
        operationId: 'getTransaction',
        parameters: [{ $ref: '#/components/parameters/transactionId' }],
        responses: {
          200: {
            description: 'Transaction details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/TransactionDetail' },
                  },
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Transactions'],
        summary: 'Delete a transaction',
        operationId: 'deleteTransaction',
        parameters: [{ $ref: '#/components/parameters/transactionId' }],
        responses: {
          200: { description: 'Transaction deleted' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        description: 'API key as Bearer token',
      },
      apiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key in header',
      },
    },
    parameters: {
      page: {
        name: 'page',
        in: 'query',
        description: 'Page number',
        schema: { type: 'integer', default: 1, minimum: 1 },
      },
      limit: {
        name: 'limit',
        in: 'query',
        description: 'Items per page',
        schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
      },
      clientId: {
        name: 'clientId',
        in: 'path',
        required: true,
        schema: { type: 'string' },
      },
      caseId: {
        name: 'caseId',
        in: 'path',
        required: true,
        schema: { type: 'string' },
      },
      documentId: {
        name: 'documentId',
        in: 'path',
        required: true,
        schema: { type: 'string' },
      },
      transactionId: {
        name: 'transactionId',
        in: 'path',
        required: true,
        schema: { type: 'string' },
      },
    },
    schemas: {
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },
      ClientStatus: {
        type: 'string',
        enum: ['PENDING', 'IN_PROGRESS', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED'],
      },
      CaseStatus: {
        type: 'string',
        enum: ['DRAFT', 'IN_PROGRESS', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED', 'ARCHIVED'],
      },
      RiskLevel: {
        type: 'string',
        enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'UNASSESSED'],
      },
      DocumentType: {
        type: 'string',
        enum: ['ID', 'PROOF_OF_ADDRESS', 'TAX_RETURNS', 'BANK_STATEMENTS', 'SOURCE_OF_WEALTH', 'SOURCE_OF_FUNDS', 'EXCHANGE_STATEMENTS', 'WALLET_PROOF', 'OTHER'],
      },
      DocumentStatus: {
        type: 'string',
        enum: ['PENDING', 'VERIFIED', 'REJECTED'],
      },
      TransactionType: {
        type: 'string',
        enum: ['BUY', 'SELL', 'DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'SWAP', 'STAKE', 'UNSTAKE', 'REWARD', 'FEE', 'OTHER'],
      },
      TransactionSource: {
        type: 'string',
        enum: ['CEX_IMPORT', 'ON_CHAIN', 'API_SYNC', 'MANUAL'],
      },
      Client: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', nullable: true },
          phone: { type: 'string', nullable: true },
          address: { type: 'string', nullable: true },
          status: { $ref: '#/components/schemas/ClientStatus' },
          riskLevel: { $ref: '#/components/schemas/RiskLevel' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ClientDetail: {
        allOf: [
          { $ref: '#/components/schemas/Client' },
          {
            type: 'object',
            properties: {
              notes: { type: 'string', nullable: true },
              _counts: {
                type: 'object',
                properties: {
                  wallets: { type: 'integer' },
                  documents: { type: 'integer' },
                  transactions: { type: 'integer' },
                  cases: { type: 'integer' },
                },
              },
            },
          },
        ],
      },
      CreateClient: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', maxLength: 200 },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string', maxLength: 50 },
          address: { type: 'string', maxLength: 500 },
          notes: { type: 'string', maxLength: 5000 },
        },
      },
      UpdateClient: {
        type: 'object',
        properties: {
          name: { type: 'string', maxLength: 200 },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string', maxLength: 50 },
          address: { type: 'string', maxLength: 500 },
          notes: { type: 'string', maxLength: 5000 },
          status: { $ref: '#/components/schemas/ClientStatus' },
          riskLevel: { $ref: '#/components/schemas/RiskLevel' },
        },
      },
      Case: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          status: { $ref: '#/components/schemas/CaseStatus' },
          riskScore: { type: 'integer', nullable: true },
          riskLevel: { $ref: '#/components/schemas/RiskLevel' },
          dueDate: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          client: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
            },
          },
          assignedTo: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
            },
          },
        },
      },
      CaseDetail: {
        allOf: [
          { $ref: '#/components/schemas/Case' },
          {
            type: 'object',
            properties: {
              reviewNotes: { type: 'string', nullable: true },
              reviewedAt: { type: 'string', format: 'date-time', nullable: true },
              _counts: {
                type: 'object',
                properties: {
                  findings: { type: 'integer' },
                  checklistItems: { type: 'integer' },
                  reports: { type: 'integer' },
                },
              },
            },
          },
        ],
      },
      CreateCase: {
        type: 'object',
        required: ['title', 'clientId'],
        properties: {
          title: { type: 'string', maxLength: 200 },
          description: { type: 'string', maxLength: 5000 },
          clientId: { type: 'string' },
          dueDate: { type: 'string', format: 'date-time' },
        },
      },
      UpdateCase: {
        type: 'object',
        properties: {
          title: { type: 'string', maxLength: 200 },
          description: { type: 'string', maxLength: 5000 },
          status: { $ref: '#/components/schemas/CaseStatus' },
          riskScore: { type: 'integer', minimum: 0, maximum: 100 },
          riskLevel: { $ref: '#/components/schemas/RiskLevel' },
          dueDate: { type: 'string', format: 'date-time' },
          assignedToId: { type: 'string' },
        },
      },
      Document: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          filename: { type: 'string' },
          originalName: { type: 'string' },
          mimeType: { type: 'string' },
          size: { type: 'integer' },
          category: { $ref: '#/components/schemas/DocumentType' },
          status: { $ref: '#/components/schemas/DocumentStatus' },
          notes: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          verifiedAt: { type: 'string', format: 'date-time', nullable: true },
          client: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
            },
          },
        },
      },
      DocumentDetail: {
        allOf: [
          { $ref: '#/components/schemas/Document' },
          {
            type: 'object',
            properties: {
              path: { type: 'string' },
            },
          },
        ],
      },
      UpdateDocument: {
        type: 'object',
        properties: {
          category: { $ref: '#/components/schemas/DocumentType' },
          status: { $ref: '#/components/schemas/DocumentStatus' },
          notes: { type: 'string', maxLength: 5000 },
        },
      },
      Transaction: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
          type: { $ref: '#/components/schemas/TransactionType' },
          asset: { type: 'string' },
          amount: { type: 'string' },
          price: { type: 'string', nullable: true },
          fee: { type: 'string', nullable: true },
          value: { type: 'string', nullable: true },
          exchange: { type: 'string', nullable: true },
          source: { $ref: '#/components/schemas/TransactionSource' },
          txHash: { type: 'string', nullable: true },
          fromAddress: { type: 'string', nullable: true },
          toAddress: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          client: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
            },
          },
          wallet: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'string' },
              address: { type: 'string' },
              blockchain: { type: 'string' },
            },
          },
        },
      },
      TransactionDetail: {
        allOf: [
          { $ref: '#/components/schemas/Transaction' },
          {
            type: 'object',
            properties: {
              rawData: { type: 'object' },
              findings: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    title: { type: 'string' },
                    severity: { type: 'string' },
                    category: { type: 'string' },
                    isResolved: { type: 'boolean' },
                  },
                },
              },
            },
          },
        ],
      },
    },
    responses: {
      BadRequest: {
        description: 'Bad request - invalid parameters',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: { type: 'string' },
              },
            },
          },
        },
      },
      Unauthorized: {
        description: 'Unauthorized - missing or invalid API key',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: { type: 'string' },
              },
            },
          },
        },
      },
      Forbidden: {
        description: 'Forbidden - insufficient scopes',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: { type: 'string' },
                required_scopes: { type: 'array', items: { type: 'string' } },
                your_scopes: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: { type: 'string' },
              },
            },
          },
        },
      },
      RateLimited: {
        description: 'Rate limit exceeded',
        headers: {
          'X-RateLimit-Limit': {
            schema: { type: 'integer' },
            description: 'Maximum requests per window',
          },
          'X-RateLimit-Remaining': {
            schema: { type: 'integer' },
            description: 'Requests remaining',
          },
          'X-RateLimit-Reset': {
            schema: { type: 'integer' },
            description: 'Unix timestamp when window resets',
          },
        },
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
}

/**
 * GET /api/v1/docs
 * Returns OpenAPI specification as JSON
 */
export async function GET() {
  return NextResponse.json(openApiSpec)
}
