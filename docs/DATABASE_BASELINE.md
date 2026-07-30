# Database migration baseline

`20260727000000_complete_schema_baseline` is the first complete migration for
this project. It contains the full schema represented by `prisma/schema.prisma`.

## Fresh databases

Run:

```powershell
npx prisma migrate deploy
```

The baseline creates the original core schema. The existing incremental
migrations then add checkpoint recovery, session lifecycle, result snapshots,
search indexes, and question-set snapshots. Together, the migration chain
produces the complete current Prisma schema.

## Existing databases

The baseline does not recreate tables when the `User` table already exists, so
it can be safely recorded without destroying existing data. Existing migration
files are kept unchanged because modifying an applied migration would invalidate
its checksum.

This existing-database path assumes the database already matches the current
Prisma schema. Before deploying it to another existing environment:

1. Take a database backup.
2. Run `npx prisma migrate diff --from-url <database-url> --to-schema-datamodel prisma/schema.prisma`.
3. Resolve any reported drift before running `npx prisma migrate deploy`.

Do not edit an applied migration. Future schema changes must be added as new
Prisma migrations.
