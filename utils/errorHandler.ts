import { Alert } from 'react-native';

export interface AppError {
  code: string;
  message: string;
  details?: any;
}

export class ErrorHandler {
  static handleAuthError(error: any): string {
    const errorCode = error?.code || error?.message || 'unknown';
    
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return 'This email is already registered. Please use a different email or try logging in.';
      
      case 'auth/weak-password':
        return 'Password should be at least 6 characters long.';
      
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      
      case 'auth/network-request-failed':
        return 'Network error. Please check your internet connection and try again.';
      
      case 'auth/user-disabled':
        return 'This account has been disabled. Please contact support.';
      
      case 'auth/operation-not-allowed':
        return 'This sign-in method is not enabled. Please contact support.';
      
      case 'auth/requires-recent-login':
        return 'Please log in again to perform this action.';
      
      case 'auth/invalid-credential':
        return 'Invalid credentials. Please check your email and password.';
      
      case 'auth/credential-already-in-use':
        return 'This credential is already associated with a different account.';
      
      case 'auth/invalid-verification-code':
        return 'Invalid verification code. Please try again.';
      
      case 'auth/invalid-verification-id':
        return 'Invalid verification ID. Please try again.';
      
      case 'auth/missing-verification-code':
        return 'Verification code is required.';
      
      case 'auth/missing-verification-id':
        return 'Verification ID is required.';
      
      case 'auth/quota-exceeded':
        return 'Quota exceeded. Please try again later.';
      
      case 'auth/captcha-check-failed':
        return 'Captcha verification failed. Please try again.';
      
      case 'auth/invalid-phone-number':
        return 'Invalid phone number format.';
      
      case 'auth/missing-phone-number':
        return 'Phone number is required.';
      
      case 'auth/invalid-verification-code':
        return 'Invalid verification code.';
      
      case 'auth/missing-verification-code':
        return 'Verification code is required.';
      
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  static handleFirestoreError(error: any): string {
    const errorCode = error?.code || error?.message || 'unknown';
    
    switch (errorCode) {
      case 'permission-denied':
        return 'You do not have permission to perform this action.';
      
      case 'unavailable':
        return 'Service is temporarily unavailable. Please try again later.';
      
      case 'deadline-exceeded':
        return 'Request timed out. Please try again.';
      
      case 'resource-exhausted':
        return 'Resource limit exceeded. Please try again later.';
      
      case 'unauthenticated':
        return 'You must be logged in to perform this action.';
      
      case 'not-found':
        return 'The requested resource was not found.';
      
      case 'already-exists':
        return 'This resource already exists.';
      
      case 'failed-precondition':
        return 'Operation failed due to a precondition.';
      
      case 'aborted':
        return 'Operation was aborted. Please try again.';
      
      case 'out-of-range':
        return 'Value is out of range.';
      
      case 'unimplemented':
        return 'This feature is not implemented yet.';
      
      case 'internal':
        return 'Internal server error. Please try again later.';
      
      case 'data-loss':
        return 'Data loss occurred. Please try again.';
      
      default:
        return 'A database error occurred. Please try again.';
    }
  }

  static handleNetworkError(error: any): string {
    if (error?.message?.includes('Network request failed')) {
      return 'Network error. Please check your internet connection and try again.';
    }
    
    if (error?.message?.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    
    return 'A network error occurred. Please try again.';
  }

  static handleValidationError(error: any): string {
    if (error?.message?.includes('email')) {
      return 'Please enter a valid email address.';
    }
    
    if (error?.message?.includes('password')) {
      return 'Password must be at least 6 characters long.';
    }
    
    if (error?.message?.includes('name')) {
      return 'Please enter your name.';
    }
    
    return 'Please check your input and try again.';
  }

  static getErrorMessage(error: any): string {
    if (error?.code?.startsWith('auth/')) {
      return this.handleAuthError(error);
    }
    
    if (error?.code?.startsWith('firestore/')) {
      return this.handleFirestoreError(error);
    }
    
    if (error?.message?.includes('Network') || error?.message?.includes('timeout')) {
      return this.handleNetworkError(error);
    }
    
    if (error?.message?.includes('validation') || error?.message?.includes('required')) {
      return this.handleValidationError(error);
    }
    
    return error?.message || 'An unexpected error occurred. Please try again.';
  }

  static showErrorAlert(error: any, title: string = 'Error') {
    const message = this.getErrorMessage(error);
    Alert.alert(title, message);
  }

  static showSuccessAlert(message: string, title: string = 'Success') {
    Alert.alert(title, message);
  }

  static showConfirmationAlert(
    message: string,
    title: string = 'Confirm',
    onConfirm: () => void,
    onCancel?: () => void
  ) {
    Alert.alert(
      title,
      message,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: onCancel,
        },
        {
          text: 'Confirm',
          onPress: onConfirm,
        },
      ]
    );
  }

  static showDestructiveConfirmationAlert(
    message: string,
    title: string = 'Warning',
    onConfirm: () => void,
    onCancel?: () => void
  ) {
    Alert.alert(
      title,
      message,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: onCancel,
        },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: onConfirm,
        },
      ]
    );
  }

  // Retry function with exponential backoff
  static async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 1000
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // Don't retry on certain errors
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          throw error;
        }
        
        // Calculate delay with exponential backoff
        const delay = initialDelay * Math.pow(2, attempt);
        
        // Only wait if not the last attempt
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  // Alias for getUserFriendlyMessage
  static getUserFriendlyMessage(error: any): string {
    return this.getErrorMessage(error);
  }
}

// Export a singleton instance for easier use
export const errorHandler = {
  retryWithBackoff: ErrorHandler.retryWithBackoff.bind(ErrorHandler),
  getUserFriendlyMessage: ErrorHandler.getUserFriendlyMessage.bind(ErrorHandler),
  getErrorMessage: ErrorHandler.getErrorMessage.bind(ErrorHandler),
  handleAuthError: ErrorHandler.handleAuthError.bind(ErrorHandler),
  handleFirestoreError: ErrorHandler.handleFirestoreError.bind(ErrorHandler),
  handleNetworkError: ErrorHandler.handleNetworkError.bind(ErrorHandler),
  handleValidationError: ErrorHandler.handleValidationError.bind(ErrorHandler),
  showErrorAlert: ErrorHandler.showErrorAlert.bind(ErrorHandler),
  showSuccessAlert: ErrorHandler.showSuccessAlert.bind(ErrorHandler),
  showConfirmationAlert: ErrorHandler.showConfirmationAlert.bind(ErrorHandler),
  showDestructiveConfirmationAlert: ErrorHandler.showDestructiveConfirmationAlert.bind(ErrorHandler),
};

export default ErrorHandler;