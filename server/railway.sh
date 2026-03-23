#!/bin/bash
set -e

echo "Running migrations..."
npx prisma migrate deploy

echo "Starting server..."
node dist/index.js
```

Make it executable and update the start command in Railway to:
```
bash railway.sh