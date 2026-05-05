-- SIGO System - Supabase Migration Part 4 (RLS & Policies)

-- 1. Enable RLS on all tables
ALTER TABLE app_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_compositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE pluviometry_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE technical_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculation_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_productions ENABLE ROW LEVEL SECURITY;
ALTER TABLE highway_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE station_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE cubation_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE controller_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE controller_equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE controller_manpower ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_monthly_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE manpower_monthly_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurement_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_notifications ENABLE ROW LEVEL SECURITY;

-- 2. Basic Policies (Allow all for Development)
CREATE POLICY "Allow public access" ON app_state FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON audit_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON resources FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON service_compositions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON quotations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON contracts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON measurements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON daily_reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON pluviometry_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON technical_schedules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON calculation_memories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON service_productions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON highway_locations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON station_groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON cubation_data FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON transport_data FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON employees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON time_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON controller_teams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON controller_equipments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON controller_manpower FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON team_assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON equipment_monthly_data FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON manpower_monthly_data FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON equipment_transfers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON budget_schedules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON measurement_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON password_reset_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON chat_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON chat_notifications FOR ALL USING (true) WITH CHECK (true);

-- 3. Enable Realtime for Chat (Requires proper permissions)
-- This tries to add chat_messages to the realtime publication
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not add table to publication. This is expected if the user is not a superuser or the table is already in it.';
END $$;
