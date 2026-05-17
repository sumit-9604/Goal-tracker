-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) CHECK (role IN ('employee', 'manager', 'admin')) DEFAULT 'employee',
    manager_id INTEGER REFERENCES users(id),
    department VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Goals table
CREATE TABLE IF NOT EXISTS goals (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    thrust_area VARCHAR(100),
    uom_type VARCHAR(50) CHECK (uom_type IN ('numeric', 'percentage', 'timeline', 'zero')),
    target_value DECIMAL(10,2),
    actual_value DECIMAL(10,2) DEFAULT 0,
    weightage DECIMAL(5,2) CHECK (weightage >= 0 AND weightage <= 100),
    deadline DATE,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'locked')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Goal progress table
CREATE TABLE IF NOT EXISTS goal_progress (
    id SERIAL PRIMARY KEY,
    goal_id INTEGER REFERENCES goals(id) ON DELETE CASCADE,
    quarter VARCHAR(10) NOT NULL,
    achievement DECIMAL(10,2),
    progress_percent DECIMAL(5,2),
    status VARCHAR(50) DEFAULT 'not_started',
    manager_feedback TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(goal_id, quarter)
);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100),
    entity_type VARCHAR(50),
    entity_id INTEGER,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert demo users (password hash for 'password123')
INSERT INTO users (email, password, full_name, role, department) VALUES
('admin@example.com', '$2a$10$rQKqFQZqQZqQZqQZqQZqQu', 'Admin User', 'admin', 'IT'),
('manager@example.com', '$2a$10$rQKqFQZqQZqQZqQZqQZqQu', 'Manager User', 'manager', 'Sales'),
('employee@example.com', '$2a$10$rQKqFQZqQZqQZqQZqQZqQu', 'Employee User', 'employee', 'Sales')
ON CONFLICT (email) DO NOTHING;

-- Set manager for employee (manager id = 2)
UPDATE users SET manager_id = 2 WHERE email = 'employee@example.com';

-- Insert sample goals for employee (assuming employee id = 3)
INSERT INTO goals (employee_id, title, description, thrust_area, uom_type, target_value, weightage, deadline, status)
SELECT 3, 'Increase Sales by 20%', 'Achieve quarterly sales target', 'Sales', 'percentage', 20, 40, '2026-06-30', 'approved'
WHERE EXISTS (SELECT 1 FROM users WHERE id = 3);

INSERT INTO goals (employee_id, title, description, thrust_area, uom_type, target_value, weightage, deadline, status)
SELECT 3, 'Customer Satisfaction', 'Maintain CSAT above 4.5', 'Customer', 'numeric', 4.5, 30, '2026-06-30', 'approved'
WHERE EXISTS (SELECT 1 FROM users WHERE id = 3);

INSERT INTO goals (employee_id, title, description, thrust_area, uom_type, target_value, weightage, deadline, status)
SELECT 3, 'Product Knowledge Training', 'Complete all modules', 'Learning', 'timeline', 1, 30, '2026-05-30', 'approved'
WHERE EXISTS (SELECT 1 FROM users WHERE id = 3);

-- Sample progress (assuming goal ids 1,2,3 exist)
INSERT INTO goal_progress (goal_id, quarter, achievement, progress_percent, status)
VALUES 
(1, 'Q1', 15, 75, 'on_track'),
(2, 'Q1', 4.2, 93, 'on_track'),
(3, 'Q1', 0, 0, 'not_started')
ON CONFLICT (goal_id, quarter) DO NOTHING;