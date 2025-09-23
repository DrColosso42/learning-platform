import { PasswordUtils } from '../utils/passwordUtils.js';
import { JwtUtils } from '../utils/jwtUtils.js';

/**
 * Simple test to verify authentication utilities work correctly
 * Tests password hashing and JWT token generation/verification
 */
async function testAuthentication(): Promise<void> {
  console.log('🧪 Testing Authentication System...\n');

  try {
    // Test password hashing
    const password = 'TestPassword123';
    console.log('1. Testing password hashing...');

    const hash = await PasswordUtils.hashPassword(password);
    console.log(`   ✅ Password hashed: ${hash.substring(0, 20)}...`);

    const isValid = await PasswordUtils.verifyPassword(password, hash);
    console.log(`   ✅ Password verification: ${isValid ? 'PASSED' : 'FAILED'}`);

    const isInvalid = await PasswordUtils.verifyPassword('WrongPassword', hash);
    console.log(`   ✅ Wrong password rejected: ${!isInvalid ? 'PASSED' : 'FAILED'}`);

    // Test JWT tokens
    console.log('\n2. Testing JWT tokens...');

    const payload = { userId: 1, email: 'test@example.com' };
    const token = JwtUtils.generateToken(payload);
    console.log(`   ✅ Token generated: ${token.substring(0, 30)}...`);

    const decoded = JwtUtils.verifyToken(token);
    console.log(`   ✅ Token verified: userId=${decoded.userId}, email=${decoded.email}`);

    console.log('\n🎉 All authentication tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAuthentication();