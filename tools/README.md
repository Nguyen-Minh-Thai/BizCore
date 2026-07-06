# tools/make-excel.js

Script Node tạo **file Excel thật** (nhiều sheet: Nhân sự / Phòng ban / Lương / Cơ hội / Khách)
từ dữ liệu Supabase — tiện khi muốn xuất báo cáo mà không mở trình duyệt.

> App đã có nút **Xuất Excel** ngay trong web (dùng SheetJS). Script này chỉ là **bonus** chạy phía máy.

## Chạy
```bash
cd tools
npm i xlsx --no-save     # cài SheetJS 1 lần
node make-excel.js       # đọc ../app/js/config.local.js → xuất file ra Desktop
```
Kết quả: `BizCore-BaoCao-YYYY-MM.xlsx` trên Desktop (hoặc thư mục hiện tại nếu không có Desktop).
Đổi tháng: sửa biến `month` trong `make-excel.js` (mặc định = tháng hiện tại).
