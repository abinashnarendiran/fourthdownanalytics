# Server tests

Run the Vitest suite from the repository root with:

```powershell
npm --prefix .\server test
```

Tests use checked-in Sleeper response fixtures and mocked HTTP; they do not
contact Sleeper. The backend currently uses Sequelize with MySQL, so
`database.integration.test.js` exercises every exported model and configured
association against MySQL.
Vitest uses `DB_TEST_NAME` for its database; if it is unset, it uses
`fantasy_test`. Regular development still uses `DB_NAME`.

The database suite calls `sequelize.sync()` without `force` or `alter`, so it
creates missing tables from the model graph and leaves existing tables intact.
Each test writes uniquely named rows and deletes only those rows afterward.
Ensure the configured database is disposable and its name ends in `_test`;
never point `DB_TEST_NAME` at development or production data. MySQL credentials
and host/port continue to come from `DB_USER`, `DB_PASSWORD`, `DB_HOST`, and
`DB_PORT`:

```powershell
$env:DB_TEST_NAME = "fantasy_test"
npm --prefix .\server test
```
