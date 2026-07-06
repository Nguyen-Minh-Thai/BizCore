# BizCore Copilot — Blueprint Tính năng & Kỹ năng AI (tổng hợp 24 khóa)

> Nguồn: `research/{linkedin,udemy,educative}/*.md` (24 khóa).
> Doc này = spec build. Concept tổng ở [CONCEPT.md](CONCEPT.md).

## A. AI COPILOT v2 — Bộ KỸ NĂNG (tools) cho AI
> Grounded: Udemy *Complete Agent & MCP Course*, *GenAI Architectures (RAG/tool-calling)*,
> *Intro to AI Agents*, Educative *MCP Fundamentals*, LinkedIn *Agentic AI Fundamentals*.
> Pattern lõi rút ra: **planning → tool-use → reflection → feedback loop → human-in-the-loop → memory + guardrails**.

Nâng agent DeepSeek từ 3 tool "mù" → bộ tool phân tầng có kiểm soát:

**Read/Query (an toàn, không cần duyệt):**
- `searchEmployee(query)` / `searchCustomer` / `searchDeal` — tra ID theo tên (bỏ nhồi cả list vào prompt → xử lý được dữ liệu lớn).
- `getBusinessSnapshot()` — số liệu tổng (quỹ lương, pipeline, headcount, win rate…).
- `computeHRMetric(metric, filter)` — turnover, cost-per-hire, attendance rate, tenure.
- `runWhatIfSimulation(scenario)` — gọi engine mô phỏng (trụ 2).
- `queryInsights()` — trả về các tín hiệu Command Center.

**Write (CẦN cổng phê duyệt human-in-the-loop + ghi audit):**
- `createCustomer` / `createDeal` / `createEmployee`
- `updateEmployeeSalary` / `updateDealStage` / `checkInEmployee` (đã có → thêm confirm)
- `generatePayroll(month)`
- `logActivity(entity, note)` — ghi tương tác CRM ("no interaction slips").

**Kiến trúc agent (từ khóa Agentic/MCP):**
- Vòng lặp: user → LLM lập kế hoạch → gọi tool đọc → (nếu ghi) **hiện thẻ xác nhận** → thực thi → phản chiếu kết quả → trả lời.
- **Audit log** mọi tool-call (ai/lúc nào/tham số/kết quả).
- Guardrail: chỉ thao tác ID có thật; hành động tài chính luôn cần duyệt.

## B. FEATURE MODULES (mới + nâng cấp)
### B1. Command Center (nâng cấp Dashboard) ⭐ trụ 1
> Grounded: *HR People Analytics* (4 tầng: descriptive→diagnostic→predictive→**prescriptive**),
> *CRM Software Overview* ("no interaction slips", follow-up reminders), *SAP ERP* (event cascade).
- **Insight Engine**: luật + AI quét chéo HR/CRM/Payroll → sinh "tín hiệu" xếp hạng + hành động 1-click.
- Nhóm tín hiệu: Deal nguội/quá hạn · Quỹ lương bất thường · Chuyên cần (đi trễ/vắng) · Win rate giảm · Nhân viên "flight risk" (attrition) · Khách chưa follow-up.
- Mỗi tín hiệu: WHAT + WHY (diagnostic) + hành động đề xuất.

### B2. What-If Simulator (MỚI) ⭐⭐ trụ 2 — điểm độc nhất
> Grounded: engine lương/BHXH/thuế VN sẵn có + LinkedIn *Business Plan* (break-even, cash-flow) + HR *prescriptive*.
- Kịch bản: tăng lương team X% · tuyển thêm N người · chốt loạt deal · đổi cơ cấu phụ cấp.
- Output: Δ quỹ lương, Δ BHXH DN, Δ thuế TNCN, Δ chi phí năm, doanh thu hòa vốn cần thêm, dòng tiền.
- UI: slider + hỏi ngôn ngữ tự nhiên (AI gọi `runWhatIfSimulation`).

### B3. HR Analytics (MỚI)
> Grounded: *HR Analytics using Excel* + *People Analytics* + LinkedIn *HR Metrics*.
- Metrics: turnover rate (theo phòng/tenure/lý do), headcount cost, attendance/late rate, avg tenure, cost-per-hire, salary distribution.
- Attrition risk (heuristic: đi trễ nhiều + tenure 2–3 năm + lương dưới trung vị phòng — đúng insight khóa People Analytics).

### B4. CRM nâng cao (nâng cấp)
> Grounded: *CRM Software Overview* + *HubSpot Sales* + LinkedIn *Sales Pipeline*.
- **Activities/Touchpoints**: log tương tác + nhắc follow-up; cảnh báo deal im lặng.
- **Weighted forecast**: giá trị pipeline × xác suất theo stage (lead 10%…negotiation 80%).
- **Lead scoring** đơn giản; lifecycle stages.

### B5. Leave / Nghỉ phép (MỚI, tùy chọn)
- Đơn phép → duyệt (manager) → trừ vào công/lương. Lấp khoảng trống ERP phổ biến.

### B6. Audit Log (MỚI, nền tin cậy)
- Nhật ký mọi hành động nhạy cảm (AI + người): ai, khi nào, làm gì, giá trị cũ→mới.

## C. THỨ TỰ BUILD (ưu tiên hackathon)
1. **Nền tảng/bảo mật** (bắt buộc): config gitignored (bỏ DeepSeek key hardcode), `schema.sql` + RLS, Auth/hash, xóa dead code, README.
2. **Fix nghiệp vụ**: chấm công giờ thực; rà lương/BH/thuế; weighted forecast.
3. **AI Copilot v2** (mục A) — điểm nhấn demo.
4. **What-If Simulator** (B2) — điểm nhấn demo ⭐.
5. **Command Center** (B1) — điểm nhấn demo ⭐.
6. **HR Analytics** (B3) + **CRM activities** (B4).
7. Audit Log (B6) + Leave (B5) nếu còn thời gian.
8. Polish UI + dữ liệu demo + kịch bản trình diễn.

## D. Góc "khó trùng" cho giám khảo
- Không phải CRUD dashboard: **agentic + mô phỏng chi phí theo luật VN + prescriptive insight + phê duyệt/audit**.
- 2 câu hỏi chủ SMB thực sự cần: "hôm nay để mắt việc gì?" (Command Center) và "quyết định này tốn/lợi bao nhiêu?" (What-If).
