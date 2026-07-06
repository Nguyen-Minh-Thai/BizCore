window.Pages = window.Pages || {};
window.Pages.Customers = {
  render() {
    return `
      <div id="customers-content">
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
          <h1>Khách hàng</h1>
          <p>Quản lý danh sách khách hàng và đối tác</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" onclick="window.Pages.Customers.showModal()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Thêm khách hàng
          </button>
        </div>
      </div>

      <div class="card">
        <div class="table-toolbar">
          <div style="position:relative;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="position:absolute;left:12px;top:10px;color:var(--text-secondary);"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="cusSearch" class="form-input table-search" style="padding-left:36px;" placeholder="Tìm theo tên, email, công ty...">
          </div>
          <div style="display:flex;gap:12px;">
            <select id="cusStatusFilter" class="form-input" style="width:140px;">
              <option value="">Tất cả trạng thái</option>
              <option value="lead">Lead mới</option>
              <option value="prospect">Tiềm năng</option>
              <option value="customer">Khách hàng</option>
              <option value="churned">Ngừng giao dịch</option>
            </select>
          </div>
        </div>
        <div style="overflow-x:auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Khách hàng</th>
                <th>Công ty</th>
                <th>Email</th>
                <th>Số điện thoại</th>
                <th>Trạng thái</th>
                <th style="text-align:right;">Thao tác</th>
              </tr>
            </thead>
            <tbody id="customersTableBody">
              <!-- Rendered via JS -->
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  async mount() {
    const container = document.getElementById('customers-content');
    if (!container) return;
    try {
      container.innerHTML = await this._renderContent();
      
      await this.loadData();

      document.getElementById('cusSearch').addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.renderTable();
      });

      document.getElementById('cusStatusFilter').addEventListener('change', (e) => {
        this.statusFilter = e.target.value;
        this.renderTable();
      });
    } catch(e) {
      container.innerHTML = `<div class="empty-state"><p style="color:var(--color-danger)">Lỗi tải dữ liệu: ${e.message}</p></div>`;
    }
  },

  async loadData() {
    this.customers = await Store.getCustomers();
    this.renderTable();
  },

  renderTable() {
    let filtered = this.customers;
    if (this.statusFilter) filtered = filtered.filter(c => c.status === this.statusFilter);
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(q) || 
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.company && c.company.toLowerCase().includes(q))
      );
    }

    const tbody = document.getElementById('customersTableBody');
    const statusMap = {
      'lead': { label: 'Lead', variant: 'secondary' },
      'prospect': { label: 'Tiềm năng', variant: 'info' },
      'customer': { label: 'Khách hàng', variant: 'success' },
      'churned': { label: 'Ngừng GD', variant: 'danger' },
      'new': { label: 'Mới', variant: 'primary'} // for backwards compat
    };

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:32px;" class="text-secondary">Không tìm thấy khách hàng nào</td></tr>';
    } else {
      tbody.innerHTML = filtered.map(cus => {
        const status = statusMap[cus.status] || { label: cus.status, variant: 'secondary' };
        
        return `
          <tr>
            <td>
              <div class="employee-cell">
                <div class="table-avatar" style="background:${Utils.getAvatarColor(cus.name)}">${Utils.getInitials(cus.name)}</div>
                <div style="font-weight:600;">${cus.name}</div>
              </div>
            </td>
            <td>${cus.company || '-'}</td>
            <td>${cus.email || '-'}</td>
            <td>${cus.phone || '-'}</td>
            <td>${Components.createBadge(status.label, status.variant)}</td>
            <td style="text-align:right;">
              <button class="btn btn-ghost btn-sm" onclick="window.Pages.Customers.showModal('${cus.id}')">Sửa</button>
              <button class="btn btn-ghost btn-sm" style="color:var(--color-danger);" onclick="window.Pages.Customers.deleteCus('${cus.id}')">Xóa</button>
            </td>
          </tr>
        `;
      }).join('');
    }
  },

  async showModal(id = null) {
    let cus = null;
    if (id) {
      const customers = await Store.getCustomers();
      cus = customers.find(c => c.id === id);
    }

    const content = `
      <form id="cusForm" onsubmit="event.preventDefault(); window.Pages.Customers.saveCus('${id || ''}')">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Tên khách hàng *</label>
            <input type="text" id="cusName" class="form-input" required value="${cus ? cus.name : ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Công ty</label>
            <input type="text" id="cusCompany" class="form-input" value="${cus ? (cus.company || '') : ''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" id="cusEmail" class="form-input" value="${cus ? (cus.email || '') : ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Số điện thoại</label>
            <input type="text" id="cusPhone" class="form-input" value="${cus ? (cus.phone || '') : ''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Trạng thái</label>
            <select id="cusStatus" class="form-input">
              <option value="lead" ${cus && cus.status === 'lead' ? 'selected' : ''}>Lead mới</option>
              <option value="prospect" ${cus && cus.status === 'prospect' ? 'selected' : ''}>Tiềm năng</option>
              <option value="customer" ${cus && cus.status === 'customer' ? 'selected' : ''}>Khách hàng</option>
              <option value="churned" ${cus && cus.status === 'churned' ? 'selected' : ''}>Ngừng giao dịch</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Nguồn</label>
            <input type="text" id="cusSource" class="form-input" placeholder="Ví dụ: Website, Facebook..." value="${cus ? (cus.source || '') : ''}">
          </div>
        </div>
      </form>
    `;

    Components.showModal({
      id: 'cusModal',
      title: id ? 'Sửa thông tin khách hàng' : 'Thêm khách hàng mới',
      content: content,
      size: 'md',
      footer: `
        <button type="button" class="btn btn-ghost" onclick="Components.closeModal()">Hủy</button>
        <button type="button" class="btn btn-primary" onclick="document.getElementById('cusForm').dispatchEvent(new Event('submit'))">Lưu</button>
      `
    });
  },

  async saveCus(id) {
    const data = {
      name: document.getElementById('cusName').value,
      company: document.getElementById('cusCompany').value,
      email: document.getElementById('cusEmail').value,
      phone: document.getElementById('cusPhone').value,
      status: document.getElementById('cusStatus').value,
      source: document.getElementById('cusSource').value
    };

    try {
      if (id) {
        await Store.updateCustomer(id, data);
        Components.showToast('Đã cập nhật khách hàng', 'success');
      } else {
        await Store.addCustomer(data);
        Components.showToast('Đã thêm khách hàng mới', 'success');
      }
      Components.closeModal('cusModal');
      await this.loadData();
    } catch(e) {
      Components.showToast('Lỗi lưu dữ liệu: ' + e.message, 'error');
    }
  },

  async deleteCus(id) {
    Components.showConfirm('Xác nhận xóa', 'Bạn có chắc chắn muốn xóa khách hàng này? Mọi cơ hội bán hàng (Deals) liên quan cũng có thể bị ảnh hưởng.', async () => {
      try {
        await Store.deleteCustomer(id);
        Components.showToast('Đã xóa khách hàng', 'success');
        await this.loadData();
      } catch(e) {
        Components.showToast('Lỗi xóa dữ liệu: ' + e.message, 'error');
      }
    });
  },

  unmount() {}
};
