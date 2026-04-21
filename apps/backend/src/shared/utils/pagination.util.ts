export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export class PaginationUtil {
  private static readonly DEFAULT_PAGE = 1;
  private static readonly DEFAULT_LIMIT = 20;
  private static readonly MAX_LIMIT = 100;

  /**
   * Validate and normalize pagination parameters
   */
  static validateParams(params: PaginationParams): Required<PaginationParams> {
    const page = Math.max(1, params.page || this.DEFAULT_PAGE);
    const limit = Math.min(
      Math.max(1, params.limit || this.DEFAULT_LIMIT),
      this.MAX_LIMIT
    );

    return { page, limit };
  }

  /**
   * Calculate skip value for database queries
   */
  static calculateSkip(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  /**
   * Build pagination metadata
   */
  static buildMeta(
    page: number,
    limit: number,
    totalCount: number
  ): PaginationMeta {
    const totalPages = Math.ceil(totalCount / limit);

    return {
      page,
      limit,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  /**
   * Build paginated response
   */
  static buildResponse<T>(
    data: T[],
    page: number,
    limit: number,
    totalCount: number
  ): PaginatedResponse<T> {
    return {
      data,
      meta: this.buildMeta(page, limit, totalCount),
    };
  }
}
