# Checklist Debug: Hướng dẫn tích hợp Phụ cấp & Ngày vào/rời công ty

Tài liệu này ghi lại chi tiết các thay đổi cấu trúc Database và Code JS theo định dạng trước/sau chỉnh sửa.

---

## 1. Cấu trúc Database (Supabase SQL)

### Mục 1.1: Bảng Nhân sự (employees)
* **Code cũ:**
  ```sql
  CREATE TABLE IF NOT EXISTS employees (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE,
      phone VARCHAR(50),
      password TEXT NOT NULL DEFAULT '123456',
      role TEXT NOT NULL DEFAULT 'employee',
      position VARCHAR(255),
      department_id UUID REFERENCES departments(id),
      base_salary NUMERIC NOT NULL DEFAULT 0,
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```
* **Lý do:** Thiếu các cột lưu ngày bắt đầu làm việc và ngày nghỉ việc để hiển thị và tính toán.
* **Code mới (Đã cập nhật):**
  ```sql
  CREATE TABLE IF NOT EXISTS employees (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE,
      phone VARCHAR(50),
      password TEXT NOT NULL DEFAULT '123456',
      role TEXT NOT NULL DEFAULT 'employee',
      position VARCHAR(255),
      department_id UUID REFERENCES departments(id),
      base_salary NUMERIC NOT NULL DEFAULT 0,
      status VARCHAR(50) DEFAULT 'active',
      hire_date DATE, -- <-- Cột ngày vào công ty
      exit_date DATE, -- <-- Cột ngày rời công ty
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```

---

### Mục 1.2: Bảng Lương (payroll)
* **Code cũ:**
  ```sql
  CREATE TABLE IF NOT EXISTS payroll (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      employee_id UUID REFERENCES employees(id),
      month VARCHAR(7) NOT NULL,
      base_salary NUMERIC DEFAULT 0,
      work_days NUMERIC DEFAULT 0,
      actual_work_days NUMERIC DEFAULT 0,
      allowances NUMERIC DEFAULT 0,
      bhxh_employee NUMERIC DEFAULT 0,
      bhyt_employee NUMERIC DEFAULT 0,
      bhtn_employee NUMERIC DEFAULT 0,
      bhxh_company NUMERIC DEFAULT 0,
      bhyt_company NUMERIC DEFAULT 0,
      bhtn_company NUMERIC DEFAULT 0,
      personal_tax NUMERIC DEFAULT 0,
      net_salary NUMERIC DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```
* **Lý do:** Tránh việc tính lặp bảng lương cho một nhân viên trong cùng một tháng.
* **Code mới (Đã cập nhật):**
  ```sql
  CREATE TABLE IF NOT EXISTS payroll (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
      month VARCHAR(7) NOT NULL,
      base_salary NUMERIC DEFAULT 0,
      work_days NUMERIC DEFAULT 0,
      actual_work_days NUMERIC DEFAULT 0,
      allowances NUMERIC DEFAULT 0,
      bhxh_employee NUMERIC DEFAULT 0,
      bhyt_employee NUMERIC DEFAULT 0,
      bhtn_employee NUMERIC DEFAULT 0,
      bhxh_company NUMERIC DEFAULT 0,
      bhyt_company NUMERIC DEFAULT 0,
      bhtn_company NUMERIC DEFAULT 0,
      personal_tax NUMERIC DEFAULT 0,
      net_salary NUMERIC DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE (employee_id, month) -- <-- Giới hạn 1 bản ghi / người / tháng
  );
  ```

---

## 2. Phần Code cập nhật (JavaScript Frontend)

### File: `app/js/components.js`

#### Mục 2.0: Sửa lỗi modal Xác nhận không hoạt động (`showConfirm`)
* **Vị trí:** Dòng 42 (hàm `showConfirm`)
* **Code cũ:**
  ```javascript
  showConfirm(message, onConfirm) {
  ```
