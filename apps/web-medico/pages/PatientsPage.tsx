import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCitizens, CitizensFilters } from '../services/citizens.service';
import { queryKeys } from '../lib/query-client';
import {
  formatDate,
  maskCPF,
  formatGestationalAge,
  getRiskColor,
  getRiskLabel,
  cn,
} from '../lib/utils';
import type { RiskLevel } from '../types';

const PatientsPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | ''>('');
  const [trimesterFilter, setTrimesterFilter] = useState<1 | 2 | 3 | ''>('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Construir filtros
  const filters: CitizensFilters = {
    page,
    limit,
    search: search || undefined,
    riskLevel: riskFilter || undefined,
    trimester: trimesterFilter || undefined,
    active: true,
  };

  // Buscar gestantes
  const {
    data: response,
    isLoading,
    error,
  } = useQuery({
    queryKey: [...queryKeys.citizens, filters],
    queryFn: () => getCitizens(filters),
  });

  const patients = response?.data || [];
  const totalPages = response?.totalPages || 1;
  const total = response?.total || 0;

  // Debounce para busca
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); // Reset para primeira página ao buscar
  };

  const handleRiskChange = (risk: RiskLevel | '') => {
    setRiskFilter(risk);
    setPage(1);
  };

  const handleTrimesterChange = (trimester: 1 | 2 | 3 | '') => {
    setTrimesterFilter(trimester);
    setPage(1);
  };

  return (
    <div className="p-6 lg:p-10 mx-auto max-w-7xl">
      {/* PageHeading */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em] text-white">
          Gestantes
        </h1>
        <Link
          to="/patients/new"
          className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-background-dark text-sm font-bold leading-normal tracking-[0.015em] gap-2 hover:bg-primary/90 transition-colors"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          <span className="truncate">Nova Gestante</span>
        </Link>
      </div>

      {/* Filters Section */}
      <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center">
        {/* SearchBar */}
        <div className="flex-1">
          <label className="flex flex-col min-w-40 h-12 w-full">
            <div className="flex w-full flex-1 items-stretch rounded-lg h-full bg-[#293836] border border-transparent focus-within:border-primary/50 transition-colors">
              <div className="text-[#9db8b5] flex items-center justify-center pl-4">
                <span className="material-symbols-outlined">search</span>
              </div>
              <input
                className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-lg text-white focus:outline-0 focus:ring-0 border-none bg-transparent h-full placeholder:text-[#9db8b5] px-4 pl-2 text-base font-normal leading-normal"
                placeholder="Buscar por Nome ou CPF..."
                value={search}
                onChange={handleSearchChange}
              />
            </div>
          </label>
        </div>

        {/* Chips/Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Risk Filter */}
          <div className="relative">
            <select
              value={riskFilter}
              onChange={(e) => handleRiskChange(e.target.value as RiskLevel | '')}
              className="flex h-12 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-[#293836] pl-4 pr-8 hover:bg-[#3c5350] transition-colors border border-transparent text-white text-sm font-medium cursor-pointer appearance-none"
            >
              <option value="">Risco: Todos</option>
              <option value="habitual">Habitual</option>
              <option value="intermediario">Intermediário</option>
              <option value="alto">Alto</option>
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-white pointer-events-none">
              arrow_drop_down
            </span>
          </div>

          {/* Trimester Filter */}
          <div className="relative">
            <select
              value={trimesterFilter}
              onChange={(e) =>
                handleTrimesterChange(e.target.value ? (Number(e.target.value) as 1 | 2 | 3) : '')
              }
              className="flex h-12 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-[#293836] pl-4 pr-8 hover:bg-[#3c5350] transition-colors border border-transparent text-white text-sm font-medium cursor-pointer appearance-none"
            >
              <option value="">Trimestre: Todos</option>
              <option value="1">1º Trimestre</option>
              <option value="2">2º Trimestre</option>
              <option value="3">3º Trimestre</option>
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-white pointer-events-none">
              arrow_drop_down
            </span>
          </div>

          {/* Clear Filters */}
          {(search || riskFilter || trimesterFilter) && (
            <button
              onClick={() => {
                setSearch('');
                setRiskFilter('');
                setTrimesterFilter('');
                setPage(1);
              }}
              className="flex h-12 items-center gap-2 px-4 rounded-lg bg-[#293836] hover:bg-[#3c5350] text-white text-sm font-medium transition-colors"
            >
              <span className="material-symbols-outlined text-lg">close</span>
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="mt-12 flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#9db8b5]">Carregando gestantes...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mt-12 flex flex-col items-center justify-center gap-4">
          <span className="material-symbols-outlined text-5xl text-red-400">error</span>
          <p className="text-white">Erro ao carregar gestantes</p>
          <p className="text-[#9db8b5] text-sm">Tente novamente mais tarde</p>
        </div>
      )}

      {/* Data Table */}
      {!isLoading && !error && (
        <>
          {patients.length > 0 ? (
            <div className="mt-6 overflow-x-auto rounded-lg bg-[#111817] border border-[#3c5350]">
              <table className="w-full min-w-[800px] text-left text-sm text-[#9db8b5]">
                <thead className="border-b border-[#3c5350] uppercase text-xs bg-[#1c2625]">
                  <tr>
                    <th className="px-6 py-4 font-bold text-white tracking-wider" scope="col">
                      Nome
                    </th>
                    <th className="px-6 py-4 font-bold text-white tracking-wider" scope="col">
                      CPF
                    </th>
                    <th className="px-6 py-4 font-bold text-white tracking-wider" scope="col">
                      Idade Gestacional
                    </th>
                    <th className="px-6 py-4 font-bold text-white tracking-wider" scope="col">
                      Risco
                    </th>
                    <th className="px-6 py-4 font-bold text-white tracking-wider" scope="col">
                      Última Consulta
                    </th>
                    <th
                      className="px-6 py-4 font-bold text-white tracking-wider text-center"
                      scope="col"
                    >
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3c5350]">
                  {patients.map((patient) => {
                    // Os dados vêm diretamente do Citizen, mas precisamos de pregnancy info
                    // Isso pode vir de um campo adicional na resposta ou ser buscado separadamente
                    const riskColor = getRiskColor('habitual'); // TODO: pegar da pregnancy
                    const riskLabel = getRiskLabel('habitual'); // TODO: pegar da pregnancy

                    return (
                      <tr
                        key={patient.id}
                        className="hover:bg-[#293836] transition-colors cursor-pointer"
                        onClick={() => navigate(`/patients/${patient.id}`)}
                      >
                        <td className="whitespace-nowrap px-6 py-4 font-medium text-white">
                          {patient.socialName || patient.fullName}
                        </td>
                        <td className="px-6 py-4">{maskCPF(patient.cpf)}</td>
                        <td className="px-6 py-4">
                          {/* IG vem do pregnancy - placeholder por enquanto */}
                          -
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border',
                              `bg-${riskColor}-500/20 text-${riskColor}-400 border-${riskColor}-500/20`
                            )}
                          >
                            {riskLabel}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {patient.lastAccessAt ? formatDate(patient.lastAccessAt) : '-'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/patients/${patient.id}`);
                            }}
                            className="rounded-md bg-primary/20 px-4 py-2 text-xs font-bold text-primary hover:bg-primary/30 transition-colors"
                          >
                            Ver
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-12 flex flex-col items-center justify-center gap-4 py-12 bg-[#1c2625] rounded-lg border border-[#3c5350]">
              <span className="material-symbols-outlined text-5xl text-[#9db8b5]">
                pregnant_woman
              </span>
              <p className="text-white text-lg font-medium">Nenhuma gestante encontrada</p>
              {search || riskFilter || trimesterFilter ? (
                <p className="text-[#9db8b5] text-sm">
                  Tente ajustar os filtros ou limpar a busca
                </p>
              ) : (
                <Link
                  to="/patients/new"
                  className="mt-2 px-6 py-2 bg-primary text-[#111817] rounded-lg font-bold hover:bg-primary/90 transition-colors"
                >
                  Cadastrar Gestante
                </Link>
              )}
            </div>
          )}

          {/* Pagination */}
          {patients.length > 0 && totalPages > 1 && (
            <div className="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
              <p className="text-sm text-[#9db8b5]">
                Exibindo{' '}
                <span className="font-semibold text-white">
                  {(page - 1) * limit + 1}-{Math.min(page * limit, total)}
                </span>{' '}
                de <span className="font-semibold text-white">{total}</span>
              </p>
              <div className="inline-flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#293836] text-sm font-medium text-white/70 hover:bg-primary/30 hover:text-white disabled:pointer-events-none disabled:opacity-50 transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">chevron_left</span>
                </button>

                {/* Page Numbers */}
                {generatePageNumbers(page, totalPages).map((pageNum, idx) =>
                  pageNum === '...' ? (
                    <span key={`ellipsis-${idx}`} className="text-white/70">
                      ...
                    </span>
                  ) : (
                    <button
                      key={pageNum}
                      onClick={() => setPage(Number(pageNum))}
                      className={cn(
                        'inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors',
                        page === pageNum
                          ? 'bg-primary text-[#111817]'
                          : 'bg-[#293836] text-white/70 hover:bg-primary/30 hover:text-white'
                      )}
                    >
                      {pageNum}
                    </button>
                  )
                )}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#293836] text-sm font-medium text-white/70 hover:bg-primary/30 hover:text-white disabled:pointer-events-none disabled:opacity-50 transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Helper function to generate page numbers with ellipsis
function generatePageNumbers(
  current: number,
  total: number
): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | '...')[] = [];

  // Always show first page
  pages.push(1);

  if (current > 3) {
    pages.push('...');
  }

  // Show pages around current
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push('...');
  }

  // Always show last page
  if (total > 1) {
    pages.push(total);
  }

  return pages;
}

export default PatientsPage;
