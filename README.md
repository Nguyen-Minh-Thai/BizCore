# BizCore — Business Operating System (HRM + CRM + AI Copilot)

Ứng dụng quản trị doanh nghiệp (HRM + CRM) tích hợp **AI** cho SMB Việt Nam.
Bản demo cho **hackathon AI Challenge**. Web tĩnh (vanilla JS) + Supabase (Postgres) + DeepSeek AI.

> **Live demo:** https://bizcore-erp-vn.pages.dev
> **Đăng nhập thử:** `an0@cortex.vn` / `123456` (Giám đốc) · `em5@cortex.vn` (Trưởng phòng) · `dung3@cortex.vn` (Nhân sự) — mật khẩu đều `123456`.

---

## 1. BizCore là gì — 3 trụ cột khác biệt
1. **Trung tâm điều hành (Command Center)** — "Insight Engine" tự quét chéo HR/CRM/Lương, đẩy **tín hiệu ưu tiên** kèm lý do + hành động 1-click (deal quá hạn, quỹ lương bất thường, win-rate thấp, đi trễ, lead chờ chăm…).
2. **Mô phỏng What-If** ⭐ — mô phỏng quyết định (tăng lương / tuyển thêm / chốt deal) tính **đúng luật lao động VN**: BHXH/BHYT/BHTN + thuế TNCN lũy tiến. Đây là "moat" khó sao chép.
3. **AI Copilot** — chat **với dữ liệu công ty** (hỏi "phòng nào đông nhất?", "quỹ lương bao nhiêu?"), **thực thi lệnh** (đổi lương, đổi stage, chấm công, tạo deal/khách) qua tool-calling, và **đánh giá deal/khách hàng**.

Ngoài ra: Phễu chuyển đổi bán hàng (Sales Funnel) tự tìm "lỗ hổng", Báo động Deal ngâm (stale), xuất Excel thật (.xlsx), tìm kiếm toàn cục, thông báo, phân quyền theo vai trò (RBAC).

## 2. Tech stack (cố tình giữ ĐƠN GIẢN để dễ tiếp quản)
- **Frontend:** HTML + CSS + **JavaScript thuần** (KHÔNG framework, KHÔNG build step). SPA định tuyến bằng hash (`#/dashboard`).
- **Backend/DB:** **Supabase** (Postgres + PostgREST). Client gọi qua `@supabase/supabase-js` (CDN).
- **AI:** **DeepSeek** Chat API (tool-calling + streaming), gọi thẳng từ client.
- **Animation:** **GSAP** (login động, count-up, stagger) + hiệu ứng tự viết (typewriter, shiny text, shine button) trong `js/effects.js` + `css/effects.css`.
- **Excel:** **SheetJS (xlsx)** qua CDN.
- **Hosting:** **Cloudflare Pages** (web tĩnh).

## 3. Cấu trúc thư mục gói này
```
BizCore/
├── README.md              ← bạn đang đọc
├── SUPABASE_SCHEMA.md      ← schema DB (CREATE TABLE) + gợi ý RLS
├── app/                    ← TOÀN BỘ ứng dụng chạy được
│   ├── index.html          ← shell + login + nạp scripts
│   ├── preview.html        ← trang xem thiết kế tĩnh (không cần đăng nhập)
│   ├── server.js           ← static server Node (chạy local)
│   ├── _headers            ← Cloudflare: no-cache (chống lệch cache khi redeploy)
│   ├── css/                ← variables(tokens)/base/layout/components/pages/ai/effects
│   └── js/
│       ├── config.example.js   ← MẪU cấu hình
│       ├── config.local.js     ← cấu hình THẬT (Supabase + DeepSeek key) — xem mục Bảo mật
│       ├── supabase-store.js   ← lớp dữ liệu (mọi query Supabase, RBAC, tính lương VN)
│       ├── app.js              ← router SPA + auth + thông báo + tìm kiếm
│       ├── components.js        ← modal/toast/table/tabs/form dùng chung
│       ├── charts.js            ← vẽ biểu đồ (canvas, tự viết)
│       ├── ai.js                ← AI Copilot (prompt + tools + tool-calling)
│       ├── motion.js / effects.js ← animation
│       └── pages/               ← từng trang: dashboard, employees, departments,
│                                   attendance, payroll, customers, deals, reports, simulator
├── docs/                   ← BỐI CẢNH & Ý TƯỞNG (đọc để hiểu "vì sao")
│   ├── CONCEPT.md          ← concept 3 trụ cột
│   ├── FEATURES_AND_SKILLS.md ← blueprint tính năng + bộ kỹ năng AI
│   └── IDEAS_MASTER.md     ← kho ý tưởng tính năng (P0/P1/P2)
└── tools/
    └── make-excel.js       ← script Node tạo file Excel thật từ dữ liệu Supabase
```

## 4. Chạy LOCAL (2 phút)
Không cần build. Chỉ cần một static server.
```bash
cd app
node server.js          # → http://localhost:8080
```
Hoặc bất kỳ static server nào (VD `npx serve app`, Live Server của VSCode…).
Mở `http://localhost:8080` → đăng nhập bằng tài khoản ở đầu README.

> App dùng chung Supabase demo nên **có sẵn dữ liệu mẫu** (nhân sự, deal, lương…). Muốn DB riêng: xem mục 6.

