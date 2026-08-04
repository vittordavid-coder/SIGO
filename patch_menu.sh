sed -i -e '/{onLogout && (/i \
              {!isCamOnly && (\
                <button\
                  onClick={() => window.open("/cam.html", "_blank")}\
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400 border border-slate-700 transition-colors"\
                  title="Abrir Synera Cam"\
                >\
                  <Camera className="w-3.5 h-3.5" />\
                </button>\
              )}\
' src/components/SyneraMobileView.tsx
