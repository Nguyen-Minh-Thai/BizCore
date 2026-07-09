# CRM CheckList Improve: Theo dõi cải tiến Mô-đun Khách hàng (CRM)

Tài liệu này ghi lại chi tiết các thay đổi cấu trúc Database và Code JS liên quan đến phần cải tiến Khách hàng (CRM) theo cấu trúc trước/sau chỉnh sửa.

---

## 1. Cấu trúc Database (Supabase SQL)

### Mục 1.1: Bổ sung cột nhân viên chăm sóc vào bảng `customers`
* **Vị trí:** Bảng `customers`
* **Code cũ:** (Không có)
* **Lý do:** Lưu trữ thông tin nhân viên phụ trách chăm sóc từng khách hàng.
* **Code mới (Đề xuất):**
  ```sql
  ALTER TABLE customers ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(id) ON DELETE SET NULL;
  ```

---

### Mục 1.2: Thêm trường file đính kèm và tạo các bảng phụ trợ (Contacts, Services, Quotes, Orders) cho Khách hàng
* **Vị trí:** Cơ sở dữ liệu Supabase
* **Code cũ:** (Không có)
* **Lý do:** Cho phép lưu tên file đính kèm trong ghi chú và tạo các liên kết thực tế của khách hàng tới liên hệ, báo giá, đơn hàng, xác nhận dịch vụ.
* **Code mới (Đề xuất):**
  ```sql
  -- 1. Bổ sung cột lưu tên file đính kèm vào bảng ghi chú khách hàng
  ALTER TABLE customer_notes ADD COLUMN IF NOT EXISTS file_name TEXT;

  -- 2. Tạo bảng liên hệ khách hàng
  CREATE TABLE IF NOT EXISTS customer_contacts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      position VARCHAR(255),
      email VARCHAR(255),
      phone VARCHAR(50),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- 3. Tạo bảng xác nhận dịch vụ
  CREATE TABLE IF NOT EXISTS customer_service_confirms (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
      code VARCHAR(50) NOT NULL,
      name VARCHAR(255) NOT NULL,
      confirm_date DATE NOT NULL DEFAULT CURRENT_DATE,
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- 4. Tạo bảng báo giá
  CREATE TABLE IF NOT EXISTS customer_quotes (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
      code VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      value NUMERIC DEFAULT 0,
      valid_until DATE,
      status VARCHAR(50) DEFAULT 'draft',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- 5. Tạo bảng đơn hàng
  CREATE TABLE IF NOT EXISTS customer_orders (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
      code VARCHAR(50) NOT NULL,
      order_date DATE NOT NULL DEFAULT CURRENT_DATE,
      value NUMERIC DEFAULT 0,
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- 6. Tạo bảng lịch sử thay đổi (logs)
  CREATE TABLE IF NOT EXISTS customer_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      created_by VARCHAR(255) DEFAULT 'Quản trị viên',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```

---

## 2. Phần Code cập nhật (JavaScript Frontend)

### File: `app/js/supabase-store.js`

#### Mục 2.1: Cập nhật hàm lấy danh sách khách hàng kèm nhân viên chăm sóc
* **Vị trí:** Dòng 373 (hàm `getCustomers`)
* **Code cũ:**
  ```javascript
  async getCustomers() {
    let query = supabaseClient.from('customers').select('*');
    if (this.currentUser) {
      if (this.currentUser.role === 'hr' || this.currentUser.role === 'employee') {
        return [];
      }
    }
    const { data, error } = await query;
    if (error) { console.error(error); return []; }
    return data.map(d => ({...d, createdAt: d.created_at}));
  },
  ```
* **Lý do:** Load thông tin `employee_id` và join để lấy thêm tên nhân viên chăm sóc của khách hàng từ bảng `employees`.
* **Code mới:**
  ```javascript
  async getCustomers() {
    let query = supabaseClient.from('customers').select('*, employee:employees(id, name)');
    if (this.currentUser) {
      if (this.currentUser.role === 'hr' || this.currentUser.role === 'employee') {
        return [];
      }
    }
    const { data, error } = await query;
    if (error) { console.error(error); return []; }
    return data.map(d => ({
      ...d, 
      employeeId: d.employee_id, 
      employeeName: d.employee ? d.employee.name : null,
      createdAt: d.created_at
    }));
  },
  ```

---

#### Mục 2.2: Cập nhật lấy chi tiết 1 khách hàng kèm nhân viên chăm sóc
* **Vị trí:** Dòng 387 (hàm `getCustomer`)
* **Code cũ:**
  ```javascript
  async getCustomer(id) {
    const { data, error } = await supabaseClient.from('customers').select('*').eq('id', id).single();
    if (error || !data) return null;
    return data;
  },
  ```
* **Lý do:** Lấy thêm mối liên kết nhân viên chăm sóc khi hiển thị thông tin.
* **Code mới:**
  ```javascript
  async getCustomer(id) {
    const { data, error } = await supabaseClient.from('customers').select('*, employee:employees(id, name)').eq('id', id).single();
    if (error || !data) return null;
    return {
      ...data,
      employeeId: data.employee_id,
      employeeName: data.employee ? data.employee.name : null
    };
  },
  ```

---

#### Mục 2.3: Cập nhật lưu và sửa thông tin nhân viên chăm sóc cho khách hàng
* **Vị trí:** Dòng 396 và 409 (hàm `addCustomer` và `updateCustomer`)
* **Code cũ:**
  ```javascript
  async addCustomer(customerData) {
    const { data, error } = await supabaseClient.from('customers').insert(customerData).select().single();
    // ...
  async updateCustomer(id, customerData) {
    const { data, error } = await supabaseClient.from('customers').update(customerData).eq('id', id).select().single();
  ```
* **Lý do:** Thu thập và lưu giá trị `employee_id` từ client xuống database.
* **Code mới:**
  ```javascript
  async addCustomer(customerData) {
    const dbData = {
      name: customerData.name,
      company: customerData.company,
      email: customerData.email,
      phone: customerData.phone,
      status: customerData.status,
      source: customerData.source,
      employee_id: customerData.employeeId || null
    };
    const { data, error } = await supabaseClient.from('customers').insert(dbData).select().single();
    // ...
  async updateCustomer(id, customerData) {
    const dbData = {
      name: customerData.name,
      company: customerData.company,
      email: customerData.email,
      phone: customerData.phone,
      status: customerData.status,
      source: customerData.source,
      employee_id: customerData.employeeId || null
    };
    const { data, error } = await supabaseClient.from('customers').update(dbData).eq('id', id).select().single();
  ```

---

