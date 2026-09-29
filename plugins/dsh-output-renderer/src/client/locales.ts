/** Product copy owned by the output renderer. */
export const NS = 'missher.output-renderer'
export const en = {
  section: 'Output appearance', layout: 'Response layout', motion: 'Streaming effect',
  intro: 'A clear, single column for thinking and answers.',
  reader: 'Clear reading', cards: 'Soft cards', compact: 'Compact log',
  readerHint: 'Continuous text with quiet tool details.', cardsHint: 'Thinking and answers grouped in a single column.',
  compactHint: 'Smaller gaps for long tasks.',
  density: 'Content spacing', comfortable: 'Comfortable', tight: 'Compact',
  textSize: 'Body text size', standard: 'Standard · 14 px', large: 'Larger · 16 px',
  thinkingHint: 'Full text remains readable. Tool details fold independently.', alwaysOpen: 'Always expanded',
  smooth: 'Frame-synchronized', fade: 'New text fade-in',
  smoothHint: 'Reveal buffered text on display frames, without a fixed frame-rate cap.',
  fadeHint: 'Fade in only arriving text. Previously displayed text stays unchanged.',
  note: 'Thinking stays fully visible. Code, links, images and tool actions use the built-in renderer.',
  rate: 'Display refresh and model generation speed are independent. Reduced-motion preferences are respected.',
  saving: 'Saving…', saved: 'Saved', loading: 'Loading settings…', unavailable: 'Settings cannot be saved on this connection.',
  failed: 'Could not save. The previous setting has been restored.',
  thinking: 'Thinking', answer: 'Response', stopped: 'Stopped', preview: 'Preview', replay: 'Replay output',
  sample: 'All three styles keep the complete answer.\n\nAdjust spacing and text size to read comfortably. New text appears smoothly; code, files and tool actions remain available.',
  copy: 'Copy', copied: 'Copied', code: 'Code', wrap: 'Wrap', unwrap: 'Unwrap', footnotes: 'Footnotes',
}
export const zh: Record<keyof typeof en, string> = {
  section: '输出外观', layout: '回复布局', motion: '流式输出效果',
  intro: '单列阅读，让思考和正文各自清楚',
  reader: '清晰阅读', cards: '柔和卡片', compact: '紧凑日志',
  readerHint: '简洁正文，轻量工具记录', cardsHint: '思考与正文分组，保持单列', compactHint: '更小间距，适合长任务',
  density: '内容间距', comfortable: '舒适', tight: '紧凑',
  textSize: '正文大小', standard: '标准 · 14 px', large: '较大 · 16 px',
  thinkingHint: '全文显示，保留完整阅读；工具折叠独立控制', alwaysOpen: '始终展开',
  smooth: '刷新率同步', fade: '新增文字淡入',
  smoothHint: '按屏幕刷新节奏显示缓冲文字，不设固定帧率上限。',
  fadeHint: '仅新到达的文字渐显，已经读过的内容保持稳定。',
  note: '思考全文显示。代码、链接、图片和工具操作沿用原生能力。',
  rate: '显示刷新率与模型生成速度相互独立；遵循系统“减少动态效果”设置。',
  saving: '正在保存…', saved: '已保存', loading: '正在读取设置…', unavailable: '当前连接无法保存设置。',
  failed: '保存失败，已恢复此前的设置。',
  thinking: '思考过程', answer: '回复', stopped: '已停止', preview: '效果预览', replay: '重播输出',
  sample: '三种风格都保留完整回复。\n\n调整间距与字号，让长文更易阅读。新增文字平滑出现，代码、文件与工具操作保持可用。',
  copy: '复制', copied: '已复制', code: '代码', wrap: '自动换行', unwrap: '取消换行', footnotes: '脚注',
}
export type OutputKey = keyof typeof en
export type Translate = (key: OutputKey) => string
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap { 'missher.output-renderer': OutputKey }
}
