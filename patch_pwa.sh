sed -i -e 's/Aplicativo Synera Mobile/{isCamOnly ? "Aplicativo Synera Cam" : "Aplicativo Synera Mobile"}/' src/components/SyneraMobileView.tsx
sed -i -e 's/Instalar PWA SYNERA MOBILE/{isCamOnly ? "Instalar PWA SYNERA CAM" : "Instalar PWA SYNERA MOBILE"}/' src/components/SyneraMobileView.tsx
