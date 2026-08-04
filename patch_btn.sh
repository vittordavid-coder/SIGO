sed -i -e '/<Button/,/<\/Button>/c\
                <Dialog>\
                  <DialogTrigger asChild>\
                    <Button className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs uppercase tracking-wider gap-2 shadow-lg shadow-emerald-500/25 mt-1">\
                      <Download className="w-4 h-4 text-slate-950 stroke-[3]" />\
                      Instalar Synera Mobile\
                    </Button>\
                  </DialogTrigger>\
                  <DialogContent className="sm:max-w-md bg-slate-950 border-slate-800 text-white rounded-2xl">\
                    <DialogHeader>\
                      <DialogTitle className="text-lg font-black text-white">Instalar Aplicativo</DialogTitle>\
                      <DialogDescription className="text-slate-400 text-xs">\
                        Escolha qual aplicativo do pacote Synera você deseja instalar neste dispositivo.\
                      </DialogDescription>\
                    </DialogHeader>\
                    <div className="flex flex-col gap-3 py-4">\
                      <Button \
                        onClick={() => { if(!isCamOnly) { handleInstallPwa(); } else { window.location.href = "/"; } }}\
                        className="h-14 bg-slate-900 border border-slate-700 hover:border-blue-500 hover:bg-slate-800 text-white justify-start gap-4"\
                      >\
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">\
                          <LayoutDashboard className="w-4 h-4 text-blue-400" />\
                        </div>\
                        <div className="flex flex-col items-start">\
                          <span className="font-bold text-sm">Synera Mobile (Campo)</span>\
                          <span className="text-[10px] text-slate-400 font-normal">Apontamentos, diários e requisições</span>\
                        </div>\
                      </Button>\
                      <Button \
                        onClick={() => { if(isCamOnly) { handleInstallPwa(); } else { window.location.href = "/cam.html"; } }}\
                        className="h-14 bg-slate-900 border border-slate-700 hover:border-emerald-500 hover:bg-slate-800 text-white justify-start gap-4"\
                      >\
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">\
                          <Camera className="w-4 h-4 text-emerald-400" />\
                        </div>\
                        <div className="flex flex-col items-start">\
                          <span className="font-bold text-sm">Synera Cam</span>\
                          <span className="text-[10px] text-slate-400 font-normal">Fotos com coordenadas e dados da obra</span>\
                        </div>\
                      </Button>\
                    </div>\
                  </DialogContent>\
                </Dialog>' src/components/SyneraMobileView.tsx
