// src/screens/SignupEntryScreen.tsx
// Tela de entrada /cadastro: cria novo form e redireciona para /cadastro/:public_code
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import LoadingSpinner from "../components/LoadingSpinner";
import { createSignupForm } from "../services/signupFormService";

const SignupEntryScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const source = searchParams.get("src") ?? undefined;
      const result = await createSignupForm(48, source);

      if (cancelled) return;

      if (!result) {
        setError("Não foi possível preparar o cadastro. Tente novamente.");
        toast.error("Erro ao preparar cadastro. Tente novamente.");
        return;
      }

      if (result.public_code) {
        navigate(`/cadastro/${result.public_code}`, { replace: true });
        return;
      }

      // Fallback: link antigo por share_token (evita travar)
      if (result.share_token) {
        navigate(`/patient-signup/${result.share_token}`, { replace: true });
        return;
      }

      setError("Não foi possível gerar o link. Tente novamente.");
      toast.error("Erro ao gerar link. Tente novamente.");
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [navigate, searchParams]);

  return (
    <div className="min-h-dvh w-full max-w-full overflow-x-hidden flex items-center justify-center p-4 sm:p-6">
      <div className="glass-card mx-auto w-full max-w-md min-w-0 px-6 py-8 sm:px-8 sm:py-10 text-center border border-white/10 rounded-2xl">
        {error ? (
          <>
            <p className="text-red-300 text-sm sm:text-base mb-4 break-words">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full min-h-[44px] sm:w-auto sm:min-w-[160px] neon-button text-base"
            >
              Tentar novamente
            </button>
          </>
        ) : (
          <>
            <LoadingSpinner size="lg" className="text-cyan-500 mx-auto mb-4" />
            <p className="text-slate-200 text-base sm:text-lg">Preparando seu cadastro...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default SignupEntryScreen;
