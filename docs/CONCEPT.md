# BizCore ERP → "BizCore Copilot" — Concept khác biệt cho Hackathon

> Tổng hợp từ 7 khóa LinkedIn Learning (agentic AI, sales pipeline, CRM, business process,
> business plan/cash-flow, HR metrics) + phân tích codebase hiện có.
> Nguồn transcript: `research/linkedin/*.md`.

## 1. Vấn đề & khoảng trống thị trường
ERP/CRM cho SMB Việt (Misa, Base, Fast, KiotViet…) chủ yếu là **CRUD + dashboard bị động**:
người dùng phải tự đi tìm số, tự suy luận, tự quyết định. Chủ SMB không có "cố vấn vận hành".

**Insight từ khóa Agentic AI (David Linthicum):** giá trị lớn nhất của agentic AI không phải chatbot,
mà là hệ thống **tự quan sát dữ liệu → lập kế hoạch → đề xuất/hành động → học từ feedback loop**,
có **human-in-the-loop** cho quyết định rủi ro.

## 2. Concept: "AI Copilot điều hành doanh nghiệp" (3 trụ cột)
Nâng cái mầm sẵn có (AI agent thực thi lệnh) thành một **Copilot vận hành** — hiếm trùng, thực dụng, khó sao chép:

### Trụ 1 — Trung tâm Điều hành Chủ động (Proactive Command Center)
Thay dashboard bị động bằng **Insight Engine** quét liên tục HR + CRM + Payroll, đẩy các **"tín hiệu"**
ưu tiên kèm **hành động 1-click**:
- "3 deal (4.2 tỷ) sắp quá hạn đóng — 14 ngày chưa cập nhật" → mở deal / nhắc
- "Quỹ lương tháng vượt 8% do 2 nhân viên mới" → xem mô phỏng
- "Win rate quý tụt 32%→21%" → phân tích
- "NV X đi trễ 6 lần/tháng" → cảnh báo
→ Áp dụng pattern *feedback loop + planning + reflection* (agent giải thích VÌ SAO + đề xuất).

### Trụ 2 — Máy Mô phỏng Quyết định "What-If" ⭐ (điểm độc nhất)
Engine mô phỏng kịch bản đặt trên **bộ tính lương/BHXH/thuế TNCN Việt Nam THẬT** đã có sẵn (`utils.js`):
- "Tăng lương team Sales 10% → quỹ lương, BHXH DN, thuế TNCN đổi bao nhiêu? Cần thêm bao nhiêu doanh thu để hòa vốn?"
- "Chốt 3 deal đang ở negotiation → doanh thu quý, hoa hồng, dòng tiền?"
- "Tuyển 2 NV 20tr → chi phí năm, điểm hòa vốn khi nào?"
→ **Moat thật:** mô phỏng chi phí-nhân-sự theo luật lao động VN chính xác là thứ SMB cực cần và
khó dựng nhanh. Ghép insight cash-flow/break-even từ khóa Business Plan.

### Trụ 3 — Agent thực thi có Phê duyệt + Nhật ký (Trust layer)
Nâng agent DeepSeek từ 3 tool "mù" → vòng lặp agentic đủ:
- Nhiều tool hơn: tra cứu thực thể, tạo customer/deal/employee, chạy mô phỏng, tạo bảng lương.
- **Cổng phê duyệt human-in-the-loop** cho hành động tài chính/xóa (pattern từ khóa agentic).
- **Audit log** mọi hành động AI → tin cậy để doanh nghiệp thật dùng.

## 3. Vì sao thắng được hackathon
- **Không phổ biến / khó trùng:** hầu hết demo ERP là CRUD dashboard; ghép *agentic + what-if mô phỏng
  chi phí theo luật VN + cổng phê duyệt* là hiếm.
- **Thực dụng:** chủ SMB cần đúng 2 câu hỏi — "hôm nay cần để mắt việc gì" và "quyết định này tốn/lợi bao nhiêu".
- **Khó sao chép:** đòi hỏi dữ liệu tích hợp chéo module + engine lương/BHXH/thuế VN + vòng agentic có kiểm soát.
- **Đáng tin để chấm điểm production:** có bảo mật RLS + Auth thật + audit log.

## 4. Backlog tính năng (map sang module)
| Module | Loại | Mô tả |
|--------|------|-------|
| Command Center | Nâng cấp Dashboard | Insight Engine + tín hiệu + hành động 1-click |
| What-If Simulator | MỚI ⭐ | Slider + hỏi ngôn ngữ tự nhiên; dùng engine lương/thuế VN |
| HR Analytics | MỚI | Turnover, headcount cost, tỷ lệ chuyên cần, tenure TB (khóa HR Metrics) |
| Leave / Nghỉ phép | MỚI (tùy chọn) | Đơn phép + duyệt — lấp khoảng trống ERP phổ biến |
| AI Copilot v2 | Nâng cấp | Nhiều tool + cổng phê duyệt + audit |
| Audit Log | MỚI | Nhật ký hành động nhạy cảm (AI + người) |

## 5. Nền tảng phải vá song song (bắt buộc để "production-credible")
1. Bỏ **DeepSeek key hardcode** khỏi client → config gitignored (hoặc proxy).
2. **RLS + policies** Supabase (phân quyền THẬT, không chỉ ẩn ở client). `schema.sql` kèm seed.
3. Mật khẩu: Supabase Auth hoặc hash — bỏ so sánh plaintext.
4. Xóa/di dời **dead code** `store.js` (bản localStorage không dùng).
5. `README.md`, `.gitignore`, `config.example.js`, dữ liệu demo đẹp.
6. Fix nghiệp vụ: chấm công giờ thực/ngày công thực; rà công thức lương-BH-thuế.
