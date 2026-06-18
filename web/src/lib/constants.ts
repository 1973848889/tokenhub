export const MODEL_LIST = [
  { value: 'deepseek-chat', label: 'DeepSeek Chat', provider: 'deepseek' },
  { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner', provider: 'deepseek' },
  { value: 'qwen-max', label: 'Qwen Max', provider: 'qwen' },
  { value: 'qwen-plus', label: 'Qwen Plus', provider: 'qwen' },
  { value: 'doubao-pro-256k', label: '豆包 Pro 256K', provider: 'doubao' },
  { value: 'glm-5', label: 'GLM-5', provider: 'glm' },
  { value: 'glm-5-flash', label: 'GLM-5 Flash', provider: 'glm' },
  { value: 'kimi-latest', label: 'Kimi Latest', provider: 'kimi' },
  { value: 'ernie-4.5', label: '文心 ERNIE 4.5', provider: 'ernie' },
  { value: 'hunyuan-pro', label: '混元 Pro', provider: 'hunyuan' },
  { value: 'zhipu-glm4', label: '智谱 GLM-4 Plus', provider: 'zhipu' },
];

export const PROVIDER_COLORS: Record<string, string> = {
  deepseek: '#6366f1',
  qwen: '#f59e0b',
  doubao: '#3b82f6',
  glm: '#10b981',
  kimi: '#ec4899',
  ernie: '#8b5cf6',
  hunyuan: '#06b6d4',
  zhipu: '#f97316',
};

export const RISK_COLORS: Record<string, string> = {
  political: '#ef4444',
  porn: '#f97316',
  violence: '#eab308',
  gambling: '#84cc16',
  drug: '#06b6d4',
  pii: '#6366f1',
  injection: '#8b5cf6',
  spam: '#94a3b8',
  abuse: '#ec4899',
};

export const RISK_LABELS: Record<string, string> = {
  political: '涉政',
  porn: '色情',
  violence: '暴力',
  gambling: '赌博',
  drug: '违禁品',
  pii: '个人信息',
  injection: '注入攻击',
  spam: '垃圾广告',
  abuse: '辱骂',
};

export const SCENE_TAGS = [
  { value: 'code_generation', label: '代码生成' },
  { value: 'document_writing', label: '文档写作' },
  { value: 'customer_service', label: '客服服务' },
  { value: 'data_analysis', label: '数据分析' },
  { value: 'legal_compliance', label: '法律合规' },
  { value: 'creative_writing', label: '创意写作' },
  { value: 'education', label: '教育培训' },
];
