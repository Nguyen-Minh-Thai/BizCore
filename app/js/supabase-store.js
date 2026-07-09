/* ===== BizCore ERP - supabaseClient Store ===== */
const _bizCfg = window.BIZCORE_CONFIG || {};
const supabaseUrl = _bizCfg.supabaseUrl || '';
const supabaseKey = _bizCfg.supabaseAnonKey || '';
let supabaseClient = null;

if (window.supabase && supabaseUrl && supabaseKey) {
  supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
} else {
  console.error('[BizCore] Thiếu cấu hình Supabase. Sao chép js/config.example.js → js/config.local.js và điền supabaseUrl + supabaseAnonKey.');
}

window.Store = {
  currentUser: null,

  async init() {
    console.log("Supabase Store initialized");
    const savedUser = localStorage.getItem('bizcore_user');
    if (!savedUser || !supabaseClient) return;

    try {
      const parsed = JSON.parse(savedUser);
      const { data, error } = await supabaseClient
        .from('employees')
        .select('id, name, email, role, department_id, status')
        .eq('id', parsed.id)
        .single();

      if (!error && data && data.status === 'active') {
        this.currentUser = {
          id: data.id,
          name: data.name,
          email: data.email,
          role: data.role,
          departmentId: data.department_id
        };
        localStorage.setItem('bizcore_user', JSON.stringify(this.currentUser));
      } else {
        this.currentUser = null;
        localStorage.removeItem('bizcore_user');
      }
    } catch {
      this.currentUser = null;
      localStorage.removeItem('bizcore_user');
    }
  },

  _canViewSensitiveSalary(employeeId, departmentId) {
    if (!this.currentUser) return false;
    if (this.currentUser.role === 'admin' || this.currentUser.role === 'hr') return true;
    if (this.currentUser.id === employeeId) return true;
    if (this.currentUser.role === 'manager' && this.currentUser.departmentId === departmentId) return true;
    return false;
  },

  _mapEmployee(d, maskSalary = true) {
    const canView = maskSalary ? this._canViewSensitiveSalary(d.id, d.department_id) : true;
    return {
      ...d,
      departmentId: d.department_id,
      baseSalary: canView ? Number(d.base_salary) : null,
      kpiSalary: canView ? Number(d.kpi_salary || 0) : null,
      password: null,
      hireDate: d.hire_date,
      exitDate: d.exit_date,
      createdAt: d.created_at
    };
  },

  _logAction() {
    return this.currentUser?.name || 'Hệ thống';
  },

  async login(email, password) {
    // In a real secure app, passwords should be hashed. For this ERP demo, we compare raw string passwords from the table.
    const { data, error } = await supabaseClient
      .from('employees')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .single();

    if (error || !data) {
      throw new Error('Email hoặc mật khẩu không đúng!');
    }

    if (data.status !== 'active') {
      throw new Error('Tài khoản đã bị khóa!');
    }

    this.currentUser = {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      departmentId: data.department_id
    };
    localStorage.setItem('bizcore_user', JSON.stringify(this.currentUser));
    return this.currentUser;
  },

  logout() {
    this.currentUser = null;
    localStorage.removeItem('bizcore_user');
  },

  // ===== STATS =====
  async getStats() {
    const employees = await this.getEmployees();
    const deals = await this.getDeals();
    const customers = await this.getCustomers();
    const openDeals = deals.filter(d => d.stage !== 'won' && d.stage !== 'lost');
    
    return {
      activeEmployees: employees.filter(e => e.status === 'active').length,
      newCustomers: customers.filter(c => c.status === 'lead' || c.status === 'prospect').length,
      pipelineValue: openDeals.reduce((s, d) => s + Number(d.value || 0), 0),
      winRate: Utils.calculateWinRate(deals)
    };
  },

  // ===== EMPLOYEES =====
  async getEmployees(filters = {}) {
    let query = supabaseClient.from('employees').select('*');
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.departmentId) query = query.eq('department_id', filters.departmentId);
    
    // RBAC: If manager, only see own department (except if they are viewing the whole list to assign tasks, but usually managers only manage their dept)
    // Actually, in many ERPs, everyone can see the employee directory, but only HR/Admin see salaries.
    
    const { data, error } = await query;
    if (error) { console.error(error); return []; }
    
    return data.map(d => this._mapEmployee(d));
  },

  async getEmployee(id) {
    const { data, error } = await supabaseClient.from('employees').select('*').eq('id', id).single();
    if (error || !data) return null;
    return this._mapEmployee(data);
  },

  async addEmployee(employeeData) {
    if (!this.currentUser || !['admin', 'hr'].includes(this.currentUser.role)) {
      throw new Error('Không có quyền thêm nhân viên');
    }
    const dbData = {
      name: employeeData.name,
      email: employeeData.email,
      phone: employeeData.phone,
      department_id: employeeData.departmentId,
      position: employeeData.position,
      base_salary: employeeData.baseSalary,
      kpi_salary: employeeData.kpiSalary || 0,
      status: employeeData.status || 'active',
      role: employeeData.role || 'employee',
      password: employeeData.password || '123456',
      hire_date: employeeData.hireDate || null, // <-- Lưu ngày vào
      exit_date: employeeData.exitDate || null  // <-- Lưu ngày rời
    };
    const { data, error } = await supabaseClient.from('employees').insert([dbData]).select();
    if (error) throw error;
    return data[0];
  },

  async updateEmployee(id, employeeData) {
    if (!this.currentUser || !['admin', 'hr'].includes(this.currentUser.role)) {
      throw new Error('Không có quyền cập nhật nhân viên');
    }
    const dbData = {};
    if (employeeData.name !== undefined) dbData.name = employeeData.name;
    if (employeeData.email !== undefined) dbData.email = employeeData.email;
    if (employeeData.phone !== undefined) dbData.phone = employeeData.phone;
    if (employeeData.departmentId !== undefined) dbData.department_id = employeeData.departmentId;
    if (employeeData.position !== undefined) dbData.position = employeeData.position;
    if (employeeData.baseSalary !== undefined) dbData.base_salary = employeeData.baseSalary;
    if (employeeData.kpiSalary !== undefined) dbData.kpi_salary = employeeData.kpiSalary;
    if (employeeData.status !== undefined) dbData.status = employeeData.status;
    if (employeeData.role !== undefined) dbData.role = employeeData.role;
    if (employeeData.password) dbData.password = employeeData.password;
    if (employeeData.hireDate !== undefined) dbData.hire_date = employeeData.hireDate || null; // <-- Cập nhật ngày vào
    if (employeeData.exitDate !== undefined) dbData.exit_date = employeeData.exitDate || null;  // <-- Cập nhật ngày rời
    
    const { error } = await supabaseClient.from('employees').update(dbData).eq('id', id);
    if (error) throw error;
  },

  async deleteEmployee(id) {
    if (!this.currentUser || !['admin', 'hr'].includes(this.currentUser.role)) {
      throw new Error('Không có quyền xóa nhân viên');
    }
    const { error } = await supabaseClient.from('employees').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // ===== DEPARTMENTS =====
  async getDepartments() {
    const { data, error } = await supabaseClient.from('departments').select('*');
    if (error) { console.error(error); return []; }
    return data.map(d => ({...d, managerId: d.manager_id, createdAt: d.created_at}));
  },

  async getDepartment(id) {
    const { data, error } = await supabaseClient.from('departments').select('*').eq('id', id).single();
    if (error || !data) return null;
    return {...data, managerId: data.manager_id, createdAt: data.created_at};
  },

  async addDepartment(deptData) {
    const { data, error } = await supabaseClient.from('departments').insert({
      name: deptData.name,
      description: deptData.description,
      manager_id: deptData.managerId
    }).select().single();
    if (error) throw error;
    return {...data, managerId: data.manager_id, createdAt: data.created_at};
  },

  async updateDepartment(id, deptData) {
    const dbData = {};
    if (deptData.name !== undefined) dbData.name = deptData.name;
    if (deptData.description !== undefined) dbData.description = deptData.description;
    if (deptData.managerId !== undefined) dbData.manager_id = deptData.managerId;

    const { data, error } = await supabaseClient.from('departments').update(dbData).eq('id', id).select().single();
    if (error) throw error;
    return {...data, managerId: data.manager_id, createdAt: data.created_at};
  },

  async deleteDepartment(id) {
    const { error } = await supabaseClient.from('departments').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // ===== ATTENDANCE =====
  async getAttendanceRecords(filters = {}) {
    let query = supabaseClient.from('attendance').select('*');
    if (filters.employeeId) query = query.eq('employee_id', filters.employeeId);
    if (filters.date) query = query.eq('date', filters.date);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.month) {
      query = query.gte('date', `${filters.month}-01`).lte('date', Utils.getMonthEndDate(filters.month));
    }
    if (filters.startDate) query = query.gte('date', filters.startDate);
    if (filters.endDate) query = query.lte('date', filters.endDate);
    
    const { data, error } = await query;
    if (error) { console.error(error); return []; }
    return data.map(d => ({
      ...d,
      employeeId: d.employee_id,
      checkIn: d.check_in,
      checkOut: d.check_out,
      workHours: Number(d.work_hours || 0)
    }));
  },

  async getTodayAttendance() {
    const today = Utils.getCurrentDate();
    return await this.getAttendanceRecords({ date: today });
  },

  async getAttendanceByMonth(month) { // YYYY-MM
    let query = supabaseClient.from('attendance').select('*')
      .gte('date', `${month}-01`)
      .lte('date', Utils.getMonthEndDate(month));
    
    if (this.currentUser) {
      if (this.currentUser.role === 'employee') {
        query = query.eq('employee_id', this.currentUser.id);
      } else if (this.currentUser.role === 'manager') {
        const emps = await this.getEmployees({ departmentId: this.currentUser.departmentId });
        const empIds = emps.map(e => e.id);
        if (empIds.length === 0) return [];
        query = query.in('employee_id', empIds);
      }
    }

    const { data, error } = await query;
    if (error) { console.error(error); return []; }
    return data.map(d => ({
      id: d.id, employeeId: d.employee_id, date: d.date, status: d.status,
      checkIn: d.check_in, checkOut: d.check_out, workHours: Number(d.work_hours)
    }));
  },

  async checkIn(employeeId) {
    if (this.currentUser?.role === 'employee' && this.currentUser.id !== employeeId) {
      throw new Error('Bạn chỉ có thể chấm công cho chính mình');
    }
    const today = Utils.getCurrentDate();
    const existing = await this.getAttendanceRecords({ employeeId, date: today });
    if (existing.length > 0) return existing[0];

    const time = Utils.getCurrentTime();
    const [h, m] = time.split(':').map(Number);
    const status = (h < 8 || (h === 8 && m <= 30)) ? 'on_time' : 'late';
    
    const { data, error } = await supabaseClient.from('attendance').insert({
      employee_id: employeeId,
      date: today,
      check_in: time,
      status: status
    }).select().single();
    
    if (error) throw error;
    return {...data, employeeId: data.employee_id, checkIn: data.check_in, checkOut: data.check_out};
  },

  async checkOut(employeeId) {
    if (this.currentUser?.role === 'employee' && this.currentUser.id !== employeeId) {
      throw new Error('Bạn chỉ có thể chấm công cho chính mình');
    }
    const today = Utils.getCurrentDate();
    const records = await this.getAttendanceRecords({ employeeId, date: today });
    if (records.length === 0) return null;
    const record = records[0];
    
    const time = Utils.getCurrentTime();
    const workHours = Utils.calculateWorkHours(record.checkIn, time);
    const { data, error } = await supabaseClient.from('attendance').update({
      check_out: time,
      work_hours: workHours
    }).eq('id', record.id).select().single();
    
    if (error) throw error;
    return {...data, employeeId: data.employee_id, checkIn: data.check_in, checkOut: data.check_out, workHours: Number(data.work_hours)};
  },

  async getMonthlyAttendanceSummary(employeeId, month) {
    const records = await this.getAttendanceRecords({ employeeId, month: month || Utils.getCurrentMonth() });
    return {
      totalWorkDays: Utils.getWorkingDaysInMonth(month || Utils.getCurrentMonth()),
      presentDays: records.filter(r => r.status === 'on_time' || r.status === 'late').length,
      lateDays: records.filter(r => r.status === 'late').length,
      absentDays: records.filter(r => r.status === 'absent').length,
      leaveDays: records.filter(r => r.status === 'leave').length,
      totalHours: records.reduce((s, r) => s + Number(r.workHours || 0), 0),
      hasRecords: records.length > 0
    };
  },

  // ===== PAYROLL (Keep it simple for now, save directly to supabaseClient if needed, but payroll can be computed) =====
  async getPayrollByMonth(month) {
    let query = supabaseClient.from('payroll').select('*').eq('month', month);

    // RBAC: Limit payroll view
    if (this.currentUser) {
      if (this.currentUser.role === 'employee') {
        query = query.eq('employee_id', this.currentUser.id);
      } else if (this.currentUser.role === 'manager') {
        const emps = await this.getEmployees({ departmentId: this.currentUser.departmentId });
        const empIds = emps.map(e => e.id);
        if (empIds.length > 0) {
           query = query.in('employee_id', empIds);
        } else {
           return []; // No employees in dept
        }
      }
    }

    const { data, error } = await query;
    if (error) { console.error(error); return []; }
    return data.map(d => ({
        ...d, employeeId: d.employee_id,
        baseSalary: Number(d.base_salary),
        kpiSalary: Number(d.kpi_salary || 0),
        netSalary: Number(d.net_salary),
        personalTax: Number(d.personal_tax || 0),
        allowances: Number(d.allowances || 0), // <-- Lấy phụ cấp từ DB
        workDays: Number(d.work_days || 0),
        actualWorkDays: Number(d.actual_work_days || 0),
        bhxhCompany: Number(d.bhxh_company || 0),
        bhytCompany: Number(d.bhyt_company || 0),
        bhtnCompany: Number(d.bhtn_company || 0),
        bhxhEmployee: Number(d.bhxh_employee || 0),
        bhytEmployee: Number(d.bhyt_employee || 0),
        bhtnEmployee: Number(d.bhtn_employee || 0)
    }));
  },

  async generatePayroll(month) {
    if (!this.currentUser || !['admin', 'hr'].includes(this.currentUser.role)) {
      throw new Error('Chỉ Admin/HR mới được tính lương');
    }

    const { data: rawEmployees, error: empError } = await supabaseClient
      .from('employees')
      .select('*')
      .eq('status', 'active');
    if (empError) throw empError;
    const employees = rawEmployees.map(d => this._mapEmployee(d, false));
    
    await supabaseClient.from('payroll').delete().eq('month', month);

    const newRecords = [];
    for (const emp of employees) {
      const summary = await this.getMonthlyAttendanceSummary(emp.id, month);
      const workDays = Utils.getWorkingDaysInMonth(month);
      const actualDays = summary.hasRecords ? summary.presentDays : workDays;
      
      const baseSalary = Number(emp.baseSalary) || 0;
      const kpiSalary = Number(emp.kpiSalary) || 0;
      const prorated = Math.round(baseSalary * (actualDays / workDays));
      let kpiProrated = Math.round(kpiSalary * (actualDays / workDays));
      
      // Áp dụng biến động KPI theo yêu cầu khách hàng:
      if (emp.kpiSalary > 0) {
        if (emp.name === 'Vũ Minh Đức') {
          kpiProrated += 15000000; // Vượt trội hẳn 10-20 triệu
        } else if (emp.name === 'Phạm Thu Dung') {
          kpiProrated += 7000000;  // Vượt 5-10 triệu
        } else if (emp.name === 'Hoàng Thị Em') {
          kpiProrated += 8000000;  // Vượt 5-10 triệu
        } else if (emp.name === 'Đỗ Quang Huy') {
          kpiProrated += 6000000;  // Vượt 5-10 triệu
        } else if (emp.name === 'Trần Thị Bình') {
          kpiProrated -= 4500000;  // Không đạt KPI, cách hụt tầm 4.5 triệu
        } else if (emp.name === 'Lê Hoàng Cường') {
          kpiProrated -= 4000000;  // Không đạt KPI, cách hụt tầm 4 triệu
        } else if (emp.name === 'Nguyễn Văn An') {
          kpiProrated -= 5000000;  // Không đạt KPI, cách hụt tầm 5 triệu
        }
      }
      
      // Giới hạn lương KPI thực tế không dưới 0
      if (kpiProrated < 0) kpiProrated = 0;

      const allowances = 0; // <-- Đặt phụ cấp bằng 0 để không tính phụ cấp ẩn
      
      // Theo Luật Lao động Việt Nam: Nếu làm dưới 14 ngày trong tháng thì không đóng BHXH/BHYT/BHTN
      const paysInsurance = actualDays >= 14;
      
      const bhxhE = paysInsurance ? Math.round(prorated * 0.08) : 0;
      const bhytE = paysInsurance ? Math.round(prorated * 0.015) : 0;
      const bhtnE = paysInsurance ? Math.round(prorated * 0.01) : 0;
      const totalInsuranceE = bhxhE + bhytE + bhtnE;
      
      const bhxhC = paysInsurance ? Math.round(prorated * 0.175) : 0;
      const bhytC = paysInsurance ? Math.round(prorated * 0.03) : 0;
      const bhtnC = paysInsurance ? Math.round(prorated * 0.01) : 0;
      
      const grossIncome = prorated + kpiProrated + allowances;
      const tax = Utils.calculatePersonalTax(Math.max(0, grossIncome - totalInsuranceE));
      const net = grossIncome - totalInsuranceE - tax;
      
      const record = {
        employee_id: emp.id, month: month,
        base_salary: prorated,
        kpi_salary: kpiProrated,
        net_salary: net,
        personal_tax: tax,
        allowances: allowances, // <-- Lưu phụ cấp vào DB
        work_days: workDays,
        actual_work_days: actualDays,
        bhxh_employee: bhxhE, bhyt_employee: bhytE, bhtn_employee: bhtnE,
        bhxh_company: bhxhC, bhyt_company: bhytC, bhtn_company: bhtnC
      };
      
      const { data, error } = await supabaseClient.from('payroll').insert(record).select().single();
      if (error) {
        console.error("Lỗi insert payroll:", error);
        throw error;
      }
      if(data) newRecords.push(data);
    }
    return this.getPayrollByMonth(month);
  },

  // ===== CRM CUSTOMERS =====
  async getCustomers() {
    let query = supabaseClient.from('customers').select('*, employee:employees(id, name)');
    if (this.currentUser) {
      if (this.currentUser.role === 'hr' || this.currentUser.role === 'employee') {
        return [];
      }
    }
    const { data, error } = await query;
    if (error) { console.error(error); return []; }
    return data.map(d => ({
      ...d, 
      employeeId: d.employee_id, 
      employeeName: d.employee ? d.employee.name : null,
      createdAt: d.created_at
    }));
  },

  async getCustomer(id) {
    const { data, error } = await supabaseClient.from('customers').select('*, employee:employees(id, name)').eq('id', id).single();
    if (error || !data) return null;
    return {
      ...data,
      employeeId: data.employee_id,
      employeeName: data.employee ? data.employee.name : null
    };
  },

  async addCustomer(customerData) {
    const dbData = {
      name: customerData.name,
      company: customerData.company,
      email: customerData.email,
      phone: customerData.phone,
      status: customerData.status,
      source: customerData.source,
      employee_id: customerData.employeeId || null
    };
    const { data, error } = await supabaseClient.from('customers').insert(dbData).select().single();
    if (error) throw error;

    // Log tạo mới
    try {
      await supabaseClient.from('customer_logs').insert({
        customer_id: data.id,
        action: 'Tạo khách hàng mới trên hệ thống',
        created_by: this._logAction()
      });
    } catch(e) {
      console.error("Lỗi ghi log addCustomer:", e);
    }

    return data;
  },

  async updateCustomer(id, customerData) {
    // Lấy dữ liệu cũ để đối chiếu
    let oldData = null;
    try {
      const { data } = await supabaseClient.from('customers').select('*').eq('id', id).single();
      oldData = data;
    } catch(e) {
      console.error(e);
    }

    const dbData = {
      name: customerData.name,
      company: customerData.company,
      email: customerData.email,
      phone: customerData.phone,
      status: customerData.status,
      source: customerData.source,
      employee_id: customerData.employeeId || null
    };
    const { data, error } = await supabaseClient.from('customers').update(dbData).eq('id', id).select().single();
    if (error) throw error;

    // Log thay đổi
    try {
      if (oldData) {
        const logs = [];
        if (oldData.status !== dbData.status) {
          const statusLabels = { lead: 'Lead / Mới', prospect: 'Tiềm năng', quote: 'Báo giá', negotiate: 'Đàm phán', won: 'Thành công (Won)', lost: 'Thất bại (Lost)' };
          const oldLbl = statusLabels[oldData.status] || oldData.status;
          const newLbl = statusLabels[dbData.status] || dbData.status;
          logs.push(`Chuyển trạng thái từ "${oldLbl}" sang "${newLbl}"`);
        }
        if (oldData.employee_id !== dbData.employee_id) {
          logs.push(`Cập nhật nhân viên chăm sóc khách hàng`);
        }
        if (oldData.name !== dbData.name) {
          logs.push(`Thay đổi tên khách hàng từ "${oldData.name}" thành "${dbData.name}"`);
        }
        for (const action of logs) {
          await supabaseClient.from('customer_logs').insert({ customer_id: id, action, created_by: this._logAction() });
        }
      }
    } catch(e) {
      console.error("Lỗi ghi log updateCustomer:", e);
    }

    return data;
  },

  async deleteCustomer(id) {
    const { error } = await supabaseClient.from('customers').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // ===== CRM CUSTOMER NOTES =====
  async getCustomerNotes(customerId) {
    const { data, error } = await supabaseClient.from('customer_notes').select('*').eq('customer_id', customerId).order('created_at', { ascending: false });
    if (error) { console.error("Lỗi lấy ghi chú:", error); return []; }
    return data.map(d => ({
      id: d.id,
      customerId: d.customer_id,
      content: d.content,
      tags: d.tags ? d.tags.split(',') : [],
      employees: d.employees ? d.employees.split(',') : [],
      fileName: d.file_name || null,
      isImportant: d.is_important,
      createdAt: d.created_at
    }));
  },

  async addCustomerNote(noteData) {
    const dbData = {
      customer_id: noteData.customerId,
      content: noteData.content,
      tags: noteData.tags ? noteData.tags.join(',') : null,
      employees: noteData.employees ? noteData.employees.join(',') : null,
      is_important: noteData.isImportant || false,
      file_name: noteData.fileName || null
    };
    const { data, error } = await supabaseClient.from('customer_notes').insert(dbData).select().single();
    if (error) throw error;

    // Log action
    try {
      await supabaseClient.from('customer_logs').insert({
        customer_id: noteData.customerId,
        action: `Thêm ghi chú mới: "${noteData.content.substring(0, 30)}${noteData.content.length > 30 ? '...' : ''}"`,
        created_by: this._logAction()
      });
    } catch(e) {
      console.error(e);
    }

    return {
      id: data.id,
      customerId: data.customer_id,
      content: data.content,
      tags: data.tags ? data.tags.split(',') : [],
      employees: data.employees ? data.employees.split(',') : [],
      fileName: data.file_name || null,
      isImportant: data.is_important,
      createdAt: data.created_at
    };
  },

  async updateCustomerNote(id, noteData) {
    const dbData = {
      content: noteData.content,
      tags: noteData.tags ? noteData.tags.join(',') : null,
      employees: noteData.employees ? noteData.employees.join(',') : null,
      is_important: noteData.isImportant || false,
      file_name: noteData.fileName || null
    };
    const { data, error } = await supabaseClient.from('customer_notes').update(dbData).eq('id', id).select().single();
    if (error) throw error;
    return {
      id: data.id,
      customerId: data.customer_id,
      content: data.content,
      tags: data.tags ? data.tags.split(',') : [],
      employees: data.employees ? data.employees.split(',') : [],
      fileName: data.file_name || null,
      isImportant: data.is_important,
      createdAt: data.created_at
    };
  },

  async deleteCustomerNote(noteId) {
    const { error } = await supabaseClient.from('customer_notes').delete().eq('id', noteId);
    if (error) throw error;
    return true;
  },

  // ===== CRM CUSTOMER CONTACTS =====
  async getCustomerContacts(customerId) {
    const { data, error } = await supabaseClient.from('customer_contacts').select('*').eq('customer_id', customerId).order('created_at', { ascending: true });
    if (error) { console.error(error); return []; }
    return data.map(d => ({...d, customerId: d.customer_id, createdAt: d.created_at}));
  },

  async addCustomerContact(contactData) {
    const dbData = {
      customer_id: contactData.customerId,
      name: contactData.name,
      position: contactData.position || null,
      email: contactData.email || null,
      phone: contactData.phone || null
    };
    const { data, error } = await supabaseClient.from('customer_contacts').insert(dbData).select().single();
    if (error) throw error;
    return data;
  },

  async updateCustomerContact(id, contactData) {
    const dbData = {
      name: contactData.name,
      position: contactData.position || null,
      email: contactData.email || null,
      phone: contactData.phone || null
    };
    const { data, error } = await supabaseClient.from('customer_contacts').update(dbData).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteCustomerContact(id) {
    const { error } = await supabaseClient.from('customer_contacts').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // ===== CRM CUSTOMER SERVICES =====
  async getCustomerServices(customerId) {
    const { data, error } = await supabaseClient.from('customer_service_confirms').select('*').eq('customer_id', customerId).order('created_at', { ascending: true });
    if (error) { console.error(error); return []; }
    return data.map(d => ({...d, customerId: d.customer_id, confirmDate: d.confirm_date, createdAt: d.created_at}));
  },

  async addCustomerService(serviceData) {
    const dbData = {
      customer_id: serviceData.customerId,
      code: serviceData.code,
      name: serviceData.name,
      confirm_date: serviceData.confirmDate,
      status: serviceData.status || 'pending'
    };
    const { data, error } = await supabaseClient.from('customer_service_confirms').insert(dbData).select().single();
    if (error) throw error;
    return data;
  },

  // ===== CRM CUSTOMER QUOTES =====
  async getCustomerQuotes(customerId) {
    const { data, error } = await supabaseClient.from('customer_quotes').select('*').eq('customer_id', customerId).order('created_at', { ascending: true });
    if (error) { console.error(error); return []; }
    return data.map(d => ({...d, customerId: d.customer_id, validUntil: d.valid_until, createdAt: d.created_at}));
  },

  async addCustomerQuote(quoteData) {
    const dbData = {
      customer_id: quoteData.customerId,
      code: quoteData.code,
      title: quoteData.title,
      value: Number(quoteData.value || 0),
      valid_until: quoteData.validUntil || null,
      status: quoteData.status || 'draft'
    };
    const { data, error } = await supabaseClient.from('customer_quotes').insert(dbData).select().single();
    if (error) throw error;
    return data;
  },

  async deleteCustomerQuote(id) {
    const { error } = await supabaseClient.from('customer_quotes').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // ===== CRM CUSTOMER ORDERS =====
  async getCustomerOrders(customerId) {
    const { data, error } = await supabaseClient.from('customer_orders').select('*').eq('customer_id', customerId).order('created_at', { ascending: true });
    if (error) { console.error(error); return []; }
    return data.map(d => ({...d, customerId: d.customer_id, orderDate: d.order_date, createdAt: d.created_at}));
  },

  async addCustomerOrder(orderData) {
    const dbData = {
      customer_id: orderData.customerId,
      code: orderData.code,
      order_date: orderData.orderDate,
      value: Number(orderData.value || 0),
      status: orderData.status || 'pending'
    };
    const { data, error } = await supabaseClient.from('customer_orders').insert(dbData).select().single();
    if (error) throw error;
    return data;
  },

  async deleteCustomerOrder(id) {
    const { error } = await supabaseClient.from('customer_orders').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // ===== CRM CUSTOMER LOGS =====
  async getCustomerLogs(customerId) {
    const { data, error } = await supabaseClient.from('customer_logs').select('*').eq('customer_id', customerId).order('created_at', { ascending: false });
    if (error) { console.error(error); return []; }
    return data.map(d => ({...d, customerId: d.customer_id, createdAt: d.created_at}));
  },

  // ===== CRM DEALS =====
  async getDeals() {
    let query = supabaseClient.from('deals').select('*');
    
    if (this.currentUser) {
      if (this.currentUser.role === 'hr' || this.currentUser.role === 'employee') {
        return []; // HR and Employee don't see deals (for this demo's RBAC)
      }
      // If manager, we could filter deals assigned to their dept, but we don't have assignee yet.
      // So manager sees all deals for now.
    }
    
    const { data, error } = await query;
    if (error) { console.error(error); return []; }
    return data.map(d => ({
      ...d, 
      customerId: d.customer_id, 
      expectedCloseDate: d.expected_close_date, 
      createdAt: d.created_at, 
      value: Number(d.value || 0),
      leadReason: d.lead_reason,
      leadSource: d.lead_source,
      referrerEmployeeId: d.referrer_employee_id,
      interestedProduct: d.interested_product,
      consultantEmployeeId: d.consultant_employee_id,
      expectedPrice: Number(d.expected_price || 0),
      negotiateContent: d.negotiate_content,
      negotiatePrice: Number(d.negotiate_price || 0),
      negotiatorEmployeeId: d.negotiator_employee_id,
      successReason: d.success_reason,
      finalDealPrice: Number(d.final_deal_price || 0),
      lastStageBeforeWon: d.last_stage_before_won,
      contributorEmployeeIds: d.contributor_employee_ids || [],
      lostReason: d.lost_reason,
      lastStageBeforeLost: d.last_stage_before_lost
    }));
  },

  async getDeal(id) {
    const { data, error } = await supabaseClient.from('deals').select('*').eq('id', id).single();
    if (error || !data) return null;
    return {
      ...data, 
      customerId: data.customer_id, 
      expectedCloseDate: data.expected_close_date, 
      value: Number(data.value || 0),
      leadReason: data.lead_reason,
      leadSource: data.lead_source,
      referrerEmployeeId: data.referrer_employee_id,
      interestedProduct: data.interested_product,
      consultantEmployeeId: data.consultant_employee_id,
      expectedPrice: Number(data.expected_price || 0),
      negotiateContent: data.negotiate_content,
      negotiatePrice: Number(data.negotiate_price || 0),
      negotiatorEmployeeId: data.negotiator_employee_id,
      successReason: data.success_reason,
      finalDealPrice: Number(data.final_deal_price || 0),
      lastStageBeforeWon: data.last_stage_before_won,
      contributorEmployeeIds: data.contributor_employee_ids || [],
      lostReason: data.lost_reason,
      lastStageBeforeLost: data.last_stage_before_lost
    };
  },

  async getDealsByStage() {
    const deals = await this.getDeals();
    const stages = { 'lead': [], 'qualified': [], 'proposal': [], 'negotiation': [], 'won': [], 'lost': [] };
    deals.forEach(d => { if (stages[d.stage]) stages[d.stage].push(d); });
    return stages;
  },

  async addDeal(dealData) {
    const dbData = {
      title: dealData.title,
      customer_id: dealData.customerId,
      value: Number(dealData.value || 0),
      stage: dealData.stage || 'lead',
      expected_close_date: dealData.expectedCloseDate || null,
      lead_reason: dealData.leadReason || null,
      lead_source: dealData.leadSource || null,
      referrer_employee_id: dealData.referrerEmployeeId || null,
      interested_product: dealData.interestedProduct || null,
      consultant_employee_id: dealData.consultantEmployeeId || null,
      expected_price: Number(dealData.expectedPrice || 0),
      negotiate_content: dealData.negotiateContent || null,
      negotiate_price: Number(dealData.negotiatePrice || 0),
      negotiator_employee_id: dealData.negotiatorEmployeeId || null,
      success_reason: dealData.successReason || null,
      final_deal_price: Number(dealData.finalDealPrice || 0),
      last_stage_before_won: dealData.lastStageBeforeWon || null,
      contributor_employee_ids: dealData.contributorEmployeeIds || [],
      lost_reason: dealData.lostReason || null,
      last_stage_before_lost: dealData.lastStageBeforeLost || null
    };
    const { data, error } = await supabaseClient.from('deals').insert(dbData).select().single();
    if (error) throw error;
    return {
      ...data, 
      customerId: data.customer_id, 
      expectedCloseDate: data.expected_close_date, 
      value: Number(data.value || 0)
    };
  },

  async updateDeal(id, dealData) {
    const dbData = {};
    if (dealData.title !== undefined) dbData.title = dealData.title;
    if (dealData.customerId !== undefined) dbData.customer_id = dealData.customerId;
    if (dealData.value !== undefined) dbData.value = Number(dealData.value || 0);
    if (dealData.stage !== undefined) dbData.stage = dealData.stage;
    if (dealData.expectedCloseDate !== undefined) dbData.expected_close_date = dealData.expectedCloseDate || null;
    if (dealData.leadReason !== undefined) dbData.lead_reason = dealData.leadReason || null;
    if (dealData.leadSource !== undefined) dbData.lead_source = dealData.leadSource || null;
    if (dealData.referrerEmployeeId !== undefined) dbData.referrer_employee_id = dealData.referrerEmployeeId || null;
    if (dealData.interestedProduct !== undefined) dbData.interested_product = dealData.interestedProduct || null;
    if (dealData.consultantEmployeeId !== undefined) dbData.consultant_employee_id = dealData.consultantEmployeeId || null;
    if (dealData.expectedPrice !== undefined) dbData.expected_price = Number(dealData.expectedPrice || 0);
    if (dealData.negotiateContent !== undefined) dbData.negotiate_content = dealData.negotiateContent || null;
    if (dealData.negotiatePrice !== undefined) dbData.negotiate_price = Number(dealData.negotiatePrice || 0);
    if (dealData.negotiatorEmployeeId !== undefined) dbData.negotiator_employee_id = dealData.negotiatorEmployeeId || null;
    if (dealData.successReason !== undefined) dbData.success_reason = dealData.successReason || null;
    if (dealData.finalDealPrice !== undefined) dbData.final_deal_price = Number(dealData.finalDealPrice || 0);
    if (dealData.lastStageBeforeWon !== undefined) dbData.last_stage_before_won = dealData.lastStageBeforeWon || null;
    if (dealData.contributorEmployeeIds !== undefined) dbData.contributor_employee_ids = dealData.contributorEmployeeIds || [];
    if (dealData.lostReason !== undefined) dbData.lost_reason = dealData.lostReason || null;
    if (dealData.lastStageBeforeLost !== undefined) dbData.last_stage_before_lost = dealData.lastStageBeforeLost || null;

    const { data, error } = await supabaseClient.from('deals').update(dbData).eq('id', id).select().single();
    if (error) throw error;
    return {
      ...data, 
      customerId: data.customer_id, 
      expectedCloseDate: data.expected_close_date, 
      value: Number(data.value || 0)
    };
  },

  async deleteDeal(id) {
    const { error } = await supabaseClient.from('deals').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  async getAllCustomerNotesCount() {
    const { count, error } = await supabaseClient.from('customer_notes').select('*', { count: 'exact', head: true });
    if (error) { console.error(error); return 0; }
    return count || 0;
  },

  async getAllCustomerContactsCount() {
    const { count, error } = await supabaseClient.from('customer_contacts').select('*', { count: 'exact', head: true });
    if (error) { console.error(error); return 0; }
    return count || 0;
  },

  async getAllCustomerOrders() {
    const { data, error } = await supabaseClient.from('customer_orders').select('*');
    if (error) { console.error(error); return []; }
    return data.map(d => ({...d, customerId: d.customer_id, orderDate: d.order_date, createdAt: d.created_at}));
  },

  async getAllCustomerNotes() {
    const { data, error } = await supabaseClient.from('customer_notes').select('*');
    if (error) { console.error(error); return []; }
    return data || [];
  }
};
