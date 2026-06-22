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

export const INDUSTRY_MODEL_LIST = [
  { value: 'medical-gpt', label: 'MedicalGPT', provider: 'medical', desc: '医学诊疗' },
  { value: 'lawgpt', label: 'LawGPT', provider: 'legal', desc: '法律咨询' },
  { value: 'finbert', label: 'FinBERT', provider: 'finance', desc: '金融分析' },
  { value: 'educhat', label: 'EduChat', provider: 'education', desc: '智慧教育' },
  { value: 'codegeex', label: 'CodeGeeX', provider: 'dev', desc: '代码生成' },
  { value: 'biogpt', label: 'BioGPT', provider: 'medical', desc: '生物医药' },
  { value: 'huatuogpt', label: 'HuatuoGPT', provider: 'medical', desc: '中医问诊' },
  { value: 'lexisthai', label: 'LexisNexis AI', provider: 'legal', desc: '合同审查' },
  { value: 'finreg-gpt', label: '金融监管大模型', provider: 'finance', desc: '监管合规' },
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
  medical: '#ef4444',
  legal: '#a855f7',
  finance: '#eab308',
  education: '#14b8a6',
  dev: '#3b82f6',
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

export const ASSET_RISK_COLORS: Record<string, string> = {
  safe: '#52c41a',
  risky: '#faad14',
  blocked: '#ff4d4f',
};

export const ASSET_RISK_LABELS: Record<string, string> = {
  safe: '安全',
  risky: '风险',
  blocked: '拦截',
};

export const ASSET_TYPE_LABELS: Record<string, string> = {
  agent: 'Agent',
  skill: 'Skill',
  mcp: 'MCP工具',
};

export const SCAN_DIMENSION_LABELS: Record<string, string> = {
  injection: '注入风险',
  permission: '权限审计',
  compliance: '合规检查',
  supply_chain: '供应链漏洞',
};

export const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ff4d4f',
  high: '#fa8c16',
  medium: '#faad14',
  low: '#1890ff',
  info: '#8c8c8c',
};
