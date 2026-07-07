/* ===== BizCore ERP - Utilities ===== */
window.Utils = {
  // Định dạng tiền tệ VND
  formatCurrency(amount) {
    if (amount == null || isNaN(amount)) return '0 ₫';
    return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + ' ₫';
  },

  // Định dạng ngày DD/MM/YYYY
  formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  },

  // Định dạng giờ HH:mm
  formatTime(timeStr) {
    if (!timeStr) return '—';
    if (/^\d{2}:\d{2}/.test(timeStr)) return timeStr.substring(0, 5);
    const d = new Date(timeStr);
    if (isNaN(d)) return timeStr;
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  },

  // Định dạng ngày giờ
  formatDateTime(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  },

  // Định dạng tháng
  formatMonth(monthStr) {
    if (!monthStr) return '—';
    const [y, m] = monthStr.split('-');
    return `Tháng ${m}/${y}`;
  },

  // Thời gian tương đối
  formatRelativeTime(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Vừa xong';
    if (mins < 60) return `${mins} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    if (days < 30) return `${Math.floor(days / 7)} tuần trước`;
    return this.formatDate(dateStr);
  },

  // Tính số giờ làm việc
  calculateWorkHours(checkIn, checkOut) {
    if (!checkIn || !checkOut) return 0;
    const [h1, m1] = checkIn.split(':').map(Number);
    const [h2, m2] = checkOut.split(':').map(Number);
    const hours = (h2 * 60 + m2 - h1 * 60 - m1) / 60;
    return Math.max(0, Math.round(hours * 10) / 10);
  },

  // === Tính BHXH (Người lao động) ===
  calculateBHXH(salary) { return salary * 0.08; },
  calculateBHYT(salary) { return salary * 0.015; },
  calculateBHTN(salary) { return salary * 0.01; },
  calculateTotalEmployeeInsurance(salary) { return salary * 0.105; },

  // === Tính BHXH (Doanh nghiệp) ===
  calculateCompanyBHXH(salary) { return salary * 0.175; },
  calculateCompanyBHYT(salary) { return salary * 0.03; },
  calculateCompanyBHTN(salary) { return salary * 0.01; },
  calculateTotalCompanyInsurance(salary) { return salary * 0.215; },

  // Tính thuế TNCN lũy tiến
  calculatePersonalTax(taxableIncome) {
    // Giảm trừ gia cảnh: 11,000,000 bản thân
    const personalDeduction = 11000000;
    const income = taxableIncome - personalDeduction;
    if (income <= 0) return 0;
    let tax = 0;
    const brackets = [
      { limit: 5000000, rate: 0.05 },
      { limit: 10000000, rate: 0.10 },
      { limit: 18000000, rate: 0.15 },
      { limit: 32000000, rate: 0.20 },
      { limit: 52000000, rate: 0.25 },
      { limit: 80000000, rate: 0.30 },
      { limit: Infinity, rate: 0.35 }
    ];
    let remaining = income;
    let prev = 0;
    for (const b of brackets) {
      const taxable = Math.min(remaining, b.limit - prev);
      if (taxable <= 0) break;
      tax += taxable * b.rate;
      remaining -= taxable;
      prev = b.limit;
    }
    return Math.round(tax);
  },

  // Lấy số ngày làm việc tiêu chuẩn trong tháng (thứ 2 đến thứ 6)
  getWorkingDaysInMonth(monthStr) {
    if (!monthStr) return 22;
    const [year, month] = monthStr.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    let count = 0;
    let curr = new Date(startDate);
    while (curr <= endDate) {
      const day = curr.getDay();
      if (day !== 0 && day !== 6) {
        count++;
      }
      curr.setDate(curr.getDate() + 1);
    }
    return count;
  },

  // Tạo ID ngẫu nhiên
  generateId() {
    return Math.random().toString(36).substring(2, 10) + Date.now().toString(36).slice(-4);
  },

  // Debounce
  debounce(fn, delay = 300) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  // Nhóm mảng theo key
  groupBy(arr, key) {
    return arr.reduce((groups, item) => {
      const k = typeof key === 'function' ? key(item) : item[key];
      (groups[k] = groups[k] || []).push(item);
      return groups;
    }, {});
  },

  // Sắp xếp mảng
  sortBy(arr, key, direction = 'asc') {
    return [...arr].sort((a, b) => {
      let va = a[key], vb = b[key];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return direction === 'asc' ? -1 : 1;
      if (va > vb) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  },

  // Lời chào theo giờ
  getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Chào buổi sáng';
    if (h < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  },

  getCurrentDate() {
    return new Date().toISOString().split('T')[0];
  },

  getCurrentTime() {
    const now = new Date();
    return now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
  },

  getCurrentMonth() {
    const now = new Date();
    return now.getFullYear() + '-' + (now.getMonth() + 1).toString().padStart(2, '0');
  },

  // Lấy chữ cái đầu tên
  getInitials(name) {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  },

  // Màu avatar nhất quán từ tên
  getAvatarColor(name) {
    if (!name) return '#6366f1';
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    const colors = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4'];
    return colors[Math.abs(hash) % colors.length];
  },

  // Phân trang
  paginate(arr, page = 1, perPage = 10) {
    const total = arr.length;
    const totalPages = Math.ceil(total / perPage) || 1;
    const p = Math.max(1, Math.min(page, totalPages));
    const start = (p - 1) * perPage;
    return { data: arr.slice(start, start + perPage), total, totalPages, currentPage: p };
  },

  // Export CSV
  downloadCSV(headers, rows, filename = 'export.csv') {
    const bom = '\uFEFF';
    const csv = bom + [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  },

  // Export Excel (.xlsx) — sheets: [{name, headers:[], rows:[[]]}] hoặc 1 object {name,headers,rows}
  exportExcel(sheets, filename = 'cortex-export.xlsx') {
    const list = Array.isArray(sheets) ? sheets : [sheets];
    if (!window.XLSX) { // fallback CSV nếu thư viện chưa nạp
      const s = list[0] || { headers: [], rows: [] };
      this.downloadCSV(s.headers, s.rows, filename.replace(/\.xlsx$/i, '.csv'));
      return;
    }
    const wb = XLSX.utils.book_new();
    list.forEach((s, i) => {
      const ws = XLSX.utils.aoa_to_sheet([s.headers || [], ...(s.rows || [])]);
      ws['!cols'] = (s.headers || []).map(h => ({ wch: Math.max(12, String(h).length + 3) }));
      XLSX.utils.book_append_sheet(wb, ws, String(s.name || ('Sheet' + (i + 1))).slice(0, 31));
    });
    // Tải bằng Blob + thẻ <a download> để ÉP đúng tên + đuôi .xlsx (Edge/Chrome đều đúng)
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.rel = 'noopener'; a.style.display = 'none';
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 150);
  },

  clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }
};
