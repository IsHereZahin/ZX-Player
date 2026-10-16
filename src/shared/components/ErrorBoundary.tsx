import React, { Component, type ErrorInfo, type ReactNode } from 'react';

import { reportError } from '../logger';
import { ScreenState } from './ScreenState';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/** Last line of defence: keeps a render crash from leaving the user on a blank screen. */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError('Unhandled render error', {
      error,
      componentStack: info.componentStack,
    });
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ScreenState
          title="Something went wrong"
          message="Play-Z hit an unexpected problem."
          actionLabel="Try again"
          onAction={this.handleRetry}
        />
      );
    }
    return this.props.children;
  }
}
