import { useState, useRef, useEffect } from 'react';
import { getSupabaseConfig, createSupabaseClient } from './supabaseClient';
import { SUPABASE_TABLE_DEFS } from './sqlFormat';

export function useLocalStorage<T>(key: string, initialValue: T, companyId?: string): [T, (value: T | ((prev: T) => T)) => void] {
  // Use a ref to store the latest value for the interval timer
  const stateRef = useRef<T>(initialValue);
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const config = getSupabaseConfig();
      const storeKey = companyId && key !== 'sigo_users' ? `${companyId}_${key}` : key;
      const isSensitive = key === 'sigo_users' || key === 'sigo_reset_requests';
      
      // Load from localStorage as initial cache
      const item = window.localStorage.getItem(storeKey);
      let val = item ? JSON.parse(item) : initialValue;
      if (val === null && initialValue !== null) val = initialValue;
      
      // If Supabase is enabled and no local cached data is found, return initialValue
      if (config.enabled && isSensitive && !item) {
        return initialValue;
      }
      
      stateRef.current = val;
      return val;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  // Sync state when key or companyId changes
  useEffect(() => {
    try {
      const storeKey = companyId && key !== 'sigo_users' ? `${companyId}_${key}` : key;
      const item = window.localStorage.getItem(storeKey);
      let val = item ? JSON.parse(item) : initialValue;
      if (val === null && initialValue !== null) val = initialValue;
      
      if (JSON.stringify(val) !== JSON.stringify(storedValue)) {
        setStoredValue(val);
        stateRef.current = val;
      }
    } catch (error) {
      console.error('Error reloading from localStorage:', error);
    }
  }, [key, companyId]);

  const setValue = (value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(stateRef.current) : value;
      setStoredValue(valueToStore);
      stateRef.current = valueToStore;
      
      const config = getSupabaseConfig();
      const isSensitive = key === 'sigo_users' || key === 'sigo_reset_requests' || key === 'chat_messages';
      
      const storeKey = companyId && key !== 'sigo_users' ? `${companyId}_${key}` : key;
      if (!isSensitive) {
        try {
          window.localStorage.setItem(storeKey, JSON.stringify(valueToStore));
        } catch (storageError) {
          console.error(`Error saving to localStorage:`, storageError);
        }
      } else if (config.enabled) {
        // Connected mode: explicitly remove sensitive data from localStorage
        window.localStorage.removeItem(key);
        if (companyId) window.localStorage.removeItem(`${companyId}_${key}`);
      }
      
      syncToSupabase(valueToStore);
    } catch (error) {
      console.error(error);
    }
  };

  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef(false);
  const pendingSyncValueRef = useRef<T | null>(null);

  const syncToSupabase = async (value: T) => {
    // Se já estiver sincronizando, guardamos o valor mais recente para sincronizar depois
    if (isSyncingRef.current) {
      pendingSyncValueRef.current = value;
      return;
    }

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(async () => {
      const config = getSupabaseConfig();
      if (!config.enabled || !config.url || !config.key || isSyncingRef.current) {
        if (isSyncingRef.current) pendingSyncValueRef.current = value;
        return;
      }

      const isGlobal = key === 'sigo_users';
      const namespacedKey = companyId && !isGlobal ? `${companyId}_${key}` : key;
      const currentHash = JSON.stringify(value);

      // Check if this is a redundant sync of data we already fetched or saved
      const globalHashes = (window as any).sigoLastSyncedHashes || {};
      const forceSyncFlags = (window as any).sigoForceSyncUp || {};
      
      const tableMap: Record<string, string> = {
        'sconet_resources': 'resources',
        'sconet_services': 'service_compositions',
        'sconet_quotations': 'quotations',
        'sconet_contracts': 'contracts',
        'sconet_measurements': 'measurements',
        'sigo_audit_logs': 'audit_logs',
        'sigo_highway_locations': 'highway_locations',
        'sigo_station_groups': 'station_groups',
        'sigo_cubation_data': 'cubation_data',
        'sigo_transport_data': 'transport_data',
        'sigo_calc_memories': 'calculation_memories',
        'sigo_service_productions': 'service_productions',
        'sigo_daily_reports': 'daily_reports',
        'sigo_pluviometry_records': 'pluviometry_records',
        'sigo_technical_schedules': 'technical_schedules',
        'sigo_employees': 'employees',
        'sigo_time_records': 'time_records',
        'sigo_measurement_templates': 'measurement_templates',
        'sconet_schedules': 'budget_schedules',
        'sigo_controller_equipments': 'controller_equipments',
        'sigo_equipment_monthly': 'equipment_monthly_data',
        'sigo_controller_manpower': 'controller_manpower',
        'sigo_manpower_monthly': 'manpower_monthly_data',
        'sigo_equipment_transfers': 'equipment_transfers',
        'sigo_suppliers': 'suppliers',
        'sigo_purchase_requests': 'purchase_requests',
        'sigo_purchase_quotations': 'purchase_quotations',
        'sigo_purchase_orders': 'purchase_orders',
        'sigo_reset_requests': 'password_reset_requests',
        'sigo_users': 'users',
        'sigo_aportes': 'aportes',
        'sigo_team_assignments': 'team_assignments'
      };
      const targetTable = tableMap[key];

      if (globalHashes[namespacedKey] === currentHash && !forceSyncFlags[targetTable]) {
        // Already synchronized, bypass to prevent write-back and accidental wipes on load/errors!
        return;
      }
      
      const supabase = createSupabaseClient(config.url, config.key);
      if (!supabase) return;

      isSyncingRef.current = true;
      try {
        const now = new Date().toISOString();
        // 1. Sync blob
        const { error: blobError } = await supabase.from('app_state').upsert({ 
          id: namespacedKey, 
          content: value,
          updated_at: now
        });
        
        if (blobError) throw blobError;
        window.localStorage.setItem(`last_sync_${namespacedKey}`, now);

        // 2. Sync individual table
        const tableMap: Record<string, string> = {
          'sconet_resources': 'resources',
          'sconet_services': 'service_compositions',
          'sconet_quotations': 'quotations',
          'sconet_contracts': 'contracts',
          'sconet_measurements': 'measurements',
          'sigo_audit_logs': 'audit_logs',
          'sigo_highway_locations': 'highway_locations',
          'sigo_station_groups': 'station_groups',
          'sigo_cubation_data': 'cubation_data',
          'sigo_transport_data': 'transport_data',
          'sigo_calc_memories': 'calculation_memories',
          'sigo_service_productions': 'service_productions',
          'sigo_daily_reports': 'daily_reports',
          'sigo_pluviometry_records': 'pluviometry_records',
          'sigo_technical_schedules': 'technical_schedules',
          'sigo_employees': 'employees',
          'sigo_time_records': 'time_records',
          'sigo_measurement_templates': 'measurement_templates',
          'sconet_schedules': 'budget_schedules',
          'sigo_controller_equipments': 'controller_equipments',
          'sigo_equipment_monthly': 'equipment_monthly_data',
          'sigo_controller_manpower': 'controller_manpower',
          'sigo_manpower_monthly': 'manpower_monthly_data',
          'sigo_equipment_transfers': 'equipment_transfers',
          'sigo_suppliers': 'suppliers',
          'sigo_purchase_requests': 'purchase_requests',
          'sigo_purchase_quotations': 'purchase_quotations',
          'sigo_purchase_orders': 'purchase_orders',
          'sigo_reset_requests': 'password_reset_requests',
          'sigo_users': 'users'
        };

        const targetTable = tableMap[key];
        if (targetTable && Array.isArray(value)) {
          const activeCompId = companyId || (value.length > 0 ? (value[0].companyId || value[0].company_id) : null);
          
          if (activeCompId || isGlobal) {
            // Cleanup orphans 
            // We run this every time to ensure if items were deleted locally (even if the array is now empty), 
            // they are also deleted in Supabase.
            let dbItems: any[] = [];
            let from = 0;
            const pageSize = 1000;
            let keepFetching = true;
            while (keepFetching) {
              let query = supabase.from(targetTable).select('id').range(from, from + pageSize - 1);
              if (!isGlobal && activeCompId) query = query.eq('company_id', activeCompId);
              
              const { data, error } = await query;
              if (error || !data) {
                keepFetching = false;
              } else {
                dbItems = [...dbItems, ...data];
                if (data.length < pageSize) keepFetching = false;
                else from += pageSize;
              }
            }
            const dbIds = dbItems?.map((d: any) => d.id) || [];
            const currentIds = (value as any[]).map(c => c.id);
            const toDeleteIds = dbIds.filter(id => !currentIds.includes(id));
            
            if (toDeleteIds.length > 0) {
              await supabase.from(targetTable).delete().in('id', toDeleteIds);
            }

            if (value.length > 0) {
              const getTableColumns = (tableName: string): string[] => {
                const def = SUPABASE_TABLE_DEFS[tableName];
                if (!def) return [];
                return def.split(',').map(part => {
                  const trimmed = part.trim();
                  const match = trimmed.match(/^([a-z0-9_]+)/i);
                  return match ? match[1] : '';
                }).filter(col => col !== '');
              };

              const validColumns = getTableColumns(targetTable);

              const mapToSnake = (obj: any) => {
                const newObj: any = {};
                for (const k in obj) {
                  const snakeKey = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                  if (validColumns.length === 0 || validColumns.includes(snakeKey)) {
                    newObj[snakeKey] = obj[k] === undefined ? null : obj[k];
                  }
                }
                if (!isGlobal && activeCompId && (validColumns.length === 0 || validColumns.includes('company_id')) && !newObj.company_id) {
                  newObj.company_id = activeCompId;
                }
                return newObj;
              };
              const mappedData = value.map(mapToSnake);
              
              const chunkSize = 50;
              for (let i = 0; i < mappedData.length; i += chunkSize) {
                const chunk = mappedData.slice(i, i + chunkSize);
                await supabase.from(targetTable).upsert(chunk);
              }
              console.log(`[Supabase] Sincronizado ${value.length} itens em ${targetTable}`);
            }
          }
        }
        if (targetTable) {
          if (forceSyncFlags[targetTable]) {
            delete forceSyncFlags[targetTable];
          }
        }
        if (!(window as any).sigoLastSyncedHashes) (window as any).sigoLastSyncedHashes = {};
        (window as any).sigoLastSyncedHashes[namespacedKey] = currentHash;
      } catch (e) {
        console.error(`[Supabase] Erro de Sincronização:`, e);
      } finally {
        isSyncingRef.current = false;
        // Se houver uma sincronização pendente, executa agora
        if (pendingSyncValueRef.current) {
          const nextValue = pendingSyncValueRef.current;
          pendingSyncValueRef.current = null;
          syncToSupabase(nextValue);
        }
      }
    }, 300); 
  };

  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, []);

  return [storedValue, setValue];
}
