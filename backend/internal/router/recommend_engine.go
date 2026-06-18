package router

import "strings"

type SceneClassifier struct {
	rules []SceneRule
}

type SceneRule struct {
	SceneTag string
	Keywords []string
}

type ModelRecommendation struct {
	Provider     string  `json:"provider"`
	Model        string  `json:"model"`
	DisplayName  string  `json:"display_name"`
	QualityScore float64 `json:"quality_score"`
	CostScore    float64 `json:"cost_score"`
	SpeedScore   float64 `json:"speed_score"`
	TotalScore   float64 `json:"total_score"`
	Description  string  `json:"description"`
	InputPrice   float64 `json:"input_price"`
	OutputPrice  float64 `json:"output_price"`
}

type RecommendResult struct {
	SceneTag       string                `json:"scene_tag"`
	SceneName      string                `json:"scene_name"`
	SceneIcon      string                `json:"scene_icon"`
	SceneDesc      string                `json:"scene_desc"`
	Confidence     int                   `json:"confidence"`
	Recommendations []ModelRecommendation `json:"recommendations"`
	AllScenes      []SceneInfo           `json:"all_scenes"`
}

type SceneInfo struct {
	Tag  string `json:"tag"`
	Name string `json:"name"`
	Icon string `json:"icon"`
	Desc string `json:"desc"`
}

var sceneMeta = map[string]SceneInfo{
	"code_generation":   {Tag: "code_generation", Name: "代码生成", Icon: "💻", Desc: "编程开发、算法实现、代码调试"},
	"document_writing":  {Tag: "document_writing", Name: "文档写作", Icon: "📝", Desc: "报告撰写、方案策划、文案润色"},
	"customer_service":  {Tag: "customer_service", Name: "客服服务", Icon: "🎧", Desc: "客户咨询、投诉处理、售前售后"},
	"data_analysis":     {Tag: "data_analysis", Name: "数据分析", Icon: "📊", Desc: "数据处理、统计分析、报表生成"},
	"legal_compliance":  {Tag: "legal_compliance", Name: "法律合规", Icon: "⚖️", Desc: "合同审核、法规解读、风险评估"},
	"creative_writing":  {Tag: "creative_writing", Name: "创意写作", Icon: "✨", Desc: "故事创作、品牌文案、广告创意"},
	"education":         {Tag: "education", Name: "教育培训", Icon: "📚", Desc: "课件制作、知识问答、习题讲解"},
	"general":           {Tag: "general", Name: "通用对话", Icon: "🤖", Desc: "日常问答、信息查询、综合辅助"},
}

var modelDisplayNames = map[string]string{
	"deepseek-chat":    "DeepSeek Chat V3",
	"deepseek-reasoner": "DeepSeek Reasoner",
	"qwen-max":         "通义千问 Max",
	"qwen-plus":        "通义千问 Plus",
	"doubao-pro-256k":  "豆包 Pro 256K",
	"glm-5":            "GLM-5",
	"glm-5-flash":      "GLM-5 Flash",
	"kimi-latest":      "Kimi 最新",
	"ernie-4.5":        "文心 ERNIE 4.5",
	"hunyuan-pro":      "混元 Pro",
	"zhipu-glm4":       "智谱 GLM-4",
}

var modelPrices = map[string]struct{ input, output float64 }{
	"deepseek-chat":     {1.0, 2.0},
	"deepseek-reasoner": {4.0, 16.0},
	"qwen-max":          {2.0, 6.0},
	"qwen-plus":         {0.8, 2.0},
	"doubao-pro-256k":   {0.8, 2.0},
	"glm-5":             {1.0, 1.0},
	"glm-5-flash":       {0.5, 0.5},
	"kimi-latest":       {2.0, 6.0},
	"ernie-4.5":         {2.0, 6.0},
	"hunyuan-pro":       {1.0, 1.0},
	"zhipu-glm4":        {1.0, 1.0},
}

