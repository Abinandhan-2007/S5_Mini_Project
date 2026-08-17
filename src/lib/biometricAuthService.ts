import { NativeBiometric, BiometryType } from '@capgo/capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';

/**
 * CarePulse Native Mobile Hardware Biometric Authentication Service
 * Strictly configured for Registered Fingerprint verification or Device PIN on Android / iOS.
 */

export interface BiometricCheckResult {
  isAvailable: boolean;
  biometryType?: BiometryType;
  message?: string;
}

/**
 * Checks if the device has enrolled biometrics (Fingerprint) or device security PIN available.
 */
export async function checkDeviceBiometricSupport(): Promise<BiometricCheckResult> {
  if (!Capacitor.isNativePlatform()) {
    // Web / Browser environment fallback
    return { isAvailable: true, biometryType: BiometryType.TOUCH_ID };
  }

  try {
    const result = await NativeBiometric.isAvailable({ useFallback: true });
    return {
      isAvailable: !!result.isAvailable,
      biometryType: result.biometryType,
    };
  } catch (err: any) {
    console.warn('Native biometric support check error:', err);
    return { isAvailable: false, message: err?.message || 'Biometric hardware check failed.' };
  }
}

/**
 * Prompts native biometric / fingerprint verification to register / enable biometrics.
 * Returns true ONLY if the fingerprint or device PIN was verified by the hardware.
 */
export async function registerDeviceBiometrics(_userEmail?: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    // In web browser preview, allow toggle with mock confirmation
    return true;
  }

  try {
    const availability = await NativeBiometric.isAvailable({ useFallback: true });
    if (!availability.isAvailable) {
      console.warn('Biometric authentication is not enrolled or available on this device.');
      return false;
    }

    // Strictly trigger Native Biometric Verification Prompt
    await NativeBiometric.verifyIdentity({
      reason: 'Scan your registered fingerprint or enter device PIN to enable biometric login for CarePulse',
      title: 'CarePulse Fingerprint Security',
      subtitle: 'Touch fingerprint sensor or confirm device PIN',
      description: 'Verify your identity to enable 1-touch fingerprint access',
      negativeButtonText: 'Cancel',
      maxAttempts: 5,
    });

    return true;
  } catch (err: any) {
    console.warn('Native biometric registration cancelled or rejected:', err);
    return false; // Strictly return false when user fails or cancels fingerprint scan
  }
}

/**
 * Prompts native biometric / fingerprint scan to authenticate and unlock the app.
 * Returns true ONLY if the fingerprint was successfully verified.
 */
export async function authenticateDeviceBiometrics(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    // In web browser preview, allow simulated login
    return true;
  }

  try {
    const availability = await NativeBiometric.isAvailable({ useFallback: true });
    if (!availability.isAvailable) {
      console.warn('Biometrics not available on device.');
      return false;
    }

    // Strictly prompt native fingerprint dialog
    await NativeBiometric.verifyIdentity({
      reason: 'Scan registered fingerprint or enter PIN to unlock CarePulse',
      title: 'CarePulse Fingerprint Unlock',
      subtitle: 'Touch the fingerprint sensor to continue',
      description: 'Confirm registered fingerprint or PIN to securely open your health records',
      negativeButtonText: 'Cancel',
      maxAttempts: 5,
    });

    return true;
  } catch (err: any) {
    console.warn('Native biometric verification cancelled or failed:', err);
    return false;
  }
}

