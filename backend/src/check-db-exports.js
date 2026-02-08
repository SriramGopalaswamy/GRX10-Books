import { sequelize } from './config/database.js'; // Adjust import based on export
// Employee is not exported directly in database.js, but models are attached to sequelize.models?
// Wait, looking at database.js again:
// 159: const sequelize = getDatabaseConfig();
// ...
// 250: const Employee = sequelize.define('Employee', ...);
// ...
// 837: export { sequelize, Employee, ... }; (I need to check the exports)

// Let me check the exports in database.js again first.
