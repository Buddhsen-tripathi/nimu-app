/**
 * Authentication Utilities
 *
 * Provides authentication and authorization functionality for the Cloudflare Worker.
 */

export interface AuthResult {
  success: boolean;
  userId?: string;
  error?: string;
}

export interface UserInfo {
  id: string;
  email?: string;
  name?: string;
  role?: string;
}

/**
 * Authenticate user from request
 */
export async function authenticateUser(
  request: Request,
  _env: any
): Promise<AuthResult> {
  try {
    // Get authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return { success: false, error: "No authorization token provided" };
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // In a real implementation, you would validate the JWT token here
    // For now, we'll do a simple validation
    if (!token || token.length < 10) {
      return { success: false, error: "Invalid token format" };
    }

    // For development/testing, extract user ID from token
    // In production, you'd decode and validate the JWT
    const userId = extractUserIdFromToken(token);
    if (!userId) {
      return { success: false, error: "Invalid token" };
    }

    return { success: true, userId };
  } catch (error) {
    console.error("Authentication error:", error);
    return { success: false, error: "Authentication failed" };
  }
}

/**
 * Extract user ID from token (simplified implementation)
 */
function extractUserIdFromToken(token: string): string | null {
  try {
    // This is a simplified implementation for development
    // In production, you would decode the JWT and validate it
    if (token.startsWith("dev_")) {
      return token.substring(4); // Remove 'dev_' prefix
    }

    // For testing, you can also accept simple user IDs
    if (token.match(/^user_\d+$/)) {
      return token;
    }

    return null;
  } catch (error) {
    console.error("Token extraction error:", error);
    return null;
  }
}

/**
 * Get user info from token
 */
export async function getUserInfo(
  token: string,
  _env: any
): Promise<UserInfo | null> {
  try {
    const userId = extractUserIdFromToken(token);
    if (!userId) {
      return null;
    }

    // In a real implementation, you would fetch user info from a database
    // For now, return basic user info
    return {
      id: userId,
      email: `${userId}@example.com`,
      name: `User ${userId}`,
      role: "user",
    };
  } catch (error) {
    console.error("Get user info error:", error);
    return null;
  }
}

/**
 * Validate user permissions
 */
export function validatePermissions(
  user: UserInfo,
  requiredRole: string
): boolean {
  if (!user || !user.role) {
    return false;
  }

  const roleHierarchy = {
    admin: 3,
    moderator: 2,
    user: 1,
  };

  const userLevel = roleHierarchy[user.role as keyof typeof roleHierarchy] || 0;
  const requiredLevel =
    roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

  return userLevel >= requiredLevel;
}

/**
 * Check if user can access resource
 */
export function canAccessResource(
  user: UserInfo,
  resourceOwnerId: string
): boolean {
  // Admin can access everything
  if (user.role === "admin") {
    return true;
  }

  // User can access their own resources
  return user.id === resourceOwnerId;
}

/**
 * Generate development token (for testing)
 */
export function generateDevToken(userId: string): string {
  return `dev_${userId}`;
}

/**
 * Validate request structure
 */
export function validateRequest(request: Request): {
  valid: boolean;
  error?: string;
} {
  try {
    // Check if request has required headers
    if (!request.headers.get("Content-Type") && request.method !== "GET") {
      return { valid: false, error: "Content-Type header is required" };
    }

    // Check request size (basic validation)
    const contentLength = request.headers.get("Content-Length");
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
      // 10MB limit
      return { valid: false, error: "Request too large" };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: "Request validation failed" };
  }
}
