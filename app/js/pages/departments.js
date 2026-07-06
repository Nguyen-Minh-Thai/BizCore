window.Pages = window.Pages || {};
window.Pages.Departments = {
  render() {
    return `
      <div id="depts-content">
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
          <h1>Phòng ban</h1>
          <p>Quản lý cấu trúc tổ chức doanh nghiệp</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" onclick="window.Pages.Departments.showModal()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Thêm phòng ban
          </button>
        </div>
      </div>

      <div class="tabs-header" id="deptTabs">
        <!-- Tabs rendered via JS -->
      </div>
      <div id="deptTabContent"></div>
    `;
  },

  async mount() {
    const container = document.getElementById('depts-content');
    if (!container) return;
    try {
      container.innerHTML = await this._renderContent();
      
      Components.renderTabs('deptTabs', [
        { id: 'grid', label: 'Danh sách phòng ban', render: () => '<div id="deptGridArea"></div>', onMount: () => this.renderGrid() },
        { id: 'org', label: 'Sơ đồ tổ chức', render: () => '<div id="orgChartArea"></div>', onMount: () => this.renderOrgChart() }
      ]);
    } catch(e) {
      container.innerHTML = `<div class="empty-state"><p style="color:var(--color-danger)">Lỗi tải dữ liệu: ${e.message}</p></div>`;
    }
  },

  async renderGrid() {
    const area = document.getElementById('deptGridArea');
    if (!area) return;
    
    try {
      const depts = await Store.getDepartments();
      const emps = await Store.getEmployees();

      if (depts.length === 0) {
        area.innerHTML = '<div class="empty-state"><p class="text-secondary">Chưa có phòng ban nào</p></div>';
        return;
      }

      area.innerHTML = `
        <div class="dept-grid">
          ${depts.map(dept => {
            const deptEmps = emps.filter(e => e.departmentId === dept.id);
            const manager = dept.managerId ? emps.find(e => e.id === dept.managerId) : null;
            
            return `
              <div class="dept-card">
                <div class="dept-card-header">
                  <div class="dept-card-name">${dept.name}</div>
                  <div class="badge badge-secondary">${deptEmps.length} nhân viên</div>
                </div>
                <div style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;min-height:38px;">
                  ${dept.description || 'Chưa có mô tả'}
                </div>
                <div style="border-top:1px solid var(--border-color);padding-top:16px;">
                  <div class="dept-card-manager">
                    Trưởng phòng: 
                    ${manager ? `<strong style="color:var(--text-primary)">${manager.name}</strong>` : '<span style="font-style:italic">Chưa bổ nhiệm</span>'}
                  </div>
                </div>
                <div style="margin-top:16px;display:flex;gap:8px;">
                  <button class="btn btn-secondary btn-sm" onclick="window.Pages.Departments.showModal('${dept.id}')">Sửa</button>
                  <button class="btn btn-ghost btn-sm" style="color:var(--color-danger)" onclick="window.Pages.Departments.deleteDept('${dept.id}')">Xóa</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } catch(e) {
      area.innerHTML = `<div class="empty-state"><p style="color:var(--color-danger)">Lỗi tải dữ liệu: ${e.message}</p></div>`;
    }
  },

  async renderOrgChart() {
    const area = document.getElementById('orgChartArea');
    if (!area) return;
    
    try {
      const depts = await Store.getDepartments();
      const emps = await Store.getEmployees();
      
      area.innerHTML = `
        <div class="card p-6" style="min-height:400px;">
          <div style="text-align:center;margin-bottom:32px;">
            <div style="display:inline-block;padding:12px 24px;background:var(--accent-gradient);border-radius:8px;font-weight:600;color:#fff;">
              Ban Giám Đốc
            </div>
          </div>
          <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:32px;position:relative;">
            ${depts.map(dept => {
              const manager = dept.managerId ? emps.find(e => e.id === dept.managerId) : null;
              return `
                <div style="text-align:center;width:200px;">
                  <div style="padding:12px;background:var(--bg-tertiary);border:1px solid var(--border-color);border-radius:8px;margin-bottom:12px;">
                    <div style="font-weight:600;margin-bottom:4px;color:var(--text-accent)">${dept.name}</div>
                    <div style="font-size:12px;">${manager ? manager.name : 'Trống'}</div>
                  </div>
                  <div class="badge badge-secondary">${emps.filter(e => e.departmentId === dept.id).length} NV</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    } catch(e) {
      area.innerHTML = `<div class="empty-state"><p style="color:var(--color-danger)">Lỗi tải dữ liệu: ${e.message}</p></div>`;
    }
  },

  async showModal(id = null) {
    let dept = null;
    let depts = [];
    let emps = [];
    try {
      if (id) dept = await Store.getDepartment(id);
      emps = await Store.getEmployees();
    } catch(e) {
      Components.showToast('Lỗi: ' + e.message, 'error');
      return;
    }
    
    // Only show active employees for manager dropdown
    const activeEmps = emps.filter(e => e.status === 'active');
    const empOptions = activeEmps.map(e => `<option value="${e.id}" ${dept && dept.managerId === e.id ? 'selected' : ''}>${e.name}</option>`).join('');

    const content = `
      <form id="deptForm" onsubmit="event.preventDefault(); window.Pages.Departments.saveDept('${id || ''}')">
        <div class="form-group">
          <label class="form-label">Tên phòng ban *</label>
          <input type="text" id="deptName" class="form-input" required value="${dept ? dept.name : ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Trưởng phòng</label>
          <select id="deptManager" class="form-input">
            <option value="">-- Chưa bổ nhiệm --</option>
            ${empOptions}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Mô tả</label>
          <textarea id="deptDesc" class="form-input">${dept ? (dept.description || '') : ''}</textarea>
        </div>
      </form>
    `;

    Components.showModal({
      id: 'deptModal',
      title: id ? 'Sửa thông tin phòng ban' : 'Thêm phòng ban mới',
      content: content,
      size: 'sm',
      footer: `
        <button class="btn btn-ghost" onclick="Components.closeModal()">Hủy</button>
        <button class="btn btn-primary" onclick="document.getElementById('deptForm').dispatchEvent(new Event('submit'))">Lưu</button>
      `
    });
  },

  async saveDept(id) {
    const data = {
      name: document.getElementById('deptName').value,
      managerId: document.getElementById('deptManager').value || null,
      description: document.getElementById('deptDesc').value
    };

    try {
      if (id) {
        await Store.updateDepartment(id, data);
        Components.showToast('Đã cập nhật phòng ban', 'success');
      } else {
        await Store.addDepartment(data);
        Components.showToast('Đã thêm phòng ban mới', 'success');
      }
      Components.closeModal('deptModal');
      this.renderGrid();
    } catch(e) {
      Components.showToast('Lỗi lưu dữ liệu: ' + e.message, 'error');
    }
  },

  async deleteDept(id) {
    try {
      const emps = await Store.getEmployees({ departmentId: id });
      if (emps.length > 0) {
        Components.showToast(`Không thể xóa! Có ${emps.length} nhân viên đang thuộc phòng này.`, 'error');
        return;
      }

      Components.showConfirm('Xác nhận xóa', 'Bạn có chắc chắn muốn xóa phòng ban này?', async () => {
        try {
          await Store.deleteDepartment(id);
          Components.showToast('Đã xóa phòng ban', 'success');
          this.renderGrid();
        } catch(e) {
          Components.showToast('Lỗi xóa dữ liệu: ' + e.message, 'error');
        }
      });
    } catch(e) {
      Components.showToast('Lỗi: ' + e.message, 'error');
    }
  },

  unmount() {}
};
