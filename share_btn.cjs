const fs = require('fs');
let content = fs.readFileSync('src/components/SyneraMobileView.tsx', 'utf8');

const shareCode = `
                    <button 
                      onClick={async () => {
                        if (navigator.share) {
                          try {
                            const res = await fetch(capturedPhotoUrl);
                            const blob = await res.blob();
                            const file = new File([blob], 'synera_cam_foto.jpg', { type: blob.type });
                            await navigator.share({
                              title: 'Foto - Synera Cam',
                              text: photoDescription || 'Foto capturada no Synera Cam',
                              files: [file]
                            });
                          } catch (e) {
                            console.error('Erro ao compartilhar', e);
                          }
                        } else {
                          alert('Seu dispositivo não suporta o compartilhamento nativo.');
                        }
                      }}
                      className="w-12 h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center border border-slate-700 text-white shrink-0"
                    >
                      <Share2 className="w-5 h-5 text-emerald-400" />
                    </button>
`;

content = content.replace(/<Download className="w-5 h-5 text-blue-400" \/>\n                    <\/a>/g, 
  '<Download className="w-5 h-5 text-blue-400" />\n                    </a>\n' + shareCode);

if (!content.includes("Share2")) {
   content = content.replace(/import {([^}]+)} from 'lucide-react';/g, "import {$1, Share2} from 'lucide-react';");
}

fs.writeFileSync('src/components/SyneraMobileView.tsx', content);
