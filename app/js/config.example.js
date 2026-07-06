/* ===== BizCore ERP — Runtime config (TEMPLATE) =====
 * Sao chép file này thành `js/config.local.js` rồi điền giá trị thật.
 * `config.local.js` đã bị .gitignore — KHÔNG commit secret.
 *
 * - supabaseUrl / supabaseAnonKey: anon key là PUBLIC theo thiết kế (được bảo vệ bằng RLS).
 * - deepseekApiKey: BÍ MẬT (API trả phí). Để trống nếu muốn người dùng tự nhập trong UI,
 *   hoặc tốt nhất là gọi qua backend proxy ở production.
 */
window.BIZCORE_CONFIG = {
  supabaseUrl: 'https://YOUR-PROJECT.supabase.co',
  supabaseAnonKey: 'YOUR_SUPABASE_ANON_KEY',
  deepseekApiKey: '', // để trống ở repo; điền trong config.local.js hoặc nhập qua UI
};
