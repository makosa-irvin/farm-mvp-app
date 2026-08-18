import { useCallback, useState } from 'react';

// Provides a Promise-based confirmation API to domain actions while keeping
// the actual dialog UI in React. Callers can therefore `await confirm(...)`
// without depending on browser-native dialogs.
export function useConfirmDialog() {
  const [request, setRequest] = useState(null); // { message, resolve } | null

  const confirm = useCallback((message) => {
    return new Promise((resolve) => {
      setRequest({ message, resolve });
    });
  }, []);

  const respond = useCallback((result) => {
    setRequest((current) => {
      current?.resolve(result);
      return null;
    });
  }, []);

  return {
    confirm,
    dialogProps: {
      isOpen: request !== null,
      message: request?.message ?? '',
      onConfirm: () => respond(true),
      onCancel: () => respond(false),
    },
  };
}
