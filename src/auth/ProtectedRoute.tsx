// src/auth/ProtectedRoute.tsx
// Role-based route guard. Redirects unauthenticated + wrong-role users.

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, UserRole } from "../context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: UserRole[];
  redirectTo?: string;
}

const ROLE_HOME: Record<string, string> = {
  superAdmin: "/admin-dashboard",
  admin: "/admin-dashboard",
  barber: "/barber-dashboard",
  customer: "/",
};

export default function ProtectedRoute({
  children,
  roles,
  redirectTo = "/auth",
}: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="auth-spinner" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (roles && role && !roles.includes(role)) {
    return <Navigate to={ROLE_HOME[role] ?? "/"} replace />;
  }

  return <>{children}</>;
}
