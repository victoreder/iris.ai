import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { useProductTour } from "@/contexts/ProductTourContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  PRODUCT_TOUR_SELECTORS,
  TOUR_STEP,
  TOUR_STEP_CONTENT,
  TOUR_WHATSAPP_QR_CONTENT,
  type TourStepId,
} from "@/lib/productTourSteps";

const PADDING = 8;

function useHighlightRect(selector: string | null, enabled: boolean) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  const measure = useCallback(() => {
    if (!enabled || !selector) {
      setRect(null);
      return;
    }
    const el = document.querySelector(selector);
    if (!el) {
      setRect(null);
      return;
    }
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    setRect(el.getBoundingClientRect());
  }, [selector, enabled]);

  useLayoutEffect(() => {
    measure();
    if (!enabled) return;

    const interval = window.setInterval(measure, 250);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure, enabled]);

  return rect;
}

function TooltipCard({
  rect,
  title,
  description,
  primaryLabel,
  onPrimary,
  onClose,
  skipLabel,
  onSkip,
}: {
  rect: DOMRect;
  title: string;
  description: string;
  primaryLabel: string;
  onPrimary: () => void;
  onClose: () => void;
  skipLabel?: string;
  onSkip?: () => void;
}) {
  const spaceBelow = window.innerHeight - (rect.bottom + PADDING);
  const showBelow = spaceBelow > 200;
  const top = showBelow ? rect.bottom + PADDING + 12 : rect.top - PADDING - 12;
  const left = Math.min(
    Math.max(rect.left + rect.width / 2, 180),
    window.innerWidth - 180
  );

  return (
    <Card
      className="pointer-events-auto fixed z-[122] w-[min(100vw-2rem,22rem)] -translate-x-1/2 shadow-xl"
      style={{
        top: showBelow ? top : undefined,
        bottom: showBelow ? undefined : window.innerHeight - top,
        left,
      }}
    >
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="font-semibold text-foreground">{title}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted"
            aria-label="Fechar tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <Button type="button" className="w-full" onClick={onPrimary}>
          {primaryLabel}
        </Button>
        {skipLabel && onSkip && (
          <button
            type="button"
            className="w-full text-center text-xs text-muted-foreground underline-offset-2 hover:underline"
            onClick={onSkip}
          >
            {skipLabel}
          </button>
        )}
      </CardContent>
    </Card>
  );
}

function resolveSelector(step: TourStepId, whatsappQrOpen: boolean): string | null {
  switch (step) {
    case TOUR_STEP.PROFILE:
      return PRODUCT_TOUR_SELECTORS.profileWhatsapp;
    case TOUR_STEP.WHATSAPP:
      if (whatsappQrOpen) return PRODUCT_TOUR_SELECTORS.whatsappQrPanel;
      return document.querySelector(PRODUCT_TOUR_SELECTORS.whatsappQr)
        ? PRODUCT_TOUR_SELECTORS.whatsappQr
        : PRODUCT_TOUR_SELECTORS.whatsappCreate;
    case TOUR_STEP.CAMPAIGN:
      return PRODUCT_TOUR_SELECTORS.campaignCreate;
    case TOUR_STEP.META:
      return PRODUCT_TOUR_SELECTORS.metaPixelConfig;
    case TOUR_STEP.JOURNEY_FUNNEL:
      return PRODUCT_TOUR_SELECTORS.journeyFunnel;
    case TOUR_STEP.JOURNEY_NEW:
      return PRODUCT_TOUR_SELECTORS.journeyNewStage;
    case TOUR_STEP.JOURNEY_EDIT:
      return (
        document.querySelector(PRODUCT_TOUR_SELECTORS.journeyEditStage) &&
        PRODUCT_TOUR_SELECTORS.journeyEditStage
      ) || PRODUCT_TOUR_SELECTORS.journeyFunnel;
    case TOUR_STEP.LEADS:
      return PRODUCT_TOUR_SELECTORS.leadsInbox;
    case TOUR_STEP.DASHBOARD:
      return PRODUCT_TOUR_SELECTORS.dashboardKpis;
    default:
      return null;
  }
}

