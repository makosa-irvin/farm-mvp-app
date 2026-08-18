import { useCallback, useState } from 'react';

// window.confirm() works, but it's a browser-chrome popup that looks like
// a technical warning, not part of the app — exactly the kind of thing
// that erodes trust for someone already unsure whether they're "allowed"
// to click things. This hook gives action functions the same call
// shape (await confirm(message) -> boolean) backed by the app's own
// ConfirmDialog component instead.
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