#### Mục 2.4: Thêm mới API lấy và tạo ghi chú cho khách hàng
* **Vị trí:** Dòng 429 (hàm `getCustomerNotes` và `addCustomerNote`)
* **Code cũ:** (Không có)
* **Lý do:** Thêm tính năng lưu trữ ghi chú, phân loại theo tag và các nhân viên liên quan cho từng khách hàng.
* **Code mới:**
  ```javascript
  async getCustomerNotes(customerId) {
    const { data, error } = await supabaseClient.from('customer_notes').select('*').eq('customer_id', customerId).order('created_at', { ascending: false });
    if (error) { console.error("Lỗi lấy ghi chú:", error); return []; }
    return data.map(d => ({
      id: d.id,
      customerId: d.customer_id,
      content: d.content,
      tags: d.tags ? d.tags.split(',') : [],
      employees: d.employees ? d.employees.split(',') : [],
      isImportant: d.is_important,
      createdAt: d.created_at
    }));
  },

  async addCustomerNote(noteData) {
    const dbData = {
      customer_id: noteData.customerId,
      content: noteData.content,
      tags: noteData.tags ? noteData.tags.join(',') : null,
      employees: noteData.employees ? noteData.employees.join(',') : null,
      is_important: noteData.isImportant || false
    };
    const { data, error } = await supabaseClient.from('customer_notes').insert(dbData).select().single();
    if (error) throw error;
    return {
      id: data.id,
      customerId: data.customer_id,
      content: data.content,
      tags: data.tags ? data.tags.split(',') : [],
      employees: data.employees ? data.employees.split(',') : [],
      isImportant: data.is_important,
      createdAt: data.created_at
    };
  },
  ```

---

### File: `app/js/pages/customers.js`

#### Mục 2.5: Thêm cột Nhân viên chăm sóc vào tiêu đề bảng khách hàng
* **Vị trí:** Dòng 51 (hàm `_renderContent`)
* **Code cũ:**
  ```html
  <th>Khách hàng</th>
  <th>Công ty</th>
  <th>Email</th>
  <th>Số điện thoại</th>
  <th>Trạng thái</th>
  <th style="text-align:right;">Thao tác</th>
  ```
* **Lý do:** Thêm cột để hiển thị thông tin nhân sự chịu trách nhiệm chăm sóc khách hàng.
* **Code mới:**
  ```html
  <th>Khách hàng</th>
  <th>Công ty</th>
  <th>Email</th>
  <th>Số điện thoại</th>
  <th>Nhân viên chăm sóc</th>
  <th>Trạng thái</th>
  <th style="text-align:right;">Thao tác</th>
  ```

---

#### Mục 2.6: Render cột nhân viên chăm sóc khách hàng kèm avatar
* **Vị trí:** Dòng 133 (hàm `renderTable`)
* **Code cũ:**
  ```javascript
  <td>${cus.phone || '-'}</td>
  <td>${Components.createBadge(status.label, status.variant)}</td>
  ```
* **Lý do:** Hiển thị tên và initials avatar của nhân viên chăm sóc từ DB.
* **Code mới:**
  ```javascript
  <td>${cus.phone || '-'}</td>
  <td>
    ${cus.employeeName ? `
      <div class="employee-cell" style="gap:8px;">
        <div class="table-avatar" style="background:${Utils.getAvatarColor(cus.employeeName)}; width:24px; height:24px; font-size:10px; line-height:24px;">${Utils.getInitials(cus.employeeName)}</div>
        <div style="font-size:13px; font-weight:500;">${cus.employeeName}</div>
      </div>
    ` : '<span class="text-secondary">—</span>'}
  </td>
  <td>${Components.createBadge(status.label, status.variant)}</td>
  ```

---

#### Mục 2.7: Mở rộng modal và tích hợp thêm dropdown nhân viên chăm sóc cùng các tab chức năng bên dưới
* **Vị trí:** Dòng 153 (hàm `showModal`)
* **Code cũ:**
  ```javascript
  async showModal(id = null) {
    // ...
    Components.showModal({
      id: 'cusModal',
      title: id ? 'Sửa thông tin khách hàng' : 'Thêm khách hàng mới',
      content: content,
      size: 'md',
      footer: `...`
    });
  }
  ```
* **Lý do:** 
  1. Thêm dropdown chọn nhân viên chăm sóc khách hàng.
  2. Nâng kích cỡ modal lên `size: 'lg'`.
  3. Thêm phần tabs bên dưới (Ghi chú, Customer, Service Confirm, Quote, Order, Thay đổi gần đây) khi chỉnh sửa một khách hàng hiện tại.
* **Code mới:**
  ```javascript
  async showModal(id = null) {
    // ...
    // Thêm dropdown nhân viên chăm sóc vào content form
    // Thêm tabsHtml bên dưới nếu có id (sửa)
    Components.showModal({
      id: 'cusModal',
      title: id ? 'Sửa thông tin khách hàng' : 'Thêm khách hàng mới',
      content: content,
      size: 'lg',
      footer: `...`
    });
    if (id) {
      setTimeout(() => {
        window.Pages.Customers.switchTab('notes', id);
      }, 50);
    }
  }
  ```

---

#### Mục 2.8: Thêm các hàm xử lý tab và tính năng Nhật ký ghi chú khách hàng
* **Vị trí:** Dòng 286 (các hàm `switchTab` và render các tab)
* **Code cũ:**
  ```javascript
  async switchTab(tabName, customerId) { ... }
  async renderNotesTab(container, customerId) { ... }
  renderNotesList(notes) { ... }
  async saveNote(customerId) { ... }
  async filterNotes(customerId) { ... }
  renderContactsTab(container, customerId) { ... }
  renderServiceTab(container, customerId) { ... }
  renderQuoteTab(container, customerId) { ... }
  renderOrderTab(container, customerId) { ... }
  renderLogsTab(container, customerId) { ... }
  ```
* **Lý do:** Kích hoạt hoạt động thực tế cho các nút bấm: Thêm liên hệ, Lập xác nhận, Tạo báo giá, Tạo đơn hàng, Thêm đính kèm và Xóa ghi chú qua các form nhập liệu trực tuyến (inline forms) trực tiếp trên giao diện tab mà không làm đóng modal chính.
* **Code mới:**
  ```javascript
  async switchTab(tabName, customerId) { ... }
  async renderNotesTab(container, customerId) { ... }
  triggerFileSelect() { ... }
  handleFileSelect(e) { ... }
  clearFileSelect() { ... }
  downloadAttachment(fileName) { ... }
  renderNotesList(notes, customerId) { ... }
  async editNote(noteId, customerId) { ... }
  async updateNote(noteId, customerId) { ... }
  async deleteNote(noteId, customerId) { ... }
  async saveNote(customerId) { ... }
  async filterNotes(customerId) { ... }
  async renderContactsTab(container, customerId) { ... }
  toggleInlineForm(type) { ... }
  async editContact(contactId, customerId) { ... }
  async updateContact(contactId, customerId) { ... }
  async saveContact(customerId) { ... }
  async deleteContact(contactId, customerId) { ... }
  async renderServiceTab(container, customerId) { ... }
  async saveService(customerId) { ... }
  async renderQuoteTab(container, customerId) { ... }
  async saveQuote(customerId) { ... }
  async deleteQuote(quoteId, customerId) { ... }
  async renderOrderTab(container, customerId) { ... }
  async saveOrder(customerId) { ... }
  async deleteOrder(orderId, customerId) { ... }
  async renderLogsTab(container, customerId) { ... }
  ```

---

