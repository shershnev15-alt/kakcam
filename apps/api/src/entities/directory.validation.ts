import { BadRequestException } from '@nestjs/common';

export type DirectoryQuery = {
  page: number;
  pageSize: number;
  q?: string;
  country?: string;
  team?: string;
  sort: 'name' | 'rating' | 'verified';
};

function integer(value: string | undefined, fallback: number, min: number, max: number): number {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new BadRequestException(`Числовой параметр должен быть от ${min} до ${max}`);
  }
  return parsed;
}

export function parseDirectoryQuery(
  value: Record<string, string | undefined>,
  options: { allowTeam?: boolean } = {},
): DirectoryQuery {
  const q = value.q?.trim();
  if (q && q.length > 80) throw new BadRequestException('Поисковый запрос слишком длинный');

  const country = value.country?.trim().toUpperCase();
  if (country && !/^[A-Z]{2}$/.test(country)) {
    throw new BadRequestException('Некорректный код страны');
  }

  const team = value.team?.trim().toLocaleLowerCase('en-US');
  if (team && !options.allowTeam) throw new BadRequestException('Фильтр team недоступен');
  if (team && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(team)) {
    throw new BadRequestException('Некорректный team slug');
  }

  const sort = value.sort ?? 'rating';
  if (!['name', 'rating', 'verified'].includes(sort)) {
    throw new BadRequestException('Некорректная сортировка');
  }

  return {
    page: integer(value.page, 1, 1, 10_000),
    pageSize: integer(value.pageSize, 20, 1, 50),
    sort: sort as DirectoryQuery['sort'],
    ...(q ? { q } : {}),
    ...(country ? { country } : {}),
    ...(team ? { team } : {}),
  };
}

export function parseSearchQuery(value: unknown): string {
  if (typeof value !== 'string') throw new BadRequestException('Укажите поисковый запрос');
  const query = value.trim();
  if (query.length < 2) throw new BadRequestException('Введите минимум 2 символа');
  if (query.length > 80) throw new BadRequestException('Поисковый запрос слишком длинный');
  return query;
}
