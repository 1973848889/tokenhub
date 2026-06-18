export interface DashboardOverview {
  today: {
    cost: number;
    tokens: number;
    calls: number;
    cost_change_rate: number;
    tokens_change_rate: number;
    calls_change_rate: number;
  };
  month: {
    cost: number;
    budget: number;
    budget_usage_rate: number;
    estimated_month_end: number;
  };
  model_distribution: ModelUsage[];
  top_depts: DeptRanking[];
  top_users: UserRanking[];
  daily_trend: DailyTrendPoint[];
  alerts: Alert[];
}

export interface ModelUsage {
  model_name: string;
  provider: string;
  cost: number;
  tokens: number;
  calls: number;
  percentage: number;
  avg_latency_ms: number;
}

export interface DeptRanking {
  dept_id: string;
  dept_name: string;
  cost: number;
  tokens: number;
  user_count: number;
  trend: 'up' | 'down' | 'stable';
}

export interface UserRanking {
  user_id: string;
  user_name: string;
  cost: number;
  tokens: number;
}

export interface DailyTrendPoint {
  date: string;
  cost: number;
  tokens: number;
  calls: number;
  input_tokens: number;
  output_tokens: number;
}

export interface Alert {
  id: string;
  level: 'info' | 'warning' | 'critical';
  type: 'budget' | 'safety' | 'anomaly' | 'system';
  title: string;
  message: string;
  timestamp: string;
  is_read: boolean;
}
