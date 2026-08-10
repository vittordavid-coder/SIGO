const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const correctCode = `  }, [fieldReports, selectedContractId]);

  const syncFieldReportsStateToSupabase = async (updatedReports: FieldProductionReport[], specificReportsToUpsert?: FieldProductionReport[]) => {
    const config = getSupabaseConfig();
    if (!config.enabled) return;
    const supabase = createSupabaseClient(config.url, config.key);
    if (!supabase) return;
    const activeCompId = currentUser?.companyId || compId;

    // Filter out camera photo-only reports (starting with photo-) - only send production REGISTROS to system
    const validRegistros = (updatedReports || []).filter(r => !r.id.startsWith('photo-'));

    try {
      if (activeCompId) {
        let { error: bErr } = await supabase.from('app_state').upsert({
          id: \`\${activeCompId}_sigo_field_reports\`,
          content: validRegistros,
          updated_at: new Date().toISOString()
        });
        if (bErr) {
          await supabase.from('app_state').upsert({
            id: \`\${activeCompId}_sigo_field_reports\`,
            content: validRegistros
          }).catch(() => {});
        }
      }

      const reportsToUpsert = specificReportsToUpsert !== undefined 
        ? specificReportsToUpsert.filter(r => !r.id.startsWith('photo-')) 
        : validRegistros;

      if (reportsToUpsert.length > 0) {
        const mapped = reportsToUpsert.map((r: any) => {
          const {
            id, companyId, contractId, contractName, serviceId, serviceName,
            unit, qty, productionDate, startStation, endStation, trecho,
            notes, photo, photoUrl, reportedBy, reportedByEmail, status,
            syncedAt, createdAt, updatedAt, infoType, tripsQty, lengthM, widthM, heightM,
            rejectedBy, rejectionReason, rejectedAt, approvedBy, approvedAt
          } = r;
          return {
            id: id || \`fr-\${Date.now()}-\${Math.random().toString(36).substring(2, 6)}\`,
            company_id: companyId || activeCompId || null,
            contract_id: (contractId && contractId !== '') ? contractId : null,
            contract_name: contractName || null,
            service_id: (serviceId && serviceId !== '') ? serviceId : null,
            service_name: serviceName || null,
            unit: unit || 'un',
            qty: Number(qty) || 0,
            production_date: (productionDate && typeof productionDate === 'string' && productionDate.trim() !== '') ? productionDate : null,
            start_station: startStation || null,
            end_station: endStation || null,
            trecho: trecho || null,
            notes: notes || null,
            photo: photo || null,
            photo_url: photoUrl || null,
            reported_by: reportedBy || null,
            reported_by_email: reportedByEmail || null,
            status: status || 'pending',
            synced_at: (syncedAt && typeof syncedAt === 'string' && syncedAt.trim() !== '') ? syncedAt : new Date().toISOString(),
            created_at: (createdAt && typeof createdAt === 'string' && createdAt.trim() !== '') ? createdAt : new Date().toISOString(),
            updated_at: (updatedAt && typeof updatedAt === 'string' && updatedAt.trim() !== '') ? updatedAt : new Date().toISOString(),
            rejected_by: rejectedBy || null,
            rejection_reason: rejectionReason || null,
            rejected_at: rejectedAt || null,
            approved_by: approvedBy || null,
            approved_at: approvedAt || null,
            ...(infoType ? { info_type: infoType } : {}),
            ...(tripsQty !== undefined && tripsQty !== null ? { trips_qty: Number(tripsQty) } : {}),
            ...(lengthM !== undefined && lengthM !== null ? { length_m: Number(lengthM) } : {}),
            ...(widthM !== undefined && widthM !== null ? { width_m: Number(widthM) } : {}),
            ...(heightM !== undefined && heightM !== null ? { height_m: Number(heightM) } : {})
          };
        });

        let { error: fErr } = await supabase.from('field_reports').upsert(mapped);
        if (fErr) {
          const coreMapped = mapped.map(({ info_type, trips_qty, length_m, width_m, height_m, ...rest }: any) => rest);
          await supabase.from('field_reports').upsert(coreMapped).catch(err => {
            console.warn('[Supabase] Retry field_reports upsert with core columns failed:', err);
          });
        }
      }
    } catch (err) {
      console.warn('[Supabase] Error syncing field reports:', err);
    }
  };`;

const lines = code.split('\n');
lines.splice(563, 93, correctCode);
fs.writeFileSync('src/App.tsx', lines.join('\n'));
