-- Sample data for testing dashboard
-- This is for development/testing only

-- Note: Replace the user_id with actual user ID from your flowserve_users table
-- You can get it by running: SELECT id FROM flowserve_users LIMIT 1;

-- Sample customers (if not exists)
INSERT INTO customers (id, user_id, name, phone_number, email, created_at)
SELECT 
  gen_random_uuid(),
  (SELECT id FROM flowserve_users LIMIT 1),
  'John Doe',
  '+2348012345678',
  'john@example.com',
  NOW() - INTERVAL '2 days'
WHERE NOT EXISTS (SELECT 1 FROM customers LIMIT 1);

INSERT INTO customers (id, user_id, name, phone_number, email, created_at)
SELECT 
  gen_random_uuid(),
  (SELECT id FROM flowserve_users LIMIT 1),
  'Jane Smith',
  '+2348087654321',
  'jane@example.com',
  NOW() - INTERVAL '5 days'
WHERE (SELECT COUNT(*) FROM customers) < 2;

-- Sample properties
INSERT INTO properties (id, user_id, title, price, description, location, property_type, bedrooms, bathrooms, square_feet, status, created_at)
SELECT 
  gen_random_uuid(),
  (SELECT id FROM flowserve_users LIMIT 1),
  '3 Bedroom Apartment in Lekki',
  45000000,
  'Beautiful modern apartment with ocean view',
  'Lekki Phase 1, Lagos',
  'apartment',
  3,
  2,
  1200,
  'available',
  NOW() - INTERVAL '10 days'
WHERE NOT EXISTS (SELECT 1 FROM properties LIMIT 1);

INSERT INTO properties (id, user_id, title, price, description, location, property_type, bedrooms, bathrooms, square_feet, status, created_at)
SELECT 
  gen_random_uuid(),
  (SELECT id FROM flowserve_users LIMIT 1),
  '5 Bedroom Duplex in Victoria Island',
  120000000,
  'Luxury duplex in prime location',
  'Victoria Island, Lagos',
  'house',
  5,
  4,
  3500,
  'available',
  NOW() - INTERVAL '15 days'
WHERE (SELECT COUNT(*) FROM properties) < 2;

-- Sample services
INSERT INTO services (id, user_id, name, description, price, category, duration_hours, status, created_at)
SELECT 
  gen_random_uuid(),
  (SELECT id FROM flowserve_users LIMIT 1),
  'Wedding Planning Package',
  'Complete wedding planning service including venue, catering, and decoration',
  2500000,
  'wedding',
  8,
  'active',
  NOW() - INTERVAL '20 days'
WHERE NOT EXISTS (SELECT 1 FROM services LIMIT 1);

INSERT INTO services (id, user_id, name, description, price, category, duration_hours, status, created_at)
SELECT 
  gen_random_uuid(),
  (SELECT id FROM flowserve_users LIMIT 1),
  'Corporate Event Package',
  'Professional corporate event planning and management',
  1500000,
  'corporate',
  6,
  'active',
  NOW() - INTERVAL '25 days'
WHERE (SELECT COUNT(*) FROM services) < 2;

-- Sample real estate leads
INSERT INTO real_estate_leads (id, user_id, property_id, customer_name, customer_phone, customer_email, status, source, notes, created_at)
SELECT 
  gen_random_uuid(),
  (SELECT id FROM flowserve_users LIMIT 1),
  (SELECT id FROM properties LIMIT 1),
  'Michael Johnson',
  '+2348098765432',
  'michael@example.com',
  'new',
  'whatsapp',
  'Interested in viewing the property this weekend',
  NOW() - INTERVAL '1 day'
WHERE NOT EXISTS (SELECT 1 FROM real_estate_leads LIMIT 1);

INSERT INTO real_estate_leads (id, user_id, property_id, customer_name, customer_phone, customer_email, status, source, notes, created_at)
SELECT 
  gen_random_uuid(),
  (SELECT id FROM flowserve_users LIMIT 1),
  (SELECT id FROM properties LIMIT 1 OFFSET 1),
  'Sarah Williams',
  '+2348076543210',
  'sarah@example.com',
  'contacted',
  'whatsapp',
  'Scheduled viewing for next week',
  NOW() - INTERVAL '3 days'
WHERE (SELECT COUNT(*) FROM real_estate_leads) < 2;

-- Sample event planning leads
INSERT INTO event_planning_leads (id, user_id, service_id, customer_name, customer_phone, customer_email, event_type, event_date, guest_count, status, source, notes, created_at)
SELECT 
  gen_random_uuid(),
  (SELECT id FROM flowserve_users LIMIT 1),
  (SELECT id FROM services LIMIT 1),
  'David Brown',
  '+2348065432109',
  'david@example.com',
  'wedding',
  CURRENT_DATE + INTERVAL '90 days',
  200,
  'inquiry',
  'whatsapp',
  'Looking for wedding planning services',
  NOW() - INTERVAL '2 days'
WHERE NOT EXISTS (SELECT 1 FROM event_planning_leads LIMIT 1);

-- Sample orders
INSERT INTO orders (id, user_id, customer_id, item_type, property_id, item_name, amount, status, payment_status, created_at)
SELECT 
  gen_random_uuid(),
  (SELECT id FROM flowserve_users LIMIT 1),
  (SELECT id FROM customers LIMIT 1),
  'property',
  (SELECT id FROM properties LIMIT 1),
  '3 Bedroom Apartment in Lekki',
  45000000,
  'pending',
  'unpaid',
  NOW() - INTERVAL '1 day'
WHERE NOT EXISTS (SELECT 1 FROM orders LIMIT 1);

INSERT INTO orders (id, user_id, customer_id, item_type, service_id, item_name, amount, status, payment_status, paid_at, created_at)
SELECT 
  gen_random_uuid(),
  (SELECT id FROM flowserve_users LIMIT 1),
  (SELECT id FROM customers LIMIT 1 OFFSET 1),
  'service',
  (SELECT id FROM services LIMIT 1),
  'Wedding Planning Package',
  2500000,
  'confirmed',
  'paid',
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '7 days'
WHERE (SELECT COUNT(*) FROM orders) < 2;
