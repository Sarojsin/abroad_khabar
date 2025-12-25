// API Service - Fetch wrapper with error handling and authentication
class ApiService {
    constructor() {
        this.baseURL = 'http://localhost:8002/api/v1';
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        this.init();
    }

    init() {
        // Check for stored auth token
        const token = localStorage.getItem('auth_token');
        if (token) {
            this.setAuthToken(token);
        }
    }

    setAuthToken(token) {
        localStorage.setItem('auth_token', token);
        this.defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    removeAuthToken() {
        localStorage.removeItem('auth_token');
        delete this.defaultHeaders['Authorization'];
    }

    getAuthToken() {
        return localStorage.getItem('auth_token');
    }

    async request(endpoint, options = {}) {
        const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;

        const headers = {
            ...this.defaultHeaders,
            ...options.headers
        };

        // Debug logging
        if (endpoint.includes('/auth/me')) {
            console.log('[API] Request to /auth/me');
            console.log('[API] Headers:', headers);
            console.log('[API] Auth header:', headers['Authorization'] || 'MISSING');
        }

        const config = {
            ...options,
            headers,
            credentials: 'include'
        };

        try {
            const response = await fetch(url, config);

            // Handle 401 Unauthorized
            if (response.status === 401) {
                this.handleUnauthorized();
                throw new Error('Authentication required');
            }

            // Handle 403 Forbidden
            if (response.status === 403) {
                throw new Error('Access forbidden');
            }

            // Handle 404 Not Found
            if (response.status === 404) {
                throw new Error('Resource not found');
            }

            // Handle 500 Server Error
            if (response.status >= 500) {
                throw new Error('Server error occurred');
            }

            // Parse response
            const contentType = response.headers.get('content-type');
            let data;

            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else if (contentType && contentType.includes('text/')) {
                data = await response.text();
            } else {
                data = await response.blob();
            }

            // Handle non-OK responses
            if (!response.ok) {
                const error = new Error(data.message || `Request failed with status ${response.status}`);
                error.status = response.status;
                error.data = data;
                throw error;
            }

            return data;

        } catch (error) {
            console.error('API Request failed:', error);

            // Only show user-friendly messages for network errors
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Network error. Please check your connection.');
            }

            throw error;
        }
    }

    handleUnauthorized() {
        this.removeAuthToken();

        // Redirect to login if not already there
        if (!window.location.pathname.includes('/login.html')) {
            window.location.href = '/login.html';
        }
    }

    // HTTP Methods
    async get(endpoint, params = {}, options = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.request(url, { ...options, method: 'GET' });
    }

    async post(endpoint, data = {}, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async put(endpoint, data = {}, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async patch(endpoint, data = {}, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    }

    async delete(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'DELETE' });
    }

    // File Upload
    async uploadFile(endpoint, file, fieldName = 'file', additionalData = {}) {
        const formData = new FormData();
        formData.append(fieldName, file);

        // Append additional data
        Object.entries(additionalData).forEach(([key, value]) => {
            formData.append(key, value);
        });

        return this.request(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': this.defaultHeaders['Authorization']
            },
            body: formData
        });
    }

    // Multiple File Upload
    async uploadFiles(endpoint, files, fieldName = 'files', additionalData = {}) {
        const formData = new FormData();

        // Append all files
        files.forEach(file => {
            formData.append(fieldName, file);
        });

        // Append additional data
        Object.entries(additionalData).forEach(([key, value]) => {
            formData.append(key, value);
        });

        return this.request(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': this.defaultHeaders['Authorization']
            },
            body: formData
        });
    }

    // Download File
    async downloadFile(endpoint, filename = 'download') {
        const response = await this.request(endpoint, {
            method: 'GET',
            headers: {
                'Accept': 'application/octet-stream'
            }
        });

        if (response instanceof Blob) {
            const url = window.URL.createObjectURL(response);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }
    }

    // Set request timeout
    async requestWithTimeout(endpoint, options = {}, timeout = 10000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await this.request(endpoint, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            throw error;
        }
    }

    // Retry failed requests
    async requestWithRetry(endpoint, options = {}, maxRetries = 3, retryDelay = 1000) {
        let lastError;

        for (let i = 0; i < maxRetries; i++) {
            try {
                return await this.request(endpoint, options);
            } catch (error) {
                lastError = error;

                // Don't retry on 4xx errors (except 429 - Too Many Requests)
                if (error.status && error.status >= 400 && error.status < 500 && error.status !== 429) {
                    break;
                }

                // Wait before retrying
                if (i < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, i)));
                }
            }
        }

        throw lastError;
    }

    // SSE (Server-Sent Events)
    createSSEConnection(endpoint, onMessage, onError) {
        const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;
        const eventSource = new EventSource(url);

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                onMessage(data);
            } catch (error) {
                console.error('Failed to parse SSE message:', error);
            }
        };

        eventSource.onerror = (error) => {
            console.error('SSE connection error:', error);
            if (onError) onError(error);
            eventSource.close();
        };

        return eventSource;
    }

    // WebSocket connection
    createWebSocketConnection(endpoint) {
        const wsUrl = endpoint.startsWith('ws') ? endpoint : `ws://${window.location.host}${endpoint}`;
        return new WebSocket(wsUrl);
    }

    // Cache control
    async getWithCache(endpoint, params = {}, options = {}, cacheKey = null, ttl = 300000) {
        const key = cacheKey || `${endpoint}?${new URLSearchParams(params).toString()}`;
        const now = Date.now();

        // Check cache
        const cached = localStorage.getItem(key);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (now - timestamp < ttl) {
                return data;
            }
        }

        // Fetch fresh data
        try {
            const data = await this.get(endpoint, params, options);

            // Cache the response
            localStorage.setItem(key, JSON.stringify({
                data,
                timestamp: now
            }));

            return data;
        } catch (error) {
            // Return cached data even if stale
            if (cached) {
                const { data } = JSON.parse(cached);
                return data;
            }
            throw error;
        }
    }

    // Clear cache
    clearCache(cacheKey = null) {
        if (cacheKey) {
            localStorage.removeItem(cacheKey);
        } else {
            // Clear all API cache entries
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('api_cache_')) {
                    localStorage.removeItem(key);
                }
            });
        }
    }
}

// Create singleton instance
const api = new ApiService();

// Export for module usage
export default api;

// Export individual methods for convenience
export const {
    get,
    post,
    put,
    patch,
    delete: deleteRequest,
    uploadFile,
    uploadFiles,
    downloadFile,
    setAuthToken,
    removeAuthToken,
    getAuthToken,
    requestWithTimeout,
    requestWithRetry,
    createSSEConnection,
    createWebSocketConnection,
    getWithCache,
    clearCache
} = api;
