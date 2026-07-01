import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';
import { FoodReadyDialog } from '../components/FoodReadyDialog';
import { FoodReadyDetails } from '../types/delivery';

type OpenArgs = {
  initialValues: Partial<FoodReadyDetails>;
  startInReviewMode?: boolean;
  submitting?: boolean;
  onConfirm: (details: FoodReadyDetails) => void | Promise<void>;
};

type FoodReadyOverlayContextValue = {
  openFoodReadyDialog: (args: OpenArgs) => void;
  closeFoodReadyDialog: () => void;
};

const FoodReadyOverlayContext = createContext<FoodReadyOverlayContextValue | null>(null);

export function FoodReadyOverlayProvider({ children }: { children: ReactNode }) {
  const [openArgs, setOpenArgs] = useState<OpenArgs | null>(null);
  const [dialogKey, setDialogKey] = useState(0);

  const closeFoodReadyDialog = useCallback(() => {
    setOpenArgs(null);
  }, []);

  const openFoodReadyDialog = useCallback((args: OpenArgs) => {
    setDialogKey((key) => key + 1);
    setOpenArgs(args);
  }, []);

  const handleConfirm = useCallback(
    async (details: FoodReadyDetails) => {
      if (!openArgs) return;
      await openArgs.onConfirm(details);
      setOpenArgs(null);
    },
    [openArgs],
  );

  const value = useMemo(
    () => ({ openFoodReadyDialog, closeFoodReadyDialog }),
    [openFoodReadyDialog, closeFoodReadyDialog],
  );

  return (
    <FoodReadyOverlayContext.Provider value={value}>
      {children}
      <FoodReadyDialog
        key={dialogKey}
        visible={Boolean(openArgs)}
        initialValues={openArgs?.initialValues}
        startInReviewMode={openArgs?.startInReviewMode}
        submitting={openArgs?.submitting}
        onConfirm={handleConfirm}
        onCancel={closeFoodReadyDialog}
      />
    </FoodReadyOverlayContext.Provider>
  );
}

export function useFoodReadyOverlay() {
  const ctx = useContext(FoodReadyOverlayContext);
  if (!ctx) throw new Error('useFoodReadyOverlay must be used within FoodReadyOverlayProvider');
  return ctx;
}