## 3. Phần bổ sung Giai đoạn 2 & Giai đoạn 3 (Nút Sửa, Xóa, Tải đính kèm & Logs tự động)

### File: `app/js/supabase-store.js`

#### Mục 3.1: Hàm cập nhật Ghi chú và Liên hệ khách hàng
* **Vị trí:** Dòng 518 và 545
* **Code cũ:** (Không có)
* **Lý do:** Cho phép lưu lại thông tin sau khi sửa ghi chú/liên hệ vào database Supabase.
* **Code mới:**
  ```javascript
  async updateCustomerNote(id, noteData) {
    const dbData = {
      content: noteData.content,
      tags: noteData.tags ? noteData.tags.join(',') : null,
      employees: noteData.employees ? noteData.employees.join(',') : null,
      is_important: noteData.isImportant || false,
      file_name: noteData.fileName || null
    };
    const { data, error } = await supabaseClient.from('customer_notes').update(dbData).eq('id', id).select().single();
    if (error) throw error;
    return { ...data, tags: data.tags ? data.tags.split(',') : [], employees: data.employees ? data.employees.split(',') : [] };
  },

  async updateCustomerContact(id, contactData) {
    const dbData = {
      name: contactData.name,
      position: contactData.position || null,
      email: contactData.email || null,
      phone: contactData.phone || null
    };
    const { data, error } = await supabaseClient.from('customer_contacts').update(dbData).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
  ```

---

#### Mục 3.2: Hàm xóa Báo giá, Đơn hàng và Lấy lịch sử thay đổi (Logs)
* **Vị trí:** Dòng 591, 610, 615
* **Code cũ:** (Không có)
* **Lý do:** Cho phép người dùng xóa các báo giá, đơn hàng và nạp lịch sử thay đổi tự động từ bảng `customer_logs`.
* **Code mới:**
  ```javascript
  async deleteCustomerQuote(id) {
    const { error } = await supabaseClient.from('customer_quotes').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  async deleteCustomerOrder(id) {
    const { error } = await supabaseClient.from('customer_orders').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  async getCustomerLogs(customerId) {
    const { data, error } = await supabaseClient.from('customer_logs').select('*').eq('customer_id', customerId).order('created_at', { ascending: false });
    if (error) { console.error(error); return []; }
    return data.map(d => ({ ...d, customerId: d.customer_id, createdAt: d.created_at }));
  }
  ```

---

### File: `app/js/pages/customers.js`

#### Mục 3.3: Hàm tải xuống tệp đính kèm mô phỏng
* **Vị trí:** Dòng 398 (hàm `downloadAttachment`)
* **Code cũ:** (Không có)
* **Lý do:** Kích hoạt trình duyệt tự động tải xuống tệp tin ảo khi nhấn vào tên file đính kèm trên ghi chú.
* **Code mới:**
  ```javascript
  downloadAttachment(fileName) {
    const blob = new Blob(["Nội dung tệp đính kèm mô phỏng cho: " + fileName], { type: "application/octet-stream" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    Components.showToast('Đang tải xuống tệp: ' + fileName, 'success');
  }
  ```

---

#### Mục 3.4: Hàm Sửa Ghi chú và Liên hệ khách hàng trên UI
* **Vị trí:** Dòng 436 và 553
* **Code cũ:** (Không có)
* **Lý do:** Điền thông tin cũ vào form nhập trực tuyến và thay đổi nút hành động thành "Cập nhật".
* **Code mới:**
  ```javascript
  async editNote(noteId, customerId) {
    // điền nội dung vào form noteContent, noteTags, noteEmployees, noteImportant, attachmentNameContainer...
    // đổi saveNoteBtn thành onclick="window.Pages.Customers.updateNote(...)"
  },
  async editContact(contactId, customerId) {
    // hiển thị contactInlineForm
    // điền nội dung vào addContactName, addContactPosition, addContactEmail, addContactPhone...
    // đổi saveContactBtn thành onclick="window.Pages.Customers.updateContact(...)"
  }
  ```

---

#### Mục 3.5: Cập nhật cột Thao tác có nút Xóa ở tab Báo giá và Đơn hàng
* **Vị trí:** Dòng 746 và 846 (trong HTML bảng của `renderQuoteTab` và `renderOrderTab`)
* **Code cũ:**
  ```html
  <!-- Chỉ có tiêu đề và dữ liệu báo giá/đơn hàng, không có cột Thao tác -->
  ```
* **Lý do:** Cho phép xóa các báo giá, đơn hàng.
* **Code mới:**
  ```html
  <th>Thao tác</th>
  <!-- ... -->
  <td>
    <button type="button" class="btn btn-ghost btn-sm" style="color:var(--color-danger);" onclick="window.Pages.Customers.deleteQuote('${q.id}', '${customerId}')">Xóa</button>
  </td>
  ```

---

## 4. Phần bổ sung Giai đoạn 4 (Đồng nhất Trạng thái Khách hàng & Cơ hội/Deals)

### File: `app/js/pages/customers.js`

#### Mục 4.1: Cập nhật Trạng thái Khách hàng gồm 6 bước
* **Vị trí:** Dòng 109 (`statusMap` trong `renderTable`) và Dòng 188 (ô select chọn trạng thái)
* **Code cũ:**
  ```javascript
  // Chỉ gồm Lead mới, Tiềm năng, Khách hàng, Ngừng giao dịch
  ```
* **Lý do:** Đồng bộ hoá các bước trạng thái chăm sóc khách hàng theo quy trình chuẩn.
* **Code mới:**
  ```javascript
  // Bổ sung: Lead / Mới, Tiềm năng, Báo giá, Đàm phán, Thành công (Won), Thất bại (Lost)
  ```

---

### File: `app/js/pages/deals.js`

#### Mục 4.2: Đổi tên cột "Đã đánh giá" thành "Tiềm năng" trong Pipeline
* **Vị trí:** Dòng 66, 128, 216
* **Code cũ:**
  ```javascript
  // Hiển thị tên cột: 'Đã đánh giá', 'Đánh giá'
  ```
* **Lý do:** Thống nhất danh xưng các giai đoạn cơ hội bán hàng.
* **Code mới:**
  ```javascript
  // Thay thế bằng: 'Tiềm năng'
  ```

---

### File: `app/js/pages/dashboard.js` & `app/js/pages/reports.js`

#### Mục 4.3: Đồng bộ nhãn giai đoạn "Tiềm năng" trên biểu đồ
* **Vị trí:** Dòng 199 (`dashboard.js`) và Dòng 107 (`reports.js`)
* **Code cũ:**
  ```javascript
  // Hiển thị nhãn biểu đồ: 'Qualified'
  ```
* **Lý do:** Đồng bộ hiển thị báo cáo.
* **Code mới:**
  ```javascript
  // Thay thế bằng: 'Tiềm năng'
  ```

---

## 5. Phần bổ sung Giai đoạn 5 (Cấu trúc Lương KPI & Công thức tính lương mới)

