import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'LIBNEXA RESTful API',
      version: '1.0.0',
      description:
        'RESTful API for LIBNEXA: Mobile Library Catalog and Borrowing Management System at Nasarawa State University, Keffi (NSUK), Nigeria.',
      contact: {
        name: 'NSUK Library Systems & Technology Unit',
        email: 'library@nsuk.edu.ng',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000/api/v1',
        description: 'Local Development Server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
