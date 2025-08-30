import crypto from 'crypto';

/**
 * Simple Port Security Configuration
 * Provides secure port validation and prevents unauthorized port changes
 */

// Allowed ports configuration - only these ports can be used
const ALLOWED_PORTS = {
  development: [3000, 3003, 8000, 8080],
  production: [3000, 3003, 8000],
  test: [3001, 8001]
};

// Port security hash - validates that ports haven't been tampered with
const PORT_SECURITY_HASH = 'buzz-platform-port-security-2024';

/**
 * Validates if a port is allowed for the current environment
 */
export function validatePort(port: number, environment: string = 'development'): boolean {
  const allowedPorts = ALLOWED_PORTS[environment as keyof typeof ALLOWED_PORTS];
  if (!allowedPorts) {
    throw new Error(`Invalid environment: ${environment}`);
  }
  
  return allowedPorts.includes(port);
}

/**
 * Gets the default secure port for the environment
 */
export function getSecurePort(environment: string = 'development'): number {
  const allowedPorts = ALLOWED_PORTS[environment as keyof typeof ALLOWED_PORTS];
  if (!allowedPorts || allowedPorts.length === 0) {
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
 * Secure port configuration with validation
 */
export function getSecurePortConfig(requestedPort?: string | number, environment: string = 'development') {
  console.log(`🔍 Debug - Requested port: ${requestedPort}, Environment: ${environment}`);
  let port: number;
  
  if (requestedPort) {
    port = typeof requestedPort === 'string' ? parseInt(requestedPort) : requestedPort;
    console.log(`🔍 Debug - Parsed port: ${port}`);
    
    // Validate that the requested port is allowed
    const isValid = validatePort(port, environment);
    console.log(`🔍 Debug - Port ${port} validation result: ${isValid}`);
    
    if (!isValid) {
      console.warn(`⚠️  Unauthorized port ${port} requested for environment ${environment}`);
      console.warn(`⚠️  Using secure default port instead`);
      port = getSecurePort(environment);
    }
  } else {
    console.log(`🔍 Debug - No port specified, using default`);
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
 * Simple port security initialization (no tampering prevention)
 */
export function initPortSecurity() {
  console.log('🔒 Port security initialized - only allowed ports can be used');
}

export default {
  validatePort,
  getSecurePort,
  getSecurePortConfig,
  initPortSecurity,
  ALLOWED_PORTS
};