### File: SQL CSDL
* **Vị trí:** Chạy trực tiếp trong SQL Editor
* **Nội dung:**
  ```sql
  ALTER TABLE employees ADD COLUMN IF NOT EXISTS kpi_salary NUMERIC DEFAULT 0;
  ALTER TABLE payroll ADD COLUMN IF NOT EXISTS kpi_salary NUMERIC DEFAULT 0;
  -- Cập nhật Lương Cơ Bản tối đa 10 triệu và Lương KPI từ 3-7 lần cho nhân viên
  UPDATE employees SET base_salary = 10000000, kpi_salary = 30000000 WHERE name = 'Trần Thị Bình';
  UPDATE employees SET base_salary = 10000000, kpi_salary = 30000000 WHERE name = 'Lê Hoàng Cường';
  UPDATE employees SET base_salary = 10000000, kpi_salary = 40000000 WHERE name = 'Phạm Thu Dung';
  UPDATE employees SET base_salary = 10000000, kpi_salary = 50000000 WHERE name = 'Vũ Minh Đức';
  UPDATE employees SET base_salary = 10000000, kpi_salary = 60000000 WHERE name = 'Hoàng Thị Em';
  UPDATE employees SET base_salary = 10000000, kpi_salary = 70000000 WHERE name = 'Đỗ Quang Huy';
  UPDATE employees SET base_salary = 5000000, kpi_salary = 15000000 WHERE name = 'Bùi Thị Giang';
  UPDATE employees SET base_salary = 6000000, kpi_salary = 18000000 WHERE name = 'Ngô Văn Hùng';
  UPDATE employees SET base_salary = 7000000, kpi_salary = 21000000 WHERE name = 'Đặng Thu Hà';
  UPDATE employees SET base_salary = 8000000, kpi_salary = 25000000 WHERE name = 'Phan Văn Khoa';
  UPDATE employees SET base_salary = 5000000, kpi_salary = 14000000 WHERE name = 'Lý Thị Lan';
  UPDATE employees SET base_salary = 7000000, kpi_salary = 20000000 WHERE name = 'Trịnh Văn Minh';
  UPDATE employees SET base_salary = 10000000, kpi_salary = 60000000 WHERE name = 'Nguyễn Văn An';
  UPDATE employees SET base_salary = 50000000, kpi_salary = 0 WHERE name = 'Giám đốc Lan';
  ```

---

### File: `app/js/supabase-store.js`

#### Mục 5.1: Đồng bộ kpi_salary trong các hàm API của Store
* **Vị trí:** `getEmployees`, `getEmployee`, `addEmployee`, `updateEmployee`, `getPayrollByMonth`, `generatePayroll`
* **Lý do:** Lưu trữ, nạp thông tin KPI từ database và tính toán lương theo công thức mới:
  * Thuế TNCN = `( lương cơ bản + lương kpi + Phụ cấp ) * 10%`
  * Bảo hiểm = `(8% + 1.5% + 1%) * lương cơ bản` (tức 10.5%)
  * Thực nhận = `lương cơ bản + lương kpi + phụ cấp - bảo hiểm - thuế TNCN`

---

### File: `app/js/pages/employees.js`

#### Mục 5.2: Thêm cột và ràng buộc Lương cơ bản & Lương KPI trên UI nhân sự
* **Vị trí:** Bảng danh sách nhân viên và Modal thêm/sửa
* **Lý do:**
  * Hiển thị thêm cột "Lương KPI".
  * Ràng buộc Lương cơ bản không quá 10,000,000 VNĐ (trừ Giám đốc).
  * Ràng buộc Lương KPI phải từ 3 đến 7 lần Lương cơ bản (riêng Giám đốc KPI = 0).

---

### File: `app/js/pages/payroll.js`

#### Mục 5.3: Thêm cột Lương KPI trong Phiếu lương & Xuất Excel
* **Vị trí:** Bảng lương, Modal chi tiết và hàm xuất Excel
* **Lý do:** Hiển thị chi tiết lương KPI, công thức bảo hiểm và thực nhận đồng bộ với Store.

---

### File: `app/js/pages/employees.js` (Cải tiến & Hiệu chỉnh)

#### Mục 5.4: Sửa nhãn hiển thị thành "KPI", hiển thị "None" cho Giám đốc và cập nhật Excel
* **Vị trí:** Dòng 69 (nhãn cột bảng), Dòng 138-163 (hiển thị 'None' nếu là Giám đốc), Dòng 343-355 (Xuất Excel có thêm cột KPI)
* **Lý do:** Đơn giản hóa tên cột, xử lý hiển thị trực quan cho Giám đốc không có KPI và sửa lỗi thiếu cột KPI khi xuất dữ liệu ra Excel.

---

## 6. Phần bổ sung Giai đoạn 6 (Đồng bộ Lương cơ bản & Biến động KPI chi tiết)

### File: `app/js/supabase-store.js`

#### Mục 6.1: Tự động đồng bộ và nạp lại bảng lương
* **Vị trí:** Dòng 333 (trong hàm `generatePayroll`)
* **Lý do:** Khi nhấn "Tính lương", hệ thống sẽ xóa các bản ghi lương cũ của tháng đó để tính toán và lưu trữ lại từ đầu. Việc này giúp tự động đồng bộ bất cứ thay đổi nào về Lương cơ bản hay KPI của nhân viên từ mục Nhân sự sang mục Bảng lương.

#### Mục 6.2: Quy tắc biến động KPI theo hiệu suất thực tế của nhân viên
* **Vị trí:** Dòng 345 (trong hàm `generatePayroll`)
* **Lý do:** Tạo dữ liệu thực tế và biến động KPI theo đúng yêu cầu:
  * **Vượt KPI vượt trội (hơn 10-20tr)**: Vũ Minh Đức (+15 triệu).
  * **Vượt KPI (hơn 5-10tr)**: Phạm Thu Dung (+7 triệu), Hoàng Thị Em (+8 triệu), Đỗ Quang Huy (+6 triệu).
  * **Không đạt KPI (hụt tầm 4-5tr)**: Trần Thị Bình (-4.5 triệu), Lê Hoàng Cường (-4 triệu), Nguyễn Văn An (-5 triệu).

---

## 7. Phần bổ sung Giai đoạn 7 (Tái cấu trúc Chi tiết Deal & Pipeline Stage Tabs)

### File: SQL CSDL
* **Vị trí:** Chạy trực tiếp trong SQL Editor
* **Nội dung:**
  ```sql
  ALTER TABLE deals 
    ADD COLUMN IF NOT EXISTS lead_reason TEXT,
    ADD COLUMN IF NOT EXISTS referrer_employee_id UUID,
    ADD COLUMN IF NOT EXISTS interested_product TEXT,
    ADD COLUMN IF NOT EXISTS consultant_employee_id UUID,
    ADD COLUMN IF NOT EXISTS expected_price NUMERIC,
    ADD COLUMN IF NOT EXISTS negotiate_content TEXT,
    ADD COLUMN IF NOT EXISTS negotiate_price NUMERIC,
    ADD COLUMN IF NOT EXISTS negotiator_employee_id UUID,
    ADD COLUMN IF NOT EXISTS success_reason TEXT,
    ADD COLUMN IF NOT EXISTS final_deal_price NUMERIC,
    ADD COLUMN IF NOT EXISTS last_stage_before_won TEXT,
    ADD COLUMN IF NOT EXISTS contributor_employee_ids TEXT[],
    ADD COLUMN IF NOT EXISTS lost_reason TEXT,
    ADD COLUMN IF NOT EXISTS last_stage_before_lost TEXT;
  ```

