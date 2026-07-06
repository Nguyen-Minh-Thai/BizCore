/* ===== BizCore ERP - SPA Router & App Init ===== */
window.Pages = window.Pages || {};

window.App = {
  currentPage: null,

  init() {
    Store.init();
    try {
      if (window.AI) window.AI.init();
    } catch (e) {
      console.error("Lỗi khởi tạo AI:", e);
    }
    
    this.setupAuth();
    this.setupRouter();
    this.setupMobileToggle();
    this.setupHeaderActions();
    this.handleRoute();
  },

  setupAuth() {
    const loginOverlay = document.getElementById('loginOverlay');
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    const btnLogout = document.getElementById('btnLogout');

    if (Store.currentUser) {
      loginOverlay.classList.add('hidden');
      this.updateSidebarAuth();
    } else {
      loginOverlay.classList.remove('hidden');
    }

    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
          const btn = loginForm.querySelector('button');
          btn.textContent = 'Đang xử lý...';
          btn.disabled = true;
          loginError.classList.add('hidden');
          
          await Store.login(email, password);
          loginOverlay.classList.add('hidden');
          this.updateSidebarAuth();
          this.handleRoute();
          
        } catch (err) {
          loginError.textContent = err.message;
          loginError.classList.remove('hidden');
        } finally {
          const btn = loginForm.querySelector('button');
          btn.textContent = 'Đăng nhập';
          btn.disabled = false;
        }
      });
    }

    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        Store.logout();
        window.location.hash = '#/dashboard';
        loginOverlay.classList.remove('hidden');
      });
    }
  },

  updateSidebarAuth() {
    if (!Store.currentUser) return;
    
    // Update user info in sidebar
    document.getElementById('sidebarName').textContent = Store.currentUser.name;
    document.getElementById('sidebarAvatar').textContent = Store.currentUser.name.substring(0, 2).toUpperCase();
    
    let roleText = 'Nhân viên';
    if (Store.currentUser.role === 'admin') roleText = 'Giám đốc';
    if (Store.currentUser.role === 'manager') roleText = 'Trưởng phòng';
    if (Store.currentUser.role === 'hr') roleText = 'Nhân sự';
    document.getElementById('sidebarRole').textContent = roleText;

    // RBAC: Hide CRM for HR and Employee
    const crmLabelNode = Array.from(document.querySelectorAll('.sidebar-nav span')).find(el => el.textContent === 'CRM');
    const crmLabel = crmLabelNode ? crmLabelNode.parentElement : null;
    const customersLink = document.querySelector('.sidebar-nav-item[data-page="customers"]');
    const dealsLink = document.querySelector('.sidebar-nav-item[data-page="deals"]');
    
    if (Store.currentUser.role === 'hr' || Store.currentUser.role === 'employee') {
       if(crmLabel) crmLabel.style.display = 'none';
       if(customersLink) customersLink.style.display = 'none';
       if(dealsLink) dealsLink.style.display = 'none';
    } else {
       if(crmLabel) crmLabel.style.display = '';
       if(customersLink) customersLink.style.display = 'flex';
       if(dealsLink) dealsLink.style.display = 'flex';
    }
  },

  setupRouter() {
    window.addEventListener('hashchange', () => this.handleRoute());
  },

  handleRoute() {
    // If not logged in, force to dashboard (which handles empty state or just show login)
    if (!Store.currentUser) {
      document.getElementById('loginOverlay').classList.remove('hidden');
      return;
    }

    const hash = window.location.hash || '#/dashboard';
    const page = hash.replace('#/', '').split('?')[0];
    
    // RBAC Route Guard
    if (Store.currentUser.role === 'hr' || Store.currentUser.role === 'employee') {
      if (page === 'customers' || page === 'deals') {
        window.location.hash = '#/dashboard';
        return;
      }
    }
    
    this.renderPage(page);
  },

  navigate(hash) {
    window.location.hash = hash;
  },

  renderPage(pageName) {
    const pages = {
      dashboard: window.Pages.Dashboard,
      employees: window.Pages.Employees,
      departments: window.Pages.Departments,
      attendance: window.Pages.Attendance,
      payroll: window.Pages.Payroll,
      customers: window.Pages.Customers,
      deals: window.Pages.Deals,
      reports: window.Pages.Reports,
      simulator: window.Pages.Simulator,
    };

    // Unmount current
    if (this.currentPage && pages[this.currentPage]?.unmount) {
      pages[this.currentPage].unmount();
    }

    let page = pages[pageName];
    if (!page) { pageName = 'dashboard'; page = pages.dashboard; }

    // Update sidebar active
    document.querySelectorAll('.sidebar-nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === pageName);
    });

    // Update header title
    const titles = {
      dashboard: 'Tổng quan',
      employees: 'Quản lý nhân sự',
      departments: 'Phòng ban & Vị trí',
      attendance: 'Chấm công',
      payroll: 'Bảng lương & BHXH',
      customers: 'Khách hàng',
      deals: 'Cơ hội kinh doanh',
      reports: 'Báo cáo & Thống kê',
      simulator: 'Mô phỏng What-If',
    };
    const titleEl = document.querySelector('#headerTitle h2');
    if (titleEl) titleEl.textContent = titles[pageName] || 'BizCore';

    // Render
    const contentArea = document.getElementById('contentArea');
    if (page && page.render) {
      contentArea.innerHTML = page.render();
      if (page.mount) page.mount();
    } else {
      contentArea.innerHTML = Components.createEmptyState('Trang đang được phát triển...');
    }

    this.currentPage = pageName;

    // Close mobile sidebar
    document.getElementById('sidebar').classList.remove('open');

    // Scroll to top
    window.scrollTo(0, 0);
  },

  setupMobileToggle() {
    const toggle = document.getElementById('mobileToggle');
    const sidebar = document.getElementById('sidebar');
    if (toggle) {
      toggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    }
    // Close on outside click (mobile)
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768 && sidebar.classList.contains('open') &&
          !sidebar.contains(e.target) && e.target !== toggle && !toggle.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    });
  },

  setupHeaderActions() {
    const notifBtn = document.getElementById('notificationBtn');
    const search = document.getElementById('globalSearch');

    if (notifBtn) {
      const panel = document.createElement('div');
      panel.className = 'notif-panel hidden';
      document.body.appendChild(panel);
      const build = async () => {
        const items = [];
        try {
          const deals = await Store.getDeals();
          const today = new Date(Utils.getCurrentDate());
          const overdue = deals.filter(d => d.stage !== 'won' && d.stage !== 'lost' && d.expectedCloseDate && new Date(d.expectedCloseDate) < today);
          if (overdue.length) items.push({ t: 'danger', m: `${overdue.length} cơ hội quá hạn chốt`, h: '#/deals' });
          const customers = await Store.getCustomers().catch(() => []);
          const leads = customers.filter(c => c.status === 'lead' || c.status === 'new');
          if (leads.length) items.push({ t: 'info', m: `${leads.length} khách hàng tiềm năng chờ theo dõi`, h: '#/customers' });
          const att = await Store.getTodayAttendance().catch(() => []);
          const late = att.filter(a => a.status === 'late').length;
          if (late) items.push({ t: 'warn', m: `${late} nhân viên đi trễ hôm nay`, h: '#/attendance' });
        } catch (e) {}
        const badge = notifBtn.querySelector('.notification-badge');
        if (badge) { badge.textContent = items.length; badge.style.display = items.length ? 'flex' : 'none'; }
        if (!items.length) items.push({ t: 'ok', m: 'Không có thông báo mới', h: '' });
        panel.innerHTML = `<div class="notif-head">Thông báo</div>` + items.map(i => `<a class="notif-item" href="${i.h || '#'}"><span class="notif-dot ${i.t}"></span>${i.m}</a>`).join('');
      };
      notifBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!panel.classList.contains('hidden')) { panel.classList.add('hidden'); return; }
        await build();
        const r = notifBtn.getBoundingClientRect();
        panel.style.top = (r.bottom + 8) + 'px'; panel.style.right = (window.innerWidth - r.right) + 'px';
        panel.classList.remove('hidden');
      });
      panel.addEventListener('click', (e) => { const a = e.target.closest('a.notif-item'); if (a) panel.classList.add('hidden'); });
      document.addEventListener('click', (e) => { if (!panel.contains(e.target) && !notifBtn.contains(e.target)) panel.classList.add('hidden'); });
      build();
    }

    if (search) {
      const box = document.createElement('div');
      box.className = 'search-results hidden';
      document.body.appendChild(box);
      const run = async () => {
        const q = search.value.trim().toLowerCase();
        if (q.length < 2) { box.classList.add('hidden'); return; }
        let html = '';
        try {
          const [emps, customers, deals] = await Promise.all([Store.getEmployees(), Store.getCustomers().catch(() => []), Store.getDeals()]);
          const hit = (arr, label, hash, key) => arr.filter(x => (x[key] || '').toLowerCase().includes(q)).slice(0, 4)
            .map(x => `<a class="sr-item" href="${hash}"><span class="sr-tag">${label}</span>${x[key]}</a>`).join('');
          html = hit(emps, 'Nhân sự', '#/employees', 'name') + hit(customers, 'Khách', '#/customers', 'name') + hit(deals, 'Cơ hội', '#/deals', 'title');
        } catch (e) {}
        box.innerHTML = html || '<div class="sr-empty">Không tìm thấy</div>';
        const r = search.getBoundingClientRect();
        box.style.top = (r.bottom + 6) + 'px'; box.style.left = r.left + 'px'; box.style.width = r.width + 'px';
        box.classList.remove('hidden');
      };
      search.addEventListener('input', Utils.debounce(run, 250));
      search.addEventListener('focus', run);
      box.addEventListener('click', () => box.classList.add('hidden'));
      document.addEventListener('click', (e) => { if (!box.contains(e.target) && e.target !== search) box.classList.add('hidden'); });
    }
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
