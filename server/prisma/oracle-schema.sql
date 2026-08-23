-- =================================================================
-- Oracle Database Schema Definition for Auto-Serv Application
-- =================================================================

-- Drop existing tables if re-initialising
BEGIN
  FOR t IN (SELECT table_name FROM user_tables WHERE table_name IN (
    'AUDIT_LOGS', 'INVOICES', 'TWILIO_DISPATCH_LOGS', 'JOB_CARD_STATUS_LOGS', 
    'QC_REPORTS', 'JOB_MEDIA', 'JOB_PART_ESTIMATES', 'JOB_TASKS', 
    'JOB_CARD_PARTS', 'INVENTORY_ITEMS', 'JOB_CARDS', 'VEHICLES', 'USERS'
  )) LOOP
    EXECUTE IMMEDIATE 'DROP TABLE ' || t.table_name || ' CASCADE CONSTRAINTS';
  END LOOP;
END;
/

-- Users Table
CREATE TABLE users (
  id VARCHAR2(36) PRIMARY KEY,
  email VARCHAR2(255) UNIQUE NOT NULL,
  password_hash VARCHAR2(255) NOT NULL,
  name VARCHAR2(255) NOT NULL,
  phone VARCHAR2(50),
  role VARCHAR2(20) DEFAULT 'CUSTOMER' NOT NULL CHECK (role IN ('ADMIN', 'TECHNICIAN', 'CUSTOMER')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Vehicles Table
CREATE TABLE vehicles (
  id VARCHAR2(36) PRIMARY KEY,
  license_plate VARCHAR2(50) UNIQUE NOT NULL,
  make VARCHAR2(100) NOT NULL,
  model VARCHAR2(100) NOT NULL,
  year NUMBER(4) DEFAULT 2023 NOT NULL,
  vin VARCHAR2(100),
  mileage NUMBER(10) DEFAULT 0,
  fuel_level VARCHAR2(20) DEFAULT '1/2',
  owner_id VARCHAR2(36) NOT NULL CONSTRAINT fk_v_owner REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Job Cards Table
CREATE TABLE job_cards (
  id VARCHAR2(36) PRIMARY KEY,
  card_number VARCHAR2(50) UNIQUE NOT NULL,
  title VARCHAR2(255) NOT NULL,
  description VARCHAR2(4000),
  reported_issues VARCHAR2(4000),
  mileage NUMBER(10),
  fuel_level VARCHAR2(20),
  status VARCHAR2(50) DEFAULT 'CHECKED_IN' NOT NULL,
  priority VARCHAR2(20) DEFAULT 'MEDIUM' NOT NULL,
  vehicle_id VARCHAR2(36) NOT NULL CONSTRAINT fk_jc_vehicle REFERENCES vehicles(id) ON DELETE CASCADE,
  technician_id VARCHAR2(36) CONSTRAINT fk_jc_tech REFERENCES users(id) ON DELETE SET NULL,
  customer_id VARCHAR2(36) NOT NULL CONSTRAINT fk_jc_cust REFERENCES users(id) ON DELETE CASCADE,
  approved_at TIMESTAMP,
  approved_by_id VARCHAR2(36) CONSTRAINT fk_jc_appr REFERENCES users(id) ON DELETE SET NULL,
  approval_notes VARCHAR2(4000),
  delivered_at TIMESTAMP,
  estimated_cost NUMBER(12, 2) DEFAULT 0.00 NOT NULL,
  labor_cost NUMBER(12, 2) DEFAULT 0.00 NOT NULL,
  parts_cost NUMBER(12, 2) DEFAULT 0.00 NOT NULL,
  total_cost NUMBER(12, 2) DEFAULT 0.00 NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Inventory Items Table
CREATE TABLE inventory_items (
  id VARCHAR2(36) PRIMARY KEY,
  sku VARCHAR2(100) UNIQUE NOT NULL,
  name VARCHAR2(255) NOT NULL,
  category VARCHAR2(100) DEFAULT 'General' NOT NULL,
  description VARCHAR2(4000),
  quantity NUMBER(10) DEFAULT 0 NOT NULL,
  minimum_stock NUMBER(10) DEFAULT 5 NOT NULL,
  unit_price NUMBER(12, 2) DEFAULT 0.00 NOT NULL,
  part_type VARCHAR2(50) DEFAULT 'REGULAR' NOT NULL CHECK (part_type IN ('FAST_MOVING', 'REGULAR', 'SERVICE_PART')),
  location VARCHAR2(255) DEFAULT 'Main Shelf',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Job Card Parts Table
CREATE TABLE job_card_parts (
  id VARCHAR2(36) PRIMARY KEY,
  job_card_id VARCHAR2(36) NOT NULL CONSTRAINT fk_jcp_jc REFERENCES job_cards(id) ON DELETE CASCADE,
  inventory_item_id VARCHAR2(36) NOT NULL CONSTRAINT fk_jcp_inv REFERENCES inventory_items(id),
  quantity NUMBER(10) DEFAULT 1 NOT NULL,
  unit_price NUMBER(12, 2) NOT NULL,
  total_price NUMBER(12, 2) NOT NULL,
  drawn_by_user_id VARCHAR2(36) CONSTRAINT fk_jcp_user REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Job Tasks Table
CREATE TABLE job_tasks (
  id VARCHAR2(36) PRIMARY KEY,
  job_card_id VARCHAR2(36) NOT NULL CONSTRAINT fk_jt_jc REFERENCES job_cards(id) ON DELETE CASCADE,
  description VARCHAR2(1000) NOT NULL,
  estimated_labor_cost NUMBER(12, 2) DEFAULT 0.00 NOT NULL,
  status VARCHAR2(50) DEFAULT 'PENDING' NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Job Part Estimates Table
CREATE TABLE job_part_estimates (
  id VARCHAR2(36) PRIMARY KEY,
  job_card_id VARCHAR2(36) NOT NULL CONSTRAINT fk_jpe_jc REFERENCES job_cards(id) ON DELETE CASCADE,
  inventory_item_id VARCHAR2(36) CONSTRAINT fk_jpe_inv REFERENCES inventory_items(id) ON DELETE SET NULL,
  part_name VARCHAR2(255) NOT NULL,
  estimated_quantity NUMBER(10) DEFAULT 1 NOT NULL,
  estimated_unit_price NUMBER(12, 2) DEFAULT 0.00 NOT NULL,
  estimated_total_price NUMBER(12, 2) DEFAULT 0.00 NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Job Media Table
CREATE TABLE job_media (
  id VARCHAR2(36) PRIMARY KEY,
  job_card_id VARCHAR2(36) NOT NULL CONSTRAINT fk_jm_jc REFERENCES job_cards(id) ON DELETE CASCADE,
  url VARCHAR2(1000) NOT NULL,
  type VARCHAR2(100) DEFAULT 'PRE_SERVICE_CONDITION' NOT NULL,
  caption VARCHAR2(1000),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- QC Reports Table
CREATE TABLE qc_reports (
  id VARCHAR2(36) PRIMARY KEY,
  job_card_id VARCHAR2(36) NOT NULL CONSTRAINT fk_qc_jc REFERENCES job_cards(id) ON DELETE CASCADE,
  passed NUMBER(1) NOT NULL CHECK (passed IN (0, 1)),
  notes VARCHAR2(4000),
  checklist VARCHAR2(4000),
  inspected_by_user_id VARCHAR2(36) CONSTRAINT fk_qc_user REFERENCES users(id) ON DELETE SET NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Job Card Status Logs Table
CREATE TABLE job_card_status_logs (
  id VARCHAR2(36) PRIMARY KEY,
  job_card_id VARCHAR2(36) NOT NULL CONSTRAINT fk_jcsl_jc REFERENCES job_cards(id) ON DELETE CASCADE,
  from_status VARCHAR2(50),
  to_status VARCHAR2(50) NOT NULL,
  changed_by_id VARCHAR2(36) CONSTRAINT fk_jcsl_user REFERENCES users(id) ON DELETE SET NULL,
  notes VARCHAR2(4000),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Twilio Dispatch Logs Table
CREATE TABLE twilio_dispatch_logs (
  id VARCHAR2(36) PRIMARY KEY,
  job_card_id VARCHAR2(36) NOT NULL CONSTRAINT fk_tdl_jc REFERENCES job_cards(id) ON DELETE CASCADE,
  sender_user_id VARCHAR2(36) CONSTRAINT fk_tdl_user REFERENCES users(id) ON DELETE SET NULL,
  recipient_phone VARCHAR2(50) NOT NULL,
  media_url VARCHAR2(1000),
  message_text VARCHAR2(4000) NOT NULL,
  status VARCHAR2(50) DEFAULT 'SENT' NOT NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Invoices Table
CREATE TABLE invoices (
  id VARCHAR2(36) PRIMARY KEY,
  invoice_number VARCHAR2(100) UNIQUE NOT NULL,
  job_card_id VARCHAR2(36) NOT NULL CONSTRAINT fk_inv_jc REFERENCES job_cards(id) ON DELETE CASCADE,
  customer_id VARCHAR2(36) NOT NULL CONSTRAINT fk_inv_cust REFERENCES users(id) ON DELETE CASCADE,
  created_by_id VARCHAR2(36) CONSTRAINT fk_inv_user REFERENCES users(id) ON DELETE SET NULL,
  subtotal NUMBER(12, 2) NOT NULL,
  tax NUMBER(12, 2) NOT NULL,
  total_amount NUMBER(12, 2) NOT NULL,
  status VARCHAR2(50) DEFAULT 'UNPAID' NOT NULL,
  payment_method VARCHAR2(100) DEFAULT 'UNSPECIFIED',
  transaction_reference VARCHAR2(255),
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Audit Logs Table
CREATE TABLE audit_logs (
  id VARCHAR2(36) PRIMARY KEY,
  user_id VARCHAR2(36) CONSTRAINT fk_al_user REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR2(255) NOT NULL,
  entity VARCHAR2(100) NOT NULL,
  entity_id VARCHAR2(36),
  details VARCHAR2(4000),
  inventory_item_id VARCHAR2(36) CONSTRAINT fk_al_inv REFERENCES inventory_items(id) ON DELETE SET NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Attendance Records Table
CREATE TABLE attendance_records (
  id VARCHAR2(36) PRIMARY KEY,
  technician_id VARCHAR2(36) NOT NULL CONSTRAINT fk_att_tech REFERENCES users(id) ON DELETE CASCADE,
  shift_date TIMESTAMP NOT NULL,
  clock_in_time TIMESTAMP NOT NULL,
  clock_out_time TIMESTAMP,
  status VARCHAR2(50) DEFAULT 'PRESENT' NOT NULL,
  notes VARCHAR2(4000),
  edited_by_admin NUMBER(1) DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT uq_att_tech_date UNIQUE (technician_id, shift_date)
);

-- Indexes for performance tuning
CREATE INDEX idx_jc_vehicle ON job_cards(vehicle_id);
CREATE INDEX idx_jc_tech ON job_cards(technician_id);
CREATE INDEX idx_jc_cust ON job_cards(customer_id);
CREATE INDEX idx_jc_status ON job_cards(status);
CREATE INDEX idx_inv_sku ON inventory_items(sku);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_att_tech ON attendance_records(technician_id);
CREATE INDEX idx_att_date ON attendance_records(shift_date);
