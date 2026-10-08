/** Permission route yang memberi akses ke Chat AI (aturan OR). */
export const AI_CHAT_ALLOWED_PARENTS = [
  'Marketing.View.Monthly.Mdfo',
  'Marketing.View.Monthly.MdfoAnalisis',
  'Marketing.View.Monthly.QuotContract',
  'Logistik.View.Mdfo'
] as const;