var defaultRules = []SceneRule{
	{SceneTag: "code_generation", Keywords: []string{"代码", "编程", "函数", "bug", "调试", "算法", "python", "javascript", "go", "java", "重构", "优化", "接口", "API", "SQL", "编码", "部署", "git"}},
	{SceneTag: "document_writing", Keywords: []string{"写", "报告", "文档", "文章", "邮件", "总结", "摘要", "翻译", "润色", "文案", "方案", "计划", "PPT", "演讲稿", "汇报"}},
	{SceneTag: "customer_service", Keywords: []string{"客户", "投诉", "售后", "咨询", "客服", "退换", "订单", "物流", "退款", "请问", "帮助", "怎么"}},
	{SceneTag: "data_analysis", Keywords: []string{"数据", "分析", "统计", "报表", "图表", "指标", "趋势", "对比", "Excel", "数据清洗", "可视化", "计算"}},
	{SceneTag: "legal_compliance", Keywords: []string{"法律", "合同", "合规", "法规", "条款", "诉讼", "知识产权", "专利", "个人信息保护", "GDPR", "案"}},
	{SceneTag: "creative_writing", Keywords: []string{"创意", "故事", "小说", "剧本", "诗歌", "歌词", "广告语", "品牌", "宣传", "slogan", "口号"}},
	{SceneTag: "education", Keywords: []string{"学习", "教程", "讲解", "知识点", "习题", "考试", "课程", "教育", "培训", "入门", "概念", "原理", "定义"}},
}

var sceneModelMapping = map[string][]ModelRecommendation{
	"code_generation": {
		{Provider: "deepseek", Model: "deepseek-chat", QualityScore: 92, CostScore: 95, SpeedScore: 85, TotalScore: 91.5, Description: "代码生成首选，性价比极高"},
		{Provider: "qwen", Model: "qwen-max", QualityScore: 90, CostScore: 85, SpeedScore: 88, TotalScore: 88.4, Description: "多语言支持好，中文注释精准"},
		{Provider: "glm", Model: "glm-5", QualityScore: 88, CostScore: 90, SpeedScore: 90, TotalScore: 89.0, Description: "推理能力强，复杂算法首选"},
	},
	"document_writing": {
		{Provider: "doubao", Model: "doubao-pro-256k", QualityScore: 93, CostScore: 80, SpeedScore: 82, TotalScore: 86.3, Description: "长文档处理优秀，256K上下文"},
		{Provider: "deepseek", Model: "deepseek-chat", QualityScore: 88, CostScore: 95, SpeedScore: 85, TotalScore: 89.5, Description: "中文写作流畅，成本低"},
		{Provider: "kimi", Model: "kimi-latest", QualityScore: 89, CostScore: 82, SpeedScore: 88, TotalScore: 86.8, Description: "长文写作稳定"},
	},
	"customer_service": {
		{Provider: "kimi", Model: "kimi-latest", QualityScore: 90, CostScore: 88, SpeedScore: 90, TotalScore: 89.4, Description: "客服场景表现优异"},
		{Provider: "deepseek", Model: "deepseek-chat", QualityScore: 85, CostScore: 95, SpeedScore: 85, TotalScore: 88.0, Description: "成本优势明显"},
		{Provider: "glm", Model: "glm-5-flash", QualityScore: 84, CostScore: 92, SpeedScore: 95, TotalScore: 89.5, Description: "响应快，适合实时客服"},
	},
	"data_analysis": {
		{Provider: "qwen", Model: "qwen-max", QualityScore: 92, CostScore: 85, SpeedScore: 88, TotalScore: 88.8, Description: "数据处理推理能力强"},
		{Provider: "deepseek", Model: "deepseek-reasoner", QualityScore: 95, CostScore: 75, SpeedScore: 70, TotalScore: 82.0, Description: "深度推理，复杂分析首选"},
		{Provider: "glm", Model: "glm-5", QualityScore: 90, CostScore: 90, SpeedScore: 88, TotalScore: 89.3, Description: "数据格式理解好"},
	},
	"legal_compliance": {
		{Provider: "glm", Model: "glm-5", QualityScore: 91, CostScore: 90, SpeedScore: 90, TotalScore: 90.3, Description: "法律文本理解精准"},
		{Provider: "qwen", Model: "qwen-max", QualityScore: 89, CostScore: 85, SpeedScore: 88, TotalScore: 87.6, Description: "多领域合规覆盖"},
	},
	"creative_writing": {
		{Provider: "doubao", Model: "doubao-pro-256k", QualityScore: 92, CostScore: 80, SpeedScore: 85, TotalScore: 86.6, Description: "创意能力强，内容丰富"},
		{Provider: "kimi", Model: "kimi-latest", QualityScore: 90, CostScore: 88, SpeedScore: 90, TotalScore: 89.4, Description: "文笔流畅，风格多样"},
		{Provider: "deepseek", Model: "deepseek-chat", QualityScore: 87, CostScore: 95, SpeedScore: 85, TotalScore: 88.7, Description: "性价比高"},
	},
	"education": {
		{Provider: "deepseek", Model: "deepseek-chat", QualityScore: 89, CostScore: 95, SpeedScore: 85, TotalScore: 90.1, Description: "讲解清晰，适合教学"},
		{Provider: "glm", Model: "glm-5", QualityScore: 88, CostScore: 90, SpeedScore: 90, TotalScore: 89.1, Description: "知识覆盖面广"},
	},
	"general": {
		{Provider: "deepseek", Model: "deepseek-chat", QualityScore: 88, CostScore: 95, SpeedScore: 85, TotalScore: 89.5, Description: "通用场景首选"},
		{Provider: "qwen", Model: "qwen-max", QualityScore: 90, CostScore: 85, SpeedScore: 88, TotalScore: 88.4, Description: "综合能力强"},
		{Provider: "glm", Model: "glm-5-flash", QualityScore: 84, CostScore: 92, SpeedScore: 95, TotalScore: 89.0, Description: "快速响应"},
	},
}

