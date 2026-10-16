import React, { Component, type ErrorInfo, type ReactNode } from 'react';

import { CircleAlertIcon } from '../icons';
import { reportError } from '../logger';
import { EmptyState } from './EmptyState';

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
        <EmptyState
          icon={CircleAlertIcon}
          title="Something went wrong"
          message="ZX Player hit an unexpected problem."
          actionLabel="Try again"
          onAction={this.handleRetry}
        />
      );
    }
    return this.props.children;
  }
}
