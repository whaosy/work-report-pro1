-- WorkReportPro 数据库初始化脚本
-- 此脚本用于初始化数据库、创建表、插入初始数据

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS work_report_pro 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE work_report_pro;

-- ============================================
-- 1. 机构表
-- ============================================
CREATE TABLE IF NOT EXISTS organizations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL COMMENT '机构名称',
  code VARCHAR(64) UNIQUE COMMENT '机构代码',
  description TEXT COMMENT '描述',
  status TINYINT DEFAULT 1 COMMENT '状态: 1=启用, 0=禁用',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_code (code),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 2. 部门表（支持多级树）
-- ============================================
CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL COMMENT '所属机构',
  name VARCHAR(255) NOT NULL COMMENT '部门名称',
  code VARCHAR(64) COMMENT '部门代码',
  parent_id INT COMMENT '上级部门ID',
  level INT DEFAULT 1 COMMENT '部门级别',
  sort_order INT DEFAULT 0 COMMENT '排序',
  status TINYINT DEFAULT 1 COMMENT '状态: 1=启用, 0=禁用',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (parent_id) REFERENCES departments(id),
  INDEX idx_organization_id (organization_id),
  INDEX idx_parent_id (parent_id),
  INDEX idx_code (code),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. 员工表
-- ============================================
CREATE TABLE IF NOT EXISTS employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_no VARCHAR(64) NOT NULL UNIQUE COMMENT '工号',
  name VARCHAR(255) NOT NULL COMMENT '员工姓名',
  email VARCHAR(255) COMMENT '邮箱',
  phone VARCHAR(20) COMMENT '手机号',
  password_md5 VARCHAR(32) NOT NULL COMMENT '密码(MD5加密)',
  role ENUM('member', 'team_leader', 'manager', 'director', 'admin') DEFAULT 'member' COMMENT '角色',
  department_id INT COMMENT '所属部门',
  supervisor_id INT COMMENT '直属上级ID',
  status TINYINT DEFAULT 1 COMMENT '状态: 1=启用, 0=禁用',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id),
  FOREIGN KEY (supervisor_id) REFERENCES employees(id),
  INDEX idx_employee_no (employee_no),
  INDEX idx_role (role),
  INDEX idx_department_id (department_id),
  INDEX idx_supervisor_id (supervisor_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. 员工会话表
-- ============================================
CREATE TABLE IF NOT EXISTS employee_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL COMMENT '员工ID',
  token VARCHAR(255) NOT NULL UNIQUE COMMENT '会话令牌',
  ip_address VARCHAR(45) COMMENT 'IP地址',
  user_agent TEXT COMMENT '用户代理',
  expires_at TIMESTAMP COMMENT '过期时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  INDEX idx_employee_id (employee_id),
  INDEX idx_token (token),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 5. 项目表
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL COMMENT '项目名称',
  code VARCHAR(64) UNIQUE COMMENT '项目编号',
  owner_id INT COMMENT '项目负责人ID',
  organization_id INT COMMENT '所属机构',
  status ENUM('planning', 'ongoing', 'completed', 'archived') DEFAULT 'planning' COMMENT '项目状态',
  business_type VARCHAR(64) COMMENT '业务类型',
  project_type VARCHAR(64) COMMENT '项目类型',
  start_date DATE COMMENT '开始日期',
  end_date DATE COMMENT '结束日期',
  estimated_hours DECIMAL(10, 2) COMMENT '预估工时',
  description TEXT COMMENT '项目描述',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES employees(id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  INDEX idx_code (code),
  INDEX idx_owner_id (owner_id),
  INDEX idx_status (status),
  INDEX idx_organization_id (organization_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 6. 项目成员表
-- ============================================
CREATE TABLE IF NOT EXISTS project_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL COMMENT '项目ID',
  employee_id INT NOT NULL COMMENT '员工ID',
  role VARCHAR(64) COMMENT '角色（如：开发、测试、产品）',
  allocated_hours DECIMAL(10, 2) COMMENT '分配工时',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  UNIQUE KEY unique_project_employee (project_id, employee_id),
  INDEX idx_project_id (project_id),
  INDEX idx_employee_id (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 7. 项目任务表
-- ============================================
CREATE TABLE IF NOT EXISTS project_tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL COMMENT '项目ID',
  name VARCHAR(255) NOT NULL COMMENT '任务名称',
  description TEXT COMMENT '任务描述',
  status ENUM('todo', 'in_progress', 'completed', 'blocked') DEFAULT 'todo' COMMENT '任务状态',
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium' COMMENT '优先级',
  assignee_id INT COMMENT '分配给',
  start_date DATE COMMENT '开始日期',
  due_date DATE COMMENT '截止日期',
  estimated_hours DECIMAL(10, 2) COMMENT '预估工时',
  actual_hours DECIMAL(10, 2) COMMENT '实际工时',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (assignee_id) REFERENCES employees(id),
  INDEX idx_project_id (project_id),
  INDEX idx_assignee_id (assignee_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 8. 日报主表
-- ============================================
CREATE TABLE IF NOT EXISTS daily_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL COMMENT '员工ID',
  report_date DATE NOT NULL COMMENT '报告日期',
  tomorrow_plan TEXT COMMENT '明天计划',
  status ENUM('draft', 'submitted', 'reviewed', 'rejected') DEFAULT 'draft' COMMENT '状态',
  total_hours DECIMAL(10, 2) COMMENT '总工时',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  submitted_at TIMESTAMP COMMENT '提交时间',
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  UNIQUE KEY unique_employee_date (employee_id, report_date),
  INDEX idx_employee_id (employee_id),
  INDEX idx_report_date (report_date),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 9. 日报工作条目表
-- ============================================
CREATE TABLE IF NOT EXISTS daily_work_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  daily_report_id INT NOT NULL COMMENT '日报ID',
  project_id INT COMMENT '项目ID',
  description TEXT NOT NULL COMMENT '工作描述',
  hours DECIMAL(10, 2) NOT NULL COMMENT '工时',
  completion_rate INT DEFAULT 100 COMMENT '完成度(%)',
  item_order INT DEFAULT 0 COMMENT '排序',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (daily_report_id) REFERENCES daily_reports(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  INDEX idx_daily_report_id (daily_report_id),
  INDEX idx_project_id (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 10. 周报/月报表
-- ============================================
CREATE TABLE IF NOT EXISTS weekly_monthly_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL COMMENT '员工ID',
  report_type ENUM('weekly', 'monthly') NOT NULL COMMENT '报告类型',
  start_date DATE NOT NULL COMMENT '开始日期',
  end_date DATE NOT NULL COMMENT '结束日期',
  summary TEXT COMMENT '总结内容',
  achievements TEXT COMMENT '主要成就',
  challenges TEXT COMMENT '遇到的问题',
  next_plan TEXT COMMENT '下周/月计划',
  ai_summary TEXT COMMENT 'AI生成的摘要',
  status ENUM('draft', 'submitted', 'reviewed') DEFAULT 'draft' COMMENT '状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  submitted_at TIMESTAMP COMMENT '提交时间',
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  INDEX idx_employee_id (employee_id),
  INDEX idx_report_type (report_type),
  INDEX idx_start_date (start_date),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 11. 点评表
-- ============================================
CREATE TABLE IF NOT EXISTS comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_id INT NOT NULL COMMENT '报告ID',
  report_type ENUM('daily', 'weekly', 'monthly') NOT NULL COMMENT '报告类型',
  reviewer_id INT NOT NULL COMMENT '评审人ID',
  content TEXT NOT NULL COMMENT '点评内容',
  rating INT COMMENT '评分(1-5)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (reviewer_id) REFERENCES employees(id),
  INDEX idx_report_id (report_id),
  INDEX idx_report_type (report_type),
  INDEX idx_reviewer_id (reviewer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 12. 通知表
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recipient_id INT NOT NULL COMMENT '接收人ID',
  sender_id INT COMMENT '发送人ID',
  type VARCHAR(64) COMMENT '通知类型(reminder/warning/urge/feedback)',
  title VARCHAR(255) NOT NULL COMMENT '通知标题',
  content TEXT NOT NULL COMMENT '通知内容',
  is_read TINYINT DEFAULT 0 COMMENT '是否已读',
  related_report_id INT COMMENT '相关报告ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP COMMENT '已读时间',
  FOREIGN KEY (recipient_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES employees(id),
  INDEX idx_recipient_id (recipient_id),
  INDEX idx_is_read (is_read),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 13. 悬浮卡片记录表
-- ============================================
CREATE TABLE IF NOT EXISTS floating_notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL COMMENT '员工ID',
  content TEXT NOT NULL COMMENT '记录内容',
  note_date DATE NOT NULL COMMENT '记录日期',
  is_used TINYINT DEFAULT 0 COMMENT '是否已用于日报',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  INDEX idx_employee_id (employee_id),
  INDEX idx_note_date (note_date),
  INDEX idx_is_used (is_used)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 初始数据插入
-- ============================================

-- 插入默认机构
INSERT INTO organizations (name, code, description, status) 
VALUES ('默认机构', 'ORG001', '系统默认机构', 1);

-- 插入默认部门
INSERT INTO departments (organization_id, name, code, parent_id, level, status) 
VALUES 
  (1, '技术部', 'DEPT001', NULL, 1, 1),
  (1, '产品部', 'DEPT002', NULL, 1, 1),
  (1, '运营部', 'DEPT003', NULL, 1, 1);

-- 插入默认管理员账号
-- 工号: admin, 密码: Admin@123 (MD5: 0192023a7bbd73250516f069df18b500)
INSERT INTO employees (employee_no, name, email, phone, password_md5, role, department_id, status) 
VALUES 
  ('admin', '系统管理员', 'admin@company.com', '13800000000', '0192023a7bbd73250516f069df18b500', 'admin', 1, 1),
  ('user001', '测试员工', 'user001@company.com', '13800000001', '0192023a7bbd73250516f069df18b500', 'member', 1, 1),
  ('leader001', '测试组长', 'leader001@company.com', '13800000002', '0192023a7bbd73250516f069df18b500', 'team_leader', 1, 1);

-- 设置员工上下级关系
UPDATE employees SET supervisor_id = 1 WHERE employee_no IN ('user001', 'leader001');

-- ============================================
-- 创建视图
-- ============================================

-- 员工完整信息视图
CREATE OR REPLACE VIEW v_employee_info AS
SELECT 
  e.id,
  e.employee_no,
  e.name,
  e.email,
  e.phone,
  e.role,
  e.status,
  d.name AS department_name,
  d.code AS department_code,
  o.name AS organization_name,
  COALESCE(s.name, '无') AS supervisor_name,
  e.created_at,
  e.updated_at
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id
LEFT JOIN organizations o ON d.organization_id = o.id
LEFT JOIN employees s ON e.supervisor_id = s.id;

-- 日报统计视图
CREATE OR REPLACE VIEW v_daily_report_stats AS
SELECT 
  e.id AS employee_id,
  e.name AS employee_name,
  dr.report_date,
  COUNT(dwi.id) AS item_count,
  SUM(dwi.hours) AS total_hours,
  AVG(dwi.completion_rate) AS avg_completion_rate,
  dr.status
FROM employees e
LEFT JOIN daily_reports dr ON e.id = dr.employee_id
LEFT JOIN daily_work_items dwi ON dr.id = dwi.daily_report_id
GROUP BY e.id, e.name, dr.report_date, dr.status;

-- ============================================
-- 创建索引优化查询
-- ============================================

-- 日报查询优化
CREATE INDEX idx_daily_reports_employee_date ON daily_reports(employee_id, report_date DESC);
CREATE INDEX idx_daily_reports_status_date ON daily_reports(status, report_date DESC);

-- 通知查询优化
CREATE INDEX idx_notifications_recipient_read ON notifications(recipient_id, is_read);

-- 工作条目查询优化
CREATE INDEX idx_work_items_report_order ON daily_work_items(daily_report_id, item_order);

-- ============================================
-- 创建存储过程
-- ============================================

-- 获取员工的直属下级
DELIMITER $$
CREATE PROCEDURE sp_get_subordinates(IN p_employee_id INT)
BEGIN
  SELECT * FROM employees WHERE supervisor_id = p_employee_id;
END$$
DELIMITER ;

-- 获取部门的所有员工（包括子部门）
DELIMITER $$
CREATE PROCEDURE sp_get_department_employees(IN p_department_id INT)
BEGIN
  WITH RECURSIVE dept_tree AS (
    SELECT id FROM departments WHERE id = p_department_id
    UNION ALL
    SELECT d.id FROM departments d
    INNER JOIN dept_tree dt ON d.parent_id = dt.id
  )
  SELECT e.* FROM employees e
  WHERE e.department_id IN (SELECT id FROM dept_tree);
END$$
DELIMITER ;

-- ============================================
-- 权限和安全设置
-- ============================================

-- 创建应用用户（可选）
-- CREATE USER 'app_user'@'localhost' IDENTIFIED BY 'secure_password';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON work_report_pro.* TO 'app_user'@'localhost';
-- FLUSH PRIVILEGES;

-- ============================================
-- 初始化完成
-- ============================================
SELECT '数据库初始化完成！' AS message;
SELECT COUNT(*) AS employee_count FROM employees;
SELECT COUNT(*) AS department_count FROM departments;
SELECT COUNT(*) AS project_count FROM projects;
