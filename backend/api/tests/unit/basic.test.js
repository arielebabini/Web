// api/tests/unit/basic.test.js
beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    console.error.mockRestore();
});

describe('Basic Jest Setup', () => {
    test('should be able to run tests', () => {
        expect(1 + 1).toBe(2);
    });

    test('should have access to Jest globals', () => {
        expect(jest).toBeDefined();
        expect(describe).toBeDefined();
        expect(test).toBeDefined();
        expect(expect).toBeDefined();
    });
});