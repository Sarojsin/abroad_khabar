// Role-based Permissions System
import auth from './auth.js';

class PermissionService {
    constructor() {
        this.permissions = new Map();
        this.roles = new Map();
        this.init();
    }

    init() {
        // Define default roles and permissions
        this.defineRoles();
        this.definePermissions();
        
        // Subscribe to auth changes
        auth.subscribe(({ isAuthenticated, user }) => {
            if (isAuthenticated) {
                this.loadUserPermissions(user);
            } else {
                this.clearUserPermissions();
            }
        });
    }

    defineRoles() {
        // Admin - Full access
        this.roles.set('admin', [
            'view_dashboard',
            'manage_users',
            'manage_roles',
            'manage_content',
            'manage_media',
            'manage_ads',
            'manage_settings',
            'view_analytics',
            'export_data',
            'manage_api_keys'
        ]);

        // Editor - Content management
        this.roles.set('editor', [
            'view_dashboard',
            'manage_content',
            'manage_media',
            'view_analytics'
        ]);

        // Moderator - Moderate content
        this.roles.set('moderator', [
            'view_dashboard',
            'moderate_content',
            'manage_comments',
            'view_analytics'
        ]);

        // Staff - Limited access
        this.roles.set('staff', [
            'view_dashboard',
            'view_content',
            'upload_media'
        ]);

        // User - Basic access
        this.roles.set('user', [
            'view_content',
            'comment',
            'like',
            'save_content'
        ]);

        // Guest - Minimal access
        this.roles.set('guest', [
            'view_public_content'
        ]);
    }

    definePermissions() {
        // Content permissions
        this.permissions.set('view_content', ['user', 'staff', 'editor', 'admin', 'moderator']);
        this.permissions.set('create_content', ['editor', 'admin']);
        this.permissions.set('edit_content', ['editor', 'admin']);
        this.permissions.set('delete_content', ['editor', 'admin']);
        this.permissions.set('publish_content', ['editor', 'admin']);
        
        // Media permissions
        this.permissions.set('upload_media', ['staff', 'editor', 'admin']);
        this.permissions.set('manage_media', ['editor', 'admin']);
        this.permissions.set('delete_media', ['editor', 'admin']);
        
        // User management
        this.permissions.set('view_users', ['admin', 'moderator']);
        this.permissions.set('manage_users', ['admin']);
        this.permissions.set('manage_roles', ['admin']);
        
        // Analytics
        this.permissions.set('view_analytics', ['editor', 'admin', 'moderator']);
        this.permissions.set('export_analytics', ['admin']);
        
        // Settings
        this.permissions.set('manage_settings', ['admin']);
        this.permissions.set('manage_ads', ['admin']);
        this.permissions.set('manage_api_keys', ['admin']);
        
        // Comments
        this.permissions.set('comment', ['user', 'staff', 'editor', 'admin', 'moderator']);
        this.permissions.set('moderate_comments', ['moderator', 'admin']);
        this.permissions.set('delete_comments', ['moderator', 'admin']);
    }

    loadUserPermissions(user) {
        // Get user roles
        const userRoles = user.roles || [user.role || 'user'];
        
        // Calculate effective permissions
        const effectivePermissions = new Set();
        
        userRoles.forEach(role => {
            const rolePermissions = this.roles.get(role) || [];
            rolePermissions.forEach(permission => {
                effectivePermissions.add(permission);
            });
        });
        
        // Store user permissions
        this.userPermissions = Array.from(effectivePermissions);
        this.userRoles = userRoles;
        
        // Dispatch permissions loaded event
        this.dispatchPermissionsLoaded();
    }

    clearUserPermissions() {
        this.userPermissions = [];
        this.userRoles = [];
        this.dispatchPermissionsLoaded();
    }

    hasPermission(permission) {
        // If no user is logged in, check guest permissions
        if (!auth.isAuthenticated) {
            return this.checkPermission(permission, 'guest');
        }
        
        // Check if user has explicit permission
        if (this.userPermissions && this.userPermissions.includes(permission)) {
            return true;
        }
        
        // Check role hierarchy
        return this.userRoles.some(role => 
            this.checkPermission(permission, role)
        );
    }

    checkPermission(permission, role) {
        const allowedRoles = this.permissions.get(permission);
        if (!allowedRoles) return false;
        
        return allowedRoles.includes(role);
    }

    hasAnyPermission(permissions) {
        return permissions.some(permission => this.hasPermission(permission));
    }

    hasAllPermissions(permissions) {
        return permissions.every(permission => this.hasPermission(permission));
    }

    can(permission) {
        return this.hasPermission(permission);
    }

