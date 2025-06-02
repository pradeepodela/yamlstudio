export interface SecurityScheme {
  type: string;
  scheme?: string;
  bearerFormat?: string;
  flows?: {
    [key: string]: {
      authorizationUrl?: string;
      tokenUrl?: string;
      scopes?: { [key: string]: string };
    };
  };
}

export interface Parameter {
  name: string;
  in: string;
  required?: boolean;
  description?: string;
  'x-zia-agent-param-type'?: string;
  schema?: {
    type: string;
  };
}

export interface Response {
  statusCode: string;
  description: string;
  content?: {
    'application/json'?: {
      schema?: {
        $ref?: string;
      };
    };
  };
}

export interface Operation {
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  security?: Array<{ [key: string]: string[] }>;
  parameters?: Parameter[];
  requestBody?: {
    required?: boolean;
    content?: {
      'application/json'?: {
        schema?: {
          $ref?: string;
        };
      };
    };
  };
  responses?: Response[];
}

export interface ApiSpec {
  openapi?: string;
  swagger?: string;
  info: {
    title: string;
    version: string;
    description?: string;
    contact?: {
      name?: string;
      email?: string;
      url?: string;
    };
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  paths: {
    [path: string]: {
      [method: string]: Operation;
    };
  };
  components?: {
    schemas?: {
      [name: string]: {
        type: string;
        properties?: {
          [name: string]: {
            type: string;
            description?: string;
            'x-zia-agent-param-type'?: string;
          };
        };
        required?: string[];
      };
    };
    securitySchemes?: {
      [name: string]: SecurityScheme;
    };
  };
  security?: Array<{ [key: string]: string[] }>;
}
