
-- Drop tables if they exist (for testing)
DROP TABLE IF EXISTS approval_audit_log CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS reimbursements CASCADE;
DROP TABLE IF EXISTS reporting_assignments CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (role IN ('EMP', 'RM', 'APE', 'CFO'))
);

-- Create reporting_assignments table
CREATE TABLE reporting_assignments (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL,
    rm_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (employee_id),
    FOREIGN KEY (employee_id) REFERENCES users(id),
    FOREIGN KEY (rm_id) REFERENCES users(id)
);

-- Create reimbursements table
CREATE TABLE reimbursements (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    amount DECIMAL(12, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    rm_approved_at TIMESTAMP,
    apc_approved_at TIMESTAMP,
    rm_approved_by INTEGER,
    apc_approved_by INTEGER,
    rejected_at TIMESTAMP,
    rejected_by INTEGER,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    FOREIGN KEY (employee_id) REFERENCES users(id),
    FOREIGN KEY (rm_approved_by) REFERENCES users(id),
    FOREIGN KEY (apc_approved_by) REFERENCES users(id),
    FOREIGN KEY (rejected_by) REFERENCES users(id)
);

-- Create approval_audit_log table
CREATE TABLE approval_audit_log (
    id SERIAL PRIMARY KEY,
    reimbursement_id INTEGER NOT NULL,
    actor_id INTEGER NOT NULL,
    actor_role VARCHAR(20) NOT NULL,
    action VARCHAR(20) NOT NULL,
    from_status VARCHAR(20),
    to_status VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (action IN ('APPROVE', 'REJECT')),
    FOREIGN KEY (reimbursement_id) REFERENCES reimbursements(id),
    FOREIGN KEY (actor_id) REFERENCES users(id)
);

-- Create sessions table
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
