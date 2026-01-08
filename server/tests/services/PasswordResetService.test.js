"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const PasswordResetService_1 = require("../../src/services/PasswordResetService");
const DatabaseFactory_1 = require("../../src/infrastructure/database/DatabaseFactory");
const EmailService_1 = require("../../src/services/EmailService");
const bcrypt_1 = __importDefault(require("bcrypt"));
jest.mock('../../src/services/EmailService', () => ({
    emailService: {
        generateVerificationCode: jest.fn().mockResolvedValue('123456'),
        sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
        validateCode: jest.fn(),
        verifyCode: jest.fn(),
    }
}));
describe('PasswordResetService', () => {
    let passwordResetService;
    let db;
    beforeAll(() => {
        db = DatabaseFactory_1.DatabaseFactory.getPrimaryDatabase();
        passwordResetService = new PasswordResetService_1.PasswordResetService();
    });
    beforeEach(async () => {
        // Clean up users table
        await db.delete('users', {});
        // Create test user
        const passwordHash = await bcrypt_1.default.hash('OldPassword123!', 12);
        await db.insert('users', {
            id: 'test-user-id',
            company_id: 'test-company-id',
            email: 'test@example.com',
            password_hash: passwordHash,
            first_name: 'John',
            last_name: 'Doe',
            role: 'admin',
            is_active: true
        });
    });
    describe('sendResetCode', () => {
        it('should send a reset code for an existing user', async () => {
            const result = await passwordResetService.sendResetCode('test@example.com');
            expect(result).toBe(true);
            expect(EmailService_1.emailService.generateVerificationCode).toHaveBeenCalledWith('test@example.com');
            expect(EmailService_1.emailService.sendPasswordResetEmail).toHaveBeenCalledWith('test@example.com', 'John', '123456');
        });
        it('should return true even if user does not exist (security)', async () => {
            const result = await passwordResetService.sendResetCode('nonexistent@example.com');
            expect(result).toBe(true);
            expect(EmailService_1.emailService.generateVerificationCode).not.toHaveBeenCalledWith('nonexistent@example.com');
        });
    });
    describe('verifyResetCode', () => {
        it('should call emailService.validateCode', async () => {
            EmailService_1.emailService.validateCode.mockResolvedValue(true);
            const result = await passwordResetService.verifyResetCode('test@example.com', '123456');
            expect(result).toBe(true);
            expect(EmailService_1.emailService.validateCode).toHaveBeenCalledWith('test@example.com', '123456');
        });
    });
    describe('resetPassword', () => {
        it('should successfully reset password with valid code', async () => {
            EmailService_1.emailService.verifyCode.mockResolvedValue(true);
            const newPassword = 'NewSecurePass123!';
            const result = await passwordResetService.resetPassword('test@example.com', '123456', newPassword);
            expect(result).toBe(true);
            // Verify password was updated in DB
            const user = await db.findOne('users', { email: 'test@example.com' });
            const passwordMatch = await bcrypt_1.default.compare(newPassword, user.password_hash);
            expect(passwordMatch).toBe(true);
        });
        it('should throw error for invalid code', async () => {
            EmailService_1.emailService.verifyCode.mockResolvedValue(false);
            await expect(passwordResetService.resetPassword('test@example.com', 'invalid', 'newPass')).rejects.toThrow('Invalid or expired reset code');
        });
        it('should throw error if user not found during update', async () => {
            EmailService_1.emailService.verifyCode.mockResolvedValue(true);
            await expect(passwordResetService.resetPassword('wrong@example.com', '123456', 'newPass')).rejects.toThrow('Failed to reset password');
        });
    });
});
//# sourceMappingURL=PasswordResetService.test.js.map