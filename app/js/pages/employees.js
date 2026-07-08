window.Pages = window.Pages || {};
window.Pages.Employees = {
  render() {
    return `
      <div id="employees-content">
        <div class="empty-state" style="min-height:400px;display:flex;flex-direction:column;align-items:center;justify-content:center;">
          <span class="ai-typing" style="margin-bottom:16px;">
            <span class="ai-typing-dot"></span><span class="ai-typing-dot"></span><span class="ai-typing-dot"></span>
          </span>
          <p class="text-secondary">Đang tải dữ liệu từ Supabase...</p>
        </div>
      </div>
    `;
  },

  async _renderContent() {
    const employees = await Store.getEmployees();
    const active = employees.filter(e => e.status === 'active').length;
    const leave = employees.filter(e => e.status === 'on_leave').length;
    const resigned = employees.filter(e => e.status === 'resigned').length;

    return `
      <div class="page-header">
        <div>
          <h1>Nhân sự</h1>
          <p>Quản lý hồ sơ nhân viên (${employees.length} tổng số)</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-secondary" onclick="window.Pages.Employees.exportExcel()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Xuất Excel
          </button>
          ${(Store.currentUser && (Store.currentUser.role === 'admin' || Store.currentUser.role === 'hr')) ? `
          <button class="btn btn-primary" onclick="window.Pages.Employees.showModal()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Thêm nhân viên
          </button>` : ''}
        </div>
      </div>

      <div class="stat-cards-grid mb-6">
        ${Components.createStatCard({ title: 'Đang hoạt động', value: active, color: '#10b981', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' })}
        ${Components.createStatCard({ title: 'Nghỉ phép', value: leave, color: '#f59e0b', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>' })}
        ${Components.createStatCard({ title: 'Đã nghỉ việc', value: resigned, color: '#ef4444', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>' })}
      </div>

      <div class="card">
        <div class="table-toolbar">
          <div style="position:relative;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="position:absolute;left:12px;top:10px;color:var(--text-secondary);"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="empSearch" class="form-input table-search" style="padding-left:36px;" placeholder="Tìm theo tên, email...">
          </div>
          <div style="display:flex;gap:12px;">
            <select id="empStatusFilter" class="form-input" style="width:140px;">
              <option value="">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="on_leave">Nghỉ phép</option>
              <option value="resigned">Đã nghỉ việc</option>
            </select>
          </div>
        </div>
        <div style="overflow-x:auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Nhân viên</th>
                <th>Vị trí / Chức vụ</th>
                <th>Phòng ban</th>
                <th>Lương cơ bản</th>
                <th>KPI</th>
                <th>Trạng thái</th>
                <th style="text-align:right;">Thao tác</th>
              </tr>
            </thead>
            <tbody id="employeesTableBody">
              <!-- Rendered via JS -->
            </tbody>
          </table>
        </div>
        <div id="employeesPagination"></div>
      </div>
    `;
  },

  async mount() {
    const container = document.getElementById('employees-content');
    if (!container) return;
    try {
      container.innerHTML = await this._renderContent();

      this.currentPage = 1;
      this.itemsPerPage = 10;
      await this.loadData();

      document.getElementById('empSearch').addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.currentPage = 1;
        this.renderTable();
      });

      document.getElementById('empStatusFilter').addEventListener('change', (e) => {
        this.statusFilter = e.target.value;
        this.currentPage = 1;
        this.renderTable();
      });
    } catch (e) {
      container.innerHTML = `<div class="empty-state"><p style="color:var(--color-danger)">Lỗi tải dữ liệu: ${e.message}</p></div>`;
    }
  },

  async loadData() {
    this.employees = await Store.getEmployees();
    this.departments = await Store.getDepartments();
    this.renderTable();
  },

  renderTable() {
    let filtered = this.employees;
    if (this.statusFilter) filtered = filtered.filter(e => e.status === this.statusFilter);
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(e => e.name.toLowerCase().includes(q) || (e.email && e.email.toLowerCase().includes(q)));
    }

    const start = (this.currentPage - 1) * this.itemsPerPage;
    const paginated = filtered.slice(start, start + this.itemsPerPage);

    const tbody = document.getElementById('employeesTableBody');
    const statusMap = {
      'active': { label: 'Đang làm', variant: 'success' },
      'on_leave': { label: 'Nghỉ phép', variant: 'warning' },
      'resigned': { label: 'Đã nghỉ', variant: 'danger' }
    };

    if (paginated.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:32px;" class="text-secondary">Không tìm thấy nhân viên nào</td></tr>';
    } else {
      tbody.innerHTML = paginated.map(emp => {
        const dept = this.departments.find(d => d.id === emp.departmentId);
        const status = statusMap[emp.status] || { label: emp.status, variant: 'secondary' };
        const isDirector = emp.role === 'admin' || (emp.position && (emp.position.toLowerCase().includes('giám đốc') || emp.position.toLowerCase().includes('director')));
        const kpiText = isDirector ? 'None' : (emp.kpiSalary != null ? Utils.formatCurrency(emp.kpiSalary) : '—');

        return `
          <tr>
            <td>
              <div class="employee-cell">
                <div class="table-avatar" style="background:${Utils.getAvatarColor(emp.name)}">${Utils.getInitials(emp.name)}</div>
                <div>
                  <div style="font-weight:600;">${emp.name}</div>
                  <div style="font-size:12px;color:var(--text-secondary);">${emp.email || ''}</div>
                </div>
              </div>
            </td>
            <td>${emp.position || 'Nhân viên'}</td>
            <td>${dept ? dept.name : '<span class="text-secondary">Chưa xếp</span>'}</td>
            <td style="font-weight:500;">${emp.baseSalary != null ? Utils.formatCurrency(emp.baseSalary) : '—'}</td>
            <td style="font-weight:500;">${kpiText}</td>
            <td>${Components.createBadge(status.label, status.variant)}</td>
            <td style="text-align:right;">
              <button class="btn btn-ghost btn-sm" onclick="window.Pages.Employees.showModal('${emp.id}')">Sửa</button>
              <button class="btn btn-ghost btn-sm" style="color:var(--color-danger);" onclick="window.Pages.Employees.deleteEmp('${emp.id}')">Xóa</button>
            </td>
          </tr>
        `;
      }).join('');
    }

    const pagination = document.getElementById('employeesPagination');
    if (filtered.length > this.itemsPerPage) {
      const totalPages = Math.ceil(filtered.length / this.itemsPerPage);
      let btns = '';
      for (let i = 1; i <= totalPages; i++) {
        btns += `<button class="${i === this.currentPage ? 'active' : ''}" onclick="window.Pages.Employees.goToPage(${i})">${i}</button>`;
      }
      pagination.innerHTML = `
        <div class="table-pagination">
          ${btns}
          <div class="table-info" style="margin-left:16px;">Hiển thị ${start + 1}-${Math.min(start + this.itemsPerPage, filtered.length)} / ${filtered.length}</div>
        </div>
      `;
    } else {
      pagination.innerHTML = '';
    }
  },

  goToPage(page) {
    this.currentPage = page;
    this.renderTable();
  },

  async showModal(id = null) {
    let emp = null;
    if (id) {
      emp = this.employees.find(e => e.id === id);
    }

    const depts = await Store.getDepartments();
    const deptOptions = depts.map(d => `<option value="${d.id}" ${emp && emp.departmentId === d.id ? 'selected' : ''}>${d.name}</option>`).join('');

    const content = `
      <form id="empForm" onsubmit="event.preventDefault(); window.Pages.Employees.saveEmp('${id || ''}')">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Họ và tên *</label>
            <input type="text" id="empName" class="form-input" required value="${emp ? emp.name : ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" id="empEmail" class="form-input" required placeholder="email@congty.com" value="${emp ? (emp.email || '') : ''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Số điện thoại</label>
            <input type="tel" id="empPhone" class="form-input" placeholder="09xxxx" value="${emp ? (emp.phone || '') : ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Vị trí / Chức vụ *</label>
            <input type="text" id="empPosition" class="form-input" required value="${emp ? (emp.position || '') : ''}">
          </div>
        </div>
        
        ${(Store.currentUser && (Store.currentUser.role === 'admin' || Store.currentUser.role === 'hr')) ? `
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Mật khẩu đăng nhập</label>
            <input type="text" id="empPassword" class="form-input" ${!id ? 'required' : ''} placeholder="${id ? 'Để trống nếu không đổi' : 'Mật khẩu mặc định'}" value="${id ? '' : '123456'}">
          </div>
          <div class="form-group">
            <label class="form-label">Phân quyền</label>
            <select id="empRole" class="form-input" required>
              <option value="employee" ${emp && emp.role === 'employee' ? 'selected' : ''}>Nhân viên (Employee)</option>
              <option value="manager" ${emp && emp.role === 'manager' ? 'selected' : ''}>Trưởng phòng (Manager)</option>
              <option value="hr" ${emp && emp.role === 'hr' ? 'selected' : ''}>Nhân sự (HR)</option>
              ${Store.currentUser.role === 'admin' ? `<option value="admin" ${emp && emp.role === 'admin' ? 'selected' : ''}>Giám đốc (Admin)</option>` : ''}
            </select>
          </div>
        </div>` : ''}

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Phòng ban</label>
            <select id="empDept" class="form-input" required>
              <option value="">-- Chọn phòng ban --</option>
              ${deptOptions}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Lương cơ bản (VNĐ) *</label>
            <input type="number" id="empSalary" class="form-input" required min="0" step="100000" value="${emp ? emp.baseSalary : '5000000'}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Lương KPI (VNĐ) *</label>
            <input type="number" id="empKpiSalary" class="form-input" required min="0" step="100000" placeholder="Riêng Giám đốc nhập 0" value="${emp ? (emp.kpiSalary || 0) : '0'}">
          </div>
          <div class="form-group">
            <label class="form-label">Trạng thái</label>
            <select id="empStatus" class="form-input">
              <option value="active" ${emp && emp.status === 'active' ? 'selected' : ''}>Đang hoạt động</option>
              <option value="on_leave" ${emp && emp.status === 'on_leave' ? 'selected' : ''}>Nghỉ phép</option>
              <option value="resigned" ${emp && emp.status === 'resigned' ? 'selected' : ''}>Đã nghỉ việc</option>
            </select>
          </div>
        </div>
      </form>
    `;

    Components.showModal({
      id: 'empModal',
      title: id ? 'Sửa thông tin nhân viên' : 'Thêm nhân viên mới',
      content: content,
      size: 'md',
      footer: `
        <button type="button" class="btn btn-ghost" onclick="Components.closeModal()">Hủy</button>
        <button type="button" class="btn btn-primary" onclick="document.getElementById('empForm').dispatchEvent(new Event('submit'))">Lưu</button>
      `
    });
  },

  async saveEmp(id) {
    const roleEl = document.getElementById('empRole');
    const pwdEl = document.getElementById('empPassword');

    const baseSalary = Number(document.getElementById('empSalary').value);
    const kpiSalary = Number(document.getElementById('empKpiSalary').value);
    const position = document.getElementById('empPosition').value;
    const role = roleEl ? roleEl.value : 'employee';

    const isDirector = role === 'admin' || position.toLowerCase().includes('giám đốc') || position.toLowerCase().includes('director');

    if (!isDirector && baseSalary > 10000000) {
      Components.showToast('Lương cơ bản không được vượt quá 10,000,000 VNĐ (riêng Giám đốc mới được vượt quá)', 'warning');
      return;
    }

    if (isDirector) {
      if (kpiSalary !== 0) {
        Components.showToast('Giám đốc không có lương KPI (vui lòng nhập 0)', 'warning');
        return;
      }
    } else {
      const minKpi = baseSalary * 3;
      const maxKpi = baseSalary * 7;
      if (kpiSalary < minKpi || kpiSalary > maxKpi) {
        Components.showToast(`Lương KPI phải dao động từ 3 đến 7 lần Lương cơ bản (${Utils.formatCurrency(minKpi)} - ${Utils.formatCurrency(maxKpi)})`, 'warning');
        return;
      }
    }

    const data = {
      name: document.getElementById('empName').value,
      email: document.getElementById('empEmail').value,
      phone: document.getElementById('empPhone').value,
      position: position,
      departmentId: document.getElementById('empDept').value || null,
      baseSalary: baseSalary,
      kpiSalary: kpiSalary,
      status: document.getElementById('empStatus').value,
      role: role,
      password: pwdEl ? pwdEl.value : undefined
    };

    if (id && (!data.password || data.password === '')) {
      delete data.password;
    }

    try {
      if (id) {
        await Store.updateEmployee(id, data);
        Components.showToast('Đã cập nhật nhân viên', 'success');
      } else {
        await Store.addEmployee(data);
        Components.showToast('Đã thêm nhân viên mới', 'success');
      }
      Components.closeModal('empModal');
      await this.loadData();
    } catch (e) {
      Components.showToast('Lỗi lưu dữ liệu: ' + e.message, 'error');
    }
  },

  exportExcel() {
    try {
      const list = this.employees || [];
      if (!list.length) { Components.showToast('Chưa có dữ liệu để xuất', 'warning'); return; }
      const st = { active: 'Đang làm', on_leave: 'Nghỉ phép', resigned: 'Đã nghỉ' };
      const rows = list.map(e => {
        const dept = (this.departments || []).find(d => d.id === e.departmentId);
        const isDirector = e.role === 'admin' || (e.position && (e.position.toLowerCase().includes('giám đốc') || e.position.toLowerCase().includes('director')));
        const kpiVal = isDirector ? 'None' : (e.kpiSalary || 0);
        return [e.name, e.email || '', e.phone || '', e.position || '', dept ? dept.name : '', e.baseSalary || 0, kpiVal, st[e.status] || e.status];
      });
      Utils.exportExcel({ name: 'Nhân sự', headers: ['Họ tên', 'Email', 'SĐT', 'Chức vụ', 'Phòng ban', 'Lương cơ bản (đ)', 'KPI (đ)', 'Trạng thái'], rows }, 'bizcore-nhan-su.xlsx');
      Components.showToast('Đã xuất ' + rows.length + ' nhân viên ra Excel', 'success');
    } catch (e) { Components.showToast('Lỗi xuất Excel: ' + e.message, 'error'); }
  },

  async deleteEmp(id) {
    Components.showConfirm('Xác nhận xóa', 'Bạn có chắc chắn muốn xóa nhân viên này? Dữ liệu không thể khôi phục.', async () => {
      try {
        await Store.deleteEmployee(id);
        Components.showToast('Đã xóa nhân viên', 'success');
        await this.loadData();
      } catch (e) {
        Components.showToast('Lỗi xóa dữ liệu: ' + e.message, 'error');
      }
    });
  },

  unmount() { }
};
