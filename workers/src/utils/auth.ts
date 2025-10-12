// Authentication utilities for Cloudflare Workers

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  permissions: string[];
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

/**
 * Extract and validate JWT token from request headers
 */
export function extractToken(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Validate JWT token and return user information
 */
export async function validateToken(
  token: string,
  jwtSecret: string
): Promise<AuthResult> {
  try {
    // In a real implementation, you would validate the JWT token here
    // For now, we'll return a mock validation

    // TODO: Implement actual JWT validation
    // const decoded = jwt.verify(token, jwtSecret);

    // Mock validation for development
    if (token === "valid-token") {
      return {
        success: true,
        user: {
          id: "user-123",
          email: "user@example.com",
          role: "user",
          permissions: ["generate:video", "generate:audio"],
        },
      };
    }

    return {
      success: false,
      error: "Invalid token",
    };
  } catch (error) {
    return {
      success: false,
      error: "Token validation failed",
    };
  }
}

/**
 * Check if user has required permission
 */
export function hasPermission(user: AuthUser, permission: string): boolean {
  return user.permissions.includes(permission) || user.role === "admin";
}

/**
 * Middleware for authentication
 */
export async function authenticateRequest(
  request: Request,
  jwtSecret: string
): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  const token = extractToken(request);

  if (!token) {
    return {
      success: false,
      error: "No authentication token provided",
    };
  }

  const authResult = await validateToken(token, jwtSecret);
  return authResult;
}

/**
 * Create CORS headers for preflight requests
 */
export function createCorsHeaders(origin?: string): HeadersInit {
  const headers: HeadersInit = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };

  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
  } else {
    headers["Access-Control-Allow-Origin"] = "*";
  }

  return headers;
}

/**
 * Handle CORS preflight requests
 */
export function handleCors(request: Request): Response | null {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: createCorsHeaders(request.headers.get("Origin") || undefined),
    });
  }
  return null;
}
