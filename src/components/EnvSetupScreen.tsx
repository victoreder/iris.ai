import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function EnvSetupScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-xl font-bold text-white">
            V
          </div>
          <CardTitle>Configuração necessária</CardTitle>
          <CardDescription>
            O Viziom precisa das variáveis do Supabase para carregar o app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
            <li>Crie um projeto no Supabase</li>
            <li>Execute a migration em <code className="rounded bg-muted px-1">supabase/migrations/00001_iris_schema.sql</code></li>
            <li>Copie o arquivo de ambiente:</li>
          </ol>
          <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
            cp .env.example .env
          </pre>
          <p className="text-muted-foreground">Preencha no <code className="rounded bg-muted px-1">.env</code>:</p>
          <ul className="space-y-1 font-mono text-xs text-muted-foreground">
            <li>VITE_SUPABASE_URL</li>
            <li>VITE_SUPABASE_ANON_KEY</li>
            <li>VITE_BACKEND_URL=http://localhost:3333</li>
          </ul>
          <p className="text-muted-foreground">
            Reinicie o servidor (<code className="rounded bg-muted px-1">npm run dev</code>) após salvar o <code className="rounded bg-muted px-1">.env</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
