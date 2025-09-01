const bcrypt = require('bcryptjs');

class PasswordUtils {
  /**
   * Hash password with salt
   * @param {String} password - Plain text password
   * @param {Number} saltRounds - Number of salt rounds (default: 12)
   * @returns {String} Hashed password
   */
  static async hashPassword(password, saltRounds = 12) {
    try {
      const salt = await bcrypt.genSalt(saltRounds);
      return await bcrypt.hash(password, salt);
    } catch (error) {
      throw new Error('Error hashing password');
    }
  }

  /**
   * Compare password with hash
   * @param {String} password - Plain text password
   * @param {String} hash - Hashed password
   * @returns {Boolean} Match result
   */
  static async comparePassword(password, hash) {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      throw new Error('Error comparing password');
    }
  }

  /**
   * Validate password strength
   * @param {String} password - Password to validate
   * @returns {Object} Validation result
   */
  static validatePasswordStrength(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const errors = [];

    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters long`);
    }

    if (!hasUpperCase) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!hasLowerCase) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!hasNumbers) {
      errors.push('Password must contain at least one number');
    }

    if (!hasSpecialChar) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors,
      strength: this.calculatePasswordStrength(password)
    };
  }

  /**
   * Calculate password strength score
   * @param {String} password - Password to evaluate
   * @returns {String} Strength level
   */
  static calculatePasswordStrength(password) {
    let score = 0;

    // Length bonus
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;

    // Character variety bonus
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    // Complexity bonus
    if (password.length >= 10 && /(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])/.test(password)) {
      score += 1;
    }

    if (score < 3) return 'weak';
    if (score < 5) return 'medium';
    if (score < 7) return 'strong';
    return 'very-strong';
  }
}

module.exports = PasswordUtils;