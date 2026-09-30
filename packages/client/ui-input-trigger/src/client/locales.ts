/**
 * `slash.menu` namespace dictionaries: group titles keyed by source name
 * (the lookup chain returns the key itself, so an unknown source shows its
 * raw name), the pending row, and the listbox and header aria labels.
 */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'command': '指令',
  'skill': '技能',
  'subagent': '子智能体',
  'loading': '正在加载…',
  'drill.aria': '进入目录',
  'drill.hint': '进入目录',
  'drill.key': 'Tab',
  'crumbs.aria': '目录导航',
  'suggestions.aria': '触发候选建议',
  'categories.aria': '引用分类',
  'category.all': '全部',
  'category.plugin': '插件',
  'category.session': '会话',
  'category.file': '文件',
  'category.empty': '此分类暂无匹配项',
} satisfies Record<string, string>

/** The slash.menu namespace key union. */
export type MenuKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'command': 'Commands',
  'skill': 'Skills',
  'subagent': 'Subagents',
  'loading': 'Loading…',
  'drill.aria': 'Browse folder',
  'drill.hint': 'Browse folder',
  'drill.key': 'Tab',
  'crumbs.aria': 'Folder navigation',
  'suggestions.aria': 'Trigger suggestions',
  'categories.aria': 'Reference categories',
  'category.all': 'All',
  'category.plugin': 'Plugins',
  'category.session': 'Sessions',
  'category.file': 'Files',
  'category.empty': 'No matches in this category',
} satisfies Record<MenuKey, string>
