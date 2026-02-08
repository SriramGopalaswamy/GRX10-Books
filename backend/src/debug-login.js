import { sequelize, Employee } from './config/database.js';
import bcrypt from 'bcrypt';

async function testLogin() {
    try {
        console.log('Testing database connection...');
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        const email = 'admin@grx10.com';
        console.log(`Looking for user: ${email}`);

        const employee = await Employee.findOne({
            where: { email: email }
        });

        if (employee) {
            console.log('User found:', employee.toJSON());
            if (employee.password) {
                console.log('Password hash present in DB.');
                const match = await bcrypt.compare('admin123', employee.password);
                console.log('Password match with "admin123":', match);
            } else {
                console.log('No password set for user.');
            }
        } else {
            console.log('User not found in database.');
        }

    } catch (error) {
        console.error('Unable to connect to the database:', error);
    } finally {
        await sequelize.close();
    }
}

testLogin();