* **Lý do:** Các trang trong dự án gọi hàm này với 3 tham số `showConfirm(title, message, onConfirm)`, dẫn đến chuỗi thông điệp bị hiểu nhầm là hàm `onConfirm`, gây ra lỗi Javascript `TypeError: onConfirm is not a function` và chặn toàn bộ tiến trình khi người dùng nhấn nút Xác nhận.
* **Code mới:**
  ```javascript
  showConfirm(title, message, onConfirm) {
    if (typeof message === 'function') { // <-- Hỗ trợ tự động chuyển đổi nếu gọi 2 tham số
      onConfirm = message;
      message = title;
      title = 'Xác nhận';
    }
  ```

---

### File: `app/js/utils.js`

#### Mục 2.0b: Thêm hàm đếm số ngày làm việc tiêu chuẩn trong tháng (`getWorkingDaysInMonth`)
* **Vị trí:** Dòng 107 (hàm `getWorkingDaysInMonth`)
* **Code cũ:** (Không có)
* **Lý do:** Đếm số ngày từ thứ Hai đến thứ Sáu trong tháng một cách tự động và chính xác, thay vì dùng con số 22 cố định cho mọi tháng.
* **Code mới:**
  ```javascript
  getWorkingDaysInMonth(monthStr) {
    if (!monthStr) return 22;
    const [year, month] = monthStr.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    let count = 0;
    let curr = new Date(startDate);
    while (curr <= endDate) {
      const day = curr.getDay();
      if (day !== 0 && day !== 6) {
        count++;
      }
      curr.setDate(curr.getDate() + 1);
    }
    return count;
  }
  ```

---

### File: `app/js/supabase-store.js`

#### Mục 2.1: Lấy thông tin phụ cấp và ngày công từ DB
* **Vị trí:** Dòng 308 (hàm `getPayrollByMonth`)
* **Code cũ:**
  ```javascript
  personalTax: Number(d.personal_tax || 0),
  bhxhCompany: Number(d.bhxh_company || 0),
  ```
* **Lý do:** Đọc thêm giá trị phụ cấp, số ngày công chuẩn và số ngày công thực tế từ DB để hiển thị chính xác lên UI.
* **Code mới:**
  ```javascript
  personalTax: Number(d.personal_tax || 0),
  allowances: Number(d.allowances || 0), // <-- Lấy phụ cấp từ DB
  workDays: Number(d.work_days || 0), // <-- Lấy số ngày công chuẩn từ DB
  actualWorkDays: Number(d.actual_work_days || 0), // <-- Lấy ngày công thực tế từ DB
  bhxhCompany: Number(d.bhxh_company || 0),
  ```

---

#### Mục 2.2: Thay đổi logic tính lương, bỏ phụ cấp 10%, tính ngày công chuẩn của tháng và áp dụng Luật bảo hiểm
* **Vị trí:** Dòng 329 và 349 (hàm `generatePayroll`)
* **Code cũ:**
  ```javascript
  const actualDays = summary.presentDays || workDays;
  const prorated = emp.baseSalary * (actualDays / workDays);
  const allowances = Math.round(emp.baseSalary * 0.1); 
  
  const bhxhE = Utils.calculateBHXH(emp.baseSalary);
  // ...
  const record = {
    employee_id: emp.id, month: month,
    base_salary: emp.baseSalary, net_salary: net,
    personal_tax: tax,
    bhxh_employee: bhxhE, bhyt_employee: bhytE, bhtn_employee: bhtnE,
    bhxh_company: bhxhC, bhyt_company: bhytC, bhtn_company: bhtnC
  };
  ```
* **Lý do:** 
  1. Người dùng yêu cầu đưa phụ cấp về 0đ.
  2. Bổ sung lưu trữ `work_days` và `actual_work_days` vào database.
  3. Tính động số ngày công chuẩn của từng tháng cụ thể (`Utils.getWorkingDaysInMonth`) thay vì cố định 22 ngày.
  4. Áp dụng Luật Lao động Việt Nam: nhân viên đi làm dưới 14 ngày/tháng thì tiền đóng bảo hiểm bằng 0đ để tránh lỗi lương thực nhận bị âm tiền.
