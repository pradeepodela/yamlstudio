export interface OpenAPISpec {
  openapi?: string;
  info?: {
    title?: string;
    description?: string;
    version?: string;
    contact?: {
      name?: string;
      email?: string;
      url?: string;
    };
  };
  servers?: Server[];
  paths?: { [path: string]: PathItem };
  components?: {
    schemas?: { [name: string]: Schema };
    securitySchemes?: { [name: string]: SecurityScheme };
  };
  security?: SecurityRequirement[];
}

export interface Server {
  url: string;
  description?: string;
}

export interface PathItem {
  [method: string]: Operation;
}

export interface Operation {
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  security?: SecurityRequirement[];
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses?: Response[];
}

export interface Parameter {
  name: string;
  in: string;
  required?: boolean;
  description?: string;
  'x-zia-agent-param-type'?: string;
  schema?: Schema;
}

export interface RequestBody {
  required?: boolean;
  content?: {
    'application/json'?: {
      schema?: Schema | SchemaReference;
    };
  };
}

export interface Response {
  statusCode: string;
  description: string;
  content?: {
    'application/json'?: {
      schema?: Schema | SchemaReference;
    };
  };
}

export interface Schema {
  type: string;
  properties?: { [name: string]: Property };
  required?: string[];
}

export interface SchemaReference {
  $ref: string;
}

export interface Property {
  type: string;
  description?: string;
  'x-zia-agent-param-type'?: string;
}

export interface SecurityScheme {
  type: string;
  scheme?: string;
  bearerFormat?: string;
  flows?: {
    [flowType: string]: {
      authorizationUrl?: string;
      tokenUrl?: string;
      scopes?: { [scope: string]: string };
    };
  };
}

export interface SecurityRequirement {
  [name: string]: string[];
}
