/**
 * Authentication service.
 * Handles login/logout and session persistence via sessionStorage.
 */

import { apiGet } from './api';
import { User } from '../types';

const USER_KEY = 'ams_current_user';

export interface AuthUser {
    id: string;
    name: string;
    role: 'ADMIN' | 'FACULTY' | 'STUDENT';
    email: string;
    usn: string;
    semester: string;
    section: string;
    department: string;
    avatarInitials: string;
}

export async function login(userId: string, password: string): Promise<AuthUser> {
    const result = await apiGet('login', { userId, password });

    if (!result.success) {
        throw new Error(result.error || 'Login failed');
    }

    const user = result.user as AuthUser;
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
}

export function logout(): void {
    sessionStorage.removeItem(USER_KEY);
}

export function getCurrentUser(): AuthUser | null {
    const stored = sessionStorage.getItem(USER_KEY);
    if (!stored) return null;
    try {
        return JSON.parse(stored) as AuthUser;
    } catch {
        return null;
    }
}

export function toAppUser(authUser: AuthUser): User {
    return {
        id: authUser.id,
        name: authUser.name,
        role: authUser.role,
        email: authUser.email,
        avatarInitials: authUser.avatarInitials,
    };
}
