export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface APIKey {
  id: string;
  key_prefix: string;
  name: string;
  user_name: string;
  dept_name: string;
  status: 'active' | 'revoked' | 'expired';
  daily_budget: number;
  rate_limit_rpm: number;
  allowed_models: string[];
  today_cost: number;
  today_tokens: number;
  today_calls: number;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
}
