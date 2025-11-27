import { authApi } from './api';

export interface User {
  id: string;
  email: string;
  role: 'gestante' | 'medico' | 'admin';
  citizenId?: string;
  doctorId?: string;
  isVerified: boolean;
  isActive: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  role: 'gestante' | 'medico' | 'admin';
  cpf?: string;
  phone?: string;
}

// Login
export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const response = await authApi.post<AuthResponse>('/api/v1/auth/login', credentials);
  const data = response.data;

  // Salvar tokens e user no localStorage
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  localStorage.setItem('user', JSON.stringify(data.user));

  return data;
};

// Registro
export const register = async (data: RegisterData): Promise<AuthResponse> => {
  const response = await authApi.post<AuthResponse>('/api/v1/auth/register', data);
  const authData = response.data;

  // Salvar tokens e user no localStorage
  localStorage.setItem('accessToken', authData.accessToken);
  localStorage.setItem('refreshToken', authData.refreshToken);
  localStorage.setItem('user', JSON.stringify(authData.user));

  return authData;
};

// Logout
export const logout = async (): Promise<void> => {
  try {
    await authApi.post('/api/v1/auth/logout');
  } catch (error) {
    // Ignora erros no logout (pode estar com token expirado)
    console.warn('Erro ao fazer logout no servidor:', error);
  } finally {
    // Sempre limpa localStorage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }
};

// Refresh token
export const refreshAccessToken = async (): Promise<string> => {
  const refreshToken = localStorage.getItem('refreshToken');

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await authApi.post<{ accessToken: string }>('/api/v1/auth/refresh', {
    refreshToken,
  });

  const { accessToken } = response.data;
  localStorage.setItem('accessToken', accessToken);

  return accessToken;
};

// Obter dados do usuário atual
export const getCurrentUser = async (): Promise<User> => {
  const response = await authApi.get<User>('/api/v1/auth/me');
  return response.data;
};

// Helpers síncronos (lê do localStorage)
export const getAccessToken = (): string | null => {
  return localStorage.getItem('accessToken');
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem('refreshToken');
};

export const getStoredUser = (): User | null => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;

  try {
    return JSON.parse(userStr) as User;
  } catch {
    return null;
  }
};

export const isAuthenticated = (): boolean => {
  return !!getAccessToken();
};

export const hasRole = (role: User['role']): boolean => {
  const user = getStoredUser();
  return user?.role === role;
};

export const hasAnyRole = (roles: User['role'][]): boolean => {
  const user = getStoredUser();
  return user ? roles.includes(user.role) : false;
};

// Verificar se pode acessar rota de médico/admin
export const canAccessMedico = (): boolean => {
  return hasAnyRole(['medico', 'admin']);
};

// Verificar se é admin
export const isAdmin = (): boolean => {
  return hasRole('admin');
};
