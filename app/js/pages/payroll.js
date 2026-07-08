window.Pages = window.Pages || {};
window.Pages.Payroll = {
  render() {
    return `
      <div id="payroll-content">
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
    return `
      <div class="page-header">
        <div>
          <h1>Bảng lương</h1>
          <p>Quản lý và tính toán lương, thưởng, BHXH cho nhân viên</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-secondary" onclick="window.Pages.Payroll.exportExcel()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Xuất Excel
          </button>
          <button class="btn btn-primary" onclick="window.Pages.Payroll.doGeneratePayroll()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Tính lương tháng này
          </button>
        </div>
      </div>

      <div class="payroll-summary" id="payrollSummaryArea">
        <!-- Rendered via JS -->
      </div>

      <div class="card mb-6">
        <div class="card-body">
          <div class="payroll-month-selector">
            <label style="font-weight:500;">Chọn kỳ lương:</label>
            <input type="month" id="payrollMonth" class="form-input" onchange="window.Pages.Payroll.loadMonth()">
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 id="payrollTableTitle">Chi tiết bảng lương</h3>
        </div>
        <div style="overflow-x:auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Nhân viên</th>
                <th style="text-align:right;">Lương CB</th>
                <th style="text-align:right;">Lương KPI</th>
                <th style="text-align:center;">Công</th>
                <th style="text-align:right;">Bảo hiểm (NV)</th>
                <th style="text-align:right;">Thuế TNCN</th>
                <th style="text-align:right;">Thực nhận</th>
                <th style="text-align:right;">Thao tác</th>
              </tr>
            </thead>
            <tbody id="payrollTableBody">
              <!-- Rendered via JS -->
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  async mount() {
    const container = document.getElementById('payroll-content');
    if (!container) return;

    try {
      container.innerHTML = await this._renderContent();
      
      const currentMonth = Utils.getCurrentMonth();
      document.getElementById('payrollMonth').value = currentMonth;
      
      await this.loadMonthData(currentMonth);
    } catch(e) {
      container.innerHTML = `<div class="empty-state"><p style="color:var(--color-danger)">Lỗi tải dữ liệu: ${e.message}</p></div>`;
    }
  },

  async loadMonth() {
    const month = document.getElementById('payrollMonth').value;
    if (month) {
      await this.loadMonthData(month);
    }
  },

  async loadMonthData(month) {
    try {
      this.employees = await Store.getEmployees();
      const records = await Store.getPayrollByMonth(month);
      this.renderTable(records, month);
    } catch (e) {
      Components.showToast('Lỗi: ' + e.message, 'error');
    }
  },

  renderTable(records, month) {
    this.records = records; this.currentMonth = month;
    document.getElementById('payrollTableTitle').textContent = `Chi tiết bảng lương tháng ${Utils.formatMonth(month)}`;
    
    // Update summary
    const totalNet = records.reduce((s, r) => s + (r.netSalary || r.baseSalary || 0), 0);
    const totalTax = records.reduce((s, r) => s + (r.personalTax || 0), 0);
    
    // Total company insurance
    const totalInsuranceCompany = records.reduce((s, r) => s + (r.bhxhCompany || 0) + (r.bhytCompany || 0) + (r.bhtnCompany || 0), 0);

    const summaryArea = document.getElementById('payrollSummaryArea');
    if (summaryArea) {
      summaryArea.innerHTML = `
        ${Components.createStatCard({ title: 'Tổng lương thực nhận', value: Utils.formatCurrency(totalNet), color: '#10b981', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>' })}
        ${Components.createStatCard({ title: 'Tổng chi phí BHXH (CTY)', value: Utils.formatCurrency(totalInsuranceCompany), color: '#f59e0b', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' })}
        ${Components.createStatCard({ title: 'Tổng Thuế TNCN', value: Utils.formatCurrency(totalTax), color: '#ef4444', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>' })}
      `;
    }

    const tbody = document.getElementById('payrollTableBody');
    if (records.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:32px;" class="text-secondary">Chưa có dữ liệu lương tháng này. Hãy bấm "Tính lương".</td></tr>';
      return;
    }

    tbody.innerHTML = records.map(r => {
      const emp = this.employees.find(e => e.id === r.employeeId) || { name: 'Unknown' };
      const totalInsEmp = (r.bhxhEmployee || 0) + (r.bhytEmployee || 0) + (r.bhtnEmployee || 0);
      
      return `
        <tr>
          <td>
            <div class="employee-cell">
              <div class="table-avatar" style="background:${Utils.getAvatarColor(emp.name)}">${Utils.getInitials(emp.name)}</div>
              <div style="font-weight:500;">${emp.name}</div>
            </div>
          </td>
          <td style="text-align:right;">${Utils.formatCurrency(r.baseSalary)}</td>
          <td style="text-align:right;">${Utils.formatCurrency(r.kpiSalary || 0)}</td>
          <td style="text-align:center;">${r.actualWorkDays != null ? r.actualWorkDays : 22}/${r.workDays != null ? r.workDays : 22}</td>
          <td style="text-align:right;color:var(--color-warning);">${Utils.formatCurrency(totalInsEmp)}</td>
          <td style="text-align:right;color:var(--color-danger);">${Utils.formatCurrency(r.personalTax || 0)}</td>
          <td style="text-align:right;font-weight:700;color:var(--color-success);">${Utils.formatCurrency(r.netSalary || r.baseSalary || 0)}</td>
          <td style="text-align:right;">
            <button class="btn btn-ghost btn-sm" onclick="window.Pages.Payroll.viewDetails('${r.id}')">Chi tiết</button>
          </td>
        </tr>
      `;
    }).join('');
  },

  async doGeneratePayroll() {
    const month = document.getElementById('payrollMonth').value;
    if (!month) return;
    
    Components.showConfirm('Xác nhận tính lương', `Hệ thống sẽ tính toán lương tháng ${Utils.formatMonth(month)} dựa trên dữ liệu chấm công. Bạn có muốn tiếp tục?`, async () => {
      try {
        const records = await Store.generatePayroll(month);
        Components.showToast('Đã tính lương thành công', 'success');
        this.renderTable(records, month);
      } catch(e) {
        Components.showToast('Lỗi: ' + e.message, 'error');
      }
    });
  },

  async viewDetails(recordId) {
    const month = document.getElementById('payrollMonth').value;
    const records = await Store.getPayrollByMonth(month);
    const record = records.find(r => r.id === recordId);
    if (!record) return;
    
    const emp = this.employees.find(e => e.id === record.employeeId) || { name: 'Unknown' };
    
    const totalInsEmp = (record.bhxhEmployee || 0) + (record.bhytEmployee || 0) + (record.bhtnEmployee || 0);
    const totalInsComp = (record.bhxhCompany || 0) + (record.bhytCompany || 0) + (record.bhtnCompany || 0);

    const content = `
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div style="display:flex;align-items:center;gap:16px;padding-bottom:16px;border-bottom:1px solid var(--border-color);">
          <div style="width:48px;height:48px;border-radius:50%;background:${Utils.getAvatarColor(emp.name)};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:18px;">${Utils.getInitials(emp.name)}</div>
          <div>
            <div style="font-weight:700;font-size:18px;">${emp.name}</div>
            <div class="text-secondary">Kỳ lương: ${Utils.formatMonth(record.month)}</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
          <div>
            <h4 style="margin-bottom:12px;color:var(--text-accent);">1. Thu nhập</h4>
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
              <span class="text-secondary">Lương cơ bản:</span>
              <span style="font-weight:500;">${Utils.formatCurrency(record.baseSalary)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
              <span class="text-secondary">Lương KPI:</span>
              <span style="font-weight:500;">${Utils.formatCurrency(record.kpiSalary || 0)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
              <span class="text-secondary">Ngày công:</span>
              <span style="font-weight:500;">${record.actualWorkDays != null ? record.actualWorkDays : 22}/${record.workDays != null ? record.workDays : 22}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
              <span class="text-secondary">Phụ cấp:</span>
              <span style="font-weight:500;">${Utils.formatCurrency(record.allowances || 0)}</span>
            </div>
          </div>

          <div>
            <h4 style="margin-bottom:12px;color:var(--color-danger);">2. Khấu trừ (Người lao động)</h4>
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
              <span class="text-secondary">Bảo hiểm (8% + 1.5% + 1%):</span>
              <span style="font-weight:500;color:var(--color-warning);">${Utils.formatCurrency(totalInsEmp)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
              <span class="text-secondary">Thuế TNCN:</span>
              <span style="font-weight:500;color:var(--color-danger);">${Utils.formatCurrency(record.personalTax || 0)}</span>
            </div>
          </div>
        </div>

        <div style="padding:16px;background:var(--bg-tertiary);border-radius:8px;margin-top:8px;">
          <h4 style="margin-bottom:12px;color:var(--color-warning);">3. Chi phí Doanh nghiệp đóng</h4>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <span class="text-secondary">Bảo hiểm (17.5% + 3% + 1%):</span>
            <span style="font-weight:500;">${Utils.formatCurrency(totalInsComp)}</span>
          </div>
        </div>

        <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:18px;font-weight:700;">THỰC NHẬN</span>
          <span style="font-size:24px;font-weight:800;color:var(--color-success);">${Utils.formatCurrency(record.netSalary || record.baseSalary || 0)}</span>
        </div>
      </div>
    `;

    Components.showModal({
      id: 'payrollDetailModal',
      title: 'Phiếu lương chi tiết',
      content: content,
      size: 'sm',
      footer: `<button type="button" class="btn btn-primary" onclick="Components.closeModal()">Đóng</button>`
    });
  },

  exportExcel() {
    try {
      const recs = this.records || [];
      if (!recs.length) { Components.showToast('Chưa có dữ liệu lương để xuất', 'warning'); return; }
      const rows = recs.map(r => {
        const emp = (this.employees || []).find(e => e.id === r.employeeId) || {};
        const insE = (r.bhxhEmployee || 0) + (r.bhytEmployee || 0) + (r.bhtnEmployee || 0);
        return [emp.name || r.employeeId, r.baseSalary || 0, r.kpiSalary || 0, (r.actualWorkDays || 22) + '/' + (r.workDays || 22), insE, r.personalTax || 0, r.netSalary || r.baseSalary || 0];
      });
      Utils.exportExcel({ name:'Luong ' + (this.currentMonth || ''), headers:['Nhân viên','Lương CB','Lương KPI','Công','Bảo hiểm NV','Thuế TNCN','Thực nhận'], rows }, 'bizcore-luong-' + (this.currentMonth || '') + '.xlsx');
      Components.showToast('Đã xuất bảng lương (' + rows.length + ' người)', 'success');
    } catch(e) { Components.showToast('Lỗi xuất Excel: ' + e.message, 'error'); }
  },

  unmount() {}
};
