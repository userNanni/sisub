// components/PendingChangesStatus.tsx
import { memo } from "react";
import { Loader2, Save } from "lucide-react";

interface PendingChange {
  [key: string]: any;
}

interface PendingChangesStatusProps {
  pendingChanges: PendingChange[];
  isSavingBatch: boolean;
}

export const PendingChangesStatus = memo<PendingChangesStatusProps>(
  ({ pendingChanges, isSavingBatch }) => {
    if (pendingChanges.length === 0) return null;

    return (
      <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isSavingBatch ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
                <span className="text-sm text-orange-700">
                  Salvando alterações...
                </span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4 text-orange-600" />
                <span className="text-sm text-orange-700">
                  {pendingChanges.length} alteração(ões) pendente(s) -
                  salvamento automático em andamento
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }
);

PendingChangesStatus.displayName = "PendingChangesStatus";
