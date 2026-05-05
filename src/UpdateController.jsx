import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useRegisterSW } from 'virtual:pwa-register/react';

// Based on https://vite-pwa-org.netlify.app/frameworks/react.html
const UpdateController = () => {
  const swUpdateInterval = useSelector(
    (state) => state.session.server.attributes.serviceWorkerUpdateInterval || 3600000,
  );
  const [registrationData, setRegistrationData] = useState(null);

  useRegisterSW({
    onRegisteredSW(swUrl, swRegistration) {
      if (swRegistration) {
        setRegistrationData({ swUrl, swRegistration });
      }
    },
  });

  useEffect(() => {
    if (swUpdateInterval <= 0 || !registrationData?.swRegistration) {
      return undefined;
    }

    const { swUrl, swRegistration } = registrationData;

    const checkForUpdate = async () => {
      try {
        if (swRegistration.installing || !navigator.onLine) {
          return;
        }

        const newSW = await fetch(swUrl, {
          cache: 'no-store',
          headers: {
            cache: 'no-store',
            'cache-control': 'no-cache',
          },
        });

        if (newSW?.status === 200) {
          await swRegistration.update();
        }
      } catch {
        // Ignore transient network/update errors and retry on the next check.
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdate();
      }
    };

    const interval = setInterval(checkForUpdate, swUpdateInterval);

    window.addEventListener('focus', checkForUpdate);
    window.addEventListener('online', checkForUpdate);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    checkForUpdate();

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkForUpdate);
      window.removeEventListener('online', checkForUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [registrationData, swUpdateInterval]);

  return null;
};

export default UpdateController;