---

### File: `app/js/supabase-store.js`

#### Mục 7.1: Đồng bộ các trường mới của Deal trong các hàm API
* **Vị trí:** `getDeals`, `getDeal`, `addDeal`, `updateDeal`
* **Lý do:** Cho phép lấy, lưu và cập nhật các trường chi tiết theo giai đoạn (lý do biết đến, giá chốt, người tư vấn, người giới thiệu, v.v.).

---

### File: `app/js/pages/deals.js`

#### Mục 7.2: Loại bỏ giá trị dự kiến tĩnh, xây dựng Pipeline Strip và Form động
* **Vị trí:** Modal chi tiết Deal (`showModal`), hàm lưu dữ liệu (`saveDeal`)
* **Lý do:** 
  * Xóa bỏ ô nhập "Giá trị dự kiến" ở đầu form.
  * Tích hợp dãy tab Pipeline tương tác và tự động đổi màu (Đã qua: xanh nhẹ, Thành công: xanh lá, Thất bại: đỏ kèm ô dừng cuối).
  * Hiển thị bảng điền thông tin chi tiết riêng biệt của từng tab.
  * Tự động thu thập giá trị (Expected Price / Negotiate Price / Final Price) để tính toán thành trường `value` của Deal, đảm bảo báo cáo biểu đồ doanh thu không bị ảnh hưởng.

---

## 8. Phần bổ sung Giai đoạn 8 (Tự động hóa số liệu Tương tác bằng cách quét từ khóa Ghi chú)

### File: `app/js/supabase-store.js`

#### Mục 8.1: Thêm API lấy toàn bộ Ghi chú khách hàng
* **Vị trí:** Dòng 865-873 (cuối file)
* **Lý do:** Thêm hàm `getAllCustomerNotes` để truy vấn toàn bộ dữ liệu nội dung ghi chú từ bảng `customer_notes` trên Supabase.

---

### File: `app/js/pages/reports.js`

#### Mục 8.2: Phân tích nội dung ghi chú để trích xuất số lượng SMS và Cuộc gọi động
* **Vị trí:** Hàm nạp dữ liệu (`mount`) và giao diện hiển thị (`_renderRevenueContent`)
* **Lý do:** 
  * Thay vì hardcode hoặc chia tỷ lệ cố định, hệ thống sẽ tự động quét nội dung từng ghi chú.
  * Nếu nội dung có chứa từ khóa liên quan đến tin nhắn ("sms", "tin nhắn", "nhắn tin"), chỉ số **SMS** sẽ tự động tăng lên 1.
  * Nếu nội dung có chứa từ khóa liên quan đến gọi điện ("gọi", "call", "cuộc gọi", "điện thoại"), chỉ số **Cuộc gọi** sẽ tự động tăng lên 1.
  * Điều này giúp số liệu báo cáo chuyển đổi phản ánh chính xác 100% nhật ký hành vi chăm sóc khách hàng của nhân viên.

---

## 9. Phần bổ sung Giai đoạn 9 (Hiển thị số liệu trực tiếp trên các Biểu đồ)

### File: `app/js/pages/reports.js` & `app/js/pages/dashboard.js`

#### Mục 9.1: Tích hợp nhãn số liệu và phần trăm trực tiếp vào biểu đồ
* **Vị trí:** 
  * `reports.js` (Hàm `initRevenueCharts` & `initHRCharts`)
  * `dashboard.js` (Hàm `mount` cho biểu đồ `chartEmployeeDept` & `chartDealStatus`)
* **Lý do:** 
  * Giúp người quản trị dễ dàng quan sát số lượng và phần trăm ngay tại danh sách chú thích (Legend/Labels) của biểu đồ mà không cần phải rê chuột (hover) vào từng vùng cột hay hình tròn.
  * **Biểu đồ đã nâng cấp**:
    1. Doanh thu dự kiến theo trạng thái (Deals) - hiển thị số tiền VNĐ.
    2. Tỷ lệ nhân sự theo phòng ban - hiển thị số nhân viên (NV) và tỷ lệ %.
    3. Hiệu quả lao động OLE - hiển thị tỷ lệ hiệu quả %.
    4. Nhân viên theo phòng ban - hiển thị số nhân viên và %.
    5. Cơ hội theo giai đoạn - hiển thị số cơ hội và %.
    6. Khách hàng theo nguồn - hiển thị số khách hàng (KH) và %.

---

## 10. Phần bổ sung Giai đoạn 10 (Nâng cấp Vẽ Canvas Chart - Nhãn Số liệu và Phần trăm)

### File: `app/js/charts.js`

#### Mục 10.1: Vẽ giá trị trên cột Bar Chart và Tỷ lệ phần trăm trong Doughnut Slices
* **Vị trí:** Hàm `bar` và hàm `doughnut` của đối tượng `Charts`
* **Lý do:**
  * **Biểu đồ Cột (Bar Chart)**: Tự động vẽ giá trị trực tiếp lên phía trên mỗi cột (sử dụng định dạng rút gọn `B` cho tỷ, `M` cho triệu hoặc `%` cho tỷ lệ OLE) để người dùng nắm bắt tức thì thông tin trực quan. Tăng giới hạn cắt ngắn nhãn trục x từ 10 lên 25 ký tự để tránh bị mất chữ.
  * **Biểu đồ Tròn (Doughnut Chart)**: Tự động tính toán góc vẽ và tọa độ để ghi trực tiếp phần trăm (`%`) vào bên trong từng phân khúc màu (slice) của biểu đồ tròn (chỉ hiển thị với các phần có tỷ lệ từ 5% trở lên để tránh chồng chéo chữ).

---

## 11. Phần bổ sung Giai đoạn 11 (Tối ưu hóa hiển thị nhãn trục X và Khắc phục định dạng %)

### File: `app/js/charts.js` & `app/js/pages/dashboard.js` & `app/js/pages/reports.js`

#### Mục 11.1: Khắc phục lỗi định dạng % nhầm lẫn và chống tràn chữ trục X
* **Vị trí:** 
  * `charts.js` (Hàm `bar` của đối tượng `Charts`)
  * `dashboard.js` (`chartEmployeeDept` label config)
  * `reports.js` (`chartDealRevenue` label config)
* **Lý do:**
  * **Sửa lỗi định dạng % nhầm lẫn**: Trước đó, các cột số lượng (như số nhân viên: `3`) có giá trị dưới 100 bị định dạng nhầm thành phần trăm (`3%`). Đã cấu hình thêm thuộc tính `isPercentage` kiểm tra nhãn dữ liệu để chỉ hiển thị ký tự `%` cho biểu đồ phần trăm thực tế (như OLE).
  * **Chống đè chữ trục X**: Khôi phục nhãn ngắn gọn của trục X (tên phòng ban, tên trạng thái) để tránh tình trạng chữ quá dài chạy chồng chéo đè lên nhau, trong khi các số liệu chi tiết vẫn được hiển thị rõ ràng ngay phía trên đầu mỗi cột.

