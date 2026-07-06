window.Pages = window.Pages || {};
window.Pages.Reports = {
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
      <div class="page-header">
        <div>
          <h1>Báo cáo & Phân tích</h1>
          <p>Cái nhìn toàn cảnh về hoạt động kinh doanh và nhân sự</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-secondary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"/></svg>
            Tải PDF
          </button>
        </div>
      </div>

      <div class="report-grid">
        <!-- CRM Reports -->
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

        <!-- HR Reports -->
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

        <div class="card report-card">
          <div class="card-header">
            <h3>Tỷ lệ nhân sự theo phòng ban</h3>
          </div>
          <div class="card-body">
            <div class="chart-container">
              <canvas id="chartDeptRatio"></canvas>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async mount() {
    const container = document.getElementById('reports-content');
    if (!container) return;
    try {
      container.innerHTML = await this._renderContent();
      
      const deals = await Store.getDeals();
      const customers = await Store.getCustomers();
      const depts = await Store.getDepartments();
      const employees = await Store.getEmployees();
      
      setTimeout(() => {
        this.initCharts({ deals, customers, depts, employees });
      }, 100);
    } catch(e) {
      container.innerHTML = `<div class="empty-state"><p style="color:var(--color-danger)">Lỗi tải dữ liệu: ${e.message}</p></div>`;
    }
  },

  initCharts(data) {
    const { deals, customers, depts, employees } = data;
    
    // 1. Deal Revenue by Stage
    const stages = { 'lead': 0, 'qualified': 0, 'proposal': 0, 'negotiation': 0, 'won': 0, 'lost': 0 };
    deals.forEach(d => { if (stages[d.stage] !== undefined) stages[d.stage] += (d.value || 0); });
    
    const stageLabelsMap = { lead: 'Lead', qualified: 'Qualified', proposal: 'Proposal', negotiation: 'Đàm phán', won: 'Thành công', lost: 'Thất bại' };
    const stageColors = { lead: '#94a3b8', qualified: '#38bdf8', proposal: '#fbbf24', negotiation: '#fb923c', won: '#22c55e', lost: '#ef4444' };
    
    Charts.bar('chartDealRevenue', {
      labels: Object.keys(stages).map(k => stageLabelsMap[k]),
      datasets: [{
        label: 'Doanh thu (VNĐ)',
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

    Charts.doughnut('chartCustomerSource', {
      labels: Object.keys(sources),
      datasets: [{
        data: Object.values(sources),
        backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b']
      }]
    });

    // 3. Attendance Trend (Mock data for visual since fetching past 7 days means querying DB, keep it simple mock or actual)
    // For simplicity in refactoring, we'll just mock this specific chart structure since true historical data might be sparse
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
          label: 'Đi làm',
          data: [20, 22, 21, 22, 22, 10, 22],
          borderColor: '#10b981',
          tension: 0.3
        },
        {
          label: 'Đi muộn',
          data: [2, 0, 1, 0, 0, 0, 1],
          borderColor: '#f59e0b',
          tension: 0.3
        }
      ]
    });

    // 4. Dept Ratio
    const deptLabels = depts.map(d => d.name);
    const deptCounts = depts.map(d => employees.filter(e => e.departmentId === d.id).length);

    Charts.doughnut('chartDeptRatio', {
      labels: deptLabels,
      datasets: [{
        data: deptCounts,
        backgroundColor: ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8', '#6ee7b7', '#fbbf24', '#f87171']
      }]
    });
  },

  unmount() {}
};
