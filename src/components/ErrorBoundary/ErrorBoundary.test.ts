import { describe, it, expect } from 'bun:test';
import { ErrorBoundary } from './ErrorBoundary';

describe('ErrorBoundary.getDerivedStateFromError', () => {
  it('returns { hasError: true } for any error', () => {
    const error = new Error('Test error');
    const state = ErrorBoundary.getDerivedStateFromError(error);
    expect(state).toEqual({ hasError: true });
  });

  it('returns { hasError: true } for different error types', () => {
    const typeError = new TypeError('Type mismatch');
    const state = ErrorBoundary.getDerivedStateFromError(typeError);
    expect(state).toEqual({ hasError: true });
  });
});