---

## 12. Phần bổ sung Giai đoạn 12 (Tối ưu hóa màu sắc nhãn Bar và Loại bỏ số liệu thừa ở trục hoành)

### File: `app/js/charts.js` & `app/js/pages/reports.js`

#### Mục 12.1: Đồng bộ màu sắc nhãn và làm sạch chú thích trục hoành
* **Vị trí:**
  * `charts.js` (Hàm `bar` của đối tượng `Charts`)
  * `reports.js` (`chartOLEPerformance` label config)
* **Lý do:**
  * **Đồng bộ màu nhãn cột**: Cải thiện độ tương phản bằng cách sử dụng chính màu sắc của cột để vẽ chữ số liệu trên đầu cột (tăng kích thước font lên `bold 11px Inter`), giúp dễ nhìn thấy rõ ràng trên nền sáng.
  * **Làm sạch trục hoành**: Loại bỏ các con số phần trăm cứng nhắc khỏi danh sách nhãn trục hoành của biểu đồ OLE trong `reports.js`, trả lại giao diện gọn gàng, trực quan.

---

## 13. Phần bổ sung Giai đoạn 13 (Tối ưu hóa nhãn trục hoành Doanh thu Deal)

### File: `app/js/pages/reports.js`

#### Mục 13.1: Xóa hậu tố (Won) và (Lost) để chống đè chữ trục X
* **Vị trí:** `reports.js` (`chartDealRevenue` stageLabelsMap config)
* **Lý do:** Rút ngắn hai nhãn trạng thái từ `Thành công (Won)` thành `Thành công` và từ `Thất bại (Lost)` thành `Thất bại`, triệt tiêu hoàn toàn hiện tượng tràn văn bản chồng lấn nhau ở hai cột cuối của biểu đồ doanh thu.

---

## 14. Phần bổ sung Giai đoạn 14 (Vẽ Tên thành phần trực tiếp lên Doughnut Chart Slices)

### File: `app/js/charts.js`

#### Mục 14.1: Vẽ Tên thành phần và phần trăm trực tiếp trong lát cắt Doughnut
* **Vị trí:** `charts.js` (Hàm `doughnut` của đối tượng `Charts`)
* **Lý do:** Cho phép hiển thị trực tiếp cả Tên thành phần (ví dụ: `Marketing`, `Nhân sự`, `Lead`, `Tiềm năng`...) và tỷ lệ phần trăm (`%`) của chúng ngay trên các lát cắt của biểu đồ tròn (chỉ áp dụng đối với lát cắt có tỷ lệ từ 12% trở lên để đảm bảo tính mỹ thuật và khoảng trống hiển thị).

---

## 15. Phần bổ sung Giai đoạn 15 (Cập nhật Ràng buộc Khóa ngoại ON DELETE CASCADE / SET NULL cho Nhân sự)

### File: SQL CSDL
* **Vị trí:** Chạy trực tiếp trong SQL Editor
* **Nội dung:**
  ```sql
  -- Chấm công: tự động xóa khi nhân viên bị xóa
  ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_employee_id_fkey;
  ALTER TABLE attendance 
    ADD CONSTRAINT attendance_employee_id_fkey 
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;

  -- Bảng lương: tự động xóa khi nhân viên bị xóa
  ALTER TABLE payroll DROP CONSTRAINT IF EXISTS payroll_employee_id_fkey;
  ALTER TABLE payroll 
    ADD CONSTRAINT payroll_employee_id_fkey 
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;

  -- Phòng ban: đặt manager_id thành NULL khi nhân viên quản lý bị xóa
  ALTER TABLE departments DROP CONSTRAINT IF EXISTS departments_manager_fk;
  ALTER TABLE departments DROP CONSTRAINT IF EXISTS departments_manager_id_fkey;
  ALTER TABLE departments 
    ADD CONSTRAINT departments_manager_fk 
    FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL;

  -- Cơ hội (Deals): đặt các nhân viên liên quan thành NULL khi họ bị xóa khỏi công ty
  ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_referrer_employee_id_fkey;
  ALTER TABLE deals 
    ADD CONSTRAINT deals_referrer_employee_id_fkey 
    FOREIGN KEY (referrer_employee_id) REFERENCES employees(id) ON DELETE SET NULL;

  ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_consultant_employee_id_fkey;
  ALTER TABLE deals 
    ADD CONSTRAINT deals_consultant_employee_id_fkey 
    FOREIGN KEY (consultant_employee_id) REFERENCES employees(id) ON DELETE SET NULL;

  ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_negotiator_employee_id_fkey;
  ALTER TABLE deals 
    ADD CONSTRAINT deals_negotiator_employee_id_fkey 
    FOREIGN KEY (negotiator_employee_id) REFERENCES employees(id) ON DELETE SET NULL;
  ```
* **Lý do:** Khắc phục lỗi vi phạm ràng buộc khóa ngoại (foreign key constraint violation) khiến người dùng không thể xóa nhân viên nếu họ đã có lịch sử chấm công (`attendance`), bảng lương (`payroll`), đang làm quản lý bộ phận (`departments`), hoặc đang tham gia các deal trong CRM (`deals`).

---

## 16. Phần bổ sung Giai đoạn 16 (Đổi màu text chú thích biểu đồ tròn sang màu đen)

### File: `app/js/charts.js`

#### Mục 16.1: Thay đổi mã màu text chú thích (Legend Labels & Subtext) trong Canvas Doughnut Chart
* **Vị trí:** `charts.js` (Hàm `doughnut` của đối tượng `Charts`)
* **Lý do:** Đổi mã màu hiển thị nhãn chú thích bên phải của biểu đồ tròn (gồm: Cơ hội theo giai đoạn, Khách hàng theo nguồn, Tỷ lệ nhân sự theo phòng ban) từ màu trắng `#f1f5f9` và xám nhạt `#94a3b8` sang màu đen đậm `#000000` (subtext `#4b5563`) để tăng độ tương phản rõ rệt, giúp dễ đọc trên nền sáng.

---

## 17. Phần bổ sung Giai đoạn 17 (Chuyển màu chữ bên trong lát cắt Doughnut Chart sang màu đen)

### File: `app/js/charts.js`

#### Mục 17.1: Thay đổi mã màu text nhãn nội bộ (Inner Slice Labels) thành màu đen
* **Vị trí:** `charts.js` (Hàm `doughnut` của đối tượng `Charts`, phần vẽ chữ nhãn bên trong lát cắt)
* **Lý do:** Chuyển đổi mã màu vẽ nhãn chữ (như `Thất bại 17%`, `Lead 17%`...) bên trong các phân khúc tròn (Doughnut slices) từ màu trắng `#ffffff` sang màu đen `#000000` để đáp ứng chuẩn xác mong muốn hiển thị màu đen của người dùng.

