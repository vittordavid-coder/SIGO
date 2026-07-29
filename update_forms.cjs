const fs = require('fs');
const file = 'src/components/ResourceView.tsx';
let code = fs.readFileSync(file, 'utf8');

const laborNewFields = `
                  {newResource.type === 'labor' && (
                    <>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="hoursPerMonth" className="text-right">Horas/Mês</Label>
                        <div className="col-span-3">
                          <NumericInput 
                            id="hoursPerMonth" 
                            value={newResource.hoursPerMonth || 220} 
                            onChange={val => {
                               const hours = val || 220;
                               setNewResource({...newResource, hoursPerMonth: hours, basePrice: newResource.monthlySalary ? newResource.monthlySalary / hours : newResource.basePrice});
                            }} 
                            decimals={0}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="monthlySalary" className="text-right">Valor Mensal</Label>
                        <div className="col-span-3">
                          <NumericInput 
                            id="monthlySalary" 
                            value={newResource.monthlySalary || 0} 
                            onChange={val => {
                               const hours = newResource.hoursPerMonth || 220;
                               setNewResource({...newResource, monthlySalary: val, basePrice: val / hours});
                            }} 
                            prefix="R$"
                            decimals={2}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="encargos" className="text-right">Encargos (%)</Label>
                        <div className="col-span-3">
                          <NumericInput 
                            id="encargos" 
                            value={newResource.encargos || 0} 
                            onChange={val => setNewResource({...newResource, encargos: val})} 
                            decimals={2}
                          />
                        </div>
                      </div>
                    </>
                  )}
`;

code = code.replace(
  /\{newResource\.type === 'labor' && \([\s\S]*?<\/div>\s*\}\)/,
  laborNewFields.trim()
);

// We need to change the 'price' field to handle hourly multiplication if it's labor
const priceFieldNew = `<div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="price" className="text-right">
                      {newResource.type === 'labor' ? 'Preço Hora' : newResource.type === 'equipment' ? 'Preço Final' : 'Preço Base'}
                    </Label>
                    <div className="col-span-3">
                      <NumericInput 
                        id="price" 
                        value={newResource.basePrice} 
                        onChange={val => {
                          if (newResource.type === 'labor') {
                            setNewResource({...newResource, basePrice: val, monthlySalary: val * (newResource.hoursPerMonth || 220)});
                          } else {
                            setNewResource({...newResource, basePrice: val});
                          }
                        }} 
                        prefix="R$"
                        decimals={2}
                        required
                        disabled={newResource.type === 'equipment' && !!newResource.operatorId}
                      />
                    </div>
                  </div>`;
                  
code = code.replace(
  /<div className="grid grid-cols-4 items-center gap-4">\s*<Label htmlFor="price" className="text-right">Preço Base<\/Label>\s*<div className="col-span-3">\s*<NumericInput\s*id="price"\s*value=\{newResource\.basePrice\}[\s\S]*?<\/div>\s*<\/div>/,
  priceFieldNew
);

const equipmentNewFields = `
                  {newResource.type === 'equipment' && (
                    <>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="equipmentBaseCost" className="text-right leading-tight">Custo<br/>Equipamento</Label>
                        <div className="col-span-3">
                          <NumericInput 
                            id="equipmentBaseCost" 
                            value={newResource.equipmentBaseCost || 0} 
                            onChange={val => {
                              const op = augmentedResources.find(r => r.id === newResource.operatorId);
                              const opCost = op ? op.basePrice : 0;
                              setNewResource({...newResource, equipmentBaseCost: val, basePrice: (val || 0) + opCost});
                            }} 
                            prefix="R$"
                            decimals={2}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="operator" className="text-right">Operador</Label>
                        <Select 
                           value={newResource.operatorId || "none"} 
                           onValueChange={v => {
                             if (v === "none") {
                               setNewResource({...newResource, operatorId: undefined, basePrice: newResource.equipmentBaseCost || 0});
                             } else {
                               const op = augmentedResources.find(r => r.id === v);
                               const opCost = op ? op.basePrice : 0;
                               setNewResource({...newResource, operatorId: v, basePrice: (newResource.equipmentBaseCost || 0) + opCost});
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
                        <Label htmlFor="productivePrice" className="text-right leading-tight">Preço Hora<br/>Produtiva</Label>
                        <div className="col-span-3">
                          <NumericInput 
                            id="productivePrice" 
                            value={newResource.productivePrice || 0} 
                            onChange={val => setNewResource({...newResource, productivePrice: val})} 
                            prefix="R$"
                            decimals={2}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="unproductivePrice" className="text-right leading-tight">Preço Hora<br/>Improdutiva</Label>
                        <div className="col-span-3">
                          <NumericInput 
                            id="unproductivePrice" 
                            value={newResource.unproductivePrice || 0} 
                            onChange={val => setNewResource({...newResource, unproductivePrice: val})} 
                            prefix="R$"
                            decimals={2}
                          />
                        </div>
                      </div>
                    </>
                  )}
`;

code = code.replace(
  /\{newResource\.type === 'equipment' && \([\s\S]*?<\/div>\s*<\/div>\s*<\/>\s*\)\}/,
  equipmentNewFields.trim()
);

fs.writeFileSync(file, code);
