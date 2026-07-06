/* Tạo file Excel thật từ dữ liệu Supabase của BizCore (chạy bằng Node). */
const fs = require('fs');
const path = require('path');
const os = require('os');
const XLSX = require('xlsx');

// đọc cấu hình từ config.local.js
const cfg = fs.readFileSync(path.join(__dirname, '..', 'app', 'js', 'config.local.js'), 'utf8');
const URL = cfg.match(/supabaseUrl:\s*'([^']+)'/)[1];
const KEY = cfg.match(/supabaseAnonKey:\s*'([^']+)'/)[1];
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };

const get = async (table, query = 'select=*') => {
  const r = await fetch(`${URL}/rest/v1/${table}?${query}`, { headers: H });
  if (!r.ok) { console.warn(table, r.status); return []; }
  return r.json();
};

(async () => {
  const now = new Date();
  const month = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');

  const [employees, departments, deals, customers, payroll] = await Promise.all([
    get('employees'), get('departments'), get('deals'), get('customers'),
    get('payroll', `select=*&month=eq.${month}`)
  ]);
  const deptName = id => (departments.find(d => d.id === id) || {}).name || '';
  const empName = id => (employees.find(e => e.id === id) || {}).name || id;
  const stMap = { active: 'Đang làm', on_leave: 'Nghỉ phép', resigned: 'Đã nghỉ' };

  const wb = XLSX.utils.book_new();
  const addSheet = (name, headers, rows) => {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = headers.map(h => ({ wch: Math.max(12, String(h).length + 3) }));
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  };

  addSheet('Nhân sự',
    ['Họ tên', 'Email', 'SĐT', 'Chức vụ', 'Phòng ban', 'Lương cơ bản (đ)', 'Vai trò', 'Trạng thái'],
    employees.map(e => [e.name, e.email, e.phone || '', e.position || '', deptName(e.department_id), e.base_salary || 0, e.role || '', stMap[e.status] || e.status]));

  addSheet('Phòng ban',
    ['Phòng ban', 'Mô tả', 'Số nhân viên'],
    departments.map(d => [d.name, d.description || '', employees.filter(e => e.department_id === d.id).length]));

  addSheet('Bảng lương ' + month,
    ['Nhân viên', 'Lương CB (đ)', 'Thực nhận (đ)', 'Thuế TNCN (đ)', 'BHXH NV (đ)'],
    payroll.map(p => [empName(p.employee_id), p.base_salary || 0, p.net_salary || 0, p.personal_tax || 0, (p.bhxh_employee || 0) + (p.bhyt_employee || 0) + (p.bhtn_employee || 0)]));

  addSheet('Cơ hội (CRM)',
    ['Tên cơ hội', 'Giá trị (đ)', 'Giai đoạn', 'Dự kiến chốt'],
    deals.map(d => [d.title, d.value || 0, d.stage, d.expected_close_date || '']));

  addSheet('Khách hàng',
    ['Tên', 'Trạng thái'],
    customers.map(c => [c.name || '', c.status || '']));

  // lưu ra Desktop nếu có, không thì thư mục hiện tại
  const desktops = [
    path.join(os.homedir(), 'Desktop'),
    path.join(os.homedir(), 'OneDrive', 'Desktop')
  ];
  const outDir = desktops.find(d => fs.existsSync(d)) || process.cwd();
  const outPath = path.join(outDir, `BizCore-BaoCao-${month}.xlsx`);
  XLSX.writeFile(wb, outPath);

  console.log('OK -> ' + outPath);
  console.log(`Sheets: Nhân sự(${employees.length}) · Phòng ban(${departments.length}) · Lương(${payroll.length}) · Cơ hội(${deals.length}) · Khách(${customers.length})`);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