## 5. Cấu hình & ⚠️ BẢO MẬT (đọc kỹ)
Cấu hình nằm ở `app/js/config.local.js`:
```js
window.BIZCORE_CONFIG = {
  supabaseUrl: '...supabase.co',
  supabaseAnonKey: '...',   // PUBLIC theo thiết kế (được bảo vệ bằng RLS)
  deepseekApiKey: 'sk-...', // BÍ MẬT (API trả phí)
};
```
- **`deepseekApiKey` là key trả phí** đang để lộ (web tĩnh nên client đọc được). **Người nhận NÊN thay bằng key DeepSeek của mình** (tạo tại platform.deepseek.com) trước khi dùng tiếp.
- **Supabase hiện CHƯA bật RLS** → ai có anon key đều đọc/ghi được. Demo thì ổn; **trước khi dùng thật PHẢI bật RLS** (xem `SUPABASE_SCHEMA.md`) và **hash mật khẩu** (hiện đang lưu thô để demo login).
- Copy `config.example.js` → `config.local.js` rồi điền giá trị của bạn nếu tự dựng.

## 6. Dùng Supabase riêng
1. Tạo project tại supabase.com → lấy **Project URL** + **anon key** → điền vào `config.local.js`.
2. Chạy các câu `CREATE TABLE` trong **`SUPABASE_SCHEMA.md`** (SQL Editor).
3. (Khuyến nghị) bật **RLS + policies** theo gợi ý trong file đó.
4. Seed dữ liệu mẫu: xem đoạn "SEED" trong `SUPABASE_SCHEMA.md`.

## 7. Deploy (Cloudflare Pages)
```bash
# 1 lần: đăng nhập
npx wrangler login
# tạo project (1 lần)
npx wrangler pages project create bizcore-erp-vn --production-branch=main
# deploy (thư mục app/ là static, không cần build)
npx wrangler pages deploy app --project-name=bizcore-erp-vn --branch=main
```
`_headers` (no-cache) đảm bảo redeploy không bị kẹt cache. Có thể deploy lên bất kỳ static host nào (Netlify, Vercel static, GitHub Pages…).

## 8. Hệ thống thiết kế — "Graphite Enterprise"
- Bảng màu: **graphite** (xám lạnh nền) + **evergreen `#0c6b57`** (hành động) + **slate-indigo `#33417a`** (AI) — tokens ở `css/variables.css` (đổi 1 chỗ là đổi cả app).
- Font: **Manrope** (UI) + **IBM Plex Mono** (số liệu).
- Nguyên tắc: hairline ấm, số mono, viền sắc nét, animation tinh tế. Logo mark "neural core" (SVG inline trong `index.html`).

## 9. Đã có (chạy được)
Login + RBAC · CRUD Nhân sự/Phòng ban/Khách/Cơ hội · Chấm công · **Bảng lương + BHXH + thuế TNCN VN** · **Command Center** · **What-If Simulator** · **AI Copilot (chat-with-data + tool-calling)** · **Sales Funnel + Stale Deal** · **Xuất Excel .xlsx** · Tìm kiếm · Thông báo · biểu đồ · animation.

## 10. Còn lại / TODO (cho người tiếp quản)
- **Bảo mật production:** bật RLS, hash mật khẩu (bcrypt / dùng Supabase Auth), xoay & giấu DeepSeek key (nên qua backend proxy / Cloudflare Worker).
- **Cần thêm cột/bảng Supabase** rồi mới làm được: **Lịch họp**, **Chấm công kèm ảnh + vị trí (GPS)**, **Đánh giá khách/deal (lưu lại)**, **ngày vào/ngày rời công ty**.
- **Tự động gửi báo cáo (PDF/Telegram) định kỳ:** cần **Cloudflare Worker + Cron** (web tĩnh không tự chạy nền).
- **Công thức lương:** hiện `Thực nhận = (Lương theo công + Phụ cấp 10%) − BHXH NV (10.5%) − Thuế TNCN`. Phụ cấp 10% đang hard-code trong `supabase-store.js > generatePayroll()`; cân nhắc bỏ hoặc hiện thành 1 cột cho minh bạch.

## 11. Gotchas (bẫy đã gặp — ghi lại kẻo dẫm lại)
- **Cache khi redeploy:** asset có `?v=` + `_headers: no-cache`. Nếu thấy bản cũ → hard-refresh `Ctrl+Shift+R`.
- **Supabase `.like` trên cột `date` → lỗi 42883.** Đã đổi sang `.gte/.lte` (lọc khoảng ngày).
- **Xuất Excel:** phải tạo Blob đúng MIME + `<a download="...xlsx">`; `XLSX.writeFile` trên Edge ra tên UUID không đuôi.
- **`gsap.from` hay kẹt `opacity:0`** → dùng `fromTo` + `clearProps` + failsafe (xem `motion.js`).
- **Framer marketplace components KHÔNG cắm vào vanilla được** (React/Framer-Motion) — mọi hiệu ứng ở đây là code gốc.

## 12. Tài khoản demo
| Email | Vai trò | Mật khẩu |
|---|---|---|
| an0@cortex.vn | Giám đốc (admin) | 123456 |
| em5@cortex.vn | Trưởng phòng (manager) | 123456 |
| dung3@cortex.vn | Nhân sự (hr) | 123456 |

---
*Đọc thêm bối cảnh & ý tưởng ở thư mục `docs/`.*
