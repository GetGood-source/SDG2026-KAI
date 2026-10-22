import { useEffect, useRef, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Redirect, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { Layout } from '@/components/layout';
import { AccountGate, useAccount } from '@/lib/account';
import Landing from '@/pages/landing';
import Team from '@/pages/team';
import Dashboard from '@/pages/dashboard';
import Requests from '@/pages/requests';
import RequestDetail from '@/pages/request-detail';
import Suppliers from '@/pages/suppliers';
import Inventory from '@/pages/inventory';
import Approvals from '@/pages/approvals';
import Orders from '@/pages/orders';
import Activity from '@/pages/activity';
import SettingsPage from '@/pages/settings';
import { Lock } from 'lucide-react';

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: true, retry: 1 } } });

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const demoMode = import.meta.env.VITE_PROCUREMENT_DEMO_MODE === "true";

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: 'hsl(217 91% 45%)',
    colorForeground: 'hsl(222 47% 14%)',
    colorMutedForeground: 'hsl(218 18% 40%)',
    colorDanger: 'hsl(356 72% 50%)',
    colorBackground: 'hsl(0 0% 100%)',
    colorInput: 'hsl(214 45% 98%)',
    colorInputForeground: 'hsl(222 47% 14%)',
    colorNeutral: 'hsl(218 30% 30%)',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    borderRadius: '0.5rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-white rounded-xl w-[440px] max-w-full overflow-hidden border border-[hsl(214_32%_89%)] shadow-[0_24px_60px_-28px_hsl(217_80%_30%/0.4)]',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[hsl(222_47%_14%)] font-extrabold tracking-tight',
    headerSubtitle: 'text-[hsl(218_18%_40%)]',
    socialButtonsBlockButtonText: 'text-[hsl(222_47%_14%)] font-semibold',
    formFieldLabel: 'text-[hsl(222_47%_14%)] font-semibold',
    footerActionLink: 'text-[hsl(217_91%_45%)] font-semibold',
    footerActionText: 'text-[hsl(218_18%_40%)]',
    dividerText: 'text-[hsl(218_18%_40%)]',
    identityPreviewEditButton: 'text-[hsl(217_91%_45%)]',
    formFieldSuccessText: 'text-[hsl(160_60%_30%)]',
    alertText: 'text-[hsl(222_47%_14%)]',
    logoBox: 'justify-center h-11',
    logoImage: 'h-11 w-11',
    socialButtonsBlockButton: 'border border-[hsl(214_30%_84%)] bg-white',
    formButtonPrimary: 'bg-[hsl(217_91%_45%)] text-white font-semibold shadow-none',
    formFieldInput: 'border border-[hsl(214_30%_84%)] bg-[hsl(214_45%_98%)] text-[hsl(222_47%_14%)]',
    footerAction: 'bg-[hsl(214_60%_97%)] py-3',
    dividerLine: 'bg-[hsl(214_32%_89%)]',
    alert: 'border border-[hsl(214_32%_89%)] bg-[hsl(214_60%_96%)]',
    otpCodeFieldInput: 'border border-[hsl(214_30%_84%)] text-[hsl(222_47%_14%)]',
    formFieldRow: 'gap-3',
    main: 'gap-5',
  },
};

function AuthShell({ children, note }: { children: ReactNode; note: string }) {
  return (
    <div className="grid min-h-[100dvh] bg-background md:grid-cols-[1fr_1.1fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 text-sidebar-foreground md:flex">
        <div className="flex items-center gap-2.5">
          <img src={`${basePath}/logo.svg`} alt="" className="h-8 w-8" />
          <span className="text-sm font-bold text-white">Smart Procurement</span>
        </div>
        <div className="rise">
          <h2 className="max-w-sm text-3xl font-extrabold leading-tight text-white">Every urgent part, requested, quoted, approved and received on one record.</h2>
          <p className="mt-4 flex max-w-sm gap-2 text-sm"><Lock className="mt-0.5 h-4 w-4 shrink-0 text-sidebar-primary" />{note}</p>
        </div>
        <div className="text-[11px] text-sidebar-foreground/60">Repair shops and small teams</div>
      </div>
      <div className="grid-bg flex items-center justify-center px-4 py-10">{children}</div>
    </div>
  );
}

function SignInPage() {
  const choice = window.sessionStorage.getItem("smart-procurement-login-choice");
  return (
    <AuthShell note={`${choice === "manager" ? "Manager" : "Employee"} access — use the verified email address a workspace manager authorized for this role.`}>
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </AuthShell>
  );
}

function SignUpPage() {
  return (
    <AuthShell note="Creating an account does not open the workspace by itself. Ask a manager to authorize this email, then verify it.">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </AuthShell>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        void qc.cancelQueries();
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function HomeRedirect() {
  if (demoMode) return <Landing />;
  return (
    <>
      <Show when="signed-in"><Redirect to="/dashboard" /></Show>
      <Show when="signed-out"><Landing /></Show>
    </>
  );
}

function ManagerOnly({ children }: { children: ReactNode }) {
  const { isManager } = useAccount();
  if (isManager) return <>{children}</>;
  return (
    <div className="rise mx-auto mt-10 max-w-md rounded-xl border bg-card p-7 text-center">
      <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-lg bg-secondary text-primary"><Lock className="h-5 w-5" /></div>
      <h1 className="text-lg font-bold" data-testid="text-manager-only">Managers only</h1>
      <p className="mt-1 text-sm text-muted-foreground">This page is for workspace managers. Ask a manager if something here needs changing.</p>
    </div>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Workspace() {
  return (
    <AccountGate>
      <Layout>
        <RoutedErrorBoundary>
          <Switch>
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/requests" component={Requests} />
            <Route path="/requests/:id" component={RequestDetail} />
            <Route path="/suppliers" component={Suppliers} />
            <Route path="/inventory" component={Inventory} />
            <Route path="/approvals" component={Approvals} />
            <Route path="/orders" component={Orders} />
            <Route path="/activity" component={Activity} />
            <Route path="/settings"><ManagerOnly><SettingsPage /></ManagerOnly></Route>
            <Route path="/team"><ManagerOnly><Team /></ManagerOnly></Route>
            <Route component={NotFound} />
          </Switch>
        </RoutedErrorBoundary>
      </Layout>
    </AccountGate>
  );
}

function Protected() {
  if (demoMode) return <Workspace />;
  return (
    <>
      <Show when="signed-in"><Workspace /></Show>
      <Show when="signed-out"><Redirect to="/" /></Show>
    </>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: 'Sign in to procurement', subtitle: 'Choose Employee Login or Manager Login from the home page' } },
        signUp: { start: { title: 'Create your account', subtitle: 'Use the exact verified email authorized for your role' } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route component={Protected} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
