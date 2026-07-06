window.Pages = window.Pages || {};
window.Pages.Deals = {
  render() {
    return `
      <div id="deals-content">
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
          <h1>Pipeline Bán hàng</h1>
          <p>Quản lý các cơ hội bán hàng theo dạng Kanban</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" onclick="window.Pages.Deals.showModal()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Thêm Deal mới
          </button>
        </div>
      </div>

      <div id="salesFunnel"></div>

      <div class="kanban-board" id="kanbanBoard">
        <!-- Rendered via JS -->
      </div>
    `;
  },

  async mount() {
    const container = document.getElementById('deals-content');
    if (!container) return;
    try {
      container.innerHTML = await this._renderContent();
      await this.loadData();
    } catch(e) {
      container.innerHTML = `<div class="empty-state"><p style="color:var(--color-danger)">Lỗi tải dữ liệu: ${e.message}</p></div>`;
    }
  },

  async loadData() {
    try {
      this.deals = await Store.getDeals();
      this.customers = await Store.getCustomers();
      this.renderKanban();
    } catch(e) {
      Components.showToast('Lỗi: ' + e.message, 'error');
    }
  },

  renderKanban() {
    const board = document.getElementById('kanbanBoard');
    if (!board) return;

    const stages = [
      { id: 'lead', name: 'Lead / Mới', color: 'var(--text-secondary)' },
      { id: 'qualified', name: 'Đã đánh giá', color: 'var(--color-info)' },
      { id: 'proposal', name: 'Báo giá', color: 'var(--color-warning)' },
      { id: 'negotiation', name: 'Đàm phán', color: '#fb923c' },
      { id: 'won', name: 'Thành công (Won)', color: 'var(--color-success)' },
      { id: 'lost', name: 'Thất bại (Lost)', color: 'var(--color-danger)' }
    ];

    let html = '';

    stages.forEach(stage => {
      const stageDeals = this.deals.filter(d => d.stage === stage.id);
      const totalValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);

      const cardsHtml = stageDeals.map(deal => {
        const cus = this.customers.find(c => c.id === deal.customerId);
        const stale = this._isStale(deal);
        return `
          <div class="kanban-card${stale ? ' stale' : ''}" draggable="true" ondragstart="window.Pages.Deals.onDragStart(event, '${deal.id}')" onclick="window.Pages.Deals.showModal('${deal.id}')" ${stale ? 'style="border-left:3px solid var(--color-danger)"' : ''}>
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
              <div class="kanban-card-title">${deal.title}</div>
              ${stale ? '<span style="flex:none;font-size:10px;font-weight:700;color:var(--color-danger);background:var(--color-danger-bg);padding:2px 6px;border-radius:5px;white-space:nowrap;">⚠ Ngâm</span>' : ''}
            </div>
            <div class="kanban-card-customer">${cus ? cus.name : 'Chưa gán khách'}</div>
            <div class="kanban-card-value">${Utils.formatCurrency(deal.value || 0)}</div>
            <div class="kanban-card-footer">
              <span${stale ? ' style="color:var(--color-danger);font-weight:600;"' : ''}>${deal.expectedCloseDate ? Utils.formatDate(deal.expectedCloseDate) : 'Chưa có ngày'}</span>
            </div>
          </div>
        `;
      }).join('');

      html += `
        <div class="kanban-column" ondragover="window.Pages.Deals.onDragOver(event)" ondrop="window.Pages.Deals.onDrop(event, '${stage.id}')">
          <div class="kanban-column-header" style="border-top: 3px solid ${stage.color}">
            <div style="display:flex;align-items:center;gap:8px;">
              <span>${stage.name}</span>
              <span class="deal-count">${stageDeals.length}</span>
            </div>
            <div class="deal-total">${Utils.formatCurrency(totalValue)}</div>
          </div>
          <div class="kanban-cards">
            ${cardsHtml}
          </div>
        </div>
      `;
    });

    board.innerHTML = html;
    const funnelEl = document.getElementById('salesFunnel');
    if (funnelEl) funnelEl.innerHTML = this._renderFunnel();
  },

  _isStale(deal) {
    if (!deal || deal.stage === 'won' || deal.stage === 'lost') return false;
    const today = new Date(Utils.getCurrentDate());
    if (deal.expectedCloseDate && new Date(deal.expectedCloseDate) < today) return true;
    if (deal.createdAt && (Date.now() - new Date(deal.createdAt).getTime()) > 14 * 86400000) return true;
    return false;
  },

  _renderFunnel() {
    const order = ['lead', 'qualified', 'proposal', 'negotiation', 'won'];
    const names = { lead: 'Lead', qualified: 'Đánh giá', proposal: 'Báo giá', negotiation: 'Đàm phán', won: 'Thành công' };
    const idx = s => order.indexOf(s);
    const deals = this.deals || [];
    const nonLost = deals.filter(d => d.stage !== 'lost' && idx(d.stage) !== -1);
    const reached = order.map((s, i) => nonLost.filter(d => idx(d.stage) >= i).length);
    const lost = deals.filter(d => d.stage === 'lost').length;
    const top = reached[0] || 1;
    let leak = -1, leakPct = 0;
    for (let i = 0; i < order.length - 1; i++) {
      if (reached[i] > 0) { const drop = 1 - reached[i + 1] / reached[i]; if (drop > leakPct) { leakPct = drop; leak = i; } }
    }
    const rows = order.map((s, i) => {
      const w = Math.max(4, Math.round(reached[i] / top * 100));
      const conv = i === 0 ? 100 : (reached[i - 1] ? Math.round(reached[i] / reached[i - 1] * 100) : 0);
      const isLeak = (i - 1) === leak;
      return `<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
        <div style="width:80px;font-size:12.5px;color:var(--text-secondary);">${names[s]}</div>
        <div style="flex:1;background:var(--panel-2);border-radius:6px;height:26px;position:relative;overflow:hidden;">
          <div style="width:${w}%;height:100%;background:${s === 'won' ? 'var(--color-success)' : 'var(--brand)'};border-radius:6px;transition:width .5s;"></div>
          <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-family:var(--font-mono);font-size:12px;font-weight:600;color:#fff;">${reached[i]}</span>
        </div>
        <div style="width:130px;font-size:11.5px;text-align:right;${isLeak ? 'color:var(--color-danger);font-weight:700' : 'color:var(--text-muted)'};">${i > 0 ? `${conv}%${isLeak ? ' · lỗ hổng' : ''}` : '100% vào phễu'}</div>
      </div>`;
    }).join('');
    const leakNote = leak >= 0 ? `<div style="margin-top:10px;font-size:12.5px;color:var(--text-secondary);">Gợi ý: rơi rớt nhiều nhất ở bước <b style="color:var(--color-danger)">${names[order[leak]]} → ${names[order[leak + 1]]}</b> — đội kinh doanh nên tập trung cải thiện khâu này.</div>` : '';
    return `<div class="card" style="margin-bottom:20px;">
      <div class="card-header"><h3>Phễu chuyển đổi bán hàng</h3><span class="text-muted" style="font-size:12px;">${lost} deal thất bại</span></div>
      <div class="card-body">${rows}${leakNote}</div></div>`;
  },

  onDragStart(e, id) {
    e.dataTransfer.setData('dealId', id);
  },

  onDragOver(e) {
    e.preventDefault(); // allow drop
  },

  async onDrop(e, stageId) {
    e.preventDefault();
    const dealId = e.dataTransfer.getData('dealId');
    if (dealId) {
      const deal = this.deals.find(d => d.id === dealId);
      if (deal && deal.stage !== stageId) {
        // Optimistic update for UI feel
        deal.stage = stageId;
        this.renderKanban();
        
        try {
          await Store.updateDeal(dealId, { stage: stageId });
        } catch(err) {
          Components.showToast('Lỗi cập nhật trạng thái: ' + err.message, 'error');
          await this.loadData(); // Revert
        }
      }
    }
  },

  async showModal(id = null) {
    let deal = null;
    if (id) {
      deal = this.deals.find(d => d.id === id);
    }

    const cusOptions = this.customers.map(c => `<option value="${c.id}" ${deal && deal.customerId === c.id ? 'selected' : ''}>${c.name} ${c.company ? `(${c.company})` : ''}</option>`).join('');

    const content = `
      <form id="dealForm" onsubmit="event.preventDefault(); window.Pages.Deals.saveDeal('${id || ''}')">
        <div class="form-group">
          <label class="form-label">Tên Deal *</label>
          <input type="text" id="dealTitle" class="form-input" required value="${deal ? deal.title : ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Khách hàng *</label>
          <select id="dealCustomer" class="form-input" required>
            <option value="">-- Chọn khách hàng --</option>
            ${cusOptions}
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Giá trị dự kiến (VNĐ) *</label>
            <input type="number" id="dealValue" class="form-input" required min="0" step="1000000" value="${deal ? (deal.value || 0) : ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Trạng thái</label>
            <select id="dealStage" class="form-input">
              <option value="lead" ${deal && deal.stage === 'lead' ? 'selected' : ''}>Lead / Mới</option>
              <option value="qualified" ${deal && deal.stage === 'qualified' ? 'selected' : ''}>Đã đánh giá</option>
              <option value="proposal" ${deal && deal.stage === 'proposal' ? 'selected' : ''}>Báo giá</option>
              <option value="negotiation" ${deal && deal.stage === 'negotiation' ? 'selected' : ''}>Đàm phán</option>
              <option value="won" ${deal && deal.stage === 'won' ? 'selected' : ''}>Thành công (Won)</option>
              <option value="lost" ${deal && deal.stage === 'lost' ? 'selected' : ''}>Thất bại (Lost)</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Ngày dự kiến chốt (Close Date)</label>
          <input type="date" id="dealCloseDate" class="form-input" value="${deal && deal.expectedCloseDate ? deal.expectedCloseDate : ''}">
        </div>
        ${id ? `
          <div style="margin-top:24px;border-top:1px solid var(--border-color);padding-top:16px;text-align:right;">
            <button type="button" class="btn btn-ghost" style="color:var(--color-danger);" onclick="window.Pages.Deals.deleteDeal('${id}')">Xóa Deal</button>
          </div>
        ` : ''}
      </form>
    `;

    Components.showModal({
      id: 'dealModal',
      title: id ? 'Chi tiết Deal' : 'Thêm Deal mới',
      content: content,
      size: 'md',
      footer: `
        <button type="button" class="btn btn-ghost" onclick="Components.closeModal()">Hủy</button>
        <button type="button" class="btn btn-primary" onclick="document.getElementById('dealForm').dispatchEvent(new Event('submit'))">Lưu</button>
      `
    });
  },

  async saveDeal(id) {
    const data = {
      title: document.getElementById('dealTitle').value,
      customerId: document.getElementById('dealCustomer').value,
      value: Number(document.getElementById('dealValue').value),
      stage: document.getElementById('dealStage').value,
      expectedCloseDate: document.getElementById('dealCloseDate').value || null
    };

    try {
      if (id) {
        await Store.updateDeal(id, data);
        Components.showToast('Đã cập nhật Deal', 'success');
      } else {
        await Store.addDeal(data);
        Components.showToast('Đã thêm Deal mới', 'success');
      }
      Components.closeModal('dealModal');
      await this.loadData();
    } catch(e) {
      Components.showToast('Lỗi lưu dữ liệu: ' + e.message, 'error');
    }
  },

  async deleteDeal(id) {
    Components.showConfirm('Xác nhận xóa', 'Bạn có chắc chắn muốn xóa deal này?', async () => {
      try {
        await Store.deleteDeal(id);
        Components.showToast('Đã xóa deal', 'success');
        Components.closeModal('dealModal');
        await this.loadData();
      } catch(e) {
        Components.showToast('Lỗi xóa dữ liệu: ' + e.message, 'error');
      }
    });
  },

  unmount() {}
};
