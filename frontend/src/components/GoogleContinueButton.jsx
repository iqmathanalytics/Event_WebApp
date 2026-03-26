import { GoogleLogin } from "@react-oauth/google";

export function isGoogleAuthConfigured() {
  return Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim());
}

export function AuthDividerOr() {
  return (
    <div className="relative my-5" role="separator" aria-orientation="horizontal">
      <div className="absolute inset-0 flex items-center" aria-hidden>
        <span className="w-full border-t border-slate-200" />
      </div>
      <div className="relative flex justify-center text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span className="bg-white px-3">Or</span>
      </div>
    </div>
  );
}

export default function GoogleContinueButton({ disabled, onCredential }) {
  if (!isGoogleAuthConfigured()) {
    return null;
  }

  return (
    <div
      className={`flex w-full justify-center [&>div]:w-full ${disabled ? "pointer-events-none opacity-55" : ""}`}
    >
      <GoogleLogin
        onSuccess={(credentialResponse) => {
          onCredential?.(credentialResponse.credential);
        }}
        onError={() => {
          onCredential?.(null);
        }}
        useOneTap={false}
        theme="outline"
        size="large"
        text="continue_with"
        shape="rectangular"
        logo_alignment="left"
      />
    </div>
  );
}
