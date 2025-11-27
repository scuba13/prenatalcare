import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { login } from '../lib/auth';

// Schema de validação
const loginSchema = z.object({
  email: z.string().email('Email inválido').min(1, 'Email é obrigatório'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await login(data);

      // Verificar se o usuário tem permissão (médico ou admin)
      if (response.user.role === 'gestante') {
        setError('Este sistema é exclusivo para profissionais de saúde');
        // Limpar tokens
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        return;
      }

      navigate('/');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string }; status?: number } };
      if (error.response?.status === 401) {
        setError('Email ou senha incorretos');
      } else if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError('Erro ao fazer login. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-x-hidden bg-gradient-to-br from-background-dark via-[#111817] to-background-dark p-4 font-display">
      <div className="flex w-full max-w-md flex-col items-center rounded-xl bg-[#111817]/80 backdrop-blur-sm ring-1 ring-white/5 shadow-2xl shadow-primary/10">
        <div className="flex w-full flex-col items-center p-8 md:p-10">
          {/* Logo Placeholder */}
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
            <span className="material-symbols-outlined text-primary text-4xl">
              health_and_safety
            </span>
          </div>

          {/* Headline & Body Text */}
          <div className="text-center">
            <h1 className="text-white tracking-light text-2xl sm:text-3xl font-bold leading-tight">
              Sistema Pré-Natal
            </h1>
            <p className="text-gray-400 text-base font-normal leading-normal pt-2">
              Acesso para Profissionais de Saúde
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-6 w-full p-4 rounded-lg bg-red-500/10 border border-red-500/30">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-red-400">error</span>
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Form Section */}
          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex w-full flex-col gap-4">
            {/* Email Field */}
            <div className="flex flex-col">
              <label className="flex flex-col">
                <p className="text-white text-base font-medium leading-normal pb-2">Email</p>
                <div className="relative flex w-full items-center">
                  <span className="material-symbols-outlined text-gray-400 absolute left-3.5 pointer-events-none">
                    mail
                  </span>
                  <input
                    {...register('email')}
                    className={`flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-0 border ${
                      errors.email ? 'border-red-500' : 'border-[#3c5350]'
                    } bg-[#1c2625] focus:border-primary h-14 placeholder:text-[#9db8b5] pl-12 p-[15px] text-base font-normal leading-normal transition-colors`}
                    placeholder="seuemail@dominio.com"
                    type="email"
                    autoComplete="email"
                  />
                </div>
                {errors.email && (
                  <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>
                )}
              </label>
            </div>

            {/* Password Field */}
            <div className="flex flex-col">
              <label className="flex flex-col">
                <p className="text-white text-base font-medium leading-normal pb-2">Senha</p>
                <div className="relative flex w-full flex-1 items-stretch">
                  <span className="material-symbols-outlined text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    lock
                  </span>
                  <input
                    {...register('password')}
                    className={`flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-0 border ${
                      errors.password ? 'border-red-500' : 'border-[#3c5350]'
                    } bg-[#1c2625] focus:border-primary h-14 placeholder:text-[#9db8b5] pl-12 pr-12 p-[15px] text-base font-normal leading-normal transition-colors`}
                    placeholder="Mínimo de 6 caracteres"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                  />
                  <button
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    className="text-gray-400 absolute right-0 top-0 flex h-full items-center justify-center px-3.5 hover:text-white transition-colors"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <span className="material-symbols-outlined text-xl">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-400 text-sm mt-1">{errors.password.message}</p>
                )}
              </label>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <label className="flex cursor-pointer items-center gap-x-3">
                <input
                  className="h-5 w-5 rounded border-2 border-[#3c5350] bg-transparent text-primary focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  type="checkbox"
                />
                <p className="text-white text-base font-normal leading-normal select-none">
                  Lembrar-me
                </p>
              </label>
              <a
                className="text-primary hover:text-primary/80 text-base font-medium leading-normal transition-colors"
                href="#"
              >
                Esqueci minha senha
              </a>
            </div>

            {/* Login Button */}
            <button
              className="mt-4 flex h-14 w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-base font-bold text-[#11211f] transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background-dark disabled:opacity-50 disabled:cursor-not-allowed"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <span className="animate-spin h-5 w-5 border-2 border-black border-t-transparent rounded-full"></span>
                  Entrando...
                </div>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="w-full border-t border-white/5 p-4 text-center">
          <p className="text-xs text-gray-500">
            Integrado com RNDS do DATASUS/Brasil. Versão 1.0.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
