import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// URLs dos serviços backend
const API_URLS = {
  auth: import.meta.env.VITE_AUTH_API_URL || 'http://localhost:3005',
  core: import.meta.env.VITE_CORE_API_URL || 'http://localhost:3001',
  scheduling: import.meta.env.VITE_SCHEDULING_API_URL || 'http://localhost:3003',
  notification: import.meta.env.VITE_NOTIFICATION_API_URL || 'http://localhost:3004',
  rnds: import.meta.env.VITE_RNDS_API_URL || 'http://localhost:3002',
};

// Criar instâncias Axios para cada serviço
export const authApi = axios.create({
  baseURL: API_URLS.auth,
  headers: { 'Content-Type': 'application/json' },
});

export const coreApi = axios.create({
  baseURL: API_URLS.core,
  headers: { 'Content-Type': 'application/json' },
});

export const schedulingApi = axios.create({
  baseURL: API_URLS.scheduling,
  headers: { 'Content-Type': 'application/json' },
});

export const notificationApi = axios.create({
  baseURL: API_URLS.notification,
  headers: { 'Content-Type': 'application/json' },
});

export const rndsApi = axios.create({
  baseURL: API_URLS.rnds,
  headers: { 'Content-Type': 'application/json' },
});

// Flag para evitar múltiplos refreshes simultâneos
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Função para adicionar interceptors de auth a uma instância
const addAuthInterceptors = (instance: typeof axios) => {
  // Request interceptor - adiciona token
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = localStorage.getItem('accessToken');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor - trata 401 e faz refresh
  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      // Se não é 401 ou já tentou retry, rejeita
      if (error.response?.status !== 401 || originalRequest._retry) {
        return Promise.reject(error);
      }

      // Se já está fazendo refresh, adiciona na fila
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return instance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');

      if (!refreshToken) {
        // Sem refresh token, faz logout
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/#/login';
        return Promise.reject(error);
      }

      try {
        const response = await authApi.post('/api/v1/auth/refresh', {
          refreshToken,
        });

        const { accessToken } = response.data;
        localStorage.setItem('accessToken', accessToken);

        processQueue(null, accessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        return instance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);

        // Refresh falhou, faz logout
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/#/login';

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
  );
};

// Adicionar interceptors em todas as instâncias exceto authApi (para evitar loop no refresh)
addAuthInterceptors(coreApi);
addAuthInterceptors(schedulingApi);
addAuthInterceptors(notificationApi);
addAuthInterceptors(rndsApi);

// Adiciona apenas o request interceptor no authApi (não o response para refresh)
authApi.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    // Não adiciona token em rotas de login/register/refresh
    const publicRoutes = ['/api/v1/auth/login', '/api/v1/auth/register', '/api/v1/auth/refresh'];
    const isPublicRoute = publicRoutes.some((route) => config.url?.includes(route));

    if (token && config.headers && !isPublicRoute) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export { API_URLS };
