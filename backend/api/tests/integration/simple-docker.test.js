const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

describe('Docker Database Integration Test', () => {
    
    test('should connect to test database via docker', async () => {
        const result = await execAsync('docker-compose exec -T db psql -U coworkspace_user -d coworkspace_test -c "SELECT 1 as test;"');
        expect(result.stdout).toContain('1');
    });

    test('should have required tables', async () => {
        const result = await execAsync('docker-compose exec -T db psql -U coworkspace_user -d coworkspace_test -c "SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\';"');
        expect(result.stdout).toContain('users');
        expect(result.stdout).toContain('spaces');
        expect(result.stdout).toContain('bookings');
    });
});
