"use client";

import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assetFor, formatBytes, getModel, modelsByProvider } from "@/lib/models";
import { TierPip } from "./accuracy-badge";

/**
 * Grouped by provider, tier shown on every option.
 *
 * The tier belongs here rather than only on the result, because choosing a
 * Claude model is a decision about what kind of answer you are going to get,
 * and the user should make it knowing that.
 */
export function ModelPicker({
  value,
  onChange,
  id = "model",
}: {
  value: string;
  onChange: (modelId: string) => void;
  id?: string;
}) {
  const groups = useMemo(() => modelsByProvider(), []);
  const selected = getModel(value);
  const asset = assetFor(selected);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="label-unit text-muted-foreground">
        Model
      </label>

      <Select value={value} onValueChange={(next) => onChange(next as string)}>
        <SelectTrigger id={id} className="w-full font-readout">
          {/* Base UI renders the raw value by default, which would show the
              registry id. The formatter puts the display name there instead. */}
          <SelectValue>
            {(current: string | null) =>
              current ? getModel(current).name : selected.name
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[22rem]">
          {groups.map((group) => (
            <SelectGroup key={group.provider.id}>
              <SelectLabel className="label-unit text-muted-foreground">
                {group.provider.name}
              </SelectLabel>
              {group.models.map((model) => (
                <SelectItem key={model.id} value={model.id} className="font-readout">
                  <span className="flex w-full items-center justify-between gap-6">
                    {model.name}
                    <TierPip tier={model.tier} />
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>

      {asset && (
        <p className="font-readout text-[0.6875rem] text-muted-foreground">
          Needs {asset.label}, {formatBytes(asset.bytes)}, downloaded once and cached.
        </p>
      )}
    </div>
  );
}
