// 双语标签层：英文为主、中文为辅。评论是英文的美国站业务，看板不应整页中文。
// 键为中文原文，值为英文；渲染时自动在英文后补上弱化排版的中文。

// 固定 UI 文案
export const UI = {
 '从标签，回到买家的原话': "From Tags, Back to Buyers' Own Words",
 '用户洞察 · 八维评论分析': 'Voice of Customer · 8-Dimension Review Analysis',
 '美国站 · 含变体评论': 'US Marketplace · Includes Variant Reviews',
 '唯一评论': 'Unique Reviews',
 '样本星级分布': 'Sample Star Distribution',
 '八维标签看板': '8-Dimension Tag Board',
 '评论明细': 'Review Details',
 '综合行动建议': 'Action Recommendations',
 '用户旅程': 'Customer Journey',
 '人群构成': 'Audience Mix',
 '产品定义方向': 'Product Direction',
 '亚马逊视觉策划': 'Amazon Visual Planning',
 '原声': 'Verbatim',
 '证据': 'Evidence',
 '优先级': 'Priority',
 '取消筛选': 'Clear Filter',
 '样本中没有明确提及': 'No clear mentions in this sample',
 '未知': 'Unknown',
 '来源未知': 'Unknown Source',
 '查看原文': 'View Original',
 '星级': 'Stars',
 '日期': 'Date',
 '来源 ASIN': 'Source ASIN',
 '标题': 'Title',
 '正文': 'Review',
 '命中标签': 'Matched Tags',
 '主图': 'Main Image',
 '场景图': 'Lifestyle Image',
 '细节图': 'Detail Image',
 '尺寸图': 'Size Chart',
 '视频截帧': 'Video Frames',
 'A+页面': 'A+ Content',
 '对比图': 'Comparison Image',
 '占比 = 标签次数 ÷ 本维度标签总次数': 'Share = tag mentions ÷ total mentions in this dimension',
 '保留原文、日期和来源 ASIN；宽表格可横向滚动。': 'Original text, date and source ASIN are kept; the wide table scrolls horizontally.',
 '基于本次评论样本的建议；优先级是分析判断，不代表已验证的销量提升。': 'Based on this review sample only; priorities are analytical judgment, not proven sales lift.',
 '主标签显示同义组总次数；展开按钮查看子标签。主标签筛整组、子标签筛原标签，再点取消。组次数可重复计入同一评论，明细按评论去重。':
  'Main tags show the combined count of a synonym group; use the expand button for sub-tags. A main tag filters the whole group, a sub-tag filters the raw tag, click again to clear. Group counts may count one review more than once; the detail table de-duplicates by review.',
 '本次分析来自 Sorftime 返回的评论样本，未达到每个 ASIN 200 条的目标，不代表完整历史评论。来源变体逐条保留；Amazon 原文交叉核验待补。标签已按留底原文复核。':
  'This analysis uses the review sample returned by Sorftime; it falls short of the 200-review target per ASIN and does not represent full review history. Source variants are kept per review; cross-checking against Amazon originals is still pending. Tags were re-checked against the retained source text.',
};

// 固定八维度
export const DIMENSIONS = {
 '功能价值': 'Functional Value',
 '产品使用对象': 'Product User',
 '体验价值': 'Experience Value',
 '场景': 'Usage Scene',
 '保障价值': 'Trust & Assurance',
 '人群': 'Audience',
 '购买动机': 'Purchase Motivation',
 '未满足需求': 'Unmet Needs',
};