---

## 18. Phần bổ sung Giai đoạn 18 (Cải thiện độ tương phản và độ mềm mại của nhãn biểu đồ tròn)

### File: `app/js/charts.js`

#### Mục 18.1: Chuyển đổi màu chữ nội bộ từ đen đậm sang xám Slate-800
* **Vị trí:** `charts.js` (Hàm `doughnut` của đối tượng `Charts`, phần vẽ chữ nhãn bên trong lát cắt)
* **Lý do:** Màu đen đậm `#000000` trước đó gây tương phản quá mạnh và hơi thô trên các lát cắt sáng màu (như xanh ngọc, tím pastel). Chuyển sang màu xám đen Slate-800 (`#1e293b`) giúp nhãn hiển thị mềm mại, chuyên nghiệp, giữ được độ sắc nét và rõ ràng vượt trội so với màu trắng cũ mà không gây khó chịu cho mắt.

---

## 19. Phần bổ sung Giai đoạn 19 (Thiết kế đường chỉ dẫn Leader Lines cho Doughnut Chart)

### File: `app/js/charts.js`

#### Mục 19.1: Vẽ đường chỉ dẫn bẻ góc (Leader Lines) ra ngoài hai bên biểu đồ
* **Vị trí:** `charts.js` (Hàm `doughnut` của đối tượng `Charts`)
* **Lý do:** 
  * Căn giữa biểu đồ tròn (`cx = w / 2`), loại bỏ chú thích dạng danh sách bên phải.
  * Tự động tính toán góc trung vị của từng lát cắt để vẽ một đường chỉ dẫn (`Leader Line`) mảnh đi chéo ra ngoài, bẻ góc nằm ngang hướng về hai bên trái/phải.
  * Vẽ nhãn văn bản ở đầu đường chỉ dẫn (Dòng 1: Tên thành phần màu xám Slate-800 `#1e293b`; Dòng 2: Giá trị và tỷ lệ phần trăm màu Slate-500 `#64748b`), giúp biểu đồ trông cân đối, chuyên nghiệp và cực kỳ trực quan mà không bị chồng chéo chữ.

---

## 20. Phần bổ sung Giai đoạn 20 (Hiệu ứng chuyển động động vẽ đường chỉ dẫn và Fade-in nhãn)

### File: `app/js/charts.js`

#### Mục 20.1: Phân rã tiến trình vẽ đường chỉ dẫn và làm mờ dần nhãn chữ
* **Vị trí:** `charts.js` (Hàm `doughnut` của đối tượng `Charts`)
* **Lý do:**
  * Đồng bộ chuyển động mượt mà với hoạt ảnh quay tròn của Doughnut Chart.
  * Khi tiến trình đạt `0.6` đến `1.0`: Đầu tiên vẽ nét chéo từ lát cắt ra ngoài (trong 50% tiến trình đầu), sau đó vẽ tiếp nét ngang (trong 50% tiến trình tiếp theo).
  * Cuối cùng, nhãn văn bản ở đầu dòng sẽ tự động xuất hiện với hiệu ứng mờ dần (`globalAlpha` tăng từ `0` lên `1` ở 20% tiến trình cuối), giúp trải nghiệm trực quan hóa dữ liệu trở nên cực kỳ sinh động, tinh tế và cao cấp.

---

## 21. Phần bổ sung Giai đoạn 21 (Nâng cấp phối màu Gradient 3D cho Doughnut Slices)

### File: `app/js/charts.js`

#### Mục 21.1: Tích hợp Linear Gradient dọc theo bán kính từng lát cắt
* **Vị trí:** `charts.js` (Hàm `doughnut` của đối tượng `Charts`, phần vẽ vòng tròn)
* **Lý do:** 
  * Định nghĩa thêm các hàm tiện ích nội bộ `_hexToRgb`, `_rgbToHex`, và `_adjustColor` để biến đổi độ sáng của mã màu hex bất kỳ.
  * Với mỗi lát cắt, tự động thiết lập dải màu `CanvasGradient` đi từ rìa trong ra rìa ngoài (`LinearGradient` dọc theo góc trung vị từ `innerRadius` đến `radius`).
  * Đầu trong dải màu được tăng 28% độ sáng (`_adjustColor(baseColor, 0.28)`), đầu ngoài dải màu được làm đậm 18% (`_adjustColor(baseColor, -0.18)`), tạo ra hiệu ứng 3D khối bóng mượt, hiện đại và sang trọng, vượt trội hơn hẳn so với phong cách tô màu phẳng (flat color) đơn điệu cũ.

---

## 22. Phần bổ sung Giai đoạn 22 (Định nghĩa class tiện ích p-6 giải quyết lỗi đè chữ xem lịch)

### File: `app/css/base.css`

#### Mục 22.1: Bổ sung lớp tiện ích .p-6 thiết lập padding cho các Card chứa Select Option
* **Vị trí:** `base.css` (Dòng 91)
* **Lý do:** Khắc phục lỗi hiển thị nhãn chữ `"Chọn nhân viên xem lịch"` bị chạm/đè lên đường viền trên của thẻ card (do thẻ sử dụng class `.p-6` nhưng class này chưa hề được định nghĩa trong hệ thống CSS). Thiết lập `.p-6 { padding: var(--space-6) !important; }` để tạo khoảng đệm trong 24px hợp lý cho toàn bộ các Card sử dụng lớp này, trả lại giao diện cân đối, thoáng đãng.

---

## 23. Phần bổ sung Giai đoạn 23 (Tích hợp trường Nguồn khách cho Deal và Cập nhật Biểu đồ Nguồn khách hàng)

### File: CSDL & `app/js/supabase-store.js` & `app/js/pages/deals.js` & `app/js/pages/reports.js`

#### Mục 23.1: Chạy lệnh SQL bổ sung cột CSDL
* **Vị trí:** Chạy trong SQL Editor của Supabase
* **Lệnh:**
  ```sql
  ALTER TABLE deals ADD COLUMN IF NOT EXISTS lead_source TEXT;
  ```

#### Mục 23.2: Cập nhật code thu thập trường nguồn khách và vẽ biểu đồ từ Deal
* **Vị trí:**
  * `supabase-store.js` (`getDeals`, `getDeal`, `addDeal`, `updateDeal`): Truy vấn và lưu thuộc tính `lead_source` của bảng `deals`.
  * `deals.js`: Thêm thẻ `<select id="dealLeadSource">` chứa 5 nguồn chính dưới ô `"Lý do biết đến công ty"` trong tab Lead/Mới, đồng thời thu thập lưu trữ giá trị này khi lưu deal.
  * `reports.js`: Sửa đổi logic tính toán của biểu đồ **Khách hàng theo nguồn** (`chartCustomerSource`), chuyển từ việc đếm từ bảng `customers` sang đếm trực tiếp thuộc tính `leadSource` từ danh sách `deals`.

---

## 24. Phần bổ sung Giai đoạn 24 (Lược bỏ viền màu thẻ Tỷ lệ chuyển đổi và Thay đổi bảng màu Nguồn khách)

