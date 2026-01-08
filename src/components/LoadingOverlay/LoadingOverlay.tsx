interface LoadingOverlayProps {
  isVisible: boolean;
  message: string;
}

export function LoadingOverlay({ isVisible, message }: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <div className="loading-spinner" />
        <p className="loading-message">{message}</p>
      </div>
    </div>
  );
}
