import fs from 'fs';

let content = fs.readFileSync('src/components/TechnicalRoomExtensions.tsx', 'utf8');

content = content.replace(/localSchedule\.services\.find\(ls => ls\.serviceId === bi\.serviceId\)/g, 'localServicesMap[bi.serviceId]');
content = content.replace(/localSchedule\.services\.find\(ls => ls\.serviceId === s\.serviceId\)/g, 'localServicesMap[s.serviceId]');
content = content.replace(/services\.find\(s => s\.id === bi\.serviceId\)/g, 'globalServicesMap.idMap[bi.serviceId]');
content = content.replace(/services\.find\(s => s\.id === editingServiceId\)/g, '(editingServiceId ? globalServicesMap.idMap[editingServiceId] : undefined)');
content = content.replace(/services\.find\(serv => serv\.id === editingServiceId\)/g, '(editingServiceId ? globalServicesMap.idMap[editingServiceId] : undefined)');

fs.writeFileSync('src/components/TechnicalRoomExtensions.tsx', content);
