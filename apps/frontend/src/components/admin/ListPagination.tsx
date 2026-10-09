import { Button } from '../ui/button';

interface ListPaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

export function ListPagination({ page, pageSize, totalCount, onPageChange, loading = false }: ListPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (totalCount <= pageSize) return null;

  const firstItem = (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalCount);

  return (
    <nav className="mt-6 flex flex-col items-center justify-between gap-3 border-t pt-4 sm:flex-row" aria-label="Paginação da lista">
      <p className="text-sm text-muted-foreground" role="status">
        Exibindo {firstItem}–{lastItem} de {totalCount}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={loading || page <= 1} onClick={() => onPageChange(page - 1)}>
          Anterior
        </Button>
        <span className="min-w-24 text-center text-sm">Página {page} de {totalPages}</span>
        <Button variant="outline" size="sm" disabled={loading || page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Próxima
        </Button>
      </div>
    </nav>
  );
}
