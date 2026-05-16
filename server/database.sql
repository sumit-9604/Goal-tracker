CREATE DATABASE goal_tracker;

\c goal_tracker;

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'employee',
    manager_id INTEGER REFERENCES users(id),
    department VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Thrust areas
CREATE TABLE thrust_areas (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

-- Goals table
CREATE TABLE goals (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES users(id),
    thrust_area_id INTEGER REFERENCES thrust_areas(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    uom_type VARCHAR(50) NOT NULL,
    target_value DECIMAL(10,2),
    actual_value DECIMAL(10,2) DEFAULT 0,
    weightage DECIMAL(5,2) NOT NULL,
    deadline DATE,
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quarterly progress
CREATE TABLE goal_progress (
    id SERIAL PRIMARY KEY,
    goal_id INTEGER REFERENCES goals(id),
    quarter VARCHAR(10) NOT NULL,
    achievement DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'not_started',
    manager_feedback TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit log
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100),
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO thrust_areas (name) VALUES 
('Financial'), ('Customer'), ('Process'), ('People');

INSERT INTO users (email, password, full_name, role) VALUES 
('admin@goal.com', '$2a$10$rTqYwEqqKQqFqFqFqFqFqO', 'Admin User', 'admin'),
('manager@goal.com', '$2a$10$rTqYwEqqKQqFqFqFqFqFqO', 'Manager User', 'manager'),
('employee@goal.com', '$2a$10$rTqYwEqqKQqFqFqFqFqFqO', 'Employee User', 'employee');

-- Note: password for all is 'password123'