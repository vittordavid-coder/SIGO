const fs = require('fs');
const file = 'src/components/ResourceView.tsx';
let code = fs.readFileSync(file, 'utf8');

const laborEditFields = `
                  {editingResource.type === 'labor' && (
                    <>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-hoursPerMonth" className="text-right">Horas/Mês</Label>
                        <div className="col-span-3">
                          <NumericInput 
                            id="edit-hoursPerMonth" 
                            value={editingResource.hoursPerMonth || 220} 
                            onChange={val => {
                               const hours = val || 220;
                               setEditingResource({...editingResource, hoursPerMonth: hours, basePrice: editingResource.monthlySalary ? editingResource.monthlySalary / hours : editingResource.basePrice});
                            }} 
                            decimals={0}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-monthlySalary" className="text-right">Valor Mensal</Label>
                        <div className="col-span-3">
                          <NumericInput 
                            id="edit-monthlySalary" 
                            value={editingResource.monthlySalary || 0} 
                            onChange={val => {
                               const hours = editingResource.hoursPerMonth || 220;
                               setEditingResource({...editingResource, monthlySalary: val, basePrice: val / hours});
                            }} 
                            prefix="R$"
                            decimals={2}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-encargos" className="text-right">Encargos (%)</Label>
                        <div className="col-span-3">
                          <NumericInput 
                            id="edit-encargos" 
                            value={editingResource.encargos || 0} 
                            onChange={val => setEditingResource({...editingResource, encargos: val})} 
                            decimals={2}
                          />
                        </div>
                      </div>
                    </>
                  )}
`;

code = code.replace(
  /\{editingResource\.type === 'labor' && \([\s\S]*?<\/div>\s*\}\)/,
  laborEditFields.trim()
);

// We need to change the 'price' field to handle hourly multiplication if it's labor
const priceFieldEdit = `<div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-price" className="text-right">
                      {editingResource.type === 'labor' ? 'Preço Hora' : editingResource.type === 'equipment' ? 'Preço Final' : 'Preço Base'}
                    </Label>
                    <div className="col-span-3">
                      <NumericInput 
                        id="edit-price" 
                        value={editingResource.basePrice} 
                        onChange={val => {
                          if (editingResource.type === 'labor') {
                            setEditingResource({...editingResource, basePrice: val, monthlySalary: val * (editingResource.hoursPerMonth || 220)});
                          } else {
                            setEditingResource({...editingResource, basePrice: val});
                          }
                        }} 
                        prefix="R$"
                        decimals={2}
                        required
                        disabled={editingResource.type === 'equipment' && !!editingResource.operatorId}
                      />
                    </div>
                  </div>`;
                  
code = code.replace(
  /<div className="grid grid-cols-4 items-center gap-4">\s*<Label htmlFor="edit-price" className="text-right">Preço Base<\/Label>\s*<div className="col-span-3">\s*<NumericInput\s*id="edit-price"\s*value=\{editingResource\.basePrice\}[\s\S]*?<\/div>\s*<\/div>/,
  priceFieldEdit
);

const equipmentEditFields = `
                  {editingResource.type === 'equipment' && (
                    <>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-equipmentBaseCost" className="text-right leading-tight">Custo<br/>Equipamento</Label>
                        <div className="col-span-3">
                          <NumericInput 
                            id="edit-equipmentBaseCost" 
                            value={editingResource.equipmentBaseCost || 0} 
                            onChange={val => {
                              const op = augmentedResources.find(r => r.id === editingResource.operatorId);
                              const opCost = op ? op.basePrice : 0;
                              setEditingResource({...editingResource, equipmentBaseCost: val, basePrice: (val || 0) + opCost});
                            }} 
                            prefix="R$"
                            decimals={2}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-operator" className="text-right">Operador</Label>
                        <Select 
                           value={editingResource.operatorId || "none"} 
                           onValueChange={v => {
                             if (v === "none") {
                               setEditingResource({...editingResource, operatorId: undefined, basePrice: editingResource.equipmentBaseCost || 0});
                             } else {
                               const op = augmentedResources.find(r => r.id === v);
                               const opCost = op ? op.basePrice : 0;
                               setEditingResource({...editingResource, operatorId: v, basePrice: (editingResource.equipmentBaseCost || 0) + opCost});
                             }
                           }}
                        >
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Sem operador" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sem operador</SelectItem>
                            {augmentedResources.filter(r => r.type === 'labor').map(lab => (
                              <SelectItem key={lab.id} value={lab.id}>{lab.name} ({formatCurrency(lab.basePrice)})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-productivePrice" className="text-right leading-tight">Preço Hora<br/>Produtiva</Label>
                        <div className="col-span-3">
                          <NumericInput 
                            id="edit-productivePrice" 
                            value={editingResource.productivePrice || 0} 
                            onChange={val => setEditingResource({...editingResource, productivePrice: val})} 
                            prefix="R$"
                            decimals={2}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-unproductivePrice" className="text-right leading-tight">Preço Hora<br/>Improdutiva</Label>
                        <div className="col-span-3">
                          <NumericInput 
                            id="edit-unproductivePrice" 
                            value={editingResource.unproductivePrice || 0} 
                            onChange={val => setEditingResource({...editingResource, unproductivePrice: val})} 
                            prefix="R$"
                            decimals={2}
                          />
                        </div>
                      </div>
                    </>
                  )}
`;

code = code.replace(
  /\{editingResource\.type === 'equipment' && \([\s\S]*?<\/div>\s*<\/div>\s*<\/>\s*\)\}/,
  equipmentEditFields.trim()
);

fs.writeFileSync(file, code);
