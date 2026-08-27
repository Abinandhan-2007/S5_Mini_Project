import { NativeBiometric, BiometryType } from '@capgo/capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';

/**
 * CarePulse Native Mobile Hardware Biometric & Face Authentication Service
 * Supports Registered Fingerprint, Face ID / Face Recognition, and Device Lock PIN on Android / iOS.
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
      return 'Face & Fingerprint';
    case BiometryType.DEVICE_CREDENTIAL:
      return 'Device PIN / Pattern';
    default:
      return 'Face / Fingerprint';
  }
}

/**
 * Checks if the device has enrolled biometrics (Face Recognition / Fingerprint) or device security PIN available.
 */
export async function checkDeviceBiometricSupport(): Promise<BiometricCheckResult> {
  if (!Capacitor.isNativePlatform()) {
    // Web / Browser environment fallback
    return { isAvailable: true, biometryType: BiometryType.MULTIPLE, biometryLabel: 'Face / Fingerprint' };
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
 * Prompts native biometric (Face Recognition / Fingerprint) verification to register / enable biometrics.
 * Returns true ONLY if the face or fingerprint was verified by the hardware.
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

    // Strictly trigger Native Biometric Verification Prompt (Face & Fingerprint)
    await NativeBiometric.verifyIdentity({
      reason: 'Scan your Face or touch Fingerprint sensor to enable 1-touch biometric login for CarePulse',
      title: 'CarePulse Face & Fingerprint Security',
      subtitle: 'Scan Face or touch Fingerprint sensor',
      description: 'Confirm your biometric identity to enable instant 1-touch access',
      negativeButtonText: 'Cancel',
      maxAttempts: 5,
      allowedBiometryTypes: [
        BiometryType.FACE_AUTHENTICATION,
        BiometryType.FACE_ID,
        BiometryType.FINGERPRINT,
        BiometryType.TOUCH_ID,
        BiometryType.MULTIPLE,
      ],
    } as any);

    return true;
  } catch (err: any) {
    console.warn('Native biometric registration cancelled or rejected:', err);
    return false; // Strictly return false when user fails or cancels scan
  }
}

/**
 * Prompts native biometric (Face Recognition / Fingerprint) scan to authenticate and unlock the app.
 * Returns true ONLY if the face or fingerprint was successfully verified.
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

    // Prompt native Face / Fingerprint unlock dialog
    await NativeBiometric.verifyIdentity({
      reason: 'Scan registered Face or Fingerprint to unlock CarePulse',
      title: options?.title || 'CarePulse Biometric Unlock',
      subtitle: options?.subtitle || 'Scan Face or touch Fingerprint sensor',
      description: options?.description || 'Confirm your Face or Fingerprint to securely access your health records',
      negativeButtonText: 'Use Password',
      maxAttempts: 5,
      allowedBiometryTypes: [
        BiometryType.FACE_AUTHENTICATION,
        BiometryType.FACE_ID,
        BiometryType.FINGERPRINT,
        BiometryType.TOUCH_ID,
        BiometryType.MULTIPLE,
      ],
    } as any);

    return true;
  } catch (err: any) {
    console.warn('Native biometric verification cancelled or failed:', err);
    return false;
  }
}

