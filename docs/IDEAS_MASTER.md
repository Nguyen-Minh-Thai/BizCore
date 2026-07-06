# BizCore Copilot — KHO Ý TƯỞNG TÍNH NĂNG (siêu hoàn chỉnh)

> Gom toàn bộ ý tưởng từ 28 khóa đã cào (`research/{linkedin,udemy,educative}`).
> Ký hiệu: ⬛ đã có · 🔷 nâng cấp · ✳️ MỚI · ⭐ điểm khác biệt/hackathon.
> Tầng ưu tiên: **P0** (demo lõi) · **P1** (nên có) · **P2** (mở rộng).

## 0. Tầm nhìn
"AI Copilot điều hành doanh nghiệp SMB Việt": **quan sát → cảnh báo → mô phỏng → hành động có phê duyệt**.
Không phải CRUD dashboard — mà là hệ điều hành có trí tuệ, tích hợp chéo HR + CRM + Tài chính.

---

## 1. HR & NỘI BỘ
| Tính năng | Loại | P | Nguồn khóa |
|---|---|---|---|
| Nhân sự (CRUD, hồ sơ, vai trò) | ⬛ | P0 | — |
| Phòng ban + **sơ đồ tổ chức (org chart)** | 🔷 | P1 | HR Metrics |
| Chấm công (check-in/out, giờ thực, ca) | 🔷 | P0 | — |
| Bảng lương + **BHXH/BHYT/BHTN + thuế TNCN VN** (đã có engine) | 🔷 | P0 | — |
| **Nghỉ phép**: đơn phép → duyệt → trừ công/lương | ✳️ | P1 | ERP |
| **HR Analytics** 4 tầng (mô tả→chẩn đoán→**dự đoán**→**kê đơn**) | ✳️⭐ | P1 | People Analytics, HR Metrics |
| Chỉ số: turnover rate (theo phòng/tenure/lý do), cost-per-hire, tỷ lệ chuyên cần, tenure TB, phân bố lương | ✳️ | P1 | HR Analytics Excel |
| **Dự đoán nghỉ việc (attrition/flight-risk)** heuristic + AI | ✳️⭐ | P1 | People Analytics |
| **Workforce planning** (kế hoạch tuyển theo tải/ngân sách) | ✳️ | P2 | People Analytics |
| Đánh giá hiệu suất (performance review, OKR/KPI) | ✳️ | P2 | HR Metrics, SaaS PM |
| Tuyển dụng nhẹ (ATS-lite: vị trí → ứng viên → pipeline) | ✳️ | P2 | — |
| Hồ sơ tài liệu nhân sự + **ký điện tử nhẹ** | ✳️ | P2 | — |
| **Onboarding nhân viên** (checklist tự động) | ✳️ | P2 | SaaS PM (onboarding) |

## 2. CRM & BÁN HÀNG
| Tính năng | Loại | P | Nguồn |
|---|---|---|---|
| Khách hàng / Công ty / **Liên hệ** (tách contact khỏi company) | 🔷 | P0 | HubSpot, CRM Overview |
| Cơ hội (Deals) + **pipeline kéo-thả theo stage** | 🔷 | P0 | HubSpot, Sales Pipeline |
| **Dự báo có trọng số** (giá trị × xác suất theo stage) | ✳️⭐ | P0 | Sales Pipeline |
| **Hoạt động/Touchpoint** (log cuộc gọi/email/gặp) + timeline | ✳️ | P1 | CRM Overview ("no interaction slips") |
| **Nhắc follow-up** + cảnh báo deal im lặng | ✳️⭐ | P1 | CRM Overview |
| **Lead scoring** (chấm điểm lead) | ✳️ | P1 | CRM Overview, HubSpot |
| **Phân khúc khách (segmentation)** động | ✳️ | P1 | CRM Overview |
| Lifecycle stage (lead→MQL→SQL→KH) | ✳️ | P2 | HubSpot |
| **Báo giá / Sản phẩm / Hóa đơn** (quote→invoice) | ✳️ | P1 | HubSpot (quotes/products/invoices) |
| **Ticket hỗ trợ khách** (service desk nhẹ) | ✳️ | P2 | HubSpot, GenAI (auto-ticketing) |
| Phân tích phễu bán hàng (conversion từng bước) | ✳️ | P1 | Sales Pipeline |

## 3. TÀI CHÍNH & VẬN HÀNH (ERP-lite)
| Tính năng | Loại | P | Nguồn |
|---|---|---|---|
| **Chi phí / Expense** (ghi nhận, duyệt) | ✳️ | P2 | SAP ERP |
| **Hóa đơn & dòng tiền** (invoice, cash-in/out) | ✳️ | P2 | SAP ERP, Business Plan |
| **Ngân sách & thực chi** (budget vs actual) | ✳️ | P2 | Business Plan |
| **Kho/Inventory nhẹ** + cảnh báo tồn thấp → yêu cầu mua | ✳️ | P2 | SAP ERP (event cascade) |
| **Order-to-cash** liên kết deal→hóa đơn→doanh thu | ✳️ | P2 | SAP ERP |

