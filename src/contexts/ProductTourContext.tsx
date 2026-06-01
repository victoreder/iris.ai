import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { useAppRoutes } from "@/hooks/useAppRoutes";
import {
  metaIntegrationsPath,
  TOUR_STEP,
  type TourStepId,
} from "@/lib/productTourSteps";

type ProductTourContextValue = {
  active: boolean;
  step: TourStepId;
  isProfileStep: boolean;
  startTour: () => void;
  endTour: () => void;
  goToWhatsappStep: () => void;
  advanceFromWhatsapp: () => void;
  advanceFromCampaign: () => void;
  advanceFromMeta: () => void;
  advanceJourneyFunnel: () => void;
  advanceJourneyNew: () => void;
  advanceFromJourneyEdit: () => void;
  advanceFromLeads: () => void;
  finishTour: () => void;
};

const ProductTourContext = createContext<ProductTourContextValue | null>(null);

export function ProductTourProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const routes = useAppRoutes();
  const [active, setActive] = useState(false);
  const [step, setStep] = useState<TourStepId>(TOUR_STEP.PROFILE);

  const startTour = useCallback(() => {
    setActive(true);
    setStep(TOUR_STEP.PROFILE);
    navigate(routes.dashboard);
  }, [navigate, routes.dashboard]);

  const endTour = useCallback(() => {
    setActive(false);
    setStep(TOUR_STEP.PROFILE);
  }, []);

  const goToWhatsappStep = useCallback(() => {
    navigate(routes.whatsapp);
    setStep(TOUR_STEP.WHATSAPP);
  }, [navigate, routes.whatsapp]);

  const advanceFromWhatsapp = useCallback(() => {
    navigate(routes.campanhas);
    setStep(TOUR_STEP.CAMPAIGN);
  }, [navigate, routes.campanhas]);

  const advanceFromCampaign = useCallback(() => {
    navigate(metaIntegrationsPath(routes));
    setStep(TOUR_STEP.META);
  }, [navigate, routes]);

  const advanceFromMeta = useCallback(() => {
    navigate(routes.jornada);
    setStep(TOUR_STEP.JOURNEY_FUNNEL);
  }, [navigate, routes.jornada]);

  const advanceJourneyFunnel = useCallback(() => {
    setStep(TOUR_STEP.JOURNEY_NEW);
  }, []);

  const advanceJourneyNew = useCallback(() => {
    setStep(TOUR_STEP.JOURNEY_EDIT);
  }, []);

  const advanceFromJourneyEdit = useCallback(() => {
    navigate(routes.leads);
    setStep(TOUR_STEP.LEADS);
  }, [navigate, routes.leads]);

  const advanceFromLeads = useCallback(() => {
    navigate(routes.dashboard);
    setStep(TOUR_STEP.DASHBOARD);
  }, [navigate, routes.dashboard]);

  const finishTour = useCallback(() => {
    endTour();
  }, [endTour]);

  const value = useMemo(
    () => ({
      active,
      step,
      isProfileStep: active && step === TOUR_STEP.PROFILE,
      startTour,
      endTour,
      goToWhatsappStep,
      advanceFromWhatsapp,
      advanceFromCampaign,
      advanceFromMeta,
      advanceJourneyFunnel,
      advanceJourneyNew,
      advanceFromJourneyEdit,
      advanceFromLeads,
      finishTour,
    }),
    [
      active,
      step,
      startTour,
      endTour,
      goToWhatsappStep,
      advanceFromWhatsapp,
      advanceFromCampaign,
      advanceFromMeta,
      advanceJourneyFunnel,
      advanceJourneyNew,
      advanceFromJourneyEdit,
      advanceFromLeads,
      finishTour,
    ]
  );

  return <ProductTourContext.Provider value={value}>{children}</ProductTourContext.Provider>;
}

export function useProductTour() {
  const ctx = useContext(ProductTourContext);
  if (!ctx) throw new Error("useProductTour deve ser usado dentro de ProductTourProvider");
  return ctx;
}

export function useProductTourOptional() {
  return useContext(ProductTourContext);
}