func NewSceneClassifier() *SceneClassifier {
	return &SceneClassifier{rules: defaultRules}
}

func (c *SceneClassifier) Classify(userInput string) *RecommendResult {
	input := strings.ToLower(userInput)
	bestTag := "general"
	bestScore := 0

	for _, rule := range defaultRules {
		score := 0
		for _, kw := range rule.Keywords {
			if strings.Contains(input, kw) {
				score++
			}
		}
		if score > bestScore {
			bestScore = score
			bestTag = rule.SceneTag
		}
	}

	confidence := bestScore * 10
	if confidence > 100 {
		confidence = 100
	}

	recs, ok := sceneModelMapping[bestTag]
	if !ok {
		recs = sceneModelMapping["general"]
	}

	enriched := make([]ModelRecommendation, len(recs))
	for i, r := range recs {
		r.DisplayName = modelDisplayNames[r.Model]
		if r.DisplayName == "" {
			r.DisplayName = r.Model
		}
		if p, ok := modelPrices[r.Model]; ok {
			r.InputPrice = p.input
			r.OutputPrice = p.output
		}
		enriched[i] = r
	}

	allScenes := make([]SceneInfo, 0, len(sceneMeta))
	for _, v := range sceneMeta {
		allScenes = append(allScenes, v)
	}

	return &RecommendResult{
		SceneTag:        bestTag,
		SceneName:       sceneMeta[bestTag].Name,
		SceneIcon:       sceneMeta[bestTag].Icon,
		SceneDesc:       sceneMeta[bestTag].Desc,
		Confidence:      confidence,
		Recommendations: enriched,
		AllScenes:       allScenes,
	}
}

func GetSceneClassifier() *SceneClassifier {
	return &SceneClassifier{rules: defaultRules}
}
