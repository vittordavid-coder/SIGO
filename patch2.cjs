const fs = require('fs');
let file = fs.readFileSync('src/components/ResourceView.tsx', 'utf8');

file = file.replace(
`                      return null;
                    })}
                  </TableRow>
                );
              })
            )}`,
`                      return null;
                          })}
                        </TableRow>
                      );
                    })}
                  </React.Fragment>
                );
              })
            )}`
);

fs.writeFileSync('src/components/ResourceView.tsx', file);
