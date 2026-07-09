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
              <option value="lead">Lead / Mới</option>
              <option value="prospect">Tiềm năng</option>
              <option value="quote">Báo giá</option>
              <option value="negotiate">Đàm phán</option>
              <option value="won">Thành công (Won)</option>
              <option value="lost">Thất bại (Lost)</option>
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
                <th>Nhân viên chăm sóc</th>
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
      'lead': { label: 'Lead / Mới', variant: 'secondary' },
      'prospect': { label: 'Tiềm năng', variant: 'info' },
      'quote': { label: 'Báo giá', variant: 'warning' },
      'negotiate': { label: 'Đàm phán', variant: 'primary' },
      'won': { label: 'Thành công (Won)', variant: 'success' },
      'lost': { label: 'Thất bại (Lost)', variant: 'danger' }
    };

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:32px;" class="text-secondary">Không tìm thấy khách hàng nào</td></tr>';
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
            <td>
              ${cus.employeeName ? `
                <div class="employee-cell" style="gap:8px;">
                  <div class="table-avatar" style="background:${Utils.getAvatarColor(cus.employeeName)}; width:24px; height:24px; font-size:10px; line-height:24px;">${Utils.getInitials(cus.employeeName)}</div>
                  <div style="font-size:13px; font-weight:500;">${cus.employeeName}</div>
                </div>
              ` : '<span class="text-secondary">—</span>'}
            </td>
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
    
    // Tải danh sách nhân viên để chọn làm nhân viên chăm sóc
    const emps = await Store.getEmployees({ status: 'active' });

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
              <option value="lead" ${cus && cus.status === 'lead' ? 'selected' : ''}>Lead / Mới</option>
              <option value="prospect" ${cus && cus.status === 'prospect' ? 'selected' : ''}>Tiềm năng</option>
              <option value="quote" ${cus && cus.status === 'quote' ? 'selected' : ''}>Báo giá</option>
              <option value="negotiate" ${cus && cus.status === 'negotiate' ? 'selected' : ''}>Đàm phán</option>
              <option value="won" ${cus && cus.status === 'won' ? 'selected' : ''}>Thành công (Won)</option>
              <option value="lost" ${cus && cus.status === 'lost' ? 'selected' : ''}>Thất bại (Lost)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Nguồn</label>
            <input type="text" id="cusSource" class="form-input" placeholder="Ví dụ: Website, Facebook..." value="${cus ? (cus.source || '') : ''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Nhân viên chăm sóc</label>
            <select id="cusEmployeeId" class="form-input">
              <option value="">-- Chưa phân công --</option>
              ${emps.map(e => `<option value="${e.id}" ${cus && cus.employeeId === e.id ? 'selected' : ''}>${e.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"></div>
        </div>
      </form>

      ${id ? `
        <div class="crm-tabs-section" style="margin-top:24px; border-top:1px solid var(--border-color); padding-top:16px;">
          <div class="crm-tabs-header" style="display:flex; gap:8px; border-bottom:1px solid var(--border-color); margin-bottom:16px; overflow-x:auto; padding-bottom:4px;">
            <button type="button" class="btn btn-ghost btn-sm crm-tab-btn active" data-tab="notes" style="font-weight:600; border-bottom:2px solid var(--text-accent); color:var(--text-accent);" onclick="window.Pages.Customers.switchTab('notes', '${id}')">Ghi chú</button>
            <button type="button" class="btn btn-ghost btn-sm crm-tab-btn" data-tab="contacts" style="font-weight:600;" onclick="window.Pages.Customers.switchTab('contacts', '${id}')">Customer</button>
            <button type="button" class="btn btn-ghost btn-sm crm-tab-btn" data-tab="service" style="font-weight:600;" onclick="window.Pages.Customers.switchTab('service', '${id}')">Service Confirm</button>
            <button type="button" class="btn btn-ghost btn-sm crm-tab-btn" data-tab="quote" style="font-weight:600;" onclick="window.Pages.Customers.switchTab('quote', '${id}')">Quote</button>
            <button type="button" class="btn btn-ghost btn-sm crm-tab-btn" data-tab="order" style="font-weight:600;" onclick="window.Pages.Customers.switchTab('order', '${id}')">Order</button>
            <button type="button" class="btn btn-ghost btn-sm crm-tab-btn" data-tab="logs" style="font-weight:600;" onclick="window.Pages.Customers.switchTab('logs', '${id}')">Thay đổi gần đây</button>
          </div>
          <div class="crm-tab-content" id="crmTabContent">
            <!-- Loaded dynamically -->
          </div>
        </div>
      ` : ''}
    `;

    Components.showModal({
      id: 'cusModal',
      title: id ? 'Sửa thông tin khách hàng' : 'Thêm khách hàng mới',
      content: content,
      size: 'lg',
      footer: `
        <button type="button" class="btn btn-ghost" onclick="Components.closeModal()">Hủy</button>
        <button type="button" class="btn btn-primary" onclick="document.getElementById('cusForm').dispatchEvent(new Event('submit'))">Lưu</button>
      `
    });

    if (id) {
      // Load notes tab by default
      setTimeout(() => {
        window.Pages.Customers.switchTab('notes', id);
      }, 50);
    }
  },

  async saveCus(id) {
    const data = {
      name: document.getElementById('cusName').value,
      company: document.getElementById('cusCompany').value,
      email: document.getElementById('cusEmail').value,
      phone: document.getElementById('cusPhone').value,
      status: document.getElementById('cusStatus').value,
      source: document.getElementById('cusSource').value,
      employeeId: document.getElementById('cusEmployeeId').value || null
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

  async switchTab(tabName, customerId) {
    document.querySelectorAll('.crm-tab-btn').forEach(btn => {
      if (btn.dataset.tab === tabName) {
        btn.classList.add('active');
        btn.style.borderBottom = '2px solid var(--text-accent)';
        btn.style.color = 'var(--text-accent)';
      } else {
        btn.classList.remove('active');
        btn.style.borderBottom = 'none';
        btn.style.color = 'var(--text-secondary)';
      }
    });

    const contentArea = document.getElementById('crmTabContent');
    if (!contentArea) return;

    if (tabName === 'notes') {
      await this.renderNotesTab(contentArea, customerId);
    } else if (tabName === 'contacts') {
      await this.renderContactsTab(contentArea, customerId);
    } else if (tabName === 'service') {
      await this.renderServiceTab(contentArea, customerId);
    } else if (tabName === 'quote') {
      await this.renderQuoteTab(contentArea, customerId);
    } else if (tabName === 'order') {
      await this.renderOrderTab(contentArea, customerId);
    } else if (tabName === 'logs') {
      this.renderLogsTab(contentArea, customerId);
    }
  },

  async renderNotesTab(container, customerId) {
    const notes = await Store.getCustomerNotes(customerId);
    this.selectedFile = null;
    container.innerHTML = `
      <div class="note-editor" style="display:flex; flex-direction:column; gap:12px; background:var(--bg-tertiary); padding:16px; border-radius:8px; border:1px solid var(--border-color); margin-bottom:16px;">
        <div style="position:relative;">
          <textarea id="noteContent" class="form-input" style="width:100%; height:100px; resize:vertical; padding-bottom:24px; font-size:14px;" placeholder="Nhập ghi chú..."></textarea>
          <div id="wordCount" style="position:absolute; right:8px; bottom:8px; font-size:12px; color:var(--text-secondary);">0 words</div>
        </div>
        <div class="form-row" style="margin-bottom:0; gap:12px;">
          <div class="form-group" style="margin-bottom:0; flex:1;">
            <input type="text" id="noteTags" class="form-input" style="font-size:13px;" placeholder="Nhập tags (cách nhau bằng dấu phẩy)">
          </div>
          <div class="form-group" style="margin-bottom:0; flex:1;">
            <input type="text" id="noteEmployees" class="form-input" style="font-size:13px;" placeholder="Nhân viên (cách nhau bằng dấu phẩy)">
          </div>
        </div>
        
        <input type="file" id="noteFileInput" style="display:none;" onchange="window.Pages.Customers.handleFileSelect(event)">
        <div id="attachmentNameContainer" style="margin-top:2px;"></div>

        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-top:4px;">
          <div style="display:flex; align-items:center; gap:16px;">
            <button type="button" class="btn btn-ghost btn-sm" style="display:flex; align-items:center; font-size:13px;" onclick="window.Pages.Customers.triggerFileSelect()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="margin-right:6px;"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              Thêm file đính kèm
            </button>
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:13px; user-select:none; color:var(--text-secondary);">
              <input type="checkbox" id="noteImportant">
              Đánh dấu nổi bật
            </label>
          </div>
          <button type="button" class="btn btn-primary" id="saveNoteBtn" onclick="window.Pages.Customers.saveNote('${customerId}')" style="background:#0066cc; border-color:#0066cc; font-size:13px; padding:6px 16px;">Lưu ghi chú</button>
        </div>
      </div>
      <div class="notes-filter-bar" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <div style="font-weight:600; font-size:14px;">Nhật ký ghi chú</div>
        <select id="noteFilter" class="form-input" style="width:140px; padding:4px 8px; height:auto; font-size:12px;" onchange="window.Pages.Customers.filterNotes('${customerId}')">
          <option value="all">Tất cả ghi chú</option>
          <option value="important">Nổi bật</option>
        </select>
      </div>
      <div id="notesListArea" style="display:flex; flex-direction:column; gap:12px;">
        <!-- Notes list rendered here -->
      </div>
    `;

    // Add textarea listener for word count
    const textarea = document.getElementById('noteContent');
    const wordCount = document.getElementById('wordCount');
    if (textarea && wordCount) {
      textarea.addEventListener('input', (e) => {
        const text = e.target.value.trim();
        const words = text ? text.split(/\s+/).length : 0;
        wordCount.textContent = `${words} words`;
      });
    }

    this.renderNotesList(notes, customerId);
  },

  triggerFileSelect() {
    document.getElementById('noteFileInput').click();
  },

  handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
      document.getElementById('attachmentNameContainer').innerHTML = `
        <div style="display:flex; align-items:center; gap:8px; background:var(--bg-secondary); padding:4px 10px; border-radius:4px; border:1px solid var(--border-color); width:fit-content; margin-bottom:8px;">
          <span style="font-size:12.5px; color:#0066cc; font-weight:500;">📎 ${file.name}</span>
          <button type="button" style="background:none; border:none; color:var(--color-danger); cursor:pointer; font-weight:700; font-size:14px;" onclick="window.Pages.Customers.clearFileSelect()">&times;</button>
        </div>
      `;
      this.selectedFile = file.name;
    }
  },

  clearFileSelect() {
    document.getElementById('noteFileInput').value = '';
    document.getElementById('attachmentNameContainer').innerHTML = '';
    this.selectedFile = null;
  },

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
  },

  renderNotesList(notes, customerId) {
    const listArea = document.getElementById('notesListArea');
    if (!listArea) return;
    if (notes.length === 0) {
      listArea.innerHTML = '<div style="text-align:center; padding:24px; color:var(--text-secondary); font-style:italic; font-size:13px;">Chưa có ghi chú nào.</div>';
      return;
    }
    listArea.innerHTML = notes.map(note => {
      const dateStr = Utils.formatDateTime(note.createdAt);
      const isImportantStyle = note.isImportant ? 'border-left: 4px solid var(--color-warning); background: rgba(245, 158, 11, 0.03);' : '';
      return `
        <div style="padding:12px 16px; border-radius:6px; border:1px solid var(--border-color); display:flex; flex-direction:column; gap:8px; ${isImportantStyle} position:relative;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-weight:600; font-size:13px; color:var(--text-primary);">Quản trị viên</span>
              <span style="font-size:11px; color:var(--text-secondary);">${dateStr}</span>
              ${note.isImportant ? '<span style="font-size:10px; background:var(--color-warning); color:#fff; padding:1px 6px; border-radius:4px; font-weight:600;">Nổi bật</span>' : ''}
            </div>
            <div style="display:flex; gap:6px;">
              <button type="button" class="btn btn-ghost btn-sm" style="padding:2px; min-width:auto; height:auto;" onclick="window.Pages.Customers.editNote('${note.id}', '${customerId}')" title="Sửa ghi chú">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button type="button" class="btn btn-ghost btn-sm" style="color:var(--color-danger); padding:2px; min-width:auto; height:auto;" onclick="window.Pages.Customers.deleteNote('${note.id}', '${customerId}')" title="Xóa ghi chú">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              </button>
            </div>
          </div>
          <div style="font-size:13.5px; white-space:pre-wrap; line-height:1.5; color:var(--text-primary);">${note.content}</div>
          
          ${note.fileName ? `
            <div style="display:flex; align-items:center; gap:6px; font-size:12.5px; color:#0066cc; font-weight:500; margin-top:2px; cursor:pointer;" onclick="window.Pages.Customers.downloadAttachment('${note.fileName}')" title="Tải xuống tệp đính kèm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              Đính kèm: <span style="text-decoration:underline;">${note.fileName}</span>
            </div>
          ` : ''}

          <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:2px;">
            ${note.tags.map(t => t.trim() ? `<span style="font-size:11px; background:var(--bg-tertiary); color:var(--text-secondary); padding:1px 8px; border-radius:12px;">#${t.trim()}</span>` : '').join('')}
            ${note.employees.map(e => e.trim() ? `<span style="font-size:11px; background:rgba(0, 102, 204, 0.08); color:#0066cc; padding:1px 8px; border-radius:12px;">@${e.trim()}</span>` : '').join('')}
          </div>
        </div>
      `;
    }).join('');
  },

  async editNote(noteId, customerId) {
    const notes = await Store.getCustomerNotes(customerId);
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    document.getElementById('noteContent').value = note.content;
    document.getElementById('noteTags').value = note.tags.join(', ');
    document.getElementById('noteEmployees').value = note.employees.join(', ');
    document.getElementById('noteImportant').checked = note.isImportant;

    if (note.fileName) {
      document.getElementById('attachmentNameContainer').innerHTML = `
        <div style="display:flex; align-items:center; gap:8px; background:var(--bg-secondary); padding:4px 10px; border-radius:4px; border:1px solid var(--border-color); width:fit-content; margin-bottom:8px;">
          <span style="font-size:12.5px; color:#0066cc; font-weight:500;">📎 ${note.fileName}</span>
          <button type="button" style="background:none; border:none; color:var(--color-danger); cursor:pointer; font-weight:700; font-size:14px;" onclick="window.Pages.Customers.clearFileSelect()">&times;</button>
        </div>
      `;
      this.selectedFile = note.fileName;
    } else {
      this.clearFileSelect();
    }

    const saveBtn = document.getElementById('saveNoteBtn');
    if (saveBtn) {
      saveBtn.textContent = 'Cập nhật ghi chú';
      saveBtn.setAttribute('onclick', `window.Pages.Customers.updateNote('${noteId}', '${customerId}')`);
    }
  },

  async updateNote(noteId, customerId) {
    const content = document.getElementById('noteContent').value.trim();
    if (!content) { Components.showToast('Vui lòng nhập nội dung ghi chú', 'warning'); return; }
    const tags = document.getElementById('noteTags').value.split(',').map(t => t.trim()).filter(Boolean);
    const employees = document.getElementById('noteEmployees').value.split(',').map(e => e.trim()).filter(Boolean);
    const isImportant = document.getElementById('noteImportant').checked;
    const fileName = this.selectedFile || null;

    try {
      await Store.updateCustomerNote(noteId, { content, tags, employees, isImportant, fileName });
      Components.showToast('Đã cập nhật ghi chú', 'success');
      this.switchTab('notes', customerId);
    } catch(e) {
      Components.showToast('Lỗi cập nhật: ' + e.message, 'error');
    }
  },

  async deleteNote(noteId, customerId) {
    Components.showConfirm('Xác nhận xóa', 'Bạn có chắc chắn muốn xóa ghi chú này?', async () => {
      try {
        await Store.deleteCustomerNote(noteId);
        Components.showToast('Đã xóa ghi chú thành công', 'success');
        this.switchTab('notes', customerId);
      } catch(e) {
        Components.showToast('Lỗi khi xóa ghi chú: ' + e.message, 'error');
      }
    });
  },

  async saveNote(customerId) {
    const content = document.getElementById('noteContent').value.trim();
    if (!content) {
      Components.showToast('Vui lòng nhập nội dung ghi chú', 'warning');
      return;
    }
    const tags = document.getElementById('noteTags').value.split(',').map(t => t.trim()).filter(Boolean);
    const employees = document.getElementById('noteEmployees').value.split(',').map(e => e.trim()).filter(Boolean);
    const isImportant = document.getElementById('noteImportant').checked;
    const fileName = this.selectedFile || null;

    try {
      await Store.addCustomerNote({
        customerId,
        content,
        tags,
        employees,
        isImportant,
        fileName
      });
      Components.showToast('Đã lưu ghi chú', 'success');
      this.switchTab('notes', customerId);
    } catch(e) {
      Components.showToast('Lỗi lưu ghi chú: ' + e.message, 'error');
    }
  },

  async filterNotes(customerId) {
    const filter = document.getElementById('noteFilter').value;
    let notes = await Store.getCustomerNotes(customerId);
    if (filter === 'important') {
      notes = notes.filter(n => n.isImportant);
    }
    this.renderNotesList(notes, customerId);
  },

  async renderContactsTab(container, customerId) {
    const contacts = await Store.getCustomerContacts(customerId);
    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <div style="font-weight:600; font-size:14px;">Danh sách liên hệ liên quan</div>
        <button type="button" class="btn btn-primary btn-sm" style="font-size:12px;" onclick="window.Pages.Customers.toggleInlineForm('contact')">Thêm liên hệ</button>
      </div>

      <div id="contactInlineForm" style="display:none; background:var(--bg-tertiary); padding:16px; border-radius:6px; border:1px solid var(--border-color); margin-bottom:16px;">
        <h4 id="contactFormTitle" style="margin-top:0; margin-bottom:12px; font-size:14px;">Liên hệ mới</h4>
        <div class="form-row">
          <div class="form-group" style="margin-bottom:8px;">
            <label class="form-label" style="font-size:12px;">Họ và tên *</label>
            <input type="text" id="addContactName" class="form-input" style="font-size:13px; padding:6px 10px;">
          </div>
          <div class="form-group" style="margin-bottom:8px;">
            <label class="form-label" style="font-size:12px;">Chức vụ</label>
            <input type="text" id="addContactPosition" class="form-input" style="font-size:13px; padding:6px 10px;">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group" style="margin-bottom:8px;">
            <label class="form-label" style="font-size:12px;">Email</label>
            <input type="email" id="addContactEmail" class="form-input" style="font-size:13px; padding:6px 10px;">
          </div>
          <div class="form-group" style="margin-bottom:8px;">
            <label class="form-label" style="font-size:12px;">Số điện thoại</label>
            <input type="text" id="addContactPhone" class="form-input" style="font-size:13px; padding:6px 10px;">
          </div>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:8px;">
          <button type="button" class="btn btn-ghost btn-sm" onclick="window.Pages.Customers.toggleInlineForm('contact')">Hủy</button>
          <button type="button" class="btn btn-primary btn-sm" id="saveContactBtn" onclick="window.Pages.Customers.saveContact('${customerId}')">Lưu liên hệ</button>
        </div>
      </div>

      <table class="data-table" style="font-size:13px;">
        <thead>
          <tr>
            <th>Họ và tên</th>
            <th>Chức vụ</th>
            <th>Email</th>
            <th>Số điện thoại</th>
            <th style="text-align:right;">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          ${contacts.length === 0 ? `
            <tr><td colspan="5" style="text-align:center; padding:16px;" class="text-secondary">Chưa có người liên hệ nào.</td></tr>
          ` : contacts.map(c => `
            <tr>
              <td style="font-weight:600;">${c.name}</td>
              <td>${c.position || '—'}</td>
              <td>${c.email || '—'}</td>
              <td>${c.phone || '—'}</td>
              <td style="text-align:right;">
                <button type="button" class="btn btn-ghost btn-sm" style="padding:2px;" onclick="window.Pages.Customers.editContact('${c.id}', '${customerId}')">Sửa</button>
                <button type="button" class="btn btn-ghost btn-sm" style="color:var(--color-danger); padding:2px;" onclick="window.Pages.Customers.deleteContact('${c.id}', '${customerId}')">Xóa</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  },

  toggleInlineForm(type) {
    const el = document.getElementById(`${type}InlineForm`);
    if (el) {
      el.style.display = el.style.display === 'none' ? 'block' : 'none';
      // Reset texts if toggling to hide or reset
      if (el.style.display === 'none') {
        if (type === 'contact') {
          document.getElementById('addContactName').value = '';
          document.getElementById('addContactPosition').value = '';
          document.getElementById('addContactEmail').value = '';
          document.getElementById('addContactPhone').value = '';
          const saveBtn = document.getElementById('saveContactBtn');
          if (saveBtn) {
            saveBtn.textContent = 'Lưu liên hệ';
            saveBtn.setAttribute('onclick', `window.Pages.Customers.saveContact('${saveBtn.getAttribute('data-cus')}')`);
          }
        }
      }
    }
  },

  async editContact(contactId, customerId) {
    const contacts = await Store.getCustomerContacts(customerId);
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return;

    const el = document.getElementById('contactInlineForm');
    if (el) el.style.display = 'block';

    document.getElementById('addContactName').value = contact.name;
    document.getElementById('addContactPosition').value = contact.position || '';
    document.getElementById('addContactEmail').value = contact.email || '';
    document.getElementById('addContactPhone').value = contact.phone || '';

    document.getElementById('contactFormTitle').textContent = 'Chỉnh sửa liên hệ';

    const saveBtn = document.getElementById('saveContactBtn');
    if (saveBtn) {
      saveBtn.textContent = 'Cập nhật liên hệ';
      saveBtn.setAttribute('onclick', `window.Pages.Customers.updateContact('${contactId}', '${customerId}')`);
    }
  },

  async updateContact(contactId, customerId) {
    const name = document.getElementById('addContactName').value.trim();
    if (!name) { Components.showToast('Vui lòng nhập họ và tên liên hệ', 'warning'); return; }
    const position = document.getElementById('addContactPosition').value.trim();
    const email = document.getElementById('addContactEmail').value.trim();
    const phone = document.getElementById('addContactPhone').value.trim();

    try {
      await Store.updateCustomerContact(contactId, { name, position, email, phone });
      Components.showToast('Đã cập nhật liên hệ thành công', 'success');
      this.switchTab('contacts', customerId);
    } catch(e) {
      Components.showToast('Lỗi cập nhật: ' + e.message, 'error');
    }
  },

  async saveContact(customerId) {
    const name = document.getElementById('addContactName').value.trim();
    if (!name) { Components.showToast('Vui lòng nhập họ và tên liên hệ', 'warning'); return; }
    const position = document.getElementById('addContactPosition').value.trim();
    const email = document.getElementById('addContactEmail').value.trim();
    const phone = document.getElementById('addContactPhone').value.trim();

    try {
      await Store.addCustomerContact({ customerId, name, position, email, phone });
      Components.showToast('Đã thêm liên hệ mới', 'success');
      this.switchTab('contacts', customerId);
    } catch(e) {
      Components.showToast('Lỗi thêm liên hệ: ' + e.message, 'error');
    }
  },

  async deleteContact(contactId, customerId) {
    Components.showConfirm('Xác nhận xóa', 'Bạn có muốn xóa liên hệ này?', async () => {
      try {
        await Store.deleteCustomerContact(contactId);
        Components.showToast('Đã xóa liên hệ', 'success');
        this.switchTab('contacts', customerId);
      } catch(e) {
        Components.showToast('Lỗi khi xóa: ' + e.message, 'error');
      }
    });
  },

  async renderServiceTab(container, customerId) {
    const services = await Store.getCustomerServices(customerId);
    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <div style="font-weight:600; font-size:14px;">Xác nhận dịch vụ</div>
        <button type="button" class="btn btn-primary btn-sm" style="font-size:12px;" onclick="window.Pages.Customers.toggleInlineForm('service')">Lập xác nhận</button>
      </div>

      <div id="serviceInlineForm" style="display:none; background:var(--bg-tertiary); padding:16px; border-radius:6px; border:1px solid var(--border-color); margin-bottom:16px;">
        <h4 style="margin-top:0; margin-bottom:12px; font-size:14px;">Xác nhận dịch vụ mới</h4>
        <div class="form-row">
          <div class="form-group" style="margin-bottom:8px;">
            <label class="form-label" style="font-size:12px;">Mã dịch vụ *</label>
            <input type="text" id="addServiceCode" class="form-input" style="font-size:13px; padding:6px 10px;" placeholder="Ví dụ: SVC-2026-001">
          </div>
          <div class="form-group" style="margin-bottom:8px;">
            <label class="form-label" style="font-size:12px;">Tên dịch vụ / Gói *</label>
            <input type="text" id="addServiceName" class="form-input" style="font-size:13px; padding:6px 10px;" placeholder="Tên dịch vụ triển khai">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group" style="margin-bottom:8px;">
            <label class="form-label" style="font-size:12px;">Ngày xác nhận *</label>
            <input type="date" id="addServiceDate" class="form-input" style="font-size:13px; padding:6px 10px;" value="${Utils.getCurrentDate()}">
          </div>
          <div class="form-group" style="margin-bottom:8px;">
            <label class="form-label" style="font-size:12px;">Trạng thái</label>
            <select id="addServiceStatus" class="form-input" style="font-size:13px; padding:6px 10px;">
              <option value="pending">Chờ thực hiện</option>
              <option value="running">Đang thực hiện</option>
              <option value="completed">Đã hoàn thành</option>
            </select>
          </div>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:8px;">
          <button type="button" class="btn btn-ghost btn-sm" onclick="window.Pages.Customers.toggleInlineForm('service')">Hủy</button>
          <button type="button" class="btn btn-primary btn-sm" onclick="window.Pages.Customers.saveService('${customerId}')">Lưu xác nhận</button>
        </div>
      </div>

      <table class="data-table" style="font-size:13px;">
        <thead>
          <tr>
            <th>Mã dịch vụ</th>
            <th>Tên dịch vụ / gói</th>
            <th>Ngày xác nhận</th>
            <th>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          ${services.length === 0 ? `
            <tr><td colspan="4" style="text-align:center; padding:16px;" class="text-secondary">Chưa có xác nhận dịch vụ nào.</td></tr>
          ` : services.map(s => {
            const statusMap = {
              'pending': { label: 'Chờ thực hiện', variant: 'warning' },
              'running': { label: 'Đang thực hiện', variant: 'info' },
              'completed': { label: 'Đã hoàn thành', variant: 'success' }
            };
            const badge = statusMap[s.status] || { label: s.status, variant: 'secondary' };
            return `
              <tr>
                <td style="font-weight:600; color:#0066cc;">${s.code}</td>
                <td>${s.name}</td>
                <td>${Utils.formatDate(s.confirmDate)}</td>
                <td>${Components.createBadge(badge.label, badge.variant)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  },

  async saveService(customerId) {
    const code = document.getElementById('addServiceCode').value.trim();
    const name = document.getElementById('addServiceName').value.trim();
    const confirmDate = document.getElementById('addServiceDate').value;
    const status = document.getElementById('addServiceStatus').value;

    if (!code || !name) { Components.showToast('Vui lòng điền mã và tên dịch vụ', 'warning'); return; }

    try {
      await Store.addCustomerService({ customerId, code, name, confirmDate, status });
      Components.showToast('Đã lập xác nhận dịch vụ', 'success');
      this.switchTab('service', customerId);
    } catch(e) {
      Components.showToast('Lỗi lập dịch vụ: ' + e.message, 'error');
    }
  },

  async renderQuoteTab(container, customerId) {
    const quotes = await Store.getCustomerQuotes(customerId);
    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <div style="font-weight:600; font-size:14px;">Báo giá đã gửi</div>
        <button type="button" class="btn btn-primary btn-sm" style="font-size:12px;" onclick="window.Pages.Customers.toggleInlineForm('quote')">Tạo báo giá</button>
      </div>

      <div id="quoteInlineForm" style="display:none; background:var(--bg-tertiary); padding:16px; border-radius:6px; border:1px solid var(--border-color); margin-bottom:16px;">
        <h4 style="margin-top:0; margin-bottom:12px; font-size:14px;">Báo giá mới</h4>
        <div class="form-row">
          <div class="form-group" style="margin-bottom:8px;">
            <label class="form-label" style="font-size:12px;">Số báo giá *</label>
            <input type="text" id="addQuoteCode" class="form-input" style="font-size:13px; padding:6px 10px;" placeholder="Ví dụ: QT-2026-001">
          </div>
          <div class="form-group" style="margin-bottom:8px;">
            <label class="form-label" style="font-size:12px;">Tiêu đề báo giá *</label>
            <input type="text" id="addQuoteTitle" class="form-input" style="font-size:13px; padding:6px 10px;" placeholder="Ví dụ: Báo giá ERP">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group" style="margin-bottom:8px;">
            <label class="form-label" style="font-size:12px;">Trị giá báo giá *</label>
            <input type="number" id="addQuoteValue" class="form-input" style="font-size:13px; padding:6px 10px;" value="0">
          </div>
          <div class="form-group" style="margin-bottom:8px;">
            <label class="form-label" style="font-size:12px;">Hạn hiệu lực</label>
            <input type="date" id="addQuoteValid" class="form-input" style="font-size:13px; padding:6px 10px;">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group" style="margin-bottom:8px;">
            <label class="form-label" style="font-size:12px;">Trạng thái</label>
            <select id="addQuoteStatus" class="form-input" style="font-size:13px; padding:6px 10px;">
              <option value="draft">Bản nháp</option>
              <option value="sent">Đã gửi</option>
              <option value="accepted">Đã chấp nhận</option>
              <option value="rejected">Từ chối</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom:8px;"></div>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:8px;">
          <button type="button" class="btn btn-ghost btn-sm" onclick="window.Pages.Customers.toggleInlineForm('quote')">Hủy</button>
          <button type="button" class="btn btn-primary btn-sm" onclick="window.Pages.Customers.saveQuote('${customerId}')">Lưu báo giá</button>
        </div>
      </div>

      <table class="data-table" style="font-size:13px;">
        <thead>
          <tr>
            <th>Số báo giá</th>
            <th>Tiêu đề</th>
            <th>Trị giá báo giá</th>
            <th>Hạn hiệu lực</th>
            <th>Trạng thái</th>
            <th style="text-align:right;">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          ${quotes.length === 0 ? `
            <tr><td colspan="6" style="text-align:center; padding:16px;" class="text-secondary">Chưa có báo giá nào.</td></tr>
          ` : quotes.map(q => {
            const statusMap = {
              'draft': { label: 'Bản nháp', variant: 'secondary' },
              'sent': { label: 'Đã gửi', variant: 'info' },
              'accepted': { label: 'Đã chấp nhận', variant: 'success' },
              'rejected': { label: 'Từ chối', variant: 'danger' }
            };
            const badge = statusMap[q.status] || { label: q.status, variant: 'secondary' };
            return `
              <tr>
                <td style="font-weight:600; color:#0066cc;">${q.code}</td>
                <td>${q.title}</td>
                <td style="font-weight:600;">${Utils.formatCurrency(q.value)}</td>
                <td>${q.validUntil ? Utils.formatDate(q.validUntil) : '—'}</td>
                <td>${Components.createBadge(badge.label, badge.variant)}</td>
                <td style="text-align:right;">
                  <button type="button" class="btn btn-ghost btn-sm" style="color:var(--color-danger); padding:2px;" onclick="window.Pages.Customers.deleteQuote('${q.id}', '${customerId}')">Xóa</button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  },

  async saveQuote(customerId) {
    const code = document.getElementById('addQuoteCode').value.trim();
    const title = document.getElementById('addQuoteTitle').value.trim();
    const value = document.getElementById('addQuoteValue').value;
    const validUntil = document.getElementById('addQuoteValid').value;
    const status = document.getElementById('addQuoteStatus').value;

    if (!code || !title) { Components.showToast('Vui lòng điền số và tiêu đề báo giá', 'warning'); return; }

    try {
      await Store.addCustomerQuote({ customerId, code, title, value, validUntil, status });
      Components.showToast('Đã tạo báo giá thành công', 'success');
      this.switchTab('quote', customerId);
    } catch(e) {
      Components.showToast('Lỗi tạo báo giá: ' + e.message, 'error');
    }
  },

  async deleteQuote(quoteId, customerId) {
    Components.showConfirm('Xác nhận xóa', 'Bạn có muốn xóa báo giá này?', async () => {
      try {
        await Store.deleteCustomerQuote(quoteId);
        Components.showToast('Đã xóa báo giá thành công', 'success');
        this.switchTab('quote', customerId);
      } catch(e) {
        Components.showToast('Lỗi khi xóa: ' + e.message, 'error');
      }
    });
  },

  async renderOrderTab(container, customerId) {
    const orders = await Store.getCustomerOrders(customerId);
    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <div style="font-weight:600; font-size:14px;">Đơn hàng đã ký</div>
        <button type="button" class="btn btn-primary btn-sm" style="font-size:12px;" onclick="window.Pages.Customers.toggleInlineForm('order')">Tạo đơn hàng</button>
      </div>

      <div id="orderInlineForm" style="display:none; background:var(--bg-tertiary); padding:16px; border-radius:6px; border:1px solid var(--border-color); margin-bottom:16px;">
        <h4 style="margin-top:0; margin-bottom:12px; font-size:14px;">Đơn hàng mới</h4>
        <div class="form-row">
          <div class="form-group" style="margin-bottom:8px;">
            <label class="form-label" style="font-size:12px;">Số đơn hàng *</label>
            <input type="text" id="addOrderCode" class="form-input" style="font-size:13px; padding:6px 10px;" placeholder="Ví dụ: ORD-2026-001">
          </div>
          <div class="form-group" style="margin-bottom:8px;">
            <label class="form-label" style="font-size:12px;">Ngày ký đơn *</label>
            <input type="date" id="addOrderDate" class="form-input" style="font-size:13px; padding:6px 10px;" value="${Utils.getCurrentDate()}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group" style="margin-bottom:8px;">
            <label class="form-label" style="font-size:12px;">Tổng trị giá đơn *</label>
            <input type="number" id="addOrderValue" class="form-input" style="font-size:13px; padding:6px 10px;" value="0">
          </div>
          <div class="form-group" style="margin-bottom:8px;">
            <label class="form-label" style="font-size:12px;">Trạng thái</label>
            <select id="addOrderStatus" class="form-input" style="font-size:13px; padding:6px 10px;">
              <option value="pending">Đang xử lý</option>
              <option value="completed">Đã hoàn thành</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:8px;">
          <button type="button" class="btn btn-ghost btn-sm" onclick="window.Pages.Customers.toggleInlineForm('order')">Hủy</button>
          <button type="button" class="btn btn-primary btn-sm" onclick="window.Pages.Customers.saveOrder('${customerId}')">Lưu đơn hàng</button>
        </div>
      </div>

      <table class="data-table" style="font-size:13px;">
        <thead>
          <tr>
            <th>Số đơn hàng</th>
            <th>Ngày ký</th>
            <th>Tổng trị giá</th>
            <th>Trạng thái</th>
            <th style="text-align:right;">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          ${orders.length === 0 ? `
            <tr><td colspan="5" style="text-align:center; padding:16px;" class="text-secondary">Chưa có đơn hàng nào.</td></tr>
          ` : orders.map(o => {
            const statusMap = {
              'pending': { label: 'Đang xử lý', variant: 'info' },
              'completed': { label: 'Đã hoàn thành', variant: 'success' },
              'cancelled': { label: 'Đã hủy', variant: 'danger' }
            };
            const badge = statusMap[o.status] || { label: o.status, variant: 'secondary' };
            return `
              <tr>
                <td style="font-weight:600; color:#0066cc;">${o.code}</td>
                <td>${Utils.formatDate(o.orderDate)}</td>
                <td style="font-weight:600;">${Utils.formatCurrency(o.value)}</td>
                <td>${Components.createBadge(badge.label, badge.variant)}</td>
                <td style="text-align:right;">
                  <button type="button" class="btn btn-ghost btn-sm" style="color:var(--color-danger); padding:2px;" onclick="window.Pages.Customers.deleteOrder('${o.id}', '${customerId}')">Xóa</button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  },

  async saveOrder(customerId) {
    const code = document.getElementById('addOrderCode').value.trim();
    const orderDate = document.getElementById('addOrderDate').value;
    const value = document.getElementById('addOrderValue').value;
    const status = document.getElementById('addOrderStatus').value;

    if (!code) { Components.showToast('Vui lòng điền số đơn hàng', 'warning'); return; }

    try {
      await Store.addCustomerOrder({ customerId, code, orderDate, value, status });
      Components.showToast('Đã tạo đơn hàng thành công', 'success');
      this.switchTab('order', customerId);
    } catch(e) {
      Components.showToast('Lỗi tạo đơn hàng: ' + e.message, 'error');
    }
  },

  async deleteOrder(orderId, customerId) {
    Components.showConfirm('Xác nhận xóa', 'Bạn có muốn xóa đơn hàng này?', async () => {
      try {
        await Store.deleteCustomerOrder(orderId);
        Components.showToast('Đã xóa đơn hàng thành công', 'success');
        this.switchTab('order', customerId);
      } catch(e) {
        Components.showToast('Lỗi khi xóa: ' + e.message, 'error');
      }
    });
  },

  async renderLogsTab(container, customerId) {
    const logs = await Store.getCustomerLogs(customerId);
    container.innerHTML = `
      <div style="font-weight:600; font-size:14px; margin-bottom:12px;">Lịch sử thay đổi gần đây</div>
      <div style="display:flex; flex-direction:column; gap:12px; font-size:13px;">
        ${logs.length === 0 ? `
          <div style="color:var(--text-secondary); font-style:italic;">Chưa ghi nhận lịch sử thay đổi nào.</div>
        ` : logs.map(log => {
          let color = '#cbd5e1';
          if (log.action.includes('trạng thái')) color = '#0066cc';
          else if (log.action.includes('Tạo khách hàng')) color = '#10b981';
          else if (log.action.includes('ghi chú')) color = '#f59e0b';
          
          return `
            <div style="display:flex; align-items:start; gap:12px;">
              <div style="width:8px; height:8px; border-radius:50%; background:${color}; margin-top:5px; flex-shrink:0;"></div>
              <div>
                <div style="font-weight:600;">${log.action}</div>
                <div style="color:var(--text-secondary); font-size:11px; margin-top:2px;">Bởi ${log.created_by} lúc ${Utils.formatDateTime(log.createdAt)}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  unmount() {}
};
