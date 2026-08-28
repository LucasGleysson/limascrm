import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: React.ReactNode;
  /** Muda para resetar o boundary (ex: aba ativa). */
  resetKey?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary capturou um erro:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-10 flex flex-col items-center justify-center text-center gap-3">
          <div className="rounded-full bg-destructive/10 p-3">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <p className="font-semibold">Não foi possível carregar este painel</p>
          <p className="text-sm text-muted-foreground max-w-md">
            Algo deu errado ao montar esta tela. Tente novamente — se o erro continuar, avise o
            supervisor com o nome da aba.
          </p>
          <p className="text-xs text-muted-foreground/70 font-mono max-w-md break-words">
            {this.state.error.message}
          </p>
          <Button variant="outline" className="gap-2" onClick={() => this.setState({ error: null })}>
            <RotateCcw className="h-4 w-4" /> Tentar novamente
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
