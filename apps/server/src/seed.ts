import { ensureLocalUser } from './utils/bootstrap';

async function main() {
  await ensureLocalUser();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
