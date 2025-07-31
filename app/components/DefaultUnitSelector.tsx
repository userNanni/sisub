// components/DefaultUnitSelector.tsx
import { memo, useCallback, useMemo } from "react";
import { Settings, CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UNIDADES_DISPONIVEIS } from "@/components/constants/rancho";

interface DefaultUnitSelectorProps {
  defaultUnit: string;
  setDefaultUnit: (unit: string) => void;
  cardsWithoutUnit: string[]; // Array de dates (strings)
  onApply: () => Promise<void>;
  onCancel: () => void;
  isApplying: boolean;
}

export const DefaultUnitSelector = memo<DefaultUnitSelectorProps>(
  ({
    defaultUnit,
    setDefaultUnit,
    cardsWithoutUnit,
    onApply,
    onCancel,
    isApplying,
  }) => {
    // Memoizar dados computados
    const selectorData = useMemo(() => {
      const cardsCount = cardsWithoutUnit.length;
      const hasCardsToApply = cardsCount > 0;
      const selectedUnitLabel =
        UNIDADES_DISPONIVEIS.find((unit) => unit.value === defaultUnit)
          ?.label || defaultUnit;

      return {
        cardsCount,
        hasCardsToApply,
        selectedUnitLabel,
      };
    }, [cardsWithoutUnit.length, defaultUnit]);

    // Memoizar classes CSS
    const cardClasses = useMemo(
      () =>
        "border-orange-200 bg-orange-50 shadow-sm transition-all duration-200",
      []
    );

    const selectTriggerClasses = useMemo(
      () =>
        "w-full cursor-pointer border-orange-200 focus:border-orange-400 focus:ring-orange-200",
      []
    );

    const cancelButtonClasses = useMemo(
      () =>
        "border-orange-200 text-orange-700 hover:bg-orange-100 cursor-pointer transition-colors",
      []
    );

    const applyButtonClasses = useMemo(
      () =>
        "bg-orange-600 hover:bg-orange-700 text-white cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
      []
    );

    // Handlers memoizados
    const handleUnitChange = useCallback(
      (value: string) => {
        setDefaultUnit(value);
      },
      [setDefaultUnit]
    );

    const handleApply = useCallback(async () => {
      if (!selectorData.hasCardsToApply || isApplying) return;

      try {
        await onApply();
      } catch (error) {
        console.error("Erro ao aplicar unidade padrão:", error);
      }
    }, [selectorData.hasCardsToApply, isApplying, onApply]);

    const handleCancel = useCallback(() => {
      if (isApplying) return;
      onCancel();
    }, [isApplying, onCancel]);

    // Memoizar conteúdo dos itens do select
    const selectItems = useMemo(
      () =>
        UNIDADES_DISPONIVEIS.map((unidade) => (
          <SelectItem
            className="cursor-pointer hover:bg-orange-50 focus:bg-orange-50"
            key={unidade.value}
            value={unidade.value}
          >
            {unidade.label}
          </SelectItem>
        )),
      []
    );

    const { cardsCount, hasCardsToApply, selectedUnitLabel } = selectorData;

    return (
      <Card className={cardClasses}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between text-orange-800">
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Configurar Unidade Padrão</span>
            </div>
            <Badge
              variant="outline"
              className="text-orange-700 border-orange-300"
            >
              {cardsCount} card{cardsCount !== 1 ? "s" : ""}
            </Badge>
          </CardTitle>

          <CardDescription className="text-orange-700 flex items-start space-x-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              Defina uma unidade padrão para os cards que ainda não possuem
              unidade definida no banco de dados. Esta ação afetará apenas os
              cards sem unidade configurada.
            </span>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label className="text-sm font-medium text-orange-800 flex items-center space-x-2">
              <span>Selecione a unidade padrão:</span>
            </Label>

            <Select
              value={defaultUnit}
              onValueChange={handleUnitChange}
              disabled={isApplying}
            >
              <SelectTrigger className={selectTriggerClasses}>
                <SelectValue placeholder="Selecione uma unidade..." />
              </SelectTrigger>
              <SelectContent className="max-h-60">{selectItems}</SelectContent>
            </Select>

            {defaultUnit && (
              <div className="text-xs text-orange-600 bg-orange-100 p-2 rounded-md border border-orange-200">
                <strong>Unidade selecionada:</strong> {selectedUnitLabel}
              </div>
            )}
          </div>

          <div className="border-t border-orange-200 pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="text-sm text-orange-700 flex items-center space-x-2">
                <CheckCircle className="h-4 w-4" />
                <span>
                  Aplicar "{selectedUnitLabel}" a {cardsCount} card
                  {cardsCount !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isApplying}
                  className={cancelButtonClasses}
                >
                  Cancelar
                </Button>

                <Button
                  size="sm"
                  onClick={handleApply}
                  disabled={isApplying || !hasCardsToApply}
                  className={applyButtonClasses}
                >
                  {isApplying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Aplicando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Aplicar a {cardsCount} card{cardsCount !== 1 ? "s" : ""}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Informação adicional */}
          <div className="text-xs text-orange-600 bg-orange-50 p-3 rounded-md border border-orange-200">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium mb-1">Importante:</p>
                <ul className="space-y-1 text-orange-600">
                  <li>
                    • Esta ação não afetará cards que já possuem unidade
                    definida
                  </li>
                  <li>• As alterações serão salvas automaticamente</li>
                  <li>• Você pode alterar a unidade individualmente depois</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);

DefaultUnitSelector.displayName = "DefaultUnitSelector";
