                    const getValidDate = (report: any) => {
                      let d;
                      if (report.timestamp) d = new Date(report.timestamp);
                      else if (report.createdAt) d = new Date(report.createdAt);
                      else if (report.date) {
                        if (report.date.includes('/')) {
                          const parts = report.date.split('/');
                          if (parts.length === 3) d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00`);
                        } else {
                          d = new Date(report.date);
                        }
                      }
                      if (!d || isNaN(d.getTime())) d = new Date();
                      return d;
                    };

                    filteredGalleryPhotos.sort((a, b) => {
                      return getValidDate(b).getTime() - getValidDate(a).getTime();
                    });

                    const grouped = filteredGalleryPhotos.reduce((acc, report) => {
                      const d = getValidDate(report);
                      const m = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                      const formatted = m.charAt(0).toUpperCase() + m.slice(1);
                      if (!acc[formatted]) acc[formatted] = [];
                      acc[formatted].push(report);
                      return acc;
                    }, {} as Record<string, typeof filteredGalleryPhotos>);
