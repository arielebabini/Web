// tests/helpers/TestDataSeeder.js

const { query } = require('../../src/config/database');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const logger = require('../../src/utils/logger');

class TestDataSeeder {

    static testUsers = {};
    static testSpaces = {};
    static testBookings = {};

    static async cleanTestData() {
        try {
            await query('DELETE FROM bookings WHERE TRUE');
            await query('DELETE FROM payments WHERE TRUE');
            await query('DELETE FROM reviews WHERE TRUE');
            await query('DELETE FROM notifications WHERE TRUE');
            await query('DELETE FROM audit_logs WHERE TRUE');
            await query('DELETE FROM space_availability WHERE TRUE');
            await query('DELETE FROM spaces WHERE TRUE');
            await query("DELETE FROM users WHERE email LIKE '%@test.com'");
            this.testUsers = {};
            this.testSpaces = {};
            this.testBookings = {};
            logger.debug('Test data cleaned by Seeder');
        } catch (error) {
            logger.error('Error cleaning test data in Seeder:', error);
            throw error;
        }
    }

    static async seedTestUsers() {
        try {
            const hashedPassword = await bcrypt.hash('testPassword123', 10);
            const users = [
                { id: uuidv4(), email: 'admin@test.com', role: 'admin', firstName: 'Test', lastName: 'Admin' },
                { id: uuidv4(), email: 'manager@test.com', role: 'manager', firstName: 'Test', lastName: 'Manager' },
                { id: uuidv4(), email: 'client@test.com', role: 'client', firstName: 'Test', lastName: 'Client' }
            ];

            for (const user of users) {
                await query(`
                    INSERT INTO users (id, email, password_hash, first_name, last_name, role, status, email_verified, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, 'active', true, NOW(), NOW())
                        ON CONFLICT (email) DO UPDATE SET id = EXCLUDED.id, password_hash = EXCLUDED.password_hash
                `, [user.id, user.email, hashedPassword, user.firstName, user.lastName, user.role]);
                this.testUsers[user.role] = { id: user.id, email: user.email, role: user.role };
            }
            logger.debug('Test users seeded', this.testUsers);
            return this.testUsers;
        } catch (error) {
            logger.error('Error seeding test users:', error);
            throw error;
        }
    }

    // ✨ MIGLIORAMENTO: Aggiunti parametri per rendere la funzione riutilizzabile e prevenire errori.
    static async seedTestSpaces({ name = 'Test Coworking Space', city = 'Milano', price = 25.50, key = 'default' } = {}) {
        try {
            if (!this.testUsers.manager) throw new Error('Manager user not found. Seed users first.');
            const spaceId = uuidv4();
            await query(`
                INSERT INTO spaces (id, name, description, type, city, address, capacity, price_per_day, manager_id, amenities, images, is_active, is_featured, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
            `, [
                spaceId, name, 'A great space for testing', 'hot-desk', city,
                `Via Test 123, ${city}`, 10, price, this.testUsers.manager.id, JSON.stringify(['wifi', 'coffee']),
                JSON.stringify([]), true, false
            ]);

            // Salva lo spazio con una chiave per poterlo recuperare nei test
            this.testSpaces[key] = { id: spaceId, name, manager_id: this.testUsers.manager.id };
            logger.debug(`Test space '${key}' seeded`, this.testSpaces[key]);
            return this.testSpaces;
        } catch (error) {
            logger.error('Error seeding test spaces:', error);
            throw error;
        }
    }


    static async seedAll() {
        try {
            await this.cleanTestData();
            await this.seedTestUsers();
            await this.seedTestSpaces({ key: 'testSpace' }); // Crea lo spazio di default
            return { users: this.testUsers, spaces: this.testSpaces, bookings: this.testBookings };
        } catch (error) {
            logger.error('Error seeding all test data:', error);
            throw error;
        }
    }

    static generateTestToken(userType = 'client') {
        const jwt = require('jsonwebtoken');
        if (!this.testUsers[userType]) {
            console.error(`Attempting to generate a token for a non-existent user type: ${userType}`);
            throw new Error(`Test user type '${userType}' not found. Available: ${Object.keys(this.testUsers).join(', ')}`);
        }
        const user = this.testUsers[userType];
        return jwt.sign({ id: user.id, email: user.email, role: user.role, status: 'active' }, process.env.JWT_SECRET || 'test-jwt-secret', { expiresIn: '1h' });
    }

    static async verifyTestData() {
        try {
            const usersCountResult = await query("SELECT COUNT(*) as count FROM users WHERE email LIKE '%@test.com'");
            const spacesCountResult = await query("SELECT COUNT(*) as count FROM spaces");
            return {
                hasUsers: parseInt(usersCountResult.rows[0].count) > 0,
                hasSpaces: parseInt(spacesCountResult.rows[0].count) > 0
            };
        } catch (error) {
            logger.error('Error verifying test data:', error);
            return { hasUsers: false, hasSpaces: false };
        }
    }
}

module.exports = TestDataSeeder;