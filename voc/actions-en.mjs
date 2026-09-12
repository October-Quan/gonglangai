// 综合行动建议卡片英译层：中文叙事为主，英文作为来源/论证对照。
// CARD_TEXT 键为卡片内的中文句子（空白归一化后匹配），值为人工级英文。
export const CARD_TEXT = {
  // —— 产品定义方向 · 标题 ——
  '优先验证面料抗勾丝与撕裂表现': 'Prioritize snag & tear resistance verification',
  '验证弹性保持能力': 'Verify stretch retention',
  '核对衣长与体型适配': 'Verify garment length & body-type fit',
  '明确轻薄与透视程度': 'Clarify lightness & sheerness level',
  '提供经过实穿验证的穿法说明': 'Provide try-on-verified styling instructions',
  '核对色名与复购配色线索': 'Verify color names & repurchase cues',
  '平衡价格与可验证品质': 'Balance price against verifiable quality',
  // —— 亚马逊视觉策划 · 标题 ——
  '准确展示实物轮廓与颜色': 'Show true silhouette & color on the main image',
  '展示有原声支撑的叠穿场景': 'Show layering scenes backed by buyer voices',
  '展示网眼、重量感与实际弹性': 'Show the mesh, weight & real stretch',
  '演示可重复实现的穿法': 'Demonstrate reproducible ways to wear it',
  '解释衣长和均码适配边界': 'Explain hem length & one-size fit limits',
  '展示真实活动与叠穿状态': 'Show real movement & layering in use',
  '说明适用边界与经验证的护理方式': 'State use limits & verified care instructions',
  '并列展示经实拍验证的穿法': 'Show try-on-verified styles side by side',
  // —— 行动点 ——
  '对现款开展勾丝、接缝与撕裂测试，区分织物组织和缝制环节的问题。': 'Run snag, seam and tear tests on the current style; separate fabric-structure issues from stitching issues.',
  '对比候选面料与工艺样，合格后再决定调整；评论不足以直接确定纤维比例或工艺参数。': 'Compare candidate fabrics and workmanship samples; adjust only after they pass. Reviews alone cannot determine fiber blend or process parameters.',
  '保留买家认可的弹性，进行反复拉伸和洗后尺寸恢复测试。': 'Keep the stretch buyers praise; test repeated stretching and post-wash size recovery.',
  '将评论中的担忧列为验证项；不要把担忧写成已发生的洗后损坏。': 'List review concerns as items to verify — do not state them as confirmed wash damage.',
  '分别记录前后长度和穿法下的覆盖位置，安排不同体型试穿。': 'Record front/back hem coverage per wearing style; arrange try-ons on different body types.',
  '短和长的反馈方向不同，先按来源变体核查，再决定是否提供长度选项。': '"Too short" and "too long" point in different directions — check by source variant before offering a length option.',
  '用实物确认光线、底衫对透视效果的影响，描述中明确适合叠穿的用途。': 'Confirm on real samples how lighting and base layers affect sheerness; state layering use cases clearly in the listing.',
  '若要测试厚度选项，先比较手感、透气和成本，不从少量评论直接推定市场需求。': 'If testing a thicker option, compare hand feel, breathability and cost first; do not infer demand from a few reviews.',
  '用现款实穿确认可以稳定实现的穿法，逐步拍摄说明。': 'Confirm reproducible styles on the actual garment, then shoot step-by-step instructions.',
  '侧肩或其他穿法必须先测试适配性，不直接承诺所有体型都适用。': 'Off-shoulder and other styles must be fit-tested first; do not promise they suit all body types.',
  '优先核对Yellow与Ivory的色名和实拍一致性。': 'First verify the Yellow and Ivory color names against real photos.',
  '两条原声分别涉及计划再买和已再订颜色，可作为访谈线索；不要外推复购率或热门配色。': 'Two buyer voices mention planned or completed re-orders in other colors — good interview leads, but do not extrapolate repurchase rates.',
  '将认可价格与认为偏贵的原声并列复盘，结合实际售价和毛利评估材料方案。': 'Review the "fair price" and "cheap material" voices together; weigh material options against the actual price and margin.',
  '升级方案先小样测试并核算成本，不直接承诺维持售价或支持溢价。': 'Test upgrades with samples and cost accounting first; do not promise to hold the price or support a premium.',
  '优先保证主图呈现的颜色、轮廓与当前变体实物一致。': 'Ensure the main image\'s color and silhouette match the actual variant.',
  '体型对照、穿法步骤和尺寸文字放到相应辅图；展示未经验证的款式变化前先实拍核对。': 'Put body comparisons, styling steps and size text on secondary images; re-shoot to verify any unverified style variation first.',
  '选择海滩泳装外搭、度假穿搭和空调房轻薄覆盖场景。': 'Choose scenes buyers actually mention: beach cover-up over swimwear, vacation outfits, light indoor (A/C) layering.',
  '表现具体搭配效果，避免把空调房覆盖说成寒冷天气保暖能力。': 'Show concrete styling effects; do not market A/C coverage as cold-weather warmth.',
  '拍摄网眼和面料垂坠的近景，并用一致条件展示实际拉伸。': 'Shoot close-ups of the mesh and drape; demonstrate real stretch under consistent conditions.',
  '无检测数据时只展示观察到的效果，不标注未经验证的透气或耐用数值。': 'Without lab data, show only observed effects; never label unverified breathability or durability numbers.',
  '以实际试穿结果制作步骤图，明确服装方向和覆盖位置。': 'Build step-by-step graphics from real try-ons; make garment orientation and coverage explicit.',
  '只展示已验证可稳定实现的穿法；尤其核查侧肩穿法，不照搬模型提出的围裹方案。': 'Show only verified, reproducible styles; double-check the off-shoulder look instead of copying AI-suggested wraps.',
  '实测平铺衣长、开口和合理拉伸范围，注明测量方法。': 'Measure flat-lay length, neck opening and realistic stretch range; state the measuring method.',
  '配合模特实测体型展示覆盖位置，不把均码宣传成适合所有身材。': 'Show coverage on real model body types; do not market one-size as fitting everyone.',
  '选择获得许可的实拍素材，展示穿脱、抬臂及行走时的实际状态。': 'Use licensed real footage showing dressing on, raised arms and walking.',
  '只有实拍能够支持时才描述不移位或不勒身，避免合成效果替代真实表现。': 'Claim "stays in place / no dig-in" only when footage supports it; avoid synthetic effects standing in for real performance.',
  '说明网眼材质与尖锐物勾挂的风险，展示经过验证的收纳方式。': 'Explain the mesh\'s snag risk around sharp objects; show verified storage methods.',
  '洗护说明以标签和材料测试为准，不把模型建议的手洗方式直接当作产品事实。': 'Base care instructions on the label and material tests; do not present AI-suggested hand-washing as product fact.',
  '用同一件实物、同一拍摄条件比较已验证的披搭和罩衫效果，说明内搭搭配。': 'Compare verified drape and cover-up looks on the same garment under the same setup; note what to wear underneath.',
  '穿法数量以实际能稳定实现为准，不直接承诺任意身材都能完成三种以上穿法。': 'Count only styles that are stably reproducible; do not promise 3+ styles for every body type.',
  // —— 框架杂项 ——
  '基于本次评论样本的建议；优先级是分析判断，不代表已验证的销量提升。': 'Suggestions based on this review sample; priorities are analytical judgments, not a verified sales lift.',
  '综合行动建议': 'Action Plan',
};

// 优先级徽标英译（P0/P1/P2 保持原样）
export const BADGES = {
  '主图': 'Main image',
  '场景图': 'Scene shot',
  '细节图': 'Detail shot',
  '尺寸图': 'Size chart',
  '视频截帧': 'Video frame',
  'A+页面': 'A+ content',
  '对比图': 'Comparison',
};

// 标签页按钮英译（按出现顺序兜底匹配）
export const TABS = {
  '🏭 产品定义方向': 'Product Definition Direction',
  '🎨 亚马逊视觉策划': 'Amazon Visual Merchandising',
};

// 论据括注与引用区文案
export const EVIDENCE_NOTE_EN = {
  overlap: '(tag mention counts; reviews may overlap)',
  normal: '(tag mention counts, not unique buyers)',
};
export const CITES_HEADER = 'Buyer voice · supporting quotes';
