import * as fs from 'fs';
let content = fs.readFileSync('src/components/Game.tsx', 'utf8');
content = content.replace(
`      )}
    </div>
  );
}`,
`      )}
      </div>
      </div>
    </div>
  );
}`
);
fs.writeFileSync('src/components/Game.tsx', content);
