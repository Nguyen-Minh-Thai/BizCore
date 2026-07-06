/* ===== BizCore v2 — What-If Simulator (mô phỏng quyết định) ===== */
window.Pages = window.Pages || {};
window.Pages.Simulator = {
  _data: { employees: [], departments: [], deals: [] },

  render() {
    return `<div id="sim-root">
      <div class="page-header">
        <div>
          <div style="font-family:var(--font-mono);font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--text-muted)">Trí tuệ · What-If</div>
          <h1 style="margin-top:8px">Mô phỏng quyết định</h1>
          <p>Xem trước tác động chi phí <b>theo luật lao động Việt Nam</b> (BHXH/BHYT/BHTN + thuế TNCN) trước khi quyết định.</p>
        </div>
        <div class="page-header-actions"><button class="btn btn-slate btn-sm" onclick="if(window.AI)AI.togglePanel()">✦ Hỏi trợ lý AI</button></div>
      </div>
      <div class="tabs-header">
        <button class="tab-btn active" data-sc="raise">Tăng lương</button>
        <button class="tab-btn" data-sc="hire">Tuyển thêm</button>
        <button class="tab-btn" data-sc="deals">Chốt cơ hội</button>
      </div>
      <div class="loading-spinner" id="sim-body"></div>
    </div>`;
  },

  async mount() {
    const S = window.Store;
    try {
      const [employees, departments, deals] = await Promise.all([
        S.getEmployees({ status:'active' }), S.getDepartments(), S.getDeals()
      ]);
      this._data = { employees, departments, deals };
    } catch(e){ this._data = { employees:[], departments:[], deals:[] }; }

    const root = document.getElementById('sim-root');
    root.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => {
      root.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      this._renderScenario(btn.dataset.sc);
    }));
    this._renderScenario('raise');
  },

  _res(label, value, sub, tone) {
    return `<div style="display:flex;justify-content:space-between;align-items:baseline;padding:13px 0;border-bottom:1px solid var(--border-subtle)">
      <div><div style="font-size:13px;color:var(--text-secondary)">${label}</div>${sub?`<div style="font-size:11.5px;color:var(--text-muted);margin-top:2px">${sub}</div>`:''}</div>
      <div style="font-family:var(--font-mono);font-weight:600;font-size:16px;color:${tone||'var(--text-primary)'}">${value}</div></div>`;
  },

  _panel(bodyHTML, resultHTML) {
    return `<div class="dashboard-grid" style="grid-template-columns:1fr 1fr">
      <div class="card"><div class="card-header"><h3>Kịch bản</h3></div><div class="card-body">${bodyHTML}</div></div>
      <div class="card"><div class="card-header"><h3>Tác động dự kiến</h3><span class="text-muted" style="font-family:var(--font-mono);font-size:11px">TÍNH THEO LUẬT VN</span></div><div class="card-body" id="sim-result">${resultHTML}</div></div>
    </div>`;
  },

  _slider(id, min, max, val, step, unit) {
    return `<div style="display:flex;align-items:center;gap:12px">
      <input type="range" id="${id}" min="${min}" max="${max}" value="${val}" step="${step||1}" style="flex:1;accent-color:var(--brand)">
      <span id="${id}-v" style="font-family:var(--font-mono);font-weight:600;min-width:64px;text-align:right">${val}${unit||''}</span></div>`;
  },

  _renderScenario(sc) {
    const U = window.Utils, D = this._data;
    const body = document.getElementById('sim-body');
    if (sc === 'raise') {
      const opts = D.departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
      body.innerHTML = this._panel(
        `<div class="form-group"><label class="form-label">Phòng ban</label><select class="form-input" id="sc-dept"><option value="">Toàn công ty</option>${opts}</select></div>
         <div class="form-group"><label class="form-label">Mức tăng lương</label>${this._slider('sc-pct',0,50,10,1,'%')}</div>
         <p style="font-size:12.5px;color:var(--text-muted);margin-top:8px">Chi phí doanh nghiệp = lương gộp + BHXH/BHYT/BHTN phần DN (21.5%).</p>`,
        ''
      );
      const calc = () => {
        const deptId = document.getElementById('sc-dept').value;
        const pct = +document.getElementById('sc-pct').value;
        document.getElementById('sc-pct-v').textContent = pct + '%';
        let emps = D.employees;
        if (deptId) emps = emps.filter(e => String(e.departmentId) === String(deptId));
        const base = emps.reduce((s,e) => s + (e.baseSalary || 0), 0);
        const dGross = base * pct / 100;
        const dCompMonth = dGross * 1.215;
        const dCompYear = dCompMonth * 12;
        document.getElementById('sim-result').innerHTML =
          this._res('Số nhân sự ảnh hưởng', emps.length + ' người') +
          this._res('Tăng lương gộp / tháng', U.formatCurrency(dGross)) +
          this._res('+ BHXH DN (21.5%)', U.formatCurrency(dGross*0.215), 'phần doanh nghiệp đóng thêm', 'var(--brass-600, #a97c3f)') +
          this._res('Tổng chi phí tăng / tháng', U.formatCurrency(dCompMonth), null, 'var(--color-danger)') +
          this._res('Tổng chi phí tăng / năm', U.formatCurrency(dCompYear), null, 'var(--color-danger)') +
          this._res('Doanh thu cần thêm để hoà vốn', U.formatCurrency(dCompYear), 'trong 12 tháng', 'var(--brand)');
      };
      document.getElementById('sc-dept').addEventListener('change', calc);
      document.getElementById('sc-pct').addEventListener('input', calc);
      calc();
    }
    else if (sc === 'hire') {
      body.innerHTML = this._panel(
        `<div class="form-group"><label class="form-label">Số người tuyển thêm</label>${this._slider('sc-n',1,20,3,1,' người')}</div>
         <div class="form-group"><label class="form-label">Lương cơ bản trung bình / người</label><input type="number" class="form-input" id="sc-sal" value="20000000" step="1000000"></div>
         <p style="font-size:12.5px;color:var(--text-muted);margin-top:8px">Chi phí thật = lương + BHXH DN (21.5%). Chưa gồm chi phí tuyển dụng/đào tạo.</p>`,
        ''
      );
      const calc = () => {
        const n = +document.getElementById('sc-n').value;
        const sal = +document.getElementById('sc-sal').value || 0;
        document.getElementById('sc-n-v').textContent = n + ' người';
        const grossM = n * sal;
        const costM = grossM * 1.215;
        document.getElementById('sim-result').innerHTML =
          this._res('Lương gộp / tháng', U.formatCurrency(grossM)) +
          this._res('+ BHXH DN (21.5%)', U.formatCurrency(grossM*0.215), null, '#a97c3f') +
          this._res('Chi phí thật / tháng', U.formatCurrency(costM), null, 'var(--color-danger)') +
          this._res('Chi phí thật / năm', U.formatCurrency(costM*12), null, 'var(--color-danger)') +
          this._res('Bình quân chi phí / người / năm', U.formatCurrency(costM*12/n), null, 'var(--brand)');
      };
      document.getElementById('sc-n').addEventListener('input', calc);
      document.getElementById('sc-sal').addEventListener('input', calc);
      calc();
    }
    else {
      const open = D.deals.filter(d => d.stage !== 'won' && d.stage !== 'lost');
      const rows = open.length ? open.map(d => `<label style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border-subtle);cursor:pointer">
        <input type="checkbox" class="sc-deal" value="${d.value||0}" checked style="accent-color:var(--brand);width:16px;height:16px">
        <span style="flex:1;font-size:13px">${d.title||'Cơ hội'}</span>
        <span style="font-family:var(--font-mono);font-size:13px;color:var(--text-secondary)">${U.formatCurrency(d.value||0)}</span></label>`).join('')
        : '<p class="text-muted" style="padding:16px 0">Chưa có cơ hội đang mở.</p>';
      body.innerHTML = this._panel(
        `<label class="form-label">Chọn cơ hội giả định sẽ chốt được</label><div style="max-height:320px;overflow:auto">${rows}</div>`,
        ''
      );
      const calc = () => {
        const sum = [...document.querySelectorAll('.sc-deal:checked')].reduce((s,c)=>s+(+c.value),0);
        const cnt = document.querySelectorAll('.sc-deal:checked').length;
        const annualPayroll = D.employees.reduce((s,e)=>s+(e.baseSalary||0),0)*12*1.215;
        document.getElementById('sim-result').innerHTML =
          this._res('Số cơ hội chốt', cnt + ' deal') +
          this._res('Doanh thu cộng thêm', U.formatCurrency(sum), null, 'var(--brand)') +
          this._res('So với chi phí lương/năm', annualPayroll? Math.round(sum/annualPayroll*100)+'%':'—', 'doanh thu / tổng chi phí nhân sự năm') +
          this._res('Hoa hồng ước tính (5%)', U.formatCurrency(sum*0.05), 'nếu áp mức 5%');
      };
      document.querySelectorAll('.sc-deal').forEach(c => c.addEventListener('change', calc));
      calc();
    }
    if (window.Fx) try { window.Fx.entrance(document.getElementById('sim-body')); } catch(e){}
  },

  unmount() {}
};
