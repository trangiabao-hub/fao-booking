// Customer Info Storage Utilities
const STORAGE_KEY = "fao_customer_info";

/**
 * Save customer info to localStorage
 * @param {Object} customer - { fullName, phone, ig, fb }
 */
export function saveCustomerInfo(customer) {
  try {
    const data = {
      fullName: customer.fullName || "",
      phone: customer.phone || "",
      ig: customer.ig || "",
      fb: customer.fb || "",
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Failed to save customer info:", e);
  }
}

/**
 * Load customer info from localStorage
 * @returns {Object|null} - { fullName, phone, ig, fb } or null
 */
export function loadCustomerInfo() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const data = JSON.parse(stored);
    
    // Check if data is older than 30 days
    const savedAt = new Date(data.savedAt);
    const now = new Date();
    const daysDiff = (now - savedAt) / (1000 * 60 * 60 * 24);
    
    if (daysDiff > 30) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    
    return {
      fullName: data.fullName || "",
      phone: data.phone || "",
      ig: data.ig || "",
      fb: data.fb || "",
    };
  } catch (e) {
    console.warn("Failed to load customer info:", e);
    return null;
  }
}

/**
 * Clear stored customer info
 */
export function clearCustomerInfo() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn("Failed to clear customer info:", e);
  }
}

// Booking preferences storage
const PREFS_KEY = "fao_booking_prefs";

/**
 * Save booking preferences (branch, duration preference)
 * @param {Object} prefs - { branchId, durationId }
 */
export function saveBookingPrefs(prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.warn("Failed to save booking prefs:", e);
  }
}

/**
 * Load booking preferences
 * @returns {Object|null}
 */
export function loadBookingPrefs() {
  try {
    const stored = localStorage.getItem(PREFS_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    console.warn("Failed to load booking prefs:", e);
    return null;
  }
}
