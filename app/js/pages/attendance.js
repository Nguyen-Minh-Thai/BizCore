window.Pages = window.Pages || {};
window.Pages.Attendance = {
  render() {
    return `
      <div id="attendance-content">
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
          <h1>Chấm công</h1>
          <p>Quản lý thời gian làm việc của nhân viên</p>
        </div>
      </div>

      <div class="tabs-header" id="attTabs">
        <!-- Tabs rendered via JS -->
      </div>
      <div id="attTabContent"></div>
    `;
  },

  async mount() {
    const container = document.getElementById('attendance-content');
    if (!container) return;
    try {
      container.innerHTML = await this._renderContent();

      Components.renderTabs('attTabs', [
        { id: 'today', label: 'Hôm nay', render: () => '<div id="attTodayArea"></div>', onMount: () => this.renderToday() },
        { id: 'month', label: 'Lịch tháng này', render: () => '<div id="attMonthArea"></div>', onMount: () => this.renderMonth() },
        { id: 'history', label: 'Lịch sử', render: () => '<div id="attHistoryArea"></div>', onMount: () => this.renderHistory() }
      ]);
    } catch(e) {
      container.innerHTML = `<div class="empty-state"><p style="color:var(--color-danger)">Lỗi tải dữ liệu: ${e.message}</p></div>`;
    }
  },

  async renderToday() {
    const area = document.getElementById('attTodayArea');
    if (!area) return;

    try {
      const today = Utils.getCurrentDate();
      const records = await Store.getAttendanceRecords({ date: today });
      const employees = await Store.getEmployees({ status: 'active' });

      // Build real-time clock
      const clockHtml = `
        <div class="attendance-clock-section mb-6">
          <div class="attendance-time" id="attClock">00:00:00</div>
          <div class="attendance-date">${Utils.formatDate(today)}</div>
          
          <div class="attendance-actions">
            <div style="flex:1;max-width:300px;">
              <select id="attEmployeeSelect" class="form-input">
                <option value="">-- Chọn nhân viên để test --</option>
                ${employees.map(e => `<option value="${e.id}">${e.name} (${e.position || 'NV'})</option>`).join('')}
              </select>
            </div>
            <button class="btn btn-checkin" onclick="window.Pages.Attendance.doCheckIn()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              Check In
            </button>
            <button class="btn btn-checkout" onclick="window.Pages.Attendance.doCheckOut()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
              Check Out
            </button>
          </div>
          <div class="attendance-status text-secondary">Giờ vào chuẩn: 08:30 - Giờ ra chuẩn: 17:30</div>
        </div>
      `;

      const statusMap = {
        'on_time': { label: 'Đúng giờ', variant: 'success' },
        'late': { label: 'Đi muộn', variant: 'warning' },
        'leave': { label: 'Nghỉ phép', variant: 'info' }
      };

      const tableHtml = `
        <div class="card">
          <div class="card-header">
            <h3>Trạng thái hôm nay (${records.length}/${employees.length} đã điểm danh)</h3>
          </div>
          <div style="overflow-x:auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Nhân viên</th>
                  <th>Giờ vào</th>
                  <th>Giờ ra</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                ${records.length === 0 ? '<tr><td colspan="4" style="text-align:center;padding:32px;" class="text-secondary">Chưa có ai điểm danh</td></tr>' : 
                  records.map(r => {
                    const emp = employees.find(e => e.id === r.employeeId);
                    if (!emp) return '';
                    const status = statusMap[r.status] || { label: r.status, variant: 'secondary' };
                    return `
                      <tr>
                        <td>
                          <div class="employee-cell">
                            <div class="table-avatar" style="background:${Utils.getAvatarColor(emp.name)}">${Utils.getInitials(emp.name)}</div>
                            <div style="font-weight:500;">${emp.name}</div>
                          </div>
                        </td>
                        <td style="font-weight:600;color:var(--text-accent);">${r.checkIn ? r.checkIn.substring(0,5) : '--:--'}</td>
                        <td style="font-weight:600;color:var(--text-tertiary);">${r.checkOut ? r.checkOut.substring(0,5) : '--:--'}</td>
                        <td>${Components.createBadge(status.label, status.variant)}</td>
                      </tr>
                    `;
                  }).join('')
                }
              </tbody>
            </table>
          </div>
        </div>
      `;

      area.innerHTML = clockHtml + tableHtml;
      
      // Start clock
      this.clockInterval = setInterval(() => {
        const clock = document.getElementById('attClock');
        if (clock) clock.textContent = Utils.getCurrentTime();
        else clearInterval(this.clockInterval);
      }, 1000);

    } catch(e) {
      area.innerHTML = `<div class="empty-state"><p style="color:var(--color-danger)">Lỗi tải dữ liệu: ${e.message}</p></div>`;
    }
  },

  async renderMonth() {
    const area = document.getElementById('attMonthArea');
    if (!area) return;

    try {
      const monthStr = Utils.getCurrentMonth();
      const [year, month] = monthStr.split('-').map(Number);
      
      const employees = await Store.getEmployees({ status: 'active' });
      const records = await Store.getAttendanceRecords({ month: monthStr });

      let empOptions = employees.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
      
      // We need to render UI first, then load calendar for specific employee
      area.innerHTML = `
        <div class="card p-6 mb-6">
          <div class="form-group" style="max-width:300px;">
            <label class="form-label">Chọn nhân viên xem lịch</label>
            <select id="attMonthEmp" class="form-input" onchange="window.Pages.Attendance.updateCalendar()">
              ${empOptions}
            </select>
          </div>
        </div>
        <div id="calendarContainer"></div>
      `;
      
      // Call update immediately for first employee
      if (employees.length > 0) {
        this.updateCalendar();
      }
    } catch(e) {
      area.innerHTML = `<div class="empty-state"><p style="color:var(--color-danger)">Lỗi tải dữ liệu: ${e.message}</p></div>`;
    }
  },

  async updateCalendar() {
    const container = document.getElementById('calendarContainer');
    const empId = document.getElementById('attMonthEmp').value;
    if (!container || !empId) return;
    
    try {
      const monthStr = Utils.getCurrentMonth();
      const [year, month] = monthStr.split('-').map(Number);
      const records = await Store.getAttendanceRecords({ month: monthStr, employeeId: empId });
      
      // Build calendar grid
      const daysInMonth = new Date(year, month, 0).getDate();
      const firstDay = new Date(year, month - 1, 1).getDay(); // 0 is Sunday
      const offset = firstDay === 0 ? 6 : firstDay - 1; // Make Monday 0

      let gridHtml = `
        <div class="card p-6">
          <h3 style="margin-bottom:16px;">Lịch chấm công tháng ${month}/${year}</h3>
          <div class="calendar-grid">
            <div class="calendar-header">T2</div>
            <div class="calendar-header">T3</div>
            <div class="calendar-header">T4</div>
            <div class="calendar-header">T5</div>
            <div class="calendar-header">T6</div>
            <div class="calendar-header">T7</div>
            <div class="calendar-header">CN</div>
      `;

      // Empty cells before 1st
      for (let i = 0; i < offset; i++) {
        gridHtml += `<div class="calendar-day" style="background:transparent;border:none;"></div>`;
      }

      const todayStr = Utils.getCurrentDate();

      for (let i = 1; i <= daysInMonth; i++) {
        const dStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const record = records.find(r => r.date === dStr);
        let statusClass = '';
        let title = '';
        
        if (record) {
          if (record.status === 'on_time') { statusClass = 'present'; title = `Vào: ${record.checkIn} - Đạt`; }
          else if (record.status === 'late') { statusClass = 'late'; title = `Vào: ${record.checkIn} - Muộn`; }
          else if (record.status === 'leave') { statusClass = 'leave'; title = 'Nghỉ phép'; }
          else if (record.status === 'absent') { statusClass = 'absent'; title = 'Vắng mặt'; }
        }
        
        const isToday = dStr === todayStr ? 'today' : '';
        
        gridHtml += `<div class="calendar-day ${statusClass} ${isToday}" title="${title}">${i}</div>`;
      }

      gridHtml += `</div>
        <div style="margin-top:24px;display:flex;gap:16px;font-size:12px;color:var(--text-secondary);">
          <div style="display:flex;align-items:center;gap:6px;"><div style="width:12px;height:12px;border-radius:3px;background:var(--color-success);opacity:0.2;"></div> Đúng giờ</div>
          <div style="display:flex;align-items:center;gap:6px;"><div style="width:12px;height:12px;border-radius:3px;background:var(--color-warning);opacity:0.2;"></div> Đi muộn</div>
          <div style="display:flex;align-items:center;gap:6px;"><div style="width:12px;height:12px;border-radius:3px;background:var(--bg-tertiary);"></div> Nghỉ phép</div>
          <div style="display:flex;align-items:center;gap:6px;"><div style="width:12px;height:12px;border-radius:3px;background:var(--color-danger);opacity:0.2;"></div> Vắng mặt</div>
        </div>
      </div>`;

      container.innerHTML = gridHtml;
    } catch(e) {
      container.innerHTML = `<div class="empty-state"><p style="color:var(--color-danger)">Lỗi tải dữ liệu: ${e.message}</p></div>`;
    }
  },

  async renderHistory() {
    const area = document.getElementById('attHistoryArea');
    if (!area) return;

    try {
      const records = await Store.getAttendanceRecords(); // Need better pagination later
      const employees = await Store.getEmployees();

      // Sort newest first, top 50
      const recent = [...records].sort((a, b) => new Date(b.date) - new Date(a.date) || b.checkIn?.localeCompare(a.checkIn)).slice(0, 50);

      const statusMap = {
        'on_time': { label: 'Đúng giờ', variant: 'success' },
        'late': { label: 'Đi muộn', variant: 'warning' },
        'leave': { label: 'Nghỉ phép', variant: 'info' },
        'absent': { label: 'Vắng', variant: 'danger' }
      };

      area.innerHTML = `
        <div class="card">
          <div class="card-header">
            <h3>50 lượt chấm công gần nhất</h3>
          </div>
          <div style="overflow-x:auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Nhân viên</th>
                  <th>Giờ vào</th>
                  <th>Giờ ra</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                ${recent.length === 0 ? '<tr><td colspan="5" style="text-align:center;padding:32px;" class="text-secondary">Chưa có dữ liệu</td></tr>' : 
                  recent.map(r => {
                    const emp = employees.find(e => e.id === r.employeeId);
                    const empName = emp ? emp.name : 'Unknown';
                    const status = statusMap[r.status] || { label: r.status, variant: 'secondary' };
                    
                    return `
                      <tr>
                        <td>${Utils.formatDate(r.date)}</td>
                        <td>
                          <div class="employee-cell">
                            <div class="table-avatar" style="background:${Utils.getAvatarColor(empName)}">${Utils.getInitials(empName)}</div>
                            <div style="font-weight:500;">${empName}</div>
                          </div>
                        </td>
                        <td>${r.checkIn ? r.checkIn.substring(0,5) : '--:--'}</td>
                        <td>${r.checkOut ? r.checkOut.substring(0,5) : '--:--'}</td>
                        <td>${Components.createBadge(status.label, status.variant)}</td>
                      </tr>
                    `;
                  }).join('')
                }
              </tbody>
            </table>
          </div>
        </div>
      `;
    } catch(e) {
      area.innerHTML = `<div class="empty-state"><p style="color:var(--color-danger)">Lỗi tải dữ liệu: ${e.message}</p></div>`;
    }
  },

  async doCheckIn() {
    const empId = document.getElementById('attEmployeeSelect').value;
    if (!empId) {
      Components.showToast('Vui lòng chọn nhân viên', 'warning');
      return;
    }
    
    try {
      await Store.checkIn(empId);
      Components.showToast('Check-in thành công', 'success');
      this.renderToday();
    } catch(e) {
      Components.showToast('Lỗi: ' + e.message, 'error');
    }
  },

  async doCheckOut() {
    const empId = document.getElementById('attEmployeeSelect').value;
    if (!empId) {
      Components.showToast('Vui lòng chọn nhân viên', 'warning');
      return;
    }
    
    try {
      const result = await Store.checkOut(empId);
      if (result) {
        Components.showToast('Check-out thành công', 'success');
        this.renderToday();
      } else {
        Components.showToast('Bạn chưa check-in hôm nay!', 'error');
      }
    } catch(e) {
      Components.showToast('Lỗi: ' + e.message, 'error');
    }
  },

  unmount() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
  }
};
