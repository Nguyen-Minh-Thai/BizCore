# BizCore — Supabase Schema

Chạy toàn bộ SQL dưới đây trong **Supabase → SQL Editor** để dựng DB từ đầu.
(App gọi qua PostgREST nên tên bảng/cột phải **khớp chính xác** như dưới.)

## 1. Bảng (CREATE TABLE)

```sql
-- Phòng ban
create table departments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  manager_id  uuid,                       -- FK → employees.id (đặt sau vì vòng tham chiếu)
  created_at  timestamptz default now()
);

-- Nhân sự (kiêm bảng tài khoản đăng nhập)
create table employees (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text unique not null,
  phone         text,
  department_id uuid references departments(id) on delete set null,
  position      text,
  base_salary   numeric default 0,
  status        text default 'active'   check (status in ('active','on_leave','resigned')),
  role          text default 'employee' check (role   in ('admin','hr','manager','employee')),
  password      text default '123456',  -- ⚠️ DEMO: mật khẩu thô. Production → hash / Supabase Auth
  created_at    timestamptz default now()
);

alter table departments
  add constraint departments_manager_fk
  foreign key (manager_id) references employees(id) on delete set null;

-- Chấm công
create table attendance (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete cascade,
  date        date not null,
  check_in    text,                       -- 'HH:MM'
  check_out   text,
  status      text check (status in ('on_time','late','absent','leave')),
  work_hours  numeric default 0
);

-- Bảng lương (1 dòng / nhân viên / tháng)
create table payroll (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid references employees(id) on delete cascade,
  month         text not null,            -- 'YYYY-MM'
  base_salary   numeric default 0,
  net_salary    numeric default 0,        -- Thực nhận
  personal_tax  numeric default 0,        -- Thuế TNCN
  bhxh_employee numeric default 0,        -- NV đóng: BHXH 8% / BHYT 1.5% / BHTN 1%
  bhyt_employee numeric default 0,
  bhtn_employee numeric default 0,
  bhxh_company  numeric default 0,        -- Cty đóng: BHXH 17.5% / BHYT 3% / BHTN 1%
  bhyt_company  numeric default 0,
  bhtn_company  numeric default 0,
  unique (employee_id, month)
);

-- Khách hàng (CRM) — cột linh hoạt, tối thiểu cần name + status
create table customers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  company    text,
  email      text,
  phone      text,
  status     text default 'lead',         -- 'lead' | 'new' | 'active' | ...
  created_at timestamptz default now()
);

-- Cơ hội bán hàng (CRM)
create table deals (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  customer_id         uuid references customers(id) on delete set null,
  value               numeric default 0,
  stage               text default 'lead'
                        check (stage in ('lead','qualified','proposal','negotiation','won','lost')),
  expected_close_date date,
  created_at          timestamptz default now()
);
```

## 2. RLS (Row Level Security)
Hiện demo **tắt RLS** (anon key làm được mọi thứ). Chọn 1 trong 2:

**A. Demo nhanh (KHÔNG an toàn — chỉ để chạy thử):**
```sql
alter table employees   disable row level security;
alter table departments disable row level security;
alter table attendance  disable row level security;
alter table payroll     disable row level security;
alter table customers   disable row level security;
alter table deals       disable row level security;
```

**B. Production (KHUYẾN NGHỊ):** bật RLS + chuyển login sang **Supabase Auth**, rồi viết policy theo `auth.uid()` / vai trò. Ví dụ khởi đầu:
```sql
alter table employees enable row level security;
create policy "read own or admin/hr" on employees for select
  using ( auth.uid() = id or (auth.jwt() ->> 'role') in ('admin','hr') );
-- lặp tương tự cho các bảng khác; chặn hẳn ghi từ client cho payroll/salary.
```
> Lưu ý: app hiện so mật khẩu thô ở bảng `employees`. Bật Auth thật thì bỏ cột `password`, dùng `supabase.auth.signInWithPassword`.

## 3. Seed tối thiểu (để đăng nhập được ngay)
```sql
insert into departments (name, description) values ('Ban Giám đốc','Điều hành');

insert into employees (name, email, password, role, position, base_salary, status, department_id)
select 'Nguyễn Văn An','an0@cortex.vn','123456','admin','Giám đốc',   50000000,'active', d.id from departments d limit 1;
insert into employees (name, email, password, role, position, base_salary, status, department_id)
select 'Trần Thị Em','em5@cortex.vn','123456','manager','Trưởng phòng',25000000,'active', d.id from departments d limit 1;
insert into employees (name, email, password, role, position, base_salary, status, department_id)
select 'Lê Văn Dũng','dung3@cortex.vn','123456','hr','Nhân sự',      18000000,'active', d.id from departments d limit 1;
```
Thêm khách/deal/chấm công tuỳ ý — hoặc tạo trực tiếp trong app sau khi đăng nhập.
Bảng lương được app **tự sinh** (nút "Tính lương" trong trang Lương) từ `employees` + `attendance`.

## 4. Công thức lương VN (tham khảo — code ở `js/utils.js` + `js/supabase-store.js`)
- NV đóng: **BHXH 8% + BHYT 1.5% + BHTN 1% = 10.5%** lương cơ bản.
- Cty đóng: **BHXH 17.5% + BHYT 3% + BHTN 1% = 21.5%**.
- Thuế TNCN: **lũy tiến 7 bậc**, giảm trừ bản thân 11tr/tháng (`Utils.calculatePersonalTax`).
- Thực nhận = Lương theo công + **Phụ cấp 10%** − BHXH NV − Thuế TNCN. *(Phụ cấp 10% đang hard-code — xem README mục 10.)*