* **Code mới (Đã cập nhật):**
  ```javascript
  const workDays = Utils.getWorkingDaysInMonth(month); // <-- Lấy số ngày làm việc chuẩn trong tháng tự động (Tháng 7/2026 là 23 ngày)
  const actualDays = summary.hasRecords ? summary.presentDays : workDays; // Nếu chưa chấm công ngày nào, mặc định tính đủ ngày công tiêu chuẩn.
  const prorated = emp.baseSalary * (actualDays / workDays);
  const allowances = 0; // <-- Đặt phụ cấp bằng 0
  
  // Theo Luật Lao động Việt Nam: Nếu làm dưới 14 ngày trong tháng thì không đóng BHXH/BHYT/BHTN
  const paysInsurance = actualDays >= 14;
  
  const bhxhE = paysInsurance ? Utils.calculateBHXH(emp.baseSalary) : 0; // <-- Đóng bảo hiểm nếu công >= 14
  const bhytE = paysInsurance ? Utils.calculateBHYT(emp.baseSalary) : 0;
  const bhtnE = paysInsurance ? Utils.calculateBHTN(emp.baseSalary) : 0;
  // ...
  const record = {
    employee_id: emp.id, month: month,
    base_salary: emp.baseSalary, net_salary: net,
    personal_tax: tax,
    allowances: allowances, // <-- Lưu phụ cấp (0) vào DB
    work_days: workDays, // <-- Lưu ngày công chuẩn vào DB
    actual_work_days: actualDays, // <-- Lưu ngày công thực tế vào DB
    bhxh_employee: bhxhE, bhyt_employee: bhytE, bhtn_employee: bhtnE,
    bhxh_company: bhxhC, bhyt_company: bhytC, bhtn_company: bhtnC
  };
  ```

---

#### Mục 2.2b: Thêm thuộc tính check sự tồn tại của dữ liệu chấm công và tính số ngày công chuẩn của tháng
* **Vị trí:** Dòng 270 (hàm `getMonthlyAttendanceSummary`)
* **Code cũ:**
  ```javascript
  return {
    totalWorkDays: 22,
    presentDays: records.filter(r => r.status === 'on_time' || r.status === 'late').length,
    lateDays: records.filter(r => r.status === 'late').length,
    absentDays: records.filter(r => r.status === 'absent').length,
    leaveDays: records.filter(r => r.status === 'leave').length,
    totalHours: 0
  };
  ```
* **Lý do:** Lấy động ngày công tiêu chuẩn trong tháng để báo cáo chấm công hiển thị chính xác.
* **Code mới:**
  ```javascript
  return {
    totalWorkDays: Utils.getWorkingDaysInMonth(month || Utils.getCurrentMonth()), // <-- Lấy động ngày công tiêu chuẩn
    presentDays: records.filter(r => r.status === 'on_time' || r.status === 'late').length,
    lateDays: records.filter(r => r.status === 'late').length,
    absentDays: records.filter(r => r.status === 'absent').length,
    leaveDays: records.filter(r => r.status === 'leave').length,
    totalHours: 0,
    hasRecords: records.length > 0 // <-- Đánh dấu có dữ liệu chấm công hay không
  };
  ```

---

#### Mục 2.3: Map ngày vào/rời khi lấy danh sách nhân viên
* **Vị trí:** Dòng 98-99 (hàm `getEmployees`)
* **Code cũ:**
  ```javascript
  password: null,
  createdAt: d.created_at
  ```
* **Lý do:** Trả về ngày vào/rời để giao diện hiển thị.
* **Code mới:**
  ```javascript
  password: null,
  hireDate: d.hire_date, // <-- Map ngày vào
  exitDate: d.exit_date, // <-- Map ngày rời
  createdAt: d.created_at
  ```

---

#### ... (Các mục khác giữ nguyên) ...
