const META_GRAPH_VERSION = "v21.0";

export function getMetaAppId(): string {
  return (import.meta.env.VITE_META_APP_ID as string | undefined)?.trim() ?? "";
}

export function getMetaLoginConfigId(): string {
  return (import.meta.env.VITE_META_LOGIN_CONFIG_ID as string | undefined)?.trim() ?? "";
}

export type MetaFacebookLoginResponse = {
  status: "connected" | "not_authorized" | "unknown";
  authResponse?: {
    accessToken: string;
    expiresIn: number;
    signedRequest?: string;
    userID: string;
  };
};

type MetaFacebookSdk = {
  init: (params: {
    appId: string;
    cookie?: boolean;
    xfbml?: boolean;
    version: string;
  }) => void;
  getLoginStatus: (
    callback: (response: MetaFacebookLoginResponse) => void
  ) => void;
  login: (
    callback: (response: MetaFacebookLoginResponse) => void,
    options?: { scope?: string; config_id?: string; return_scopes?: boolean }
  ) => void;
};

declare global {
  interface Window {
    FB?: MetaFacebookSdk;
    fbAsyncInit?: () => void;
  }
}

let sdkLoadPromise: Promise<MetaFacebookSdk> | null = null;

function loadMetaFacebookSdk(appId: string): Promise<MetaFacebookSdk> {
  if (window.FB) return Promise.resolve(window.FB);
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise((resolve, reject) => {
    window.fbAsyncInit = () => {
      if (!window.FB) {
        reject(new Error("Facebook SDK não carregou."));
        return;
      }
      window.FB.init({
        appId,
        cookie: true,
        xfbml: false,
        version: META_GRAPH_VERSION,
      });
      resolve(window.FB);
    };

    if (!document.getElementById("facebook-jssdk")) {
      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.src = "https://connect.facebook.net/pt_BR/sdk.js";
      script.async = true;
      script.defer = true;
      script.onerror = () => reject(new Error("Falha ao carregar o SDK da Meta."));
      document.body.appendChild(script);
    }
  });

  return sdkLoadPromise;
}

export async function loginWithMetaFacebook(): Promise<string> {
  const appId = getMetaAppId();
  if (!appId) {
    throw new Error("VITE_META_APP_ID não configurado.");
  }

  const FB = await loadMetaFacebookSdk(appId);
  const configId = getMetaLoginConfigId();

  return new Promise((resolve, reject) => {
    const onResponse = (response: MetaFacebookLoginResponse) => {
      if (response.status === "connected" && response.authResponse?.accessToken) {
        resolve(response.authResponse.accessToken);
        return;
      }
      if (response.status === "not_authorized") {
        reject(new Error("Autorize o aplicativo na sua conta Meta para continuar."));
        return;
      }
      reject(new Error("Login com Meta cancelado."));
    };

    if (configId) {
      FB.login(onResponse, { config_id: configId, return_scopes: true });
      return;
    }

    FB.login(onResponse, {
      scope: "ads_management,business_management",
      return_scopes: true,
    });
  });
}
