import { useMutation } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

export interface ModelRecommendation {
  provider: string;
  model: string;
  display_name: string;
  quality_score: number;
  cost_score: number;
  speed_score: number;
  total_score: number;
  description: string;
  input_price: number;
  output_price: number;
}

export interface SceneInfo {
  tag: string;
  name: string;
  icon: string;
  desc: string;
}

export interface RecommendResult {
  scene_tag: string;
  scene_name: string;
  scene_icon: string;
  scene_desc: string;
  confidence: number;
  recommendations: ModelRecommendation[];
  all_scenes: SceneInfo[];
}

export function useRecommend() {
  return useMutation<RecommendResult, Error, string>({
    mutationFn: async (query: string) => {
      const { data } = await apiClient.post('/api/v1/admin/recommend', { query });
      return data;
    },
  });
}
