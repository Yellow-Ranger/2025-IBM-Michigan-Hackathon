/**
 * Feature flags for the application
 *
 * These control which features are enabled or disabled.
 */

/**
 * Enable or disable expo-roomplan (LiDAR) scanning
 *
 * - true: Use expo-roomplan for devices that support it (LiDAR-enabled devices)
 * - false: Always use photo capture flow (default)
 *
 * Default: false (use photos)
 */
export const ENABLE_ROOMPLAN = true;

/**
 * Generate mock STL files after photo capture
 *
 * When true, a mock STL file will be generated after completing the photo capture flow.
 * This is useful for testing and demonstration purposes.
 *
 * Default: true
 */
export const GENERATE_MOCK_STL = true;
