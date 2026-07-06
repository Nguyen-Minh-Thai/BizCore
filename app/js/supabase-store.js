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
    if (savedUser) {
      this.currentUser = JSON.parse(savedUser);
    }
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
    const wonDeals = deals.filter(d => d.stage === 'won');
    
    return {
      activeEmployees: employees.filter(e => e.status === 'active').length,
      newCustomers: customers.filter(c => c.status === 'new' || c.status === 'lead').length,
      pipelineValue: deals.reduce((s, d) => s + Number(d.value || 0), 0),
      winRate: deals.length > 0 ? Math.round((wonDeals.length / deals.length) * 100) : 0
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
    
    return data.map(d => {
      // Hide sensitive data if not HR/Admin or self
      let isSensitive = false;
      if (this.currentUser) {
        if (this.currentUser.role === 'admin' || this.currentUser.role === 'hr') isSensitive = true;
        if (this.currentUser.id === d.id) isSensitive = true;
        if (this.currentUser.role === 'manager' && this.currentUser.departmentId === d.department_id) isSensitive = true;
      }
      
      return {
        ...d, 
        departmentId: d.department_id, 
        baseSalary: isSensitive ? Number(d.base_salary) : null, // Mask salary
        password: null, // Always mask password
        createdAt: d.created_at
      };
    });
  },

  async getEmployee(id) {
    const { data, error } = await supabaseClient.from('employees').select('*').eq('id', id).single();
    if (error || !data) return null;
    return {...data, departmentId: data.department_id, baseSalary: Number(data.base_salary), createdAt: data.created_at};
  },

  async addEmployee(employeeData) {
    const dbData = {
      name: employeeData.name,
      email: employeeData.email,
      phone: employeeData.phone,
      department_id: employeeData.departmentId,
      position: employeeData.position,
      base_salary: employeeData.baseSalary,
      status: employeeData.status || 'active',
      role: employeeData.role || 'employee',
      password: employeeData.password || '123456'
    };
    const { data, error } = await supabaseClient.from('employees').insert([dbData]).select();
    if (error) throw error;
    return data[0];
  },

  async updateEmployee(id, employeeData) {
    const dbData = {};
    if (employeeData.name !== undefined) dbData.name = employeeData.name;
    if (employeeData.email !== undefined) dbData.email = employeeData.email;
    if (employeeData.phone !== undefined) dbData.phone = employeeData.phone;
    if (employeeData.departmentId !== undefined) dbData.department_id = employeeData.departmentId;
    if (employeeData.position !== undefined) dbData.position = employeeData.position;
    if (employeeData.baseSalary !== undefined) dbData.base_salary = employeeData.baseSalary;
    if (employeeData.status !== undefined) dbData.status = employeeData.status;
    if (employeeData.role !== undefined) dbData.role = employeeData.role;
    if (employeeData.password) dbData.password = employeeData.password;
    
    const { error } = await supabaseClient.from('employees').update(dbData).eq('id', id);
    if (error) throw error;
  },

  async deleteEmployee(id) {
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
    if (filters.month) query = query.gte('date', `${filters.month}-01`).lte('date', `${filters.month}-31`);
    
    const { data, error } = await query;
    if (error) { console.error(error); return []; }
    return data.map(d => ({...d, employeeId: d.employee_id, checkIn: d.check_in, checkOut: d.check_out}));
  },

  async getTodayAttendance() {
    const today = Utils.getCurrentDate();
    return await this.getAttendanceRecords({ date: today });
  },

  async getAttendanceByMonth(month) { // YYYY-MM
    let query = supabaseClient.from('attendance').select('*').gte('date', `${month}-01`).lte('date', `${month}-31`);
    
    // RBAC: Limit attendance view
    if (this.currentUser) {
      if (this.currentUser.role === 'employee') {
        query = query.eq('employee_id', this.currentUser.id);
      } else if (this.currentUser.role === 'manager') {
        // Find employees in manager's dept
        const emps = await this.getEmployees({ departmentId: this.currentUser.departmentId });
        const empIds = emps.map(e => e.id);
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
    const today = Utils.getCurrentDate();
    const records = await this.getAttendanceRecords({ employeeId, date: today });
    if (records.length === 0) return null;
    const record = records[0];
    
    const time = Utils.getCurrentTime();
    const { data, error } = await supabaseClient.from('attendance').update({
      check_out: time
    }).eq('id', record.id).select().single();
    
    if (error) throw error;
    return {...data, employeeId: data.employee_id, checkIn: data.check_in, checkOut: data.check_out};
  },

  async getMonthlyAttendanceSummary(employeeId, month) {
    const records = await this.getAttendanceRecords({ employeeId, month: month || Utils.getCurrentMonth() });
    return {
      totalWorkDays: 22,
      presentDays: records.filter(r => r.status === 'on_time' || r.status === 'late').length,
      lateDays: records.filter(r => r.status === 'late').length,
      absentDays: records.filter(r => r.status === 'absent').length,
      leaveDays: records.filter(r => r.status === 'leave').length,
      totalHours: 0
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
        netSalary: Number(d.net_salary),
        personalTax: Number(d.personal_tax || 0),
        bhxhCompany: Number(d.bhxh_company || 0),
        bhytCompany: Number(d.bhyt_company || 0),
        bhtnCompany: Number(d.bhtn_company || 0),
        bhxhEmployee: Number(d.bhxh_employee || 0),
        bhytEmployee: Number(d.bhyt_employee || 0),
        bhtnEmployee: Number(d.bhtn_employee || 0)
    }));
  },

  async generatePayroll(month) {
    const employees = await this.getEmployees({ status: 'active' });
    const existing = await this.getPayrollByMonth(month);
    if (existing.length > 0) return existing;

    const newRecords = [];
    for (const emp of employees) {
      const summary = await this.getMonthlyAttendanceSummary(emp.id, month);
      const workDays = 22;
      const actualDays = summary.presentDays || workDays;
      const prorated = emp.baseSalary * (actualDays / workDays);
      const allowances = Math.round(emp.baseSalary * 0.1);
      
      const bhxhE = Utils.calculateBHXH(emp.baseSalary);
      const bhytE = Utils.calculateBHYT(emp.baseSalary);
      const bhtnE = Utils.calculateBHTN(emp.baseSalary);
      const totalInsuranceE = bhxhE + bhytE + bhtnE;
      
      const bhxhC = Math.round(emp.baseSalary * 0.175);
      const bhytC = Math.round(emp.baseSalary * 0.03);
      const bhtnC = Math.round(emp.baseSalary * 0.01);
      
      const taxableIncome = prorated + allowances - totalInsuranceE;
      const tax = Utils.calculatePersonalTax(taxableIncome);
      const totalDeductions = totalInsuranceE + tax;
      const net = prorated + allowances - totalDeductions;
      
      const record = {
        employee_id: emp.id, month: month,
        base_salary: emp.baseSalary, net_salary: net,
        personal_tax: tax,
        bhxh_employee: bhxhE, bhyt_employee: bhytE, bhtn_employee: bhtnE,
        bhxh_company: bhxhC, bhyt_company: bhytC, bhtn_company: bhtnC
      };
      
      const { data } = await supabaseClient.from('payroll').insert(record).select().single();
      if(data) newRecords.push(data);
    }
    return this.getPayrollByMonth(month);
  },

  // ===== CRM CUSTOMERS =====
  async getCustomers() {
    let query = supabaseClient.from('customers').select('*');
    if (this.currentUser) {
      if (this.currentUser.role === 'hr' || this.currentUser.role === 'employee') {
        return [];
      }
    }
    const { data, error } = await query;
    if (error) { console.error(error); return []; }
    return data.map(d => ({...d, createdAt: d.created_at}));
  },

  async getCustomer(id) {
    const { data, error } = await supabaseClient.from('customers').select('*').eq('id', id).single();
    if (error || !data) return null;
    return data;
  },

  async addCustomer(customerData) {
    const { data, error } = await supabaseClient.from('customers').insert(customerData).select().single();
    if (error) throw error;
    return data;
  },

  async updateCustomer(id, customerData) {
    const { data, error } = await supabaseClient.from('customers').update(customerData).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteCustomer(id) {
    const { error } = await supabaseClient.from('customers').delete().eq('id', id);
    if (error) throw error;
    return true;
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
    return data.map(d => ({...d, customerId: d.customer_id, expectedCloseDate: d.expected_close_date, createdAt: d.created_at, value: Number(d.value)}));
  },

  async getDeal(id) {
    const { data, error } = await supabaseClient.from('deals').select('*').eq('id', id).single();
    if (error || !data) return null;
    return {...data, customerId: data.customer_id, expectedCloseDate: data.expected_close_date, value: Number(data.value)};
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
      value: dealData.value,
      stage: dealData.stage || 'lead',
      expected_close_date: dealData.expectedCloseDate
    };
    const { data, error } = await supabaseClient.from('deals').insert(dbData).select().single();
    if (error) throw error;
    return {...data, customerId: data.customer_id, expectedCloseDate: data.expected_close_date, value: Number(data.value)};
  },

  async updateDeal(id, dealData) {
    const dbData = {};
    if (dealData.title !== undefined) dbData.title = dealData.title;
    if (dealData.customerId !== undefined) dbData.customer_id = dealData.customerId;
    if (dealData.value !== undefined) dbData.value = dealData.value;
    if (dealData.stage !== undefined) dbData.stage = dealData.stage;
    if (dealData.expectedCloseDate !== undefined) dbData.expected_close_date = dealData.expectedCloseDate;

    const { data, error } = await supabaseClient.from('deals').update(dbData).eq('id', id).select().single();
    if (error) throw error;
    return {...data, customerId: data.customer_id, expectedCloseDate: data.expected_close_date, value: Number(data.value)};
  },

  async deleteDeal(id) {
    const { error } = await supabaseClient.from('deals').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};
