export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'ArogyaX2 API',
    version: '1.0.0',
    description: 'API documentation for the ArogyaX2 auth, patient, clinic, laboratory, and hospital services.',
  },
  servers: [
    { url: 'http://localhost:5000', description: 'Auth service' },
    { url: 'http://localhost:5001', description: 'Patient service' },
    { url: 'http://localhost:5002', description: 'Clinic service' },
    { url: 'http://localhost:5003', description: 'Laboratory service' },
    { url: 'http://localhost:5004', description: 'Hospital service' },
  ],
  tags: [
    { name: 'Auth', description: 'Login, registration, onboarding, verification, and account APIs.' },
    { name: 'Patient', description: 'Patient module APIs.' },
    { name: 'Clinic', description: 'Clinic module APIs.' },
    { name: 'Laboratory', description: 'Laboratory module APIs.' },
    { name: 'Hospital', description: 'Hospital module APIs.' },
  ],
  paths: {
    '/api/auth/health': {
      get: {
        tags: ['Auth'],
        summary: 'Check auth backend and database health',
        responses: {
          200: {
            description: 'Auth backend health state',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthHealthResponse' },
              },
            },
          },
        },
      },
    },
    '/api/auth/check': {
      get: {
        tags: ['Auth'],
        summary: 'Check if a user exists by email',
        parameters: [
          { name: 'email', in: 'query', required: true, schema: { type: 'string', format: 'email' } },
        ],
        responses: {
          200: {
            description: 'User existence and onboarding state',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthCheckResponse' },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
        },
      },
    },
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register or return an existing Google-authenticated user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Registered or existing user',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RegisterResponse' },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
        },
      },
    },
    '/api/auth/patient-profile': {
      post: {
        tags: ['Auth'],
        summary: 'Save patient onboarding profile',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PatientProfileRequest' },
            },
          },
        },
        responses: {
          200: { $ref: '#/components/responses/UserResponse' },
          400: { $ref: '#/components/responses/BadRequest' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/auth/patient-family': {
      get: {
        tags: ['Auth'],
        summary: 'Get patient family members',
        parameters: [
          { name: 'email', in: 'query', required: true, schema: { type: 'string', format: 'email' } },
        ],
        responses: {
          200: {
            description: 'Family members for the patient account',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    familyMembers: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/FamilyMember' },
                    },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      post: {
        tags: ['Auth'],
        summary: 'Save patient family members',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'familyMembers'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  familyMembers: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/FamilyMember' },
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Updated user and family member list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/User' },
                    familyMembers: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/FamilyMember' },
                    },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/auth/clinic-profile': {
      post: {
        tags: ['Auth'],
        summary: 'Save clinic onboarding profile for admin verification',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ClinicProfileRequest' },
            },
          },
        },
        responses: {
          200: { $ref: '#/components/responses/UserResponse' },
          400: { $ref: '#/components/responses/BadRequest' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/auth/lab-profile': {
      post: {
        tags: ['Auth'],
        summary: 'Save laboratory onboarding profile for admin verification',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LabProfileRequest' },
            },
          },
        },
        responses: {
          200: { $ref: '#/components/responses/UserResponse' },
          400: { $ref: '#/components/responses/BadRequest' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/auth/hospital-profile': {
      post: {
        tags: ['Auth'],
        summary: 'Save hospital onboarding profile for admin verification',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/HospitalProfileRequest' },
            },
          },
        },
        responses: {
          200: { $ref: '#/components/responses/UserResponse' },
          400: { $ref: '#/components/responses/BadRequest' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/auth/pending-verifications': {
      get: {
        tags: ['Auth'],
        summary: 'List clinic, laboratory, and hospital accounts pending admin verification',
        responses: {
          200: {
            description: 'Pending provider verification requests',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    pending: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/User' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/verify-user': {
      post: {
        tags: ['Auth'],
        summary: 'Approve or reject a provider account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'status'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  status: { type: 'string', enum: ['approved', 'rejected'] },
                },
              },
            },
          },
        },
        responses: {
          200: { $ref: '#/components/responses/UserResponse' },
          400: { $ref: '#/components/responses/BadRequest' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/auth/hospital-user': {
      post: {
        tags: ['Auth'],
        summary: 'Create a hospital internal user and generated credentials',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/HospitalUserRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Updated hospital user and generated credentials',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/User' },
                    credentials: {
                      type: 'object',
                      properties: {
                        username: { type: 'string' },
                        password: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user by email',
        parameters: [
          { name: 'email', in: 'query', required: true, schema: { type: 'string', format: 'email' } },
        ],
        responses: {
          200: { $ref: '#/components/responses/UserResponse' },
          400: { $ref: '#/components/responses/BadRequest' },
        },
      },
    },
    '/api/patient/health': {
      get: {
        tags: ['Patient'],
        summary: 'Check patient backend health',
        servers: [{ url: 'http://localhost:5001' }],
        responses: { 200: { $ref: '#/components/responses/ModuleHealthResponse' } },
      },
    },
    '/api/patient': {
      get: {
        tags: ['Patient'],
        summary: 'Check patient module readiness',
        servers: [{ url: 'http://localhost:5001' }],
        responses: { 200: { $ref: '#/components/responses/ModuleReadyResponse' } },
      },
    },
    '/api/clinic/health': {
      get: {
        tags: ['Clinic'],
        summary: 'Check clinic backend health',
        servers: [{ url: 'http://localhost:5002' }],
        responses: { 200: { $ref: '#/components/responses/ModuleHealthResponse' } },
      },
    },
    '/api/clinic': {
      get: {
        tags: ['Clinic'],
        summary: 'Check clinic module readiness',
        servers: [{ url: 'http://localhost:5002' }],
        responses: { 200: { $ref: '#/components/responses/ModuleReadyResponse' } },
      },
    },
    '/api/laboratory/health': {
      get: {
        tags: ['Laboratory'],
        summary: 'Check laboratory backend health',
        servers: [{ url: 'http://localhost:5003' }],
        responses: { 200: { $ref: '#/components/responses/ModuleHealthResponse' } },
      },
    },
    '/api/laboratory': {
      get: {
        tags: ['Laboratory'],
        summary: 'Check laboratory module readiness',
        servers: [{ url: 'http://localhost:5003' }],
        responses: { 200: { $ref: '#/components/responses/ModuleReadyResponse' } },
      },
    },
    '/api/hospital/health': {
      get: {
        tags: ['Hospital'],
        summary: 'Check hospital backend health',
        servers: [{ url: 'http://localhost:5004' }],
        responses: { 200: { $ref: '#/components/responses/ModuleHealthResponse' } },
      },
    },
    '/api/hospital': {
      get: {
        tags: ['Hospital'],
        summary: 'Check hospital module readiness',
        servers: [{ url: 'http://localhost:5004' }],
        responses: { 200: { $ref: '#/components/responses/ModuleReadyResponse' } },
      },
    },
  },
  components: {
    responses: {
      BadRequest: {
        description: 'Invalid or missing request data',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      NotFound: {
        description: 'Requested user or record was not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      UserResponse: {
        description: 'User response',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                user: { $ref: '#/components/schemas/User' },
              },
            },
          },
        },
      },
      ModuleHealthResponse: {
        description: 'Module health response',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: { type: 'string' },
              },
            },
          },
        },
      },
      ModuleReadyResponse: {
        description: 'Module readiness response',
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
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          message: { type: 'string' },
        },
      },
      AuthHealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'Auth backend is running' },
          database: { type: 'string', example: 'connected' },
        },
      },
      AuthCheckResponse: {
        type: 'object',
        properties: {
          exists: { type: 'boolean' },
          user: { $ref: '#/components/schemas/User' },
          needOnboarding: { type: 'boolean' },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['name', 'email', 'googleId', 'role'],
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          googleId: { type: 'string' },
          role: { type: 'string', enum: ['admin', 'patient', 'clinic', 'doctor', 'laboratory', 'hospital'] },
        },
      },
      RegisterResponse: {
        type: 'object',
        properties: {
          exists: { type: 'boolean' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      User: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          googleId: { type: 'string' },
          role: { type: 'string' },
          isVerified: { type: 'boolean' },
          verificationStatus: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
          onboardingComplete: { type: 'boolean' },
          profile: { type: 'object', additionalProperties: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      PatientProfileRequest: {
        type: 'object',
        required: ['email', 'profile'],
        properties: {
          email: { type: 'string', format: 'email' },
          profile: { $ref: '#/components/schemas/PatientProfile' },
        },
      },
      PatientProfile: {
        type: 'object',
        properties: {
          fullName: { type: 'string' },
          dob: { type: 'string', format: 'date' },
          gender: { type: 'string' },
          bloodGroup: { type: 'string' },
          preferredLanguage: { type: 'string' },
          address: { type: 'string' },
          contactMethods: { type: 'array', items: { type: 'string' } },
          emergencyContactName: { type: 'string' },
          emergencyRelationship: { type: 'string' },
          emergencyPhone: { type: 'string' },
          allergies: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
          chronicConditions: { type: 'array', items: { type: 'string' } },
          currentMedications: { type: 'string' },
          dietaryPreferences: { type: 'string' },
          lifestyleHabits: { type: 'string' },
          familyMedicalHistory: { type: 'array', items: { type: 'string' } },
          insuranceProvider: { type: 'string' },
          policyNumber: { type: 'string' },
          consentGiven: { type: 'boolean' },
        },
      },
      FamilyMember: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          relationship: { type: 'string' },
          dateOfBirth: { type: 'string', format: 'date' },
          age: { type: 'integer' },
          gender: { type: 'string' },
          phone: { type: 'string' },
          email: { type: 'string' },
          address: { type: 'string' },
          bloodType: { type: 'string' },
          allergies: { type: 'string' },
          chronicIllnesses: { type: 'string' },
          emergencyContact: { type: 'string' },
        },
      },
      ClinicProfileRequest: {
        type: 'object',
        required: ['email', 'clinicProfile'],
        properties: {
          email: { type: 'string', format: 'email' },
          clinicProfile: { type: 'object', additionalProperties: true },
        },
      },
      LabProfileRequest: {
        type: 'object',
        required: ['email', 'labProfile'],
        properties: {
          email: { type: 'string', format: 'email' },
          labProfile: { type: 'object', additionalProperties: true },
        },
      },
      HospitalProfileRequest: {
        type: 'object',
        required: ['email', 'hospitalProfile'],
        properties: {
          email: { type: 'string', format: 'email' },
          hospitalProfile: { type: 'object', additionalProperties: true },
        },
      },
      HospitalUserRequest: {
        type: 'object',
        required: ['email', 'user'],
        properties: {
          email: { type: 'string', format: 'email' },
          user: {
            type: 'object',
            required: ['name', 'role'],
            properties: {
              name: { type: 'string' },
              role: { type: 'string' },
              specialty: { type: 'string' },
              cabin: { type: 'string' },
              counter: { type: 'string' },
              ward: { type: 'string' },
              department: { type: 'string' },
            },
          },
        },
      },
    },
  },
};

