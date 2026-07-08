/* ===== BizCore — Command Center (Trung tâm điều hành) ===== */
window.Pages = window.Pages || {};

const STAGE_PROB = { lead:0.1, qualified:0.25, proposal:0.5, negotiation:0.75, won:1, lost:0 };

window.Pages.Dashboard = {
  render() {
    return `<div id="dashboard-content">
      <div class="loading-spinner"></div>
    </div>`;
  },

  // ===== INSIGHT ENGINE — sinh tín hiệu ưu tiên từ dữ liệu thật =====
  _computeSignals({ employees, deals, customers, payroll, prevPayroll, attMonth }) {
    const U = window.Utils;
    const signals = [];
    const today = new Date(U.getCurrentDate());

    // 1. Cơ hội quá hạn chốt (deal open, expectedCloseDate < hôm nay)
    const overdue = (deals || []).filter(d => d.stage !== 'won' && d.stage !== 'lost'
      && d.expectedCloseDate && new Date(d.expectedCloseDate) < today);
    if (overdue.length) {
      const val = overdue.reduce((s, d) => s + (d.value || 0), 0);
      signals.push({ sev:'d', title:`${overdue.length} cơ hội trị giá ${U.formatCurrency(val)} đã quá hạn chốt`,
        why:'Đã qua ngày dự kiến đóng nhưng chưa chuyển trạng thái — nguy cơ trượt.',
        reason:'Quá hạn expected_close_date & vẫn ở trạng thái mở.',
        action:{label:'Xem cơ hội →', hash:'#/deals'} });
    }

    // 2. Win rate thấp
    const closed = (deals || []).filter(d => d.stage === 'won' || d.stage === 'lost');
    const won = (deals || []).filter(d => d.stage === 'won');
    if (closed.length >= 3) {
      const wr = Math.round(won.length / closed.length * 100);
      if (wr < 30) signals.push({ sev:'w', title:`Tỷ lệ chốt deal đang thấp: ${wr}%`,
        why:`Chỉ ${won.length}/${closed.length} cơ hội đã đóng là thắng.`,
        reason:'Win rate < 30% — cần rà lại phễu bán hàng.',
        action:{label:'Phân tích phễu →', hash:'#/deals'} });
    }

    // 3. Quỹ lương tăng bất thường so với tháng trước
    const cur = (payroll || []).reduce((s, p) => s + (p.netSalary || p.baseSalary || 0), 0);
    const prev = (prevPayroll || []).reduce((s, p) => s + (p.netSalary || p.baseSalary || 0), 0);
    if (prev > 0 && cur > prev * 1.05) {
      const pct = Math.round((cur - prev) / prev * 100);
      signals.push({ sev:'w', title:`Quỹ lương tháng này vượt ${pct}% so với tháng trước`,
        why:`Tăng thêm ${U.formatCurrency(cur - prev)} — nên mô phỏng tác động.`,
        reason:'Chi phí nhân sự tăng nhanh; kiểm tra tuyển mới/phụ cấp.',
        action:{label:'✦ Mô phỏng What-If →', hash:'#/simulator', slate:true} });
    }

    // 4. Chuyên cần — nhân viên đi trễ nhiều trong tháng
    const lateByEmp = {};
    (attMonth || []).forEach(a => { if (a.status === 'late') lateByEmp[a.employeeId] = (lateByEmp[a.employeeId]||0) + 1; });
    Object.entries(lateByEmp).filter(([,n]) => n >= 4).forEach(([empId, n]) => {
      const emp = (employees || []).find(e => e.id === empId);
      signals.push({ sev:'i', title:`${emp ? emp.name : 'Một nhân viên'} đi trễ ${n} lần trong tháng`,
        why:'Vượt ngưỡng cảnh báo (4 lần/tháng) của chính sách chấm công.',
        action:{label:'Xem chấm công →', hash:'#/attendance'} });
    });

    // 5. Khách hàng/lead chưa được chăm
    const leads = (customers || []).filter(c => c.status === 'lead' || c.status === 'new');
    if (leads.length >= 3) {
      signals.push({ sev:'i', title:`${leads.length} khách hàng tiềm năng chờ theo dõi`,
        why:'Lead mới chưa chuyển sang cơ hội — đừng để nguội.',
        action:{label:'Xem khách hàng →', hash:'#/customers'} });
    }

    return signals;
  },

  _icon(name) {
    const M = {
      users:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',
      dollar:'<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
      trend:'<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
      target:'<path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/>'
    };
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9">${M[name]||''}</svg>`;
  },

  _kpi(icon, iconClass, value, label, trend) {
    const t = trend ? `<span class="stat-card-trend ${trend.dir}"><svg viewBox="0 0 24 24"><polyline points="${trend.dir==='up'?'6 15 12 9 18 15':'6 9 12 15 18 9'}"/></svg>${trend.v}</span>` : '';
    return `<div class="stat-card"><div class="stat-card-header"><div class="stat-card-icon ${iconClass||''}">${this._icon(icon)}</div>${t}</div>
      <div class="stat-card-value">${value}</div><div class="stat-card-label">${label}</div></div>`;
  },

  async _renderContent() {
    const Store = window.Store, U = window.Utils;
    const month = U.getCurrentMonth();
    const [employees, deals, customers, payroll, todayAtt, attMonth] = await Promise.all([
      Store.getEmployees(), Store.getDeals(), Store.getCustomers().catch(()=>[]),
      Store.getPayrollByMonth(month).catch(()=>[]), Store.getTodayAttendance().catch(()=>[]),
      Store.getAttendanceByMonth ? Store.getAttendanceByMonth(month).catch(()=>[]) : []
    ]);
    // tháng trước
    const d = new Date(month + '-01'); d.setMonth(d.getMonth() - 1);
    const prevMonth = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const prevPayroll = await Store.getPayrollByMonth(prevMonth).catch(()=>[]);

    const activeEmp = employees.filter(e => e.status === 'active').length;
    const payrollTotal = payroll.reduce((s,p)=>s+(p.netSalary||p.baseSalary||0),0);
    const weighted = deals.reduce((s,d)=> s + (d.value||0) * (STAGE_PROB[d.stage] ?? 0), 0);
    const closed = deals.filter(d=>d.stage==='won'||d.stage==='lost');
    const won = deals.filter(d=>d.stage==='won');
    const winRate = closed.length ? Math.round(won.length/closed.length*100) : 0;

    const signals = this._computeSignals({ employees, deals, customers, payroll, prevPayroll, attMonth });

    const kpis = [
      this._kpi('users','', activeEmp, 'Nhân sự đang làm việc', {dir:'up', v:activeEmp}),
      this._kpi('dollar','neutral', U.formatCurrency(payrollTotal), 'Quỹ lương tháng '+month.split('-')[1], null),
      this._kpi('trend','', U.formatCurrency(weighted), 'Dự báo pipeline (trọng số)', {dir:'up', v:deals.length}),
      this._kpi('target','slate', winRate+'%', 'Tỷ lệ chốt deal', {dir: winRate>=30?'up':'down', v:closed.length})
    ].join('');

    const signalsHTML = signals.length ? signals.map(s => `
      <div class="signal-row">
        <span class="signal-sev ${s.sev}"></span>
        <div class="signal-main">
          <div class="signal-title">${s.title}</div>
          <div class="signal-why">${s.why||''}</div>
          ${s.reason ? `<div class="signal-reason">Vì sao: ${s.reason}</div>`:''}
          <div class="signal-act"><a class="btn ${s.action.slate?'btn-slate':'btn-ghost'} btn-sm" href="${s.action.hash}">${s.action.label}</a></div>
        </div>
      </div>`).join('')
      : `<div class="empty-state" style="padding:28px"><p>Mọi thứ đang ổn định — chưa có tín hiệu nào cần bạn để mắt. 🌿<br>Thêm nhân sự & cơ hội để BizCore bắt đầu phân tích sâu hơn.</p></div>`;

    const checkedIn = todayAtt.filter(a=>a.checkIn).length;
    const lateToday = todayAtt.filter(a=>a.status==='late').length;

    return `
      <div class="page-header">
        <div>
          <div class="overline" style="font-family:var(--font-mono);font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--text-muted)">${this._weekday()} · ${U.getCurrentDate().split('-').reverse().join('.')}</div>
          <h1 class="shiny-text" style="margin-top:8px">${U.getGreeting()}, ${Store.currentUser?.name || 'bạn'}.</h1>
          <p style="margin-top:2px">BizCore giúp bạn <span class="login-tw" data-typewriter="điều hành nhân sự & lương|quản trị khách hàng & cơ hội|mô phỏng quyết định tài chính|ra lệnh cho trợ lý AI"></span></p>
          <p style="margin-top:5px;font-size:13px;color:var(--text-muted)">Có <b style="color:var(--brand)">${signals.length} việc</b> cần bạn để mắt hôm nay.</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-secondary btn-sm" onclick="Pages.Dashboard.exportAll()">⤓ Xuất Excel</button>
          <button class="btn btn-slate btn-sm" onclick="if(window.AI)AI.togglePanel()">✦ Hỏi trợ lý AI</button>
        </div>
      </div>

      <div class="stat-cards-grid">${kpis}</div>

      <div class="dashboard-grid mt-6">
        <div class="card">
          <div class="card-header"><h3>Trung tâm điều hành · Tín hiệu ưu tiên</h3><span class="text-muted" style="font-family:var(--font-mono);font-size:11px">${signals.length} TÍN HIỆU</span></div>
          <div class="card-body"><div class="signals">${signalsHTML}</div></div>
        </div>
        <div class="card">
          <div class="card-header"><h3>Chấm công hôm nay</h3></div>
          <div class="card-body">
            <div style="display:flex;flex-direction:column;gap:12px">
              <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-radius:10px;background:var(--color-success-bg)"><span style="font-weight:600;color:var(--color-success)">Đã chấm công</span><span style="font-family:var(--font-mono);font-weight:600;font-size:20px;color:var(--color-success)">${checkedIn}</span></div>
              <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-radius:10px;background:var(--color-warning-bg)"><span style="font-weight:600;color:var(--color-warning)">Đi muộn</span><span style="font-family:var(--font-mono);font-weight:600;font-size:20px;color:var(--color-warning)">${lateToday}</span></div>
              <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-radius:10px;background:var(--bg-hover)"><span style="font-weight:600">Tổng nhân sự</span><span style="font-family:var(--font-mono);font-weight:600;font-size:20px">${activeEmp}</span></div>
            </div>
          </div>
        </div>
      </div>

      <div class="dashboard-grid mt-6">
        <div class="card">
          <div class="card-header"><h3>Nhân viên theo phòng ban</h3></div>
          <div class="card-body"><div class="chart-container" style="height:260px"><canvas id="chartEmployeeDept"></canvas></div></div>
        </div>
        <div class="card">
          <div class="card-header"><h3>Cơ hội theo giai đoạn</h3></div>
          <div class="card-body"><div class="chart-container" style="height:260px"><canvas id="chartDealStatus"></canvas></div></div>
        </div>
      </div>`;
  },

  _weekday() {
    const w = ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'];
    try { return w[new Date(window.Utils.getCurrentDate()).getDay()]; } catch(e){ return ''; }
  },

  async mount() {
    const container = document.getElementById('dashboard-content');
    if (!container) return;
    try {
      container.innerHTML = await this._renderContent();
      const Store = window.Store, Charts = window.Charts;
      setTimeout(async () => {
        try {
          const departments = await Store.getDepartments();
          const employees = await Store.getEmployees();
          const totalEmps = employees.length || 1;
          Charts.bar('chartEmployeeDept', {
            labels: departments.map(d => d.name),
            datasets:[{ label:'Nhân viên', data: departments.map(d=>employees.filter(e=>e.departmentId===d.id).length),
              backgroundColor:['#0c6b57','#33417a','#a97c3f','#1a6a63','#3d4d90','#0e7a63','#c78a3c','#5a626c'] }]
          });
          const deals = await Store.getDeals();
          const byStage = await Store.getDealsByStage();
          const labelMap={lead:'Lead',qualified:'Tiềm năng',proposal:'Báo giá',negotiation:'Đàm phán',won:'Thành công',lost:'Thất bại'};
          const colorMap={lead:'#8d8377',qualified:'#33417a',proposal:'#a97c3f',negotiation:'#c78a3c',won:'#0c6b57',lost:'#bb362b'};
          const L=[],D=[],C=[];
          const totalDeals = (deals || []).length || 1;
          if(byStage) {
            for(const [st,arr] of Object.entries(byStage)){
              const count = Array.isArray(arr) ? arr.length : arr;
              const pct = ((count / totalDeals) * 100).toFixed(1);
              L.push(`${labelMap[st]||st} (${count} cơ hội - ${pct}%)`);
              D.push(count);
              C.push(colorMap[st]||'#8d8377');
            }
          }
          Charts.doughnut('chartDealStatus', { labels:L, datasets:[{ data:D, backgroundColor:C }] });
        } catch(e){ console.warn('chart', e); }
      }, 80);
    } catch(e) {
      container.innerHTML = `<div class="empty-state"><p style="color:var(--color-danger)">Lỗi tải dữ liệu: ${e.message}</p></div>`;
      console.error(e);
    }
  },

  async exportAll(){
    const S = window.Store, U = window.Utils;
    try {
      const month = U.getCurrentMonth();
      const [emps, deals, pay] = await Promise.all([ S.getEmployees(), S.getDeals(), S.getPayrollByMonth(month).catch(()=>[]) ]);
      const sheets = [
        { name:'Nhân sự', headers:['Họ tên','Email','Chức danh','Trạng thái','Lương cơ bản'],
          rows: emps.map(e => [e.name, e.email, e.position||'', e.status, e.baseSalary||0]) },
        { name:'Cơ hội', headers:['Tên cơ hội','Giai đoạn','Giá trị (đ)','Dự kiến chốt'],
          rows: deals.map(d => [d.title||'', d.stage, d.value||0, d.expectedCloseDate||'']) },
        { name:'Lương '+month, headers:['Nhân viên','Lương CB','Thực nhận','Thuế TNCN','BHXH NV'],
          rows: pay.map(p => [p.employeeId, p.baseSalary||0, p.netSalary||0, p.personalTax||0, p.bhxhEmployee||0]) }
      ];
      U.exportExcel(sheets, 'bizcore-bao-cao-' + month + '.xlsx');
      if (window.Components) Components.showToast('Đã xuất báo cáo Excel (3 sheet)', 'success');
    } catch(e) {
      if (window.Components) Components.showToast('Lỗi xuất Excel: ' + e.message, 'error');
    }
  },

  unmount() {}
};
