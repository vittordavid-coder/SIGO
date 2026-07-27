    ];
    
    if (report.activities && report.activities.length > 0) {
      addSectionHeader('4. ATIVIDADES', 'FF334155');
      const headAct = worksheet.addRow(['Cód.', 'Atividade', 'Tipo']);
      headAct.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headAct.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF94A3B8' } }; });
      report.activities.forEach(a => {
        worksheet.addRow([a.code, a.description, a.type]);
      });
      worksheet.addRow([]);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `RDO-${report.date}.xlsx`);
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black uppercase tracking-wider text-gray-800">Diário de Obras (RDO)</h2>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Gestão e Validação Diária</p>
        </div>
      </div>

      <Tabs value={activeItem} onValueChange={v => setActiveItem(v as any)} className="w-full flex-1 flex flex-col min-h-0">
        <TabsList className="mb-4 bg-gray-100 p-1 rounded-xl">
          <TabsTrigger value="activities" className="flex items-center gap-2 rounded-lg font-black uppercase text-xs tracking-widest px-4 py-2">
             Atividades
          </TabsTrigger>
          <TabsTrigger value="viewer" className="flex items-center gap-2 rounded-lg font-black uppercase text-xs tracking-widest px-4 py-2">
             Diários
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activities">
          <Card className="overflow-hidden border border-gray-100 shadow-sm rounded-2xl flex-1 flex flex-col h-[calc(100vh-280px)]">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-24">Cód</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-32">Tipo</TableHead>
                  {!readonly && <TableHead className="w-16"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {allActivities.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="p-2 font-mono text-xs">
                      <div className="flex items-center gap-2">
                        <Input 
                          disabled={readonly}
                          className="h-8 w-20 text-xs font-mono font-black text-blue-600 border-transparent hover:border-gray-200 focus:border-blue-500 transition-all"
                          value={a.code || ''}
                          onChange={e => handleUpdateActivity(a.reportId, a.id, 'code', e.target.value)}
                        />