## 4. ⭐ COMMAND CENTER (Trung tâm điều hành chủ động)
| Tính năng | Loại | P | Nguồn |
|---|---|---|---|
| **Insight Engine** quét chéo HR/CRM/Tài chính → tín hiệu xếp hạng | ✳️⭐ | P0 | Agentic AI, People Analytics (prescriptive) |
| Tín hiệu kèm **WHAT + WHY (chẩn đoán)** + **hành động 1-click** | ✳️⭐ | P0 | HR Analytics 4 tầng |
| Loại tín hiệu: deal nguội/quá hạn · quỹ lương bất thường · win-rate giảm · đi trễ/vắng · flight-risk · khách chưa follow-up · tồn kho thấp | ✳️ | P0 | tổng hợp |
| **Bản tin sáng (Daily Briefing)** do AI viết | ✳️⭐ | P1 | Agentic AI |
| Phát hiện bất thường (anomaly) trên số liệu | ✳️ | P1 | GenAI, People Analytics |

## 5. ⭐⭐ WHAT-IF SIMULATOR (Mô phỏng quyết định)
| Tính năng | Loại | P | Nguồn |
|---|---|---|---|
| Mô phỏng **tăng lương team X%** → Δ quỹ lương, BHXH DN, thuế TNCN | ✳️⭐ | P0 | engine lương VN + Business Plan |
| Mô phỏng **tuyển thêm N người** → chi phí năm, điểm hòa vốn | ✳️⭐ | P0 | Business Plan (break-even) |
| Mô phỏng **chốt loạt deal** → doanh thu quý, hoa hồng, dòng tiền | ✳️⭐ | P1 | Sales Pipeline, Business Plan |
| Slider tương tác + **hỏi bằng ngôn ngữ tự nhiên** (AI gọi tool) | ✳️⭐ | P0 | Agentic AI, GenAI (function calling) |
| So sánh kịch bản A/B + xuất tóm tắt | ✳️ | P1 | Business Plan |

## 6. ⭐ AI COPILOT v2 — BỘ KỸ NĂNG (tools)
> Grounded: Complete Agent & MCP, GenAI Architectures, MCP Fundamentals, Intro AI Agents, Agentic AI Fundamentals.
**Đọc/tra (an toàn):** `searchEmployee/Customer/Deal`, `getBusinessSnapshot`, `computeHRMetric`, `runWhatIfSimulation`, `queryInsights`, **`askCompanyData` (RAG hỏi-đáp trên dữ liệu công ty)**, **`semanticSearch`**.
**Ghi (cần phê duyệt + audit):** `createCustomer/Deal/Employee`, `updateEmployeeSalary`, `updateDealStage`, `checkInEmployee`, `generatePayroll`, `logActivity`, `createTask`.
**Kỹ thuật (từ khóa agentic):** vòng lặp planning→tool→reflection→**human-in-the-loop** (thẻ xác nhận cho hành động tài chính/xóa)→memory; **guardrail** (chỉ ID thật); **audit log** mọi lệnh.
**Tính năng AI bề mặt (từ GenAI Architectures):**
- ✳️⭐ **Chat với dữ liệu công ty (RAG)** — "quý này team nào vượt ngân sách?"
- ✳️ **Tóm tắt** (summarize deal/khách/tháng), **phân loại** (classify lead/ticket), **semantic search** toàn hệ thống (⌘K thông minh).
- ✳️ **Soạn email/tin nhắn** follow-up tự động theo ngữ cảnh deal.
- ✳️ **Trích xuất** (extraction) dữ liệu từ văn bản dán vào → tạo lead/deal.
- ✳️ **Thuyết minh báo cáo** (AI narrate chart/số liệu).

## 7. XUYÊN SUỐT (Platform)
| Tính năng | Loại | P | Nguồn |
|---|---|---|---|
| **RBAC thật + RLS Supabase** (không chỉ ẩn client) | 🔷⭐ | P0 | — (bảo mật) |
| **Audit log** hành động nhạy cảm (AI + người) | ✳️⭐ | P0 | Agentic AI (trust) |
| **Command palette ⌘K** (điều hướng + hành động nhanh) | ✳️ | P1 | (chuẩn SaaS pro) |
| **Thông báo/Notifications** center | 🔷 | P1 | HubSpot (inbox) |
| **Automation/Workflows** (if-this-then-that nội bộ) | ✳️ | P2 | HubSpot (workflows) |
| **Trình tạo báo cáo + xuất CSV/PDF** | 🔷 | P1 | HubSpot (reports) |
| **Onboarding wizard** lần đầu (personalized) | ✳️ | P1 | SaaS PM (onboarding) |
| **Activity feed / nhật ký hệ thống** | ✳️ | P2 | — |
| Đa tiền tệ + định dạng VN | 🔷 | P2 | — |
| Chế độ tối (dark mode) tùy chọn | ✳️ | P2 | — |
| **Global search** (nhân sự/khách/deal) | 🔷 | P1 | — |

## 8. ⭐ SHORTLIST "ĂN ĐIỂM" HACKATHON (làm chắc cho demo)
1. **Command Center chủ động** (tín hiệu + WHY + hành động 1-click).
2. **What-If Simulator** trên engine lương/thuế VN thật.
3. **AI Copilot v2**: chat-với-dữ-liệu (RAG) + thực thi có **phê duyệt** + **audit log**.
4. **Weighted forecast** + phân tích phễu.
5. **HR Analytics + dự đoán nghỉ việc**.
6. **Bảo mật thật** (RLS + Auth) — ghi điểm "production-ready".

## 9. Khung ưu tiên cho DEMO (MoSCoW — từ khóa Business Analysis)
- **Must:** Auth/RLS · Command Center · What-If · AI Copilot v2 (RAG+approval+audit) · CRM pipeline+forecast · HR core+payroll VN.
- **Should:** HR Analytics+attrition · Activities/follow-up · Quotes/Invoice · ⌘K · Reports.
- **Could:** Leave · Tickets · Inventory · Automation · Dark mode · Performance.
