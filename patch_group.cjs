const fs = require('fs');
let file = fs.readFileSync('src/components/ResourceView.tsx', 'utf8');

file = file.replace(
`            {sortedResources.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columnOrder.length} className="text-center py-12 text-gray-500">
                  {searchTerm ? 'Nenhum insumo encontrado para esta pesquisa.' : 'Nenhum insumo cadastrado.'}
                </TableCell>
              </TableRow>
            ) : (
              sortedResources.map(r => {
                const rStats = getResourceStats(r);
                return (
                  <TableRow key={r.id} className="group">
                    {columnOrder.map((colKey) => {
                      if (colKey === 'code') {`,
`            {sortedResources.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columnOrder.length} className="text-center py-12 text-gray-500">
                  {searchTerm ? 'Nenhum insumo encontrado para esta pesquisa.' : 'Nenhum insumo cadastrado.'}
                </TableCell>
              </TableRow>
            ) : (
              (['labor', 'equipment', 'material', 'service'] as ResourceType[]).map(groupType => {
                const groupResources = sortedResources.filter(r => r.type === groupType || (groupType === 'service' && r.type === 'service'));
                if (groupResources.length === 0) return null;
                return (
                  <React.Fragment key={groupType}>
                    <TableRow className="bg-slate-100 hover:bg-slate-100">
                      <TableCell colSpan={columnOrder.length} className="font-bold text-slate-700 uppercase tracking-wider text-xs py-2">
                        {groupType === 'labor' ? 'Mão de Obra' : groupType === 'equipment' ? 'Equipamentos' : groupType === 'material' ? 'Materiais' : 'Serviços'}
                      </TableCell>
                    </TableRow>
                    {groupResources.map(r => {
                      const rStats = getResourceStats(r);
                      return (
                        <TableRow key={r.id} className="group">
                          {columnOrder.map((colKey) => {
                            if (colKey === 'code') {`
);

file = file.replace(
`                        return null;
                    })}
                  </TableRow>
                );
              })
            )}`,
`                        return null;
                          })}
                        </TableRow>
                      );
                    })}
                  </React.Fragment>
                );
              })
            )}`
);

fs.writeFileSync('src/components/ResourceView.tsx', file);
