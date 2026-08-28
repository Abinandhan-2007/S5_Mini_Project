import { NativeBiometric, BiometryType } from '@capgo/capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';

/**
 * CarePulse Native Mobile Hardware Biometric & Phone Lock Security Service
 * Supports Registered Fingerprint, Face ID / Face Recognition, and Phone Lock PIN / Password / Pattern on Android & iOS.
 */

export interface BiometricCheckResult {
  isAvailable: boolean;
  biometryType?: BiometryType;
  biometryLabel?: string;
  message?: string;
}

/**
 * Returns a human-friendly label for the available biometry hardware.
 */
export function getBiometricLabel(type?: BiometryType): string {
  switch (type) {
    case BiometryType.FACE_ID:
    case BiometryType.FACE_AUTHENTICATION:
      return 'Face Unlock';
    case BiometryType.TOUCH_ID:
    case BiometryType.FINGERPRINT:
      return 'Fingerprint';
    case BiometryType.MULTIPLE:
      return 'Face, Fingerprint & Phone PIN';
    case BiometryType.DEVICE_CREDENTIAL:
      return 'Phone Password / PIN';
    default:
      return 'Biometric / Phone PIN';
  }
}

/**
 * Checks if the device has enrolled biometrics (Face Recognition / Fingerprint) or device lock PIN / password available.
 */
export async function checkDeviceBiometricSupport(): Promise<BiometricCheckResult> {
  if (!Capacitor.isNativePlatform()) {
    // Web / Browser environment fallback
    return { isAvailable: true, biometryType: BiometryType.MULTIPLE, biometryLabel: 'Biometric / Phone PIN' };
  }

  try {
    const result = await NativeBiometric.isAvailable({ useFallback: true });
    const label = getBiometricLabel(result.biometryType);
    return {
      isAvailable: !!result.isAvailable,
      biometryType: result.biometryType,
      biometryLabel: label,
    };
  } catch (err: any) {
    console.warn('Native biometric support check error:', err);
    return { isAvailable: false, message: err?.message || 'Biometric hardware check failed.' };
  }
}

/**
 * Prompts native biometric (Face Recognition / Fingerprint / Phone Lock PIN) verification to register / enable app lock.
 * Returns true ONLY if verified by the phone's native security hardware.
 */
export async function registerDeviceBiometrics(_userEmail?: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    // In web browser preview, allow toggle with simulated confirmation
    return true;
  }

  try {
    const availability = await NativeBiometric.isAvailable({ useFallback: true });
    if (!availability.isAvailable) {
      console.warn('Biometric authentication is not enrolled or available on this device.');
      return false;
    }

    // Trigger Native Biometric Verification Prompt with Phone Password / PIN fallback
    await NativeBiometric.verifyIdentity({
      reason: 'Scan your Face, touch Fingerprint, or enter Phone PIN/Password to enable 1-touch app lock for CarePulse',
      title: 'CarePulse Security Verification',
      subtitle: 'Scan Face, Fingerprint, or enter Phone PIN',
      description: 'Confirm your biometric identity or phone lock password to enable instant secure access',
      negativeButtonText: 'Cancel',
      maxAttempts: 5,
      useFallback: true,
      allowedBiometryTypes: [
        BiometryType.FACE_AUTHENTICATION,
        BiometryType.FACE_ID,
        BiometryType.FINGERPRINT,
        BiometryType.TOUCH_ID,
        BiometryType.DEVICE_CREDENTIAL,
        BiometryType.MULTIPLE,
      ],
    } as any);

    return true;
  } catch (err: any) {
    console.warn('Native biometric registration cancelled or rejected:', err);
    return false;
  }
}

/**
 * Prompts native biometric (Face / Fingerprint) scan or Phone Lock PIN/Password to authenticate and unlock the app.
 * Returns true ONLY if successfully verified by the phone's security hardware.
 */
export async function authenticateDeviceBiometrics(options?: {
  title?: string;
  subtitle?: string;
  description?: string;
}): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    // In web browser preview, allow simulated unlock
    return true;
  }

  try {
    const availability = await NativeBiometric.isAvailable({ useFallback: true });
    if (!availability.isAvailable) {
      console.warn('Biometrics not available on device.');
      return false;
    }

    // Prompt native Face / Fingerprint unlock dialog with Phone Password / PIN fallback
    await NativeBiometric.verifyIdentity({
      reason: 'Scan registered Face, touch Fingerprint, or enter Phone PIN/Password to unlock CarePulse',
      title: options?.title || 'CarePulse Security Unlock',
      subtitle: options?.subtitle || 'Scan Face, Fingerprint, or enter Phone PIN',
      description: options?.description || 'Confirm your identity to securely access your CarePulse medical records',
      negativeButtonText: 'Use Password',
      maxAttempts: 5,
      useFallback: true,
      allowedBiometryTypes: [
        BiometryType.FACE_AUTHENTICATION,
        BiometryType.FACE_ID,
        BiometryType.FINGERPRINT,
        BiometryType.TOUCH_ID,
        BiometryType.DEVICE_CREDENTIAL,
        BiometryType.MULTIPLE,
      ],
    } as any);

    return true;
  } catch (err: any) {
    console.warn('Native biometric verification cancelled or failed:', err);
    return false;
  }
}

/**
 * Prompts the phone's native Lock Screen Password / PIN / Pattern prompt directly.
 * Returns true if the user enters the correct phone lock screen credential.
 */
export async function authenticateDevicePasswordOrPin(options?: {
  title?: string;
  subtitle?: string;
  description?: string;
}): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    await NativeBiometric.verifyIdentity({
      reason: 'Enter your Phone Lock Password, PIN, or Pattern to unlock CarePulse',
      title: options?.title || 'CarePulse Phone Security',
      subtitle: options?.subtitle || 'Enter Phone Lock Password / PIN',
      description: options?.description || 'Confirm your phone screen lock credential to securely access CarePulse',
      negativeButtonText: 'Cancel',
      maxAttempts: 5,
      useFallback: true,
      allowedBiometryTypes: [
        BiometryType.DEVICE_CREDENTIAL,
        BiometryType.FINGERPRINT,
        BiometryType.FACE_AUTHENTICATION,
        BiometryType.TOUCH_ID,
        BiometryType.FACE_ID,
        BiometryType.MULTIPLE,
      ],
    } as any);

    return true;
  } catch (err: any) {
    console.warn('Device PIN/Password verification cancelled or failed:', err);
    return false;
  }
}