// 标签词典（当前样本全量 + 常见服饰类目通用词）
export const TAGS = {
 // 功能价值
 '透气性好': 'Highly Breathable', '透气': 'Breathable', '轻薄透气': 'Sheer & Breathable',
 '弹力大': 'Very Stretchy', '多种穿法': 'Multiple Ways to Wear', '多穿法适配': 'Adaptable Styling',
 '可作罩衫': 'Works as a Cover-Up', '可做罩衫': 'Usable as a Cover-Up',
 '隔空调凉': 'Light Cover in A/C Rooms', '空调防凉': 'Shields from A/C Chill',
 '易穿易脱': 'Easy On & Off', '重量轻': 'Lightweight', '重量轻便': 'Light & Easy',
 '方便叠穿': 'Easy to Layer', '降温凉爽': 'Cool & Airy', '适配多风格穿搭': 'Fits Many Outfit Styles',
 '提升造型': 'Elevates the Look', '易于打包': 'Easy to Pack', '易于收纳': 'Easy to Store',
 '遮挡覆盖': 'Provides Coverage', '遮挡肩臂': 'Covers Shoulders & Arms', '遮挡手臂': 'Covers Arms',
 // 产品使用对象
 '穿无袖裙人群': 'Sleeveless-Dress Wearers', '大码女性': 'Plus-Size Women',
 '露肩人群': 'Off-Shoulder Wearers', '年长人群': 'Older Shoppers', '胸围偏大者': 'Fuller Bust',
 // 体验价值
 '外观可爱': 'Cute Look', '造型可爱': 'Cute Styling', '风格时尚': 'Stylish',
 '款式时尚': 'Fashionable Design', '设计时尚': 'Stylish Design', '外观好看': 'Good-Looking',
 '外观美观': 'Attractive Look', '版型合身': 'Flattering Fit', '风格百搭': 'Versatile Style',
 '佩戴舒适': 'Comfortable to Wear', '质感轻盈': 'Airy Feel', '使用满意': 'Satisfied with Use',
 '喜爱产品': 'Loves the Product', '颜色好看': 'Nice Color', '超出预期': 'Exceeded Expectations',
 '垂坠飘逸': 'Flowy Drape', '符合预期': 'Met Expectations', '高级感强': 'Premium Feel',
 '面料轻薄': 'Lightweight Fabric', '品质不错': 'Good Quality', '轻薄透视': 'Sheer & See-Through',
 '轻盈通透': 'Light & Airy', '心情愉悦': 'Mood-Boosting', '颜色亮眼': 'Eye-Catching Color',
 '与图一致': 'Matches the Photos', '质地柔软': 'Soft Texture', '质感尚可': 'Acceptable Texture',
 // 场景
 '度假出行': 'Vacation & Travel', '海滩游玩': 'Beach Days', '海滩出行': 'Beach Outings',
 '空调房': 'Air-Conditioned Rooms', '搭配上衣': 'Layered over Tops', '秋季穿搭': 'Fall Outfits',
 '日常外出': 'Everyday Outings', '微凉天气': 'Cool Weather', '温暖天气': 'Warm Weather',
 '夏季穿搭': 'Summer Outfits', '夏日活动': 'Summer Activities', '炎热天气': 'Hot Weather',
 '泳池穿搭': 'Poolside', '游轮出行': 'Cruise Trips',
 // 保障价值
 '价格合理': 'Fair Price', '面料耐用': 'Durable Fabric', '与描述一致': 'As Described',
 '与图片一致': 'Matches the Images', '价格实惠': 'Great Value', '价格适中': 'Reasonable Price',
 '性价比高': 'High Value for Money', '性价比尚可': 'Acceptable Value',
 '一分钱一分货': 'You Get What You Pay For', '质量合格': 'Acceptable Quality',
 // 人群
 '大码人群': 'Plus-Size Shoppers',
 // 购买动机
 '搭配服饰': 'To Match Outfits', '度假穿搭': 'Vacation Styling', '提升穿搭': 'Elevate Outfits',
 // 未满足需求
 '易勾丝': 'Snags Easily', '容易勾丝': 'Prone to Snagging', '变形担忧': 'Concern: Loses Shape',
 '面料廉价': 'Cheap-Feeling Fabric', '版型偏短': 'Runs Short', '价格偏高': 'Priced Too High',
 '面料不结实': 'Fabric Not Sturdy', '面料偏薄': 'Fabric Too Thin', '面料欠佳': 'Poor Fabric Quality',
 '面料一般': 'Average Fabric', '色名不符': 'Color Name Mismatch', '使用寿命短': 'Short Lifespan',
 '透明度过高': 'Too Sheer', '下摆磨损': 'Hem Fraying', '衣长偏长': 'Runs Long',
 '易勾挂杂物': 'Catches on Objects', '易勾破': 'Tears from Snags', '易撕裂损坏': 'Rips Easily',
};

// 未命中词典时的词根兜底（只翻译能确定的部分，凑不齐就保留中文）
export const GLOSSARY = [
 ['透气', 'Breathable'], ['弹力', 'Stretchy'], ['弹性', 'Elasticity'],
 ['面料', 'Fabric'], ['材质', 'Material'], ['版型', 'Fit'], ['衣长', 'Length'],
 ['价格', 'Price'], ['性价比', 'Value for Money'], ['质量', 'Quality'], ['品质', 'Quality'],
 ['颜色', 'Color'], ['色名', 'Color Name'], ['外观', 'Look'], ['造型', 'Styling'],
 ['风格', 'Style'], ['款式', 'Design'], ['舒适', 'Comfortable'], ['柔软', 'Soft'],
 ['轻薄', 'Sheer'], ['轻盈', 'Lightweight'], ['重量', 'Weight'], ['透视', 'See-Through'],
 ['耐穿', 'Durable'], ['耐用', 'Durable'], ['勾丝', 'Snagging'], ['撕裂', 'Tearing'],
 ['变形', 'Loses Shape'], ['磨损', 'Wear & Tear'], ['偏大', 'Runs Large'], ['偏小', 'Runs Small'],
 ['偏短', 'Runs Short'], ['偏长', 'Runs Long'], ['偏高', 'Too High'], ['偏低', 'Too Low'],
 ['过大', 'Too Large'], ['过小', 'Too Small'], ['过高', 'Too High'], ['不足', 'Insufficient'],
 ['度假', 'Vacation'], ['海滩', 'Beach'], ['泳池', 'Pool'], ['空调', 'Air-Conditioned'],
 ['夏季', 'Summer'], ['秋季', 'Fall'], ['日常', 'Everyday'], ['穿搭', 'Outfits'],
 ['大码', 'Plus-Size'], ['人群', 'Shoppers'], ['女性', 'Women'], ['年长', 'Senior'],
 ['易穿', 'Easy to Wear'], ['易脱', 'Easy to Remove'], ['方便', 'Convenient'],
 ['可爱', 'Cute'], ['时尚', 'Stylish'], ['百搭', 'Versatile'], ['高级', 'Premium'],
 ['预期', 'Expectations'], ['一致', 'Consistent'], ['不符', 'Mismatch'],
 ['担忧', 'Concern'], ['问题', 'Issue'], ['满意', 'Satisfied'], ['喜爱', 'Loved'],
];
