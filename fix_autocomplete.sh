sed -i -e '/if (controlledServiceIds.size > 0) {/,/return baseServices;/c\    return baseServices.filter(s => controlledServiceIds.has(s.id));' src/components/SyneraMobileView.tsx
