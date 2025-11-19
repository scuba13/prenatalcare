import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import { retryFhirGet, retryFhirPost } from '../utils/retry.util';

export interface FhirAuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
  expires_at?: number; // Timestamp when token expires
}

@Injectable()
export class FhirClientService implements OnModuleInit {
  private readonly logger = new Logger(FhirClientService.name);
  private baseUrl: string;
  private authUrl: string;
  private clientId: string;
  private clientSecret: string;
  private currentToken: FhirAuthToken | null = null;
  private httpsAgent: https.Agent | null = null;
  private useMtls: boolean;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    // Configuração RNDS
    this.baseUrl = this.configService.get<string>('RNDS_BASE_URL', 'http://localhost:3003');
    this.authUrl = this.configService.get<string>('RNDS_AUTH_URL', 'http://localhost:3003/oauth2/token');
    this.clientId = this.configService.get<string>('RNDS_CLIENT_ID', 'mock-client');
    this.clientSecret = this.configService.get<string>('RNDS_CLIENT_SECRET', 'mock-secret');
    this.useMtls = this.configService.get<boolean>('RNDS_USE_MTLS', false);
  }

  async onModuleInit() {
    this.logger.log('Initializing FHIR Client...');

    if (this.useMtls) {
      this.setupMtls();
    }

    // Test connection
    try {
      await this.getMetadata();
      this.logger.log(`✅ Connected to RNDS at ${this.baseUrl}`);
    } catch (error) {
      this.logger.error(`❌ Failed to connect to RNDS: ${error.message}`);
    }
  }

  /**
   * Configura mTLS (Mutual TLS) para conexões com RNDS
   * Carrega certificados do diretório /certs
   */
  private setupMtls() {
    const certsDir = path.join(process.cwd(), 'certs');

    try {
      // Verificar se diretório de certificados existe
      if (!fs.existsSync(certsDir)) {
        this.logger.warn(`⚠️  Certificates directory not found: ${certsDir}`);
        this.logger.warn('   mTLS will be disabled. For production, add certificates to /certs directory');
        this.useMtls = false;
        return;
      }

      const certPath = path.join(certsDir, 'client.crt');
      const keyPath = path.join(certsDir, 'client.key');
      const caPath = path.join(certsDir, 'ca.crt');

      // Verificar se arquivos existem
      if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
        this.logger.warn('⚠️  Client certificate or key not found');
        this.logger.warn(`   Expected: ${certPath} and ${keyPath}`);
        this.useMtls = false;
        return;
      }

      // Criar HTTPS Agent com mTLS
      this.httpsAgent = new https.Agent({
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath),
        ca: fs.existsSync(caPath) ? fs.readFileSync(caPath) : undefined,
        rejectUnauthorized: true, // Validar certificado do servidor
      });

      this.logger.log('✅ mTLS configured successfully');
    } catch (error) {
      this.logger.error(`❌ Failed to setup mTLS: ${error.message}`);
      this.useMtls = false;
    }
  }

  /**
   * Obtém token de acesso OAuth2
   * Implementa cache com auto-renovação
   */
  async getAccessToken(): Promise<string> {
    // Verificar se token ainda é válido (renovar 60s antes de expirar)
    if (this.currentToken && this.currentToken.expires_at) {
      const now = Date.now() / 1000;
      const expiresIn = this.currentToken.expires_at - now;

      if (expiresIn > 60) {
        this.logger.debug(`Using cached token (expires in ${Math.round(expiresIn)}s)`);
        return this.currentToken.access_token;
      }
    }

    // Solicitar novo token
    try {
      this.logger.log('Requesting new OAuth2 token...');

      const response = await firstValueFrom(
        this.httpService.post<FhirAuthToken>(
          this.authUrl,
          {
            grant_type: 'client_credentials',
            client_id: this.clientId,
            client_secret: this.clientSecret,
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
            httpsAgent: this.httpsAgent,
          },
        ),
      );

      const token = response.data;

      // Calcular timestamp de expiração
      token.expires_at = Date.now() / 1000 + token.expires_in;

      this.currentToken = token;
      this.logger.log(`✅ New token obtained (expires in ${token.expires_in}s)`);

      return token.access_token;
    } catch (error) {
      this.logger.error(`❌ Failed to obtain OAuth2 token: ${error.message}`);
      throw new Error('Failed to authenticate with RNDS');
    }
  }

  /**
   * Obtém CapabilityStatement do servidor FHIR
   */
  async getMetadata(): Promise<any> {
    return retryFhirGet(async () => {
      try {
        const response = await firstValueFrom(
          this.httpService.get(`${this.baseUrl}/metadata`, {
            httpsAgent: this.httpsAgent,
          }),
        );

        return response.data;
      } catch (error) {
        this.logger.error(`Failed to fetch metadata: ${error.message}`);
        throw error;
      }
    }, 'GET /metadata');
  }

  /**
   * Busca paciente por parâmetros de busca
   */
  async searchPatient(searchParams: string): Promise<any> {
    const token = await this.getAccessToken();

    return retryFhirGet(async () => {
      try {
        const url = `${this.baseUrl}/Patient?${searchParams}`;
        const response = await firstValueFrom(
          this.httpService.get(url, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/fhir+json',
            },
            httpsAgent: this.httpsAgent,
          }),
        );

        return response.data;
      } catch (error) {
        this.logger.error(`Failed to search patient: ${error.message}`);
        throw error;
      }
    }, `GET /Patient?${searchParams.substring(0, 50)}`);
  }

  /**
   * Busca condições por parâmetros de busca
   */
  async searchConditions(searchParams: string): Promise<any> {
    const token = await this.getAccessToken();

    return retryFhirGet(async () => {
      try {
        const url = `${this.baseUrl}/Condition?${searchParams}`;
        const response = await firstValueFrom(
          this.httpService.get(url, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/fhir+json',
            },
            httpsAgent: this.httpsAgent,
          }),
        );

        return response.data;
      } catch (error) {
        this.logger.error(`Failed to search conditions: ${error.message}`);
        throw error;
      }
    }, `GET /Condition?${searchParams.substring(0, 50)}`);
  }

  /**
   * Busca observações por parâmetros de busca
   */
  async searchObservations(searchParams: string): Promise<any> {
    const token = await this.getAccessToken();

    return retryFhirGet(async () => {
      try {
        const url = `${this.baseUrl}/Observation?${searchParams}`;
        const response = await firstValueFrom(
          this.httpService.get(url, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/fhir+json',
            },
            httpsAgent: this.httpsAgent,
          }),
        );

        return response.data;
      } catch (error) {
        this.logger.error(`Failed to search observations: ${error.message}`);
        throw error;
      }
    }, `GET /Observation?${searchParams.substring(0, 50)}`);
  }

  /**
   * Cria um recurso FHIR
   */
  async createResource(
    resourceType: string,
    resource: any,
    idempotencyKey?: string,
  ): Promise<any> {
    const token = await this.getAccessToken();

    const headers: any = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/fhir+json',
      Accept: 'application/fhir+json',
    };

    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    return retryFhirPost(async () => {
      try {
        const response = await firstValueFrom(
          this.httpService.post(`${this.baseUrl}/${resourceType}`, resource, {
            headers,
            httpsAgent: this.httpsAgent,
          }),
        );

        return response.data;
      } catch (error) {
        this.logger.error(`Failed to create ${resourceType}: ${error.message}`);
        throw error;
      }
    }, `POST /${resourceType}`);
  }

  /**
   * Envia Bundle transacional para RNDS
   */
  async postBundle(bundle: any, idempotencyKey?: string): Promise<any> {
    const token = await this.getAccessToken();

    const headers: any = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/fhir+json',
      Accept: 'application/fhir+json',
    };

    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    return retryFhirPost(async () => {
      try {
        const response = await firstValueFrom(
          this.httpService.post(`${this.baseUrl}`, bundle, {
            headers,
            httpsAgent: this.httpsAgent,
          }),
        );

        return response.data;
      } catch (error) {
        this.logger.error(`Failed to post bundle: ${error.message}`);
        throw error;
      }
    }, `POST /Bundle (${bundle.type})`);
  }
}