### File: `app/js/pages/reports.js`

#### Mục 24.1: Xóa bỏ border-left của 4 card Tỷ lệ chuyển đổi
* **Vị trí:** `reports.js` (Hàm `_renderRevenueTab` của đối tượng `Reports`)
* **Lý do:** Loại bỏ các thanh viền màu dọc (`border-left`) ở lề trái của 4 thẻ thống kê trên cùng (Khách hàng mới, Tương tác, Đơn hàng, Doanh số) theo đúng yêu cầu thiết kế tối giản của người dùng.

#### Mục 24.2: Đồng bộ bảng màu xanh lá/teal cho biểu đồ Khách hàng theo nguồn
* **Vị trí:** `reports.js` (Hàm `initRevenueCharts` của đối tượng `Reports`)
* **Lý do:** Thay đổi mã màu của Nền tảng Zalo (từ vàng `#fbbf24` sang xanh mint `#34d399`) và Mạng xã hội (từ hồng `#ec4899` sang xanh teal `#14b8a6`) để biểu đồ tổng thể có sự hòa hợp tuyệt đối với gam màu xanh lá chủ đạo (`#10b981` / `#059669`) của ứng dụng BizCore.

---

## 25. Phần bổ sung Giai đoạn 25 (Đồng bộ màu sắc Xanh Kinh Doanh cho Biểu đồ OLE và Chấm Công)

### File: `app/js/pages/reports.js`

#### Mục 25.1: Cập nhật màu sắc cột OLE và đường nét Chấm công sang màu xanh lá Kinh doanh
* **Vị trí:** `reports.js` (Hàm `initHRCharts` của đối tượng `Reports`)
* **Lý do:**
  * Đồng bộ hóa màu sắc biểu diễn của biểu đồ **Hiệu quả lao động tổng thể (OLE) theo bộ phận** và biểu đồ **Thống kê Chấm công 7 ngày qua** (đường "Đi làm đúng giờ") sang tông màu xanh lá mạ / xanh ngọc của Kinh doanh (`#6ee7b7`), thay thế cho màu xanh dương đậm `#6366f1` cũ.
  * Sửa tham số truyền vào của biểu đồ line `chartAttendanceTrend` từ `borderColor` (sai tham số dẫn tới fallback màu mặc định) thành `color: '#6ee7b7'` để hiển thị chính xác màu xanh lá mạ Kinh doanh.

---

## 26. Phần bổ sung Giai đoạn 26 (Khắc phục thuộc tính màu OLE Bar Chart)

### File: `app/js/pages/reports.js`

#### Mục 26.1: Thay đổi thuộc tính màu OLE từ backgroundColor sang color để Canvas nhận diện
* **Vị trí:** `reports.js` (Hàm `initHRCharts` của đối tượng `Reports`, phần khai báo `chartOLEPerformance`)
* **Lý do:** Thư viện Canvas tự phát triển (`charts.js`) chỉ nhận diện thuộc tính `color` cho đối tượng dataset của Bar Chart thay vì `backgroundColor`. Lỗi này khiến màu xanh lá mạ Kinh doanh `#6ee7b7` bị bỏ qua và biểu đồ tự động fallback về màu tím mặc định. Đã chuyển đổi chính xác sang `color: '#6ee7b7'`.

---

## 27. Phần bổ sung Giai đoạn 27 (Đổi màu biểu đồ Doanh thu dự kiến và Nhân viên theo bộ phận sang màu xanh Mạng xã hội)

### File: `app/js/pages/reports.js` & `app/js/pages/dashboard.js`

#### Mục 27.1: Chuyển màu cột biểu đồ Doanh thu dự kiến và Nhân viên theo phòng ban sang xanh ngọc Teal
* **Vị trí:**
  * `reports.js` (Hàm `initRevenueCharts` của đối tượng `Reports`, phần khai báo `chartDealRevenue`)
  * `dashboard.js` (Hàm `mount` của đối tượng `Dashboard`, phần khai báo `chartEmployeeDept`)
* **Lý do:** Đồng bộ hóa hai biểu đồ cột này sang màu **xanh ngọc Teal (`#14b8a6`)** - là màu xanh của nguồn khách hàng *Mạng xã hội* mà người dùng mong muốn, thay thế cho dải màu đa sắc lộn xộn cũ.

---

## 28. Phần bổ sung Giai đoạn 28 (Đổi màu OLE Performance sang xanh ngọc Mạng xã hội)

### File: `app/js/pages/reports.js`

#### Mục 28.1: Thiết lập màu cột OLE sang màu xanh ngọc Teal của Mạng xã hội
* **Vị trí:** `reports.js` (Hàm `initHRCharts` của đối tượng `Reports`, phần khai báo `chartOLEPerformance`)
* **Lý do:** Đồng bộ hóa màu sắc cột của biểu đồ **Hiệu quả lao động tổng thể (OLE) theo bộ phận** sang màu **xanh ngọc Teal (`#14b8a6`)** - màu xanh của nguồn khách hàng *Mạng xã hội* theo đúng danh sách yêu cầu mới từ người dùng.

---

## 29. Phần bổ sung Giai đoạn 29 (Đồng bộ màu biểu đồ Tỷ lệ nhân sự theo phòng ban với Khách hàng theo nguồn)

### File: `app/js/pages/reports.js`

#### Mục 29.1: Cập nhật màu sắc doughnut chart Tỷ lệ nhân sự sang dải màu xanh lá và xanh ngọc
* **Vị trí:** `reports.js` (Hàm `initHRCharts` của đối tượng `Reports`, phần khai báo `chartDeptRatio`)
* **Lý do:** Thiết lập lại dải màu hiển thị các phòng ban tương thích hoàn toàn với dải màu của biểu đồ **Khách hàng theo nguồn** (`['#3b82f6', '#10b981', '#34d399', '#14b8a6', '#059669', '#94a3b8']`) để tạo tính thống nhất, đồng bộ tối đa cho giao diện báo cáo.

---

## 30. Phần bổ sung Giai đoạn 30 (Giảm cường độ dải chuyển màu 3D cho biểu đồ tròn)

### File: `app/js/charts.js`

#### Mục 30.1: Tinh chỉnh độ tương phản Linear Gradient trên các lát cắt tròn mềm mại hơn
* **Vị trí:** `charts.js` (Hàm `doughnut` của đối tượng `Charts`, phần vẽ vòng tròn)
* **Lý do:** Giảm độ chênh lệch sáng/tối để biểu đồ có giao diện mượt mà và sang trọng hơn. 
  - Điều chỉnh đầu trong (light) từ 28% xuống còn **10%** độ sáng (`_adjustColor(baseColor, 0.10)`).
  - Điều chỉnh đầu ngoài (dark) từ -18% xuống còn **-5%** độ tối (`_adjustColor(baseColor, -0.05)`).
  - Thay đổi này giúp giảm tương phản thô cứng, làm cho các lát cắt của biểu đồ tròn phẳng mịn, nhẹ nhàng và thanh thoát hơn.