export function swaggerHtml() {
  const endpointRows = Object.entries(openApiSpec.paths)
    .flatMap(([path, methods]) =>
      Object.entries(methods).map(([method, operation]) => ({
        method: method.toUpperCase(),
        path,
        tag: operation.tags?.[0] || 'API',
        summary: operation.summary || '',
      })),
    )
    .map(
      (endpoint) => `
        <article class="endpoint">
          <span class="method ${endpoint.method.toLowerCase()}">${endpoint.method}</span>
          <div>
            <strong>${endpoint.path}</strong>
            <p>${endpoint.summary}</p>
            <small>${endpoint.tag}</small>
          </div>
        </article>
      `,
    )
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ArogyaX2 Swagger API Docs</title>
  <style>
    body { margin: 0; font-family: Arial, sans-serif; background: #f8fafc; color: #0f172a; }
    header { padding: 2rem; background: #0f172a; color: white; }
    header h1 { margin: 0 0 .5rem; }
    header p { margin: 0; color: #cbd5e1; }
    main { max-width: 1120px; margin: 0 auto; padding: 1.5rem; display: grid; gap: 1rem; }
    .links, .endpoint { background: white; border: 1px solid #e2e8f0; border-radius: .9rem; box-shadow: 0 12px 30px rgba(15, 23, 42, .06); }
    .links { padding: 1rem; display: flex; gap: .75rem; flex-wrap: wrap; }
    a { color: #2563eb; font-weight: 800; text-decoration: none; }
    .endpoint { padding: 1rem; display: grid; grid-template-columns: 92px minmax(0, 1fr); gap: 1rem; align-items: start; }
    .method { display: inline-flex; justify-content: center; padding: .35rem .55rem; border-radius: .5rem; color: white; font-weight: 900; }
    .get { background: #2563eb; } .post { background: #047857; } .put { background: #7c3aed; } .delete { background: #b91c1c; }
    .endpoint strong { overflow-wrap: anywhere; }
    .endpoint p { margin: .25rem 0; color: #475569; }
    .endpoint small { color: #64748b; font-weight: 800; }
    pre { padding: 1rem; overflow: auto; background: #0f172a; color: #e2e8f0; border-radius: .9rem; }
    @media (max-width: 640px) { .endpoint { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <header>
    <h1>ArogyaX2 Swagger API Docs</h1>
    <p>OpenAPI 3 documentation for auth, patient, clinic, laboratory, and hospital services.</p>
  </header>
  <main>
    <section class="links">
      <a href="/api-docs/openapi.json">OpenAPI JSON</a>
      <a href="/api/auth/health">Auth Health</a>
      <a href="https://editor.swagger.io/?url=${encodeURIComponent('http://localhost:5000/api-docs/openapi.json')}">Open in Swagger Editor</a>
    </section>
    ${endpointRows}
  </main>
</body>
</html>`;
}
