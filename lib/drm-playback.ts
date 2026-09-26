export type DrmPlaybackOptions = {
  mediaElement: HTMLMediaElement;
  keySystem: string;
  configurations: MediaKeySystemConfiguration[];
  certificateUrl: string;
  licenseUrl: string;
  initDataType: string;
  initData: ArrayBuffer;
  sessionType?: MediaKeySessionType;
  licenseHeaders?: HeadersInit;
  credentials?: RequestCredentials;
  onLicenseError?: (error: unknown) => void;
};

export type DrmPlaybackSession = {
  access: MediaKeySystemAccess;
  mediaKeys: MediaKeys;
  session: MediaKeySession;
  close: () => Promise<void>;
};

async function fetchServerCertificate(url: string, credentials: RequestCredentials) {
  const response = await fetch(url, {
    cache: "no-store",
    credentials,
  });
  if (!response.ok) {
    throw new Error(`DRM server certificate request failed with ${response.status}.`);
  }
  return response.arrayBuffer();
}

/**
 * Initializes an EME session with the certificate applied before request generation.
 * Windows implementations reject generateRequest when this ordering is skipped.
 */
export async function initializeDrmPlayback({
  mediaElement,
  keySystem,
  configurations,
  certificateUrl,
  licenseUrl,
  initDataType,
  initData,
  sessionType = "temporary",
  licenseHeaders,
  credentials = "include",
  onLicenseError,
}: DrmPlaybackOptions): Promise<DrmPlaybackSession> {
  if (typeof navigator.requestMediaKeySystemAccess !== "function") {
    throw new Error("Encrypted Media Extensions are not supported in this browser.");
  }

  const access = await navigator.requestMediaKeySystemAccess(keySystem, configurations);
  const mediaKeys = await access.createMediaKeys();

  // The certificate must be fetched and applied before createSession/generateRequest.
  const certificate = await fetchServerCertificate(certificateUrl, credentials);
  const certificateAccepted = await mediaKeys.setServerCertificate(certificate);
  if (!certificateAccepted) {
    throw new Error("The DRM key system rejected its server certificate.");
  }

  await mediaElement.setMediaKeys(mediaKeys);
  const session = mediaKeys.createSession(sessionType);

  const handleLicenseMessage = async (event: MediaKeyMessageEvent) => {
    try {
      const response = await fetch(licenseUrl, {
        method: "POST",
        body: event.message,
        cache: "no-store",
        credentials,
        headers: {
          "Content-Type": "application/octet-stream",
          ...licenseHeaders,
        },
      });
      if (!response.ok) {
        throw new Error(`DRM license request failed with ${response.status}.`);
      }
      await session.update(await response.arrayBuffer());
    } catch (error) {
      onLicenseError?.(error);
    }
  };

  session.addEventListener("message", handleLicenseMessage);

  // Only generate the request after the certificate and message handler are ready.
  await session.generateRequest(initDataType, initData);

  return {
    access,
    mediaKeys,
    session,
    close: async () => {
      session.removeEventListener("message", handleLicenseMessage);
      await session.close();
      if (mediaElement.mediaKeys === mediaKeys) await mediaElement.setMediaKeys(null);
    },
  };
}
