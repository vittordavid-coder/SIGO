const fs = require('fs');
let code = fs.readFileSync('src/components/SyneraMobileView.tsx', 'utf-8');

const drawLogic = `
        if (config.showLargeStationTopRight && options.station) {
          ctx.save();
          const textCanvasW = config.rotateCaption ? canvasH : canvasW;
          
          if (config.rotateCaption) {
            ctx.translate(canvasW, 0);
            ctx.rotate(Math.PI / 2);
          }

          const largeFontSize = Math.max(36, Math.floor(minDim * 0.12));
          ctx.font = \`900 \${largeFontSize}px sans-serif\`;
          
          const text = options.station;
          const textW = ctx.measureText(text).width;
          
          ctx.shadowColor = 'rgba(0,0,0,0.85)';
          ctx.shadowBlur = Math.max(10, Math.floor(minDim * 0.01));
          ctx.shadowOffsetX = 3;
          ctx.shadowOffsetY = 3;
          
          ctx.fillStyle = config.themeColor || '#10B981';
          ctx.fillText(text, textCanvasW - textW - margin, margin + largeFontSize * 0.85);
          
          // Draw a stroke to make it pop even more
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = Math.max(2, Math.floor(largeFontSize * 0.03));
          ctx.strokeText(text, textCanvasW - textW - margin, margin + largeFontSize * 0.85);
          
          ctx.restore();
        }

        ctx.save();
        const textCanvasW = config.rotateCaption ? canvasH : canvasW;
`;

code = code.replace(/ctx\.save\(\);\s*const textCanvasW = config\.rotateCaption \? canvasH : canvasW;/g, drawLogic.trim());

fs.writeFileSync('src/components/SyneraMobileView.tsx', code);
