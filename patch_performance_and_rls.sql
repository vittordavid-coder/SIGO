-- Script for creating indexes and RLS policies

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_resources_company_id ON public.resources(company_id);
CREATE INDEX IF NOT EXISTS idx_service_compositions_company_id ON public.service_compositions(company_id);
CREATE INDEX IF NOT EXISTS idx_quotations_company_id ON public.quotations(company_id);
CREATE INDEX IF NOT EXISTS idx_contracts_company_id ON public.contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_measurements_company_id ON public.measurements(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON public.audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_highway_locations_company_id ON public.highway_locations(company_id);
CREATE INDEX IF NOT EXISTS idx_station_groups_company_id ON public.station_groups(company_id);
CREATE INDEX IF NOT EXISTS idx_cubation_data_company_id ON public.cubation_data(company_id);
CREATE INDEX IF NOT EXISTS idx_transport_data_company_id ON public.transport_data(company_id);
CREATE INDEX IF NOT EXISTS idx_calculation_memories_company_id ON public.calculation_memories(company_id);
CREATE INDEX IF NOT EXISTS idx_service_productions_company_id ON public.service_productions(company_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_company_id ON public.daily_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_pluviometry_records_company_id ON public.pluviometry_records(company_id);
CREATE INDEX IF NOT EXISTS idx_technical_schedules_company_id ON public.technical_schedules(company_id);
CREATE INDEX IF NOT EXISTS idx_controller_teams_company_id ON public.controller_teams(company_id);
CREATE INDEX IF NOT EXISTS idx_equipments_company_id ON public.equipments(company_id);
CREATE INDEX IF NOT EXISTS idx_controller_equipments_company_id ON public.controller_equipments(company_id);
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_company_id ON public.equipment_maintenance(company_id);
CREATE INDEX IF NOT EXISTS idx_equipment_measurement_parameters_company_id ON public.equipment_measurement_parameters(company_id);
CREATE INDEX IF NOT EXISTS idx_equipment_monthly_data_company_id ON public.equipment_monthly_data(company_id);
CREATE INDEX IF NOT EXISTS idx_controller_manpower_company_id ON public.controller_manpower(company_id);
CREATE INDEX IF NOT EXISTS idx_manpower_monthly_data_company_id ON public.manpower_monthly_data(company_id);
CREATE INDEX IF NOT EXISTS idx_team_assignments_company_id ON public.team_assignments(company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_company_id ON public.suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_company_id ON public.purchase_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_company_id ON public.purchase_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_quotations_company_id ON public.purchase_quotations(company_id);
CREATE INDEX IF NOT EXISTS idx_equipment_transfers_company_id ON public.equipment_transfers(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_transfers_company_id ON public.employee_transfers(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_company_id ON public.employees(company_id);
CREATE INDEX IF NOT EXISTS idx_alojamentos_company_id ON public.alojamentos(company_id);
CREATE INDEX IF NOT EXISTS idx_time_records_company_id ON public.time_records(company_id);
CREATE INDEX IF NOT EXISTS idx_fuel_reservoirs_company_id ON public.fuel_reservoirs(company_id);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_company_id ON public.fuel_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_config_company_id ON public.dashboard_config(company_id);
CREATE INDEX IF NOT EXISTS idx_aportes_company_id ON public.aportes(company_id);
CREATE INDEX IF NOT EXISTS idx_measurement_templates_company_id ON public.measurement_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_budget_schedules_company_id ON public.budget_schedules(company_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_company_id ON public.warehouses(company_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_items_company_id ON public.warehouse_items(company_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_entries_company_id ON public.warehouse_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_assets_company_id ON public.assets(company_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_transfers_company_id ON public.warehouse_transfers(company_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_applications_company_id ON public.warehouse_applications(company_id);
CREATE INDEX IF NOT EXISTS idx_work_movements_company_id ON public.work_movements(company_id);
CREATE INDEX IF NOT EXISTS idx_project_alignments_company_id ON public.project_alignments(company_id);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON public.users(company_id);
CREATE INDEX IF NOT EXISTS idx_field_reports_company_id ON public.field_reports(company_id);

-- RLS policies for missing tables

-- work_movements
DROP POLICY IF EXISTS "Enable public read for work_movements" ON public.work_movements;
CREATE POLICY "Enable public read for work_movements" ON public.work_movements FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable public insert for work_movements" ON public.work_movements;
CREATE POLICY "Enable public insert for work_movements" ON public.work_movements FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Enable public update for work_movements" ON public.work_movements;
CREATE POLICY "Enable public update for work_movements" ON public.work_movements FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Enable public delete for work_movements" ON public.work_movements;
CREATE POLICY "Enable public delete for work_movements" ON public.work_movements FOR DELETE USING (true);

-- daily_reports
DROP POLICY IF EXISTS "Enable public read for daily_reports" ON public.daily_reports;
CREATE POLICY "Enable public read for daily_reports" ON public.daily_reports FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable public insert for daily_reports" ON public.daily_reports;
CREATE POLICY "Enable public insert for daily_reports" ON public.daily_reports FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Enable public update for daily_reports" ON public.daily_reports;
CREATE POLICY "Enable public update for daily_reports" ON public.daily_reports FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Enable public delete for daily_reports" ON public.daily_reports;
CREATE POLICY "Enable public delete for daily_reports" ON public.daily_reports FOR DELETE USING (true);

-- controller_equipments
DROP POLICY IF EXISTS "Enable public read for controller_equipments" ON public.controller_equipments;
CREATE POLICY "Enable public read for controller_equipments" ON public.controller_equipments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable public insert for controller_equipments" ON public.controller_equipments;
CREATE POLICY "Enable public insert for controller_equipments" ON public.controller_equipments FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Enable public update for controller_equipments" ON public.controller_equipments;
CREATE POLICY "Enable public update for controller_equipments" ON public.controller_equipments FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Enable public delete for controller_equipments" ON public.controller_equipments;
CREATE POLICY "Enable public delete for controller_equipments" ON public.controller_equipments FOR DELETE USING (true);

-- controller_manpower
DROP POLICY IF EXISTS "Enable public read for controller_manpower" ON public.controller_manpower;
CREATE POLICY "Enable public read for controller_manpower" ON public.controller_manpower FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable public insert for controller_manpower" ON public.controller_manpower;
CREATE POLICY "Enable public insert for controller_manpower" ON public.controller_manpower FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Enable public update for controller_manpower" ON public.controller_manpower;
CREATE POLICY "Enable public update for controller_manpower" ON public.controller_manpower FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Enable public delete for controller_manpower" ON public.controller_manpower;
CREATE POLICY "Enable public delete for controller_manpower" ON public.controller_manpower FOR DELETE USING (true);

-- purchase_requests
DROP POLICY IF EXISTS "Enable public read for purchase_requests" ON public.purchase_requests;
CREATE POLICY "Enable public read for purchase_requests" ON public.purchase_requests FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable public insert for purchase_requests" ON public.purchase_requests;
CREATE POLICY "Enable public insert for purchase_requests" ON public.purchase_requests FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Enable public update for purchase_requests" ON public.purchase_requests;
CREATE POLICY "Enable public update for purchase_requests" ON public.purchase_requests FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Enable public delete for purchase_requests" ON public.purchase_requests;
CREATE POLICY "Enable public delete for purchase_requests" ON public.purchase_requests FOR DELETE USING (true);

-- project_alignments
DROP POLICY IF EXISTS "Enable public read for project_alignments" ON public.project_alignments;
CREATE POLICY "Enable public read for project_alignments" ON public.project_alignments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable public insert for project_alignments" ON public.project_alignments;
CREATE POLICY "Enable public insert for project_alignments" ON public.project_alignments FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Enable public update for project_alignments" ON public.project_alignments;
CREATE POLICY "Enable public update for project_alignments" ON public.project_alignments FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Enable public delete for project_alignments" ON public.project_alignments;
CREATE POLICY "Enable public delete for project_alignments" ON public.project_alignments FOR DELETE USING (true);