export function ProductTourOverlay() {
  const tour = useProductTour();
  const location = useLocation();
  const [whatsappQrOpen, setWhatsappQrOpen] = useState(false);
  const [domTick, setDomTick] = useState(0);

  const isWhatsappStep = tour.active && tour.step === TOUR_STEP.WHATSAPP;

  useEffect(() => {
    if (!isWhatsappStep) {
      setWhatsappQrOpen(false);
      return;
    }
    const check = () => {
      setWhatsappQrOpen(Boolean(document.querySelector(PRODUCT_TOUR_SELECTORS.whatsappQrPanel)));
      setDomTick((n) => n + 1);
    };
    check();
    const t = window.setInterval(check, 300);
    return () => window.clearInterval(t);
  }, [isWhatsappStep, location.pathname]);

  useEffect(() => {
    if (!tour.active) return;
    const t = window.setInterval(() => setDomTick((n) => n + 1), 400);
    return () => window.clearInterval(t);
  }, [tour.active, tour.step, location.pathname]);

  const selector = useMemo(
    () => (tour.active ? resolveSelector(tour.step, whatsappQrOpen) : null),
    [tour.active, tour.step, whatsappQrOpen, domTick]
  );

  const highlightRect = useHighlightRect(selector, tour.active);

  const content = useMemo(() => {
    if (tour.step === TOUR_STEP.WHATSAPP && whatsappQrOpen) {
      return TOUR_WHATSAPP_QR_CONTENT;
    }
    return TOUR_STEP_CONTENT[tour.step];
  }, [tour.step, whatsappQrOpen]);

  const handlePrimary = useCallback(() => {
    switch (tour.step) {
      case TOUR_STEP.PROFILE:
        tour.goToWhatsappStep();
        break;
      case TOUR_STEP.WHATSAPP:
        tour.advanceFromWhatsapp();
        break;
      case TOUR_STEP.CAMPAIGN:
        tour.advanceFromCampaign();
        break;
      case TOUR_STEP.META:
        tour.advanceFromMeta();
        break;
      case TOUR_STEP.JOURNEY_FUNNEL:
        tour.advanceJourneyFunnel();
        break;
      case TOUR_STEP.JOURNEY_NEW:
        tour.advanceJourneyNew();
        break;
      case TOUR_STEP.JOURNEY_EDIT:
        tour.advanceFromJourneyEdit();
        break;
      case TOUR_STEP.LEADS:
        tour.advanceFromLeads();
        break;
      case TOUR_STEP.DASHBOARD:
        tour.finishTour();
        break;
    }
  }, [tour]);

  if (!tour.active) return null;

  return (
    <div className="fixed inset-0 z-[120]">
      {!highlightRect && (
        <div className="absolute inset-0 bg-black/65 pointer-events-auto" aria-hidden />
      )}

      {highlightRect && (
        <div
          className="pointer-events-none fixed rounded-lg ring-4 ring-primary transition-all duration-200"
          style={{
            top: highlightRect.top - PADDING,
            left: highlightRect.left - PADDING,
            width: highlightRect.width + PADDING * 2,
            height: highlightRect.height + PADDING * 2,
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.65)",
          }}
        />
      )}

      {highlightRect && (
        <TooltipCard
          rect={highlightRect}
          title={content.title}
          description={content.description}
          primaryLabel={content.primaryLabel}
          onPrimary={handlePrimary}
          onClose={tour.endTour}
          skipLabel={
            tour.step === TOUR_STEP.WHATSAPP && !whatsappQrOpen ? "Pular conexão do WhatsApp" : undefined
          }
          onSkip={
            tour.step === TOUR_STEP.WHATSAPP && !whatsappQrOpen
              ? tour.advanceFromWhatsapp
              : undefined
          }
        />
      )}
    </div>
  );
}
