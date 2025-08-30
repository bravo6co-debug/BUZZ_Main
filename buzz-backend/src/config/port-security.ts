import crypto from 'crypto';

/**
 * Port Security Configuration
 * Provides secure port validation and prevents unauthorized port changes
 */

// Allowed ports configuration - only these ports can be used
const ALLOWED_PORTS = {
  development: [3000, 3003, 8000, 8080],
  production: [3000, 3003, 8000],
  test: [3001, 8001]
} as const;

// Port security hash - validates that ports haven't been tampered with
const PORT_SECURITY_HASH = 'buzz-platform-port-security-2024';

/**
 * Validates if a port is allowed for the current environment
 */
export function validatePort(port: number, environment: string = 'development'): boolean {
  const allowedPorts = ALLOWED_PORTS[environment as keyof typeof ALLOWED_PORTS];
  console.log(`🔍 Debug - Validating port ${port} for environment ${environment}`);
  console.log(`🔍 Debug - Allowed ports:`, allowedPorts);
  
  if (!allowedPorts) {
    throw new Error(`Invalid environment: ${environment}`);
  }
  
  const isValid = (allowedPorts as readonly number[]).includes(port);
  console.log(`🔍 Debug - Port ${port} validation result:`, isValid);
  
  return isValid;
}

/**
 * Gets the default secure port for the environment
 */
export function getSecurePort(environment: string = 'development'): number {
  const allowedPorts = ALLOWED_PORTS[environment as keyof typeof ALLOWED_PORTS];
  if (!allowedPorts) {
    throw new Error(`No allowed ports for environment: ${environment}`);
  }
  
  return allowedPorts[0];
}

/**
 * Creates a security hash for port validation
 */
export function createPortSecurityHash(port: number, timestamp: number): string {
  return crypto
    .createHash('sha256')
    .update(`${PORT_SECURITY_HASH}-${port}-${timestamp}`)
    .digest('hex');
}

/**
 * Validates port security hash
 */
export function validatePortSecurityHash(port: number, timestamp: number, hash: string): boolean {
  const expectedHash = createPortSecurityHash(port, timestamp);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash));
}

/**
 * Secure port configuration with validation
 */
export function getSecurePortConfig(requestedPort?: string | number, environment: string = 'development') {
  let port: number;
  
  if (requestedPort) {
    port = typeof requestedPort === 'string' ? parseInt(requestedPort) : requestedPort;
    
    // Validate that the requested port is allowed
    if (!validatePort(port, environment)) {
      console.warn(`⚠️  Unauthorized port ${port} requested for environment ${environment}`);
      console.warn(`⚠️  Using secure default port instead`);
      port = getSecurePort(environment);
    }
  } else {
    port = getSecurePort(environment);
  }
  
  // Create security timestamp and hash
  const timestamp = Date.now();
  const securityHash = createPortSecurityHash(port, timestamp);
  
  return {
    port,
    timestamp,
    securityHash,
    isSecure: true,
    allowedPorts: ALLOWED_PORTS[environment as keyof typeof ALLOWED_PORTS],
  };
}

/**
 * Middleware to prevent port tampering at runtime
 */
export function preventPortTampering() {
  // Monitor PORT changes (Note: Cannot freeze process.env.PORT due to Node.js limitations)
  if (process.env.PORT) {
    // Store original port for validation
    const originalPort = process.env.PORT;
    console.log(`🔒 Port security initialized for port: ${originalPort}`);
  }
  
  // Monitor for unauthorized port access attempts
  const originalListen = require('http').Server.prototype.listen;
  require('http').Server.prototype.listen = function(port: any, ...args: any[]) {
    if (typeof port === 'number') {
      const environment = process.env.NODE_ENV || 'development';
      if (!validatePort(port, environment)) {
        const securePort = getSecurePort(environment);
        console.error(`🚫 Unauthorized port ${port} blocked! Using secure port ${securePort}`);
        port = securePort;
      }
    }
    return originalListen.call(this, port, ...args);
  };
}

export default {
  validatePort,
  getSecurePort,
  getSecurePortConfig,
  preventPortTampering,
  ALLOWED_PORTS
};