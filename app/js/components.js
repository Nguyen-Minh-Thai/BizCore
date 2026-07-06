/* ===== BizCore ERP - Reusable UI Components ===== */
window.Components = {
  // ===== MODAL =====
  showModal({ title, content, size = 'md', footer = '', onClose }) {
    const container = document.getElementById('modalContainer');
    container.innerHTML = `
      <div class="modal-overlay" id="modalOverlay">
        <div class="modal modal-${size}">
          <div class="modal-header">
            <h3>${title}</h3>
            <button class="modal-close" id="modalCloseBtn">&times;</button>
          </div>
          <div class="modal-body">${content}</div>
          ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
        </div>
      </div>`;
    const close = () => { container.innerHTML = ''; if (onClose) onClose(); };
    document.getElementById('modalCloseBtn').addEventListener('click', close);
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
      if (e.target.id === 'modalOverlay') close();
    });
    const onEsc = (e) => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onEsc); } };
    document.addEventListener('keydown', onEsc);
  },

  closeModal() {
    document.getElementById('modalContainer').innerHTML = '';
  },

  // ===== TOAST =====
  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span style="font-size:16px">${icons[type] || ''}</span> ${message}`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(20px)'; toast.style.transition = 'all 0.3s ease'; }, 3500);
    setTimeout(() => toast.remove(), 4000);
  },

  // ===== CONFIRM =====
  showConfirm(message, onConfirm) {
    this.showModal({
      title: 'Xác nhận',
      content: `<p style="font-size:var(--font-base);color:var(--text-secondary)">${message}</p>`,
      size: 'sm',
      footer: `<button class="btn btn-ghost" id="confirmCancel">Hủy</button>
               <button class="btn btn-danger" id="confirmOk">Xác nhận</button>`
    });
    document.getElementById('confirmCancel').addEventListener('click', () => this.closeModal());
    document.getElementById('confirmOk').addEventListener('click', () => { this.closeModal(); if (onConfirm) onConfirm(); });
  },

  // ===== STAT CARD (returns HTML string) =====
  createStatCard({ title, value, icon, trend, trendValue, color = '#6366f1' }) {
    const trendHtml = trend ? `<div class="stat-card-trend ${trend}">${trend === 'up' ? '↑' : '↓'} ${trendValue || ''}</div>` : '';
    return `
      <div class="stat-card">
        <div class="stat-card-header">
          <div>
            <div class="stat-card-value">${value}</div>
            <div class="stat-card-label">${title}</div>
            ${trendHtml}
          </div>
          <div class="stat-card-icon" style="background:${color}22">
            ${icon || ''}
          </div>
        </div>
      </div>`;
  },

  // ===== DATA TABLE =====
  renderTable(containerId, options) {
    const {
      columns, data, searchable = true, searchPlaceholder = 'Tìm kiếm...',
      pagination = true, perPage = 10, onRowClick, actions, emptyMessage = 'Không có dữ liệu'
    } = options;

    const container = document.getElementById(containerId);
    if (!container) return;

    let currentPage = 1;
    let searchTerm = '';
    let sortKey = null;
    let sortDir = 'asc';

    const render = () => {
      let filtered = [...data];
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        filtered = filtered.filter(row =>
          columns.some(col => {
            const val = row[col.key];
            return val && String(val).toLowerCase().includes(s);
          })
        );
      }
      if (sortKey) filtered = Utils.sortBy(filtered, sortKey, sortDir);

      const paged = pagination ? Utils.paginate(filtered, currentPage, perPage) : { data: filtered, total: filtered.length, totalPages: 1, currentPage: 1 };

      let html = '<div class="table-container">';

      // Toolbar
      if (searchable || actions) {
        html += '<div class="table-toolbar">';
        if (searchable) {
          html += `<div class="table-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="${searchPlaceholder}" value="${searchTerm}" id="${containerId}_search">
          </div>`;
        }
        html += `<div class="table-info">${paged.total} kết quả</div>`;
        html += '</div>';
      }

      if (paged.data.length === 0) {
        html += this.createEmptyState(emptyMessage);
      } else {
        html += '<table class="data-table"><thead><tr>';
        columns.forEach(col => {
          const sortable = col.sortable !== false;
          const isSorted = sortKey === col.key;
          html += `<th ${sortable ? `class="sortable" data-key="${col.key}"` : ''} ${col.width ? `style="width:${col.width}"` : ''}>
            ${col.label} ${isSorted ? (sortDir === 'asc' ? '↑' : '↓') : ''}
          </th>`;
        });
        if (actions) html += '<th style="width:120px">Thao tác</th>';
        html += '</tr></thead><tbody>';

        paged.data.forEach((row, idx) => {
          html += `<tr ${onRowClick ? `style="cursor:pointer" data-row-idx="${idx}"` : ''}>`;
          columns.forEach(col => {
            const val = row[col.key];
            html += `<td>${col.render ? col.render(val, row) : (val != null ? val : '—')}</td>`;
          });
          if (actions) {
            html += '<td><div class="table-actions">';
            actions.forEach((action, ai) => {
              html += `<button class="btn btn-ghost btn-sm table-action-btn" data-action="${ai}" data-id="${row.id}" title="${action.label}">${action.icon || action.label}</button>`;
            });
            html += '</div></td>';
          }
          html += '</tr>';
        });
        html += '</tbody></table>';
      }

      // Pagination
      if (pagination && paged.totalPages > 1) {
        html += '<div class="table-pagination">';
        html += `<button ${paged.currentPage <= 1 ? 'disabled' : ''} data-page="${paged.currentPage - 1}">‹</button>`;
        for (let p = 1; p <= paged.totalPages; p++) {
          if (paged.totalPages > 7 && Math.abs(p - paged.currentPage) > 2 && p !== 1 && p !== paged.totalPages) {
            if (p === 2 || p === paged.totalPages - 1) html += '<button disabled>…</button>';
            continue;
          }
          html += `<button class="${p === paged.currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
        }
        html += `<button ${paged.currentPage >= paged.totalPages ? 'disabled' : ''} data-page="${paged.currentPage + 1}">›</button>`;
        html += '</div>';
      }

      html += '</div>';
      container.innerHTML = html;

      // Events
      const searchInput = document.getElementById(`${containerId}_search`);
      if (searchInput) {
        searchInput.addEventListener('input', Utils.debounce((e) => {
          searchTerm = e.target.value; currentPage = 1; render();
        }, 250));
      }

      container.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', () => {
          const key = th.dataset.key;
          if (sortKey === key) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
          else { sortKey = key; sortDir = 'asc'; }
          render();
        });
      });

      container.querySelectorAll('.table-pagination button[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
          const p = parseInt(btn.dataset.page);
          if (p >= 1 && p <= paged.totalPages) { currentPage = p; render(); }
        });
      });

      if (actions) {
        container.querySelectorAll('.table-action-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const ai = parseInt(btn.dataset.action);
            const id = btn.dataset.id;
            const row = data.find(r => r.id === id);
            if (row && actions[ai]?.onClick) actions[ai].onClick(row);
          });
        });
      }

      if (onRowClick) {
        container.querySelectorAll('tbody tr[data-row-idx]').forEach(tr => {
          tr.addEventListener('click', () => {
            const idx = parseInt(tr.dataset.rowIdx);
            onRowClick(paged.data[idx]);
          });
        });
      }
    };

    render();
    return { refresh: render };
  },

  // ===== BADGE =====
  createBadge(text, variant = 'secondary') {
    return `<span class="badge badge-${variant}">${text}</span>`;
  },

  // ===== FORM =====
  renderForm(containerId, options) {
    const { fields, onSubmit, submitText = 'Lưu', values = {} } = options;
    const container = document.getElementById(containerId);
    if (!container) return;

    let html = '<form id="dynamicForm">';
    let inRow = false;

    fields.forEach((field, i) => {
      const val = values[field.name] != null ? values[field.name] : (field.value || '');
      const required = field.required ? 'required' : '';
      const nextField = fields[i + 1];

      if (field.half && !inRow) { html += '<div class="form-row">'; inRow = true; }

      html += `<div class="form-group">
        <label class="form-label">${field.label}${field.required ? ' *' : ''}</label>`;

      if (field.type === 'select') {
        html += `<select class="form-input" name="${field.name}" ${required}>
          <option value="">-- Chọn --</option>
          ${(field.options || []).map(o => `<option value="${o.value}" ${val == o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
        </select>`;
      } else if (field.type === 'textarea') {
        html += `<textarea class="form-input" name="${field.name}" placeholder="${field.placeholder || ''}" ${required}>${val}</textarea>`;
      } else {
        html += `<input class="form-input" type="${field.type || 'text'}" name="${field.name}" value="${val}" placeholder="${field.placeholder || ''}" ${required}>`;
      }

      html += '</div>';

      if (inRow && (!nextField || !nextField.half)) { html += '</div>'; inRow = false; }
    });

    html += `<div style="margin-top:var(--space-6);display:flex;justify-content:flex-end;gap:var(--space-3)">
      <button type="button" class="btn btn-ghost" onclick="Components.closeModal()">Hủy</button>
      <button type="submit" class="btn btn-primary">${submitText}</button>
    </div></form>`;

    container.innerHTML = html;

    document.getElementById('dynamicForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = {};
      const fd = new FormData(e.target);
      fd.forEach((v, k) => { formData[k] = v; });
      // Convert number fields
      fields.forEach(f => {
        if (f.type === 'number' && formData[f.name]) formData[f.name] = parseFloat(formData[f.name]);
      });
      if (onSubmit) onSubmit(formData);
    });
  },

  // ===== TABS =====
  renderTabs(containerId, tabs) {
    const container = document.getElementById(containerId);
    if (!container) return;
    // Chống lỗi bố cục: nếu container vô tình mang class tabs-header (flex) thì gỡ đi,
    // vì renderTabs tự tạo .tabs-header + .tab-content bên trong.
    container.classList.remove('tabs-header');
    container.style.display = 'block';

    let html = '<div class="tabs-header">';
    tabs.forEach((tab, i) => {
      html += `<button class="tab-btn ${i === 0 ? 'active' : ''}" data-tab="${tab.id}">${tab.label}</button>`;
    });
    html += '</div>';
    html += `<div class="tab-content" id="${containerId}_tabContent"></div>`;
    container.innerHTML = html;

    const renderTab = (tabId) => {
      const tab = tabs.find(t => t.id === tabId);
      if (!tab) return;
      const contentEl = document.getElementById(`${containerId}_tabContent`);
      contentEl.innerHTML = tab.render();
      if (tab.onMount) tab.onMount();
      container.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
      });
    };

    container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => renderTab(btn.dataset.tab));
    });

    renderTab(tabs[0].id);
  },

  // ===== EMPTY STATE =====
  createEmptyState(message, iconSvg) {
    const icon = iconSvg || '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>';
    return `<div class="empty-state">${icon}<p>${message}</p></div>`;
  },

  // ===== LOADING =====
  createLoading() {
    return '<div class="loading-spinner"></div>';
  }
};