    // Check if user can perform action on resource
    canPerform(action, resource, resourceOwnerId = null) {
        // Check basic permission
        const permission = `${action}_${resource}`;
        if (!this.hasPermission(permission)) {
            return false;
        }
        
        // If resource owner ID is provided, check ownership
        if (resourceOwnerId && auth.currentUser) {
            // Admin and editors can manage all resources
            if (this.hasAnyRole(['admin', 'editor'])) {
                return true;
            }
            
            // Users can only manage their own resources
            return auth.currentUser.id === resourceOwnerId;
        }
        
        return true;
    }

    hasAnyRole(roles) {
        if (!auth.isAuthenticated) return false;
        return roles.some(role => this.userRoles.includes(role));
    }

    hasAllRoles(roles) {
        if (!auth.isAuthenticated) return false;
        return roles.every(role => this.userRoles.includes(role));
    }

    getUserRoles() {
        return this.userRoles || [];
    }

    getUserPermissions() {
        return this.userPermissions || [];
    }

    // UI Helper: Show/hide elements based on permissions
    applyElementPermissions() {
        document.querySelectorAll('[data-permission]').forEach(element => {
            const permission = element.getAttribute('data-permission');
            if (!this.hasPermission(permission)) {
                element.style.display = 'none';
            } else {
                element.style.display = '';
            }
        });
        
        document.querySelectorAll('[data-role]').forEach(element => {
            const requiredRole = element.getAttribute('data-role');
            if (!this.hasAnyRole([requiredRole])) {
                element.style.display = 'none';
            } else {
                element.style.display = '';
            }
        });
        
        document.querySelectorAll('[data-any-permission]').forEach(element => {
            const permissions = element.getAttribute('data-any-permission').split(',');
            if (!this.hasAnyPermission(permissions)) {
                element.style.display = 'none';
            } else {
                element.style.display = '';
            }
        });
        
        document.querySelectorAll('[data-all-permissions]').forEach(element => {
            const permissions = element.getAttribute('data-all-permissions').split(',');
            if (!this.hasAllPermissions(permissions)) {
                element.style.display = 'none';
            } else {
                element.style.display = '';
            }
        });
    }

    // Guard route navigation
    guardRoute(route) {
        if (route.requiresAuth && !auth.isAuthenticated) {
            return { allowed: false, redirect: '/login' };
        }
        
        if (route.requiredRoles && route.requiredRoles.length > 0) {
            if (!this.hasAnyRole(route.requiredRoles)) {
                return { allowed: false, redirect: '/403' };
            }
        }
        
        if (route.requiredPermissions && route.requiredPermissions.length > 0) {
            if (!this.hasAllPermissions(route.requiredPermissions)) {
                return { allowed: false, redirect: '/403' };
            }
        }
        
        return { allowed: true };
    }

    // Add custom permission
    addPermission(permission, allowedRoles) {
        this.permissions.set(permission, allowedRoles);
    }

    // Add custom role
    addRole(role, permissions) {
        this.roles.set(role, permissions);
    }

    // Check if permission exists
    permissionExists(permission) {
        return this.permissions.has(permission);
    }

    // Check if role exists
    roleExists(role) {
        return this.roles.has(role);
    }

    // Get all permissions
    getAllPermissions() {
        return Array.from(this.permissions.keys());
    }

    // Get all roles
    getAllRoles() {
        return Array.from(this.roles.keys());
    }

    // Get role permissions
    getRolePermissions(role) {
        return this.roles.get(role) || [];
    }

    // Get permission roles
    getPermissionRoles(permission) {
        return this.permissions.get(permission) || [];
    }

    dispatchPermissionsLoaded() {
        const event = new CustomEvent('permissionsloaded', {
            detail: {
                roles: this.userRoles,
                permissions: this.userPermissions
            }
        });
        window.dispatchEvent(event);
    }

    // Initialize on page load
    static async init() {
        const instance = new PermissionService();
        
        // Wait for auth to be ready
        if (!auth.isAuthenticated) {
            await new Promise(resolve => {
                const unsubscribe = auth.subscribe(({ isAuthenticated }) => {
                    if (isAuthenticated !== undefined) {
                        unsubscribe();
                        resolve();
                    }
                });
            });
        }
        
        // Apply element permissions
        instance.applyElementPermissions();
        
        // Re-apply on permissions changes
        window.addEventListener('permissionsloaded', () => {
            instance.applyElementPermissions();
        });
        
        return instance;
    }
}

// Create singleton instance
const permissions = await PermissionService.init();

// Export for module usage
export default permissions;

// Export helper methods
export const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    can,
    canPerform,
    hasAnyRole,
    hasAllRoles,
    getUserRoles,
    getUserPermissions,
    addPermission,
    addRole,
    permissionExists,
    roleExists,
    getAllPermissions,
    getAllRoles,
    getRolePermissions,
    getPermissionRoles
} = permissions;
