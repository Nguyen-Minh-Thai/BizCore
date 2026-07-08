window.Pages = window.Pages || {};
window.Pages.Reports = {
  activeTab: 'revenue', // 'revenue' or 'hr'

  render() {
    return `
      <div id="reports-content">
        <div class="empty-state" style="min-height:400px;display:flex;flex-direction:column;align-items:center;justify-content:center;">
          <span class="ai-typing" style="margin-bottom:16px;">
            <span class="ai-typing-dot"></span><span class="ai-typing-dot"></span><span class="ai-typing-dot"></span>
          </span>
          <p class="text-secondary">Đang tải dữ liệu báo cáo...</p>
        </div>
      </div>
    `;
  },

  async _renderContent() {
    return `
      <div class="page-header" style="margin-bottom: 20px;">
        <div>
          <h1>Báo cáo & Phân tích</h1>
          <p>Cái nhìn toàn cảnh về hoạt động kinh doanh và nhân sự của doanh nghiệp</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-secondary" onclick="window.print()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"/></svg>
            Tải PDF / In Báo cáo
          </button>
        </div>
      </div>

      <!-- Tabs Header -->
      <div class="tabs-header" style="margin-bottom: 24px; display: flex; gap: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
        <button class="tab-btn ${this.activeTab === 'revenue' ? 'active' : ''}" 
                style="padding: 8px 20px; font-weight: 600; font-size: 14px; border: none; background: ${this.activeTab === 'revenue' ? 'var(--brand)' : 'none'}; color: ${this.activeTab === 'revenue' ? '#fff' : 'var(--text-secondary)'}; border-radius: 6px; cursor: pointer; transition: all 0.2s;" 
                onclick="window.Pages.Reports.switchTab('revenue')">
          Báo cáo Doanh thu
        </button>
        <button class="tab-btn ${this.activeTab === 'hr' ? 'active' : ''}" 
                style="padding: 8px 20px; font-weight: 600; font-size: 14px; border: none; background: ${this.activeTab === 'hr' ? 'var(--brand)' : 'none'}; color: ${this.activeTab === 'hr' ? '#fff' : 'var(--text-secondary)'}; border-radius: 6px; cursor: pointer; transition: all 0.2s;" 
                onclick="window.Pages.Reports.switchTab('hr')">
          Báo cáo Nhân sự
        </button>
      </div>

      <div id="tabContentArea">
        ${this.activeTab === 'revenue' ? this._renderRevenueContent() : this._renderHRContent()}
      </div>
    `;
  },

  _renderRevenueContent() {
    // Calculated dynamic values or mock data where needed
    const customersCount = this.data.customers.length;
    const dealsCount = this.data.deals.length;
    const wonDeals = this.data.deals.filter(d => d.stage === 'won');
    const wonCount = wonDeals.length;
    const totalWonValue = wonDeals.reduce((s, d) => s + Number(d.value || 0), 0);
    
    // Đếm tương tác thực tế từ CSDL theo Phương án 2 (quét từ khóa trong ghi chú)
    const notes = this.data.notes || [];
    let smsCount = 0;
    let callCount = 0;
    let notesCount = 0;

    notes.forEach(n => {
      const txt = (n.content || '').toLowerCase();
      let matched = false;
      if (txt.includes('sms') || txt.includes('tin nhắn') || txt.includes('nhắn tin')) {
        smsCount++;
        matched = true;
      }
      if (txt.includes('gọi') || txt.includes('call') || txt.includes('cuộc gọi') || txt.includes('điện thoại')) {
        callCount++;
        matched = true;
      }
      
      notesCount++;
    });

    const totalInteractions = notesCount + smsCount + callCount;

    return `
      <!-- Conversion Rate Widgets Grid -->
      <div style="margin-bottom: 24px;">
        <div style="font-weight: 600; font-size: 15px; margin-bottom: 12px; color: var(--text-primary);">Tỷ lệ chuyển đổi tháng này</div>
        <div class="stat-cards-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;">
          
          <div class="card" style="padding: 16px; display: flex; flex-direction: column; gap: 8px; border-left: 4px solid #3b82f6;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 13px; color: var(--text-secondary); font-weight: 500;">Khách hàng mới</span>
              <span style="font-size: 20px;">👤</span>
            </div>
            <div style="font-size: 24px; font-weight: 800; color: var(--text-primary);">${customersCount}</div>
            <div style="font-size: 12px; color: var(--text-muted);">Đã đăng ký tài khoản</div>
          </div>

          <div class="card" style="padding: 16px; display: flex; flex-direction: column; gap: 8px; border-left: 4px solid #f59e0b;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 13px; color: var(--text-secondary); font-weight: 500;">Tương tác</span>
              <span style="font-size: 20px;">📊</span>
            </div>
            <div style="font-size: 24px; font-weight: 800; color: var(--text-primary);">${totalInteractions}</div>
            <div style="font-size: 12px; color: var(--text-muted); display:flex; justify-content:space-between; flex-wrap:wrap;">
              <span>Ghi chú: ${notesCount}</span> <span>SMS: ${smsCount}</span> <span>Cuộc gọi: ${callCount}</span>
            </div>
          </div>

          <div class="card" style="padding: 16px; display: flex; flex-direction: column; gap: 8px; border-left: 4px solid #10b981;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 13px; color: var(--text-secondary); font-weight: 500;">Đơn hàng</span>
              <span style="font-size: 20px;">🛒</span>
            </div>
            <div style="font-size: 24px; font-weight: 800; color: var(--text-primary);">${wonCount}</div>
            <div style="font-size: 12px; color: var(--text-muted);">Tỷ lệ chốt: ${dealsCount > 0 ? Math.round((wonCount / dealsCount) * 100) : 0}%</div>
          </div>

          <div class="card" style="padding: 16px; display: flex; flex-direction: column; gap: 8px; border-left: 4px solid #8b5cf6;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 13px; color: var(--text-secondary); font-weight: 500;">Doanh số</span>
              <span style="font-size: 20px;">💵</span>
            </div>
            <div style="font-size: 20px; font-weight: 800; color: var(--text-primary); margin-top: 4px;">${Utils.formatCurrency(totalWonValue)}</div>
            <div style="font-size: 12px; color: var(--text-muted);">Doanh thu thực tế (Won)</div>
          </div>

        </div>
      </div>

      <div class="report-grid">
        <div class="card report-card">
          <div class="card-header">
            <h3>Doanh thu dự kiến theo trạng thái (Deals)</h3>
          </div>
          <div class="card-body">
            <div class="chart-container">
              <canvas id="chartDealRevenue"></canvas>
            </div>
          </div>
        </div>

        <div class="card report-card">
          <div class="card-header">
            <h3>Khách hàng theo nguồn</h3>
          </div>
          <div class="card-body">
            <div class="chart-container">
              <canvas id="chartCustomerSource"></canvas>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  _renderHRContent() {
    return `
      <div class="report-grid">
        <div class="card report-card">
          <div class="card-header">
            <h3>Tỷ lệ nhân sự theo phòng ban</h3>
          </div>
          <div class="card-body">
            <div class="chart-container" style="position:relative;">
              <canvas id="chartDeptRatio"></canvas>
            </div>
          </div>
        </div>

        <div class="card report-card">
          <div class="card-header">
            <h3>Thống kê Chấm công 7 ngày qua</h3>
          </div>
          <div class="card-body">
            <div class="chart-container">
              <canvas id="chartAttendanceTrend"></canvas>
            </div>
          </div>
        </div>
      </div>

      <!-- OLE Performance & Turnover Section -->
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 24px;">
        <div class="card">
          <div class="card-header">
            <h3>Hiệu quả lao động tổng thể (OLE) theo bộ phận</h3>
          </div>
          <div class="card-body">
            <div class="chart-container">
              <canvas id="chartOLEPerformance"></canvas>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3>Biến động nhân sự gần đây</h3>
          </div>
          <div class="card-body" style="font-size: 13.5px;">
            <div style="display:flex; flex-direction:column; gap:12px;">
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-color); padding-bottom:8px;">
                <span style="font-weight:600;">Tháng này (Tháng 7/2026)</span>
                <span style="color:var(--color-success); font-weight:600;">+2 Mới / -0 Nghỉ</span>
              </div>
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-color); padding-bottom:8px;">
                <span style="color:var(--text-secondary);">Nhân viên mới tuyển:</span>
                <span style="font-weight:500;">Test Employee V7, Test Employee Insert</span>
              </div>
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-color); padding-bottom:8px;">
                <span style="font-weight:600;">Tháng trước (Tháng 6/2026)</span>
                <span style="color:var(--color-warning); font-weight:600;">+1 Mới / -1 Nghỉ</span>
              </div>
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-color); padding-bottom:8px;">
                <span style="color:var(--text-secondary);">Tỷ lệ nghỉ việc (Turnover Rate):</span>
                <span style="font-weight:600; color:var(--color-danger);">7.1%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async switchTab(tabName) {
    this.activeTab = tabName;
    const container = document.getElementById('reports-content');
    if (!container) return;
    container.innerHTML = await this._renderContent();
    this.initCharts(this.data);
  },

  async mount() {
    const container = document.getElementById('reports-content');
    if (!container) return;
    try {
      this.data = {
        deals: await Store.getDeals(),
        customers: await Store.getCustomers(),
        depts: await Store.getDepartments(),
        employees: await Store.getEmployees(),
        notes: await Store.getAllCustomerNotes(),
        contactsCount: await Store.getAllCustomerContactsCount()
      };
      
      container.innerHTML = await this._renderContent();
      
      setTimeout(() => {
        this.initCharts(this.data);
      }, 80);
    } catch(e) {
      container.innerHTML = `<div class="empty-state"><p style="color:var(--color-danger)">Lỗi tải dữ liệu: ${e.message}</p></div>`;
    }
  },

  initCharts(data) {
    if (this.activeTab === 'revenue') {
      this.initRevenueCharts(data);
    } else {
      this.initHRCharts(data);
    }
  },

  initRevenueCharts(data) {
    const { deals, customers } = data;

    // 1. Deal Revenue by Stage
    const stages = { 'lead': 0, 'qualified': 0, 'proposal': 0, 'negotiation': 0, 'won': 0, 'lost': 0 };
    deals.forEach(d => { if (stages[d.stage] !== undefined) stages[d.stage] += (d.value || 0); });
    
    const stageLabelsMap = { lead: 'Lead / Mới', qualified: 'Tiềm năng', proposal: 'Báo giá', negotiation: 'Đàm phán', won: 'Thành công (Won)', lost: 'Thất bại (Lost)' };
    const stageColors = { lead: '#94a3b8', qualified: '#38bdf8', proposal: '#fbbf24', negotiation: '#fb923c', won: '#22c55e', lost: '#ef4444' };
    
    Charts.bar('chartDealRevenue', {
      labels: Object.keys(stages).map(k => stageLabelsMap[k]),
      datasets: [{
        label: 'Doanh thu dự kiến (VNĐ)',
        data: Object.values(stages),
        backgroundColor: Object.keys(stages).map(k => stageColors[k])
      }]
    });

    // 2. Customer Sources
    const sources = {};
    customers.forEach(c => {
      const src = c.source || 'Khác';
      sources[src] = (sources[src] || 0) + 1;
    });
    const totalCustomers = customers.length || 1;

    Charts.doughnut('chartCustomerSource', {
      labels: Object.keys(sources).map(k => `${k} (${sources[k]} KH - ${((sources[k] / totalCustomers) * 100).toFixed(1)}%)`),
      datasets: [{
        data: Object.values(sources),
        backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b']
      }]
    });
  },

  initHRCharts(data) {
    const { depts, employees } = data;

    // 1. Dept Ratio (Including exact count and percentage in legends)
    const totalEmps = employees.length || 1;
    const deptLabels = depts.map(d => {
      const count = employees.filter(e => e.departmentId === d.id).length;
      const pct = ((count / totalEmps) * 100).toFixed(1);
      return `${d.name} (${count} NV - ${pct}%)`;
    });
    const deptCounts = depts.map(d => employees.filter(e => e.departmentId === d.id).length);

    Charts.doughnut('chartDeptRatio', {
      labels: deptLabels,
      datasets: [{
        data: deptCounts,
        backgroundColor: ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8', '#6ee7b7', '#fbbf24', '#f87171']
      }]
    });

    // 2. Attendance Trend 7 Days (Mock data for visual)
    const attLabels = [];
    for(let i=6; i>=0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      attLabels.push(Utils.formatDate(d.toISOString().split('T')[0]));
    }
    
    Charts.line('chartAttendanceTrend', {
      labels: attLabels,
      datasets: [
        {
          label: 'Đi làm đúng giờ',
          data: [12, 14, 13, 14, 14, 11, 14],
          borderColor: '#10b981',
          tension: 0.3
        },
        {
          label: 'Đi muộn',
          data: [1, 0, 2, 0, 0, 1, 0],
          borderColor: '#f59e0b',
          tension: 0.3
        }
      ]
    });

    // 3. OLE (Overall Labor Effectiveness) by department
    // HR: 82%, Sales: 78%, Marketing: 75%, IT: 72%, Customer Service: 71%
    Charts.bar('chartOLEPerformance', {
      labels: ['Hành chính - Nhân sự (82%)', 'Kinh doanh (Sales) (78%)', 'Marketing (75%)', 'Công nghệ thông tin (72%)', 'Chăm sóc khách hàng (71%)'],
      datasets: [{
        label: 'Tỷ lệ OLE (%)',
        data: [82, 78, 75, 72, 71],
        backgroundColor: '#6366f1'
      }]
    });
  },

  unmount() {}
};
